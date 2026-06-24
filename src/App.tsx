import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import OrderListPage from './pages/orders/OrderListPage'
import CreateOrderPage from './pages/orders/CreateOrderPage'
import ManagementPage from './pages/management/ManagementPage'
import StoreListPage from './pages/stores/StoreListPage'
import StoreFormPage from './pages/stores/StoreFormPage'
import MenuListPage from './pages/menus/MenuListPage'
import MenuFormPage from './pages/menus/MenuFormPage'
import VendorListPage from './pages/vendors/VendorListPage'
import VendorFormPage from './pages/vendors/VendorFormPage'
import MemberListPage from './pages/members/MemberListPage'
import MemberFormPage from './pages/members/MemberFormPage'
import OrderManagementPage from './pages/orders/OrderManagementPage'

function App() {
  return (
    <BrowserRouter basename="/bento-app">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/orders" replace />} />

          {/* 訂單 */}
          <Route path="orders" element={<OrderListPage />} />
          <Route path="orders/new" element={<CreateOrderPage />} />

          {/* 管理 */}
          <Route path="management" element={<ManagementPage />} />

          {/* 店家管理 */}
          <Route path="management/stores" element={<StoreListPage />} />
          <Route path="management/stores/new" element={<StoreFormPage />} />
          <Route path="management/stores/:id/edit" element={<StoreFormPage />} />

          {/* 菜單管理 */}
          <Route path="management/menus" element={<MenuListPage />} />
          <Route path="management/menus/new" element={<MenuFormPage />} />
          <Route path="management/menus/:id/edit" element={<MenuFormPage />} />

          {/* 廠商管理 */}
          <Route path="management/vendors" element={<VendorListPage />} />
          <Route path="management/vendors/new" element={<VendorFormPage />} />
          <Route path="management/vendors/:id/edit" element={<VendorFormPage />} />

          {/* 人員管理 */}
          <Route path="management/members" element={<MemberListPage />} />
          <Route path="management/members/new" element={<MemberFormPage />} />
          <Route path="management/members/:id/edit" element={<MemberFormPage />} />

          {/* 訂單管理（清除） */}
          <Route path="order-management" element={<OrderManagementPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
