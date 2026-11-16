import { useId, useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { compressImage } from '@/lib/utils'
import { toast } from '@/store/ui'

/**
 * Attach up to `max` photos. Files are downscaled (compressImage: about 1280 px on the longest side,
 * JPEG quality 0.7) so they can be kept in the demo store; thumbnails can be removed before submitting.
 */
export function PhotoPicker({ photos, onChange, max = 3 }: { photos: string[]; onChange: (photos: string[]) => void; max?: number }) {
  const inputId = useId()
  const hintId = useId()
  const [busy, setBusy] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return
    const images = Array.from(list).filter((f) => f.type.startsWith('image/'))
    const room = max - photos.length
    if (images.length < list.length) toast.error('Only image files can be attached')
    if (images.length > room) toast.info(`You can attach up to ${max} photos`, `The first ${room === 1 ? 'photo was' : `${room} photos were`} added.`)
    const chosen = images.slice(0, Math.max(0, room))
    if (!chosen.length) return
    setBusy(true)
    try {
      const urls = await Promise.all(chosen.map((f) => compressImage(f)))
      onChange([...photos, ...urls].slice(0, max))
    } catch {
      toast.error('That photo couldn’t be added', 'Please try a JPG or PNG image.')
    } finally {
      setBusy(false)
    }
  }

  const remove = (index: number) => {
    onChange(photos.filter((_, j) => j !== index))
    // Keep keyboard users in place: the next photo's remove button, else the previous one, else "Add photo".
    requestAnimationFrame(() => {
      const buttons = listRef.current?.querySelectorAll<HTMLElement>('[data-remove-photo]')
      const target = buttons?.[Math.min(index, buttons.length - 1)] ?? document.getElementById(inputId)
      target?.focus()
    })
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-ink-800">Photos</p>
        <span className="text-xs text-ink-500">Optional</span>
      </div>
      <p id={hintId} className="mt-0.5 text-xs text-ink-500">
        Up to {max} photos help our team understand the issue before they visit.
      </p>
      <ul ref={listRef} className="mt-3 flex flex-wrap gap-3">
        {photos.map((src, i) => (
          <li key={`${i}-${src.slice(-24)}`} className="relative size-24 overflow-hidden rounded-xl bg-ink-100 ring-1 ring-ink-200 sm:size-28">
            <img src={src} alt={`Attached photo ${i + 1}`} className="size-full object-cover" />
            <button
              type="button"
              data-remove-photo
              onClick={() => remove(i)}
              className="absolute top-1 right-1 flex size-10 items-center justify-center rounded-full text-white focus-visible:outline-white"
              aria-label={`Remove photo ${i + 1}`}
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-ink-950/70 shadow-sm backdrop-blur-sm transition-colors hover:bg-ink-950">
                <X className="size-4" aria-hidden />
              </span>
            </button>
          </li>
        ))}
        {photos.length < max && (
          <li>
            <label
              htmlFor={inputId}
              className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-ink-300 bg-white text-ink-600 transition-colors hover:border-brand-400 hover:bg-brand-50/60 hover:text-brand-800 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-500 sm:size-28"
            >
              {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <ImagePlus className="size-5" aria-hidden />}
              <span className="text-xs font-semibold">{busy ? 'Adding…' : 'Add photo'}</span>
              <span className="text-[11px] text-ink-500 tabular-nums">
                {photos.length}/{max}
              </span>
              <input
                id={inputId}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                aria-describedby={hintId}
                aria-busy={busy || undefined}
                onChange={(e) => {
                  if (busy) return
                  void addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
          </li>
        )}
      </ul>
    </div>
  )
}
