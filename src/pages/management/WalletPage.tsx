import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { vendorService, memberService } from '../../db'
import type { Member } from '../../db'
import { balanceService } from '../../db/balance'
import PageHeader from '../../components/PageHeader'

export default function WalletPage() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [clearResult, setClearResult] = useState<number | null>(null)

  const data = useLiveQuery(async () => {
    const [vendors, members] = await Promise.all([
      vendorService.getAll(),
      memberService.getAll(),
    ])
    return { vendors, members }
  })

  const membersByVendor = data?.members.reduce<Record<number, Member[]>>((acc, m) => {
    if (!acc[m.vendor_id]) acc[m.vendor_id] = []
    acc[m.vendor_id].push(m)
    return acc
  }, {})

  const vendorTotal = data?.vendors.reduce((s, v) => s + (v.balance ?? 0), 0) ?? 0
  const memberTotal = data?.members.reduce((s, m) => s + (m.balance ?? 0), 0) ?? 0
  const grandTotal = vendorTotal + memberTotal

  const handleClear = async () => {
    const count = await balanceService.clearOldLogs()
    setClearResult(count)
    setShowConfirm(false)
  }

  return (
    <div>
      <PageHeader
        title="錢包"
        showBack
        action={
          <button
            onClick={() => { setShowConfirm(true); setClearResult(null) }}
            className="text-red-400 text-sm font-medium"
          >
            清理
          </button>
        }
      />
      <div className="p-4 space-y-4">

        {/* 清理結果提示 */}
        {clearResult !== null && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-700">
            {clearResult > 0 ? `已刪除 ${clearResult} 筆兩個月前的記錄` : '沒有需要清理的舊記錄'}
          </div>
        )}

        {/* 總餘額 */}
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 text-center">
          <p className="text-xs text-gray-400 mb-1">總餘額</p>
          <p className={`text-3xl font-bold ${grandTotal >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            NT$ {grandTotal.toLocaleString()}
          </p>
          <div className="flex justify-center gap-6 mt-3 text-xs text-gray-400">
            <span>廠商 <span className={vendorTotal >= 0 ? 'text-green-600' : 'text-red-500'}>NT$ {vendorTotal.toLocaleString()}</span></span>
            <span>人員 <span className={memberTotal >= 0 ? 'text-green-600' : 'text-red-500'}>NT$ {memberTotal.toLocaleString()}</span></span>
          </div>
        </div>

        {/* 各廠商／人員明細 */}
        {data?.vendors.map(vendor => {
          const vendorMembers = membersByVendor?.[vendor.id!] ?? []
          const hasMembers = vendorMembers.length > 0
          return (
            <div key={vendor.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* 廠商標題列 */}
              {!hasMembers ? (
                <Link
                  to={`/management/wallet/vendor/${vendor.id}`}
                  className="flex items-center justify-between px-4 py-3 active:bg-gray-50"
                >
                  <span className="text-sm font-semibold text-gray-700">{vendor.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${(vendor.balance ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      NT$ {(vendor.balance ?? 0).toLocaleString()}
                    </span>
                    <span className="text-gray-300 text-xl leading-none">›</span>
                  </div>
                </Link>
              ) : (
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                  <span className="text-sm font-semibold text-gray-700">{vendor.name}</span>
                  <span className="text-xs text-gray-400">{vendorMembers.length} 人</span>
                </div>
              )}

              {/* 人員列 */}
              {hasMembers && (
                <div className="divide-y divide-gray-50">
                  {vendorMembers.map(member => {
                    const bal = member.balance ?? 0
                    return (
                      <Link
                        key={member.id}
                        to={`/management/wallet/member/${member.id}`}
                        className="flex items-center justify-between px-4 py-2.5 active:bg-gray-50"
                      >
                        <span className="text-sm text-gray-600">{member.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${bal >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            NT$ {bal.toLocaleString()}
                          </span>
                          <span className="text-gray-300 text-xl leading-none">›</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {data?.vendors.length === 0 && (
          <p className="text-center text-gray-400 py-16 text-sm">尚無資料</p>
        )}
      </div>

      {/* 清理確認 Modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-t-2xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-base font-semibold text-gray-800">清理舊記錄</div>
            <p className="text-sm text-gray-500">
              將刪除兩個月前的所有餘額記錄，此操作無法復原。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 text-gray-500 text-sm border border-gray-200 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleClear}
                className="flex-1 py-2.5 text-white text-sm font-medium bg-red-500 rounded-lg"
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
