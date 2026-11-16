import { Component, lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type ErrorInfo, type KeyboardEvent, type ReactNode } from 'react'
import { Box, Maximize2, Minimize2, MonitorX, Moon, Mouse, Move3d, Pause, Play, RefreshCw, RotateCcw, Sun, Sunset } from 'lucide-react'
import type { HouseConfig, TimeOfDay } from '@/types'
import { cn } from '@/lib/cn'
import { SKY, STARS, TIME_OPTIONS } from './sky'
import type { ModelStatus, ViewPreset } from './HouseCanvas'

/**
 * PUBLIC API of the 3D viewer. Pages import only this component (and View3DModal / View3DButton).
 * This file stays light: three.js and the procedural house engine live in ./HouseCanvas, which is
 * lazy-loaded only when a viewer nears the viewport (or immediately with `eager`).
 */
export interface Viewer3DProps {
  /** Procedural house parameters (see src/types.ts → HouseConfig). */
  config: HouseConfig
  /** When set and a custom .glb was uploaded for this home id (see glbStore), render that model instead. */
  customModelId?: string | null
  /** Rotate slowly when idle. Default true (off when the user prefers reduced motion). */
  autoRotate?: boolean
  /** Controlled time of day. */
  timeOfDay?: TimeOfDay
  onTimeOfDayChange?: (t: TimeOfDay) => void
  /** Overlay controls (rotate toggle, day/dusk/night, reset view, fullscreen). Default true. */
  showControls?: boolean
  /** Allow orbit/zoom with mouse/touch/keyboard. Default true. */
  interactive?: boolean
  /** Size the viewer with classes on the wrapper, e.g. "aspect-[16/10] w-full" or "h-[520px]". */
  className?: string
  ariaLabel?: string
  /** Load immediately instead of when scrolled into view. */
  eager?: boolean
  /** Optional starting camera angle (degrees). Reset view returns here. Default: a three-quarter front view. */
  initialView?: ViewPreset
}

export type { ViewPreset }

const loadCanvas = () => import('./HouseCanvas')
const HouseCanvas = lazy(loadCanvas)

let preloading: Promise<void> | null = null

/**
 * Start downloading the 3D engine ahead of time and prepare its textures while the browser is idle, so the
 * first viewer appears quickly. Safe to call any number of times. Call it when a page with a viewer below
 * the fold has settled (e.g. in requestIdleCallback after mount) and on hover / focus of anything that leads
 * to a viewer ("Explore homes in 3D", "View in 3D"). Viewers also call it on their own once they come
 * within about two screens of the viewport.
 */
export function preloadViewer3D() {
  if (preloading || typeof window === 'undefined') return
  preloading = loadCanvas().then(
    (m) => m.warmViewer(),
    () => {
      preloading = null // allow a retry (e.g. after a network hiccup)
    },
  )
}

/** "⌘" on Apple keyboards, "Ctrl" elsewhere (the viewer accepts both). */
const zoomKey = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent) ? '⌘' : 'Ctrl'

const DEFAULT_VIEW: ViewPreset = { azimuth: 32, elevation: 17 }
const TIME_ICONS = { day: Sun, dusk: Sunset, night: Moon } as const

/* ---------------- environment checks ---------------- */

let webgl2: boolean | null = null
function hasWebGL2(): boolean {
  if (webgl2 !== null) return webgl2
  try {
    const c = document.createElement('canvas')
    const ctx = c.getContext('webgl2')
    webgl2 = !!ctx
    ctx?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    webgl2 = false
  }
  return webgl2
}

function useMedia(query: string) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches)
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const h = () => setMatch(mq.matches)
    h()
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [query])
  return match
}

/**
 * Touch or mouse, for the gesture hint: phones and tablets report (hover: none); on hybrid laptops the
 * pointer the visitor used last decides (a touch while scrolling the page is enough).
 */
function useTouchInput() {
  const noHover = useMedia('(hover: none)')
  const [last, setLast] = useState<'touch' | 'mouse' | null>(null)
  useEffect(() => {
    const on = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.pointerType === 'mouse') setLast(e.pointerType)
    }
    window.addEventListener('pointerdown', on, { capture: true, passive: true })
    return () => window.removeEventListener('pointerdown', on, { capture: true })
  }, [])
  return last ? last === 'touch' : noHover
}

/*
 * Browsers cap live WebGL contexts (~16). Each viewer registers while its canvas is mounted; when
 * more than MAX_LIVE are alive, the longest-hidden off-screen viewers release theirs and remount
 * when scrolled back into view.
 */
