import { useRef, useState, type FormEvent } from 'react'
import { Box, Camera, ChevronLeft, ChevronRight, FileUp, ImagePlus, Images, Link2, Lock, Trash2, X } from 'lucide-react'
import type { ConstructionStageKey, Home, HouseConfig } from '@/types'
import { constructionStages } from '@/data/labels'
import { cn } from '@/lib/cn'
import { formatDate, formatDateShort } from '@/lib/format'
import { useAppStore } from '@/store'
import { confirmDialog, toast } from '@/store/ui'
import { Alert, Badge, Button, Card, CardBody, CardHeader, Field, Input, ProgressBar, Select, SmartImage, Switch } from '@/components/ui'
import { Viewer3D } from '@/three/Viewer3D'
import { removeGlb, saveGlb } from '@/three/glbStore'
import { HouseConfigurator } from './HouseConfigurator'
import { PhotoLibraryModal } from './PhotoLibrary'

const MAX_GLB_MB = 50

/** Classes for an editor section card: anchors land just under the sticky header and section links. */
export const editorSectionClass = 'scroll-mt-[calc(var(--editor-top,4rem)+1rem)] outline-none'

/**
 * For content under the 3D preview while it's pinned (stacked layout): focused controls scroll into view
 * below the preview, not under it (WCAG 2.4.11). Side by side, the usual offset applies.
 */
const belowPinnedPreview =
  '[&_:focus]:scroll-mt-[calc(var(--editor-top,4rem)+clamp(200px,36vh,380px)+2.5rem)] @4xl/three:[&_:focus]:scroll-mt-[calc(var(--editor-top,4rem)+1rem)]'

export function isImageUrl(v: string) {
  return /^https?:\/\/\S+$/i.test(v.trim()) || /^data:image\//i.test(v.trim())
}

/* ------------------------------------------------------------------ */
/* Photos                                                               */
/* ------------------------------------------------------------------ */

