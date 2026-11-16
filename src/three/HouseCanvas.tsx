import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentRef, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react'
import { Canvas, useFrame, useThree, type RootState } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { HouseConfig, TimeOfDay } from '@/types'
import { cn } from '@/lib/cn'
import { buildScene, houseLook } from './engine/house'
import { buildMinimalSite, type Plot } from './engine/site'
import { MaterialSet, NO_SHADOW_KEYS, type MatKey } from './engine/materials'
import { newMood, sampleMood, TOD_INDEX } from './engine/lighting'
import { warmTextures } from './engine/textures'
import { getGlbUrl, subscribeGlb } from './glbStore'

/**
 * The heavy half of the 3D viewer (three.js + R3F). Loaded with React.lazy by Viewer3D only when a
 * viewer nears the viewport. Everything here is internal; pages use Viewer3D / View3DModal.
 */

export interface ViewPreset {
  /** Degrees around the house; 0 = straight at the front door, 90 = right side, 180 = back. */
  azimuth: number
  /** Degrees above the horizon. */
  elevation: number
  /** Multiplier on the "fit the house" distance (default 1). */
  distance?: number
}

export type ModelStatus = 'procedural' | 'loading' | 'custom' | 'fallback'

export interface HouseCanvasProps {
  config: HouseConfig
  customModelId?: string | null
  timeOfDay: TimeOfDay
  rotating: boolean
  interactive: boolean
  resetKey: number
  view: ViewPreset
  /** On screen: auto-rotation only runs while the viewer is visible. */
  active: boolean
  /** Fullscreen or inside a dialog: the mouse wheel zooms without clicking the viewer first. */
  immersive: boolean
  /** Fullscreen: every touch gesture drives the camera (otherwise vertical swipes scroll the page). */
  captureTouch: boolean
  reducedMotion: boolean
  /** Height (CSS px) of the overlay controls along the top edge; the house is framed clear of them. */
  frameInsetTop?: number
  ariaLabel: string
  onReady: () => void
  onInteract: () => void
  onContextLost: () => void
  onModelStatus: (status: ModelStatus) => void
  /** The wheel was turned over an embedded viewer that doesn't zoom on a plain wheel (show "Ctrl + scroll"). */
  onZoomHint?: () => void
}

type Controls = ComponentRef<typeof OrbitControls>

interface CameraApi {
  orbit: (dTheta: number, dPhi: number) => void
  zoom: (factor: number) => void
  reset: () => void
}

const AUTO_ROTATE_SPEED = 0.11 // rad/s (~57 s per turn)
const IDLE_MS = 6000
const MIN_POLAR = 0.22
const MAX_POLAR = Math.PI / 2 - 0.05
/**
 * The camera keeps at least this far (m) outside the house's bounding box: it never enters or clips the house,
 * and the closest zoom still frames a doorway with its surroundings rather than a patch of siding.
 */
const GUARD_MARGIN = 2.6

const SHADOWS = { type: THREE.PCFShadowMap, autoUpdate: false } as const
const GL = { antialias: true, alpha: true, powerPreference: 'high-performance', toneMapping: THREE.NeutralToneMapping } as const
const CAMERA = { fov: 32, near: 0.3, far: 600, position: [24, 12, 30] as [number, number, number] }
const RESIZE = { offsetSize: true, scroll: false, debounce: 0 } as const

/**
 * Warm-up for the first 3D view (called by Viewer3D's preloadViewer3D once this chunk has loaded):
 * draws the procedural textures while the browser is idle, so the first viewer only uploads them.
 */
export function warmViewer() {
  warmTextures()
}

/* ------------------------------------------------------------------ */

