import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react'
import type { HouseConfig, TimeOfDay } from '@/types'
import { useDocumentTitle } from '@/lib/utils'
import { cn } from '@/lib/cn'
import { homeModels } from '@/data/models'
import { houseStyleLabels, paletteColors } from '@/data/housePresets'
import { Badge, Button, Card, Field, Segmented, Select, SmartImage, smoothBehavior, Switch } from '@/components/ui'
import { Viewer3D, type ViewPreset } from '@/three/Viewer3D'
import { View3DButton } from '@/three/View3DButton'

/**
 * Internal test bench for the 3D viewer (/dev/3d, not linked from the site).
 * URL parameters make every state reproducible for screenshots:
 *   ?model=franklin&view=back&time=night&rotate=0     single viewer
 *   ?mode=grid&page=2&time=dusk                        six live viewers per page
 */

const VIEWS: Record<string, { label: string; view: ViewPreset }> = {
  hero: { label: '¾ front', view: { azimuth: 32, elevation: 17 } },
  front: { label: 'Front', view: { azimuth: 0, elevation: 8 } },
  'front-left': { label: '¾ left', view: { azimuth: -38, elevation: 15 } },
  left: { label: 'Left', view: { azimuth: -90, elevation: 12 } },
  right: { label: 'Right', view: { azimuth: 90, elevation: 12 } },
  back: { label: 'Back', view: { azimuth: 180, elevation: 14 } },
  'back-left': { label: '¾ back', view: { azimuth: -140, elevation: 18 } },
  top: { label: 'Aerial', view: { azimuth: 25, elevation: 58 } },
  close: { label: 'Entry', view: { azimuth: 14, elevation: 7, distance: 0.55 } },
  roof: { label: 'Roof detail', view: { azimuth: 12, elevation: 38, distance: 0.5 } },
  // Closest zoom at the lowest angle: the camera guard must keep the lens outside the house.
  street: { label: 'Street level · closest', view: { azimuth: 28, elevation: 3, distance: 0.05 } },
  'corner-low': { label: 'Back corner · closest', view: { azimuth: -125, elevation: 3, distance: 0.05 } },
}

const TIMES: { value: TimeOfDay; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'dusk', label: 'Dusk' },
  { value: 'night', label: 'Night' },
]

const PER_PAGE = 6

const OVERRIDE_KEYS = ['style', 'stories', 'width', 'depth', 'roof', 'roofPitch', 'siding', 'porch', 'garageBays', 'garagePosition', 'dormers', 'chimney', 'shutters', 'stoneBase', 'windowsPerFloor', 'screenPorch'] as const

function summary(c: HouseConfig) {
  return [
    houseStyleLabels[c.style],
    `${c.stories} levels`,
    `${c.roof} roof`,
    c.siding === 'board-batten' ? 'board & batten' : c.siding,
    c.porch === 'none' ? 'stoop' : `${c.porch} porch`,
    c.garageBays ? `${c.garageBays}-car ${c.garagePosition}` : 'no garage',
    c.dormers ? `${c.dormers} dormer${c.dormers > 1 ? 's' : ''}` : null,
    c.chimney ? 'chimney' : null,
    c.shutters ? 'shutters' : null,
    c.stoneBase ? 'stone base' : null,
    c.screenPorch ? 'screened porch' : null,
  ].filter(Boolean) as string[]
}

