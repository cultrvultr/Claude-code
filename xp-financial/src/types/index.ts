export interface Service {
  icon: string
  title: string
  description: string
}

export interface Testimonial {
  quote: string
  name: string
  handle: string
  platform: 'fortnite' | 'roblox' | 'discord'
  role: string
}

export interface FAQItem {
  question: string
  answer: string
}

export interface Platform {
  name: string
  platform: 'fortnite' | 'roblox' | 'discord'
  description: string
  bullets: string[]
}

export interface Stat {
  value: number
  suffix: string
  prefix?: string
  label: string
}
