import { useNavigate } from 'react-router-dom'

interface Props {
  title: string
  showBack?: boolean
  onBack?: () => void   // 覆寫預設的 navigate(-1)
  action?: React.ReactNode
}

export default function PageHeader({ title, showBack, onBack, action }: Props) {
  const navigate = useNavigate()
  const handleBack = () => (onBack ? onBack() : navigate(-1))
  return (
    <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-2 z-10">
      {showBack && (
        <button onClick={handleBack} className="text-orange-500 text-lg leading-none pr-1">
          ‹
        </button>
      )}
      <h1 className="flex-1 text-base font-semibold text-gray-800 truncate">{title}</h1>
      {action}
    </div>
  )
}
