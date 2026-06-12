interface SectionLabelProps {
  number: number
  title: string
  done: boolean
}

export function SectionLabel({ number, title, done }: SectionLabelProps) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
        ${done ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'}`}>
        {done ? '✓' : number}
      </div>
      <h2 className="text-base font-semibold text-gray-800">{title}</h2>
    </div>
  )
}
