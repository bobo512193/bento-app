import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export default function UpdateBanner() {
  const [changelog, setChangelog] = useState<string>('')

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      registration && setInterval(() => registration.update(), 30 * 60 * 1000)
    },
  })

  useEffect(() => {
    if (!needRefresh) return
    fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`)
      .then(r => r.json())
      .then((data: { changelog?: string }) => {
        if (data.changelog) setChangelog(data.changelog)
      })
      .catch(() => {})
  }, [needRefresh])

  if (!needRefresh) return null

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 bg-orange-500 text-white px-4 py-3 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">🔄 有新版本可用</div>
          {changelog && (
            <div className="text-xs opacity-90 mt-0.5">{changelog}</div>
          )}
        </div>
        <button
          onClick={() => updateServiceWorker(true)}
          className="text-xs bg-white text-orange-500 font-semibold rounded-full px-3 py-1.5 shrink-0"
        >
          立即更新
        </button>
      </div>
    </div>
  )
}
