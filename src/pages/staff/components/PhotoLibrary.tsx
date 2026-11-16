import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { homeModels } from '@/data/models'
import { photos } from '@/data/images'
import { cn } from '@/lib/cn'
import { Button, Modal, Segmented, SmartImage } from '@/components/ui'
import { humanizeKey } from './common'

type Group = 'plans' | 'homes' | 'construction'

export interface LibraryPhoto {
  src: string
  label: string
  group: Group
}

const groupLabels: Record<Group, string> = { plans: 'Floor plans', homes: 'Homes & interiors', construction: 'Construction' }

/** Every photo the presentation ships with (the client's own photography). */
export function usePhotoLibrary(): LibraryPhoto[] {
  return useMemo(() => {
    const seen = new Set<string>()
    const out: LibraryPhoto[] = []
    const add = (src: string, label: string, group: Group) => {
      if (!src || seen.has(src)) return
      seen.add(src)
      out.push({ src, label, group })
    }
    for (const m of homeModels) add(m.image, `${m.name} exterior`, 'plans')
    for (const [k, src] of Object.entries(photos.hero)) add(src, humanizeKey(k), 'homes')
    for (const [k, src] of Object.entries(photos.construction)) add(src, humanizeKey(k), 'construction')
    return out
  }, [])
}

/**
 * Photo picker. In "multiple" mode staff tick several photos and add them in one go;
 * in "single" mode a click picks the photo immediately.
 */
export function PhotoLibraryModal({
  open,
  onClose,
  onPick,
  mode = 'multiple',
  exclude = [],
  initialGroup = 'all',
  title = 'Choose from photo library',
}: {
  open: boolean
  onClose: () => void
  onPick: (srcs: string[]) => void
  mode?: 'single' | 'multiple'
  exclude?: string[]
  initialGroup?: Group | 'all'
  title?: string
}) {
  const library = usePhotoLibrary()
  const [group, setGroup] = useState<Group | 'all'>(initialGroup)
  const [selected, setSelected] = useState<string[]>([])
  const visible = library.filter((p) => group === 'all' || p.group === group)
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: library.length }
    for (const p of library) c[p.group] = (c[p.group] ?? 0) + 1
    return c
  }, [library])

  const close = () => {
    setSelected([])
    onClose()
  }
  const toggle = (src: string) => {
    if (mode === 'single') {
      onPick([src])
      close()
      return
    }
    setSelected((s) => (s.includes(src) ? s.filter((x) => x !== src) : [...s, src]))
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="xl"
      title={title}
      description="Wakefield’s own photography — floor plans, finished homes and construction progress."
      footer={
        mode === 'multiple' ? (
          <>
            <span className="mr-auto text-sm text-ink-500">{selected.length ? `${selected.length} selected` : 'Select one or more photos'}</span>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button
              disabled={!selected.length}
              onClick={() => {
                onPick(selected)
                close()
              }}
            >
              Add {selected.length || ''} {selected.length === 1 ? 'photo' : 'photos'}
            </Button>
          </>
        ) : undefined
      }
    >
      <Segmented
        ariaLabel="Photo group"
        value={group}
        onChange={setGroup}
        items={[
          { value: 'all', label: 'All', count: counts.all },
          { value: 'plans', label: groupLabels.plans, count: counts.plans },
          { value: 'homes', label: groupLabels.homes, count: counts.homes },
          { value: 'construction', label: groupLabels.construction, count: counts.construction },
        ]}
      />
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((p) => {
          const used = exclude.includes(p.src)
          const isSel = selected.includes(p.src)
          return (
            <li key={p.src}>
              <button
                type="button"
                onClick={() => toggle(p.src)}
                disabled={used}
                aria-pressed={mode === 'multiple' ? isSel : undefined}
                className={cn(
                  'group relative block w-full overflow-hidden rounded-xl text-left ring-1 transition-shadow ring-inset disabled:cursor-not-allowed',
                  isSel ? 'ring-2 ring-brand-700' : 'ring-ink-200 hover:ring-brand-300',
                )}
              >
                <SmartImage src={p.src} alt="" className="aspect-[4/3] w-full" imgClassName={cn(used && 'opacity-40')} />
                <span className="block truncate bg-white px-2.5 py-2 text-xs font-medium text-ink-700">{p.label}</span>
                {isSel && (
                  <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-brand-900 text-white shadow" aria-hidden>
                    <Check className="size-4" />
                  </span>
                )}
                {used && <span className="absolute top-2 left-2 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-ink-700 shadow-sm">Already added</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}
