import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'

function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold text-orange-500">便當訂購</h1>
      <p className="text-gray-500 mt-2">APP 建置中...</p>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter basename="/便當APP">
      <div className="max-w-lg mx-auto min-h-screen flex flex-col bg-white">
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </main>

        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg border-t border-gray-200 bg-white flex justify-around py-2">
          <NavLink to="/" className="flex flex-col items-center text-xs text-gray-500 p-2">
            <span className="text-xl">🏠</span>
            首頁
          </NavLink>
        </nav>
      </div>
    </BrowserRouter>
  )
}

export default App
