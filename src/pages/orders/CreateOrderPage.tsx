import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { vendorService, storeService, menuService, memberService, orderService } from '../../db'
import type { Vendor, Member, Store, Menu } from '../../db'
import PageHeader from '../../components/PageHeader'
import QuantityControl from '../../components/QuantityControl'

type StoreWithMenus = Store & { menus: Menu[] }

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function CreateOrderPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'select' | 'items'>('select')

  // ── Step 1 state ──────────────────────────────────────────
  const [orderDate, setOrderDate] = useState(getTodayStr())
  const [vendors, setVendors] = useState<Vendor[]>([])

  // ── Step 2 state ──────────────────────────────────────────
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [members, setMembers] = useState<Member[]>([])       // want_order = true
  const [stores, setStores] = useState<StoreWithMenus[]>([])
  const [activeMemberId, setActiveMemberId] = useState<number | null>(null)

  // memberOrders[memberId][menuId] = qty
  const [memberOrders, setMemberOrders] = useState<Record<number, Record<number, number>>>({})
  // vendorOrders[menuId] = qty
  const [vendorOrders, setVendorOrders] = useState<Record<number, number>>({})

  // Mismatch dialog
  const [showMismatch, setShowMismatch] = useState(false)
  const [mismatchText, setMismatchText] = useState('')

  useEffect(() => {
    vendorService.getActive().then(setVendors)
  }, [])

  // ── 選廠商後載入資料 ──────────────────────────────────────
  const handleSelectVendor = async (v: Vendor) => {
    setVendor(v)
    setMemberOrders({})
    setVendorOrders({})

    const [activeMembers, activeStores] = await Promise.all([
      memberService.getOrderingByVendor(v.id!),
      storeService.getActive(),
    ])
    const storesWithMenus: StoreWithMenus[] = (
      await Promise.all(
        activeStores.map(async store => ({
          ...store,
          menus: await menuService.getByStore(store.id!),
        }))
      )
    ).filter(s => s.menus.length > 0)

    setMembers(activeMembers)
    setStores(storesWithMenus)
    setActiveMemberId(activeMembers[0]?.id ?? null)
    setStep('items')
  }

  // ── 數量讀寫 ──────────────────────────────────────────────
  const getQty = (menuId: number, memberId?: number): number => {
    if (memberId != null) return memberOrders[memberId]?.[menuId] ?? 0
    return vendorOrders[menuId] ?? 0
  }

  const setQty = (menuId: number, qty: number, memberId?: number) => {
    const q = Math.max(0, qty)
    if (memberId != null) {
      setMemberOrders(prev => ({
        ...prev,
        [memberId]: { ...(prev[memberId] ?? {}), [menuId]: q },
      }))
    } else {
      setVendorOrders(prev => ({ ...prev, [menuId]: q }))
    }
  }

  const totalQty = (): number => {
    if (members.length > 0)
      return Object.values(memberOrders)
        .flatMap(o => Object.values(o))
        .reduce((a, b) => a + b, 0)
    return Object.values(vendorOrders).reduce((a, b) => a + b, 0)
  }

  const referenceCount = (): number =>
    members.length > 0 ? members.length : (vendor?.headcount ?? 0)

  const memberHasOrder = (memberId: number): boolean =>
    Object.values(memberOrders[memberId] ?? {}).some(q => q > 0)

  // ── 找 menu 物件 ─────────────────────────────────────────
  const findMenu = (menuId: number): Menu => {
    for (const store of stores) {
      const m = store.menus.find(m => m.id === menuId)
      if (m) return m
    }
    throw new Error(`menu ${menuId} not found`)
  }

  // ── 實際建立訂單 ──────────────────────────────────────────
  const doCreateOrder = async () => {
    const orderId = await orderService.getOrCreateOrder(orderDate)
    if (orderId === null) {
      alert('該日期的訂單已完成，無法再新增')
      return
    }

    if (members.length > 0) {
      for (const member of members) {
        const orders = memberOrders[member.id!] ?? {}
        if (!Object.values(orders).some(q => q > 0)) continue
        for (const [menuIdStr, qty] of Object.entries(orders)) {
          if (qty === 0) continue
          const menu = findMenu(Number(menuIdStr))
          await orderService.addItem({
            order_id: orderId,
            store_id: menu.store_id,
            menu_id: menu.id!,
            vendor_id: vendor!.id!,
            member_id: member.id!,
            quantity: qty,
            unit_price: menu.price,
          })
        }
        await orderService.addPayment({
          order_id: orderId,
          vendor_id: vendor!.id!,
          member_id: member.id!,
          is_paid: false,
        })
      }
    } else {
      for (const [menuIdStr, qty] of Object.entries(vendorOrders)) {
        if (qty === 0) continue
        const menu = findMenu(Number(menuIdStr))
        await orderService.addItem({
          order_id: orderId,
          store_id: menu.store_id,
          menu_id: menu.id!,
          vendor_id: vendor!.id!,
          member_id: null,
          quantity: qty,
          unit_price: menu.price,
        })
      }
      await orderService.addPayment({
        order_id: orderId,
        vendor_id: vendor!.id!,
        member_id: null,
        is_paid: false,
      })
    }

    navigate('/orders', { replace: true })
  }

  // ── 送出前檢查 ────────────────────────────────────────────
  const handleSubmit = () => {
    const total = totalQty()
    if (total === 0) return
    const ref = referenceCount()
    if (ref > 0 && total !== ref) {
      setMismatchText(`目前點餐 ${total} 份，與實際人數 ${ref} 人不符，是否繼續訂餐？`)
      setShowMismatch(true)
      return
    }
    doCreateOrder()
  }

  // ════════════════════════════════════════════════════════
  // Step 1：選日期 + 廠商
  // ════════════════════════════════════════════════════════
  if (step === 'select') {
    return (
      <div>
        <PageHeader title="新增訂單" />
        <div className="p-4 space-y-5">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">訂單日期</label>
            <input
              type="date"
              value={orderDate}
              onChange={e => setOrderDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-2 block">選擇廠商</label>
            <div className="space-y-2">
              {vendors.map(v => (
                <button
                  key={v.id}
                  onClick={() => handleSelectVendor(v)}
                  className="w-full bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3 active:bg-gray-50 text-left"
                >
                  {v.image_base64 ? (
                    <img src={v.image_base64} alt={v.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center text-2xl shrink-0">🏭</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800">{v.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{v.headcount} 人</div>
                  </div>
                  <span className="text-gray-300 text-xl shrink-0">›</span>
                </button>
              ))}
              {vendors.length === 0 && (
                <p className="text-center text-gray-400 py-16 text-sm">尚無啟用中的廠商</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════
  // Step 2：選品項
  // ════════════════════════════════════════════════════════
  const hasMember = members.length > 0
  const total = totalQty()
  const ref = referenceCount()
  const mismatch = ref > 0 && total > 0 && total !== ref

  return (
    <div>
      <PageHeader
        title={`${vendor!.name}・${orderDate}`}
        showBack
        onBack={() => setStep('select')}
      />

      {/* 人員 tab 列 */}
      {hasMember && (
        <div className="flex overflow-x-auto bg-white border-b border-gray-200 px-2 gap-1">
          {members.map(member => (
            <button
              key={member.id}
              onClick={() => setActiveMemberId(member.id!)}
              className={`shrink-0 flex items-center gap-1 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeMemberId === member.id
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {member.name}
              {memberHasOrder(member.id!) && (
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* 菜單列表 */}
      <div className="p-4 space-y-4 pb-36">
        {stores.map(store => (
          <div key={store.id}>
            <div className="text-sm font-semibold text-gray-700 mb-2">{store.name}</div>
            <div className="space-y-2">
              {store.menus.map(menu => {
                const qty = hasMember && activeMemberId != null
                  ? getQty(menu.id!, activeMemberId)
                  : getQty(menu.id!)
                return (
                  <div key={menu.id} className="bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-3">
                    {menu.image_base64 ? (
                      <img src={menu.image_base64} alt={menu.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl shrink-0">🍱</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{menu.name}</div>
                      <div className="text-xs text-orange-500">NT$ {menu.price}</div>
                    </div>
                    <QuantityControl
                      value={qty}
                      onChange={q =>
                        hasMember && activeMemberId != null
                          ? setQty(menu.id!, q, activeMemberId)
                          : setQty(menu.id!, q)
                      }
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {stores.length === 0 && (
          <p className="text-center text-gray-400 py-16 text-sm">尚無可訂餐的店家菜單</p>
        )}
      </div>

      {/* 底部建立訂單列 */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-200 px-4 pt-3 pb-3 z-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">
            點餐{' '}
            <span className={`font-semibold ${mismatch ? 'text-orange-500' : 'text-gray-800'}`}>
              {total}
            </span>{' '}
            份
          </span>
          {ref > 0 && (
            <span className={`text-xs ${mismatch ? 'text-orange-400' : 'text-gray-400'}`}>
              {mismatch ? '⚠ ' : ''}參考人數 {ref} 人
            </span>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={total === 0}
          className="w-full py-3 bg-orange-500 text-white text-sm font-semibold rounded-xl disabled:opacity-40"
        >
          建立訂單
        </button>
      </div>

      {/* 數量不符提示 Dialog */}
      {showMismatch && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white rounded-t-2xl p-6 w-full max-w-lg mx-auto">
            <h3 className="text-base font-semibold text-gray-800 mb-2">數量提醒</h3>
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">{mismatchText}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowMismatch(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600"
              >
                返回修改
              </button>
              <button
                onClick={() => { setShowMismatch(false); doCreateOrder() }}
                className="flex-1 py-3 bg-orange-500 rounded-xl text-sm text-white font-semibold"
              >
                繼續訂餐
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
