interface Props {
  value: number
  onChange: (v: number) => void
}

export default function QuantityControl({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={() => onChange(value - 1)}
        disabled={value === 0}
        className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 disabled:opacity-30 text-base leading-none select-none"
      >
        −
      </button>
      <span className="w-5 text-center text-sm font-semibold text-gray-800 tabular-nums">
        {value}
      </span>
      <button
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-base leading-none select-none"
      >
        +
      </button>
    </div>
  )
}
