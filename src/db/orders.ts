import { db, type OrderItem, type OrderPayment } from './db'

export const orderService = {
  // ── 訂單 ────────────────────────────────────────────────

  getAll: () => db.orders.orderBy('order_date').reverse().toArray(),

  getPending: () =>
    db.orders.orderBy('order_date').reverse().filter(o => o.status === 'pending').toArray(),

  getCompleted: () =>
    db.orders.orderBy('order_date').reverse().filter(o => o.status === 'completed').toArray(),

  getByDate: (order_date: string) =>
    db.orders.where('order_date').equals(order_date).first(),

  getDatesWithOrders: async (): Promise<string[]> => {
    const orders = await db.orders.orderBy('order_date').reverse().toArray()
    return orders.map(o => o.order_date)
  },

  getById: (id: number) => db.orders.get(id),

  add: (order_date: string) =>
    db.orders.add({
      order_date,
      status: 'pending',
      completed_at: null,
    }),

  // 取得當日訂單 id，不存在則建立；已完成回傳 null
  getOrCreateOrder: async (order_date: string): Promise<number | null> => {
    const existing = await db.orders.where('order_date').equals(order_date).first()
    if (existing) {
      if (existing.status === 'completed') return null
      return existing.id ?? null
    }
    const id = await db.orders.add({ order_date, status: 'pending', completed_at: null })
    return id ?? null
  },

  complete: async (id: number) => {
    await db.orders.update(id, {
      status: 'completed',
      completed_at: Date.now(),
    })
  },

  // ── 訂單品項 ─────────────────────────────────────────────

  getItems: (order_id: number) =>
    db.order_items.where('order_id').equals(order_id).toArray(),

  addItem: (item: Omit<OrderItem, 'id'>) => db.order_items.add(item),

  updateItem: (id: number, data: Partial<Omit<OrderItem, 'id'>>) =>
    db.order_items.update(id, data),

  removeItem: (id: number) => db.order_items.delete(id),

  removeItemAndCleanup: async (item: OrderItem) => {
    await db.order_items.delete(item.id!)
    const remaining = await db.order_items
      .where('order_id').equals(item.order_id)
      .filter(i => i.vendor_id === item.vendor_id && i.member_id === item.member_id)
      .count()
    if (remaining === 0) {
      await db.order_payments
        .where('order_id').equals(item.order_id)
        .filter(p => p.vendor_id === item.vendor_id && p.member_id === item.member_id)
        .delete()
    }
  },

  // ── 付款狀態 ─────────────────────────────────────────────

  getPayments: (order_id: number) =>
    db.order_payments.where('order_id').equals(order_id).toArray(),

  addPayment: (payment: Omit<OrderPayment, 'id'>) =>
    db.order_payments.add(payment),

  // 只在不存在時才新增，防止重複建立同一 (order, vendor, member) 的 payment
  ensurePayment: async (payment: Omit<OrderPayment, 'id'>) => {
    const existing = await db.order_payments
      .where('order_id').equals(payment.order_id)
      .filter(p => p.vendor_id === payment.vendor_id && p.member_id === payment.member_id)
      .first()
    if (!existing) {
      await db.order_payments.add(payment)
    }
  },

  togglePayment: async (id: number) => {
    const p = await db.order_payments.get(id)
    if (p) await db.order_payments.update(id, { is_paid: !p.is_paid })
  },

  setMemberPayments: async (order_id: number, member_id: number | null, method: 'cash' | 'wallet' | null) => {
    const [allPayments, allItems, order] = await Promise.all([
      db.order_payments.where('order_id').equals(order_id).toArray(),
      db.order_items.where('order_id').equals(order_id).toArray(),
      db.orders.get(order_id),
    ])

    const targetPayments = allPayments.filter(p => p.member_id === member_id)

    // 去重：同一 (vendor_id, member_id) 只計算一次餘額，防止重複 payment record 造成雙扣
    const processedVendors = new Set<number>()
    for (const payment of targetPayments) {
      const wasWallet = payment.is_paid && payment.payment_method === 'wallet'
      const isNowWallet = method === 'wallet'
      if (wasWallet === isNowWallet) continue
      if (processedVendors.has(payment.vendor_id)) continue
      processedVendors.add(payment.vendor_id)

      const items = allItems.filter(i => i.vendor_id === payment.vendor_id && i.member_id === member_id)
      const amount = items.reduce((a, i) => {
        const toppingExtra = i.toppings?.reduce((s, t) => s + t.price, 0) ?? 0
        return a + (i.unit_price + toppingExtra) * i.quantity
      }, 0)
      if (amount === 0) continue

      const delta = wasWallet ? amount : -amount
      const note = wasWallet ? `取消付款 ${order?.order_date ?? ''}` : `訂單付款 ${order?.order_date ?? ''}`
      if (member_id != null) {
        const member = await db.members.get(member_id)
        if (member) {
          await db.members.update(member_id, { balance: (member.balance ?? 0) + delta })
          await db.balance_logs.add({ target_type: 'member', target_id: member_id, amount: delta, note, created_at: Date.now() })
        }
      } else {
        const vendor = await db.vendors.get(payment.vendor_id)
        if (vendor) {
          await db.vendors.update(payment.vendor_id, { balance: (vendor.balance ?? 0) + delta })
          await db.balance_logs.add({ target_type: 'vendor', target_id: payment.vendor_id, amount: delta, note, created_at: Date.now() })
        }
      }
    }

    const newIsPaid = method !== null
    await Promise.all(
      targetPayments.map(p => db.order_payments.update(p.id!, { is_paid: newIsPaid, payment_method: method }))
    )
  },

  setVendorPayments: async (order_id: number, vendor_id: number, method: 'cash' | 'wallet' | null) => {
    const [allPayments, allItems, order] = await Promise.all([
      db.order_payments.where('order_id').equals(order_id).toArray(),
      db.order_items.where('order_id').equals(order_id).toArray(),
      db.orders.get(order_id),
    ])

    const targetPayments = allPayments.filter(p => p.vendor_id === vendor_id)

    // 去重：同一 (vendor_id, member_id) 只計算一次餘額，防止重複 payment record 造成雙扣
    const processedMemberKeys = new Set<string>()
    for (const payment of targetPayments) {
      const wasWallet = payment.is_paid && payment.payment_method === 'wallet'
      const isNowWallet = method === 'wallet'
      if (wasWallet === isNowWallet) continue
      const memberKey = String(payment.member_id)
      if (processedMemberKeys.has(memberKey)) continue
      processedMemberKeys.add(memberKey)

      const items = allItems.filter(i => i.vendor_id === vendor_id && i.member_id === payment.member_id)
      const amount = items.reduce((a, i) => {
        const toppingExtra = i.toppings?.reduce((s, t) => s + t.price, 0) ?? 0
        return a + (i.unit_price + toppingExtra) * i.quantity
      }, 0)
      if (amount === 0) continue

      const delta = wasWallet ? amount : -amount
      const note = wasWallet ? `取消付款 ${order?.order_date ?? ''}` : `訂單付款 ${order?.order_date ?? ''}`
      if (payment.member_id != null) {
        const member = await db.members.get(payment.member_id)
        if (member) {
          await db.members.update(payment.member_id, { balance: (member.balance ?? 0) + delta })
          await db.balance_logs.add({ target_type: 'member', target_id: payment.member_id, amount: delta, note, created_at: Date.now() })
        }
      } else {
        const vendor = await db.vendors.get(vendor_id)
        if (vendor) {
          await db.vendors.update(vendor_id, { balance: (vendor.balance ?? 0) + delta })
          await db.balance_logs.add({ target_type: 'vendor', target_id: vendor_id, amount: delta, note, created_at: Date.now() })
        }
      }
    }

    const newIsPaid = method !== null
    await Promise.all(
      targetPayments.map(p => db.order_payments.update(p.id!, { is_paid: newIsPaid, payment_method: method }))
    )
  },

  // ── 刪除（訂單管理清除用） ───────────────────────────────

  deleteByDates: async (dates: string[]) => {
    const orders = await db.orders.where('order_date').anyOf(dates).toArray()
    const ids = orders.map(o => o.id!)

    await db.transaction('rw', db.orders, db.order_items, db.order_payments, async () => {
      await db.order_items.where('order_id').anyOf(ids).delete()
      await db.order_payments.where('order_id').anyOf(ids).delete()
      await db.orders.where('id').anyOf(ids).delete()
    })
  },

  // ── 完成訂單檢查：所有付款是否全勾 ──────────────────────

  allPaid: async (order_id: number): Promise<boolean> => {
    const payments = await db.order_payments.where('order_id').equals(order_id).toArray()
    return payments.length > 0 && payments.every(p => p.is_paid)
  },

  // ── 容量估算 ─────────────────────────────────────────────

  getStorageEstimate: async (): Promise<string> => {
    if (!navigator.storage?.estimate) return '無法取得'
    const { usage } = await navigator.storage.estimate()
    if (!usage) return '0 MB'
    return (usage / 1024 / 1024).toFixed(2) + ' MB'
  },
}
