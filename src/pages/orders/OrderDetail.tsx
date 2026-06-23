import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { orderService } from '../../db'
import type { Order, Store, Menu, Vendor, Member, OrderItem, OrderPayment } from '../../db'

// ── 型別 ────────────────────────────────────────────────────

export type Maps = {
  store: Record<number, Store>
  menu:  Record<number, Menu>
  vendor: Record<number, Vendor>
  member: Record<number, Member>
}

type ItemRow = { menuName: string; qty: number; unitPrice: number; total: number }

type StoreSection = {
  storeId: number; storeName: string; storePhone: string
  items: ItemRow[]; storeTotal: number
}

type MemberSection = {
  memberId: number; memberName: string
  items: ItemRow[]; memberTotal: number
  payment: OrderPayment | undefined
}

type VendorSection =
  | { hasMembers: true;  vendorId: number; vendorName: string; vendorTotal: number; storeBreakdown: { storeName: string; total: number }[]; members: MemberSection[] }
  | { hasMembers: false; vendorId: number; vendorName: string; vendorTotal: number; storeBreakdown: { storeName: string; total: number }[]; items: ItemRow[]; payment: OrderPayment | undefined }

// ── 聚合函數 ─────────────────────────────────────────────────

function buildByStore(items: OrderItem[], maps: Maps): StoreSection[] {
  const byStore = new Map<number, OrderItem[]>()
  for (const item of items) {
    if (!byStore.has(item.store_id)) byStore.set(item.store_id, [])
    byStore.get(item.store_id)!.push(item)
  }
  return Array.from(byStore.entries()).map(([storeId, storeItems]) => {
    const byMenu = new Map<number, { qty: number; unitPrice: number }>()
    for (const item of storeItems) {
      const prev = byMenu.get(item.menu_id)
      byMenu.set(item.menu_id, { qty: (prev?.qty ?? 0) + item.quantity, unitPrice: item.unit_price })
    }
    const rows: ItemRow[] = Array.from(byMenu.entries()).map(([menuId, { qty, unitPrice }]) => ({
      menuName: maps.menu[menuId]?.name ?? '已刪除品項',
      qty, unitPrice, total: qty * unitPrice,
    }))
    return {
      storeId,
      storeName: maps.store[storeId]?.name ?? '已刪除店家',
      storePhone: maps.store[storeId]?.phone ?? '',
      items: rows,
      storeTotal: rows.reduce((a, r) => a + r.total, 0),
    }
  })
}

