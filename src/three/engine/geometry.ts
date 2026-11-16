import { BoxGeometry, BufferGeometry, Color, CylinderGeometry, Float32BufferAttribute, IcosahedronGeometry, Matrix4, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Low-level geometry helpers for the procedural house. Everything is built directly in "house space"
 * (metres, Y up, front facade facing +Z) and merged into one mesh per material, so a whole house
 * renders in ~20 draw calls.
 */

export const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z)

const EPS = 1e-4

/** Axis-aligned box between two corners (any order). Returns null for degenerate boxes. */
export function boxMM(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): BufferGeometry | null {
  const sx = Math.abs(x1 - x0)
  const sy = Math.abs(y1 - y0)
  const sz = Math.abs(z1 - z0)
  if (sx < EPS || sy < EPS || sz < EPS) return null
  const g = new BoxGeometry(sx, sy, sz)
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  return g
}

/** Box oriented along the segment a→b with the given cross-section (width is horizontal where possible). */
export function beam(a: Vector3, b: Vector3, width: number, height: number): BufferGeometry | null {
  const dir = new Vector3().subVectors(b, a)
  const len = dir.length()
  if (len < EPS) return null
  dir.divideScalar(len)
  const up = Math.abs(dir.y) > 0.98 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0)
  const zAxis = new Vector3().crossVectors(dir, up).normalize()
  const yAxis = new Vector3().crossVectors(zAxis, dir).normalize()
  const m = new Matrix4().makeBasis(dir, yAxis, zAxis)
  m.setPosition(new Vector3().addVectors(a, b).multiplyScalar(0.5))
  const g = new BoxGeometry(len, height, width)
  g.applyMatrix4(m)
  return g
}

/** Vertical cylinder / cone frustum. */
export function cylinder(x: number, z: number, y0: number, y1: number, rTop: number, rBottom: number, segments = 14): BufferGeometry | null {
  if (y1 - y0 < EPS) return null
  const g = new CylinderGeometry(rTop, rBottom, y1 - y0, segments, 1, false)
  g.translate(x, (y0 + y1) / 2, z)
  return g
}

function newellNormal(poly: Vector3[], out: Vector3): Vector3 {
  out.set(0, 0, 0)
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    out.x += (a.y - b.y) * (a.z + b.z)
    out.y += (a.z - b.z) * (a.x + b.x)
    out.z += (a.x - b.x) * (a.y + b.y)
  }
  return out
}

function pushTri(out: number[], a: Vector3, b: Vector3, c: Vector3) {
  // Skip slivers so flat normals never become NaN.
  const ab = new Vector3().subVectors(b, a)
  const ac = new Vector3().subVectors(c, a)
  if (ab.cross(ac).lengthSq() < 1e-12) return
  out.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
}

function finish(pos: number[]): BufferGeometry {
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  g.setAttribute('uv', new Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2))
  return g
}

/**
 * Convex solid from a list of convex planar faces (any winding). Each face is oriented so its
 * normal points away from the solid's centroid, then fan-triangulated with flat normals.
 */
export function solid(faces: Vector3[][], center?: Vector3): BufferGeometry {
  const c = center ?? (() => {
    const acc = new Vector3()
    let n = 0
    for (const f of faces) for (const p of f) {
      acc.add(p)
      n++
    }
    return acc.divideScalar(Math.max(1, n))
  })()
  const pos: number[] = []
  const nrm = new Vector3()
  const fc = new Vector3()
  for (const face of faces) {
    if (face.length < 3) continue
    newellNormal(face, nrm)
    if (nrm.lengthSq() < 1e-12) continue
    fc.set(0, 0, 0)
    for (const p of face) fc.add(p)
    fc.divideScalar(face.length)
    const outward = fc.sub(c).dot(nrm) >= 0
    const pts = outward ? face : [...face].reverse()
    for (let i = 1; i < pts.length - 1; i++) pushTri(pos, pts[0], pts[i], pts[i + 1])
  }
  return finish(pos)
}

/** Prism / frustum between two polygons with matching vertex order (e.g. a gable pentagon swept along X). */
export function prismBetween(a: Vector3[], b: Vector3[]): BufferGeometry {
  const faces: Vector3[][] = [a, b]
  for (let i = 0; i < a.length; i++) {
    const j = (i + 1) % a.length
    faces.push([a[i], a[j], b[j], b[i]])
  }
  return solid(faces)
}

/** Sweep a polygon given in (s, y) pairs along an axis between two coordinates. */
export function sweep(axis: 'x' | 'z', poly: [number, number][], from: number, to: number): BufferGeometry {
  const at = (c: number) => poly.map(([s, y]) => (axis === 'x' ? new Vector3(c, y, s) : new Vector3(s, y, c)))
  return prismBetween(at(from), at(to))
}

/** Single planar polygon (one-sided, facing `facing` when given, otherwise up) with flat normals. */
export function planarFace(poly: Vector3[], facing?: Vector3): BufferGeometry {
  const n = newellNormal(poly, new Vector3())
  const want = facing ?? new Vector3(0, 1, 0)
  const pts = n.dot(want) >= 0 ? poly : [...poly].reverse()
  const pos: number[] = []
  for (let i = 1; i < pts.length - 1; i++) pushTri(pos, pts[0], pts[i], pts[i + 1])
  return finish(pos)
}

