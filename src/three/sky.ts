import type { TimeOfDay } from '@/types'

/**
 * Sky backdrops drawn with CSS behind the transparent WebGL canvas (and behind the loading state),
 * so time-of-day changes cross-fade smoothly and cost nothing to render.
 */
export const SKY: Record<TimeOfDay, string> = {
  day: 'linear-gradient(180deg, #a8c8ea 0%, #c9def3 42%, #e7eff8 78%, #f1f5fa 100%)',
  dusk: 'linear-gradient(180deg, #232c66 0%, #4f4a8f 30%, #a2779f 58%, #e7a587 82%, #f4c39b 100%)',
  night: 'linear-gradient(180deg, #050a22 0%, #0b1540 52%, #18275a 86%, #1f3065 100%)',
}

/** A few soft stars for the night sky (deterministic positions). */
export const STARS = (() => {
  const dots: string[] = []
  let seed = 7
  const r = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  for (let i = 0; i < 46; i++) {
    const x = (r() * 100).toFixed(1)
    const y = (r() * 58).toFixed(1)
    const s = r() > 0.85 ? 1.6 : 1
    const a = (0.45 + r() * 0.5).toFixed(2)
    dots.push(`radial-gradient(${s}px ${s}px at ${x}% ${y}%, rgba(255,255,255,${a}) 50%, transparent 100%)`)
  }
  return dots.join(',')
})()

export const TIME_OPTIONS: { value: TimeOfDay; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'dusk', label: 'Dusk' },
  { value: 'night', label: 'Night' },
]