export default function HouseCanvas(props: HouseCanvasProps) {
  const [compiled, setCompiled] = useState(false)
  const apiRef = useRef<CameraApi | null>(null)
  const { interactive, onContextLost } = props

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const api = apiRef.current
    if (!api || !interactive || e.altKey || e.ctrlKey || e.metaKey) return
    const step = e.shiftKey ? 0.5 : 0.26
    switch (e.key) {
      case 'ArrowLeft':
        api.orbit(-step, 0)
        break
      case 'ArrowRight':
        api.orbit(step, 0)
        break
      case 'ArrowUp':
        api.orbit(0, -0.12)
        break
      case 'ArrowDown':
        api.orbit(0, 0.12)
        break
      case '+':
      case '=':
        api.zoom(0.84)
        break
      case '-':
      case '_':
        api.zoom(1.19)
        break
      case 'Home':
      case '0':
        api.reset()
        break
      default:
        return
    }
    e.preventDefault()
  }

  const onCreated = useCallback(
    (state: RootState) => {
      state.gl.domElement.addEventListener('webglcontextlost', (e) => {
        e.preventDefault()
        onContextLost()
      })
    },
    [onContextLost],
  )

  return (
    <div
      className={cn(
        // Focus ring: a two-tone inset ring drawn above the canvas, so it reads on the day sky and the night sky alike.
        "absolute inset-0 rounded-[inherit] outline-none after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] focus-visible:after:shadow-[inset_0_0_0_3px_var(--color-brand-600),inset_0_0_0_5px_rgb(255_255_255/0.85)]",
        !interactive && 'pointer-events-none',
      )}
      tabIndex={interactive ? 0 : -1}
      role={interactive ? 'application' : 'img'}
      aria-roledescription={interactive ? '3D viewer' : undefined}
      aria-label={interactive ? `${props.ariaLabel} Use the arrow keys to rotate and plus or minus to zoom.` : props.ariaLabel}
      onKeyDown={onKeyDown}
    >
      <Canvas frameloop={compiled ? 'demand' : 'never'} dpr={[1, 1.75]} shadows={SHADOWS} gl={GL} camera={CAMERA} resize={RESIZE} onCreated={onCreated}>
        <Scene {...props} compiled={compiled} onCompiled={() => setCompiled(true)} apiRef={apiRef} />
      </Canvas>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function shapeKeyOf(c: HouseConfig) {
  return JSON.stringify({ ...c, colors: null })
}

function disposeParts(parts: Map<MatKey, THREE.BufferGeometry>) {
  for (const g of parts.values()) g.dispose()
}

/**
 * Image-based lighting: a soft sky dome with a bright sun panel and a pale horizon. Windows reflect it,
 * so the horizon band is kept light (glass reads as glass by day instead of flat navy panels).
 */
function makeEnvironment(gl: THREE.WebGLRenderer) {
  const scene = new THREE.Scene()
  const geo = new THREE.SphereGeometry(50, 48, 24)
  const pos = geo.attributes.position
  const col = new Float32Array(pos.count * 3)
  const top = new THREE.Color('#8fb6e3')
  const mid = new THREE.Color('#f4f7fb')
  const low = new THREE.Color('#7d8a6c')
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 50
    if (y >= 0) c.copy(mid).lerp(top, Math.pow(y, 0.6))
    else c.copy(mid).lerp(low, Math.min(1, -y * 2.2))
    col[i * 3] = c.r
    col[i * 3 + 1] = c.g
    col[i * 3 + 2] = c.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })))
  const panel = (w: number, h: number, x: number, y: number, z: number, k: number, tint = 0.95) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k * 0.98, k * tint), side: THREE.DoubleSide }))
    m.position.set(x, y, z)
    m.lookAt(0, 0, 0)
    scene.add(m)
  }
  // Sun-side key light, a broad soft sky panel, and a dim distant tree line for the lower reflections.
  panel(14, 14, 22, 30, 20, 5, 0.92)
  panel(40, 6, -30, 8, -12, 1.4)
  panel(60, 10, 0, 14, 38, 1.15, 1)
  panel(70, 4, 0, -1.5, -42, 0.32, 0.9)
  const pmrem = new THREE.PMREMGenerator(gl)
  const rt = pmrem.fromScene(scene, 0.04)
  pmrem.dispose()
  scene.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) {
      m.geometry.dispose()
      ;(m.material as THREE.Material).dispose()
    }
  })
  return rt
}

