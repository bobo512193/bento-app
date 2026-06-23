import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'

const items = [
  { to: '/management/stores', icon: '🏪', label: '店家管理' },
  { to: '/management/menus', icon: '🍱', label: '菜單管理' },
  { to: '/management/vendors', icon: '🏭', label: '廠商管理' },
  { to: '/management/members', icon: '👥', label: '人員管理' },
  { to: '/order-management', icon: '🗑️', label: '訂單管理' },
]

export default function ManagementPage() {
  return (
    <div>
      <PageHeader title="管理" />
      <div className="grid grid-cols-2 gap-3 p-4">
        {items.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100 active:bg-gray-50"
          >
            <div className="text-3xl mb-2">{item.icon}</div>
            <div className="text-sm font-medium text-gray-700">{item.label}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
