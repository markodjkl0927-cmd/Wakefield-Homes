import { Box3, Color, ConeGeometry, Float32BufferAttribute, IcosahedronGeometry, PlaneGeometry, Shape, ShapeGeometry, Vector3, type BufferGeometry } from 'three'
import { Bucket, blobGeo, boxMM, cylinder, mulberry32, planarFace, v3 } from './geometry'
import { COLOR_KEYS, WORLD_UV_KEYS, type MatKey } from './materials'

/** Axis-aligned rectangle on the ground (z1 may be Infinity = "to the street edge of the plot"). */
export interface Rect {
  x0: number
  x1: number
  z0: number
  z1: number
}

export interface Plot {
  x0: number
  x1: number
  z0: number
  z1: number
  cx: number
  cz: number
  /** Half-diagonal: used for the shadow camera. */
  radius: number
}

export interface SiteInput {
  bounds: Box3
  paving: Rect[]
  structures: Rect[]
  plantLines: { x0: number; x1: number; z: number; skip: [number, number][] }[]
  seed: number
  /** Custom models: plain lawn and a few trees, no paving or foundation plantings. */
  minimal?: boolean
}

const GREENS = ['#4a7a3b', '#578843', '#3e6b34', '#628f4b', '#517d3e']
const CANOPY = ['#4c7d3e', '#5a8b46', '#44723a', '#64934e', '#3c6833']
const CONIFER = ['#2e5937', '#35633f', '#2a5133']
/** Hydrangea whites and soft blues, with one lavender that echoes the brand palette. */
const BLOOMS = ['#b9c6ea', '#f3efe7', '#cbbfe0', '#a9b8e3']
/** The small ornamental tree: a fresh yellow-green (honey locust) for variety; blossom colours read as toys. */
const ORNAMENTAL = ['#8fac57', '#9bb862', '#86a34f', '#a4bf6c']

/**
 * Smooth, softly shaded blob for canopies and shrubs: smooth normals (no facets) and a baked top-to-bottom
 * light falloff in the vertex colours, which reads as ambient occlusion inside the foliage.
 */
function leafy(x: number, y: number, z: number, r: number, color: string | Color, detail = 2, sy = 1, ao = 0.32) {
  const g = new IcosahedronGeometry(r, detail)
  // A gently lumpy outline (a smooth function of direction, so shared vertices move together: no cracks).
  const pos = g.attributes.position
  const s1 = x * 1.7 + z * 0.3
  const s2 = z * 1.3 - x * 0.2
  const s3 = x * 0.9 + z * 1.1
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i) / r
    const py = pos.getY(i) / r
    const pz = pos.getZ(i) / r
    const k = 1 + 0.07 * Math.sin(4.6 * px + s1) * Math.sin(4.2 * py + s2) * Math.sin(4.9 * pz + s3) + 0.035 * Math.sin(9.1 * px + 7.3 * pz + s2)
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k)
  }
  g.scale(1, sy, 1)
  const n = g.attributes.normal
  const base = new Color(color)
  const c = new Color()
  const out = new Float32Array(n.count * 3)
  for (let i = 0; i < n.count; i++) {
    const k = 1 - ao + ao * 1.12 * (n.getY(i) * 0.5 + 0.5)
    c.copy(base).multiplyScalar(k)
    out[i * 3] = c.r
    out[i * 3 + 1] = c.g
    out[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new Float32BufferAttribute(out, 3))
  g.translate(x, y, z)
  return g
}

const overlaps = (a: Rect, b: Rect) => a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0
const grow = (r: Rect, d: number): Rect => ({ x0: r.x0 - d, x1: r.x1 + d, z0: r.z0 - d, z1: r.z1 + d })

