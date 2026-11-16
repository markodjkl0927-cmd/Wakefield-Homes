import { Color, Vector3 } from 'three'
import type { TimeOfDay } from '@/types'

export const TOD_INDEX: Record<TimeOfDay, number> = { day: 0, dusk: 1, night: 2 }

/** One lighting "mood". Intensities are tuned for NeutralToneMapping. */
export interface Mood {
  sunDir: Vector3
  sunColor: Color
  sun: number
  sky: Color
  ground: Color
  hemi: number
  env: number
  glassLit: number
  glassDim: number
  lamp: number
  point: number
  exposure: number
}

const mood = (m: Omit<Mood, 'sunDir' | 'sunColor' | 'sky' | 'ground'> & { sunDir: [number, number, number]; sunColor: string; sky: string; ground: string }): Mood => ({
  ...m,
  sunDir: new Vector3(...m.sunDir).normalize(),
  sunColor: new Color(m.sunColor),
  sky: new Color(m.sky),
  ground: new Color(m.ground),
})

/** Day → dusk → night keyframes; transitions interpolate through them. */
const KEYS: Mood[] = [
  mood({ sunDir: [0.5, 0.86, 0.68], sunColor: '#fffaf3', sun: 2.7, sky: '#dbe9f8', ground: '#9aa38b', hemi: 0.95, env: 0.55, glassLit: 0, glassDim: 0, lamp: 0, point: 0, exposure: 1 }),
  mood({ sunDir: [-0.82, 0.22, 0.5], sunColor: '#ff9f68', sun: 2.3, sky: '#8a84c8', ground: '#4f4558', hemi: 0.62, env: 0.32, glassLit: 1.15, glassDim: 0.12, lamp: 2.2, point: 4, exposure: 1 }),
  mood({ sunDir: [0.42, 0.78, -0.42], sunColor: '#a9bcff', sun: 0.42, sky: '#3a4a86', ground: '#171b2c', hemi: 0.5, env: 0.12, glassLit: 2.6, glassDim: 0.2, lamp: 4, point: 11, exposure: 1.08 }),
]

const smooth = (t: number) => t * t * (3 - 2 * t)

/** Sample the mood at t ∈ [0, 2] (0 = day, 1 = dusk, 2 = night). */
export function sampleMood(t: number, out: Mood): Mood {
  const tt = Math.min(2, Math.max(0, t))
  const i = Math.min(1, Math.floor(tt))
  const f = smooth(tt - i)
  const a = KEYS[i]
  const b = KEYS[i + 1]
  out.sunDir.copy(a.sunDir).lerp(b.sunDir, f).normalize()
  out.sunColor.copy(a.sunColor).lerp(b.sunColor, f)
  out.sky.copy(a.sky).lerp(b.sky, f)
  out.ground.copy(a.ground).lerp(b.ground, f)
  out.sun = a.sun + (b.sun - a.sun) * f
  out.hemi = a.hemi + (b.hemi - a.hemi) * f
  out.env = a.env + (b.env - a.env) * f
  out.glassLit = a.glassLit + (b.glassLit - a.glassLit) * f
  out.glassDim = a.glassDim + (b.glassDim - a.glassDim) * f
  out.lamp = a.lamp + (b.lamp - a.lamp) * f
  out.point = a.point + (b.point - a.point) * f
  out.exposure = a.exposure + (b.exposure - a.exposure) * f
  return out
}

export function newMood(): Mood {
  return sampleMood(0, mood({ sunDir: [0, 1, 0], sunColor: '#ffffff', sun: 0, sky: '#ffffff', ground: '#ffffff', hemi: 0, env: 0, glassLit: 0, glassDim: 0, lamp: 0, point: 0, exposure: 1 }))
}
