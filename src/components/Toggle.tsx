interface Props {
  value: boolean
  onChange: (v: boolean) => void
}

export default function Toggle({ value, onChange }: Props) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-12 h-6 rounded-full transition-colors duration-200 ${value ? 'bg-orange-500' : 'bg-gray-300'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 mx-0.5 ${value ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  )
}
