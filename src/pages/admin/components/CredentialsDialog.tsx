import { useEffect, useId, useRef, useState } from 'react'
import { Check, Copy, Home as HomeIcon, Mail } from 'lucide-react'
import type { Role } from '@/types'
import { cn } from '@/lib/cn'
import { toast } from '@/store/ui'
import { Alert, Button, Modal } from '@/components/ui'
import { firstName } from './meta'

/**
 * What the Super Admin needs to hand over after creating an account, re-sending an invitation or resetting
 * a password. The demo sends no email, so the dialog says so and shows the invitation the person would get.
 */
export interface Credentials {
  mode: 'invited' | 'created' | 'resent' | 'reset'
  name: string
  email: string
  role: Role
  password: string
  /** Homes assigned while creating the account. offMarket: it was listed for sale; underContract: its status changed to Under contract. */
  homes?: { title: string; offMarket: boolean; underContract?: boolean }[]
}

/** The page the person signs in on: Home Owners use the Home Owner login, everyone else the Staff login. */
function signInPath(role: Role) {
  return role === 'homeowner' ? '/access/homeowners' : '/access/staff'
}

function invitationText(c: Credentials, url: string) {
  const portal = c.role === 'homeowner' ? 'Home Owner portal' : 'Wakefield Homes staff workspace'
  return [
    `Hi ${firstName(c.name)},`,
    '',
    c.mode === 'resent'
      ? `Here’s a fresh invitation to your ${portal}. The password in our earlier email no longer works.`
      : `Wakefield Homes has set up your ${portal} account.`,
    '',
    `Sign in at ${url}`,
    `Email: ${c.email}`,
    `Temporary password: ${c.password}`,
    '',
    c.role === 'homeowner' ? 'Once you’re in, you can choose your own password under My profile.' : 'Questions? Call the office and we’ll help you sign in.',
    '',
    'Wakefield Homes',
  ].join('\n')
}

export function CredentialsDialog({ value, onClose }: { value: Credentials | null; onClose: () => void }) {
  if (!value) return null
  return <CredentialsPanel key={`${value.mode}-${value.email}-${value.password}`} value={value} onClose={onClose} />
}