export default function ThreeLab() {
  useDocumentTitle('3D lab')
  const [params, setParams] = useSearchParams()
  const mode = params.get('mode') === 'grid' ? 'grid' : 'single'
  const time = (TIMES.some((t) => t.value === params.get('time')) ? params.get('time') : 'day') as TimeOfDay
  const viewKey = params.get('view') && VIEWS[params.get('view')!] ? params.get('view')! : 'hero'
  const rotate = params.get('rotate') !== '0'
  // ?glb=<homeId> previews a custom model saved in IndexedDB (see glbStore) for that id.
  const glb = params.get('glb')
  // Free camera for reviews: ?az=-140&el=25&dist=0.6 overrides the preset.
  const az = params.get('az')
  const customView = useMemo<ViewPreset | null>(
    () => (az !== null ? { azimuth: Number(az) || 0, elevation: Number(params.get('el') ?? 17) || 17, distance: Number(params.get('dist') ?? 1) || 1 } : null),
    [az, params],
  )
  const baseModel = homeModels.find((m) => m.slug === params.get('model')) ?? homeModels[0]
  // Config overrides for edge-case testing, e.g. ?porch=none&roof=hip&garagePosition=courtyard&palette=sage-green
  const overrideKey = OVERRIDE_KEYS.map((k) => params.get(k) ?? '').join('|') + '|' + (params.get('palette') ?? '')
  const model = useMemo(() => {
    const cfg: HouseConfig = { ...baseModel.house3d, colors: { ...baseModel.house3d.colors } }
    const rec = cfg as unknown as Record<string, unknown>
    let changed = false
    for (const k of OVERRIDE_KEYS) {
      const raw = params.get(k)
      if (raw === null) continue
      changed = true
      const current = rec[k]
      rec[k] = typeof current === 'number' ? Number(raw) : typeof current === 'boolean' ? raw === '1' || raw === 'true' : raw
    }
    const palette = params.get('palette')
    if (palette) {
      changed = true
      cfg.colors = paletteColors(palette)
    }
    return changed ? { ...baseModel, house3d: cfg } : baseModel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseModel, overrideKey])
  const pages = Math.ceil(homeModels.length / PER_PAGE)
  const page = Math.min(pages, Math.max(1, Number(params.get('page')) || 1))

  const set = (key: string, value: string | null) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        if (value === null) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )

  const gridModels = useMemo(() => homeModels.slice((page - 1) * PER_PAGE, page * PER_PAGE), [page])

  return (
    <div className="bg-ink-50">
      <div className="container-page py-10 sm:py-14">
        <p className="eyebrow">Internal · not linked from the site</p>
        <h1 className="display-heading mt-3 text-3xl sm:text-4xl">3D lab</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-ink-600">
          Test bench for the procedural 3D viewer: every floor plan preset, camera angles and the day, dusk and night lighting moods.
        </p>

        <Card className="mt-8 flex flex-wrap items-end gap-x-6 gap-y-4 p-4 sm:p-5">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-ink-800" id="lab-layout">
              Layout
            </p>
            <Segmented
              ariaLabel="Layout"
              items={[
                { value: 'single', label: 'Single viewer' },
                { value: 'grid', label: `Grid · ${PER_PAGE} live` },
              ]}
              value={mode}
              onChange={(v) => set('mode', v === 'single' ? null : v)}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-ink-800">Time of day</p>
            <Segmented ariaLabel="Time of day" items={TIMES} value={time} onChange={(v) => set('time', v === 'day' ? null : v)} />
          </div>
          {mode === 'single' && (
            <>
              <Field label="Floor plan" className="w-full sm:w-72">
                {(id) => (
                  <Select id={id} value={model.slug} onChange={(e) => set('model', e.target.value)}>
                    {homeModels.map((m) => (
                      <option key={m.slug} value={m.slug}>
                        {m.name} · {houseStyleLabels[m.house3d.style]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Camera" className="w-full sm:w-44">
                {(id) => (
                  <Select id={id} value={viewKey} onChange={(e) => set('view', e.target.value === 'hero' ? null : e.target.value)}>
                    {Object.entries(VIEWS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Switch label="Auto-rotate" checked={rotate} onChange={(v) => set('rotate', v ? null : '0')} className="min-h-10 items-center sm:pb-1" />
            </>
          )}
        </Card>

        {mode === 'single' ? (
          <>
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <Viewer3D
                eager
                config={model.house3d}
                customModelId={glb}
                timeOfDay={time}
                onTimeOfDayChange={(t) => set('time', t === 'day' ? null : t)}
                autoRotate={rotate}
                initialView={customView ?? VIEWS[viewKey].view}
                className="h-[58vh] min-h-[380px] w-full shadow-lift ring-1 ring-ink-200/70 lg:h-[640px]"
                ariaLabel={`3D model of ${model.name}.`}
              />
              <Card className="flex flex-col p-5 sm:p-6">
                <p className="eyebrow">{model.style}</p>
                <h2 className="mt-2 text-xl font-semibold text-ink-900">{model.name}</h2>
                <p className="mt-2 text-sm leading-6 text-ink-600">{model.summary}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {summary(model.house3d).map((s) => (
                    <Badge key={s} tone="brand">
                      {s}
                    </Badge>
                  ))}
                </div>
                <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-ink-100 pt-4 text-sm">
                  {[
                    ['Width', `${model.house3d.width} m`],
                    ['Depth', `${model.house3d.depth} m`],
                    ['Pitch', `${Math.round(model.house3d.roofPitch * 12)}/12`],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs text-ink-500">{k}</dt>
                      <dd className="mt-0.5 font-medium text-ink-900">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-auto flex flex-wrap gap-2 pt-6">
                  <View3DButton
                    title={model.name}
                    subtitle={`${model.style} · ${model.beds} beds · ${model.baths} baths`}
                    config={model.house3d}
                    variant="primary"
                    details={<p className="text-sm leading-6 text-ink-600">{model.summary}</p>}
                    label="Open in modal"
                  />
                  <Link
                    to={`/our-homes/models/${model.slug}`}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-brand-800 hover:bg-brand-50"
                  >
                    Plan page <ArrowUpRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </Card>
            </div>

            <h2 className="mt-12 text-lg font-semibold text-ink-900">All floor plans</h2>
            <p className="mt-1 text-sm text-ink-600">Select a plan to load its 3D preset. Photos are the plan’s marketing image.</p>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {homeModels.map((m) => {
                const active = m.slug === model.slug
                return (
                  <li key={m.slug}>
                    <button
                      type="button"
                      onClick={() => {
                        set('model', m.slug)
                        window.scrollTo({ top: 0, behavior: smoothBehavior() })
                      }}
                      aria-pressed={active}
                      className={cn(
                        'group w-full overflow-hidden rounded-xl bg-white text-left shadow-card ring-1 transition-all hover:-translate-y-0.5 hover:shadow-lift',
                        active ? 'ring-2 ring-brand-700' : 'ring-ink-200/70',
                      )}
                    >
                      <SmartImage src={m.image} alt="" className="aspect-[4/3] w-full" />
                      <span className="block px-3 py-2.5">
                        <span className="block truncate text-sm font-semibold text-ink-900">{m.name}</span>
                        <span className="block truncate text-xs text-ink-500">{houseStyleLabels[m.house3d.style]}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        ) : (
          <section aria-labelledby="lab-grid-title" className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="lab-grid-title" className="text-lg font-semibold text-ink-900">
                Plans {(page - 1) * PER_PAGE + 1}–{Math.min(homeModels.length, page * PER_PAGE)} of {homeModels.length}
              </h2>
              <nav aria-label="Grid pages" className="flex items-center gap-1">
                <Button variant="secondary" size="icon" aria-label="Previous page" disabled={page <= 1} onClick={() => set('page', String(page - 1))}>
                  <ChevronLeft className="size-4" aria-hidden />
                </Button>
                {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                  <Button key={n} variant={n === page ? 'primary' : 'ghost'} size="icon" aria-current={n === page ? 'page' : undefined} onClick={() => set('page', String(n))}>
                    {n}
                  </Button>
                ))}
                <Button variant="secondary" size="icon" aria-label="Next page" disabled={page >= pages} onClick={() => set('page', String(page + 1))}>
                  <ChevronRight className="size-4" aria-hidden />
                </Button>
              </nav>
            </div>
            <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {gridModels.map((m) => (
                <li key={m.slug}>
                  <Card className="overflow-hidden">
                    <Viewer3D
                      config={m.house3d}
                      timeOfDay={time}
                      autoRotate={false}
                      showControls={false}
                      className="aspect-[4/3] w-full rounded-none"
                      ariaLabel={`3D model of ${m.name}.`}
                    />
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-ink-900">{m.name}</h3>
                        <p className="truncate text-xs text-ink-500">{summary(m.house3d).slice(0, 4).join(' · ')}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setParams({ model: m.slug, ...(time !== 'day' ? { time } : {}) }, { replace: true })}
                        className="shrink-0 rounded-lg px-2.5 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50"
                      >
                        Inspect
                      </button>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
