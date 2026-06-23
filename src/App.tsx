import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import OrderListPage from './pages/orders/OrderListPage'
import CreateOrderPage from './pages/orders/CreateOrderPage'
import ManagementPage from './pages/management/ManagementPage'
import StoreListPage from './pages/stores/StoreListPage'
import StoreFormPage from './pages/stores/StoreFormPage'
import MenuListPage from './pages/menus/MenuListPage'
import MenuFormPage from './pages/menus/MenuFormPage'

function App() {
  return (
    <BrowserRouter basename="/便當APP">
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
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
