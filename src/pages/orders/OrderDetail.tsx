import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { orderService } from '../../db'
import type { Order, Store, Menu, Vendor, Member, OrderItem, OrderPayment } from '../../db'
import QuantityControl from '../../components/QuantityControl'

// ── 型別 ────────────────────────────────────────────────────

export type Maps = {
  store: Record<number, Store>
  menu:  Record<number, Menu>
  vendor: Record<number, Vendor>
  member: Record<number, Member>
}

// 依店家
type ItemRow = {
  menuName: string
  qty: number
  unitPrice: number
  toppingExtra: number
  total: number
  sweetness: string | null
  ice: string | null
  toppingDesc: string | null
}

type StoreSection = {
  storeId: number
  storeName: string
  storePhone: string
  isDrink: boolean
  items: ItemRow[]
  storeTotal: number
}

// 依廠商（統計，含客製化）
type VendorRow = {
  menuName: string
  qty: number
  total: number
  sweetness: string | null
  ice: string | null
  toppingDesc: string | null
  toppingExtra: number
}
type SimpleVendorSection = {
  vendorId: number
  vendorName: string
  vendorTotal: number
  rows: VendorRow[]
}

// 依人名
type PersonRow = {
  menuName: string
  qty: number
  unitPrice: number
  toppingExtra: number
  total: number
  sweetness: string | null
  ice: string | null
  toppingDesc: string | null
}

type PersonSection = {
  memberId: number
  memberName: string
  items: PersonRow[]
  memberTotal: number
  payment: OrderPayment | undefined
}

type PersonVendorSection =
  | { hasMembers: true;  vendorId: number; vendorName: string; vendorTotal: number; members: PersonSection[] }
  | { hasMembers: false; vendorId: number; vendorName: string; vendorTotal: number; items: PersonRow[]; payment: OrderPayment | undefined }

// ── 聚合函數 ─────────────────────────────────────────────────

function buildByStore(items: OrderItem[], maps: Maps): StoreSection[] {
  const byStore = new Map<number, OrderItem[]>()
  for (const item of items) {
    if (!byStore.has(item.store_id)) byStore.set(item.store_id, [])
    byStore.get(item.store_id)!.push(item)
  }

  return Array.from(byStore.entries()).map(([storeId, storeItems]) => {
    const store   = maps.store[storeId]
    const isDrink = (store?.type ?? 'bento') === 'drink'
    let rows: ItemRow[]

    if (isDrink) {
      // 飲料：相同品項+客製化合併
      const groups = new Map<string, OrderItem[]>()
      for (const item of storeItems) {
        const toppingKey = (item.toppings ?? []).map(t => t.topping_id).sort().join(',')
        const key = `${item.menu_id}|${item.sweetness ?? ''}|${item.ice ?? ''}|${toppingKey}`
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(item)
      }
      rows = Array.from(groups.values()).map(grp => {
        const first        = grp[0]
        const toppingExtra = first.toppings?.reduce((a, t) => a + t.price, 0) ?? 0
        const qty          = grp.reduce((a, i) => a + i.quantity, 0)
        return {
          menuName: maps.menu[first.menu_id]?.name ?? '已刪除品項',
          qty, unitPrice: first.unit_price, toppingExtra,
          total: (first.unit_price + toppingExtra) * qty,
          sweetness: first.sweetness ?? null,
          ice: first.ice ?? null,
          toppingDesc: first.toppings?.length ? first.toppings.map(t => `+${t.name}`).join(' ') : null,
        }
      })
    } else {
      // 便當：依品項彙總數量
      const byMenu = new Map<number, { qty: number; unitPrice: number }>()
      for (const item of storeItems) {
        const prev = byMenu.get(item.menu_id)
        byMenu.set(item.menu_id, { qty: (prev?.qty ?? 0) + item.quantity, unitPrice: item.unit_price })
      }
      rows = Array.from(byMenu.entries()).map(([menuId, { qty, unitPrice }]) => ({
        menuName: maps.menu[menuId]?.name ?? '已刪除品項',
        qty, unitPrice, toppingExtra: 0,
        total: qty * unitPrice,
        sweetness: null, ice: null, toppingDesc: null,
      }))
    }

    return {
      storeId,
      storeName:  store?.name  ?? '已刪除店家',
      storePhone: store?.phone ?? '',
      isDrink,
      items: rows,
      storeTotal: rows.reduce((a, r) => a + r.total, 0),
    }
  })
}

