import { CanvasTexture, Color, NoColorSpace, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'
import { mulberry32 } from './geometry'

/**
 * Procedural canvas textures (no network assets). Canvases are generated once per page and cached;
 * each viewer wraps them in its own THREE textures because every canvas has its own WebGL context.
 * Pattern textures are mostly greyscale and get tinted by the material colour.
 */

export type PatternKind =
  | 'lap'
  | 'board-batten'
  | 'shingle'
  | 'roof'
  | 'metal'
  | 'grass'
  | 'louver'
  | 'paving'
  | 'concrete'
  | 'blob'
  | 'brickBump'
  | 'stoneBump'
  | 'glass'

/** Real-world size (metres) that one tile of each texture covers. */
export const TILE: Record<string, [number, number]> = {
  lap: [0.6, 1.2],
  'board-batten': [1.2, 1],
  shingle: [1.0, 1.0],
  brick: [0.86, 0.6],
  stone: [1.6, 1.2],
  roof: [1.2, 1.0],
  metal: [0.45, 1],
  grass: [8, 8],
  paving: [3, 3],
  concrete: [2, 2],
}

const cache = new Map<string, HTMLCanvasElement>()

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('2D canvas unavailable')
  return { c, ctx }
}

const grey = (v: number, a = 1) => `rgba(${v | 0},${v | 0},${v | 0},${a})`

function speckle(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, rand: () => number) {
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amount
    d[i] = Math.max(0, Math.min(255, d[i] + n))
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n))
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n))
  }
  ctx.putImageData(img, 0, 0)
}

function drawLap(): HTMLCanvasElement {
  // 8 boards of 0.15 m exposure in a 1.2 m tile.
  const { c, ctx } = makeCanvas(32, 256)
  const board = 32
  for (let b = 0; b < 8; b++) {
    const y0 = b * board
    const g = ctx.createLinearGradient(0, y0, 0, y0 + board)
    g.addColorStop(0, grey(214))
    g.addColorStop(0.16, grey(238))
    g.addColorStop(0.85, grey(252))
    g.addColorStop(0.93, grey(248))
    g.addColorStop(1, grey(178))
    ctx.fillStyle = g
    ctx.fillRect(0, y0, 32, board)
  }
  speckle(ctx, 32, 256, 5, mulberry32(11))
  return c
}

function drawBoardBatten(): HTMLCanvasElement {
  // Battens every 0.4 m (three per 1.2 m tile).
  const { c, ctx } = makeCanvas(128, 8)
  ctx.fillStyle = grey(236)
  ctx.fillRect(0, 0, 128, 8)
  const step = 128 / 3
  for (let i = 0; i < 3; i++) {
    const x = i * step + 2
    ctx.fillStyle = grey(214)
    ctx.fillRect(x + 6.5, 0, 3.5, 8) // soft shadow cast by the batten
    ctx.fillStyle = grey(252)
    ctx.fillRect(x, 0, 6, 8)
    ctx.fillStyle = grey(255)
    ctx.fillRect(x, 0, 1, 8)
    ctx.fillStyle = grey(176)
    ctx.fillRect(x + 5.5, 0, 1.2, 8)
  }
  return c
}

function drawShingleSiding(): HTMLCanvasElement {
  // Cedar shakes: 5 courses of 0.2 m in a 1 m tile, staggered random widths.
  const { c, ctx } = makeCanvas(256, 256)
  const rand = mulberry32(7)
  const course = 256 / 5
  for (let r = 0; r < 5; r++) {
    const y0 = r * course
    let x = -rand() * 40
    while (x < 256) {
      const w = 30 + rand() * 46
      const tone = 196 + rand() * 50
      ctx.fillStyle = grey(tone)
      ctx.fillRect(x, y0, w, course)
      // vertical grain
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = grey(tone - 10 - rand() * 14, 0.5)
        ctx.fillRect(x + rand() * w, y0, 1, course)
      }
      ctx.fillStyle = grey(132)
      ctx.fillRect(x, y0, 1.4, course) // keyway gap
      x += w
    }
    const g = ctx.createLinearGradient(0, y0, 0, y0 + 7)
    g.addColorStop(0, grey(110, 0.7))
    g.addColorStop(1, grey(110, 0))
    ctx.fillStyle = g
    ctx.fillRect(0, y0, 256, 7) // shadow under the course above
  }
  speckle(ctx, 256, 256, 8, rand)
  return c
}

