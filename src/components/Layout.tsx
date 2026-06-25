import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import UpdateBanner from './UpdateBanner'

export default function Layout() {
  return (
    <div className="max-w-lg mx-auto min-h-screen flex flex-col bg-gray-50">
      <UpdateBanner />
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
