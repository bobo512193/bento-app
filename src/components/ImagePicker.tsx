import { useRef } from 'react'

interface Props {
  value: string
  onChange: (base64: string) => void
}

export default function ImagePicker({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 400
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      onChange(canvas.toDataURL('image/jpeg', 0.8))
      URL.revokeObjectURL(url)
    }
    img.src = url
    // reset input so same file can be re-selected
    e.target.value = ''
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-24 h-24 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 active:bg-gray-100"
      >
        {value ? (
          <img src={value} alt="已選圖片" className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-400 text-xs text-center leading-5">點選<br />新增圖片</span>
        )}
      </button>
      {value && (
        <button type="button" onClick={() => onChange('')} className="text-xs text-gray-400">
          移除圖片
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  )
}