function drawRoof(): HTMLCanvasElement {
  // Architectural asphalt shingles: 7 courses (0.143 m) per 1 m, random dimensional tabs.
  const { c, ctx } = makeCanvas(256, 256)
  const rand = mulberry32(21)
  const course = 256 / 7
  for (let r = 0; r < 7; r++) {
    const y0 = r * course
    let x = -rand() * 50
    while (x < 256) {
      const w = 26 + rand() * 60
      const tone = 188 + rand() * 62
      ctx.fillStyle = grey(tone)
      ctx.fillRect(x, y0, w, course)
      if (rand() > 0.55) {
        // darker "dragon tooth" overlay
        ctx.fillStyle = grey(tone - 36, 0.5)
        ctx.fillRect(x + w * 0.2, y0 + course * 0.35, w * 0.55, course * 0.65)
      }
      x += w
    }
    ctx.fillStyle = grey(92, 0.72)
    ctx.fillRect(0, y0 + course - 2.2, 256, 2.2) // butt-edge shadow
  }
  speckle(ctx, 256, 256, 24, rand)
  return c
}

function drawGlass(): HTMLCanvasElement {
  // Per pane: the sky reflected in the upper part, a soft diagonal sheen, darker toward the sill.
  const { c, ctx } = makeCanvas(64, 64)
  const v = ctx.createLinearGradient(0, 0, 0, 64)
  v.addColorStop(0, grey(255))
  v.addColorStop(0.45, grey(214))
  v.addColorStop(1, grey(168))
  ctx.fillStyle = v
  ctx.fillRect(0, 0, 64, 64)
  const d = ctx.createLinearGradient(0, 0, 64, 64)
  d.addColorStop(0.18, grey(255, 0))
  d.addColorStop(0.3, grey(255, 0.32))
  d.addColorStop(0.4, grey(255, 0))
  ctx.fillStyle = d
  ctx.fillRect(0, 0, 64, 64)
  return c
}

function drawMetal(): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(64, 8)
  ctx.fillStyle = grey(222)
  ctx.fillRect(0, 0, 64, 8)
  ctx.fillStyle = grey(255)
  ctx.fillRect(0, 0, 2.5, 8)
  ctx.fillStyle = grey(150)
  ctx.fillRect(2.5, 0, 2, 8)
  ctx.fillStyle = grey(232)
  ctx.fillRect(30, 0, 2, 8)
  return c
}

function drawGrass(): HTMLCanvasElement {
  // 8 m tile: two soft 4 m mowing stripes (barely there, like a well-kept lawn, not a sports field),
  // broad tonal patches and fine blade noise.
  const { c, ctx } = makeCanvas(256, 256)
  const stripe = ctx.createLinearGradient(0, 0, 256, 0)
  stripe.addColorStop(0, grey(243))
  stripe.addColorStop(0.44, grey(243))
  stripe.addColorStop(0.5, grey(236))
  stripe.addColorStop(0.94, grey(236))
  stripe.addColorStop(1, grey(243))
  ctx.fillStyle = stripe
  ctx.fillRect(0, 0, 256, 256)
  const rand = mulberry32(5)
  // Soft patches (drawn wrapped so the tile repeats seamlessly).
  for (let i = 0; i < 22; i++) {
    const x = rand() * 256
    const y = rand() * 256
    const r = 18 + rand() * 40
    const v = rand() > 0.5 ? 255 : 214
    for (const ox of [-256, 0, 256])
      for (const oy of [-256, 0, 256]) {
        const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r)
        g.addColorStop(0, grey(v, 0.16))
        g.addColorStop(1, grey(v, 0))
        ctx.fillStyle = g
        ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2)
      }
  }
  for (let i = 0; i < 2200; i++) {
    ctx.fillStyle = grey(206 + rand() * 49, 0.45)
    ctx.fillRect(rand() * 256, rand() * 256, 1 + rand() * 1.5, 1 + rand() * 2.5)
  }
  speckle(ctx, 256, 256, 16, rand)
  return c
}