/** Loads a staff-uploaded .glb for a home, if there is one. */
function useCustomModel(id: string | null | undefined, onStatus: (s: ModelStatus) => void) {
  const [model, setModel] = useState<{ object: THREE.Object3D; bounds: THREE.Box3 } | null>(null)
  const [version, setVersion] = useState(0)
  const statusRef = useRef(onStatus)
  statusRef.current = onStatus

  useEffect(() => (id ? subscribeGlb(id, () => setVersion((v) => v + 1)) : undefined), [id])

  useEffect(() => {
    if (!id) {
      setModel(null)
      statusRef.current('procedural')
      return
    }
    let cancelled = false
    let loaded: THREE.Object3D | null = null
    statusRef.current('loading')
    ;(async () => {
      try {
        const url = await getGlbUrl(id)
        if (!url) {
          if (!cancelled) {
            setModel(null)
            statusRef.current('procedural')
          }
          return
        }
        // The object URL is only needed while the file is read: revoke it as soon as loading settles,
        // also when the viewer unmounted in the meantime (it would otherwise pin a model of up to 50 MB).
        const { loadModel, disposeObject } = await import('./engine/gltf').catch((err: unknown) => {
          URL.revokeObjectURL(url)
          throw err
        })
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        const res = await loadModel(url).finally(() => URL.revokeObjectURL(url))
        if (cancelled) {
          disposeObject(res.object)
          return
        }
        loaded = res.object
        setModel(res)
        statusRef.current('custom')
      } catch {
        if (!cancelled) {
          setModel(null)
          statusRef.current('fallback')
        }
      }
    })()
    return () => {
      cancelled = true
      if (loaded) {
        const obj = loaded
        void import('./engine/gltf').then(({ disposeObject }) => disposeObject(obj))
      }
    }
  }, [id, version])
  return model
}

/* ------------------------------------------------------------------ */

function Scene(props: HouseCanvasProps & { compiled: boolean; onCompiled: () => void; apiRef: RefObject<CameraApi | null> }) {
  const { config, customModelId, compiled, onCompiled } = props
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)

  useLayoutEffect(() => {
    const rt = makeEnvironment(gl)
    scene.environment = rt.texture
    return () => {
      scene.environment = null
      rt.dispose()
    }
  }, [gl, scene])

  // Geometry follows the config (deferred so slider drags stay responsive); colours update in place.
  const deferred = useDeferredValue(config)
  const shapeKey = shapeKeyOf(deferred)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const build = useMemo(() => buildScene(deferred), [shapeKey])
  useEffect(() => () => disposeParts(build.parts), [build])

  const mats = useMemo(() => new MaterialSet(), [])
  useEffect(() => () => mats.dispose(), [mats])
  const colorKey = `${JSON.stringify(config.colors)}|${config.siding}|${config.style}|${config.stoneBase}`
  useLayoutEffect(() => {
    mats.apply(config, houseLook(config))
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorKey, mats])

  const custom = useCustomModel(customModelId, props.onModelStatus)
  const site = useMemo(() => (custom ? buildMinimalSite(custom.bounds) : null), [custom])
  useEffect(() => () => (site ? disposeParts(site.parts) : undefined), [site])

  const bounds = custom ? custom.bounds : build.bounds
  const plot = site ? site.plot : build.plot

  useEffect(() => {
    gl.shadowMap.needsUpdate = true
    invalidate()
  }, [build, custom, gl, invalidate])

  // Dev-only handle for automated visual checks (scripts poke materials / lights through it).
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as { __wh3d?: { gl: THREE.WebGLRenderer } & Record<string, unknown> }
    w.__wh3d = { gl, scene, camera, mats, invalidate, THREE, bounds }
    return () => {
      if (w.__wh3d?.gl === gl) delete w.__wh3d
    }
  }, [gl, scene, camera, mats, invalidate, bounds])

  // Compile shaders off the main thread before the first frame, then start rendering.
  useEffect(() => {
    let cancelled = false
    const done = () => {
      if (!cancelled) onCompiled()
    }
    gl.compileAsync(scene, camera).then(done, done)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (compiled) invalidate()
  }, [compiled, invalidate])

  return (
    <>
      <Lighting tod={props.timeOfDay} plot={plot} lights={custom ? null : build.lights} mats={mats} reducedMotion={props.reducedMotion} />
      {!custom && <Parts parts={build.parts} mats={mats} />}
      {custom && <primitive object={custom.object} />}
      {site && <Parts parts={site.parts} mats={mats} />}
      <CameraRig
        bounds={bounds}
        view={props.view}
        resetKey={props.resetKey}
        rotating={props.rotating}
        active={props.active}
        interactive={props.interactive}
        immersive={props.immersive}
        captureTouch={props.captureTouch}
        reducedMotion={props.reducedMotion}
        frameInsetTop={props.frameInsetTop ?? 0}
        onInteract={props.onInteract}
        onZoomHint={props.onZoomHint}
        apiRef={props.apiRef}
      />
      <ReadySignal enabled={compiled} onReady={props.onReady} />
    </>
  )
}

