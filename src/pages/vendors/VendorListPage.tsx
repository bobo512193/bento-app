import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { vendorService } from '../../db'
import PageHeader from '../../components/PageHeader'

export default function VendorListPage() {
  const vendors = useLiveQuery(() => vendorService.getAll())

  return (
    <div>
      <PageHeader
        title="廠商管理"
        showBack
        action={
          <Link to="/management/vendors/new" className="text-orange-500 text-sm font-medium">
            新增
          </Link>
        }
      />
      <div className="p-4 space-y-3">
        {vendors?.map(vendor => (
          <div
            key={vendor.id}
            className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3"
          >
            {vendor.image_base64 ? (
              <img src={vendor.image_base64} alt={vendor.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl shrink-0">🏭</div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-800 truncate">{vendor.name}</div>
              <div className="text-xs text-gray-400 mt-0.5">{vendor.headcount} 人</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full ${vendor.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                {vendor.is_active ? '啟用' : '停用'}
              </span>
              <Link to={`/management/vendors/${vendor.id}/edit`} className="text-gray-300 text-xl leading-none">›</Link>
            </div>
          </div>
        ))}
        {vendors?.length === 0 && (
          <p className="text-center text-gray-400 py-16 text-sm">尚無廠商，點右上角新增</p>
        )}
      </div>
    </div>
  )
}