function buildByVendor(items: OrderItem[], payments: OrderPayment[], maps: Maps): VendorSection[] {
  const byVendor = new Map<number, OrderItem[]>()
  for (const item of items) {
    if (!byVendor.has(item.vendor_id)) byVendor.set(item.vendor_id, [])
    byVendor.get(item.vendor_id)!.push(item)
  }

  return Array.from(byVendor.entries()).map(([vendorId, vendorItems]) => {
    // 依店家小計
    const storeMap = new Map<number, number>()
    for (const item of vendorItems) {
      storeMap.set(item.store_id, (storeMap.get(item.store_id) ?? 0) + item.quantity * item.unit_price)
    }
    const storeBreakdown = Array.from(storeMap.entries()).map(([sid, total]) => ({
      storeName: maps.store[sid]?.name ?? '已刪除店家', total,
    }))

    const hasMembers = vendorItems.some(i => i.member_id != null)

    if (hasMembers) {
      const byMember = new Map<number, OrderItem[]>()
      for (const item of vendorItems) {
        if (item.member_id == null) continue
        if (!byMember.has(item.member_id)) byMember.set(item.member_id, [])
        byMember.get(item.member_id)!.push(item)
      }
      const members: MemberSection[] = Array.from(byMember.entries()).map(([memberId, mItems]) => {
        const rows: ItemRow[] = mItems.map(item => ({
          menuName: maps.menu[item.menu_id]?.name ?? '已刪除品項',
          qty: item.quantity, unitPrice: item.unit_price, total: item.quantity * item.unit_price,
        }))
        return {
          memberId,
          memberName: maps.member[memberId]?.name ?? '已刪除人員',
          items: rows,
          memberTotal: rows.reduce((a, r) => a + r.total, 0),
          payment: payments.find(p => p.vendor_id === vendorId && p.member_id === memberId),
        }
      })
      return {
        hasMembers: true as const, vendorId,
        vendorName: maps.vendor[vendorId]?.name ?? '已刪除廠商',
        vendorTotal: members.reduce((a, m) => a + m.memberTotal, 0),
        storeBreakdown, members,
      }
    } else {
      const byMenu = new Map<number, { qty: number; unitPrice: number }>()
      for (const item of vendorItems) {
        const prev = byMenu.get(item.menu_id)
        byMenu.set(item.menu_id, { qty: (prev?.qty ?? 0) + item.quantity, unitPrice: item.unit_price })
      }
      const rows: ItemRow[] = Array.from(byMenu.entries()).map(([menuId, { qty, unitPrice }]) => ({
        menuName: maps.menu[menuId]?.name ?? '已刪除品項',
        qty, unitPrice, total: qty * unitPrice,
      }))
      return {
        hasMembers: false as const, vendorId,
        vendorName: maps.vendor[vendorId]?.name ?? '已刪除廠商',
        vendorTotal: rows.reduce((a, r) => a + r.total, 0),
        storeBreakdown, items: rows,
        payment: payments.find(p => p.vendor_id === vendorId && p.member_id == null),
      }
    }
  })
}

// ── 元件 ─────────────────────────────────────────────────────

interface Props { order: Order; maps: Maps }

