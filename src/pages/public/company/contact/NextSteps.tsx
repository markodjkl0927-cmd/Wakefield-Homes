import { HeartHandshake, MailCheck, PhoneCall } from 'lucide-react'

const steps = [
  { icon: MailCheck, title: 'We read your message', body: 'Your inquiry goes straight to the Wakefield team.' },
  { icon: PhoneCall, title: 'We get in touch', body: 'A Wakefield representative will contact you, at the time of day that suits you.' },
  { icon: HeartHandshake, title: 'We plan together', body: 'We help make your dreams and ideas for your home a reality.' },
]

/** Sets expectations after the form: what the visitor can expect once they hit "Send". */
export function NextSteps() {
  return (
    <section aria-labelledby="contact-next-title" className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-200/70 sm:p-8">
      <h2 id="contact-next-title" className="text-sm font-semibold tracking-[0.16em] text-brand-700 uppercase">
        What happens next
      </h2>
      <ol className="mt-6 grid gap-6 sm:grid-cols-3 sm:gap-5">
        {steps.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="flex gap-4 sm:block">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-800 ring-1 ring-brand-100" aria-hidden>
              <Icon className="size-5" />
            </span>
            <div className="sm:mt-4">
              <h3 className="font-semibold text-ink-900">
                <span className="sr-only">Step {i + 1}: </span>
                {title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-ink-600">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
