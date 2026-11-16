import { ArrowRight, Clock, KeyRound, Mail, MapPin, Phone } from 'lucide-react'
import { ButtonLink } from '@/components/ui'
import { ExternalLink } from '../ExternalLink'
import { useOffice } from '@/store/hooks'

/**
 * Right-hand column of the Contact page: office details, map and the Home Owner portal shortcut.
 * Everything comes from Platform settings (useOffice), so a Super Admin's edits show here — including a
 * map of a changed address. The email row only appears when an office email is set.
 */
export function ContactAside() {
  const office = useOffice()
  const addressLines = [office.address, office.cityLine].filter(Boolean)

  return (
    <div className="space-y-6">
      <section aria-labelledby="contact-office-title" className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink-200/70">
        <div className="p-6 sm:p-8">
          <h2 id="contact-office-title" className="text-sm font-semibold tracking-[0.16em] wrap-anywhere text-brand-700 uppercase">
            {office.name}
          </h2>

          <p className="mt-6 text-sm font-medium text-ink-500">Call us</p>
          <a
            href={`tel:${office.phone}`}
            className="mt-1 inline-flex items-center gap-3 font-display text-3xl font-semibold tracking-tight text-brand-900 underline-offset-4 hover:underline sm:text-4xl"
          >
            <Phone className="size-6 shrink-0 text-brand-700" aria-hidden />
            {office.phoneDisplay}
          </a>

          <ul className="mt-8 space-y-5 border-t border-ink-100 pt-6">
            {office.email && (
              <li className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-800" aria-hidden>
                  <Mail className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-500">Email</p>
                  <a href={`mailto:${office.email}`} className="font-semibold break-all text-brand-800 underline-offset-4 hover:underline">
                    {office.email}
                  </a>
                </div>
              </li>
            )}
            <li className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-800" aria-hidden>
                <MapPin className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-500">Office</p>
                <address className="wrap-anywhere text-ink-900 not-italic">
                  {addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-800" aria-hidden>
                <Clock className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-500">Office hours</p>
                <p className="wrap-anywhere text-ink-900">{office.hours}</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="border-t border-ink-100 bg-ink-100">
          <iframe
            title={`Map showing the ${office.name} office at ${office.fullAddress}`}
            src={office.mapEmbed}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="block aspect-[4/3] w-full border-0"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 sm:px-8">
          <p className="min-w-0 text-sm wrap-anywhere text-ink-600">{addressLines[0]}</p>
          <ExternalLink href={office.mapLink} className="text-sm font-semibold text-brand-800 underline-offset-4 hover:underline">
            Open in maps
          </ExternalLink>
        </div>
      </section>

      <section aria-labelledby="contact-owner-title" className="relative isolate overflow-hidden rounded-2xl bg-brand-900 p-6 shadow-card sm:p-8">
        <div className="absolute -right-12 -bottom-16 -z-10 size-48 rounded-full bg-brand-500/40 blur-3xl" aria-hidden />
        <span className="flex size-11 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20" aria-hidden>
          <KeyRound className="size-5" />
        </span>
        <h2 id="contact-owner-title" className="mt-5 font-display text-2xl font-semibold !text-white">
          Already a Home Owner?
        </h2>
        <p className="mt-2 leading-7 text-brand-100">
          Request maintenance, book an appointment with our office or review your agreements anytime in the Home Owner portal.
        </p>
        <ButtonLink to="/access/homeowners" variant="white" size="lg" className="mt-6" rightIcon={<ArrowRight className="size-4" aria-hidden />}>
          Home Owner login
        </ButtonLink>
      </section>
    </div>
  )
}