export function PhotosEditor({ images, onChange, fallback, error }: { images: string[]; onChange: (imgs: string[]) => void; fallback?: string; error?: string | null }) {
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= images.length) return
    const next = [...images]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  const add = (srcs: string[]) => {
    const fresh = srcs.filter((s) => !images.includes(s))
    if (fresh.length) onChange([...images, ...fresh])
    return fresh.length
  }
  const addUrl = (e?: FormEvent) => {
    e?.preventDefault()
    const v = url.trim()
    if (!isImageUrl(v)) {
      setUrlError('Enter a full image address starting with https://')
      return
    }
    if (images.includes(v)) {
      setUrlError('That photo is already in the list.')
      return
    }
    add([v])
    setUrl('')
    setUrlError(null)
  }

  return (
    <div className="space-y-5">
      {images.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-ink-300 px-6 py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <Images className="size-6" aria-hidden />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink-900">No photos yet</p>
          <p className="mt-1 max-w-sm text-sm text-ink-500">{fallback ? 'The floor plan’s photo is shown on the website until you add your own.' : 'Add photos by URL or pick from the library.'}</p>
        </div>
      ) : (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Photos in display order">
          {images.map((src, i) => (
            <li key={src} className="group relative overflow-hidden rounded-xl bg-white ring-1 ring-ink-200">
              <SmartImage src={src} alt={`Photo ${i + 1}`} className="aspect-[4/3] w-full" />
              <span className={cn('absolute top-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm', i === 0 ? 'bg-brand-900 text-white' : 'bg-white/95 text-ink-700')}>
                {i === 0 ? 'Cover' : i + 1}
              </span>
              <div className="flex items-center justify-between gap-1 border-t border-ink-100 px-1.5 py-1.5">
                <div className="flex gap-1">
                  <Button size="icon-sm" variant="ghost" className="max-sm:size-10" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move photo ${i + 1} earlier`}>
                    <ChevronLeft className="size-4" aria-hidden />
                  </Button>
                  <Button size="icon-sm" variant="ghost" className="max-sm:size-10" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label={`Move photo ${i + 1} later`}>
                    <ChevronRight className="size-4" aria-hidden />
                  </Button>
                </div>
                <Button size="icon-sm" variant="ghost" className="text-rose-700 hover:bg-rose-50 hover:text-rose-800 max-sm:size-10" onClick={() => onChange(images.filter((x) => x !== src))} aria-label={`Remove photo ${i + 1}`}>
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {error && (
        <p className="text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Add a photo by URL" error={urlError} className="flex-1">
          {(id) => (
            <Input
              id={id}
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                if (urlError) setUrlError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addUrl()
                }
              }}
              placeholder="https://…/photo.jpg"
              leftIcon={<Link2 className="size-4" aria-hidden />}
              aria-invalid={!!urlError}
              aria-describedby={urlError ? `${id}-error` : undefined}
            />
          )}
        </Field>
        <div className={cn('flex gap-2', urlError && 'sm:mb-7')}>
          <Button variant="secondary" onClick={() => addUrl()} leftIcon={<ImagePlus className="size-4" aria-hidden />}>
            Add
          </Button>
          <Button variant="soft" onClick={() => setLibraryOpen(true)} leftIcon={<Images className="size-4" aria-hidden />}>
            Choose from library
          </Button>
        </div>
      </div>
      <p className="text-xs text-ink-500">The first photo is the cover image on the website and in the owner’s portal.</p>
      <PhotoLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        exclude={images}
        onPick={(srcs) => {
          const n = add(srcs)
          if (n) toast.success(`${n} ${n === 1 ? 'photo' : 'photos'} added`, 'Save the home to publish them.')
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Construction (applies immediately — the Home Owner is notified)       */
/* ------------------------------------------------------------------ */

export function ConstructionSection({ home }: { home: Home }) {
  const setConstructionStage = useAppStore((s) => s.setConstructionStage)
  const addConstructionPhoto = useAppStore((s) => s.addConstructionPhoto)
  const stages = home.construction?.stages ?? []
  const photos = home.construction?.photos ?? []
  const progress = home.construction?.progress ?? 0
  const allDone = progress >= 100 && stages.length > 0 && stages.every((s) => s.status === 'done')
  const current = stages.find((s) => s.status === 'current')?.key ?? (allDone ? 'closing' : 'contract')
  const currentStage = stages.find((s) => s.key === current)
  const nextStage = stages.find((s) => s.status === 'upcoming')
  const [stage, setStage] = useState<ConstructionStageKey>(current)
  const [lastCurrent, setLastCurrent] = useState(current)
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoStage, setPhotoStage] = useState<ConstructionStageKey>(current)
  const [caption, setCaption] = useState('')
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  // Follow a stage change made elsewhere (another tab, a reset).
  if (lastCurrent !== current) {
    setLastCurrent(current)
    setStage(current)
    setPhotoStage(current)
  }

  const labelOf = (key: ConstructionStageKey) => constructionStages.find((s) => s.key === key)?.label ?? key
  const unchanged = stage === current && (stages.length > 0 || stage !== 'contract')

  const updateStage = async () => {
    const back = constructionStages.findIndex((s) => s.key === stage) < constructionStages.findIndex((s) => s.key === current)
    if (back && stages.length) {
      const ok = await confirmDialog({
        title: `Move back to ${labelOf(stage)}?`,
        description: `Use this to correct a mistake. Later stages are marked as upcoming again${home.ownerId ? ', and the Home Owner is told the home is at this stage' : ''}.`,
        confirmLabel: `Move back to ${labelOf(stage)}`,
      })
      if (!ok) return
    }
    const before = useAppStore.getState().homes.find((h) => h.id === home.id)?.updatedAt
    setConstructionStage(home.id, stage)
    const after = useAppStore.getState().homes.find((h) => h.id === home.id)?.updatedAt
    if (before === after) return
    toast.success(stage === 'closing' ? 'Home marked as closed' : `Stage updated: ${labelOf(stage)}`, home.ownerId ? 'The Home Owner has been notified.' : undefined)
  }

  const addPhoto = (e: FormEvent) => {
    e.preventDefault()
    if (!isImageUrl(photoUrl)) {
      setPhotoError('Enter a full image address, or pick one from the library.')
      return
    }
    addConstructionPhoto(home.id, { stage: labelOf(photoStage), url: photoUrl.trim(), caption: caption.trim() || undefined })
    toast.success('Progress photo added', home.ownerId ? 'The Home Owner can see it in their portal.' : undefined)
    setPhotoUrl('')
    setCaption('')
    setPhotoError(null)
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink-800">{allDone ? 'Construction complete' : currentStage ? `Now: ${currentStage.label}` : 'Not started yet'}</p>
          <p className="text-sm font-semibold text-ink-900 tabular-nums">{progress}%</p>
        </div>
        <ProgressBar value={progress} className="mt-2" label="Construction progress" />
        <p className="mt-2 text-xs text-ink-500">
          {[
            currentStage?.date && !allDone && `${currentStage.label} started ${formatDateShort(currentStage.date)}`,
            nextStage && !allDone && (nextStage.date ? `Next: ${nextStage.label}, planned ${formatDateShort(nextStage.date)}` : `Next: ${nextStage.label}`),
            home.construction?.estCompletion && !allDone && `Estimated completion ${formatDate(home.construction.estCompletion)}`,
            allDone && home.closingDate && `Closed ${formatDate(home.closingDate)}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {stages.length > 0 && (
          <ol className="mt-4 flex flex-wrap gap-1.5" aria-label="Construction stages">
            {stages.map((s) => (
              <li
                key={s.key}
                title={s.date ? `${s.status === 'done' ? 'Finished' : s.status === 'current' ? 'Started' : 'Planned'} ${formatDate(s.date)}` : undefined}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                  s.status === 'done' && 'bg-emerald-50 text-emerald-800 ring-emerald-200',
                  s.status === 'current' && 'bg-brand-900 text-white ring-brand-900',
                  s.status === 'upcoming' && 'bg-white text-ink-600 ring-ink-200',
                )}
              >
                {s.label}
                <span className="sr-only">
                  {' '}
                  — {s.status === 'done' ? 'done' : s.status === 'current' ? 'current stage' : 'upcoming'}
                  {s.date ? `, ${s.status === 'upcoming' ? 'planned' : s.status === 'done' ? 'finished' : 'started'} ${formatDate(s.date)}` : ''}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Current stage" className="flex-1" hint="Moving to a stage dates it today. Closing marks the home complete.">
          {(id) => (
            <Select id={id} value={stage} onChange={(e) => setStage(e.target.value as ConstructionStageKey)} aria-describedby={`${id}-hint`}>
              {constructionStages.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                  {s.key === current && stages.length ? ' (current)' : ''}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Button onClick={updateStage} disabled={unchanged} className="sm:mb-6">
          Update stage
        </Button>
      </div>

      <form onSubmit={addPhoto} className="space-y-4 rounded-xl bg-ink-50 p-4 ring-1 ring-ink-200/70 ring-inset sm:p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <Camera className="size-4 text-ink-500" aria-hidden /> Add a progress photo
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Photo URL" error={photoError} className="sm:col-span-2">
            {(id) => (
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    id={id}
                    type="url"
                    value={photoUrl}
                    onChange={(e) => {
                      setPhotoUrl(e.target.value)
                      if (photoError) setPhotoError(null)
                    }}
                    placeholder="https://…/framing.jpg"
                    aria-invalid={!!photoError}
                    aria-describedby={photoError ? `${id}-error` : undefined}
                  />
                </div>
                <Button variant="secondary" onClick={() => setLibraryOpen(true)} leftIcon={<Images className="size-4" aria-hidden />}>
                  Library
                </Button>
              </div>
            )}
          </Field>
          <Field label="Stage">
            {(id) => (
              <Select id={id} value={photoStage} onChange={(e) => setPhotoStage(e.target.value as ConstructionStageKey)}>
                {constructionStages.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Caption" optional>
            {(id) => <Input id={id} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Roof trusses set" />}
          </Field>
        </div>
        {photoUrl && isImageUrl(photoUrl) && <SmartImage key={photoUrl} src={photoUrl} alt="Preview of the new progress photo" className="aspect-[16/9] w-full max-w-xs rounded-lg" />}
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" leftIcon={<ImagePlus className="size-4" aria-hidden />}>
            Add progress photo
          </Button>
        </div>
      </form>

      {photos.length > 0 && (
        <div>
          <p className="text-sm font-medium text-ink-800">Shared with the Home Owner ({photos.length})</p>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...photos]
              .reverse()
              .slice(0, 8)
              .map((p, i) => (
                <li key={`${p.url}-${i}`} className="overflow-hidden rounded-xl bg-white ring-1 ring-ink-200">
                  <SmartImage src={p.url} alt={p.caption ?? `${p.stage} progress photo`} className="aspect-[4/3] w-full" />
                  <p className="truncate px-2.5 pt-2 text-xs font-medium text-ink-800">{p.caption ?? p.stage}</p>
                  <p className="truncate px-2.5 pb-2 text-[11px] text-ink-500">{p.stage}</p>
                </li>
              ))}
          </ul>
        </div>
      )}

      <PhotoLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        mode="single"
        initialGroup="construction"
        title="Choose a progress photo"
        onPick={([src]) => {
          setPhotoUrl(src)
          setPhotoError(null)
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 3D viewing                                                           */
/* ------------------------------------------------------------------ */

/**
 * Checks an uploaded file really is a glTF 2.0 binary (.glb) that three.js can open, before it's saved.
 * Returns a message for the Staff member, or null when the model is fine.
 */
async function checkGlb(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (head.length < 12 || String.fromCharCode(head[0], head[1], head[2], head[3]) !== 'glTF') {
    return 'It isn’t a binary glTF (.glb) file. Export the model as .glb and try again.'
  }
  const version = new DataView(head.buffer).getUint32(4, true)
  if (version !== 2) return `It’s a glTF ${version} file. Export it as glTF 2.0 (.glb) and try again.`
  const url = URL.createObjectURL(file)
  try {
    const { loadModel, disposeObject } = await import('@/three/engine/gltf')
    const { object } = await loadModel(url)
    let meshes = 0
    object.traverse((o) => {
      if ((o as { isMesh?: boolean }).isMesh) meshes++
    })
    disposeObject(object)
    return meshes ? null : 'The file opened, but it has no 3D geometry to show. Check the export settings and try again.'
  } catch {
    return 'The model couldn’t be opened. Export it again as .glb and try once more.'
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function View3DSection({
  home,
  title,
  enabled,
  onEnabledChange,
  config,
  onConfigChange,
  onReset,
  resetLabel,
  globalOn,
  canManage,
  published,
  owned,
}: {
  home?: Home
  title: string
  published: boolean
  owned: boolean
  enabled: boolean
  onEnabledChange: (v: boolean) => void
  config: HouseConfig
  onConfigChange: (c: HouseConfig) => void
  onReset?: () => void
  resetLabel?: string
  globalOn: boolean
  canManage: boolean
}) {
  const updateHome3d = useAppStore((s) => s.updateHome3d)
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [viewerKey, setViewerKey] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const hasCustom = !!home?.view3d.hasCustomModel
  const where = [published && 'on the website', owned && 'in the owner’s portal'].filter(Boolean).join(' and ')

  if (!canManage) {
    return (
      <Card id="view3d" tabIndex={-1} data-focus-target className={editorSectionClass}>
        <CardHeader title="3D viewing" icon={<Box className="size-[18px]" aria-hidden />} />
        <CardBody>
          <div className="flex items-start gap-3 text-sm text-ink-600">
            <Lock className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
            <p>Managing 3D viewing needs the “Manage 3D viewing” permission. A Super Admin can grant it under Roles & permissions.</p>
          </div>
        </CardBody>
      </Card>
    )
  }

  const onFile = async (file: File | undefined) => {
    if (!file || !home) return
    if (!/\.glb$/i.test(file.name)) {
      toast.error('Please choose a .glb file', 'Export the model from SketchUp, Revit or Blender as binary glTF (.glb).')
      return
    }
    if (file.size > MAX_GLB_MB * 1024 * 1024) {
      toast.error('That file is too large', `Models up to ${MAX_GLB_MB} MB are supported.`)
      return
    }
    setBusy(true)
    try {
      const problem = await checkGlb(file)
      if (problem) {
        toast.error('That file isn’t a valid 3D model', problem)
        return
      }
      await saveGlb(home.id, file)
      updateHome3d(home.id, { hasCustomModel: true })
      setFileName(file.name)
      setViewerKey((k) => k + 1)
      toast.success('Custom 3D model uploaded', `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`)
    } catch {
      toast.error('Upload failed', 'This browser blocked local storage for the model.')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const removeModel = async () => {
    if (!home) return
    const ok = await confirmDialog({
      title: 'Remove the custom 3D model?',
      description: 'Visitors and the Home Owner will see the generated 3D design again.',
      confirmLabel: 'Remove model',
      tone: 'danger',
    })
    if (!ok) return
    await removeGlb(home.id).catch(() => {})
    updateHome3d(home.id, { hasCustomModel: false })
    setFileName(null)
    setViewerKey((k) => k + 1)
    toast.success('Custom model removed', 'The generated 3D design is back.')
  }

  return (
    <Card id="view3d" tabIndex={-1} data-focus-target className={editorSectionClass}>
      <CardHeader
        title="3D viewing"
        description="Let buyers and Home Owners walk around this home in 3D."
        icon={<Box className="size-[18px]" aria-hidden />}
        action={<Switch id="view3d-enabled" label="Show 3D tour" checked={enabled} onChange={onEnabledChange} className="items-center gap-3" />}
      />
      <CardBody>
        {/*
          Container query: the preview sits beside the controls only when it gets a useful width (the card is at
          least 56rem wide, which leaves the preview 520px+). Narrower, it sits above the controls and stays pinned
          under the page header while you scroll through them, so every change stays in view.
        */}
        <div className="@container/three">
          <div className="flex flex-col gap-5 @4xl/three:grid @4xl/three:grid-cols-[minmax(0,1fr)_340px] @4xl/three:items-start @4xl/three:gap-8">
            {/* `contents` while stacked, so the viewer below can stick across the whole control list. */}
            <div className="contents @4xl/three:sticky @4xl/three:top-[calc(var(--editor-top,4rem)+1rem)] @4xl/three:block @4xl/three:space-y-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {enabled ? (
                    <Badge tone="success" dot className="whitespace-normal">
                      {where ? `3D tour shown ${where}` : '3D tour on — visible once published or owned'}
                    </Badge>
                  ) : (
                    <Badge tone="neutral" dot>
                      3D tour hidden
                    </Badge>
                  )}
                  {hasCustom && (
                    <Badge tone="brand" icon={<FileUp className="size-3" aria-hidden />}>
                      Custom model
                    </Badge>
                  )}
                </div>
                {!globalOn && (
                  <Alert tone="warning" title="3D viewing is switched off platform-wide">
                    Your settings here are saved, but nobody sees 3D tours until a Super Admin turns the feature back on.
                  </Alert>
                )}
              </div>

              <div
                data-preview-band
                className="sticky top-[var(--editor-top,4rem)] z-10 -mx-5 bg-white px-5 pt-2 pb-3 shadow-[0_12px_12px_-14px_rgb(15_23_42/0.45)] sm:-mx-6 sm:px-6 @4xl/three:static @4xl/three:mx-0 @4xl/three:p-0 @4xl/three:shadow-none"
              >
                <div className="relative">
                  <Viewer3D
                    key={viewerKey}
                    config={config}
                    customModelId={hasCustom && home ? home.id : null}
                    className="h-[clamp(200px,36vh,380px)] w-full @4xl/three:h-[clamp(280px,calc(100dvh-24rem),440px)]"
                    eager
                    ariaLabel={`Live 3D preview of ${title || 'this home'}`}
                  />
                  {!enabled && (
                    <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-ink-900/80 px-3 py-1 text-xs font-semibold text-white">Preview only — hidden from visitors</span>
                  )}
                </div>
              </div>

              <div className={cn('flex flex-col gap-3 rounded-xl bg-brand-50/60 p-4 ring-1 ring-brand-100 ring-inset @lg/three:flex-row @lg/three:items-center @lg/three:justify-between', belowPinnedPreview)}>
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-ink-900">{hasCustom ? 'Custom 3D model in use' : 'Upload your architect’s model'}</p>
                  <p className="mt-0.5 text-ink-600">
                    {hasCustom
                      ? `${fileName ?? 'The uploaded .glb file'} replaces the generated design.`
                      : home
                        ? `A .glb file (up to ${MAX_GLB_MB} MB) replaces the generated design everywhere.`
                        : 'Save the home first, then upload a .glb file.'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <input ref={fileRef} type="file" accept=".glb,model/gltf-binary" className="hidden" tabIndex={-1} aria-hidden onChange={(e) => onFile(e.target.files?.[0])} />
                  <Button variant={hasCustom ? 'secondary' : 'primary'} onClick={() => fileRef.current?.click()} disabled={!home} loading={busy} leftIcon={<FileUp className="size-4" aria-hidden />}>
                    {busy ? 'Checking…' : hasCustom ? 'Replace .glb' : 'Upload .glb'}
                  </Button>
                  {hasCustom && (
                    <Button variant="ghost" className="text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={removeModel} leftIcon={<X className="size-4" aria-hidden />}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className={cn('min-w-0', belowPinnedPreview)}>
              {hasCustom && <p className="mb-4 text-sm text-ink-600">The generated design below is kept as a fallback if the custom model is removed.</p>}
              <HouseConfigurator config={config} onChange={onConfigChange} onReset={onReset} resetLabel={resetLabel} />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
