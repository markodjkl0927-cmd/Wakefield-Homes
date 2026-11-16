import { Link } from 'react-router'
import { CalendarDays, Phone } from 'lucide-react'
import { buttonStyles } from '@/components/ui'
import { useOffice } from '@/store/hooks'

/** Closing call-to-action band used at the bottom of most public pages. */
export function CTASection({
  title = 'Let’s talk about your new home',
  description = 'Tell us what you’re looking for — a move-in ready home, a plan for your own lot, or something fully custom — and a member of the Wakefield team will be in touch.',
}: {
  title?: string
  description?: string
}) {
  const office = useOffice()
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="container-page">
        <div className="relative isolate overflow-hidden rounded-3xl bg-brand-900 px-6 py-12 shadow-pop sm:px-12 sm:py-16">
          <div className="absolute -top-20 -right-16 -z-10 size-80 rounded-full bg-brand-500/40 blur-3xl" aria-hidden />
          <div className="absolute -bottom-24 -left-10 -z-10 size-72 rounded-full bg-lavender-400/30 blur-3xl" aria-hidden />
          <div className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="display-heading text-3xl !text-white sm:text-4xl">{title}</h2>
              <p className="mt-4 max-w-xl text-lg leading-8 text-brand-100">{description}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:justify-end xl:flex-row">
              <Link to="/contact" className={buttonStyles('white', 'lg')}>
                <CalendarDays className="size-5" aria-hidden /> Schedule a consultation
              </Link>
              <a href={`tel:${office.phone}`} className={buttonStyles('periwinkle', 'lg')}>
                <Phone className="size-5" aria-hidden /> {office.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