function roundedRect(x0: number, x1: number, z0: number, z1: number, r: number) {
  // Shape space is (x, -z) so the shape rotated onto the ground keeps world z.
  const s = new Shape()
  s.moveTo(x0 + r, -z1)
  s.lineTo(x1 - r, -z1)
  s.absarc(x1 - r, -z1 + r, r, -Math.PI / 2, 0, false)
  s.lineTo(x1, -z0 - r)
  s.absarc(x1 - r, -z0 - r, r, 0, Math.PI / 2, false)
  s.lineTo(x0 + r, -z0)
  s.absarc(x0 + r, -z0 - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(x0, -z1 + r)
  s.absarc(x0 + r, -z1 + r, r, Math.PI, Math.PI * 1.5, false)
  return s
}

/**
 * The lot: a rounded lawn plot with a crisp edge (like an architect's model base), a soft drop
 * shadow, paving, low-poly trees and foundation plantings. Deterministic for a given seed.
 */
export function buildSite(B: Bucket<MatKey>, input: SiteInput): Plot {
  const { bounds } = input
  const rand = mulberry32(input.seed)
  let x0 = bounds.min.x - 4.2
  let x1 = bounds.max.x + 4.2
  let z0 = bounds.min.z - 4
  let z1 = bounds.max.z + 6.5
  for (const r of input.paving) {
    x0 = Math.min(x0, r.x0 - 3.6)
    x1 = Math.max(x1, r.x1 + 3.6)
    if (Number.isFinite(r.z0)) z0 = Math.min(z0, r.z0 - 2.2)
    if (Number.isFinite(r.z1)) z1 = Math.max(z1, r.z1 + 2)
  }
  if (input.minimal) {
    const cx = (x0 + x1) / 2
    const cz = (z0 + z1) / 2
    const half = Math.max(x1 - x0, z1 - z0) / 2 + 1
    x0 = cx - half
    x1 = cx + half
    z0 = cz - half
    z1 = cz + half
  }
  // Keep a calm, lot-like proportion.
  const w0 = x1 - x0
  const d0 = z1 - z0
  if (d0 < w0 * 0.66) {
    const extra = w0 * 0.66 - d0
    z0 -= extra * 0.4
    z1 += extra * 0.6
  }
  if (x1 - x0 < (z1 - z0) * 0.8) {
    const extra = (z1 - z0) * 0.8 - (x1 - x0)
    x0 -= extra / 2
    x1 += extra / 2
  }
  const w = x1 - x0
  const d = z1 - z0
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const corner = input.minimal ? Math.min(w, d) * 0.45 : 3.2
  const plot: Plot = { x0, x1, z0, z1, cx, cz, radius: Math.hypot(w, d) / 2 }

  // Lawn surface and edge band.
  const shape = roundedRect(x0, x1, z0, z1, corner)
  const lawn = new ShapeGeometry(shape, 8)
  lawn.rotateX(-Math.PI / 2)
  B.add('lawn', lawn)
  const outline = shape.getPoints(8)
  const centre = v3(cx, 0, cz)
  const depth = 0.5
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]
    const b = outline[(i + 1) % outline.length]
    if (a.distanceTo(b) < 1e-4) continue
    const A = v3(a.x, 0, -a.y)
    const Bp = v3(b.x, 0, -b.y)
    const mid = new Vector3().addVectors(A, Bp).multiplyScalar(0.5)
    const facing = mid.sub(centre).setY(0).normalize()
    B.add('plotEdge', planarFace([A, Bp, v3(Bp.x, -depth, Bp.z), v3(A.x, -depth, A.z)], facing))
  }
  const shadow = new PlaneGeometry(w + 8, d + 8)
  shadow.rotateX(-Math.PI / 2)
  shadow.translate(cx, -depth - 0.02, cz + 0.6)
  B.add('blob', shadow)

  // Paving: driveway, walkway, patio (clipped to the plot).
  const paved: Rect[] = []
  for (const r of input.paving) {
    const c: Rect = { x0: Math.max(r.x0, x0 + 0.3), x1: Math.min(r.x1, x1 - 0.3), z0: Math.max(r.z0, z0 + 0.3), z1: Math.min(r.z1, z1 - 0.004) }
    if (c.x1 - c.x0 < 0.2 || c.z1 - c.z0 < 0.2) continue
    paved.push(c)
    B.add('paving', boxMM(c.x0, -0.03, c.z0, c.x1, 0.022, c.z1))
  }
  // Path lights along the front walk (the narrow paving strip that reaches the street).
  const walk = paved.find((r) => r.x1 - r.x0 < 1.6 && r.z1 >= z1 - 0.01)
  if (walk && !input.minimal) {
    for (let z = walk.z0 + 1.2; z < walk.z1 - 0.8; z += 2.4) {
      for (const x of [walk.x0 - 0.3, walk.x1 + 0.3]) {
        B.add('metal', cylinder(x, z, 0, 0.42, 0.035, 0.045, 8))
        B.add('lamp', boxMM(x - 0.06, 0.42, z - 0.06, x + 0.06, 0.52, z + 0.06))
        B.add('metal', boxMM(x - 0.08, 0.52, z - 0.08, x + 0.08, 0.55, z + 0.08))
      }
    }
  }

  const blocked = [...input.structures, ...paved]
  const inside = (x: number, z: number, m: number) => x - m > x0 && x + m < x1 && z - m > z0 && z + m < z1

  // Foundation plantings with mulch beds.
  if (!input.minimal) {
    for (const line of input.plantLines) {
      let run: number[] = []
      const flush = () => {
        if (!run.length) return
        const a = run[0] - 0.55
        const b = run[run.length - 1] + 0.55
        B.add('mulch', boxMM(a, -0.02, line.z - 0.05, b, 0.035, line.z + 1.1))
        run = []
      }
      for (let x = line.x0 + 0.45; x <= line.x1 - 0.35; x += 1.0 + rand() * 0.25) {
        const r = 0.4 + rand() * 0.2
        const z = line.z + 0.55 + (rand() - 0.5) * 0.12
        const zone: Rect = { x0: x - r, x1: x + r, z0: z - r, z1: z + r }
        const skip = line.skip.some(([a, b]) => x + r > a && x - r < b) || paved.some((p) => overlaps(grow(p, 0.15), zone)) || !inside(x, z, r)
        if (skip) {
          flush()
          continue
        }
        run.push(x)
        const col = GREENS[Math.floor(rand() * GREENS.length)]
        B.add('foliage', leafy(x, r * 0.72, z, r, col, 1, 0.78, 0.38))
        if (rand() > 0.6) {
          const bloom = BLOOMS[Math.floor(rand() * BLOOMS.length)]
          for (let k = 0; k < 5; k++) {
            const a = rand() * Math.PI * 2
            const rr = r * (0.35 + rand() * 0.45)
            B.add('foliage', blobGeo(x + Math.cos(a) * rr, r * 1.05 + rand() * 0.12, z + Math.sin(a) * rr, 0.09, bloom, 0))
          }
        }
      }
      flush()
    }
  }

  // Trees: larger ones behind the house, small ornamentals near the street corners.
  type Cand = { x: number; z: number; kind: 'round' | 'cone' | 'bloom'; size: number }
  const cands: Cand[] = [
    { x: x0 + 2.8, z: z0 + 2.8, kind: 'cone', size: 1.05 },
    { x: x1 - 3.0, z: z0 + 3.0, kind: 'round', size: 1.15 },
    { x: cx - 4.5, z: z0 + 2.3, kind: 'round', size: 0.95 },
    { x: cx + 5.5, z: z0 + 2.0, kind: 'cone', size: 0.9 },
    { x: x0 + 2.4, z: z1 - 3.2, kind: 'bloom', size: 0.75 },
    { x: x1 - 2.2, z: z1 - 2.6, kind: 'round', size: 0.62 },
    { x: x0 + 1.9, z: cz, kind: 'cone', size: 0.8 },
    { x: x1 - 1.9, z: cz - 1, kind: 'cone', size: 0.75 },
  ]
  let placed = 0
  const trees: Rect[] = []
  for (const c of cands) {
    if (placed >= (input.minimal ? 4 : 6)) break
    const x = c.x + (rand() - 0.5) * 1.2
    const z = c.z + (rand() - 0.5) * 1.0
    const R = (c.kind === 'cone' ? 1.25 : 1.75) * c.size
    const zone: Rect = { x0: x - R * 0.7, x1: x + R * 0.7, z0: z - R * 0.7, z1: z + R * 0.7 }
    if (!inside(x, z, R * 0.9)) continue
    if (blocked.some((b) => overlaps(grow(b, 0.6), zone)) || trees.some((t) => overlaps(t, zone))) continue
    trees.push(zone)
    placed++
    tree(B, x, z, c, rand)
  }
  return plot
}

