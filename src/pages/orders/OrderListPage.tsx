import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { orderService, storeService, menuService, vendorService, memberService } from '../../db'
import PageHeader from '../../components/PageHeader'
import OrderDetail from './OrderDetail'

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-')
  return `${year}年${Number(month)}月${Number(day)}日`
}

export default function OrderListPage() {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const data = useLiveQuery(async () => {
    const [orders, stores, menus, vendors, members] = await Promise.all([
      orderService.getAll(),
      storeService.getAll(),
      menuService.getAll(),
      vendorService.getAll(),
      memberService.getAll(),
    ])
    return {
      orders,
      maps: {
        store:  Object.fromEntries(stores.map(s => [s.id!,  s])),
        menu:   Object.fromEntries(menus.map(m =>  [m.id!,  m])),
        vendor: Object.fromEntries(vendors.map(v => [v.id!, v])),
        member: Object.fromEntries(members.map(m => [m.id!, m])),
      },
    }
  })

  return (
    <div>
      <PageHeader title="訂單列表" />
      <div className="p-4 space-y-3">
        {data?.orders.map(order => (
          <div key={order.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            {/* 訂單標題列 */}
            <button
              onClick={() => setExpandedId(expandedId === order.id ? null : order.id!)}
              className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50"
            >
              <span className="text-sm font-semibold text-gray-800">
                {formatDate(order.order_date)}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  order.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-orange-100 text-orange-600'
                }`}>
                  {order.status === 'completed' ? '已完成' : '未完成'}
                </span>
                <span className="text-gray-400 text-lg leading-none">
                  {expandedId === order.id ? '∨' : '›'}
                </span>
              </div>
            </button>

            {/* 訂單詳情（展開時） */}
            {expandedId === order.id && data && (
              <OrderDetail order={order} maps={data.maps} />
            )}
          </div>
        ))}

        {data?.orders.length === 0 && (
          <p className="text-center text-gray-400 py-20 text-sm">尚無訂單，點下方 ➕ 建立訂單</p>
        )}
      </div>
    </div>
  )
}
