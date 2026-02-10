import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`gradient-border bg-xp-card p-6 rounded-xl transition-all duration-300 hover:-translate-y-1 ${className}`}>
      {children}
    </div>
  )
}
