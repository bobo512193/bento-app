import { useLiveQuery } from 'dexie-react-hooks'
import { vendorService, memberService } from '../../db'
import type { Member } from '../../db'
import PageHeader from '../../components/PageHeader'

export default function WalletPage() {
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

  return (
    <div>
      <PageHeader title="錢包" showBack />
      <div className="p-4 space-y-4">

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
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <span className="text-sm font-semibold text-gray-700">{vendor.name}</span>
                {!hasMembers && (
                  <span className={`text-sm font-semibold ${(vendor.balance ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    NT$ {(vendor.balance ?? 0).toLocaleString()}
                  </span>
                )}
                {hasMembers && (
                  <span className="text-xs text-gray-400">{vendorMembers.length} 人</span>
                )}
              </div>
              {hasMembers && (
                <div className="divide-y divide-gray-50">
                  {vendorMembers.map(member => {
                    const bal = member.balance ?? 0
                    return (
                      <div key={member.id} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm text-gray-600">{member.name}</span>
                        <span className={`text-sm font-medium ${bal >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          NT$ {bal.toLocaleString()}
                        </span>
                      </div>
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
    </div>
  )
}
