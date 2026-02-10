import { motion } from 'framer-motion'
import { Link, Settings, Zap } from 'lucide-react'
import { SectionWrapper } from '../layout/section-wrapper.tsx'

const steps = [
  {
    number: '01',
    icon: Link,
    title: 'Connect',
    description:
      'We sync with your creator platforms, payment processors, and bank accounts to get a complete picture of your financial landscape.',
  },
  {
    number: '02',
    icon: Settings,
    title: 'Optimize',
    description:
      'We handle bookkeeping, tax prep, entity structuring, and financial strategy — tailored to your specific creator economy.',
  },
  {
    number: '03',
    icon: Zap,
    title: 'Level Up',
    description:
      'Focus on creating while your finances grow. We proactively identify opportunities and keep you compliant and profitable.',
  },
]

export function HowItWorks() {
  return (
    <SectionWrapper id="how-it-works">
      <div className="text-center mb-14">
        <h2 className="text-3xl md:text-4xl font-bold">
          How it <span className="text-xp-green">works</span>
        </h2>
        <p className="mt-4 text-xp-muted max-w-2xl mx-auto">
          Getting started is simple. We integrate with your existing workflow so you can
          keep doing what you do best.
        </p>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
        {/* Connecting line (desktop) */}
        <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px border-t-2 border-dashed border-xp-border" />

        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.2, duration: 0.5 }}
            className="relative text-center"
          >
            <div className="relative z-10 w-16 h-16 mx-auto rounded-full bg-xp-card border-2 border-xp-green/30 flex items-center justify-center mb-6">
              <step.icon size={24} className="text-xp-green" />
            </div>
            <span className="text-xs font-mono text-xp-green/60 uppercase tracking-widest">
              Step {step.number}
            </span>
            <h3 className="text-xl font-bold mt-2 mb-3">{step.title}</h3>
            <p className="text-xp-muted text-sm leading-relaxed max-w-xs mx-auto">
              {step.description}
            </p>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  )
}