function Parts({ parts, mats }: { parts: Map<MatKey, THREE.BufferGeometry>; mats: MaterialSet }) {
  const entries = useMemo(() => [...parts.entries()], [parts])
  return (
    <>
      {entries.map(([k, g]) => (
        <mesh key={k} geometry={g} material={mats.m[k]} castShadow={!NO_SHADOW_KEYS.has(k)} receiveShadow={k !== 'blob'} renderOrder={k === 'blob' ? -1 : 0} />
      ))}
    </>
  )
}

function ReadySignal({ enabled, onReady }: { enabled: boolean; onReady: () => void }) {
  const done = useRef(false)
  useFrame(() => {
    if (!enabled || done.current) return
    done.current = true
    requestAnimationFrame(() => onReady())
  })
  return null
}

/* ------------------------------------------------------------------ */

function Lighting({ tod, plot, lights, mats, reducedMotion }: { tod: TimeOfDay; plot: Plot; lights: { door: THREE.Vector3 | null; garage: THREE.Vector3 | null } | null; mats: MaterialSet; reducedMotion: boolean }) {
  const sun = useRef<THREE.DirectionalLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const door = useRef<THREE.PointLight>(null)
  const garage = useRef<THREE.PointLight>(null)
  const target = useMemo(() => new THREE.Object3D(), [])
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const invalidate = useThree((s) => s.invalidate)
  const size = useThree((s) => s.size)
  const [mapSize] = useState(() => (Math.max(size.width, size.height) > 820 ? 2048 : 1024))
  const mood = useMemo(newMood, [])
  const cur = useRef(TOD_INDEX[tod])

  const apply = useCallback(
    (t: number) => {
      const s = sun.current
      const h = hemi.current
      if (!s || !h) return
      sampleMood(t, mood)
      s.position.copy(target.position).addScaledVector(mood.sunDir, 70)
      s.color.copy(mood.sunColor)
      s.intensity = mood.sun
      h.color.copy(mood.sky)
      h.groundColor.copy(mood.ground)
      h.intensity = mood.hemi
      scene.environmentIntensity = mood.env
      ;(mats.m.glassLit as THREE.MeshStandardMaterial).emissiveIntensity = mood.glassLit
      ;(mats.m.glassDim as THREE.MeshStandardMaterial).emissiveIntensity = mood.glassDim
      ;(mats.m.lamp as THREE.MeshStandardMaterial).emissiveIntensity = mood.lamp
      if (door.current) door.current.intensity = lights?.door ? mood.point * 1.6 : 0
      if (garage.current) garage.current.intensity = lights?.garage ? mood.point * 0.75 : 0
      gl.toneMappingExposure = mood.exposure
      gl.shadowMap.needsUpdate = true
    },
    [gl, lights, mats, mood, scene, target],
  )

  useLayoutEffect(() => {
    target.position.set(plot.cx, 0, plot.cz)
    target.updateMatrixWorld()
    const s = sun.current
    if (s) {
      const cam = s.shadow.camera
      const r = plot.radius + 1.5
      cam.left = -r
      cam.right = r
      cam.top = r
      cam.bottom = -r
      cam.near = 20
      cam.far = 130
      cam.updateProjectionMatrix()
    }
    if (lights?.door) door.current?.position.copy(lights.door)
    if (lights?.garage) garage.current?.position.copy(lights.garage)
    apply(cur.current)
    invalidate()
  }, [plot, lights, apply, invalidate, target])

  useEffect(() => invalidate(), [tod, invalidate])

  useFrame((_, delta) => {
    const goal = TOD_INDEX[tod]
    if (cur.current === goal) return
    const step = reducedMotion ? 10 : Math.min(delta, 0.05) * 1.25
    cur.current = goal > cur.current ? Math.min(goal, cur.current + step) : Math.max(goal, cur.current - step)
    apply(cur.current)
    invalidate()
  })

  return (
    <>
      <hemisphereLight ref={hemi} />
      <directionalLight ref={sun} target={target} castShadow shadow-mapSize={[mapSize, mapSize]} shadow-bias={-0.0005} shadow-normalBias={0.04} shadow-radius={2} />
      <primitive object={target} />
      <pointLight ref={door} distance={12} decay={2} color="#ffcd8f" intensity={0} />
      <pointLight ref={garage} distance={9} decay={2} color="#ffcd8f" intensity={0} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Camera                                                               */
/* ------------------------------------------------------------------ */

interface Pose {
  theta: number
  phi: number
  radius: number
  target: THREE.Vector3
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clampPhi = (phi: number) => Math.min(MAX_POLAR, Math.max(MIN_POLAR, phi))

/** Distance along the unit vector `dir` from `origin` at which a ray leaves `box` (0 when it never crosses it). */
function exitDistance(box: THREE.Box3, origin: THREE.Vector3, dir: THREE.Vector3) {
  let near = -Infinity
  let far = Infinity
  for (const k of ['x', 'y', 'z'] as const) {
    const o = origin[k]
    const d = dir[k]
    if (Math.abs(d) < 1e-9) {
      if (o < box.min[k] || o > box.max[k]) return 0
      continue
    }
    let t0 = (box.min[k] - o) / d
    let t1 = (box.max[k] - o) / d
    if (t0 > t1) [t0, t1] = [t1, t0]
    near = Math.max(near, t0)
    far = Math.min(far, t1)
    if (near > far) return 0
  }
  return Math.max(0, far)
}

/**
 * Home framing for a house: orbit target, starting pose and zoom limits.
 * The house is fitted with its bounding sphere (rotation-proof). When overlay controls cover the top
 * `insetTop` px, the picture is shifted down by half of that (see CameraRig's view offset) and pulled
 * back if needed so the house's box clears them at every azimuth of the auto-rotation.
 */
function computeHome(bounds: THREE.Box3, view: ViewPreset, aspect: number, fovDeg: number, insetTop: number, heightPx: number) {
  const centre = bounds.getCenter(new THREE.Vector3())
  const size = bounds.getSize(new THREE.Vector3())
  const target = new THREE.Vector3(centre.x, Math.max(2.2, size.y * 0.36), centre.z)
  const radius = 0.5 * Math.sqrt(size.x * size.x + size.y * size.y * 0.8 + size.z * size.z)
  const vfov = (fovDeg * Math.PI) / 180
  const tanV = Math.tan(vfov / 2)
  const hfov = 2 * Math.atan(tanV * aspect)
  const fit = radius / Math.sin(Math.min(vfov, hfov) / 2)
  const theta = (view.azimuth * Math.PI) / 180
  const phi = clampPhi(Math.PI / 2 - (view.elevation * Math.PI) / 180)

  let band = 0
  if (insetTop > 0 && heightPx > 0) {
    // Fraction of the half-height left for the house once the top inset (and a small pad) is taken off.
    const aV = tanV * Math.max(0.35, (heightPx - insetTop - 16) / heightPx)
    const corners: THREE.Vector3[] = []
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) corners.push(new THREE.Vector3(x, y, z).sub(target))
    const sp = Math.sin(phi)
    const cp = Math.cos(phi)
    for (let k = 0; k < 16; k++) {
      const th = theta + (k * Math.PI) / 8
      const st = Math.sin(th)
      const ct = Math.cos(th)
      for (const c of corners) {
        const toward = c.y * cp + sp * (c.x * st + c.z * ct)
        const up = c.y * sp - cp * (c.x * st + c.z * ct)
        band = Math.max(band, toward + Math.abs(up) / aV)
      }
    }
  }
  const dist = Math.max(fit * 0.95, band) * (view.distance ?? 1)
  const pose: Pose = { theta, phi, radius: dist, target }
  return { pose, minD: Math.max(5, radius * 0.6), maxD: Math.max(fit * 1.9, band * 1.4) }
}

function CameraRig(props: {
  bounds: THREE.Box3
  view: ViewPreset
  resetKey: number
  rotating: boolean
  active: boolean
  interactive: boolean
  immersive: boolean
  captureTouch: boolean
  reducedMotion: boolean
  frameInsetTop: number
  onInteract: () => void
  onZoomHint?: () => void
  apiRef: RefObject<CameraApi | null>
}) {
  const { bounds, view, resetKey, rotating, active, interactive, immersive, captureTouch, reducedMotion, frameInsetTop, onInteract, apiRef } = props
  const controls = useRef<Controls>(null)
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  const aspect = size.width / Math.max(1, size.height)
  const home = useMemo(() => computeHome(bounds, view, aspect, camera.fov, frameInsetTop, size.height), [bounds, view, aspect, camera.fov, frameInsetTop, size.height])
  const homeRef = useRef(home)
  homeRef.current = home
  const guard = useMemo(() => bounds.clone().expandByScalar(GUARD_MARGIN), [bounds])
  const guardRef = useRef(guard)
  guardRef.current = guard
  const st = useRef({
    inited: false,
    touched: false,
    interacting: false,
    last: -1e9,
    anim: null as null | { from: Pose; to: Pose; t0: number; dur: number },
    wake: 0 as ReturnType<typeof setTimeout> | 0,
    /** The zoom the user asked for, and the distance last applied (the guard may hold the camera further out). */
    desired: NaN,
    applied: NaN,
  })
  const [zoomArmed, setZoomArmed] = useState(false)
  const interactRef = useRef(onInteract)
  interactRef.current = onInteract
  const zoomHintRef = useRef(props.onZoomHint)
  zoomHintRef.current = props.onZoomHint

  // Shift the picture down by half the top inset so the house sits centred in the area the controls leave free.
  const shiftPx = Math.round(frameInsetTop / 2)
  useLayoutEffect(() => {
    if (shiftPx > 0 && size.width > 0 && size.height > 0) camera.setViewOffset(size.width, size.height, 0, -shiftPx, size.width, size.height)
    else if (camera.view?.enabled) camera.clearViewOffset()
    invalidate()
  }, [camera, size.width, size.height, shiftPx, invalidate])
  useEffect(() => () => camera.clearViewOffset(), [camera])

  const current = useCallback((): Pose => {
    const target = controls.current ? controls.current.target.clone() : homeRef.current.pose.target.clone()
    const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(target))
    return { theta: sph.theta, phi: sph.phi, radius: sph.radius, target }
  }, [camera])

  const place = useCallback(
    (p: Pose) => {
      const c = controls.current
      const off = new THREE.Vector3().setFromSpherical(new THREE.Spherical(p.radius, p.phi, p.theta))
      camera.position.copy(p.target).add(off)
      if (c) c.target.copy(p.target)
      camera.lookAt(p.target)
    },
    [camera],
  )

  /**
   * Keeps the camera outside the house (its bounding box plus a margin) at every angle and zoom, whatever
   * moved it (drag, wheel, pinch, keys, animation, auto-rotation). The guard only lengthens the orbit radius,
   * and the zoom the user chose is remembered, so the camera glides back in once it orbits past the obstacle.
   */
  const scratch = useMemo(() => new THREE.Vector3(), [])
  const constrain = useCallback(() => {
    const s = st.current
    const target = controls.current ? controls.current.target : homeRef.current.pose.target
    const off = scratch.copy(camera.position).sub(target)
    const r = off.length()
    if (r < 1e-6) return
    // Anything that changed the distance since the last frame is a zoom: take it as the new wish.
    if (!(Math.abs(r - s.applied) <= 1e-4 * r)) s.desired = r
    off.divideScalar(r)
    const h = homeRef.current
    const need = exitDistance(guardRef.current, target, off)
    const rr = Math.min(Math.max(h.maxD, need), Math.max(h.minD, s.desired, need))
    s.applied = rr
    if (Math.abs(rr - r) > 1e-5) {
      camera.position.copy(target).addScaledVector(off, rr)
      camera.lookAt(target)
    }
  }, [camera, scratch])

  const animateTo = useCallback(
    (to: Pose, dur: number) => {
      const from = current()
      st.current.anim = { from, to, t0: performance.now(), dur: reducedMotion ? 1 : dur }
      invalidate()
    },
    [current, invalidate, reducedMotion],
  )

  const wakeLater = useCallback(() => {
    if (st.current.wake) clearTimeout(st.current.wake)
    st.current.wake = setTimeout(() => invalidate(), IDLE_MS + 60)
  }, [invalidate])

  const markInteract = useCallback(() => {
    st.current.touched = true
    st.current.last = performance.now()
    wakeLater()
    interactRef.current()
  }, [wakeLater])

  // First placement; later bounds/size changes keep the user's angle and ease to the new framing.
  const viewKey = `${view.azimuth}|${view.elevation}|${view.distance ?? 1}`
  const prevView = useRef(viewKey)
  useLayoutEffect(() => {
    const s = st.current
    if (!s.inited) {
      place(home.pose)
      s.inited = true
      prevView.current = viewKey
      invalidate()
      return
    }
    if (prevView.current !== viewKey) {
      prevView.current = viewKey
      s.touched = false
      animateTo(home.pose, 900)
      return
    }
    // Keep the angle the camera is at (or heading to, if a move is in flight); re-frame the new house.
    const base = s.anim ? s.anim.to : current()
    const radius = s.touched ? Math.min(home.maxD, Math.max(home.minD, base.radius)) : home.pose.radius
    animateTo({ theta: base.theta, phi: base.phi, radius, target: home.pose.target }, 650)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home])

  useEffect(() => {
    if (resetKey === 0) return
    st.current.touched = false
    st.current.last = -1e9
    animateTo(homeRef.current.pose, 900)
  }, [resetKey, animateTo])

  useEffect(() => {
    if (rotating && active) invalidate()
  }, [rotating, active, invalidate])

  useEffect(
    () => () => {
      if (st.current.wake) clearTimeout(st.current.wake)
    },
    [],
  )

  // Keyboard API for the focusable viewer.
  useEffect(() => {
    apiRef.current = {
      orbit: (dTheta, dPhi) => {
        const cur = current()
        const base = st.current.anim ? st.current.anim.to : cur
        animateTo({ theta: base.theta + dTheta, phi: clampPhi(base.phi + dPhi), radius: base.radius, target: base.target }, 320)
        markInteract()
      },
      zoom: (f) => {
        const cur = current()
        const base = st.current.anim ? st.current.anim.to : cur
        const h = homeRef.current
        animateTo({ ...base, radius: Math.min(h.maxD, Math.max(h.minD, base.radius * f)) }, 280)
        markInteract()
      },
      reset: () => {
        st.current.touched = false
        st.current.last = -1e9
        animateTo(homeRef.current.pose, 900)
      },
    }
    return () => {
      apiRef.current = null
    }
  }, [apiRef, animateTo, current, markInteract])

  // Wheel zoom only after the user engages with an embedded viewer (no scroll-jacking);
  // Ctrl/⌘ + wheel and trackpad pinch always zoom. A plain wheel over the viewer asks for the hint.
  useEffect(() => {
    const el = gl.domElement
    const arm = () => setZoomArmed(true)
    const disarm = () => setZoomArmed(false)
    const onWheel = (e: WheelEvent) => {
      const c = controls.current
      if (!c || c.enableZoom || !interactive) return
      if (!(e.ctrlKey || e.metaKey)) {
        zoomHintRef.current?.()
        return
      }
      e.preventDefault()
      const cur = current()
      const h = homeRef.current
      place({ ...cur, radius: Math.min(h.maxD, Math.max(h.minD, cur.radius * (e.deltaY > 0 ? 1.06 : 0.94))) })
      st.current.anim = null
      markInteract()
      invalidate()
    }
    el.addEventListener('pointerdown', arm)
    el.addEventListener('pointerleave', disarm)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', arm)
      el.removeEventListener('pointerleave', disarm)
      el.removeEventListener('wheel', onWheel)
    }
  }, [gl, interactive, current, place, markInteract, invalidate])

  // Let vertical swipes scroll the page on embedded viewers (horizontal drags still rotate).
  // OrbitControls attaches to R3F's event source (the canvas wrapper) and forces touch-action: none
  // there whenever it (re)connects, so this runs after it, on the same element.
  const eventSource = useThree((s) => s.events.connected) as HTMLElement | undefined
  useEffect(() => {
    const el = (controls.current?.domElement as HTMLElement | undefined) ?? eventSource ?? gl.domElement
    const value = !interactive ? 'auto' : captureTouch ? 'none' : 'pan-y'
    el.style.touchAction = value
    gl.domElement.style.touchAction = value
  }, [gl, eventSource, interactive, captureTouch])

  // Embedded viewers on touch screens: the few pointer moves the browser delivers before it takes a vertical
  // swipe over as a page scroll must not tilt the house. The camera's elevation is held until the gesture
  // proves horizontal (then it orbits freely); a vertical swipe ends with the tilt and its momentum dropped.
  useEffect(() => {
    const el = (controls.current?.domElement as HTMLElement | undefined) ?? eventSource
    if (!el || !interactive || captureTouch) return
    let g: { id: number; x: number; y: number; mode: 'pending' | 'free' | 'scroll' } | null = null
    const hold = () => {
      const c = controls.current
      if (!c) return
      const phi = c.getPolarAngle()
      c.minPolarAngle = phi
      c.maxPolarAngle = phi
    }
    const release = () => {
      const c = controls.current
      if (!c) return
      c.setPolarAngle(c.getPolarAngle()) // drops any tilt momentum gathered while held
      c.minPolarAngle = MIN_POLAR
      c.maxPolarAngle = MAX_POLAR
    }
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' || g) return
      g = { id: e.pointerId, x: e.clientX, y: e.clientY, mode: 'pending' }
      hold()
    }
    const move = (e: PointerEvent) => {
      if (!g || e.pointerId !== g.id || g.mode !== 'pending') return
      const dx = e.clientX - g.x
      const dy = e.clientY - g.y
      if (Math.hypot(dx, dy) < 9) return
      if (Math.abs(dx) > Math.abs(dy)) {
        g.mode = 'free'
        release()
      } else g.mode = 'scroll'
    }
    const end = (e: PointerEvent) => {
      if (!g || e.pointerId !== g.id) return
      const held = g.mode !== 'free'
      g = null
      if (held) release()
    }
    el.addEventListener('pointerdown', down, true)
    window.addEventListener('pointermove', move, true)
    window.addEventListener('pointerup', end, true)
    window.addEventListener('pointercancel', end, true)
    return () => {
      el.removeEventListener('pointerdown', down, true)
      window.removeEventListener('pointermove', move, true)
      window.removeEventListener('pointerup', end, true)
      window.removeEventListener('pointercancel', end, true)
      if (g && g.mode !== 'free') release()
    }
  }, [eventSource, interactive, captureTouch])

  useFrame((_, delta) => {
    const c = controls.current
    if (!c) return
    const s = st.current
    if (s.anim) {
      const k = Math.min(1, (performance.now() - s.anim.t0) / s.anim.dur)
      const e = easeInOut(k)
      const { from, to } = s.anim
      let dTheta = to.theta - from.theta
      dTheta = ((((dTheta + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI
      place({
        theta: from.theta + dTheta * e,
        phi: from.phi + (to.phi - from.phi) * e,
        radius: from.radius + (to.radius - from.radius) * e,
        target: from.target.clone().lerp(to.target, e),
      })
      if (k >= 1) s.anim = null
      constrain()
      invalidate()
      return
    }
    const idle = performance.now() - s.last > IDLE_MS
    if (rotating && !reducedMotion && active && !s.interacting && idle) {
      const off = camera.position.clone().sub(c.target)
      off.applyAxisAngle(THREE.Object3D.DEFAULT_UP, AUTO_ROTATE_SPEED * Math.min(delta, 0.05))
      camera.position.copy(c.target).add(off)
      camera.lookAt(c.target)
      invalidate()
    }
    constrain()
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={interactive}
      enableDamping
      dampingFactor={0.085}
      // OrbitControls scales drags by the canvas height: ease off on short (phone-sized) viewers so a swipe
      // across a 270 px viewer turns the house about as far as the same gesture on a desktop one.
      rotateSpeed={0.6 * Math.min(1, Math.max(0.6, size.height / 520))}
      zoomSpeed={0.75}
      enablePan={false}
      enableZoom={interactive && (immersive || zoomArmed)}
      minDistance={home.minD}
      maxDistance={home.maxD}
      minPolarAngle={MIN_POLAR}
      maxPolarAngle={MAX_POLAR}
      onStart={() => {
        st.current.interacting = true
        st.current.anim = null
        markInteract()
      }}
      onEnd={() => {
        st.current.interacting = false
        st.current.last = performance.now()
        wakeLater()
      }}
    />
  )
}
