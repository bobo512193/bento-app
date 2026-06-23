import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { vendorService, memberService } from '../../db'
import type { Member } from '../../db'
import PageHeader from '../../components/PageHeader'

export default function MemberListPage() {
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

  return (
    <div>
      <PageHeader
        title="人員管理"
        showBack
        action={
          <Link to="/management/members/new" className="text-orange-500 text-sm font-medium">
            新增
          </Link>
        }
      />
      <div className="p-4 space-y-5">
        {data?.vendors.map(vendor => {
          const vendorMembers = membersByVendor?.[vendor.id!] ?? []
          const orderingCount = vendorMembers.filter(m => m.want_order).length
          return (
            <div key={vendor.id}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-700">{vendor.name}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                  {vendorMembers.length} 人
                </span>
                {vendorMembers.length > 0 && (
                  <span className="text-xs text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full">
                    訂餐 {orderingCount} 人
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {vendorMembers.map(member => (
                  <div
                    key={member.id}
                    className="bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-3"
                  >
                    {member.image_base64 ? (
                      <img src={member.image_base64} alt={member.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg shrink-0">👤</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{member.name}</div>
                      {member.phone && <div className="text-xs text-gray-400">{member.phone}</div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${member.want_order ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                        {member.want_order ? '訂餐' : '不訂'}
                      </span>
                      <Link to={`/management/members/${member.id}/edit`} className="text-gray-300 text-xl leading-none">›</Link>
                    </div>
                  </div>
                ))}
                {vendorMembers.length === 0 && (
                  <p className="text-xs text-gray-400 pl-1">尚無人員</p>
                )}
              </div>
            </div>
          )
        })}
        {data?.vendors.length === 0 && (
          <p className="text-center text-gray-400 py-16 text-sm">請先新增廠商，再新增人員</p>
        )}
      </div>
    </div>
  )
}
