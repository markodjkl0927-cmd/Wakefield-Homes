import { useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { Mail, MessageSquareOff, Phone } from 'lucide-react'
import { useDocumentTitle } from '@/lib/utils'
import { contactIntro } from '@/data/content'
import { getModel } from '@/data/models'
import { getCommunity } from '@/data/communities'
import { useAppStore } from '@/store'
import { buttonStyles } from '@/components/ui'
import { PageHero } from '@/components/site/PageHero'
import { Section } from '@/components/site/Section'
import { ContactForm } from './company/contact/ContactForm'
import { ContactAside } from './company/contact/ContactAside'
import { NextSteps } from './company/contact/NextSteps'
import { isBestTime, isLeadInterest, type ContactValues } from './company/contact/validation'
import { useOffice } from '@/store/hooks'

export default function ContactPage() {
  // Office details come from Platform settings (editable by the Super Admin).
  const office = useOffice()
  useDocumentTitle('Contact Us')
  const [params] = useSearchParams()
  const { search } = useLocation()
  const homes = useAppStore((s) => s.homes)
  const formEnabled = useAppStore((s) => s.settings.features.contactForm)

  const homeSlug = params.get('home')
  const home = useMemo(() => (homeSlug ? homes.find((h) => h.slug === homeSlug && h.published) : undefined), [homes, homeSlug])
  const modelParam = params.get('model')
  const interestParam = params.get('interest')
  const timeParam = params.get('time')

  const initial = useMemo<Partial<ContactValues>>(() => {
    const values: Partial<ContactValues> = {}
    if (isLeadInterest(interestParam)) values.interest = interestParam
    if (isBestTime(timeParam)) values.bestTime = timeParam
    const model = modelParam ? getModel(modelParam) : undefined
    if (model) values.modelSlug = model.slug
    if (home) {
      const community = home.communityId ? getCommunity(home.communityId) : undefined
      // Single-home projects are named after their address — don't repeat it.
      const where = community && community.name !== home.address ? ` at ${community.name}` : ''
      values.interest = 'move-in-ready'
      values.modelSlug = getModel(home.modelId)?.slug ?? values.modelSlug
      values.message = `I’m interested in ${home.title}${where}. Please send me more information.`
    }
    return values
  }, [home, modelParam, interestParam, timeParam])

  return (
    <>
      <PageHero size="sm" title="Contact us" description={contactIntro} crumbs={[{ label: 'Home', to: '/' }, { label: 'Contact Us' }]}>
        {/* Quick actions for phones; on large screens the contact card sits beside the form. */}
        <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap lg:hidden">
          <a href={`tel:${office.phone}`} className={buttonStyles('primary', 'lg')}>
            <Phone className="size-5" aria-hidden /> Call {office.phoneDisplay}
          </a>
          {office.email && (
            <a href={`mailto:${office.email}`} className={buttonStyles('secondary', 'lg')}>
              <Mail className="size-5" aria-hidden /> Email us
            </a>
          )}
        </div>
      </PageHero>

      <Section tone="tint" className="pt-10 sm:pt-14">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="min-w-0 space-y-6 lg:col-span-7">
            <div className="rounded-2xl bg-white shadow-card ring-1 ring-ink-200/70">
              {formEnabled ? (
                // Re-key on the query string so following a new ?model= / ?home= link resets the prefill.
                <ContactForm key={search} initial={initial} home={home} officePhone={office.phone} />
              ) : (
                <FormPausedNotice />
              )}
            </div>
            {formEnabled && <NextSteps />}
          </div>
          <aside className="lg:col-span-5" aria-label="Contact details">
            <ContactAside />
          </aside>
        </div>
      </Section>
    </>
  )
}

/** Shown instead of the form when a Super Admin turns the website contact form off in Platform settings. */
function FormPausedNotice() {
  const office = useOffice()
  return (
    <section aria-labelledby="contact-paused-title" className="p-6 sm:p-10">
      <span className="flex size-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200" aria-hidden>
        <MessageSquareOff className="size-6" />
      </span>
      <h2 id="contact-paused-title" className="mt-6 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
        Online inquiries are paused
      </h2>
      <p className="mt-3 max-w-prose leading-7 text-ink-600">
        Our online form is temporarily unavailable. Please call us{office.email ? ' or send an email' : ''} instead — a Wakefield representative will be happy to
        help.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <a href={`tel:${office.phone}`} className={buttonStyles('primary', 'lg')}>
          <Phone className="size-5" aria-hidden /> Call {office.phoneDisplay}
        </a>
        {office.email && (
          <a href={`mailto:${office.email}`} className={buttonStyles('secondary', 'lg', 'min-w-0')}>
            <Mail className="size-5 shrink-0" aria-hidden />
            <span className="truncate">{office.email}</span>
          </a>
        )}
      </div>
      <p className="mt-6 text-sm text-ink-600">Office hours: {office.hours}</p>
    </section>
  )
}
