import { Box3, Vector3, type BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { HouseConfig, HouseStyle } from '@/types'
import { Bucket, beam, blobGeo, boxMM, clamp, cylinder, hashString, mulberry32, planarFace, prismBetween, slab, sweep, v3 } from './geometry'
import { COLOR_KEYS, WORLD_UV_KEYS, type HouseLook, type MatKey } from './materials'
import { buildSite, type Plot, type Rect } from './site'

/* ------------------------------------------------------------------ */
/* Style profiles                                                       */
/* ------------------------------------------------------------------ */

type DoorStyle = 'six-panel' | 'four-panel' | 'craftsman' | 'farmhouse' | 'modern' | 'cottage'

interface Profile {
  eave: number
  rake: number
  fascia: number
  corners: boolean
  frieze: boolean
  band: boolean
  waterTable: boolean
  /** Muntin grid per sash: [columns, rows]. */
  top: [number, number]
  bottom: [number, number]
  winW: number
  head: 'flat' | 'crown' | 'craftsman' | 'lintel'
  door: DoorStyle
  sidelights: boolean
  transom: 'none' | 'rect' | 'fan'
  column: 'round' | 'square' | 'tapered' | 'post'
  piers: boolean
  railing: boolean
  gableAccent: 'shingle' | 'board-batten' | null
  garage: 'raised' | 'carriage' | 'modern'
  porchMetal: boolean
  brackets: boolean
  flowerBoxes: boolean
  gableWindow: 'half-round' | 'rect' | 'pair' | 'tall'
  porchFloor: string
  postsDark: boolean
  wingProj: number
  /** "Cross-gable" on this style means a hipped main roof with a front-gable wing (the Northern Virginia brick traditional). */
  hipCross: boolean
  /** Dormer roof form; roofs too shallow for gable dormers get shed dormers whatever this says. */
  dormer: 'gable' | 'shed'
}

const base: Profile = {
  eave: 0.42, rake: 0.25, fascia: 0.22, corners: true, frieze: true, band: false, waterTable: true,
  top: [3, 2], bottom: [3, 2], winW: 0.94, head: 'flat', door: 'six-panel', sidelights: true, transom: 'rect',
  column: 'round', piers: false, railing: true, gableAccent: null, garage: 'raised', porchMetal: false, brackets: false,
  flowerBoxes: false, gableWindow: 'half-round', porchFloor: '#8e959b', postsDark: false, wingProj: 2.1, hipCross: false, dormer: 'gable',
}

const PROFILES: Record<HouseStyle, Profile> = {
  colonial: { ...base, head: 'crown', eave: 0.4, rake: 0.22 },
  federal: { ...base, eave: 0.36, rake: 0.2, fascia: 0.26, corners: false, waterTable: false, winW: 0.98, head: 'lintel', transom: 'fan', hipCross: true },
  traditional: { ...base, eave: 0.45, rake: 0.3, head: 'crown', hipCross: true },
  craftsman: {
    ...base, eave: 0.62, rake: 0.5, fascia: 0.24, band: true, top: [3, 1], bottom: [1, 1], winW: 0.9, head: 'craftsman', door: 'craftsman',
    transom: 'none', column: 'tapered', piers: true, railing: false, gableAccent: 'shingle', garage: 'carriage', brackets: true,
    gableWindow: 'pair', porchFloor: '#7c6352', wingProj: 2.2,
  },
  farmhouse: {
    ...base, frieze: false, top: [2, 1], bottom: [2, 1], winW: 0.95, door: 'farmhouse', sidelights: false, column: 'post',
    garage: 'carriage', porchMetal: true, gableWindow: 'rect', wingProj: 2.4, gableAccent: 'board-batten',
  },
  'modern-farmhouse': {
    ...base, eave: 0.3, rake: 0.14, fascia: 0.2, corners: false, frieze: false, waterTable: false, top: [1, 1], bottom: [1, 1], winW: 1.0,
    door: 'modern', sidelights: false, transom: 'none', column: 'post', railing: false, garage: 'modern', porchMetal: true,
    gableWindow: 'tall', porchFloor: '#7a6150', postsDark: true, wingProj: 2.2, gableAccent: 'board-batten',
  },
  cottage: {
    ...base, eave: 0.4, rake: 0.3, fascia: 0.2, frieze: false, top: [3, 2], bottom: [1, 1], winW: 0.86, door: 'cottage', sidelights: false,
    transom: 'none', column: 'square', gableAccent: 'shingle', garage: 'carriage', flowerBoxes: true, gableWindow: 'rect', wingProj: 1.9,
  },
  nantucket: { ...base, eave: 0.35, rake: 0.25, winW: 0.9, door: 'four-panel', column: 'square', garage: 'carriage' },
  foursquare: {
    ...base, eave: 0.62, rake: 0.5, band: true, top: [3, 1], bottom: [1, 1], winW: 0.95, head: 'craftsman', door: 'craftsman',
    sidelights: false, transom: 'none', column: 'square', piers: true, garage: 'carriage', gableWindow: 'rect', dormer: 'shed',
  },
}

/* ------------------------------------------------------------------ */
/* Faces: local wall frames for windows and doors                       */
/* ------------------------------------------------------------------ */

/** A wall plane: u runs along the wall (left→right seen from outside), v is world height, w points outward. */
interface Face {
  o: Vector3
  r: Vector3
  n: Vector3
}
const faceFront = (z: number): Face => ({ o: v3(0, 0, z), r: v3(1, 0, 0), n: v3(0, 0, 1) })
const faceBack = (z: number): Face => ({ o: v3(0, 0, z), r: v3(-1, 0, 0), n: v3(0, 0, -1) })
const faceSide = (x: number, s: number): Face =>
  s > 0 ? { o: v3(x, 0, 0), r: v3(0, 0, -1), n: v3(1, 0, 0) } : { o: v3(x, 0, 0), r: v3(0, 0, 1), n: v3(-1, 0, 0) }
const uOf = (f: Face, x: number, z: number) => f.r.x * x + f.r.z * z
const fpt = (f: Face, u: number, v: number, w: number) => v3(f.o.x + f.r.x * u + f.n.x * w, v, f.o.z + f.r.z * u + f.n.z * w)
function fbox(f: Face, u0: number, u1: number, v0: number, v1: number, w0: number, w1: number) {
  const a = fpt(f, u0, v0, w0)
  const b = fpt(f, u1, v1, w1)
  return boxMM(a.x, a.y, a.z, b.x, b.y, b.z)
}

/** Something attached to a side wall that windows must avoid. */
interface Obstacle {
  side: number
  z0: number
  z1: number
  yMin: number
  yMax: (z: number) => number
}

export interface SceneBuild {
  parts: Map<MatKey, BufferGeometry>
  /** House only (no landscaping): used to frame the camera. */
  bounds: Box3
  plot: Plot
  look: HouseLook
  lights: { door: Vector3 | null; garage: Vector3 | null }
}

/** Clamp numbers so hand-edited configs can never produce broken geometry. */
function sanitize(c: HouseConfig): HouseConfig {
  return {
    ...c,
    stories: c.stories === 3 ? 3 : 2,
    width: clamp(Number(c.width) || 13, 9, 22),
    depth: clamp(Number(c.depth) || 11, 8, 15),
    roofPitch: clamp(Number(c.roofPitch) || 0.6, 0.35, 1),
    windowsPerFloor: Math.round(clamp(Number(c.windowsPerFloor) || 4, 2, 6)),
    garageBays: (c.garagePosition === 'none' ? 0 : clamp(Math.round(c.garageBays), 0, 3)) as HouseConfig['garageBays'],
    dormers: clamp(Math.round(c.dormers), 0, 3) as HouseConfig['dormers'],
  }
}

/* ------------------------------------------------------------------ */
/* Builder                                                              */
/* ------------------------------------------------------------------ */

/**
 * Roof planes sit this much above the outer top edge of their walls (a "heel"), so no wall,
 * gable or trim surface ever touches a roof's top surface (no z-fighting along wall lines).
 */
const HEEL = 0.05

/**
 * Dormer tops stay under a line that falls this much per metre forward of the roof's crest. That keeps them out
 * of sight in views from behind (straight or three-quarter) at the viewer's default height of 17° above the
 * horizon, at any zoom: they never poke up over the ridge like spikes.
 */
const DORMER_SIGHT = 0.2

class HouseBuilder {
  readonly B = new Bucket<MatKey>(WORLD_UV_KEYS, COLOR_KEYS)
  readonly cfg: HouseConfig
  readonly sp: Profile
  readonly W: number
  readonly D: number
  readonly p: number
  readonly fh = 0.55
  readonly levels: number[]
  readonly wallTop: number
  readonly ridgeTop: number
  readonly brick: boolean
  readonly gableKey: MatKey
  readonly hasGarage: boolean
  readonly gSide: number
  readonly courtyard: boolean
  readonly freeSide: number
  readonly hasWing: boolean
  /** The main roof is hipped (a hip roof, or a cross-gable on a hipCross style). */
  readonly hipMain: boolean
  readonly wingSide: number
  readonly wrapSide: number
  readonly wing: { l: number; r: number; c: number; w: number; front: number } | null
  readonly doorX: number
  readonly ww: number
  readonly rand: () => number

  obstacles: Obstacle[] = []
  paving: Rect[] = []
  structures: Rect[] = []
  plantLines: { x0: number; x1: number; z: number; skip: [number, number][] }[] = []
  lights: SceneBuild['lights'] = { door: null, garage: null }
  porchDepth = 0
  /** z of the front of whatever is in front of the door (porch edge, stoop) where the walk starts. */
  walkStartZ = 0
  doorHalf = 0.9
  /** Bottom of the portico/pediment etc. above the door, to keep the window above clear. */
  overDoorTop = 0
  private litCount = 0

  constructor(input: HouseConfig) {
    const cfg = sanitize(input)
    this.cfg = cfg
    this.sp = PROFILES[cfg.style] ?? PROFILES.traditional
    this.W = cfg.width
    this.D = cfg.depth
    this.p = cfg.roofPitch
    const hs = cfg.stories === 3 ? [3.05, 2.95, 2.75] : [3.05, 2.95]
    this.levels = [this.fh]
    for (const h of hs) this.levels.push(this.levels[this.levels.length - 1] + h)
    this.wallTop = this.levels[this.levels.length - 1]
    this.hipMain = cfg.roof === 'hip' || (cfg.roof === 'cross-gable' && this.sp.hipCross)
    const halfSpan = this.hipMain ? Math.min(this.W, this.D) / 2 : this.D / 2
    this.ridgeTop = this.wallTop + HEEL + halfSpan * this.p
    this.brick = cfg.siding === 'brick'
    this.gableKey = this.sp.gableAccent && !this.brick ? 'sidingAccent' : 'siding'
    this.hasGarage = cfg.garageBays > 0 && cfg.garagePosition !== 'none'
    this.courtyard = this.hasGarage && cfg.garagePosition === 'courtyard'
    this.gSide = !this.hasGarage ? 0 : cfg.garagePosition === 'left' ? -1 : 1
    this.freeSide = this.gSide !== 0 ? -this.gSide : -1
    this.hasWing = cfg.roof === 'cross-gable'
    // The front-gable wing sits on the garage side (a courtyard garage is on the right), which leaves the
    // other front corner free for a wrap-around porch in every layout.
    this.wingSide = this.gSide || 1
    this.ww = this.sp.winW
    this.rand = mulberry32(hashString(JSON.stringify({ ...cfg, colors: null })))

    if (this.hasWing) {
      const w = clamp(this.W * 0.4, 4, 6.2)
      // Beside a courtyard garage the wing tucks closer to the corner, so no narrow slot opens up between them.
      const inset = this.courtyard ? 0.4 : 0.7
      const r = this.wingSide > 0 ? this.W / 2 - inset : -this.W / 2 + inset + w
      const l = r - w
      this.wing = { l, r, c: (l + r) / 2, w, front: this.D / 2 + this.sp.wingProj }
    } else this.wing = null

    // The porch wraps around the free side when it can reach that corner.
    let wrap = 0
    if (cfg.porch === 'wrap') {
      wrap = this.hasWing ? -this.wingSide : this.freeSide
      if (wrap === this.gSide) wrap = 0
    }
    this.wrapSide = wrap

    if (this.wing) this.doorX = this.wingSide > 0 ? this.wing.l - 1.45 : this.wing.r + 1.45
    else this.doorX = 0
  }

  private nextLit() {
    this.litCount++
    return this.rand() < 0.68
  }

  private slab(top: Vector3[], t: number, key: MatKey) {
    const s = slab(top, t)
    this.B.add(key, s.top)
    this.B.add('trim', s.under)
  }

  private sill(k: number) {
    return this.levels[k] + (k === 0 ? 0.62 : 0.8)
  }
  private winH(k: number) {
    return k === 0 ? 1.72 : k === 1 ? 1.48 : 1.3
  }

  /* ---------------- walls and trims ---------------- */

  private massBox(x0: number, x1: number, z0: number, z1: number, yTop: number, opts: { eaveAxis: 'x' | 'z' | 'both'; corners?: [number, number][]; bottom?: number }) {
    const { B, sp, brick, fh, cfg } = this
    const bottom = opts.bottom ?? fh
    if (brick) B.add('siding', boxMM(x0, -0.25, z0, x1, yTop, z1))
    else {
      B.add('siding', boxMM(x0, bottom, z0, x1, yTop, z1))
      B.add('foundation', boxMM(x0 - 0.03, -0.25, z0 - 0.03, x1 + 0.03, bottom, z1 + 0.03))
    }
    if (cfg.stoneBase) {
      const top = bottom + 0.5
      B.add('stone', boxMM(x0 - 0.06, -0.25, z0 - 0.06, x1 + 0.06, top, z1 + 0.06))
      B.add('trim', boxMM(x0 - 0.09, top, z0 - 0.09, x1 + 0.09, top + 0.06, z1 + 0.09))
    } else if (sp.waterTable && !brick) {
      B.add('trim', boxMM(x0 - 0.035, bottom, z0 - 0.035, x1 + 0.035, bottom + 0.16, z1 + 0.035))
    }
    if (sp.corners && !brick) {
      const corners = opts.corners ?? [
        [x0, z0],
        [x0, z1],
        [x1, z0],
        [x1, z1],
      ]
      for (const [cx, cz] of corners) {
        const sx = cx === x0 ? -1 : 1
        const sz = cz === z0 ? -1 : 1
        B.add('trim', boxMM(cx - sx * 0.15, bottom, cz - sz * 0.15, cx + sx * 0.03, yTop - (sp.frieze ? 0.2 : 0), cz + sz * 0.03))
      }
    }
    if (sp.band && !brick) {
      for (let k = 1; k < this.levels.length - 1; k++) {
        const y = this.levels[k]
        if (y + 0.1 > yTop - 0.3) continue
        B.add('trim', boxMM(x0 - 0.03, y - 0.08, z0 - 0.03, x1 + 0.03, y + 0.1, z1 + 0.03))
      }
    }
    if (sp.frieze) {
      const y0 = yTop - 0.44
      const y1 = yTop - 0.17
      if (opts.eaveAxis === 'x' || opts.eaveAxis === 'both') {
        B.add('trim', boxMM(x0, y0, z1, x1, y1, z1 + 0.025))
        B.add('trim', boxMM(x0, y0, z0 - 0.025, x1, y1, z0))
      }
      if (opts.eaveAxis === 'z' || opts.eaveAxis === 'both') {
        B.add('trim', boxMM(x1, y0, z0, x1 + 0.025, y1, z1))
        B.add('trim', boxMM(x0 - 0.025, y0, z0, x0, y1, z1))
      }
    }
  }

  /** Gable roof with the ridge along X over walls z0..z1 (xa..xb already include the rakes). */
  private gableRoofX(xa: number, xb: number, z0: number, z1: number, yWall: number, pitch: number, eave: number, t: number, key: MatKey = 'roof') {
    const zc = (z0 + z1) / 2
    const half = (z1 - z0) / 2
    const yR = yWall + HEEL + half * pitch
    const yE = yWall + HEEL - eave * pitch
    this.slab([v3(xa, yE, z1 + eave), v3(xb, yE, z1 + eave), v3(xb, yR, zc), v3(xa, yR, zc)], t, key)
    this.slab([v3(xa, yE, z0 - eave), v3(xb, yE, z0 - eave), v3(xb, yR, zc), v3(xa, yR, zc)], t, key)
    this.B.add(key === 'roof' ? 'ridge' : key, beam(v3(xa - 0.02, yR + 0.02, zc), v3(xb + 0.02, yR + 0.02, zc), 0.26, 0.07))
  }

  /** Gable roof with the ridge along Z over walls x0..x1 (za..zb include the rakes). */
  private gableRoofZ(x0: number, x1: number, za: number, zb: number, yWall: number, pitch: number, eave: number, t: number, key: MatKey = 'roof', capFrom?: number) {
    const xc = (x0 + x1) / 2
    const half = (x1 - x0) / 2
    const yR = yWall + HEEL + half * pitch
    const yE = yWall + HEEL - eave * pitch
    this.slab([v3(x0 - eave, yE, za), v3(x0 - eave, yE, zb), v3(xc, yR, zb), v3(xc, yR, za)], t, key)
    this.slab([v3(x1 + eave, yE, za), v3(x1 + eave, yE, zb), v3(xc, yR, zb), v3(xc, yR, za)], t, key)
    // Ridge cap; for a wing that runs into the main roof it starts where the two ridges meet.
    const zLo = Math.max(Math.min(za, zb), capFrom ?? -Infinity)
    const zHi = Math.max(za, zb)
    this.B.add(key === 'roof' ? 'ridge' : key, beam(v3(xc, yR + 0.02, zLo - 0.02), v3(xc, yR + 0.02, zHi + 0.02), 0.26, 0.07))
  }

  private hipRoof(x0: number, x1: number, z0: number, z1: number, yWall: number, pitch: number, ov: number, t: number, key: MatKey = 'roof') {
    const W = x1 - x0
    const D = z1 - z0
    const cx = (x0 + x1) / 2
    const cz = (z0 + z1) / 2
    const yE = yWall + HEEL - ov * pitch
    const A = v3(x0 - ov, yE, z1 + ov)
    const Bc = v3(x1 + ov, yE, z1 + ov)
    const C = v3(x1 + ov, yE, z0 - ov)
    const Dc = v3(x0 - ov, yE, z0 - ov)
    const caps: [Vector3, Vector3][] = []
    if (W >= D) {
      const yR = yWall + HEEL + (D / 2) * pitch
      const rx = W / 2 - D / 2
      const r0 = v3(cx - rx, yR, cz)
      const r1 = v3(cx + rx, yR, cz)
      const ridge = rx > 0.02
      this.slab(ridge ? [A, Bc, r1, r0] : [A, Bc, r1], t, key)
      this.slab(ridge ? [C, Dc, r0, r1] : [C, Dc, r0], t, key)
      this.slab([Bc, C, r1], t, key)
      this.slab([Dc, A, r0], t, key)
      if (ridge) caps.push([r0, r1])
      caps.push([A, r0], [Dc, r0], [Bc, r1], [C, r1])
    } else {
      const yR = yWall + HEEL + (W / 2) * pitch
      const rz = D / 2 - W / 2
      const r0 = v3(cx, yR, cz - rz)
      const r1 = v3(cx, yR, cz + rz)
      this.slab([Bc, C, r0, r1], t, key)
      this.slab([A, Dc, r0, r1], t, key)
      this.slab([A, Bc, r1], t, key)
      this.slab([C, Dc, r0], t, key)
      caps.push([r0, r1], [A, r1], [Bc, r1], [C, r0], [Dc, r0])
    }
    for (const [a, b] of caps) this.B.add(key === 'roof' ? 'ridge' : key, beam(v3(a.x, a.y + 0.03, a.z), v3(b.x, b.y + 0.03, b.z), 0.22, 0.06))
  }

  /* ---------------- windows ---------------- */

  private window(o: {
    f: Face
    u: number
    sill: number
    w: number
    h: number
    units?: number
    shutters?: boolean
    lites?: { top: [number, number]; bottom: [number, number] }
    head?: Profile['head']
    doubleHung?: boolean
    casing?: number
    flowerBox?: boolean
    lit?: boolean
  }) {
    const { B, sp, brick } = this
    const { f, u, sill, w, h } = o
    const units = o.units ?? 1
    const head = o.head ?? sp.head
    const c = o.casing ?? (brick ? 0.075 : head === 'craftsman' ? 0.13 : 0.105)
    const mull = 0.1
    const total = units * w + (units - 1) * mull
    const L = u - total / 2
    const R = u + total / 2
    const bot = sill
    const top = sill + h
    B.add('trim', fbox(f, L - c, L, bot - 0.02, top, 0, 0.045))
    B.add('trim', fbox(f, R, R + c, bot - 0.02, top, 0, 0.045))
    if (head === 'craftsman') {
      B.add('trim', fbox(f, L - c, R + c, top, top + c + 0.06, 0, 0.045))
      B.add('trim', fbox(f, L - c - 0.05, R + c + 0.05, top + c + 0.06, top + c + 0.1, 0, 0.08))
    } else {
      B.add('trim', fbox(f, L - c, R + c, top, top + c, 0, 0.045))
    }
    if (head === 'crown') {
      B.add('trim', fbox(f, L - c - 0.06, R + c + 0.06, top + c, top + c + 0.05, 0, 0.1))
      B.add('trim', fbox(f, L - c - 0.02, R + c + 0.02, top + c + 0.05, top + c + 0.085, 0, 0.068))
    } else if (head === 'lintel') {
      B.add('trim', fbox(f, L - c - 0.1, R + c + 0.1, top + c, top + c + 0.19, 0, 0.022))
      B.add('trim', fbox(f, u - 0.085, u + 0.085, top + c - 0.02, top + c + 0.25, 0, 0.042))
    }
    B.add('trim', fbox(f, L - c - 0.05, R + c + 0.05, bot - 0.085, bot - 0.02, 0, 0.09))
    if (head === 'crown' && !brick) B.add('trim', fbox(f, L - 0.02, R + 0.02, bot - 0.2, bot - 0.085, 0, 0.028))
    for (let k = 1; k < units; k++) {
      const x = L + k * w + (k - 1) * mull
      B.add('trim', fbox(f, x, x + mull, bot, top, 0, 0.045))
    }
    const lit = o.lit ?? this.nextLit()
    const lites = o.lites ?? { top: sp.top, bottom: sp.bottom }
    for (let k = 0; k < units; k++) {
      const ul = L + k * (w + mull)
      this.sash(f, ul, ul + w, bot, top, lites, o.doubleHung !== false, lit)
    }
    if (o.shutters && units === 1) {
      const sw = w * 0.5 + 0.03
      B.add('shutter', fbox(f, L - c - sw - 0.015, L - c - 0.015, bot - 0.02, top + c * 0.4, 0, 0.035))
      B.add('shutter', fbox(f, R + c + 0.015, R + c + sw + 0.015, bot - 0.02, top + c * 0.4, 0, 0.035))
    }
    if (o.flowerBox) {
      B.add('trim', fbox(f, L - c + 0.02, R + c - 0.02, bot - 0.38, bot - 0.12, 0, 0.24))
      const greens = ['#4f7d3a', '#5e8c45', '#466f33']
      const blooms = ['#c9b8f0', '#f3efe6', '#e7a3b6', '#b8a2e6']
      const n = Math.max(3, Math.round((R - L) / 0.16))
      for (let i = 0; i <= n; i++) {
        const uu = L - c + 0.08 + ((R - L + 2 * c - 0.16) * i) / n
        const p = fpt(f, uu, bot - 0.08, 0.13)
        B.add('foliage', blobGeo(p.x, p.y, p.z, 0.1, greens[i % 3], 0, 0.8))
        if (i % 2 === 0) B.add('foliage', blobGeo(p.x, p.y + 0.07, p.z, 0.055, blooms[(i / 2) % blooms.length], 0))
      }
    }
  }

  private sash(f: Face, ul: number, ur: number, bot: number, top: number, lites: { top: [number, number]; bottom: [number, number] }, doubleHung: boolean, lit: boolean) {
    const { B } = this
    const fw = 0.05
    const fb = 0.065
    B.add('frame', fbox(f, ul, ul + fw, bot, top, 0, 0.03))
    B.add('frame', fbox(f, ur - fw, ur, bot, top, 0, 0.03))
    B.add('frame', fbox(f, ul + fw, ur - fw, top - fw, top, 0, 0.03))
    B.add('frame', fbox(f, ul + fw, ur - fw, bot, bot + fb, 0, 0.03))
    const mid = (bot + top) / 2 + (top - bot) * 0.04
    if (doubleHung) B.add('frame', fbox(f, ul + fw, ur - fw, mid - 0.026, mid + 0.026, 0, 0.034))
    B.add(lit ? 'glassLit' : 'glassDim', fbox(f, ul + fw, ur - fw, bot + fb, top - fw, 0.006, 0.012))
    const grid = (u0: number, u1: number, v0: number, v1: number, [cols, rows]: [number, number]) => {
      for (let i = 1; i < cols; i++) {
        const x = u0 + ((u1 - u0) * i) / cols
        B.add('frame', fbox(f, x - 0.011, x + 0.011, v0, v1, 0.012, 0.024))
      }
      for (let j = 1; j < rows; j++) {
        const y = v0 + ((v1 - v0) * j) / rows
        B.add('frame', fbox(f, u0, u1, y - 0.011, y + 0.011, 0.012, 0.024))
      }
    }
    if (doubleHung) {
      grid(ul + fw, ur - fw, mid + 0.026, top - fw, lites.top)
      grid(ul + fw, ur - fw, bot + fb, mid - 0.026, lites.bottom)
    } else grid(ul + fw, ur - fw, bot + fb, top - fw, lites.top)
  }

  /** Half-round (fan) glass with a trim arch: used for federal fanlights and gable windows. */
  private arch(f: Face, u: number, y0: number, rx: number, ry: number, rays = 4) {
    const { B } = this
    const seg = 14
    const pts: Vector3[] = []
    for (let i = 0; i <= seg; i++) {
      const a = (Math.PI * i) / seg
      pts.push(fpt(f, u + Math.cos(a) * rx, y0 + Math.sin(a) * ry, 0.012))
    }
    B.add('glassLit', planarFace(pts, f.n))
    for (let i = 0; i < seg; i++) {
      const a0 = (Math.PI * i) / seg
      const a1 = (Math.PI * (i + 1)) / seg
      const p0 = fpt(f, u + Math.cos(a0) * (rx + 0.05), y0 + Math.sin(a0) * (ry + 0.05), 0.03)
      const p1 = fpt(f, u + Math.cos(a1) * (rx + 0.05), y0 + Math.sin(a1) * (ry + 0.05), 0.03)
      B.add('trim', beam(p0, p1, 0.06, 0.1))
    }
    for (let i = 1; i < rays; i++) {
      const a = (Math.PI * i) / rays
      B.add('trim', beam(fpt(f, u, y0, 0.02), fpt(f, u + Math.cos(a) * rx, y0 + Math.sin(a) * ry, 0.02), 0.02, 0.022))
    }
    B.add('trim', fbox(f, u - rx - 0.1, u + rx + 0.1, y0 - 0.06, y0, 0, 0.06))
  }

  /** Window in a gable triangle (side gables, wing gable, garage gable). */
  private gableWindow(f: Face, u: number, yBase: number, halfSpan: number, pitch: number, t: number, kind = this.sp.gableWindow): void {
    const avail = (d: number) => (halfSpan - d) * pitch - t - 0.1
    if (kind === 'half-round') {
      const r = Math.min(0.62, halfSpan * 0.28)
      const y0 = yBase + 0.28
      if (avail(r + 0.1) < 0.28 + r * 0.95) return this.gableWindow(f, u, yBase, halfSpan, pitch, t, 'rect')
      this.arch(f, u, y0, r, r * 0.92, 4)
      return
    }
    if (kind === 'pair') {
      const w = 0.55
      const h = Math.min(0.95, avail(w + 0.2) - 0.3)
      if (h < 0.45) return this.gableWindow(f, u, yBase, halfSpan, pitch, t, 'rect')
      this.window({ f, u, sill: yBase + 0.32, w, h, units: 2, head: 'flat', lites: { top: [1, 1], bottom: [1, 1] }, doubleHung: false, casing: 0.09 })
      return
    }
    const w = kind === 'tall' ? 0.55 : 0.72
    const sill = yBase + 0.32
    const h = Math.min(kind === 'tall' ? 1.6 : 1.05, avail(w / 2 + 0.12) - 0.32)
    if (h < 0.42) {
      // Louvred vent when there is no room for a window.
      const vh = Math.min(0.5, avail(0.3) - 0.2)
      if (vh < 0.25) return
      this.B.add('trim', fbox(f, u - 0.3, u + 0.3, yBase + 0.15, yBase + 0.15 + vh, 0, 0.04))
      for (let y = yBase + 0.21; y < yBase + 0.15 + vh - 0.05; y += 0.08) this.B.add('metal', fbox(f, u - 0.24, u + 0.24, y, y + 0.03, 0.04, 0.05))
      return
    }
    this.window({ f, u, sill, w, h, head: 'flat', casing: 0.09, lites: kind === 'tall' ? { top: [1, 1], bottom: [1, 1] } : undefined, doubleHung: kind !== 'tall' })
  }

  /* ---------------- entry door ---------------- */

  private entry(f: Face, u: number, floorY: number, covered: 'portico' | 'porch' | 'none') {
    const { B, sp } = this
    const dw = 0.95
    const dh = 2.15
    const side = sp.sidelights ? 0.36 : 0
    const mull = sp.sidelights ? 0.075 : 0
    const halfA = dw / 2 + (side ? mull + side : 0)
    B.add('door', fbox(f, u - dw / 2, u + dw / 2, floorY, floorY + dh, 0, 0.05))
    this.doorPanels(f, u, dw, floorY, dh)
    if (sp.door === 'modern') B.add('metal', fbox(f, u + dw / 2 - 0.16, u + dw / 2 - 0.12, floorY + 0.7, floorY + 1.5, 0.05, 0.12))
    else B.add('metal', fbox(f, u + dw / 2 - 0.13, u + dw / 2 - 0.07, floorY + 0.94, floorY + 1.02, 0.05, 0.11))
    if (side) {
      for (const s of [-1, 1]) {
        const a = s < 0 ? u - halfA : u + dw / 2 + mull
        const b = a + side
        const ma = s < 0 ? b : u + dw / 2
        const mb = s < 0 ? u - dw / 2 : a
        B.add('trim', fbox(f, ma, mb, floorY, floorY + dh, 0, 0.05))
        B.add('trim', fbox(f, a, b, floorY, floorY + 0.55, 0, 0.045))
        B.add('frame', fbox(f, a, a + 0.04, floorY + 0.55, floorY + dh, 0, 0.03))
        B.add('frame', fbox(f, b - 0.04, b, floorY + 0.55, floorY + dh, 0, 0.03))
        B.add('frame', fbox(f, a, b, floorY + dh - 0.04, floorY + dh, 0, 0.03))
        B.add('glassLit', fbox(f, a + 0.04, b - 0.04, floorY + 0.55, floorY + dh - 0.04, 0.006, 0.012))
        for (let k = 1; k < 4; k++) {
          const y = floorY + 0.55 + ((dh - 0.59) * k) / 4
          B.add('frame', fbox(f, a + 0.04, b - 0.04, y - 0.01, y + 0.01, 0.012, 0.022))
        }
      }
    }
    let top = floorY + dh
    if (sp.transom === 'rect') {
      B.add('trim', fbox(f, u - halfA, u + halfA, top, top + 0.07, 0, 0.05))
      top += 0.07
      B.add('glassLit', fbox(f, u - halfA + 0.04, u + halfA - 0.04, top, top + 0.34, 0.006, 0.012))
      B.add('frame', fbox(f, u - halfA, u + halfA, top + 0.34, top + 0.38, 0, 0.03))
      const n = Math.max(2, Math.round((halfA * 2) / 0.3))
      for (let k = 1; k < n; k++) {
        const x = u - halfA + (halfA * 2 * k) / n
        B.add('frame', fbox(f, x - 0.011, x + 0.011, top, top + 0.34, 0.012, 0.024))
      }
      top += 0.38
    } else if (sp.transom === 'fan') {
      B.add('trim', fbox(f, u - halfA, u + halfA, top, top + 0.07, 0, 0.05))
      top += 0.07
      const ry = Math.min(0.48, halfA * 0.55)
      this.arch(f, u, top, halfA - 0.02, ry, 6)
      top += ry + 0.05
    }
    const c = 0.14
    if (sp.head === 'crown' || sp.head === 'lintel') {
      // Pilasters and an entablature (simpler head when a portico covers the door).
      for (const s of [-1, 1]) {
        const a = s < 0 ? u - halfA - 0.2 : u + halfA
        B.add('trim', fbox(f, a, a + 0.2, floorY, top, 0, 0.07))
        B.add('trim', fbox(f, a - 0.02, a + 0.22, floorY, floorY + 0.18, 0, 0.09))
      }
      if (covered === 'portico') {
        B.add('trim', fbox(f, u - halfA - 0.22, u + halfA + 0.22, top, top + 0.06, 0, 0.08))
        top += 0.06
      } else {
        B.add('trim', fbox(f, u - halfA - 0.24, u + halfA + 0.24, top, top + 0.22, 0, 0.08))
        B.add('trim', fbox(f, u - halfA - 0.32, u + halfA + 0.32, top + 0.22, top + 0.3, 0, 0.16))
        top += 0.3
      }
    } else {
      B.add('trim', fbox(f, u - halfA - c, u - halfA, floorY, top, 0, 0.05))
      B.add('trim', fbox(f, u + halfA, u + halfA + c, floorY, top, 0, 0.05))
      if (sp.head === 'craftsman') {
        B.add('trim', fbox(f, u - halfA - c, u + halfA + c, top, top + c + 0.06, 0, 0.05))
        B.add('trim', fbox(f, u - halfA - c - 0.05, u + halfA + c + 0.05, top + c + 0.06, top + c + 0.1, 0, 0.09))
        top += c + 0.1
      } else {
        B.add('trim', fbox(f, u - halfA - c, u + halfA + c, top, top + c, 0, 0.05))
        top += c
      }
    }
    this.doorHalf = halfA + 0.32
    // Lights: wall sconces beside the door, or a lantern hanging in the portico.
    if (covered !== 'portico') {
      for (const s of [-1, 1]) {
        const lu = u + s * (halfA + 0.42)
        const v = floorY + 1.78
        B.add('metal', fbox(f, lu - 0.06, lu + 0.06, v - 0.2, v + 0.16, 0, 0.025))
        B.add('lamp', fbox(f, lu - 0.065, lu + 0.065, v - 0.15, v + 0.08, 0.04, 0.17))
        B.add('metal', fbox(f, lu - 0.085, lu + 0.085, v + 0.08, v + 0.12, 0.03, 0.19))
        B.add('metal', fbox(f, lu - 0.05, lu + 0.05, v - 0.18, v - 0.15, 0.05, 0.16))
      }
    }
    this.lights.door = fpt(f, u, floorY + 2.1, 1.1)
    return top
  }

  private doorPanels(f: Face, u: number, dw: number, y0: number, dh: number) {
    const { B } = this
    const P = (u0: number, u1: number, v0: number, v1: number) => B.add('door', fbox(f, u0, u1, v0, v1, 0.05, 0.066))
    const G = (u0: number, u1: number, v0: number, v1: number) => B.add('glassLit', fbox(f, u0, u1, v0, v1, 0.05, 0.056))
    const bar = (u0: number, u1: number, v0: number, v1: number) => B.add('door', fbox(f, u0, u1, v0, v1, 0.056, 0.066))
    const st = 0.13
    const L = u - dw / 2
    const R = u + dw / 2
    switch (this.sp.door) {
      case 'six-panel':
      case 'four-panel': {
        const rows: [number, number][] =
          this.sp.door === 'six-panel'
            ? [
                [y0 + 0.16, y0 + 0.8],
                [y0 + 0.96, y0 + 1.62],
                [y0 + 1.76, y0 + dh - 0.13],
              ]
            : [
                [y0 + 0.16, y0 + 0.98],
                [y0 + 1.14, y0 + dh - 0.13],
              ]
        for (const [a, b] of [
          [L + st, u - 0.045],
          [u + 0.045, R - st],
        ])
          for (const [v0, v1] of rows) P(a, b, v0, v1)
        break
      }
      case 'craftsman': {
        G(L + st, R - st, y0 + 1.5, y0 + dh - 0.14)
        for (const k of [1, 2]) {
          const x = L + st + ((R - L - 2 * st) * k) / 3
          bar(x - 0.018, x + 0.018, y0 + 1.5, y0 + dh - 0.14)
        }
        B.add('door', fbox(f, L + 0.06, R - 0.06, y0 + 1.36, y0 + 1.44, 0.05, 0.1))
        for (const k of [0, 1, 2]) {
          const w = (R - L - 2 * st - 0.08) / 3
          const a = L + st + k * (w + 0.04)
          P(a, a + w, y0 + 0.18, y0 + 1.24)
        }
        break
      }
      case 'farmhouse':
      case 'cottage': {
        const gTop = y0 + dh - 0.14
        const gBot = this.sp.door === 'farmhouse' ? y0 + 1.08 : y0 + 1.3
        G(L + st, R - st, gBot, gTop)
        bar(u - 0.012, u + 0.012, gBot, gTop)
        bar(L + st, R - st, (gBot + gTop) / 2 - 0.012, (gBot + gTop) / 2 + 0.012)
        P(L + st, u - 0.04, y0 + 0.16, gBot - 0.14)
        P(u + 0.04, R - st, y0 + 0.16, gBot - 0.14)
        break
      }
      case 'modern': {
        G(L + 0.14, L + 0.3, y0 + 0.24, y0 + dh - 0.24)
        for (let y = y0 + 0.45; y < y0 + dh - 0.3; y += 0.42) B.add('metal', fbox(f, L + 0.38, R - 0.22, y, y + 0.012, 0.05, 0.054))
        break
      }
    }
  }

  /* ---------------- porch, portico, stoop ---------------- */

  private steps(x0: number, x1: number, zEdge: number, dir: 1 | -1, topY: number, key: MatKey, axis: 'z' | 'x' = 'z') {
    const n = Math.max(2, Math.round(topY / 0.18))
    const rise = topY / n
    const run = 0.3
    for (let i = 1; i < n; i++) {
      const h = topY - i * rise
      const a = zEdge
      const b = zEdge + dir * i * run
      if (axis === 'z') this.B.add(key, boxMM(x0, -0.1, a, x1, h, b))
      else this.B.add(key, boxMM(a, -0.1, x0, b, h, x1))
    }
    return (n - 1) * run
  }

  private column(x: number, z: number, y0: number, y1: number) {
    const { B, sp, cfg } = this
    const key: MatKey = sp.postsDark ? 'frame' : 'trim'
    switch (sp.column) {
      case 'round': {
        B.add('trim', boxMM(x - 0.17, y0, z - 0.17, x + 0.17, y0 + 0.1, z + 0.17))
        B.add('trim', cylinder(x, z, y0 + 0.1, y1 - 0.12, 0.115, 0.135, 16))
        B.add('trim', boxMM(x - 0.16, y1 - 0.12, z - 0.16, x + 0.16, y1, z + 0.16))
        break
      }
      case 'tapered': {
        let yb = y0
        if (sp.piers) {
          const pk: MatKey = cfg.stoneBase ? 'stone' : this.brick ? 'siding' : 'stone'
          B.add(pk, boxMM(x - 0.29, y0, z - 0.29, x + 0.29, y0 + 1.0, z + 0.29))
          B.add('trim', boxMM(x - 0.33, y0 + 1.0, z - 0.33, x + 0.33, y0 + 1.07, z + 0.33))
          yb = y0 + 1.07
        }
        const sq = (h: number, y: number) => [v3(x - h, y, z - h), v3(x + h, y, z - h), v3(x + h, y, z + h), v3(x - h, y, z + h)]
        B.add('trim', prismBetween(sq(0.2, yb), sq(0.135, y1 - 0.1)))
        B.add('trim', boxMM(x - 0.17, y1 - 0.1, z - 0.17, x + 0.17, y1, z + 0.17))
        break
      }
      case 'square': {
        if (sp.piers) {
          B.add(cfg.stoneBase ? 'stone' : 'trim', boxMM(x - 0.24, y0, z - 0.24, x + 0.24, y0 + 0.9, z + 0.24))
          B.add('trim', boxMM(x - 0.27, y0 + 0.9, z - 0.27, x + 0.27, y0 + 0.96, z + 0.27))
          y0 += 0.96
        }
        B.add('trim', boxMM(x - 0.12, y0, z - 0.12, x + 0.12, y1 - 0.1, z + 0.12))
        B.add('trim', boxMM(x - 0.155, y1 - 0.1, z - 0.155, x + 0.155, y1, z + 0.155))
        B.add('trim', boxMM(x - 0.15, y0, z - 0.15, x + 0.15, y0 + 0.14, z + 0.15))
        break
      }
      case 'post':
        B.add(key, boxMM(x - 0.1, y0, z - 0.1, x + 0.1, y1, z + 0.1))
        break
    }
  }

  private railing(a: Vector3, b: Vector3, deckY: number) {
    const { B } = this
    const key: MatKey = this.sp.postsDark ? 'frame' : 'trim'
    const len = a.distanceTo(b)
    if (len < 0.3) return
    B.add(key, beam(v3(a.x, deckY + 0.9, a.z), v3(b.x, deckY + 0.9, b.z), 0.1, 0.06))
    B.add(key, beam(v3(a.x, deckY + 0.12, a.z), v3(b.x, deckY + 0.12, b.z), 0.07, 0.05))
    const n = Math.floor(len / 0.13)
    for (let i = 1; i < n; i++) {
      const t = i / n
      const x = a.x + (b.x - a.x) * t
      const z = a.z + (b.z - a.z) * t
      B.add(key, boxMM(x - 0.018, deckY + 0.145, z - 0.018, x + 0.018, deckY + 0.87, z + 0.018))
    }
  }

  private porch() {
    const { B, W, D, fh, sp, cfg } = this
    const wrap = this.wrapSide
    const pd = this.wing ? Math.min(2.4, this.sp.wingProj) : 2.4
    this.porchDepth = pd
    const deckY = fh - 0.04
    const yb = fh + 2.45
    const ybt = yb + 0.28
    const pp = 0.25
    const tp = 0.16
    const ovp = 0.3
    let px0 = -W / 2
    let px1 = W / 2
    let abutL = false
    let abutR = false
    if (this.wing) {
      if (this.wingSide > 0) {
        px1 = this.wing.l
        abutR = true
      } else {
        px0 = this.wing.r
        abutL = true
      }
    }
    if (this.courtyard && px1 >= W / 2 - 0.01) abutR = true
    const zFront = D / 2 + pd
    const colZ = zFront - 0.15
    const doorX = this.doorX
    const stepHalf = sp.column === 'tapered' ? 1.0 : 1.1

    // Extents including the wrap corner.
    const ex0 = wrap < 0 ? -W / 2 - pd : px0
    const ex1 = wrap > 0 ? W / 2 + pd : px1
    const wrapLen = Math.min(this.D * 0.62, this.D - 1.2)
    let zEnd = D / 2 - wrapLen
    if (cfg.screenPorch && wrap === this.freeSide) zEnd = Math.max(zEnd, -D / 2 + 0.5 + 4.4 + 0.5)

    // Deck and skirt.
    const skirt: MatKey = cfg.stoneBase ? 'stone' : this.brick ? 'siding' : 'foundation'
    B.add(skirt, boxMM(ex0 + 0.02, -0.2, D / 2 - 0.05, ex1 - 0.02, deckY - 0.08, zFront - 0.02))
    B.add('porchFloor', boxMM(ex0, deckY - 0.08, D / 2 - 0.05, ex1, deckY, zFront))
    if (wrap) {
      const sx0 = wrap < 0 ? -W / 2 - pd : W / 2
      const sx1 = wrap < 0 ? -W / 2 : W / 2 + pd
      B.add(skirt, boxMM(sx0 + 0.02, -0.2, zEnd + 0.02, sx1 - 0.02, deckY - 0.08, D / 2))
      B.add('porchFloor', boxMM(sx0, deckY - 0.08, zEnd, sx1, deckY, D / 2))
    }
    this.structures.push({ x0: ex0, x1: ex1, z0: D / 2, z1: zFront })
    if (wrap) this.structures.push({ x0: wrap < 0 ? -W / 2 - pd : W / 2, x1: wrap < 0 ? -W / 2 : W / 2 + pd, z0: zEnd, z1: D / 2 })

    // Steps at the door.
    const run = this.steps(doorX - stepHalf, doorX + stepHalf, zFront, 1, deckY, 'porchFloor')
    this.walkStartZ = zFront + run

    // Columns along the front edge.
    type Anchor = { x: number; col: boolean }
    const anchors: Anchor[] = []
    const leftEnd = wrap < 0 ? -W / 2 - pd + 0.15 : px0 + 0.15
    const rightEnd = wrap > 0 ? W / 2 + pd - 0.15 : px1 - 0.15
    anchors.push({ x: abutL ? px0 : leftEnd, col: !abutL })
    for (const sx of [doorX - stepHalf - 0.16, doorX + stepHalf + 0.16]) if (sx > leftEnd + 0.5 && sx < rightEnd - 0.5) anchors.push({ x: sx, col: true })
    anchors.push({ x: abutR ? px1 : rightEnd, col: !abutR })
    anchors.sort((a, b) => a.x - b.x)
    const cols: Anchor[] = []
    for (let i = 0; i < anchors.length; i++) {
      cols.push(anchors[i])
      if (i === anchors.length - 1) break
      const a = anchors[i].x
      const b = anchors[i + 1].x
      const isStep = a < doorX && b > doorX && b - a < stepHalf * 2 + 0.6
      if (isStep) continue
      const k = Math.ceil((b - a) / 2.7) - 1
      for (let j = 1; j <= k; j++) cols.push({ x: a + ((b - a) * j) / (k + 1), col: true })
    }
    for (const c of cols) if (c.col) this.column(c.x, colZ, deckY, yb)
    if (sp.railing) {
      for (let i = 0; i < cols.length - 1; i++) {
        const a = cols[i].x
        const b = cols[i + 1].x
        if (a < doorX && b > doorX) continue
        this.railing(v3(a + (cols[i].col ? 0.13 : 0), 0, colZ), v3(b - (cols[i + 1].col ? 0.13 : 0), 0, colZ), deckY)
      }
    }
    // Beam along the front.
    B.add('trim', boxMM(abutL ? px0 : leftEnd - 0.15, yb, colZ - 0.12, abutR ? px1 : rightEnd + 0.15, ybt, colZ + 0.12))

    const yTop = (dist: number) => ybt + tp + dist * pp
    const yE = yTop(-ovp)
    const yW = yTop(pd)
    const roofKey: MatKey = sp.porchMetal ? 'roofMetal' : 'roof'
    const ovL = abutL ? 0 : 0.25
    const ovR = abutR ? 0 : 0.25

    if (!wrap) {
      this.slab(
        [v3(px0 - ovL, yE, zFront + ovp), v3(px1 + ovR, yE, zFront + ovp), v3(px1 + ovR, yW, D / 2 - 0.05), v3(px0 - ovL, yW, D / 2 - 0.05)],
        tp,
        roofKey,
      )
      // End beams back to the wall.
      if (!abutL) B.add('trim', boxMM(leftEnd - 0.12, yb, D / 2, leftEnd + 0.12, ybt, colZ))
      if (!abutR) B.add('trim', boxMM(rightEnd - 0.12, yb, D / 2, rightEnd + 0.12, ybt, colZ))
      if (sp.railing) {
        if (!abutL) this.railing(v3(leftEnd, 0, D / 2 + 0.05), v3(leftEnd, 0, colZ - 0.13), deckY)
        if (!abutR) this.railing(v3(rightEnd, 0, D / 2 + 0.05), v3(rightEnd, 0, colZ - 0.13), deckY)
      }
    } else {
      const s = wrap
      const sideColX = s * (W / 2 + pd - 0.15)
      const otherX = s < 0 ? px1 + ovR : px0 - ovL
      const ce = v3(s * (W / 2 + pd + ovp), yE, zFront + ovp)
      const ci = v3((s * W) / 2, yW, D / 2)
      this.slab([v3(otherX, yE, zFront + ovp), ce, ci, v3(otherX, yW, D / 2)], tp, roofKey)
      this.slab([ce, v3(s * (W / 2 + pd + ovp), yE, zEnd - ovp), v3((s * W) / 2, yW, zEnd - ovp), ci], tp, roofKey)
      B.add(roofKey === 'roof' ? 'ridge' : roofKey, beam(v3(ce.x, ce.y + 0.025, ce.z), v3(ci.x, ci.y + 0.025, ci.z), 0.18, 0.05))
      // Side beam, end beam and columns.
      B.add('trim', boxMM(sideColX - 0.12, yb, zEnd, sideColX + 0.12, ybt, colZ + 0.12))
      B.add('trim', boxMM((s * W) / 2, yb, zEnd + 0.03, sideColX, ybt, zEnd + 0.27))
      const zs: number[] = []
      const k = Math.max(1, Math.ceil((colZ - (zEnd + 0.15)) / 2.7))
      for (let j = 1; j <= k; j++) zs.push(colZ - ((colZ - (zEnd + 0.15)) * j) / k)
      for (const z of zs) this.column(sideColX, z, deckY, yb)
      if (sp.railing) {
        let prev = colZ
        for (const z of zs) {
          this.railing(v3(sideColX, 0, prev - 0.13), v3(sideColX, 0, z + 0.13), deckY)
          prev = z
        }
        this.railing(v3(sideColX - s * 0.13, 0, zEnd + 0.15), v3((s * W) / 2 + s * 0.05, 0, zEnd + 0.15), deckY)
        const otherEnd = s < 0 ? rightEnd : leftEnd
        if (!(s < 0 ? abutR : abutL)) this.railing(v3(otherEnd, 0, D / 2 + 0.05), v3(otherEnd, 0, colZ - 0.13), deckY)
      }
      const otherEnd = s < 0 ? rightEnd : leftEnd
      if (!(s < 0 ? abutR : abutL)) B.add('trim', boxMM(otherEnd - 0.12, yb, D / 2, otherEnd + 0.12, ybt, colZ))
      // Windows on that side stay clear of the porch roof slab.
      this.obstacles.push({ side: s, z0: zEnd - ovp, z1: D / 2 + 0.01, yMin: yW - tp - 0.05, yMax: () => yW + 0.05 })
    }

    // Plantings in front of the porch, skipping the steps.
    this.plantLines.push({ x0: ex0 + 0.2, x1: ex1 - 0.2, z: zFront + 0.15, skip: [[doorX - stepHalf - 0.3, doorX + stepHalf + 0.3]] })
    this.entry(faceFront(D / 2), doorX, fh, 'porch')
  }

  private portico() {
    const { B, D, fh, doorX } = this
    const pw = 3.1
    const pd = 1.9
    const x0 = doorX - pw / 2
    const x1 = doorX + pw / 2
    const zF = D / 2 + pd
    const stoopKey: MatKey = this.brick ? 'siding' : 'step'
    B.add(stoopKey, boxMM(x0 - 0.1, -0.2, D / 2 - 0.05, x1 + 0.1, fh - 0.03, zF))
    B.add('step', boxMM(x0 - 0.12, fh - 0.06, D / 2 - 0.05, x1 + 0.12, fh - 0.02, zF + 0.02))
    const run = this.steps(x0 + 0.1, x1 - 0.1, zF, 1, fh - 0.03, 'step')
    this.walkStartZ = zF + run
    this.structures.push({ x0: x0 - 0.1, x1: x1 + 0.1, z0: D / 2, z1: zF })
    const yb = fh + 2.82
    const ybt = yb + 0.28
    for (const x of [x0 + 0.22, x1 - 0.22]) {
      this.column(x, zF - 0.22, fh - 0.02, yb)
      B.add('trim', boxMM(x - 0.15, fh - 0.02, D / 2, x + 0.15, yb, D / 2 + 0.06))
    }
    B.add('trim', boxMM(x0, yb, D / 2 - 0.02, x1, ybt, zF))
    // Pediment roof (ridge toward the street).
    const pitch = 0.3
    const t = 0.16
    const half = pw / 2
    const yWall = ybt + t
    this.slab([v3(x0 - 0.16, yWall - 0.16 * pitch, D / 2 - 0.05), v3(x0 - 0.16, yWall - 0.16 * pitch, zF + 0.18), v3(doorX, yWall + half * pitch, zF + 0.18), v3(doorX, yWall + half * pitch, D / 2 - 0.05)], t, 'roof')
    this.slab([v3(x1 + 0.16, yWall - 0.16 * pitch, D / 2 - 0.05), v3(x1 + 0.16, yWall - 0.16 * pitch, zF + 0.18), v3(doorX, yWall + half * pitch, zF + 0.18), v3(doorX, yWall + half * pitch, D / 2 - 0.05)], t, 'roof')
    B.add('trim', sweep('z', [[x0, ybt], [x1, ybt], [doorX, ybt + half * pitch]], D / 2 - 0.02, zF))
    B.add('ridge', beam(v3(doorX, yWall + half * pitch + 0.015, D / 2 - 0.05), v3(doorX, yWall + half * pitch + 0.015, zF + 0.2), 0.18, 0.05))
    this.overDoorTop = yWall + half * pitch + 0.06
    // Lantern hanging from the portico ceiling.
    const lz = D / 2 + pd * 0.55
    B.add('metal', boxMM(doorX - 0.01, yb - 0.3, lz - 0.01, doorX + 0.01, yb, lz + 0.01))
    B.add('metal', boxMM(doorX - 0.12, yb - 0.34, lz - 0.12, doorX + 0.12, yb - 0.3, lz + 0.12))
    B.add('lamp', boxMM(doorX - 0.1, yb - 0.66, lz - 0.1, doorX + 0.1, yb - 0.34, lz + 0.1))
    B.add('metal', boxMM(doorX - 0.11, yb - 0.7, lz - 0.11, doorX + 0.11, yb - 0.66, lz + 0.11))
    this.plantLines.push({ x0: -this.W / 2 + 0.3, x1: this.W / 2 - 0.3, z: D / 2 + 0.1, skip: [[x0 - 0.5, x1 + 0.5]] })
    this.entry(faceFront(D / 2), doorX, fh, 'portico')
  }

  private stoop() {
    const { B, D, fh, doorX } = this
    const half = 1.05
    const zF = D / 2 + 1.35
    B.add('step', boxMM(doorX - half, -0.2, D / 2 - 0.05, doorX + half, fh - 0.03, zF))
    const run = this.steps(doorX - half + 0.1, doorX + half - 0.1, zF, 1, fh - 0.03, 'step')
    this.walkStartZ = zF + run
    this.structures.push({ x0: doorX - half, x1: doorX + half, z0: D / 2, z1: zF })
    const top = this.entry(faceFront(D / 2), doorX, fh, 'none')
    // Bracketed hood over the door.
    const hw = this.doorHalf + 0.15
    const y0 = top + 0.06
    this.slab([v3(doorX - hw, y0 + 0.12, D / 2 + 0.95), v3(doorX + hw, y0 + 0.12, D / 2 + 0.95), v3(doorX + hw, y0 + 0.5, D / 2 - 0.05), v3(doorX - hw, y0 + 0.5, D / 2 - 0.05)], 0.12, 'roof')
    for (const s of [-1, 1]) {
      const x = doorX + s * (hw - 0.15)
      B.add('trim', beam(v3(x, y0 - 0.55, D / 2 + 0.02), v3(x, y0 + 0.02, D / 2 + 0.78), 0.08, 0.09))
      B.add('trim', boxMM(x - 0.04, y0 - 0.6, D / 2, x + 0.04, y0, D / 2 + 0.08))
    }
    this.overDoorTop = y0 + 0.55
    this.plantLines.push({ x0: -this.W / 2 + 0.3, x1: this.W / 2 - 0.3, z: D / 2 + 0.1, skip: [[doorX - half - 0.4, doorX + half + 0.4]] })
  }

  /* ---------------- main parts ---------------- */

  private mainMass() {
    const { W, D, wallTop, B, sp, p } = this
    const t = sp.fascia
    this.massBox(-W / 2, W / 2, -D / 2, D / 2, wallTop, { eaveAxis: this.hipMain ? 'both' : 'x' })
    this.structures.push({ x0: -W / 2, x1: W / 2, z0: -D / 2, z1: D / 2 })
    if (this.hipMain) {
      this.hipRoof(-W / 2, W / 2, -D / 2, D / 2, wallTop, p, sp.eave, t)
    } else {
      B.add(this.gableKey, sweep('x', [[-D / 2, wallTop], [D / 2, wallTop], [0, wallTop + HEEL + (D / 2) * p - t]], -W / 2, W / 2))
      if (this.gableKey === 'sidingAccent') {
        for (const s of [-1, 1]) B.add('trim', boxMM(s * (W / 2), wallTop - 0.12, -D / 2, s * (W / 2 + 0.05), wallTop + 0.02, D / 2))
      }
      this.gableRoofX(-W / 2 - sp.rake, W / 2 + sp.rake, -D / 2, D / 2, wallTop, p, sp.eave, t)
      if (sp.brackets) {
        for (const s of [-1, 1]) for (const z of [-D / 2 + 0.45, D / 2 - 0.45, 0]) this.knee(faceSide((s * W) / 2, s), uOf(faceSide((s * W) / 2, s), (s * W) / 2, z), z, D / 2, wallTop, sp.rake)
      }
    }
  }

  /** Craftsman knee brace under a rake overhang. */
  private knee(f: Face, u: number, z: number, halfSpan: number, yWall: number, overhang: number) {
    const roofBottom = yWall + HEEL + (halfSpan - Math.abs(z)) * this.p - this.sp.fascia
    const yTop = roofBottom - 0.04
    const a = fpt(f, u, yTop - 0.62, 0.02)
    const b = fpt(f, u, yTop - 0.05, overhang * 0.82)
    this.B.add('trim', beam(a, b, 0.11, 0.1))
    this.B.add('trim', beam(fpt(f, u, yTop - 0.05, 0), fpt(f, u, yTop - 0.05, overhang * 0.95), 0.11, 0.1))
  }

  private wingMass() {
    const wg = this.wing
    if (!wg) return
    const { B, D, wallTop, p, sp } = this
    const t = sp.fascia
    const hw = wg.w / 2
    this.massBox(wg.l, wg.r, D / 2 - 0.4, wg.front, wallTop, {
      eaveAxis: 'z',
      corners: [
        [wg.l, wg.front],
        [wg.r, wg.front],
      ],
    })
    this.structures.push({ x0: wg.l, x1: wg.r, z0: D / 2, z1: wg.front })
    B.add(this.gableKey, sweep('z', [[wg.l, wallTop], [wg.r, wallTop], [wg.c, wallTop + HEEL + hw * p - t]], D / 2 - hw - 0.4, wg.front))
    if (this.gableKey === 'sidingAccent') B.add('trim', boxMM(wg.l, wallTop - 0.12, wg.front, wg.r, wallTop + 0.02, wg.front + 0.05))
    this.gableRoofZ(wg.l, wg.r, wg.front + sp.rake, D / 2 - hw - 0.15, wallTop, p, sp.eave, t, 'roof', D / 2 - hw + 0.1)
    const f = faceFront(wg.front)
    this.gableWindow(f, wg.c, wallTop, hw, p, t)
    if (sp.brackets) {
      for (const x of [wg.l + 0.35, wg.r - 0.35]) {
        const roofBottom = wallTop + HEEL + (x < wg.c ? x - wg.l : wg.r - x) * p - t
        B.add('trim', beam(v3(x, roofBottom - 0.66, wg.front + 0.02), v3(x, roofBottom - 0.09, wg.front + sp.rake * 0.82), 0.11, 0.1))
        B.add('trim', beam(v3(x, roofBottom - 0.09, wg.front), v3(x, roofBottom - 0.09, wg.front + sp.rake * 0.95), 0.11, 0.1))
      }
    }
    this.plantLines.push({ x0: wg.l + 0.2, x1: wg.r - 0.2, z: wg.front + 0.1, skip: [] })
  }

  private frontWindows() {
    const { cfg, W, D, sp } = this
    const n = cfg.windowsPerFloor
    const f = faceFront(D / 2)
    const ww = this.ww
    const doorZone = this.doorHalf + ww / 2 + 0.2
    const shutterFits = (spacing: number) => cfg.shutters && spacing >= ww + 0.22 + ww + 0.1 + 0.2
    const stories = this.levels.length - 1
    const place = (k: number, x: number, spacing: number) => {
      let sill = this.sill(k)
      let h = this.winH(k)
      if (k === 1 && Math.abs(x - this.doorX) < this.doorHalf && this.overDoorTop > sill - 0.1) {
        const newSill = this.overDoorTop + 0.1
        h -= newSill - sill
        sill = newSill
        if (h < 0.8) return
      }
      this.window({ f, u: x, sill, w: ww, h, shutters: shutterFits(spacing), flowerBox: k === 0 && sp.flowerBoxes })
    }
    if (!this.wing) {
      const spacing = W / n
      const cols = Array.from({ length: n }, (_, i) => -W / 2 + (i + 0.5) * spacing)
      for (let k = 1; k < stories; k++) for (const x of cols) place(k, x, spacing)
      for (const x of cols) if (Math.abs(x - this.doorX) > doorZone) place(0, x, spacing)
      return
    }
    // Cross-gable: feature windows on the wing, regular windows on the porch side.
    const wg = this.wing
    const fw = faceFront(wg.front)
    for (let k = 0; k < stories; k++) {
      const units = k === 0 ? (wg.w >= 5.2 ? 3 : 2) : wg.w >= 4.6 ? 2 : 1
      const w = Math.min(ww, (wg.w - 1.2 - (units - 1) * 0.1) / units)
      this.window({ f: fw, u: wg.c, sill: this.sill(k), w, h: this.winH(k), units, shutters: units === 1 && cfg.shutters })
    }
    const s0 = this.wingSide > 0 ? -W / 2 : wg.r
    const s1 = this.wingSide > 0 ? wg.l : W / 2
    const segW = s1 - s0
    const kCount = clamp(n - 2, 1, Math.max(1, Math.floor(segW / 2.3)))
    const spacing = segW / kCount
    const cols = Array.from({ length: kCount }, (_, i) => s0 + (i + 0.5) * spacing)
    for (let k = 1; k < stories; k++) for (const x of cols) place(k, x, spacing)
    // First floor: keep aligned columns clear of the door; fill a wide empty stretch.
    const first: number[] = []
    for (const x of cols) {
      if (Math.abs(x - this.doorX) > doorZone) first.push(x)
      else {
        const dir = x < this.doorX ? -1 : 1
        const shifted = this.doorX + dir * doorZone
        if (shifted - ww / 2 - 0.35 > s0 && shifted + ww / 2 + 0.35 < s1) first.push(shifted)
      }
    }
    const freeL = [s0 + 0.35, this.doorX - doorZone + ww / 2]
    const freeR = [this.doorX + doorZone - ww / 2, s1 - 0.35]
    for (const [a, b] of [freeL, freeR]) {
      if (b - a > 2.4 && !first.some((x) => x > a && x < b)) first.push((a + b) / 2)
    }
    for (const x of first) place(0, x, spacing)
  }

  private rear() {
    const { B, W, D, fh, cfg, sp } = this
    const f = faceBack(-D / 2)
    const n = clamp(cfg.windowsPerFloor - 1, 2, 5)
    const spacing = W / n
    const xs = Array.from({ length: n }, (_, i) => -W / 2 + (i + 0.5) * spacing)
    const stories = this.levels.length - 1
    for (let k = 1; k < stories; k++) for (const x of xs) this.window({ f, u: uOf(f, x, -D / 2), sill: this.sill(k), w: this.ww, h: this.winH(k) })
    // French doors to the patio.
    const dLites: [number, number] = sp.top[0] > 1 ? [2, 4] : [1, 1]
    this.window({ f, u: 0, sill: fh + 0.02, w: 0.82, h: 2.15, units: 2, doubleHung: false, lites: { top: dLites, bottom: [1, 1] }, head: sp.head === 'lintel' ? 'lintel' : 'flat', lit: true })
    for (const x of xs) if (Math.abs(x) > 1.0 + 0.11 + this.ww / 2 + 0.35) this.window({ f, u: uOf(f, x, -D / 2), sill: this.sill(0), w: this.ww, h: this.winH(0) })
    B.add('step', boxMM(-1.3, -0.2, -D / 2 - 1.2, 1.3, fh - 0.03, -D / 2 + 0.05))
    const run = this.steps(-1.2, 1.2, -D / 2 - 1.2, -1, fh - 0.03, 'step')
    this.paving.push({ x0: -3.1, x1: 3.1, z0: -D / 2 - 1.2 - run - 3.4, z1: -D / 2 - 1.2 - run })
    this.structures.push({ x0: -1.3, x1: 1.3, z0: -D / 2 - 1.2, z1: -D / 2 })
  }

  private blocked(side: number, z0: number, z1: number, y0: number, y1: number) {
    return this.obstacles.some((o) => {
      if (o.side !== side || o.z1 <= z0 || o.z0 >= z1) return false
      if (o.yMin > y1) return false
      let top = -Infinity
      for (let i = 0; i <= 4; i++) top = Math.max(top, o.yMax(clamp(z0 + ((z1 - z0) * i) / 4, o.z0, o.z1)))
      return top >= y0
    })
  }

  private sideWindows() {
    const { W, D, cfg, wallTop, p, sp } = this
    const stories = this.levels.length - 1
    const ww = this.ww * 0.95
    const zs = D >= 12 ? [-D / 4 - 0.4, D / 4 + 0.2] : [-D / 4, D / 4]
    for (const s of [-1, 1]) {
      const x = (s * W) / 2
      const f = faceSide(x, s)
      for (let k = 0; k < stories; k++) {
        for (const z of zs) {
          const half = ww / 2 + 0.11 + (cfg.shutters ? ww / 2 + 0.06 : 0.06)
          const sill = this.sill(k)
          const h = this.winH(k)
          if (this.blocked(s, z - half, z + half, sill - 0.14, sill + h + 0.25)) continue
          this.window({ f, u: uOf(f, x, z), sill, w: ww, h, shutters: cfg.shutters })
        }
      }
      if (!this.hipMain && !this.blocked(s, -0.9, 0.9, wallTop, wallTop + 3)) {
        this.gableWindow(f, uOf(f, x, 0), wallTop, D / 2, p, sp.fascia)
      }
    }
  }

  /**
   * Dormers on the front roof plane. Their tops stay under a sight line that falls DORMER_SIGHT m per metre
   * forward from the crest of the main roof behind them (the ridge, or the hip plateau), so in views from
   * behind at the usual heights they never peek over the ridge. Roofs with room for it get gable dormers;
   * shallower roofs get lower shed dormers; and a roof too shallow to hide any dormer still gets the ones asked
   * for (visible from behind), so a dormer count chosen in the configurator always shows.
   */
  private dormers() {
    const { cfg, W, D, p, wallTop, ridgeTop, sp } = this
    const count = cfg.dormers
    if (!count) return
    const setback = 0.8
    const zf = D / 2 - setback
    const yS = wallTop + HEEL + setback * p
    /** Depth at which the front roof plane reaches height y. */
    const zAt = (y: number) => D / 2 - (y - wallTop - HEEL) / p
    const pd = clamp(p * 1.3, 0.6, 1)
    const ps = Math.max(0.08, p * 0.3)
    const dt = 0.13
    const dov = 0.14
    // Hip roofs narrow toward the top (45° hips): half-width of the front plane at depth z.
    const hipHalf = (z: number) => Math.max(0, W / 2 - (D / 2 - z))
    // Highest point of the main roof along the line x = const, and the depth up to which it reaches forward.
    const crest = (x: number) =>
      this.hipMain ? { y: wallTop + HEEL + p * Math.min(W / 2 - Math.abs(x), D / 2), z: Math.max(0, D / 2 - W / 2 + Math.abs(x)) } : { y: ridgeTop, z: 0 }
    const allowed = (x: number, z: number) => {
      const c = crest(x)
      return c.y - DORMER_SIGHT * Math.max(0, z - c.z)
    }

    interface Plan {
      shed: boolean
      hF: number
      dw: number
      xs: number[]
      yDe: number
      yDr: number
      zMeet: number
    }
    /** Where `count` dormers of this kind and front-wall height go (fewer when the roof is too narrow). */
    const layout = (shed: boolean, hF: number): Plan | null => {
      const maxW = shed ? 2.3 : 1.55
      const yDe = yS + hF
      const zShedMeet = D / 2 - (setback + (hF + HEEL) / (p - ps))
      // Where the dormer's cheek walls die into the roof (their back corners must stay on the front plane).
      const zCheek = shed ? zShedMeet : zAt(yDe)
      // Intervals (dormer extents, not centres) where dormers can sit.
      let ranges: [number, number][]
      if (this.hipMain) {
        const hwz = hipHalf(zCheek) - 0.3
        ranges = hwz > 0 ? [[-hwz, hwz]] : []
      } else ranges = [[-W / 2 + 0.9, W / 2 - 0.9]]
      if (this.wing) {
        const a = this.wing.l - sp.eave - 0.55
        const b = this.wing.r + sp.eave + 0.55
        ranges = ranges.flatMap(([r0, r1]) => {
          const out: [number, number][] = []
          if (a > r0) out.push([r0, Math.min(r1, a)])
          if (b < r1) out.push([Math.max(r0, b), r1])
          return out
        })
      }
      if (!ranges.length) return null
      const [e0, e1] = ranges.reduce((best, r) => (r[1] - r[0] > best[1] - best[0] ? r : best))
      const span = e1 - e0
      const gap = 0.5
      const minW = shed ? 1.4 : 1.25
      // Honour the requested count by narrowing dormers a little; drop one only when they get too slim.
      let k = count
      let dw = Math.min(maxW, (span - (k - 1) * gap) / k)
      while (k > 0 && dw < minW) {
        k--
        dw = k ? Math.min(maxW, (span - (k - 1) * gap) / k) : 0
      }
      if (!k) return null
      const yDr = yDe + HEEL + (dw / 2) * pd
      const zMeet = shed ? zShedMeet : zAt(yDr)
      let spacing = k > 1 ? Math.min((span - dw) / (k - 1), shed ? 3.8 : 3.4) : 0
      if (this.hipMain && !shed && k > 1) {
        // Each dormer ridge must also die into the front plane, not across a hip line.
        const maxC = hipHalf(zMeet) - 0.25
        spacing = Math.min(spacing, (2 * maxC) / (k - 1))
        if (spacing < dw + 0.3) {
          k = 1
          spacing = 0
        }
      }
      const mid = (e0 + e1) / 2
      const xs = Array.from({ length: k }, (_, i) => mid + (i - (k - 1) / 2) * spacing)
      return { shed, hF, dw, xs, yDe, yDr, zMeet }
    }
    /** The tallest front wall that keeps every dormer of a plan under the sight line. */
    const hiddenHeight = (pl: Plan) => {
      let h = Infinity
      for (const cx of pl.xs) {
        const outer = Math.abs(cx) + pl.dw / 2 + dov
        if (pl.shed) h = Math.min(h, allowed(outer, zf + dov) - yS - HEEL - 0.02)
        else h = Math.min(h, allowed(cx, zf + 0.13) - yS - HEEL - (pl.dw / 2) * pd - 0.05, allowed(outer, zf + 0.12) - yS - HEEL)
      }
      return h
    }
    /** Fit dormers of one kind no taller than `cap`, lowering them until they hide behind the ridge. */
    const fit = (shed: boolean, cap: number, minH: number): Plan | null => {
      let h = cap
      for (let i = 0; i < 4 && h >= minH; i++) {
        const pl = layout(shed, h)
        if (!pl) return null
        const hide = hiddenHeight(pl)
        if (hide >= h - 1e-3) return pl
        // A lower dormer only widens the room it has, so re-laying it out converges in a step or two.
        h = Math.min(h - 1e-3, hide)
      }
      return null
    }

    const gableCap = Math.min(1.45, ridgeTop - clamp(1.25 - p, 0.35, 0.8) - yS - (1.55 / 2) * pd)
    // Shed dormer: a gently sloping roof from the front wall that dies into the main roof below the ridge.
    const shedCap = Math.min(1.25, (p - ps) * ((ridgeTop - 0.3 - wallTop - HEEL) / p - setback) - HEEL)
    const plan = (sp.dormer !== 'shed' ? fit(false, gableCap, 1.05) : null) ?? fit(true, shedCap, 0.8) ?? (shedCap >= 0.8 ? layout(true, shedCap) : null)
    if (!plan) return
    const { shed, hF, dw, xs, yDe, yDr, zMeet } = plan

    const { B } = this
    const lites = { top: [sp.top[0] > 1 ? 2 : 1, sp.top[1]] as [number, number], bottom: [sp.top[0] > 1 ? 2 : 1, 1] as [number, number] }
    for (const cx of xs) {
      const l = cx - dw / 2
      const r = cx + dw / 2
      const back = zMeet - 0.3
      B.add('siding', boxMM(l, yS - 0.7, back, r, yDe, zf))
      if (shed) {
        // Cheek walls up to the sloping roof, then the roof itself (rising toward the main roof).
        const yAt = (z: number) => yDe + HEEL + (zf - z) * ps
        B.add(this.gableKey, sweep('x', [[zf, yDe], [back, yDe], [back, yAt(back) - dt]], l, r))
        this.slab([v3(l - dov, yAt(zf + dov), zf + dov), v3(r + dov, yAt(zf + dov), zf + dov), v3(r + dov, yAt(back), back), v3(l - dov, yAt(back), back)], dt, 'roof')
      } else {
        B.add(this.gableKey, sweep('z', [[l, yDe], [r, yDe], [cx, yDr - dt]], back, zf))
        const yE = yDe + HEEL - dov * pd
        this.slab([v3(l - dov, yE, zf + 0.12), v3(l - dov, yE, back), v3(cx, yDr, back), v3(cx, yDr, zf + 0.12)], dt, 'roof')
        this.slab([v3(r + dov, yE, zf + 0.12), v3(r + dov, yE, back), v3(cx, yDr, back), v3(cx, yDr, zf + 0.12)], dt, 'roof')
        B.add('ridge', beam(v3(cx, yDr + 0.015, zf + 0.13), v3(cx, yDr + 0.015, zMeet + 0.2), 0.18, 0.05))
      }
      if (!this.brick) {
        for (const x of [l, r]) B.add('trim', boxMM(x - 0.06, yS - 0.1, zf - 0.06, x + 0.06, yDe - 0.02, zf + 0.025))
      }
      const units = shed && dw >= 2 ? 2 : 1
      const ww = (dw - (shed ? 0.5 : 0.62) - (units - 1) * 0.1) / units
      this.window({ f: faceFront(zf), u: cx, sill: yS + (shed ? 0.2 : 0.24), w: ww, h: hF - (shed ? 0.4 : 0.48), units, head: 'flat', casing: 0.08, lites })
    }
  }

  private chimney() {
    const { cfg, W, D, B, levels, ridgeTop, wallTop } = this
    if (!cfg.chimney) return
    const s = this.freeSide
    const sideBusy = this.wrapSide === s || cfg.screenPorch
    const exterior = !this.hipMain && !sideBusy && cfg.style !== 'modern-farmhouse'
    const capAndPots = (x0: number, x1: number, z0: number, z1: number, top: number) => {
      B.add('trim', boxMM(x0 - 0.07, top, z0 - 0.07, x1 + 0.07, top + 0.1, z1 + 0.07))
      const cx = (x0 + x1) / 2
      const cz = (z0 + z1) / 2
      const along = Math.abs(x1 - x0) > Math.abs(z1 - z0)
      for (const d of [-0.18, 0.18]) {
        const px = along ? cx + d : cx
        const pz = along ? cz : cz + d
        B.add('metal', boxMM(px - 0.09, top + 0.1, pz - 0.09, px + 0.09, top + 0.32, pz + 0.09))
      }
    }
    if (exterior) {
      const x = (s * W) / 2
      const cz = 0
      const o = (d: number) => x + s * d
      const top = ridgeTop + 0.75
      const y1 = levels[1] + 0.35
      const y2 = levels[1] + 1.0
      B.add('chimney', boxMM(o(-0.05), -0.25, cz - 0.95, o(0.8), y1, cz + 0.95))
      const rect = (d: number, hz: number, y: number) => [v3(o(-0.05), y, cz - hz), v3(o(d), y, cz - hz), v3(o(d), y, cz + hz), v3(o(-0.05), y, cz + hz)]
      B.add('chimney', prismBetween(rect(0.8, 0.95, y1), rect(0.68, 0.56, y2)))
      B.add('chimney', boxMM(o(-0.05), y2, cz - 0.56, o(0.68), top, cz + 0.56))
      capAndPots(Math.min(o(-0.05), o(0.68)), Math.max(o(-0.05), o(0.68)), cz - 0.56, cz + 0.56, top)
      this.obstacles.push({ side: s, z0: cz - 1.05, z1: cz + 1.05, yMin: -1, yMax: () => 100 })
      this.structures.push({ x0: Math.min(x, o(0.8)), x1: Math.max(x, o(0.8)), z0: cz - 0.95, z1: cz + 0.95 })
      return
    }
    const cx = s * (W / 2 - 1.6)
    const cz = -0.9
    const top = ridgeTop + 0.6
    B.add('chimney', boxMM(cx - 0.5, wallTop - 0.4, cz - 0.38, cx + 0.5, top, cz + 0.38))
    capAndPots(cx - 0.5, cx + 0.5, cz - 0.38, cz + 0.38, top)
    void D
  }

  private sideGarage() {
    const { B, cfg, W, D, p, sp } = this
    const s = this.gSide
    const n = cfg.garageBays
    const span = n * 2.5 + (n - 1) * 0.6
    const gw = span + 1.1
    const gd = clamp(D - 0.6, 6, 7)
    const gz1 = D / 2 - 0.9
    const gz0 = gz1 - gd
    const gzc = (gz0 + gz1) / 2
    const xi = (s * W) / 2
    const xo = s * (W / 2 + gw)
    const x0 = Math.min(xi, xo)
    const x1 = Math.max(xi, xo)
    const gT = 3.05
    const gp = clamp(p, 0.45, 0.75)
    const gt = Math.min(sp.fascia, 0.22)
    const outerCorners: [number, number][] = [
      [xo, gz0],
      [xo, gz1],
    ]
    this.massBox(s > 0 ? x0 - 0.1 : x0, s > 0 ? x1 : x1 + 0.1, gz0, gz1, gT, { eaveAxis: 'x', corners: outerCorners, bottom: 0.12 })
    this.structures.push({ x0, x1, z0: gz0, z1: gz1 })
    const useHip = this.hipMain && gw > gd / 2 + 0.4
    if (useHip) {
      const yE = gT + HEEL - sp.eave * gp
      const yR = gT + HEEL + (gd / 2) * gp
      const xin = xi - s * 0.2
      const xh = xo - (s * gd) / 2
      const xe = xo + s * sp.eave
      this.slab([v3(xin, yE, gz1 + sp.eave), v3(xe, yE, gz1 + sp.eave), v3(xh, yR, gzc), v3(xin, yR, gzc)], gt, 'roof')
      this.slab([v3(xin, yE, gz0 - sp.eave), v3(xe, yE, gz0 - sp.eave), v3(xh, yR, gzc), v3(xin, yR, gzc)], gt, 'roof')
      this.slab([v3(xe, yE, gz1 + sp.eave), v3(xe, yE, gz0 - sp.eave), v3(xh, yR, gzc)], gt, 'roof')
      B.add('ridge', beam(v3(xin, yR + 0.03, gzc), v3(xh, yR + 0.03, gzc), 0.22, 0.06))
      B.add('ridge', beam(v3(xe, yE + 0.03, gz1 + sp.eave), v3(xh, yR + 0.03, gzc), 0.2, 0.06))
      B.add('ridge', beam(v3(xe, yE + 0.03, gz0 - sp.eave), v3(xh, yR + 0.03, gzc), 0.2, 0.06))
    } else {
      B.add(this.gableKey, sweep('x', [[gz0, gT], [gz1, gT], [gzc, gT + HEEL + (gd / 2) * gp - gt]], xi - s * 0.1, xo))
      const xa = xi - s * 0.2
      const xb = xo + s * sp.rake
      this.gableRoofX(Math.min(xa, xb), Math.max(xa, xb), gz0, gz1, gT, gp, sp.eave, gt)
      const fo = faceSide(xo, s)
      this.gableWindow(fo, uOf(fo, xo, gzc), gT, gd / 2, gp, gt, 'rect')
    }
    // Doors, coach lights and a side window.
    const f = faceFront(gz1)
    const cxDoors = (x0 + x1) / 2
    this.garageDoors(f, cxDoors, n)
    const fo = faceSide(xo, s)
    const zw = n >= 3 ? [gzc - 1.6, gzc + 1.6] : [gzc]
    for (const z of zw) this.window({ f: fo, u: uOf(fo, xo, z), sill: 1.15, w: this.ww * 0.95, h: 1.3, shutters: cfg.shutters })
    this.obstacles.push({
      side: s,
      z0: gz0 - sp.eave,
      z1: gz1 + sp.eave,
      yMin: -1,
      yMax: (z) => gT + HEEL + Math.max(0, (gd / 2 - Math.abs(z - gzc)) * gp) + 0.12,
    })
    this.paving.push({ x0: cxDoors - span / 2 - 0.45, x1: cxDoors + span / 2 + 0.45, z0: gz1, z1: Infinity })
    this.lights.garage = v3(cxDoors, 2.7, gz1 + 1.2)
  }

  private courtyardGarage() {
    const { B, cfg, W, D, p, sp } = this
    const n = cfg.garageBays
    const span = n * 2.5 + (n - 1) * 0.6
    const gLen = span + 1.6
    const gD = 7
    const z0 = D / 2 - 2.4
    const z1 = z0 + gLen
    const zc = (z0 + z1) / 2
    const xIn = W / 2
    const x1 = W / 2 + gD
    const xc = (xIn + x1) / 2
    const gT = 3.05
    const gp = clamp(p, 0.5, 0.8)
    const gt = Math.min(sp.fascia, 0.22)
    this.massBox(xIn - 0.1, x1, z0, z1, gT, {
      eaveAxis: 'z',
      corners: [
        [xIn - 0.1, z1],
        [x1, z1],
        [x1, z0],
      ],
      bottom: 0.12,
    })
    this.structures.push({ x0: xIn, x1, z0, z1 })
    B.add(this.gableKey, sweep('z', [[xIn, gT], [x1, gT], [xc, gT + HEEL + (gD / 2) * gp - gt]], z0, z1))
    this.gableRoofZ(xIn, x1, z1 + sp.rake, z0 - sp.rake, gT, gp, sp.eave, gt)
    // Street-facing gable: window pair and gable window.
    const ff = faceFront(z1)
    this.window({ f: ff, u: xc, sill: 1.05, w: this.ww * 0.9, h: 1.45, units: 2 })
    this.gableWindow(ff, xc, gT, gD / 2, gp, gt)
    this.gableWindow(faceBack(z0), uOf(faceBack(z0), xc, z0), gT, gD / 2, gp, gt, 'rect')
    // Courtyard-facing wall (toward the front door) gets a window.
    const fi = faceSide(xIn, -1)
    if (z1 - (D / 2 + 0.8) > 1.8) this.window({ f: fi, u: uOf(fi, xIn, (D / 2 + z1) / 2), sill: 1.15, w: this.ww * 0.95, h: 1.35, shutters: cfg.shutters })
    // Side-load doors on the outer wall.
    const fo = faceSide(x1, 1)
    this.garageDoors(fo, uOf(fo, x1, zc), n)
    this.obstacles.push({ side: 1, z0: z0 - sp.rake, z1: D / 2 + 0.01, yMin: -1, yMax: () => gT + 0.15 })
    this.paving.push({ x0: x1, x1: x1 + 6.4, z0: zc - span / 2 - 0.6, z1: Infinity })
    this.plantLines.push({ x0: xIn + 0.3, x1: x1 - 0.3, z: z1 + 0.1, skip: [] })
    this.lights.garage = v3(x1 + 1.2, 2.7, zc)
  }

  private garageDoors(f: Face, uc: number, n: number) {
    const { B, sp } = this
    const dw = 2.5
    const dh = 2.2
    const gap = 0.6
    const total = n * dw + (n - 1) * gap
    const y0 = 0.12
    const G: MatKey = 'garageDoor'
    for (let k = 0; k < n; k++) {
      const L = uc - total / 2 + k * (dw + gap)
      const R = L + dw
      B.add(G, fbox(f, L, R, y0, y0 + dh, 0, 0.035))
      const c = 0.15
      B.add('trim', fbox(f, L - c, L, y0, y0 + dh + c, 0, 0.05))
      B.add('trim', fbox(f, R, R + c, y0, y0 + dh + c, 0, 0.05))
      B.add('trim', fbox(f, L, R, y0 + dh, y0 + dh + c, 0, 0.05))
      if (sp.garage === 'raised') {
        const rows = 4
        const cols = 4
        for (let i = 0; i < cols; i++)
          for (let j = 0; j < rows; j++) {
            const u0 = L + 0.09 + ((dw - 0.18) * i) / cols + 0.03
            const u1 = L + 0.09 + ((dw - 0.18) * (i + 1)) / cols - 0.03
            const v0 = y0 + 0.08 + ((dh - 0.16) * j) / rows + 0.04
            const v1 = y0 + 0.08 + ((dh - 0.16) * (j + 1)) / rows - 0.04
            B.add(G, fbox(f, u0, u1, v0, v1, 0.035, 0.052))
          }
      } else if (sp.garage === 'carriage') {
        const gTop = y0 + dh - 0.12
        const gBot = y0 + dh - 0.56
        for (let i = 0; i < 4; i++) {
          const u0 = L + 0.12 + ((dw - 0.24) * i) / 4 + 0.03
          const u1 = L + 0.12 + ((dw - 0.24) * (i + 1)) / 4 - 0.03
          B.add('glassDim', fbox(f, u0, u1, gBot, gTop, 0.035, 0.04))
        }
        for (const v of [gBot - 0.06, y0 + 0.75]) B.add(G, fbox(f, L + 0.06, R - 0.06, v - 0.04, v + 0.04, 0.035, 0.06))
        B.add('metal', fbox(f, (L + R) / 2 - 0.01, (L + R) / 2 + 0.01, y0 + 0.06, gBot - 0.1, 0.035, 0.042))
        for (const s of [-1, 1]) {
          const hx = (L + R) / 2 + s * 0.16
          B.add('metal', fbox(f, hx - 0.015, hx + 0.015, y0 + 1.0, y0 + 1.3, 0.035, 0.08))
          for (const v of [y0 + 0.45, y0 + 1.35]) {
            const a = s < 0 ? L + 0.08 : R - 0.5
            B.add('metal', fbox(f, a, a + 0.42, v - 0.025, v + 0.025, 0.035, 0.05))
          }
        }
        for (let i = 1; i < 6; i++) {
          if (i === 3) continue
          const u = L + (dw * i) / 6
          B.add(G, fbox(f, u - 0.012, u + 0.012, y0 + 0.08, gBot - 0.1, 0.035, 0.045))
        }
      } else {
        for (let j = 1; j < 4; j++) {
          const v = y0 + (dh * j) / 4
          B.add('metal', fbox(f, L + 0.03, R - 0.03, v - 0.008, v + 0.008, 0.035, 0.04))
        }
        B.add('glassDim', fbox(f, L + 0.08, R - 0.08, y0 + dh * 0.76, y0 + dh - 0.08, 0.035, 0.042))
      }
    }
    // Coach lights beside and between the doors.
    const lampUs: number[] = [uc - total / 2 - 0.42, uc + total / 2 + 0.42]
    for (let k = 1; k < n; k++) lampUs.push(uc - total / 2 + k * (dw + gap) - gap / 2)
    for (const lu of lampUs) {
      const v = 1.95
      B.add('metal', fbox(f, lu - 0.06, lu + 0.06, v - 0.2, v + 0.16, 0, 0.025))
      B.add('lamp', fbox(f, lu - 0.065, lu + 0.065, v - 0.15, v + 0.08, 0.04, 0.17))
      B.add('metal', fbox(f, lu - 0.085, lu + 0.085, v + 0.08, v + 0.12, 0.03, 0.19))
    }
  }

  private screenPorch() {
    const { B, cfg, W, D, fh, sp } = this
    if (!cfg.screenPorch) return
    const s = this.freeSide
    const out = 4.0
    const len = 4.4
    const zs0 = -D / 2 + 0.5
    const zs1 = zs0 + len
    const zc = (zs0 + zs1) / 2
    const xa = (s * W) / 2
    const xb = s * (W / 2 + out)
    const x0 = Math.min(xa, xb)
    const x1 = Math.max(xa, xb)
    const deckY = fh - 0.04
    const yb = fh + 2.45
    const ybt = yb + 0.26
    const skirt: MatKey = cfg.stoneBase ? 'stone' : 'foundation'
    B.add(skirt, boxMM(x0, -0.2, zs0, x1, deckY - 0.08, zs1))
    B.add('porchFloor', boxMM(x0, deckY - 0.08, zs0, x1, deckY, zs1))
    this.structures.push({ x0, x1, z0: zs0, z1: zs1 })
    const kw = 0.12
    const kTop = deckY + 0.72
    const sideKey: MatKey = this.brick ? 'siding' : 'siding'
    // Knee walls on the three open sides.
    B.add(sideKey, boxMM(xb - s * kw, deckY, zs0, xb, kTop, zs1))
    B.add(sideKey, boxMM(x0, deckY, zs0, x1, kTop, zs0 + kw))
    B.add(sideKey, boxMM(x0, deckY, zs1 - kw, x1, kTop, zs1))
    B.add('trim', boxMM(xb - s * (kw + 0.03), kTop, zs0 - 0.03, xb + s * 0.03, kTop + 0.05, zs1 + 0.03))
    B.add('trim', boxMM(x0, kTop, zs0 - 0.03, x1, kTop + 0.05, zs0 + kw + 0.03))
    B.add('trim', boxMM(x0, kTop, zs1 - kw - 0.03, x1, kTop + 0.05, zs1 + 0.03))
    // Posts.
    const px = xb - s * 0.09
    const posts: [number, number][] = [
      [px, zs0 + 0.09],
      [px, zs1 - 0.09],
      [px, zc],
      [(xa + xb) / 2, zs0 + 0.09],
      [(xa + xb) / 2, zs1 - 0.09],
    ]
    for (const [x, z] of posts) B.add('trim', boxMM(x - 0.09, deckY, z - 0.09, x + 0.09, yb, z + 0.09))
    // Screens.
    B.add('screen', boxMM(xb - s * 0.07, kTop + 0.05, zs0 + 0.1, xb - s * 0.06, yb, zs1 - 0.1))
    B.add('screen', boxMM(x0 + 0.05, kTop + 0.05, zs0 + 0.06, x1 - 0.05, yb, zs0 + 0.07))
    B.add('screen', boxMM(x0 + 0.05, kTop + 0.05, zs1 - 0.07, x1 - 0.05, yb, zs1 - 0.06))
    // Beam and gable roof (ridge perpendicular to the house).
    B.add('trim', boxMM(x0, yb, zs0, x1, ybt, zs0 + 0.2))
    B.add('trim', boxMM(x0, yb, zs1 - 0.2, x1, ybt, zs1))
    B.add('trim', boxMM(xb - s * 0.2, yb, zs0, xb, ybt, zs1))
    const pitch = 0.42
    const t = 0.16
    const eave = 0.3
    const yW = ybt + t
    const yR = yW + (len / 2) * pitch
    const yE = yW - eave * pitch
    const xin = xa - s * 0.1
    const xout = xb + s * 0.3
    this.slab([v3(xin, yE, zs1 + eave), v3(xout, yE, zs1 + eave), v3(xout, yR, zc), v3(xin, yR, zc)], t, 'roof')
    this.slab([v3(xin, yE, zs0 - eave), v3(xout, yE, zs0 - eave), v3(xout, yR, zc), v3(xin, yR, zc)], t, 'roof')
    B.add('ridge', beam(v3(xin, yR + 0.02, zc), v3(xout + s * 0.02, yR + 0.02, zc), 0.22, 0.06))
    // Gable end over the screens (pediment).
    B.add('trim', prismBetween(
      [v3(xb, ybt, zs0), v3(xb, ybt, zs1), v3(xb, ybt + (len / 2) * pitch - 0.02, zc)],
      [v3(xb - s * 0.08, ybt, zs0), v3(xb - s * 0.08, ybt, zs1), v3(xb - s * 0.08, ybt + (len / 2) * pitch - 0.02, zc)],
    ))
    // Steps down to the yard.
    this.steps(zc - 0.75, zc + 0.75, xb, s as 1 | -1, deckY, 'porchFloor', 'x')
    this.obstacles.push({ side: s, z0: zs0 - eave, z1: zs1 + eave, yMin: ybt - 0.05, yMax: (z) => yW + Math.max(0, (len / 2 - Math.abs(z - zc)) * pitch) + 0.1 })
    void sp
  }

  build(): SceneBuild {
    const { cfg } = this
    // Order matters: things that block side windows register obstacles first.
    this.mainMass()
    this.wingMass()
    if (this.hasGarage) {
      if (this.courtyard) this.courtyardGarage()
      else this.sideGarage()
    }
    this.screenPorch()
    if (cfg.porch === 'front' || cfg.porch === 'wrap') this.porch()
    else if (cfg.porch === 'portico') this.portico()
    else this.stoop()
    this.chimney()
    this.frontWindows()
    this.rear()
    this.sideWindows()
    this.dormers()

    // Walkway from the entry to the street edge of the plot.
    this.paving.push({ x0: this.doorX - 0.65, x1: this.doorX + 0.65, z0: this.walkStartZ - 0.02, z1: Infinity })

    const parts = this.B.build()
    const bounds = new Box3()
    for (const g of parts.values()) if (g.boundingBox) bounds.union(g.boundingBox)

    const siteBucket = new Bucket<MatKey>(WORLD_UV_KEYS, COLOR_KEYS)
    const plot = buildSite(siteBucket, {
      bounds,
      paving: this.paving,
      structures: this.structures,
      plantLines: this.plantLines,
      seed: hashString(`${cfg.style}|${cfg.width}|${cfg.depth}|${cfg.garagePosition}`),
    })
    const siteParts = siteBucket.build()
    // Merge site parts into the house map (keys never overlap except paving / foliage / step, so merge those).
    for (const [k, g] of siteParts) {
      const existing = parts.get(k)
      if (!existing) parts.set(k, g)
      else {
        const merged = mergeTwo(existing, g)
        existing.dispose()
        g.dispose()
        parts.set(k, merged)
      }
    }
    const look: HouseLook = {
      gableAccent: this.sp.gableAccent,
      porchFloor: this.sp.porchFloor,
      garageDoorColor: this.sp.garage === 'modern' ? cfg.colors.door : cfg.colors.trim,
    }
    return { parts, bounds, plot, look, lights: this.lights }
  }
}

function mergeTwo(a: BufferGeometry, b: BufferGeometry): BufferGeometry {
  const m = mergeGeometries([a, b], false)
  if (!m) return a.clone()
  m.computeBoundingBox()
  m.computeBoundingSphere()
  return m
}

/** Build the procedural house and its landscaped plot for a config. Pure function of the config. */
export function buildScene(config: HouseConfig): SceneBuild {
  return new HouseBuilder(config).build()
}

/** Look (colours that depend on the style) without building geometry. */
export function houseLook(config: HouseConfig): HouseLook {
  const sp = PROFILES[config.style] ?? PROFILES.traditional
  return {
    gableAccent: sp.gableAccent,
    porchFloor: sp.porchFloor,
    garageDoorColor: sp.garage === 'modern' ? config.colors.door : config.colors.trim,
  }
}
