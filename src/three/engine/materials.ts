import { Color, DoubleSide, MeshBasicMaterial, MeshStandardMaterial, type Material, type Texture } from 'three'
import type { HouseConfig } from '@/types'
import { patternCanvas, textureFrom, tintedCanvas, TILE, type PatternKind } from './textures'

export type MatKey =
  | 'siding'
  | 'sidingAccent'
  | 'trim'
  | 'roof'
  /** Ridge and hip caps: plain, a shade darker than the shingles (a stretched shingle texture would streak). */
  | 'ridge'
  | 'roofMetal'
  | 'foundation'
  | 'stone'
  | 'chimney'
  | 'frame'
  | 'glassLit'
  | 'glassDim'
  | 'door'
  | 'shutter'
  | 'garageDoor'
  | 'porchFloor'
  | 'step'
  | 'paving'
  | 'metal'
  | 'lamp'
  | 'screen'
  | 'lawn'
  | 'plotEdge'
  | 'trunk'
  | 'foliage'
  | 'mulch'
  | 'blob'

/** Materials whose geometry gets planar UVs in metres (textures tile at real-world scale). */
export const WORLD_UV_KEYS: ReadonlySet<MatKey> = new Set<MatKey>(['siding', 'sidingAccent', 'stone', 'chimney', 'foundation', 'paving', 'porchFloor', 'step', 'mulch', 'lawn'])
export const COLOR_KEYS: ReadonlySet<MatKey> = new Set<MatKey>(['foliage'])
/** Meshes that should not cast shadows. */
export const NO_SHADOW_KEYS: ReadonlySet<MatKey> = new Set<MatKey>(['glassLit', 'glassDim', 'screen', 'lamp', 'blob', 'lawn', 'paving', 'mulch', 'plotEdge'])

export interface HouseLook {
  /** Accent siding used in gables (craftsman / cottage shingles) or null to reuse the main siding. */
  gableAccent: 'shingle' | 'board-batten' | null
  porchFloor: string
  garageDoorColor: string
}

type Std = MeshStandardMaterial

/**
 * Trees and shrubs dissolve (ordered dither) when the camera comes within a few metres, so a close,
 * low orbit never puts a canopy in front of the lens or the near plane. Costs one distance per fragment.
 */
function nearFade(mat: Std, near = 1.6, far = 4.2) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFadeNear = { value: near }
    shader.uniforms.uFadeFar = { value: far }
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uFadeNear;
uniform float uFadeFar;
float whBayer4(vec2 p) {
  vec2 q = mod(floor(p), 4.0);
  float i = q.x + q.y * 4.0;
  float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  return (m[int(i)] + 0.5) / 16.0;
}`,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
{
  float whFade = smoothstep(uFadeNear, uFadeFar, length(vViewPosition));
  if (whFade < 0.999 && whFade < whBayer4(gl_FragCoord.xy)) discard;
}`,
      )
  }
  mat.customProgramCacheKey = () => `wh-nearfade-${near}-${far}`
  return mat
}

/**
 * One material set per viewer. Colours and textures are updated in place when the config changes,
 * so colour edits in the staff configurator never rebuild geometry.
 */
export class MaterialSet {
  readonly m: Record<MatKey, Material>
  private owned: Texture[] = []
  private patterns = new Map<string, Texture>()
  private tinted = new Map<string, Texture>()

