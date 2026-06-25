import { useRegisterSW } from 'virtual:pwa-register/react'

export default function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // 每 30 分鐘靜默檢查一次是否有新版本
      registration && setInterval(() => registration.update(), 30 * 60 * 1000)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-50
                    bg-orange-500 text-white px-4 py-3 flex items-center justify-between shadow-lg">
      <span className="text-sm">🔄 有新版本可用</span>
      <button
        onClick={() => updateServiceWorker(true)}
        className="text-xs bg-white text-orange-500 font-semibold rounded-full px-3 py-1.5"
      >
        立即更新
      </button>
    </div>
  )
}
