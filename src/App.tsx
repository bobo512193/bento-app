import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import OrderListPage from './pages/orders/OrderListPage'
import CreateOrderPage from './pages/orders/CreateOrderPage'
import ManagementPage from './pages/management/ManagementPage'
import StoreListPage from './pages/stores/StoreListPage'
import StoreFormPage from './pages/stores/StoreFormPage'
import ToppingListPage from './pages/stores/ToppingListPage'
import ToppingFormPage from './pages/stores/ToppingFormPage'
import MenuListPage from './pages/menus/MenuListPage'
import MenuFormPage from './pages/menus/MenuFormPage'
import VendorListPage from './pages/vendors/VendorListPage'
import VendorFormPage from './pages/vendors/VendorFormPage'
import MemberListPage from './pages/members/MemberListPage'
import MemberFormPage from './pages/members/MemberFormPage'
import OrderManagementPage from './pages/orders/OrderManagementPage'
import WalletPage from './pages/management/WalletPage'

function App() {
  return (
    <HashRouter>
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

          {/* 加料管理（飲料店家） */}
          <Route path="management/stores/:id/toppings" element={<ToppingListPage />} />
          <Route path="management/stores/:id/toppings/new" element={<ToppingFormPage />} />
          <Route path="management/stores/:id/toppings/:tid/edit" element={<ToppingFormPage />} />

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

          {/* 錢包 */}
          <Route path="management/wallet" element={<WalletPage />} />

          {/* 訂單管理（清除） */}
          <Route path="order-management" element={<OrderManagementPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