function drawLouver(): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(64, 256)
  ctx.fillStyle = grey(236)
  ctx.fillRect(0, 0, 64, 256)
  const stile = 7
  const panel = (y0: number, y1: number) => {
    for (let y = y0; y < y1; y += 7) {
      const g = ctx.createLinearGradient(0, y, 0, y + 7)
      g.addColorStop(0, grey(255))
      g.addColorStop(0.7, grey(212))
      g.addColorStop(1, grey(150))
      ctx.fillStyle = g
      ctx.fillRect(stile, y, 64 - stile * 2, 7)
    }
  }
  panel(8, 118)
  panel(138, 248)
  ctx.fillStyle = grey(196)
  ctx.fillRect(stile - 1, 0, 1, 256)
  ctx.fillRect(64 - stile, 0, 1, 256)
  return c
}

function drawPaving(joint: boolean): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(256, 256)
  ctx.fillStyle = grey(240)
  ctx.fillRect(0, 0, 256, 256)
  const rand = mulberry32(joint ? 3 : 4)
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = grey(222 + rand() * 30, 0.35)
    const r = 2 + rand() * 9
    ctx.beginPath()
    ctx.arc(rand() * 256, rand() * 256, r, 0, Math.PI * 2)
    ctx.fill()
  }
  speckle(ctx, 256, 256, 14, rand)
  if (joint) {
    ctx.fillStyle = grey(160)
    ctx.fillRect(0, 0, 256, 1.6)
    ctx.fillRect(0, 0, 1.6, 256)
  }
  return c
}

function drawBlob(): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(128, 128)
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(0,0,0,0.42)')
  g.addColorStop(0.55, 'rgba(0,0,0,0.22)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return c
}

function drawBrickBump(): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(256, 256)
  ctx.fillStyle = grey(110)
  ctx.fillRect(0, 0, 256, 256)
  const course = 32
  const len = 64
  for (let r = 0; r < 8; r++) {
    const off = r % 2 ? len / 2 : 0
    for (let k = -1; k < 5; k++) {
      ctx.fillStyle = grey(225)
      ctx.fillRect(k * len + off + 1.6, r * course + 1.6, len - 3.2, course - 3.2)
    }
  }
  return c
}

function drawStoneBump(): HTMLCanvasElement {
  return stoneLayout('#e0e0e0', '#707070', 99)
}

/** Random ashlar layout; used for both the colour map and the bump map (same seed). */
function stoneLayout(stoneHex: string, mortarHex: string, seed: number, colorVariation = 0): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(256, 256)
  ctx.fillStyle = mortarHex
  ctx.fillRect(0, 0, 256, 256)
  const rand = mulberry32(seed)
  const base = new Color(stoneHex)
  const hsl = { h: 0, s: 0, l: 0 }
  base.getHSL(hsl)
  const pick = mulberry32(seed + 1)
  let y = 0
  const rows: number[] = []
  while (y < 256) {
    let h = 26 + rand() * 40
    if (256 - (y + h) < 22) h = 256 - y
    rows.push(h)
    y += h
  }
  y = 0
  for (const h of rows) {
    let x = -rand() * 60
    while (x < 256) {
      const w = 40 + rand() * 80
      const col = new Color().setHSL(hsl.h + (pick() - 0.5) * 0.03, Math.max(0, hsl.s + (pick() - 0.5) * 0.1), Math.max(0, Math.min(1, hsl.l + (pick() - 0.5) * colorVariation)))
      ctx.fillStyle = colorVariation > 0 ? `#${col.getHexString()}` : stoneHex
      const r = 6
      ctx.beginPath()
      ctx.roundRect(x + 2.5, y + 2.5, w - 5, h - 5, r)
      ctx.fill()
      // Wrap stones that cross the right edge so the tile repeats seamlessly.
      if (x + w > 256) {
        ctx.beginPath()
        ctx.roundRect(x - 256 + 2.5, y + 2.5, w - 5, h - 5, r)
        ctx.fill()
      }
      x += w
    }
    y += h
  }
  return c
}

export function patternCanvas(kind: PatternKind): HTMLCanvasElement {
  const hit = cache.get(kind)
  if (hit) return hit
  let c: HTMLCanvasElement
  switch (kind) {
    case 'lap': c = drawLap(); break
    case 'board-batten': c = drawBoardBatten(); break
    case 'shingle': c = drawShingleSiding(); break
    case 'roof': c = drawRoof(); break
    case 'metal': c = drawMetal(); break
    case 'grass': c = drawGrass(); break
    case 'louver': c = drawLouver(); break
    case 'paving': c = drawPaving(true); break
    case 'concrete': c = drawPaving(false); break
    case 'blob': c = drawBlob(); break
    case 'brickBump': c = drawBrickBump(); break
    case 'stoneBump': c = drawStoneBump(); break
    case 'glass': c = drawGlass(); break
  }
  cache.set(kind, c)
  return c
}