  constructor() {
    const std = (p: ConstructorParameters<typeof MeshStandardMaterial>[0]) => new MeshStandardMaterial(p)
    const tex = (kind: PatternKind, color = true) => this.pattern(kind, color)
    this.m = {
      siding: std({ roughness: 0.84 }),
      sidingAccent: std({ roughness: 0.86 }),
      trim: std({ roughness: 0.62 }),
      roof: std({ roughness: 0.86, map: tex('roof'), bumpMap: tex('roof', false), bumpScale: 1.6 }),
      ridge: std({ roughness: 0.9 }),
      roofMetal: std({ roughness: 0.38, metalness: 0.55, map: tex('metal') }),
      foundation: std({ color: '#b3afa7', roughness: 0.96, map: tex('concrete') }),
      stone: std({ roughness: 0.93 }),
      chimney: std({ roughness: 0.92 }),
      frame: std({ roughness: 0.48 }),
      // Glass: a lighter slate base that picks up the sky in the environment map (not flat navy panels).
      glassLit: std({ color: '#55708d', map: tex('glass'), roughness: 0.05, metalness: 0.3, emissive: '#ffc982', emissiveIntensity: 0, envMapIntensity: 2.4 }),
      glassDim: std({ color: '#55708d', map: tex('glass'), roughness: 0.05, metalness: 0.3, emissive: '#ffbf73', emissiveIntensity: 0, envMapIntensity: 2.4 }),
      door: std({ roughness: 0.42 }),
      shutter: std({ roughness: 0.6, map: tex('louver') }),
      garageDoor: std({ roughness: 0.55 }),
      porchFloor: std({ roughness: 0.82 }),
      step: std({ color: '#c4bfb5', roughness: 0.93, map: tex('concrete') }),
      paving: std({ color: '#d6d1c7', roughness: 0.95, map: tex('paving') }),
      metal: std({ color: '#26292e', roughness: 0.42, metalness: 0.55 }),
      lamp: std({ color: '#efe9de', roughness: 0.35, emissive: '#ffd089', emissiveIntensity: 0 }),
      screen: std({ color: '#1b2128', roughness: 0.9, transparent: true, opacity: 0.55, depthWrite: false, side: DoubleSide }),
      lawn: std({ color: '#82a865', roughness: 1, map: tex('grass') }),
      plotEdge: std({ color: '#e6e1d7', roughness: 0.95 }),
      trunk: nearFade(std({ color: '#6a5747', roughness: 0.95 })),
      foliage: nearFade(std({ roughness: 0.86, vertexColors: true })),
      mulch: std({ color: '#5b4637', roughness: 1 }),
      blob: new MeshBasicMaterial({ map: textureFrom(patternCanvas('blob'), null), transparent: true, depthWrite: false, toneMapped: false }),
    }
    this.owned.push((this.m.blob as MeshBasicMaterial).map!)
    // Pattern textures that tile at real-world scale.
    const roof = this.m.roof as Std
    roof.map!.repeat.set(1 / TILE.roof[0], 1 / TILE.roof[1])
    roof.bumpMap!.repeat.copy(roof.map!.repeat)
    ;(this.m.roofMetal as Std).map!.repeat.set(1 / TILE.metal[0], 1)
    ;(this.m.foundation as Std).map!.repeat.set(1 / TILE.concrete[0], 1 / TILE.concrete[1])
    ;(this.m.step as Std).map!.repeat.set(1 / TILE.concrete[0], 1 / TILE.concrete[1])
    ;(this.m.paving as Std).map!.repeat.set(1 / TILE.paving[0], 1 / TILE.paving[1])
    ;(this.m.lawn as Std).map!.repeat.set(1 / TILE.grass[0], 1 / TILE.grass[1])
    const louver = (this.m.shutter as Std).map!
    louver.repeat.set(1, 1)
  }

  /** Cached per-set pattern textures (one per kind and colour space). */
  private pattern(kind: PatternKind, color = true): Texture {
    const key = `${kind}:${color ? 'c' : 'l'}`
    let t = this.patterns.get(key)
    if (!t) {
      t = textureFrom(patternCanvas(kind), null, color)
      this.patterns.set(key, t)
    }
    return t
  }