function CredentialsPanel({ value, onClose }: { value: Credentials; onClose: () => void }) {
  const ids = useId()
  const first = firstName(value.name)
  const url = `${window.location.origin}${signInPath(value.role)}`
  const invite = value.mode === 'invited' || value.mode === 'resent'
  const letter = invitationText(value, url)

  const title = { invited: 'Account created', created: 'Account created', resent: 'Invitation ready', reset: 'Temporary password' }[value.mode]
  const description = {
    invited: `${value.name} is invited and shows as Invited until their first sign-in.`,
    created: `${value.name} can sign in now.`,
    resent: `A new invitation for ${value.name}.`,
    reset: `For ${value.name}. Their old password no longer works.`,
  }[value.mode]

  return (
    <Modal open onClose={onClose} size="md" title={<span className="wrap-anywhere">{title}</span>} description={<span className="wrap-anywhere">{description}</span>} footer={<Button onClick={onClose}>Done</Button>}>
      <div className="space-y-5">
        {invite ? (
          <Alert tone="info" title="Presentation demo: no email is sent">
            In the live platform this invitation goes to <span className="font-medium wrap-anywhere">{value.email}</span>
            {value.mode === 'resent' ? ', with a new temporary password that replaces the first one' : ''}. For now, share the sign-in details with {first}{' '}
            yourself, for example by phone.
          </Alert>
        ) : (
          <p className="text-sm text-ink-600">
            {value.mode === 'reset'
              ? `Share the new temporary password with ${first} securely, for example by phone.`
              : `No invitation was sent. Share these sign-in details with ${first} yourself, for example by phone.`}
          </p>
        )}

        <section aria-labelledby={`${ids}-details`} className="rounded-xl bg-ink-25 p-4 ring-1 ring-ink-200/70 ring-inset">
          <h3 id={`${ids}-details`} className="text-xs font-medium tracking-wide text-ink-500 uppercase">
            Sign-in details
          </h3>
          <dl className="mt-3 space-y-3 text-sm">
            <div className="grid gap-0.5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-3">
              <dt className="text-ink-500">Sign-in page</dt>
              <dd className="min-w-0 wrap-anywhere text-ink-900">
                {value.role === 'homeowner' ? 'Home Owner login' : 'Staff login'} <span className="text-ink-500">({signInPath(value.role)})</span>
              </dd>
            </div>
            <div className="grid gap-0.5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-3">
              <dt className="text-ink-500">Email</dt>
              <dd className="min-w-0 wrap-anywhere text-ink-900">{value.email}</dd>
            </div>
            <div className="pt-1">
              <dt className="text-ink-500">Temporary password</dt>
              <dd className="mt-1.5 flex min-w-0 items-center gap-2">
                <code className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2 font-mono text-base tracking-wide wrap-anywhere text-ink-900 ring-1 ring-ink-200 ring-inset">
                  {value.password}
                </code>
                <CopyButton text={value.password} label="Copy" ariaLabel="Copy password" copiedLabel="Password copied" size="md" />
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-ink-500">Shown only here. Copy it before you close this window; you can reset it later if needed.</p>
        </section>

        {value.homes && value.homes.length > 0 && (
          <section aria-labelledby={`${ids}-homes`}>
            <h3 id={`${ids}-homes`} className="text-sm font-semibold text-ink-900">
              In {first}’s portal
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {value.homes.map((h) => (
                <li key={h.title} className="flex items-start gap-2 text-ink-700">
                  <HomeIcon className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden />
                  <span className="min-w-0 wrap-anywhere">
                    {h.title}
                    {h.offMarket && <span className="text-ink-500"> · {h.underContract ? 'now Under contract and off the market' : 'now off the market'}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {invite && <InvitationPreview to={value.email} subject={value.mode === 'resent' ? 'Your new Wakefield Homes invitation' : 'Your Wakefield Homes account is ready'} body={letter} />}
      </div>
    </Modal>
  )
}

function InvitationPreview({ to, subject, body }: { to: string; subject: string; body: string }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={headingId} className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <Mail className="size-4 text-ink-500" aria-hidden />
          Invitation preview
        </h3>
        <CopyButton text={`Subject: ${subject}\n\n${body}`} label="Copy invitation" copiedLabel="Invitation copied" variant="ghost" />
      </div>
      <div className="mt-2 overflow-hidden rounded-xl ring-1 ring-ink-200 ring-inset">
        <dl className="space-y-1 border-b border-ink-100 bg-ink-25 px-4 py-3 text-sm">
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-ink-500">To</dt>
            <dd className="min-w-0 wrap-anywhere text-ink-900">{to}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-ink-500">Subject</dt>
            <dd className="min-w-0 font-medium text-ink-900">{subject}</dd>
          </div>
        </dl>
        <p className="px-4 py-3 text-sm leading-6 text-user text-ink-700">{body}</p>
      </div>
    </section>
  )
}

/** Copies text to the clipboard and confirms it inline (and in a toast). */
function CopyButton({
  text,
  label,
  ariaLabel,
  copiedLabel,
  variant = 'secondary',
  size = 'sm',
}: {
  text: string
  label: string
  /** Fuller name when the visible label is short ("Copy" → "Copy password"). */
  ariaLabel?: string
  copiedLabel: string
  variant?: 'secondary' | 'ghost'
  size?: 'sm' | 'md'
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success(copiedLabel)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.info('Copy it by hand', 'Your browser blocked automatic copying. Select the text and press Ctrl+C.')
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={copy}
      aria-label={copied ? undefined : ariaLabel}
      className={cn(variant === 'ghost' && '-mr-2')}
      leftIcon={copied ? <Check className="size-4 text-emerald-600" aria-hidden /> : <Copy className="size-4" aria-hidden />}
    >
      {copied ? 'Copied' : label}
    </Button>
  )
}
