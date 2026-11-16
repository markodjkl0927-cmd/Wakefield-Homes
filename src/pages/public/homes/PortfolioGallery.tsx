import { useMemo, useState } from 'react'
import { Expand } from 'lucide-react'
import { portfolioSections, type PortfolioHome, type PortfolioPhoto } from '@/data/portfolio'
import { formatDate, pluralize } from '@/lib/format'
import { Lightbox, SmartImage, type LightboxImage } from '@/components/ui'

/** "Jun 1 – Jun 28, 2023", "Dec 4, 2025 – Mar 18, 2026" or one date; null when the photos carry no dates. */
export function photoDateRange(photos: PortfolioPhoto[]): string | null {
  const dates = photos.map((p) => p.date).filter((d): d is string => !!d).sort()
  if (!dates.length) return null
  const first = dates[0]
  const last = dates[dates.length - 1]
  if (first === last) return formatDate(first)
  const from = formatDate(first)
  const to = formatDate(last)
  // Same year: drop it from the first date ("Jun 1 – Jun 28, 2023").
  return first.slice(0, 4) === last.slice(0, 4) ? `${from.replace(/,\s*\d{4}$/, '')} – ${to}` : `${from} – ${to}`
}

export function stageAnchor(stage: string) {
  return `stage-${stage}`
}

/**
 * A home's photos from View My Home, one section per construction stage (site development → completed home),
 * in date order with captions. Every photo opens the full-screen viewer, which steps through the whole home.
 */
export function PortfolioGallery({ home }: { home: PortfolioHome }) {
  const sections = useMemo(() => portfolioSections(home), [home])
  const [index, setIndex] = useState<number | null>(null)

  // One list for the viewer, in the order the sections show them.
  const { all, starts } = useMemo(() => {
    const list: LightboxImage[] = []
    const offsets: number[] = []
    for (const s of sections) {
      offsets.push(list.length)
      for (const p of s.photos) {
        list.push({
          src: p.url,
          alt: `${home.address}: ${p.caption}`,
          caption: [s.label, p.caption, p.date ? formatDate(p.date) : null].filter(Boolean).join(' · '),
        })
      }
    }
    return { all: list, starts: offsets }
  }, [sections, home.address])

  return (
    <>
      <div className="space-y-14 sm:space-y-16">
        {sections.map((s, si) => {
          const range = photoDateRange(s.photos)
          const headingId = `${stageAnchor(s.stage)}-title`
          return (
            <section key={s.stage} id={stageAnchor(s.stage)} aria-labelledby={headingId} className="scroll-mt-36">
              <div className="flex flex-col gap-1 border-b border-ink-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.16em] text-brand-700 uppercase">Stage {si + 1}</p>
                  <h2 id={headingId} className="mt-1.5 font-display text-2xl font-semibold text-ink-900 sm:text-[1.7rem]">
                    {s.label}
                  </h2>
                </div>
                <p className="text-sm text-ink-600">
                  {pluralize(s.photos.length, 'photo')}
                  {range && <> · {range}</>}
                </p>
              </div>
              <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {s.photos.map((p, pi) => {
                  const n = starts[si] + pi
                  return (
                    <li key={`${p.url}-${pi}`} className="min-w-0">
                      {/* Named by its visible caption and date (WCAG 2.5.3), plus where it sits in the viewer for screen readers. */}
                      <button
                        type="button"
                        onClick={() => setIndex(n)}
                        className="group relative block w-full overflow-hidden rounded-2xl bg-ink-100 text-left shadow-card ring-1 ring-ink-200/70 focus-visible:outline-hidden"
                      >
                        <SmartImage src={p.url} alt="" className="aspect-square w-full" imgClassName="transition-transform duration-700 group-hover:scale-[1.04]" />
                        <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-ink-950/80 via-ink-950/40 to-transparent px-3 pt-10 pb-2.5">
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-white sm:text-[13px]">{p.caption}</span>{' '}
                            {p.date && <span className="mt-0.5 block text-[11px] text-white/85 tabular-nums sm:text-xs">{formatDate(p.date)}</span>}
                            <span className="sr-only">
                              {' '}
                              — open photo {n + 1} of {all.length}
                            </span>
                          </span>
                          <Expand className="size-3.5 shrink-0 text-white/90 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
                        </span>
                        {/* Focus ring above the photo (navy band + white line), visible on any photo. */}
                        <span
                          className="pointer-events-none absolute inset-0 hidden rounded-2xl shadow-[inset_0_0_0_4px_var(--color-brand-800),inset_0_0_0_7px_white] group-focus-visible:block"
                          aria-hidden
                        />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
      <Lightbox images={all} index={index} onClose={() => setIndex(null)} onIndexChange={setIndex} />
    </>
  )
}