  private tint(kind: 'brick' | 'stone', hex: string): Texture {
    const key = `${kind}:${hex.toLowerCase()}`
    let t = this.tinted.get(key)
    if (t) {
      // Most recently used goes last.
      this.tinted.delete(key)
      this.tinted.set(key, t)
      return t
    }
    t = textureFrom(tintedCanvas(kind, hex), TILE[kind], true)
    this.tinted.set(key, t)
    // Keep a handful; a colour picker drag produces many intermediate colours. Never evict a texture in use.
    if (this.tinted.size > 8) {
      const inUse = new Set(Object.values(this.m).map((m) => (m as Std).map))
      for (const [k, tex] of this.tinted) {
        if (this.tinted.size <= 8) break
        if (k === key || inUse.has(tex)) continue
        tex.dispose()
        this.tinted.delete(k)
      }
    }
    return t
  }

  private setSidingLike(mat: Std, type: 'lap' | 'board-batten' | 'shingle' | 'brick', color: string) {
    // Shader programs only change when a texture slot goes from empty to filled.
    const hadMaps = !!mat.map && !!mat.bumpMap
    if (type === 'brick') {
      mat.map = this.tint('brick', color)
      mat.color.set('#ffffff')
      mat.bumpMap = this.pattern('brickBump', false)
      mat.bumpMap.repeat.set(1 / TILE.brick[0], 1 / TILE.brick[1])
      mat.bumpScale = 2.2
      mat.roughness = 0.9
    } else {
      const tile = TILE[type]
      mat.map = this.pattern(type)
      mat.map.repeat.set(1 / tile[0], 1 / tile[1])
      mat.bumpMap = this.pattern(type, false)
      mat.bumpMap.repeat.copy(mat.map.repeat)
      mat.bumpScale = type === 'shingle' ? 2.4 : 1.6
      mat.color.set(color)
      mat.roughness = type === 'shingle' ? 0.9 : 0.8
    }
    if (!hadMaps) mat.needsUpdate = true
  }

  private setStone(mat: Std, color: string) {
    const hadMaps = !!mat.map && !!mat.bumpMap
    mat.map = this.tint('stone', color)
    mat.color.set('#ffffff')
    mat.bumpMap = this.pattern('stoneBump', false)
    mat.bumpMap.repeat.set(1 / TILE.stone[0], 1 / TILE.stone[1])
    mat.bumpScale = 3
    if (!hadMaps) mat.needsUpdate = true
  }

  /** Apply the house colours and siding textures. */
  apply(cfg: HouseConfig, look: HouseLook) {
    const c = cfg.colors
    const m = this.m as Record<MatKey, Std>
    this.setSidingLike(m.siding, cfg.siding, c.siding)
    if (look.gableAccent && cfg.siding !== 'brick') this.setSidingLike(m.sidingAccent, look.gableAccent, c.siding)
    else this.setSidingLike(m.sidingAccent, cfg.siding, c.siding)
    m.trim.color.set(c.trim)
    m.roof.color.set(c.roof)
    // The shingle texture averages ~0.56 (linear), so this sits a shade darker than the roof around it.
    m.ridge.color.set(c.roof).multiplyScalar(0.48)
    m.roofMetal.color.set(new Color(c.roof).lerp(new Color('#ffffff'), 0.08))
    this.setStone(m.stone, c.stone)
    if (cfg.stoneBase) this.setStone(m.chimney, c.stone)
    else this.setSidingLike(m.chimney, 'brick', cfg.siding === 'brick' ? c.siding : '#8c4c3e')
    m.frame.color.set(c.windowFrame)
    m.door.color.set(c.door)
    m.shutter.color.set(c.shutters)
    m.garageDoor.color.set(look.garageDoorColor)
    m.porchFloor.color.set(look.porchFloor)
  }

  dispose() {
    for (const mat of Object.values(this.m)) mat.dispose()
    for (const t of this.patterns.values()) t.dispose()
    for (const t of this.tinted.values()) t.dispose()
    for (const t of this.owned) t.dispose()
    // Caches are kept: disposed textures re-upload transparently if this set is used again.
  }
}