/**
 * Roof slab: `top` is the convex top surface polygon; the slab is extruded straight down by `t`
 * so eave and rake edges are plumb (they read as fascia and rake boards).
 * Returns the top surface (roofing material, with UVs along the eave / up the slope) and the rest
 * (soffit + fascia, trim material).
 */
export function slab(top: Vector3[], t: number): { top: BufferGeometry; under: BufferGeometry } {
  const bottom = top.map((p) => new Vector3(p.x, p.y - t, p.z))
  const center = new Vector3()
  for (const p of top) center.add(p)
  for (const p of bottom) center.add(p)
  center.divideScalar(top.length * 2)
  const faces: Vector3[][] = [bottom]
  for (let i = 0; i < top.length; i++) {
    const j = (i + 1) % top.length
    faces.push([top[i], top[j], bottom[j], bottom[i]])
  }
  return { top: roofSurface(top), under: solid(faces, center) }
}

/** Top surface of a roof plane with UVs in metres: u along the eave, v up the slope (rows stay level across planes). */
export function roofSurface(poly: Vector3[]): BufferGeometry {
  const g = planarFace(poly)
  const n = newellNormal(poly, new Vector3()).normalize()
  if (n.y < 0) n.negate()
  const sinSlope = Math.sqrt(Math.max(0, 1 - n.y * n.y))
  let e1 = new Vector3(n.z, 0, -n.x)
  if (e1.lengthSq() < 1e-8) e1 = new Vector3(1, 0, 0)
  e1.normalize()
  const e2 = new Vector3().crossVectors(n, e1).normalize()
  const p = g.attributes.position
  const uv = new Float32Array(p.count * 2)
  const tmp = new Vector3()
  for (let i = 0; i < p.count; i++) {
    tmp.fromBufferAttribute(p, i)
    uv[i * 2] = tmp.dot(e1)
    uv[i * 2 + 1] = sinSlope > 0.05 ? tmp.y / sinSlope : tmp.dot(e2)
  }
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  return g
}

/** Planar UVs in metres chosen per vertex from its normal (walls: u horizontal, v = height). */
export function applyWorldUV(g: BufferGeometry) {
  const p = g.attributes.position
  const n = g.attributes.normal
  const uv = new Float32Array(p.count * 2)
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i))
    const ny = Math.abs(n.getY(i))
    const nz = Math.abs(n.getZ(i))
    let u: number
    let v: number
    if (ny > nx && ny > nz) {
      u = p.getX(i)
      v = p.getZ(i)
    } else if (nx > nz) {
      u = p.getZ(i)
      v = p.getY(i)
    } else {
      u = p.getX(i)
      v = p.getY(i)
    }
    uv[i * 2] = u
    uv[i * 2 + 1] = v
  }
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
}

function normalizeGeometry(g: BufferGeometry, keepColor: boolean): BufferGeometry {
  let geo = g
  if (geo.index) {
    geo = g.toNonIndexed()
    g.dispose()
  }
  for (const name of Object.keys(geo.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv' && !(keepColor && name === 'color')) geo.deleteAttribute(name)
  }
  if (!geo.attributes.normal) geo.computeVertexNormals()
  if (!geo.attributes.uv) geo.setAttribute('uv', new Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2))
  geo.clearGroups()
  return geo
}

/** Collects geometries per material key and merges them into one geometry per key. */
export class Bucket<K extends string> {
  private parts = new Map<K, BufferGeometry[]>()
  constructor(
    private worldUvKeys: ReadonlySet<K>,
    private colorKeys: ReadonlySet<K> = new Set(),
  ) {}

  add(key: K, g: BufferGeometry | null | undefined) {
    if (!g) return
    const list = this.parts.get(key)
    if (list) list.push(g)
    else this.parts.set(key, [g])
  }

  build(): Map<K, BufferGeometry> {
    const out = new Map<K, BufferGeometry>()
    for (const [key, list] of this.parts) {
      const keepColor = this.colorKeys.has(key)
      const norm = list.map((g) => normalizeGeometry(g, keepColor))
      if (this.worldUvKeys.has(key)) norm.forEach(applyWorldUV)
      const merged = norm.length === 1 ? norm[0] : mergeGeometries(norm, false)
      if (norm.length > 1) norm.forEach((g) => g.dispose())
      if (!merged) continue
      merged.computeBoundingBox()
      merged.computeBoundingSphere()
      out.set(key, merged)
    }
    this.parts.clear()
    return out
  }
}

/** Give every vertex the same colour (for vertex-coloured foliage). */
export function coloured<T extends BufferGeometry>(g: T, hex: string | Color): T {
  const c = typeof hex === 'string' ? new Color(hex) : hex
  const n = g.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r
    arr[i * 3 + 1] = c.g
    arr[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new Float32BufferAttribute(arr, 3))
  return g
}

/** Low-poly blob (shrub, flower, canopy puff) with a vertex colour. */
export function blobGeo(x: number, y: number, z: number, r: number, color: string | Color, detail = 0, sy = 1) {
  const g = new IcosahedronGeometry(r, detail)
  g.scale(1, sy, 1)
  g.translate(x, y, z)
  return coloured(g, color)
}

/** Small deterministic PRNG so landscaping does not jump around between rebuilds. */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
