import { useCounter } from '../../hooks/use-counter.ts'
import { useInView } from '../../hooks/use-in-view.ts'

interface CounterProps {
  value: number
  prefix?: string
  suffix: string
  label: string
}

export function Counter({ value, prefix = '', suffix, label }: CounterProps) {
  const { ref, isInView } = useInView(0.3)
  const count = useCounter(value, isInView)

  return (
    <div ref={ref} className="text-center">
      <dt className="text-xp-muted text-sm order-2 mt-1">{label}</dt>
      <dd className="font-mono text-3xl md:text-4xl font-bold text-xp-green order-1">
        {prefix}{count}{suffix}
      </dd>
    </div>
  )
}
