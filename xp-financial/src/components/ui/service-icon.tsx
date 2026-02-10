import {
  DollarSign,
  Shield,
  TrendingUp,
  Rocket,
  FileCheck,
  Receipt,
  Building2,
  FileSearch,
  Users,
  Monitor,
  Globe,
  HelpCircle,
} from 'lucide-react'

const iconMap = {
  DollarSign,
  Shield,
  TrendingUp,
  Rocket,
  FileCheck,
  Receipt,
  Building2,
  FileSearch,
  Users,
  Monitor,
  Globe,
} as const

interface ServiceIconProps {
  name: string
  size?: number
  className?: string
}

export function ServiceIcon({ name, size = 24, className = '' }: ServiceIconProps) {
  const Icon = iconMap[name as keyof typeof iconMap] ?? HelpCircle
  return <Icon size={size} className={className} aria-hidden="true" />
}
