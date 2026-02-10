import { Counter } from '../ui/counter.tsx'
import { stats } from '../../data/stats.ts'

export function StatsBar() {
  return (
    <section className="py-16 bg-xp-surface/50 border-y border-xp-border" aria-label="Key statistics">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <Counter
              key={stat.label}
              value={stat.value}
              prefix={stat.prefix}
              suffix={stat.suffix}
              label={stat.label}
            />
          ))}
        </dl>
      </div>
    </section>
  )
}
