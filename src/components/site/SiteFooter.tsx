import { Link } from 'react-router'
import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import { social } from '@/data/content'
import { Wordmark } from './Wordmark'
import { footerNav } from './nav'
import { useOffice } from '@/store/hooks'

/** Site footer in the live site's charcoal (#545454) with white text and periwinkle accents. */
export function SiteFooter() {
  const office = useOffice()
  const year = new Date().getFullYear()
  return (
    <footer className="border-t-4 border-brand-300 bg-charcoal-600 text-white">
      <div className="container-page grid gap-10 py-14 sm:py-16 lg:grid-cols-[1.15fr_2fr] lg:gap-12">
        <div className="max-w-sm">
          <Wordmark tone="light" />
          <p className="mt-5 text-sm leading-6 text-white/80">
            Award-winning custom homes in Alexandria, Fairfax County and Arlington. Building homes in Northern Virginia since 1970.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden />
              <a href={office.mapLink} target="_blank" rel="noreferrer" className="hover:underline">
                {office.fullAddress}
              </a>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden />
              <a href={`tel:${office.phone}`} className="font-semibold hover:underline">
                {office.phoneDisplay}
              </a>
            </li>
            {office.email && (
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden />
                <a href={`mailto:${office.email}`} className="break-all hover:underline">
                  {office.email}
                </a>
              </li>
            )}
            {office.hours && (
              <li className="flex gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden />
                <span>{office.hours}</span>
              </li>
            )}
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-4 sm:gap-x-8">
          {footerNav.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-xs font-semibold tracking-[0.16em] text-brand-200 uppercase">{col.title}</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.to + l.label}>
                    <Link to={l.to} className="text-white/85 underline-offset-4 transition-colors hover:text-white hover:underline hover:decoration-brand-300">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="container-page flex flex-col gap-4 py-6 text-xs text-white/75 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} Wakefield Homes, LC · Virginia Class A Contractor · Presentation prototype — listings, prices and portal data are samples.
          </p>
          <ul className="flex gap-4">
            {social.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noreferrer" className="text-white/85 hover:text-white hover:underline">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