const ALL_PATTERNS: PatternKind[] = ['lap', 'board-batten', 'shingle', 'roof', 'metal', 'grass', 'louver', 'paving', 'concrete', 'blob', 'brickBump', 'stoneBump', 'glass']

/**
 * Draw every pattern canvas ahead of time, a few per idle slice, so the first viewer on a page doesn't
 * spend its first frame painting textures. Safe to call repeatedly.
 */
export function warmTextures() {
  if (typeof document === 'undefined') return
  const todo = ALL_PATTERNS.filter((k) => !cache.has(k))
  if (!todo.length) return
  const idle: (cb: (d?: IdleDeadline) => void) => void =
    typeof window.requestIdleCallback === 'function' ? (cb) => window.requestIdleCallback(cb, { timeout: 1500 }) : (cb) => window.setTimeout(() => cb(), 60)
  const step = (d?: IdleDeadline) => {
    while (todo.length && (!d || d.timeRemaining() > 4 || d.didTimeout)) {
      patternCanvas(todo.shift()!)
      if (!d) break
    }
    if (todo.length) idle(step)
  }
  idle(step)
}

const tintedCache = new Map<string, HTMLCanvasElement>()

/** Colour brick (running bond) or stone canvases, generated per colour and cached. */
export function tintedCanvas(kind: 'brick' | 'stone', hex: string): HTMLCanvasElement {
  const key = `${kind}:${hex.toLowerCase()}`
  const hit = tintedCache.get(key)
  if (hit) return hit
  let canvas: HTMLCanvasElement
  if (kind === 'stone') {
    const base = new Color(hex)
    const mortar = base.clone().lerp(new Color('#e9e5dd'), 0.62)
    canvas = stoneLayout(`#${base.getHexString()}`, `#${mortar.getHexString()}`, 99, 0.16)
    const ctx = canvas.getContext('2d')!
    speckle(ctx, 256, 256, 16, mulberry32(4))
  } else {
    const { c, ctx } = makeCanvas(256, 256)
    const base = new Color(hex)
    const hsl = { h: 0, s: 0, l: 0 }
    base.getHSL(hsl)
    const mortar = new Color('#d8d3c9').lerp(base, 0.12)
    ctx.fillStyle = `#${mortar.getHexString()}`
    ctx.fillRect(0, 0, 256, 256)
    const rand = mulberry32(31)
    const course = 32
    const len = 64
    for (let r = 0; r < 8; r++) {
      const off = r % 2 ? len / 2 : 0
      for (let k = -1; k < 5; k++) {
        const flashed = rand() > 0.86
        const col = new Color().setHSL(
          hsl.h + (rand() - 0.5) * 0.025,
          Math.max(0, Math.min(1, hsl.s + (rand() - 0.5) * 0.12)),
          Math.max(0, Math.min(1, hsl.l + (rand() - 0.5) * 0.12 - (flashed ? 0.08 : 0))),
        )
        ctx.fillStyle = `#${col.getHexString()}`
        ctx.fillRect(k * len + off + 1.6, r * course + 1.6, len - 3.2, course - 3.2)
      }
    }
    speckle(ctx, 256, 256, 18, rand)
    canvas = c
  }
  if (tintedCache.size > 24) tintedCache.delete(tintedCache.keys().next().value as string)
  tintedCache.set(key, canvas)
  return canvas
}

/** Wrap a cached canvas in a repeating texture scaled to metres (UVs are in metres). */
export function textureFrom(canvas: HTMLCanvasElement, tile: [number, number] | null, color = true): Texture {
  const t = new CanvasTexture(canvas)
  t.wrapS = RepeatWrapping
  t.wrapT = RepeatWrapping
  if (tile) t.repeat.set(1 / tile[0], 1 / tile[1])
  t.colorSpace = color ? SRGBColorSpace : NoColorSpace
  t.anisotropy = 4
  t.needsUpdate = true
  return t
}
