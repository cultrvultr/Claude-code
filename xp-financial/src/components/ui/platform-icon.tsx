interface PlatformIconProps {
  platform: 'fortnite' | 'roblox' | 'discord'
  size?: number
  className?: string
}

const platformLabels = {
  fortnite: 'Fortnite',
  roblox: 'Roblox',
  discord: 'Discord',
}

export function PlatformIcon({ platform, size = 32, className = '' }: PlatformIconProps) {
  const label = platformLabels[platform]

  const icons = {
    fortnite: (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} role="img" aria-label={label}>
        <rect width="32" height="32" rx="8" fill="#0054FF" fillOpacity="0.15" />
        <path d="M10 8h12v3h-8v4h6v3h-6v6h-4V8z" fill="#0054FF" />
      </svg>
    ),
    roblox: (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} role="img" aria-label={label}>
        <rect width="32" height="32" rx="8" fill="#E2382C" fillOpacity="0.15" />
        <path d="M8.5 11L21 8.5l2.5 12.5L11 23.5 8.5 11zm6.5 3.5l-1.5 4 4.5-1-1-4-2 1z" fill="#E2382C" />
      </svg>
    ),
    discord: (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} role="img" aria-label={label}>
        <rect width="32" height="32" rx="8" fill="#5865F2" fillOpacity="0.15" />
        <path d="M22.5 10.5a14 14 0 00-3.5-1.1 11 11 0 00-.5 1 13 13 0 00-3.9 0 11 11 0 00-.5-1 14 14 0 00-3.5 1.1C7.3 15.4 6.7 20.1 7 24.8a14 14 0 004.3 2.2 11 11 0 001-1.6 9 9 0 01-1.4-.7l.3-.3a10 10 0 008.6 0l.4.3a9 9 0 01-1.5.7 11 11 0 001 1.6 14 14 0 004.3-2.2c.4-5.4-.8-10-3.5-14.3zM13 22.2c-1.2 0-2.2-1.1-2.2-2.5s1-2.5 2.2-2.5 2.2 1.1 2.2 2.5-1 2.5-2.2 2.5zm6 0c-1.2 0-2.2-1.1-2.2-2.5s1-2.5 2.2-2.5 2.2 1.1 2.2 2.5-1 2.5-2.2 2.5z" fill="#5865F2" />
      </svg>
    ),
  }

  return icons[platform]
}