function buildByVendor(items: OrderItem[], maps: Maps): SimpleVendorSection[] {
  const byVendor = new Map<number, OrderItem[]>()
  for (const item of items) {
    if (!byVendor.has(item.vendor_id)) byVendor.set(item.vendor_id, [])
    byVendor.get(item.vendor_id)!.push(item)
  }

  return Array.from(byVendor.entries()).map(([vendorId, vendorItems]) => {
    // 依品項 + 客製化分組合計
    const groups = new Map<string, OrderItem[]>()
    for (const item of vendorItems) {
      const toppingKey = (item.toppings ?? []).map(t => t.topping_id).sort().join(',')
      const key = `${item.menu_id}|${item.sweetness ?? ''}|${item.ice ?? ''}|${toppingKey}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(item)
    }
    const rows: VendorRow[] = Array.from(groups.values()).map(grp => {
      const first        = grp[0]
      const toppingExtra = first.toppings?.reduce((a, t) => a + t.price, 0) ?? 0
      const qty          = grp.reduce((a, i) => a + i.quantity, 0)
      return {
        menuName: maps.menu[first.menu_id]?.name ?? '已刪除品項',
        qty, total: (first.unit_price + toppingExtra) * qty,
        sweetness:   first.sweetness ?? null,
        ice:         first.ice ?? null,
        toppingDesc: first.toppings?.length ? first.toppings.map(t => `+${t.name}`).join(' ') : null,
        toppingExtra,
      }
    })
    return {
      vendorId,
      vendorName:  maps.vendor[vendorId]?.name ?? '已刪除廠商',
      vendorTotal: rows.reduce((a, r) => a + r.total, 0),
      rows,
    }
  })
}

function buildByMember(items: OrderItem[], payments: OrderPayment[], maps: Maps): PersonVendorSection[] {
  const byVendor = new Map<number, OrderItem[]>()
  for (const item of items) {
    if (!byVendor.has(item.vendor_id)) byVendor.set(item.vendor_id, [])
    byVendor.get(item.vendor_id)!.push(item)
  }

  const toRow = (item: OrderItem): PersonRow => {
    const toppingExtra = item.toppings?.reduce((a, t) => a + t.price, 0) ?? 0
    return {
      menuName: maps.menu[item.menu_id]?.name ?? '已刪除品項',
      qty: item.quantity, unitPrice: item.unit_price, toppingExtra,
      total: (item.unit_price + toppingExtra) * item.quantity,
      sweetness: item.sweetness ?? null,
      ice: item.ice ?? null,
      toppingDesc: item.toppings?.length ? item.toppings.map(t => `+${t.name}`).join(' ') : null,
    }
  }

  return Array.from(byVendor.entries()).map(([vendorId, vendorItems]) => {
    const hasMembers = vendorItems.some(i => i.member_id != null)

    if (hasMembers) {
      const byMember = new Map<number, OrderItem[]>()
      for (const item of vendorItems) {
        if (item.member_id == null) continue
        if (!byMember.has(item.member_id)) byMember.set(item.member_id, [])
        byMember.get(item.member_id)!.push(item)
      }
      const members: PersonSection[] = Array.from(byMember.entries()).map(([memberId, mItems]) => {
        const rows = mItems.map(toRow)
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
        vendorName:  maps.vendor[vendorId]?.name ?? '已刪除廠商',
        vendorTotal: members.reduce((a, m) => a + m.memberTotal, 0),
        members,
      }
    } else {
      const rows = vendorItems.map(toRow)
      return {
        hasMembers: false as const, vendorId,
        vendorName:  maps.vendor[vendorId]?.name ?? '已刪除廠商',
        vendorTotal: rows.reduce((a, r) => a + r.total, 0),
        items: rows,
        payment: payments.find(p => p.vendor_id === vendorId && p.member_id == null),
      }
    }
  })
}

// ── 子元件 ───────────────────────────────────────────────────

function DrinkMeta({ sweetness, ice, toppingDesc, toppingExtra }: {
  sweetness: string | null; ice: string | null; toppingDesc: string | null; toppingExtra: number
}) {
  const parts = [sweetness, ice, toppingDesc].filter(Boolean)
  if (!parts.length) return null
  return (
    <div className="text-xs text-blue-500 mt-0.5">
      {parts.join(' ')}
      {toppingExtra > 0 && <span className="text-gray-400"> (加料 +{toppingExtra})</span>}
    </div>
  )
}

function EditItemRow({ item, maps, onQtyChange, onDelete }: {
  item: OrderItem
  maps: Maps
  onQtyChange: (qty: number) => void
  onDelete: () => void
}) {
  const store   = maps.store[item.store_id]
  const menu    = maps.menu[item.menu_id]
  const isDrink = (store?.type ?? 'bento') === 'drink'
  return (
    <div className="bg-white rounded-xl px-3 py-2.5 border border-gray-100 flex items-center gap-2.5">
      <div className="text-base shrink-0">{isDrink ? '🧋' : '🍱'}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-800 truncate">{menu?.name ?? '已刪除品項'}</div>
        <div className="text-xs text-gray-400">{store?.name ?? ''}</div>
      </div>
      <QuantityControl
        value={item.quantity}
        onChange={qty => qty === 0 ? onDelete() : onQtyChange(qty)}
      />
      <button
        onClick={onDelete}
        className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center text-red-400 text-lg leading-none shrink-0"
      >
        ×
      </button>
    </div>
  )
}

// ── 主元件 ───────────────────────────────────────────────────

interface Props { order: Order; maps: Maps }

export default function OrderDetail({ order, maps }: Props) {
  const [activeTab, setActiveTab]                   = useState<'store' | 'vendor' | 'person'>('store')
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [isEditing, setIsEditing]                   = useState(false)

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
  const storeView   = buildByStore(items, maps)
  const vendorView  = buildByVendor(items, maps)
  const personView  = buildByMember(items, payments, maps)
  const allPaid     = payments.length > 0 && payments.every(p => p.is_paid)
  const isCompleted = order.status === 'completed'

  // ── edit helpers ─────────────────────────────────────────
  const hasMembersInItems = items.some(i => i.member_id != null)
  const itemsByMember = new Map<number | null, OrderItem[]>()
  for (const item of items) {
    const key = item.member_id ?? null
    if (!itemsByMember.has(key)) itemsByMember.set(key, [])
    itemsByMember.get(key)!.push(item)
  }

  const handleQtyChange = (item: OrderItem, qty: number) => {
    orderService.updateItem(item.id!, { quantity: qty })
  }
  const handleDelete = (item: OrderItem) => {
    orderService.removeItemAndCleanup(item)
  }

  return (
    <div className="border-t border-gray-100">

      {/* ── 操作列：完成訂單 + 編輯訂單（同一行） ─────────── */}
      {!isCompleted && (
        <div className="flex items-center justify-between gap-2 px-4 py-2 bg-white border-b border-gray-100">
          {/* 左：完成訂單 */}
          {allPaid ? (
            !showCompleteConfirm ? (
              <button
                onClick={() => setShowCompleteConfirm(true)}
                className="text-xs px-3 py-1.5 rounded-full bg-green-500 text-white font-medium"
              >
                完成訂單
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">確認完成？</span>
                <button
                  onClick={() => setShowCompleteConfirm(false)}
                  className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-500"
                >
                  取消
                </button>
                <button
                  onClick={() => { orderService.complete(order.id!); setShowCompleteConfirm(false) }}
                  className="text-xs px-2.5 py-1 rounded-full bg-green-500 text-white font-medium"
                >
                  確認
                </button>
              </div>
            )
          ) : (
            <span className="text-xs text-gray-300">依人名全部付款後可完成</span>
          )}

          {/* 右：編輯訂單 */}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors shrink-0 ${
              isEditing
                ? 'bg-orange-500 text-white border-orange-500'
                : 'text-orange-400 border-orange-200'
            }`}
          >
            {isEditing ? '完成' : '編輯訂單'}
          </button>
        </div>
      )}

      {/* ── 編輯模式 ─────────────────────────────────────────── */}
      {isEditing && (
        <div className="px-4 py-4 space-y-4">
          {hasMembersInItems
            ? Array.from(itemsByMember.entries()).map(([memberId, memberItems]) => (
                <div key={memberId ?? 'null'}>
                  <div className="text-xs font-semibold text-gray-400 mb-2 px-1">
                    {memberId != null
                      ? (maps.member[memberId]?.name ?? '已刪除人員')
                      : '廠商訂購'}
                  </div>
                  <div className="space-y-2">
                    {memberItems.map(item => (
                      <EditItemRow
                        key={item.id}
                        item={item}
                        maps={maps}
                        onQtyChange={qty => handleQtyChange(item, qty)}
                        onDelete={() => handleDelete(item)}
                      />
                    ))}
                  </div>
                </div>
              ))
            : (
              <div className="space-y-2">
                {items.map(item => (
                  <EditItemRow
                    key={item.id}
                    item={item}
                    maps={maps}
                    onQtyChange={qty => handleQtyChange(item, qty)}
                    onDelete={() => handleDelete(item)}
                  />
                ))}
              </div>
            )
          }
          {items.length === 0 && (
            <p className="text-center text-gray-400 py-4 text-sm">已無品項</p>
          )}
        </div>
      )}

      {/* ── 一般顯示模式 ──────────────────────────────────────── */}
      {!isEditing && (
        <>
          {/* Tab 列：3 個 */}
          <div className="flex border-b border-gray-200">
            {(['store', 'vendor', 'person'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-orange-500 border-b-2 border-orange-500 bg-white'
                    : 'text-gray-500 bg-gray-50'
                }`}
              >
                {tab === 'store' ? '依店家' : tab === 'vendor' ? '依廠商' : '依人名'}
              </button>
            ))}
          </div>

          {/* ── 依店家 ──────────────────────────────────────────── */}
          {activeTab === 'store' && (
            <div className="p-4 space-y-3">
              {storeView.map(sec => (
                <div key={sec.storeId} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <span className="text-sm font-semibold text-gray-700">
                      {sec.isDrink ? '🧋 ' : ''}{sec.storeName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-orange-500">NT$ {sec.storeTotal}</span>
                      {sec.storePhone && (
                        <span className="text-xs text-gray-400">{sec.storePhone}</span>
                      )}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {sec.items.map((row, i) => (
                      <div key={i} className="px-4 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-gray-700">
                              {row.menuName}
                              <span className="text-gray-400 ml-1.5">× {row.qty}</span>
                            </span>
                            {sec.isDrink && (
                              <DrinkMeta
                                sweetness={row.sweetness} ice={row.ice}
                                toppingDesc={row.toppingDesc} toppingExtra={row.toppingExtra}
                              />
                            )}
                          </div>
                          <span className="text-sm text-gray-600 shrink-0">NT$ {row.total}</span>
                        </div>
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

          {/* ── 依廠商（純統計，同品項合計） ────────────────────── */}
          {activeTab === 'vendor' && (
            <div className="p-4 space-y-3">
              {vendorView.map(sec => (
                <div key={sec.vendorId} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <span className="text-sm font-semibold text-gray-700">{sec.vendorName}</span>
                    <span className="text-sm font-semibold text-orange-500">NT$ {sec.vendorTotal}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {sec.rows.map((row, i) => (
                      <div key={i} className="px-4 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-gray-700">
                              {row.menuName}
                              <span className="text-gray-400 ml-1.5">× {row.qty}</span>
                            </span>
                            {(row.sweetness || row.toppingDesc) && (
                              <DrinkMeta
                                sweetness={row.sweetness} ice={row.ice}
                                toppingDesc={row.toppingDesc} toppingExtra={row.toppingExtra}
                              />
                            )}
                          </div>
                          <span className="text-sm text-gray-500 shrink-0">NT$ {row.total}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {vendorView.length === 0 && (
                <p className="text-center text-gray-400 py-6 text-sm">尚無品項</p>
              )}
            </div>
          )}

          {/* ── 依人名（廠商→人員，含付款） ──────────────────────── */}
          {activeTab === 'person' && (
            <div className="p-4 space-y-3">
              {personView.map(sec => (
                <div key={sec.vendorId} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  {/* 廠商標題 */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <span className="text-sm font-semibold text-gray-700">{sec.vendorName}</span>
                    <span className="text-sm font-semibold text-orange-500">NT$ {sec.vendorTotal}</span>
                  </div>

                  {/* 有人員 */}
                  {sec.hasMembers && (
                    <div className="divide-y divide-gray-100">
                      {sec.members.map(member => (
                        <div key={member.memberId} className="px-4 py-3">
                          {/* 人員標題列 + 付款 */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">{member.memberName}</span>
                            <div className="flex items-center gap-2">
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
                          {/* 品項明細 */}
                          <div className="space-y-1">
                            {member.items.map((row, i) => (
                              <div key={i}>
                                <div className="flex justify-between">
                                  <span className="text-xs text-gray-500">{row.menuName} × {row.qty}</span>
                                  <span className="text-xs text-gray-400">NT$ {row.total}</span>
                                </div>
                                {(row.sweetness || row.toppingDesc) && (
                                  <div className="text-xs text-blue-400 mt-0.5 ml-2">
                                    {[row.sweetness, row.ice, row.toppingDesc].filter(Boolean).join(' ')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 無人員（廠商訂購） */}
                  {!sec.hasMembers && (
                    <>
                      <div className="divide-y divide-gray-50">
                        {sec.items.map((row, i) => (
                          <div key={i} className="px-4 py-2.5">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">{row.menuName} × {row.qty}</span>
                              <span className="text-sm text-gray-500">NT$ {row.total}</span>
                            </div>
                            {(row.sweetness || row.toppingDesc) && (
                              <div className="text-xs text-blue-400 mt-0.5">
                                {[row.sweetness, row.ice, row.toppingDesc].filter(Boolean).join(' ')}
                              </div>
                            )}
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
                </div>
              ))}
              {personView.length === 0 && (
                <p className="text-center text-gray-400 py-6 text-sm">尚無品項</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