export default function OrderDetail({ order, maps }: Props) {
  const [activeTab, setActiveTab] = useState<'store' | 'vendor'>('store')
  const [expandedVendorId, setExpandedVendorId] = useState<number | null>(null)
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)

  const detail = useLiveQuery(async () => {
    const [items, payments] = await Promise.all([
      orderService.getItems(order.id!),
      orderService.getPayments(order.id!),
    ])
    return { items, payments }
  }, [order.id])

  if (!detail) {
    return <div className="p-4 text-center text-gray-400 text-sm">載入中...</div>
  }

  const { items, payments } = detail
  const storeView  = buildByStore(items, maps)
  const vendorView = buildByVendor(items, payments, maps)
  const allPaid    = payments.length > 0 && payments.every(p => p.is_paid)
  const isCompleted = order.status === 'completed'

  return (
    <div className="border-t border-gray-100">
      {/* Tab 列 */}
      <div className="flex border-b border-gray-200">
        {(['store', 'vendor'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-orange-500 border-b-2 border-orange-500 bg-white'
                : 'text-gray-500 bg-gray-50'
            }`}
          >
            {tab === 'store' ? '依店家' : '依廠商'}
          </button>
        ))}
      </div>

      {/* ── 依店家 ──────────────────────────────────────────── */}
      {activeTab === 'store' && (
        <div className="p-4 space-y-3">
          {storeView.map(sec => (
            <div key={sec.storeId} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-700">{sec.storeName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-orange-500">NT$ {sec.storeTotal}</span>
                  {sec.storePhone && (
                    <a
                      href={`tel:${sec.storePhone}`}
                      className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-base"
                    >
                      📞
                    </a>
                  )}
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {sec.items.map((row, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-gray-700">
                      {row.menuName}
                      <span className="text-gray-400 ml-1.5">× {row.qty}</span>
                    </span>
                    <span className="text-sm text-gray-600">NT$ {row.total}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {storeView.length === 0 && (
            <p className="text-center text-gray-400 py-6 text-sm">尚無品項</p>
          )}
        </div>
      )}

      {/* ── 依廠商 ──────────────────────────────────────────── */}
      {activeTab === 'vendor' && (
        <div className="p-4 space-y-3">
          {vendorView.map(sec => (
            <div key={sec.vendorId} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* 廠商標題 */}
              <button
                onClick={() =>
                  sec.hasMembers &&
                  setExpandedVendorId(expandedVendorId === sec.vendorId ? null : sec.vendorId)
                }
                className="w-full text-left"
              >
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                  <span className="text-sm font-semibold text-gray-700">{sec.vendorName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-orange-500">NT$ {sec.vendorTotal}</span>
                    {sec.hasMembers && (
                      <span className="text-gray-400">
                        {expandedVendorId === sec.vendorId ? '∨' : '›'}
                      </span>
                    )}
                  </div>
                </div>
                {/* 依店家小計 */}
                {sec.storeBreakdown.length > 1 && (
                  <div className="flex flex-wrap gap-2 px-4 py-2 border-t border-gray-100 bg-gray-50">
                    {sec.storeBreakdown.map((s, i) => (
                      <span key={i} className="text-xs text-gray-500">
                        {s.storeName} NT${s.total}
                      </span>
                    ))}
                  </div>
                )}
              </button>

              {/* 無人員：品項列表 + 付款 */}
              {!sec.hasMembers && (
                <>
                  <div className="divide-y divide-gray-50 border-t border-gray-100">
                    {sec.items.map((row, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm text-gray-700">
                          {row.menuName}
                          <span className="text-gray-400 ml-1.5">× {row.qty}</span>
                        </span>
                        <span className="text-sm text-gray-600">NT$ {row.total}</span>
                      </div>
                    ))}
                  </div>
                  {sec.payment && (
                    <label className="flex items-center justify-between px-4 py-3 border-t border-gray-100 cursor-pointer">
                      <span className={`text-sm ${sec.payment.is_paid ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                        {sec.payment.is_paid ? '✓ 已付款' : '未付款'}
                      </span>
                      <input
                        type="checkbox"
                        checked={sec.payment.is_paid}
                        disabled={isCompleted}
                        onChange={() => orderService.togglePayment(sec.payment!.id!)}
                        className="w-5 h-5 accent-orange-500"
                      />
                    </label>
                  )}
                </>
              )}

              {/* 有人員：展開後顯示每位人員 */}
              {sec.hasMembers && expandedVendorId === sec.vendorId && (
                <div className="divide-y divide-gray-100 border-t border-gray-100">
                  {sec.members.map(member => (
                    <div key={member.memberId} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{member.memberName}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-orange-500">NT$ {member.memberTotal}</span>
                          {member.payment && (
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <span className={`text-xs ${member.payment.is_paid ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                                {member.payment.is_paid ? '已付' : '未付'}
                              </span>
                              <input
                                type="checkbox"
                                checked={member.payment.is_paid}
                                disabled={isCompleted}
                                onChange={() => orderService.togglePayment(member.payment!.id!)}
                                className="w-5 h-5 accent-orange-500"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        {member.items.map((row, i) => (
                          <div key={i} className="flex justify-between">
                            <span className="text-xs text-gray-400">{row.menuName} × {row.qty}</span>
                            <span className="text-xs text-gray-400">NT$ {row.total}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {vendorView.length === 0 && (
            <p className="text-center text-gray-400 py-6 text-sm">尚無品項</p>
          )}
        </div>
      )}

      {/* 完成訂單按鈕 */}
      {!isCompleted && allPaid && (
        <div className="px-4 pb-4">
          {!showCompleteConfirm ? (
            <button
              onClick={() => setShowCompleteConfirm(true)}
              className="w-full py-3 bg-green-500 text-white text-sm font-semibold rounded-xl"
            >
              完成訂單
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 text-center">完成後訂單將鎖定，無法再修改付款狀態</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCompleteConfirm(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600"
                >
                  取消
                </button>
                <button
                  onClick={() => { orderService.complete(order.id!); setShowCompleteConfirm(false) }}
                  className="flex-1 py-2.5 bg-green-500 text-white text-sm font-semibold rounded-xl"
                >
                  確認完成
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
