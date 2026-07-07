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
  vendorPayments: OrderPayment[]
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

type PersonVendorRow = {
  vendorId: number
  vendorName: string
  items: PersonRow[]
  subtotal: number
}

type PersonFullSection = {
  memberId: number | null
  vendorId: number | null  // set only for vendor-direct sections (memberId == null)
  sectionKey: string
  memberName: string
  vendorRows: PersonVendorRow[]
  memberTotal: number
  memberPayments: OrderPayment[]
}

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
      rows = Array.from(groups.entries())
        .sort(([keyA], [keyB]) => {
          const idA = parseInt(keyA), idB = parseInt(keyB)
          return idA !== idB ? idA - idB : keyA < keyB ? -1 : keyA > keyB ? 1 : 0
        })
        .map(([, grp]) => {
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
      // 便當：依品項+加料分組，按 menu_id 排序
      const byKey = new Map<string, { menuId: number; qty: number; unitPrice: number; toppingDesc: string | null; toppingExtra: number }>()
      for (const item of storeItems) {
        const toppingKey = (item.toppings ?? []).map(t => t.topping_id).sort().join(',')
        const key = `${item.menu_id}|${toppingKey}`
        const toppingExtra = item.toppings?.reduce((a, t) => a + t.price, 0) ?? 0
        const toppingDesc = item.toppings?.length ? item.toppings.map(t => `+${t.name}`).join(' ') : null
        const prev = byKey.get(key)
        if (prev) {
          byKey.set(key, { ...prev, qty: prev.qty + item.quantity })
        } else {
          byKey.set(key, { menuId: item.menu_id, qty: item.quantity, unitPrice: item.unit_price, toppingDesc, toppingExtra })
        }
      }
      rows = Array.from(byKey.values())
        .sort((a, b) => a.menuId - b.menuId)
        .map(({ menuId, qty, unitPrice, toppingDesc, toppingExtra }) => ({
          menuName: maps.menu[menuId]?.name ?? '已刪除品項',
          qty, unitPrice, toppingExtra,
          total: (unitPrice + toppingExtra) * qty,
          sweetness: null, ice: null, toppingDesc,
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

function buildByVendor(items: OrderItem[], payments: OrderPayment[], maps: Maps): SimpleVendorSection[] {
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
      vendorPayments: payments.filter(p => p.vendor_id === vendorId),
    }
  })
}

function buildByPerson(items: OrderItem[], payments: OrderPayment[], maps: Maps): PersonFullSection[] {
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

  const sections: PersonFullSection[] = []

  // 有綁定人員的品項：按人員分組
  const byMember = new Map<number, OrderItem[]>()
  for (const item of items) {
    if (item.member_id == null) continue
    if (!byMember.has(item.member_id)) byMember.set(item.member_id, [])
    byMember.get(item.member_id)!.push(item)
  }
  for (const [memberId, memberItems] of byMember.entries()) {
    const byVendor = new Map<number, OrderItem[]>()
    for (const item of memberItems) {
      if (!byVendor.has(item.vendor_id)) byVendor.set(item.vendor_id, [])
      byVendor.get(item.vendor_id)!.push(item)
    }
    const vendorRows: PersonVendorRow[] = Array.from(byVendor.entries()).map(([vendorId, vItems]) => {
      const rows = vItems.map(toRow)
      return { vendorId, vendorName: maps.vendor[vendorId]?.name ?? '已刪除廠商', items: rows, subtotal: rows.reduce((a, r) => a + r.total, 0) }
    })
    sections.push({
      memberId,
      vendorId: null,
      sectionKey: `m:${memberId}`,
      memberName: maps.member[memberId]?.name ?? '已刪除人員',
      vendorRows,
      memberTotal: vendorRows.reduce((a, v) => a + v.subtotal, 0),
      memberPayments: payments.filter(p => p.member_id === memberId),
    })
  }

  // 未綁定人員（廠商直接訂購）：按廠商分組，每廠商獨立一個 section
  const byVendorDirect = new Map<number, OrderItem[]>()
  for (const item of items) {
    if (item.member_id != null) continue
    if (!byVendorDirect.has(item.vendor_id)) byVendorDirect.set(item.vendor_id, [])
    byVendorDirect.get(item.vendor_id)!.push(item)
  }
  for (const [vendorId, vItems] of byVendorDirect.entries()) {
    const rows = vItems.map(toRow)
    const subtotal = rows.reduce((a, r) => a + r.total, 0)
    sections.push({
      memberId: null,
      vendorId,
      sectionKey: `v:${vendorId}`,
      memberName: maps.vendor[vendorId]?.name ?? '已刪除廠商',
      vendorRows: [{ vendorId, vendorName: maps.vendor[vendorId]?.name ?? '已刪除廠商', items: rows, subtotal }],
      memberTotal: subtotal,
      memberPayments: payments.filter(p => p.vendor_id === vendorId && p.member_id == null),
    })
  }

  return sections
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
  const vendorView  = buildByVendor(items, payments, maps)
  const personView  = buildByPerson(items, payments, maps)
  const allPaid     = payments.length > 0 && payments.every(p => p.is_paid)
  const isCompleted = order.status === 'completed'

  // ── edit helpers ─────────────────────────────────────────
  const hasMembersInItems = items.some(i => i.member_id != null)
  const editVendorGroups = Array.from(
    items.reduce((acc, item) => {
      if (!acc.has(item.vendor_id)) acc.set(item.vendor_id, new Map<number | null, OrderItem[]>())
      const vm = acc.get(item.vendor_id)!
      const k = item.member_id ?? null
      if (!vm.has(k)) vm.set(k, [])
      vm.get(k)!.push(item)
      return acc
    }, new Map<number, Map<number | null, OrderItem[]>>()).entries()
  )

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
          ) : payments.length === 0 ? (
            <span className="text-xs text-gray-300">請先新增訂單品項</span>
          ) : (
            <span className="text-xs text-orange-300">
              尚有 {payments.filter(p => !p.is_paid).length} 筆未付
            </span>
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
          {editVendorGroups.map(([vendorId, memberMap]) => (
            <div key={vendorId}>
              <div className="text-xs font-semibold text-gray-500 mb-2 px-1">
                {maps.vendor[vendorId]?.name ?? '已刪除廠商'}
              </div>
              <div className="space-y-3">
                {Array.from(memberMap.entries()).map(([memberId, memberItems]) => (
                  <div key={memberId ?? 'null'}>
                    {hasMembersInItems && memberId != null && (
                      <div className="text-xs text-gray-400 mb-1.5 px-1">
                        {maps.member[memberId]?.name ?? '已刪除人員'}
                      </div>
                    )}
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
                ))}
              </div>
            </div>
          ))}
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
                      <span className="text-xs text-gray-400">
                        {sec.items.reduce((a, r) => a + r.qty, 0)} {sec.isDrink ? '杯' : '個'}
                      </span>
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
                            {(sec.isDrink || !!row.toppingDesc) && (
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
              {vendorView.map(sec => {
                const vendorAllCash   = sec.vendorPayments.length > 0 && sec.vendorPayments.every(p => p.is_paid && p.payment_method === 'cash')
                const vendorAllWallet = sec.vendorPayments.length > 0 && sec.vendorPayments.every(p => p.is_paid && p.payment_method === 'wallet')
                const vendorAnyPaid   = sec.vendorPayments.some(p => p.is_paid)
                return (
                <div key={sec.vendorId} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <span className="text-sm font-semibold text-gray-700">{sec.vendorName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-orange-500">NT$ {sec.vendorTotal}</span>
                      {sec.vendorPayments.length > 0 && (
                        isCompleted ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            vendorAllCash   ? 'bg-green-100 text-green-600' :
                            vendorAllWallet ? 'bg-blue-100 text-blue-500' :
                            vendorAnyPaid   ? 'bg-yellow-100 text-yellow-600' :
                            'bg-gray-100 text-gray-400'
                          }`}>
                            {vendorAllCash ? '現金' : vendorAllWallet ? '錢包' : vendorAnyPaid ? '部分付' : '未付'}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => orderService.setVendorPayments(order.id!, sec.vendorId, vendorAllCash ? null : 'cash')}
                              className={`text-xs px-2 py-1 rounded-full border transition-colors ${vendorAllCash ? 'bg-green-500 text-white border-green-500' : 'text-gray-400 border-gray-200'}`}
                            >
                              現金
                            </button>
                            <button
                              onClick={() => orderService.setVendorPayments(order.id!, sec.vendorId, vendorAllWallet ? null : 'wallet')}
                              className={`text-xs px-2 py-1 rounded-full border transition-colors ${vendorAllWallet ? 'bg-blue-500 text-white border-blue-500' : 'text-gray-400 border-gray-200'}`}
                            >
                              錢包
                            </button>
                          </div>
                        )
                      )}
                    </div>
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
              )})}
              {vendorView.length === 0 && (
                <p className="text-center text-gray-400 py-6 text-sm">尚無品項</p>
              )}
            </div>
          )}

          {/* ── 依人名（人員→廠商，一鍵付款） ──────────────────────── */}
          {activeTab === 'person' && (
            <div className="p-4 space-y-3">
              {personView.map(sec => {
                const memberAllCash   = sec.memberPayments.length > 0 && sec.memberPayments.every(p => p.is_paid && p.payment_method === 'cash')
                const memberAllWallet = sec.memberPayments.length > 0 && sec.memberPayments.every(p => p.is_paid && p.payment_method === 'wallet')
                const memberAnyPaid   = sec.memberPayments.some(p => p.is_paid)
                return (
                  <div key={sec.sectionKey} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    {/* 人員標題 + 付款 */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <span className="text-sm font-semibold text-gray-700">{sec.memberName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-orange-500">NT$ {sec.memberTotal}</span>
                        {sec.memberPayments.length > 0 && (
                          isCompleted ? (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              memberAllCash   ? 'bg-green-100 text-green-600' :
                              memberAllWallet ? 'bg-blue-100 text-blue-500' :
                              memberAnyPaid   ? 'bg-yellow-100 text-yellow-600' :
                              'bg-gray-100 text-gray-400'
                            }`}>
                              {memberAllCash ? '現金' : memberAllWallet ? '錢包' : memberAnyPaid ? '部分付' : '未付'}
                            </span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => sec.memberId != null
                                  ? orderService.setMemberPayments(order.id!, sec.memberId, memberAllCash ? null : 'cash')
                                  : orderService.setVendorPayments(order.id!, sec.vendorId!, memberAllCash ? null : 'cash')
                                }
                                className={`text-xs px-2 py-1 rounded-full border transition-colors ${memberAllCash ? 'bg-green-500 text-white border-green-500' : 'text-gray-400 border-gray-200'}`}
                              >
                                現金
                              </button>
                              <button
                                onClick={() => sec.memberId != null
                                  ? orderService.setMemberPayments(order.id!, sec.memberId, memberAllWallet ? null : 'wallet')
                                  : orderService.setVendorPayments(order.id!, sec.vendorId!, memberAllWallet ? null : 'wallet')
                                }
                                className={`text-xs px-2 py-1 rounded-full border transition-colors ${memberAllWallet ? 'bg-blue-500 text-white border-blue-500' : 'text-gray-400 border-gray-200'}`}
                              >
                                錢包
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                    {/* 廠商明細 */}
                    {sec.vendorRows.map((vRow, vi) => (
                      <div key={vRow.vendorId} className={vi > 0 ? 'border-t border-gray-100' : ''}>
                        {sec.memberId != null && (
                          <div className="flex items-center justify-between px-4 py-2">
                            <span className="text-xs font-medium text-gray-400">{vRow.vendorName}</span>
                            <span className="text-xs text-orange-400">NT$ {vRow.subtotal}</span>
                          </div>
                        )}
                        {vRow.items.map((row, i) => (
                          <div key={i} className="px-4 py-2 border-t border-gray-50">
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
                    ))}
                  </div>
                )
              })}
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
