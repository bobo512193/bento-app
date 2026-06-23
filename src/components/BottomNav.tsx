import { NavLink, useLocation } from 'react-router-dom'

const tabs = [
  { to: '/orders', icon: '📋', label: '訂單', end: true },
  { to: '/orders/new', icon: '➕', label: '新增訂單', end: true },
  { to: '/management', icon: '⚙️', label: '管理', end: false },
]

export default function BottomNav() {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg border-t border-gray-200 bg-white grid grid-cols-3 z-20">
      {tabs.map(tab => {
        const isActive = tab.end
          ? location.pathname === tab.to
          : location.pathname.startsWith(tab.to)
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={`flex flex-col items-center py-2 pb-safe text-xs ${isActive ? 'text-orange-500' : 'text-gray-400'}`}
          >
            <span className="text-xl leading-6">{tab.icon}</span>
            {tab.label}
          </NavLink>
        )
      })}
    </nav>
  )
}
