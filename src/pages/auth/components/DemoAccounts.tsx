import { useMemo } from 'react'
import { MousePointerClick } from 'lucide-react'
import { DEMO_PASSWORD } from '@/data/seed'
import { roleLabels } from '@/data/labels'
import { useAppStore } from '@/store'
import { Avatar, Badge, Button } from '@/components/ui'
import type { Portal } from './authUtils'

const demoByPortal: Record<Portal, { email: string; blurb: string }[]> = {
  homeowner: [
    { email: 'daniel@example.com', blurb: 'Two homes — one finished, one being built' },
    { email: 'priya@example.com', blurb: 'Finished home with an open report' },
    { email: 'olivia@example.com', blurb: 'Home in interior finishes' },
  ],
  staff: [
    { email: 'sarah@wakefieldhomes.test', blurb: 'Customer Care Manager' },
    { email: 'tom@wakefieldhomes.test', blurb: 'Construction Manager' },
    { email: 'admin@wakefieldhomes.test', blurb: 'Full access to every feature' },
  ],
}

/** One-click sign-in for the presentation's sample accounts. */
export function DemoAccounts({ portal, pendingEmail, onPick }: { portal: Portal; pendingEmail: string | null; onPick: (email: string) => void }) {
  const users = useAppStore((s) => s.users)
  const rows = useMemo(
    () =>
      demoByPortal[portal]
        .map((d) => ({ ...d, user: users.find((u) => u.email.toLowerCase() === d.email) }))
        .filter((r): r is typeof r & { user: NonNullable<typeof r.user> } => !!r.user),
    [users, portal],
  )
  if (!rows.length) return null
  return (
    <section aria-labelledby="demo-accounts-title" className="rounded-2xl bg-ink-50 p-4 ring-1 ring-ink-200/70 ring-inset sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 id="demo-accounts-title" className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <MousePointerClick className="size-4 text-brand-700" aria-hidden />
          Demo accounts
        </h2>
        <p className="text-xs text-ink-600">
          Password{' '}
          <code className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[13px] font-semibold text-ink-900 ring-1 ring-ink-200">{DEMO_PASSWORD}</code>
        </p>
      </div>
      <p className="mt-1 text-xs text-ink-600">Presentation prototype — sign in to any sample account with one click.</p>
      <ul className="mt-4 space-y-2">
        {rows.map(({ email, blurb, user }) => (
          <li key={email} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-ink-200/70">
            <Avatar name={user.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold text-ink-900">
                {user.name}
                {portal === 'staff' && <Badge tone={user.role === 'admin' ? 'brand' : 'neutral'}>{roleLabels[user.role]}</Badge>}
              </p>
              <p className="truncate text-xs text-ink-600">{email}</p>
              <p className="hidden truncate text-xs text-ink-500 sm:block">{blurb}</p>
            </div>
            <Button variant="secondary" onClick={() => onPick(email)} loading={pendingEmail === email} disabled={!!pendingEmail && pendingEmail !== email} aria-label={`Sign in as ${user.name}`}>
              Sign in
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
