import { useEffect, useState } from 'react'

export function useCounter(target: number, isActive: boolean, duration = 2000) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isActive) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const startTime = performance.now()
    const isDecimal = target % 1 !== 0
    let frameId: number

    function animate(currentTime: number) {
      if (prefersReducedMotion) {
        setCount(target)
        return
      }

      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      const current = eased * target
      setCount(isDecimal ? parseFloat(current.toFixed(1)) : Math.floor(current))

      if (progress < 1) {
        frameId = requestAnimationFrame(animate)
      }
    }

    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [target, isActive, duration])

  return count
}
