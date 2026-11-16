import { Clock, Mail, Phone } from 'lucide-react'
import { useDocumentTitle } from '@/lib/utils'
import { vpdes } from '@/data/content'
import { SmartImage } from '@/components/ui'
import { PageHero } from '@/components/site/PageHero'
import { Section } from '@/components/site/Section'
import { useOffice } from '@/store/hooks'

/**
 * VPDES — mirrors the live page (https://wakefieldhomeslc.com/vpdes/): its title and the site photo it shows.
 * The live page publishes no permit numbers or stormwater commitments, so this page makes none either.
 */
export default function VpdesPage() {
  const office = useOffice()
  useDocumentTitle('VPDES')

  return (
    <>
      <PageHero size="sm" title={vpdes.title} crumbs={[{ label: 'Home', to: '/' }, { label: 'VPDES' }]} />

      <Section className="pt-10 sm:pt-14">
        <SmartImage
          src={vpdes.photo}
          alt={vpdes.photoAlt}
          priority
          className="mx-auto aspect-[3/2] w-full max-w-5xl rounded-3xl shadow-lift ring-1 ring-ink-200/70"
        />

        <div className="mx-auto mt-10 flex max-w-5xl flex-col gap-4 rounded-2xl bg-ink-50 p-5 ring-1 ring-ink-200/70 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-sm leading-6 text-ink-700">
            <span className="font-semibold text-ink-900">Questions about this page?</span> Contact our office.
          </p>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <li>
              <a href={`tel:${office.phone}`} className="inline-flex min-h-10 items-center gap-2 font-semibold text-brand-800 underline-offset-4 hover:underline">
                <Phone className="size-4" aria-hidden /> {office.phoneDisplay}
              </a>
            </li>
            {office.email && (
              <li className="min-w-0">
                <a
                  href={`mailto:${office.email}?subject=${encodeURIComponent('VPDES')}`}
                  className="inline-flex min-h-10 items-center gap-2 font-semibold break-all text-brand-800 underline-offset-4 hover:underline"
                >
                  <Mail className="size-4 shrink-0" aria-hidden /> {office.email}
                </a>
              </li>
            )}
            <li className="flex items-center gap-2 text-ink-600">
              <Clock className="size-4 shrink-0 text-ink-400" aria-hidden /> {office.hours}
            </li>
          </ul>
        </div>
      </Section>
    </>
  )
}
