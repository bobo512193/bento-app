import { db, type OrderItem, type OrderPayment } from './db'

export const orderService = {
  // ── 訂單 ────────────────────────────────────────────────

  getAll: () => db.orders.orderBy('order_date').reverse().toArray(),

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

  togglePayment: async (id: number) => {
    const p = await db.order_payments.get(id)
    if (p) await db.order_payments.update(id, { is_paid: !p.is_paid })
  },

  setMemberPayments: async (order_id: number, member_id: number | null, is_paid: boolean) => {
    const all = await db.order_payments.where('order_id').equals(order_id).toArray()
    await Promise.all(
      all
        .filter(p => p.member_id === member_id)
        .map(p => db.order_payments.update(p.id!, { is_paid }))
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
