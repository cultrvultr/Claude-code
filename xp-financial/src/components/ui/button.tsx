import type { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  variant?: 'primary' | 'outline' | 'ghost'
  href?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  className?: string
  disabled?: boolean
}

export function Button({ children, variant = 'primary', href, onClick, type = 'button', className = '', disabled = false }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 cursor-pointer'

  const variants = {
    primary: 'bg-xp-green text-xp-dark hover:brightness-110 glow-green-hover',
    outline: 'border border-xp-border text-xp-text hover:border-xp-green hover:text-xp-green',
    ghost: 'text-xp-muted hover:text-xp-green',
  }

  const disabledClass = disabled ? 'opacity-60 cursor-not-allowed' : ''
  const classes = `${base} ${variants[variant]} ${disabledClass} ${className}`

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    )
  }

  return (
    <button type={type} onClick={onClick} className={classes} disabled={disabled}>
      {children}
    </button>
  )
}
