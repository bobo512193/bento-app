import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { orderService, storeService, menuService, vendorService, memberService } from '../../db'
import PageHeader from '../../components/PageHeader'
import OrderDetail, { type Maps } from './OrderDetail'

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-')
  return `${year}年${Number(month)}月${Number(day)}日`
}

export default function OrderManagementPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showConfirm, setShowConfirm] = useState(false)
  const [storageUsage, setStorageUsage] = useState('計算中...')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const orders = useLiveQuery(() => orderService.getCompleted())

  const maps = useLiveQuery(async (): Promise<Maps | null> => {
    const [stores, menus, vendors, members] = await Promise.all([
      storeService.getAll(),
      menuService.getAll(),
      vendorService.getAll(),
      memberService.getAll(),
    ])
    return {
      store:  Object.fromEntries(stores.map(s => [s.id!, s])),
      menu:   Object.fromEntries(menus.map(m =>  [m.id!, m])),
      vendor: Object.fromEntries(vendors.map(v => [v.id!, v])),
      member: Object.fromEntries(members.map(m => [m.id!, m])),
    }
  })

  const refreshStorage = () =>
    orderService.getStorageEstimate().then(setStorageUsage)

  useEffect(() => { refreshStorage() }, [])

  // 刪除後清空選取並重新估算容量
  const handleDelete = async () => {
    await orderService.deleteByDates([...selected])
    setSelected(new Set())
    setShowConfirm(false)
    refreshStorage()
  }

  const toggleDate = (date: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(date) ? next.delete(date) : next.add(date)
      return next
    })

  const toggleAll = () => {
    if (!orders?.length) return
    if (selected.size === orders.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(orders.map(o => o.order_date)))
    }
  }

  const allSelected = !!orders?.length && selected.size === orders.length

  return (
    <div>
      <PageHeader title="訂單管理" showBack />

      {/* 容量顯示 */}
      <div className="mx-4 mt-4 bg-orange-50 rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-600">裝置儲存使用量</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-orange-600">{storageUsage}</span>
          <button
            onClick={refreshStorage}
            className="text-xs text-orange-400 border border-orange-200 rounded px-1.5 py-0.5"
          >
            重新整理
          </button>
        </div>
      </div>

      {/* 全選列 */}
      {!!orders?.length && (
        <div className="px-4 pt-4 flex items-center justify-between">
          <button
            onClick={toggleAll}
            className="text-sm text-orange-500 font-medium"
          >
            {allSelected ? '取消全選' : '全選'}
          </button>
          <span className="text-xs text-gray-400">共 {orders.length} 筆訂單</span>
        </div>
      )}

      {/* 日期清單 */}
      <div className="p-4 space-y-2 pb-36">
        {orders?.map(order => (
          <div key={order.order_date} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <input
                type="checkbox"
                checked={selected.has(order.order_date)}
                onChange={() => toggleDate(order.order_date)}
                className="w-5 h-5 accent-orange-500 shrink-0"
              />
              <span className="flex-1 text-sm text-gray-800">
                {formatDate(order.order_date)}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full shrink-0 bg-green-100 text-green-700">
                已完成
              </span>
              <button
                onClick={() => setExpandedId(expandedId === order.id ? null : order.id!)}
                className="text-xs text-orange-500 border border-orange-200 rounded-full px-2.5 py-1 shrink-0"
              >
                {expandedId === order.id ? '收起' : '明細'}
              </button>
            </div>
            {expandedId === order.id && maps && (
              <OrderDetail order={order} maps={maps} />
            )}
          </div>
        ))}

        {orders?.length === 0 && (
          <p className="text-center text-gray-400 py-20 text-sm">尚無訂單資料</p>
        )}
      </div>

      {/* 底部刪除列（有選取時才出現） */}
      {selected.size > 0 && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-200 px-4 pt-3 pb-3 z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              已選取{' '}
              <span className="font-semibold text-gray-800">{selected.size}</span> 筆
            </span>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-gray-400"
            >
              清除選取
            </button>
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full py-3 bg-red-500 text-white text-sm font-semibold rounded-xl"
          >
            刪除選取資料
          </button>
        </div>
      )}

      {/* 二次確認 Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white rounded-t-2xl p-6 w-full max-w-lg mx-auto">
            <h3 className="text-base font-semibold text-gray-800 mb-2">確認刪除</h3>
            <p className="text-sm text-gray-600 mb-1">
              即將刪除{' '}
              <span className="font-semibold text-red-500">{selected.size}</span>{' '}
              筆訂單資料
            </p>
            <p className="text-xs text-gray-400 mb-5">
              訂單品項與付款紀錄將一併刪除，此操作無法復原。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 bg-red-500 text-white text-sm font-semibold rounded-xl"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
