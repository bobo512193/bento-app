import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  vendorService, storeService, menuService, memberService, orderService, toppingService,
  SWEETNESS_OPTIONS, ICE_OPTIONS,
} from '../../db'
import type { Vendor, Member, Store, Menu, Topping } from '../../db'
import PageHeader from '../../components/PageHeader'
import QuantityControl from '../../components/QuantityControl'

type StoreWithMenus = Store & { menus: Menu[] }

type ItemState = {
  qty: number
  sweetness: string
  ice: string
  toppingIds: number[]
}

function defaultItemState(): ItemState {
  return { qty: 0, sweetness: '半糖', ice: '少冰', toppingIds: [] }
}

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function CreateOrderPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'select' | 'items'>('select')

  // ── Step 1 ────────────────────────────────────────────────
  const [orderDate, setOrderDate] = useState(getTodayStr())
  const [vendors, setVendors] = useState<Vendor[]>([])

  // ── Step 2 ────────────────────────────────────────────────
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [stores,  setStores]  = useState<StoreWithMenus[]>([])

  // memberOrders[memberId][menuId] = ItemState
  const [memberOrders, setMemberOrders] = useState<Record<number, Record<number, ItemState>>>({})
  // vendorOrders[menuId] = ItemState (no members)
  const [vendorOrders, setVendorOrders] = useState<Record<number, ItemState>>({})
  // storeToppings[storeId] = Topping[]
  const [storeToppings, setStoreToppings] = useState<Record<number, Topping[]>>({})

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
    setStoreToppings({})

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

    const drinkStores = storesWithMenus.filter(s => (s.type ?? 'bento') === 'drink')
    const toppingsEntries = await Promise.all(
      drinkStores.map(async s => [s.id!, await toppingService.getByStore(s.id!)] as const)
    )
    setStoreToppings(Object.fromEntries(toppingsEntries))
    setMembers(activeMembers)
    setStores(storesWithMenus)
    setStep('items')
  }

  // ── 狀態讀寫 helper ───────────────────────────────────────
  const getItemState = (menuId: number, memberId?: number): ItemState => {
    const raw = memberId != null
      ? memberOrders[memberId]?.[menuId]
      : vendorOrders[menuId]
    return raw ?? defaultItemState()
  }

  const updateItemState = (menuId: number, next: ItemState, memberId?: number) => {
    if (memberId != null) {
      setMemberOrders(prev => ({
        ...prev,
        [memberId]: { ...(prev[memberId] ?? {}), [menuId]: next },
      }))
    } else {
      setVendorOrders(prev => ({ ...prev, [menuId]: next }))
    }
  }

  const setQty       = (menuId: number, qty: number, memberId?: number) =>
    updateItemState(menuId, { ...getItemState(menuId, memberId), qty: Math.max(0, qty) }, memberId)
  const setSweetness = (menuId: number, val: string, memberId?: number) =>
    updateItemState(menuId, { ...getItemState(menuId, memberId), sweetness: val }, memberId)
  const setIce       = (menuId: number, val: string, memberId?: number) =>
    updateItemState(menuId, { ...getItemState(menuId, memberId), ice: val }, memberId)
  const toggleTopping = (menuId: number, toppingId: number, memberId?: number) => {
    const cur = getItemState(menuId, memberId)
    const ids = cur.toppingIds.includes(toppingId)
      ? cur.toppingIds.filter(i => i !== toppingId)
      : [...cur.toppingIds, toppingId]
    updateItemState(menuId, { ...cur, toppingIds: ids }, memberId)
  }

  // ── 數量統計 ──────────────────────────────────────────────
  const totalQty = (): number => {
    if (members.length > 0)
      return Object.values(memberOrders).flatMap(o => Object.values(o)).reduce((a, s) => a + s.qty, 0)
    return Object.values(vendorOrders).reduce((a, s) => a + s.qty, 0)
  }

  const referenceCount = (): number =>
    members.length > 0 ? members.length : (vendor?.headcount ?? 0)

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

    const buildItem = (menuId: number, itemState: ItemState, memberId: number | null) => {
      const menu  = findMenu(menuId)
      const store = stores.find(s => s.id === menu.store_id)
      const isDrink = (store?.type ?? 'bento') === 'drink'
      const toppingList = isDrink && itemState.toppingIds.length > 0
        ? itemState.toppingIds
            .map(tid => (storeToppings[menu.store_id] ?? []).find(t => t.id === tid))
            .filter((t): t is Topping => !!t && t.id != null)
            .map(t => ({ topping_id: t.id!, name: t.name, price: t.price }))
        : null
      return {
        order_id:   orderId,
        store_id:   menu.store_id,
        menu_id:    menu.id!,
        vendor_id:  vendor!.id!,
        member_id:  memberId,
        quantity:   itemState.qty,
        unit_price: menu.price,
        sweetness:  isDrink ? (itemState.sweetness || null) : null,
        ice:        isDrink ? (itemState.ice || null) : null,
        toppings:   toppingList,
      }
    }

    if (members.length > 0) {
      for (const member of members) {
        const itemStates = memberOrders[member.id!] ?? {}
        if (!Object.values(itemStates).some(s => s.qty > 0)) continue
        for (const [menuIdStr, itemState] of Object.entries(itemStates)) {
          if (itemState.qty === 0) continue
          await orderService.addItem(buildItem(Number(menuIdStr), itemState, member.id!))
        }
        await orderService.addPayment({ order_id: orderId, vendor_id: vendor!.id!, member_id: member.id!, is_paid: false })
      }
    } else {
      for (const [menuIdStr, itemState] of Object.entries(vendorOrders)) {
        if (itemState.qty === 0) continue
        await orderService.addItem(buildItem(Number(menuIdStr), itemState, null))
      }
      await orderService.addPayment({ order_id: orderId, vendor_id: vendor!.id!, member_id: null, is_paid: false })
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
  const total     = totalQty()
  const ref       = referenceCount()
  const mismatch  = ref > 0 && total > 0 && total !== ref

  return (
    <div>
      <PageHeader
        title={`${vendor!.name}・${orderDate}`}
        showBack
        onBack={() => setStep('select')}
      />

      {/* 菜單列表 */}
      <div className="p-4 space-y-4 pb-36">
        {stores.map(store => {
          const isDrink    = (store.type ?? 'bento') === 'drink'
          const storeTopps = storeToppings[store.id!] ?? []

          return (
            <div key={store.id}>
              <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                {isDrink ? '🧋' : '🍱'} {store.name}
              </div>
              <div className="space-y-2">
                {store.menus.map(menu => {

                  // ── 有人員：品項下方列出各人員 +/- ─────────────
                  if (hasMember) {
                    const memberTotal = members.reduce(
                      (a, m) => a + (memberOrders[m.id!]?.[menu.id!]?.qty ?? 0), 0
                    )
                    return (
                      <div key={menu.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        {/* 品項標題列 */}
                        <div className="px-3 py-3 flex items-center gap-3">
                          {menu.image_base64 ? (
                            <img src={menu.image_base64} alt={menu.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl shrink-0">
                              {isDrink ? '🧋' : '🍱'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">{menu.name}</div>
                            <div className="text-xs text-orange-500">NT$ {menu.price}</div>
                          </div>
                          {memberTotal > 0 && (
                            <span className="text-sm font-semibold text-orange-500 shrink-0">× {memberTotal}</span>
                          )}
                        </div>

                        {/* 各人員 +/- 數量 */}
                        <div className="border-t border-gray-100 divide-y divide-gray-50">
                          {members.map(member => {
                            const itemState = getItemState(menu.id!, member.id!)
                            const qty       = itemState.qty
                            return (
                              <div key={member.id}>
                                <div className="px-3 py-2.5 flex items-center justify-between">
                                  <span className={`text-sm ${qty > 0 ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                                    {member.name}
                                  </span>
                                  <QuantityControl
                                    value={qty}
                                    onChange={q => setQty(menu.id!, q, member.id!)}
                                  />
                                </div>

                                {/* 飲料客製化（qty > 0 時展開） */}
                                {qty > 0 && isDrink && (
                                  <div className="px-3 pb-2.5 pt-1 space-y-1.5 bg-gray-50">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-xs text-gray-400 w-8 shrink-0">甜度</span>
                                      {SWEETNESS_OPTIONS.map(opt => (
                                        <button
                                          key={opt}
                                          onClick={() => setSweetness(menu.id!, opt, member.id!)}
                                          className={`px-2.5 py-0.5 text-xs rounded-full border transition-colors ${
                                            itemState.sweetness === opt
                                              ? 'border-orange-500 bg-orange-50 text-orange-600'
                                              : 'border-gray-200 bg-white text-gray-500'
                                          }`}
                                        >
                                          {opt}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-xs text-gray-400 w-8 shrink-0">冰塊</span>
                                      {ICE_OPTIONS.map(opt => (
                                        <button
                                          key={opt}
                                          onClick={() => setIce(menu.id!, opt, member.id!)}
                                          className={`px-2.5 py-0.5 text-xs rounded-full border transition-colors ${
                                            itemState.ice === opt
                                              ? 'border-orange-500 bg-orange-50 text-orange-600'
                                              : 'border-gray-200 bg-white text-gray-500'
                                          }`}
                                        >
                                          {opt}
                                        </button>
                                      ))}
                                    </div>
                                    {storeTopps.length > 0 && (
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-xs text-gray-400 w-8 shrink-0">加料</span>
                                        {storeTopps.map(topping => {
                                          const selected = itemState.toppingIds.includes(topping.id!)
                                          return (
                                            <button
                                              key={topping.id}
                                              onClick={() => toggleTopping(menu.id!, topping.id!, member.id!)}
                                              className={`px-2.5 py-0.5 text-xs rounded-full border transition-colors ${
                                                selected
                                                  ? 'border-orange-500 bg-orange-50 text-orange-600'
                                                  : 'border-gray-200 bg-white text-gray-500'
                                              }`}
                                            >
                                              {topping.name} +{topping.price}
                                            </button>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  }

                  // ── 無人員：單一 +/- 數量 ─────────────────────
                  const itemState = getItemState(menu.id!)
                  const qty       = itemState.qty
                  return (
                    <div key={menu.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                      <div className="p-3 flex items-center gap-3">
                        {menu.image_base64 ? (
                          <img src={menu.image_base64} alt={menu.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl shrink-0">
                            {isDrink ? '🧋' : '🍱'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">{menu.name}</div>
                          <div className="text-xs text-orange-500">NT$ {menu.price}</div>
                        </div>
                        <QuantityControl
                          value={qty}
                          onChange={q => setQty(menu.id!, q)}
                        />
                      </div>
                      {qty > 0 && isDrink && (
                        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-gray-100 bg-gray-50">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-gray-400 w-8 shrink-0">甜度</span>
                            {SWEETNESS_OPTIONS.map(opt => (
                              <button
                                key={opt}
                                onClick={() => setSweetness(menu.id!, opt)}
                                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                                  itemState.sweetness === opt
                                    ? 'border-orange-500 bg-orange-50 text-orange-600'
                                    : 'border-gray-200 bg-white text-gray-500'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-gray-400 w-8 shrink-0">冰塊</span>
                            {ICE_OPTIONS.map(opt => (
                              <button
                                key={opt}
                                onClick={() => setIce(menu.id!, opt)}
                                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                                  itemState.ice === opt
                                    ? 'border-orange-500 bg-orange-50 text-orange-600'
                                    : 'border-gray-200 bg-white text-gray-500'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                          {storeTopps.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs text-gray-400 w-8 shrink-0">加料</span>
                              {storeTopps.map(topping => {
                                const selected = itemState.toppingIds.includes(topping.id!)
                                return (
                                  <button
                                    key={topping.id}
                                    onClick={() => toggleTopping(menu.id!, topping.id!)}
                                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                                      selected
                                        ? 'border-orange-500 bg-orange-50 text-orange-600'
                                        : 'border-gray-200 bg-white text-gray-500'
                                    }`}
                                  >
                                    {topping.name} +{topping.price}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
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

      {/* 數量不符提示 */}
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