const MAX_LIVE = 6
const live = new Map<number, { visible: boolean; seen: number; evict: () => void }>()
let nextId = 1
function touchLive(id: number, visible: boolean, evict: () => void) {
  const prev = live.get(id)
  live.set(id, { visible, seen: visible ? performance.now() : (prev?.seen ?? performance.now()), evict })
  if (live.size <= MAX_LIVE) return
  const victims = [...live.entries()].filter(([k, v]) => k !== id && !v.visible).sort((a, b) => a[1].seen - b[1].seen)
  while (live.size > MAX_LIVE && victims.length) {
    const [k, v] = victims.shift()!
    live.delete(k)
    v.evict()
  }
}

/* ---------------- error boundary ---------------- */

class ViewerBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('3D viewer failed to load', error, info.componentStack)
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/* ---------------- small UI pieces ---------------- */

const glass = 'bg-white/90 text-ink-800 shadow-sm ring-1 ring-black/5 backdrop-blur-md'

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex size-10 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-900/[0.06] hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600 [&_svg]:size-[18px]"
    >
      {children}
    </button>
  )
}

function TimeSwitch({ value, onChange }: { value: TimeOfDay; onChange: (t: TimeOfDay) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const i = TIME_OPTIONS.findIndex((o) => o.value === value)
    const next = (i + dir + TIME_OPTIONS.length) % TIME_OPTIONS.length
    onChange(TIME_OPTIONS[next].value)
    refs.current[next]?.focus()
  }
  return (
    <div role="radiogroup" aria-label="Time of day" onKeyDown={onKeyDown} className={cn('pointer-events-auto inline-flex items-center gap-0.5 rounded-full p-1', glass)}>
      {TIME_OPTIONS.map((o, i) => {
        const Icon = TIME_ICONS[o.value]
        const active = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full px-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600 @sm:px-3.5',
              active ? 'bg-brand-900 text-white shadow-sm' : 'text-ink-700 hover:bg-ink-900/[0.06] hover:text-ink-900',
            )}
          >
            <Icon className="size-4" aria-hidden />
            <span className="hidden @sm:inline" aria-hidden>
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function HouseGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" fill="none" className={className} aria-hidden>
      <path d="M8 74h104" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      <path d="M20 74V40l26-22 26 22v34" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M72 74V48h30v26" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M68 52l19-14 19 14" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M40 74V56h12v18" stroke="currentColor" strokeWidth="2.5" />
      <rect x="27" y="44" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="2.5" />
      <rect x="56" y="44" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="2.5" />
      <path d="M78 74V60h18v14" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  )
}

function Notice({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 grid place-items-center p-4">
      <div className="w-full max-w-xs rounded-2xl bg-white/95 p-5 text-center shadow-card ring-1 ring-black/5">
        <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-brand-50 text-brand-800 [&_svg]:size-5">{icon}</span>
        <p className="mt-3 text-sm font-semibold text-ink-900">{title}</p>
        <p className="mt-1 text-sm leading-6 text-ink-600">{body}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  )
}

/* ---------------- viewer ---------------- */

export function Viewer3D({
  config,
  customModelId,
  autoRotate = true,
  timeOfDay,
  onTimeOfDayChange,
  showControls = true,
  interactive = true,
  className,
  ariaLabel,
  eager,
  initialView,
}: Viewer3DProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [id] = useState(() => nextId++)
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)')
  const touchOnly = useTouchInput()
  const [glOk] = useState(() => typeof document !== 'undefined' && hasWebGL2())
  const [mounted, setMounted] = useState(!!eager)
  const [visible, setVisible] = useState(false)
  const [ready, setReady] = useState(false)
  const [interacted, setInteracted] = useState(false)
  const [rotateOn, setRotateOn] = useState(autoRotate && !reducedMotion)
  const [resetKey, setResetKey] = useState(0)
  const [mountKey, setMountKey] = useState(0)
  const [lost, setLost] = useState(false)
  const [failed, setFailed] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [inDialog, setInDialog] = useState(false)
  const [status, setStatus] = useState<ModelStatus>('procedural')
  const [todState, setTodState] = useState<TimeOfDay>(timeOfDay ?? 'day')
  const [insetTop, setInsetTop] = useState(0)
  const [wheelHint, setWheelHint] = useState(false)
  const topBarRef = useRef<HTMLDivElement>(null)
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const tod = timeOfDay ?? todState
  const view = initialView ?? DEFAULT_VIEW

  useEffect(() => setRotateOn(autoRotate && !reducedMotion), [autoRotate, reducedMotion])

  const setTod = (t: TimeOfDay) => {
    if (timeOfDay === undefined) setTodState(t)
    onTimeOfDayChange?.(t)
  }

  // Fetch the engine when the viewer is within ~2 screens, mount the canvas when it nears the viewport,
  // and track on-screen visibility (auto-rotation and rendering pause off screen).
  useEffect(() => {
    const el = wrapRef.current
    if (!el || !glOk) return
    const warm = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        preloadViewer3D()
        warm.disconnect()
      },
      { rootMargin: '1600px 0px' },
    )
    const near = new IntersectionObserver(([e]) => e.isIntersecting && setMounted(true), { rootMargin: '320px 0px' })
    const vis = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting)
        if (e.isIntersecting) setMounted(true)
      },
      { threshold: 0.01 },
    )
    warm.observe(el)
    near.observe(el)
    vis.observe(el)
    return () => {
      warm.disconnect()
      near.disconnect()
      vis.disconnect()
    }
  }, [glOk])

  // The overlay controls cover the top of the viewer: the house is framed clear of them.
  const showOverlay = showControls && glOk && !failed && !lost
  useLayoutEffect(() => {
    const wrap = wrapRef.current
    const bar = topBarRef.current
    if (!showOverlay || !wrap || !bar) {
      setInsetTop(0)
      return
    }
    const measure = () => setInsetTop(Math.round(bar.offsetTop + bar.offsetHeight))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(wrap)
    ro.observe(bar)
    return () => ro.disconnect()
  }, [showOverlay])

  useEffect(() => () => clearTimeout(wheelTimer.current), [])
  const onZoomHint = useCallback(() => {
    setWheelHint(true)
    clearTimeout(wheelTimer.current)
    wheelTimer.current = setTimeout(() => setWheelHint(false), 1400)
  }, [])

  useEffect(() => {
    if (!mounted) {
      live.delete(id)
      return
    }
    touchLive(id, visible || fullscreen, () => {
      setMounted(false)
      setReady(false)
    })
  }, [id, mounted, visible, fullscreen])
  useEffect(() => () => void live.delete(id), [id])

  useEffect(() => {
    setInDialog(!!wrapRef.current?.closest('[role="dialog"]'))
    const onFs = () => setFullscreen(document.fullscreenElement === wrapRef.current)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const fsSupported = typeof document !== 'undefined' && !!document.fullscreenEnabled
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await wrapRef.current?.requestFullscreen()
    } catch {
      /* Fullscreen can be refused (iframes, user settings); the viewer keeps working inline. */
    }
  }

  const onReady = useCallback(() => setReady(true), [])
  const onInteract = useCallback(() => setInteracted(true), [])
  const onContextLost = useCallback(() => {
    setLost(true)
    setReady(false)
  }, [])
  const onModelStatus = useCallback((s: ModelStatus) => setStatus(s), [])
  const remount = () => {
    setLost(false)
    setFailed(false)
    setReady(false)
    setMountKey((k) => k + 1)
  }

  const label = ariaLabel ?? '3D model of the home.'
  const showCanvas = glOk && mounted && !lost && !failed
  const statusNote = status === 'loading' ? 'Loading custom model…' : status === 'custom' ? 'Custom 3D model' : status === 'fallback' ? 'Showing standard 3D preview' : null
  const immersive = fullscreen || inDialog
  // Embedded on a page, a plain wheel keeps scrolling the page (no scroll-jacking); Ctrl/⌘ + wheel zooms.
  const hint = touchOnly ? 'Drag to rotate · Pinch to zoom' : immersive ? 'Drag to rotate · Scroll to zoom' : `Drag to rotate · ${zoomKey} + scroll to zoom`

  return (
    <div
      ref={wrapRef}
      role="group"
      aria-label={label}
      className={cn('@container relative isolate overflow-hidden rounded-2xl bg-brand-100 [&:fullscreen]:rounded-none', className ?? 'aspect-[16/10] w-full')}
    >
      {/* Sky backdrop (CSS) behind the transparent canvas; cross-fades between moods. */}
      <div aria-hidden className="absolute inset-0 -z-10">
        {TIME_OPTIONS.map((o) => (
          <div key={o.value} className={cn('absolute inset-0 transition-opacity duration-1000 ease-out', tod === o.value ? 'opacity-100' : 'opacity-0')} style={{ background: SKY[o.value] }} />
        ))}
        <div className={cn('absolute inset-0 transition-opacity duration-1000', tod === 'night' ? 'opacity-100' : 'opacity-0')} style={{ backgroundImage: STARS }} />
      </div>

      {showCanvas && (
        <div className={cn('absolute inset-0 rounded-[inherit] transition-opacity duration-700 ease-out', ready ? 'opacity-100' : 'opacity-0')}>
          <ViewerBoundary key={mountKey} onError={() => setFailed(true)}>
            <Suspense fallback={null}>
              <HouseCanvas
                config={config}
                customModelId={customModelId}
                timeOfDay={tod}
                rotating={rotateOn}
                interactive={interactive}
                resetKey={resetKey}
                view={view}
                active={visible || fullscreen}
                immersive={immersive}
                captureTouch={fullscreen}
                reducedMotion={reducedMotion}
                frameInsetTop={insetTop}
                ariaLabel={label}
                onReady={onReady}
                onInteract={onInteract}
                onContextLost={onContextLost}
                onModelStatus={onModelStatus}
                onZoomHint={onZoomHint}
              />
            </Suspense>
          </ViewerBoundary>
        </div>
      )}

      {/* A plain wheel over an embedded viewer scrolls the page; say how to zoom (the Google Maps pattern). */}
      {interactive && !immersive && (
        <div aria-hidden className={cn('pointer-events-none absolute inset-0 z-[15] grid place-items-center bg-ink-950/25 transition-opacity duration-200', wheelHint && ready ? 'opacity-100' : 'opacity-0')}>
          <span className={cn('inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium', glass)}>
            <Mouse className="size-4 text-brand-700" aria-hidden />
            Hold {zoomKey} and scroll to zoom
          </span>
        </div>
      )}

      {glOk && !ready && !lost && !failed && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center" role="status">
          <div aria-hidden className="absolute inset-x-[14%] bottom-[12%] h-[16%] rounded-[50%] bg-white/30 blur-2xl" />
          <div className="relative flex flex-col items-center gap-3">
            <HouseGlyph className={cn('h-auto w-24 animate-pulse @md:w-32', tod === 'day' ? 'text-white' : 'text-white/80')} />
            <span className={cn('inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium', glass)}>
              <span className="size-3.5 animate-spin rounded-full border-2 border-brand-700 border-t-transparent" aria-hidden />
              Preparing 3D view…
            </span>
          </div>
        </div>
      )}

      {!glOk && <Notice icon={<MonitorX aria-hidden />} title="3D view isn’t available here" body="This browser or device doesn’t support WebGL 2. Photos and plan details are still available on this page." />}
      {failed && (
        <Notice
          icon={<Box aria-hidden />}
          title="The 3D view couldn’t load"
          body="Please check your connection and try again."
          action={
            <button type="button" onClick={remount} className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-800">
              <RefreshCw className="size-4" aria-hidden /> Try again
            </button>
          }
        />
      )}
      {lost && (
        <Notice
          icon={<Box aria-hidden />}
          title="3D view paused"
          body="Your device paused the 3D view to save memory."
          action={
            <button type="button" onClick={remount} className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-800">
              <RefreshCw className="size-4" aria-hidden /> Reload 3D view
            </button>
          }
        />
      )}

      {showOverlay && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between gap-2 p-2.5 @md:p-3.5">
          <div ref={topBarRef} className="flex items-start justify-between gap-2">
            <TimeSwitch value={tod} onChange={setTod} />
            <div className={cn('pointer-events-auto flex items-center gap-0.5 rounded-full p-1', glass)}>
              <IconButton label={rotateOn ? 'Pause rotation' : 'Play rotation'} onClick={() => setRotateOn((v) => !v)}>
                {rotateOn ? <Pause aria-hidden /> : <Play aria-hidden />}
              </IconButton>
              <IconButton label="Reset view" onClick={() => setResetKey((k) => k + 1)}>
                <RotateCcw aria-hidden />
              </IconButton>
              {fsSupported && (
                <IconButton label={fullscreen ? 'Exit full screen' : 'View full screen'} onClick={toggleFullscreen}>
                  {fullscreen ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
                </IconButton>
              )}
            </div>
          </div>
          <div className="flex items-end justify-between gap-2">
            {interactive ? (
              <span
                aria-hidden
                className={cn(
                  'hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-opacity duration-500 @xs:inline-flex',
                  glass,
                  ready && !interacted ? 'opacity-100' : 'opacity-0',
                )}
              >
                <Move3d className="size-4 text-brand-700" aria-hidden />
                {hint}
              </span>
            ) : (
              <span />
            )}
            {statusNote && <span className={cn('rounded-full px-3 py-1.5 text-xs font-medium', glass)}>{statusNote}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

export default Viewer3D
