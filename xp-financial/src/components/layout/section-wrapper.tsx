import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useInView } from '../../hooks/use-in-view.ts'

interface SectionWrapperProps {
  id: string
  children: ReactNode
  className?: string
}

export function SectionWrapper({ id, children, className = '' }: SectionWrapperProps) {
  const { ref, isInView } = useInView(0.1)

  return (
    <section id={id} ref={ref} className={`py-20 md:py-28 ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        {children}
      </motion.div>
    </section>
  )
}