/** Plain landscaped plot around a custom (uploaded) model. */
export function buildMinimalSite(bounds: Box3): { parts: Map<MatKey, BufferGeometry>; plot: Plot } {
  const B = new Bucket<MatKey>(WORLD_UV_KEYS, COLOR_KEYS)
  const plot = buildSite(B, {
    bounds,
    paving: [],
    structures: [{ x0: bounds.min.x, x1: bounds.max.x, z0: bounds.min.z, z1: bounds.max.z }],
    plantLines: [],
    seed: 7,
    minimal: true,
  })
  return { parts: B.build(), plot }
}

/** Vertex-coloured cone tier with the same baked light falloff as the canopies (darker toward the base). */
function conifer(x: number, y: number, z: number, r: number, h: number, color: string) {
  const g = new ConeGeometry(r, h, 14, 1)
  const p = g.attributes.position
  const base = new Color(color)
  const c = new Color()
  const out = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) {
    const k = 0.74 + 0.36 * (p.getY(i) / h + 0.5)
    c.copy(base).multiplyScalar(k)
    out[i * 3] = c.r
    out[i * 3 + 1] = c.g
    out[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new Float32BufferAttribute(out, 3))
  g.translate(x, y, z)
  return g
}

function tree(B: Bucket<MatKey>, x: number, z: number, c: { kind: 'round' | 'cone' | 'bloom'; size: number }, rand: () => number) {
  const s = c.size
  if (c.kind === 'cone') {
    const h = 7.5 * s
    B.add('trunk', cylinder(x, z, -0.05, h * 0.3, 0.11 * s, 0.17 * s, 8))
    const tiers = 4
    for (let i = 0; i < tiers; i++) {
      const r = (1.6 - i * 0.33) * s
      const ch = (2.7 - i * 0.42) * s
      const y = h * 0.2 + i * 1.22 * s + ch / 2
      B.add('foliage', conifer(x, y, z, r, ch, CONIFER[i % CONIFER.length]))
    }
    return
  }
  const bloom = c.kind === 'bloom'
  const h = (bloom ? 4.8 : 7.2) * s
  const trunkTop = h * 0.5
  B.add('trunk', cylinder(x, z, -0.05, trunkTop + 0.4, 0.13 * s, 0.2 * s, 8))
  const R = (bloom ? 1.9 : 1.75) * s
  const cy = trunkTop + R * 0.75
  const palette = bloom ? ORNAMENTAL : CANOPY
  const puffs = 5 + Math.floor(rand() * 2)
  B.add('foliage', leafy(x, cy, z, R * 0.9, palette[0], 2, 0.9))
  for (let i = 0; i < puffs; i++) {
    const a = (i / puffs) * Math.PI * 2 + rand()
    const rr = R * (0.45 + rand() * 0.2)
    const col = new Color(palette[(i + 1) % palette.length])
    B.add('foliage', leafy(x + Math.cos(a) * rr, cy + (rand() - 0.3) * R * 0.5, z + Math.sin(a) * rr, R * (0.52 + rand() * 0.2), col, 2, 0.9))
  }
  // A crown puff so the silhouette rounds off instead of flattening on top.
  B.add('foliage', leafy(x + (rand() - 0.5) * R * 0.3, cy + R * 0.55, z + (rand() - 0.5) * R * 0.3, R * 0.55, palette[2 % palette.length], 2, 0.85))
}
