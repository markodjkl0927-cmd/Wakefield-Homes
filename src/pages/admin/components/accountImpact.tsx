import { CalendarDays, FileSignature, History, Home as HomeIcon, Inbox, UserMinus, Wrench, type LucideIcon } from 'lucide-react'
import type { Role } from '@/types'
import type { AccountFootprint } from '@/store'
import { pluralize } from '@/lib/format'
import { cn } from '@/lib/cn'

export interface ImpactItem {
  key: string
  icon: LucideIcon
  title: string
  detail?: string
  /** Records are removed (shown in rose); otherwise they're only unassigned or kept. */
  destructive?: boolean
}

/** Home Owner records that go with the account: its homes (unassigned), appointments, requests and agreements. */
function ownerItems(fp: AccountFootprint, homesVerb: string): ImpactItem[] {
  const items: ImpactItem[] = []
  if (fp.homes) items.push({ key: 'homes', icon: HomeIcon, title: `${pluralize(fp.homes, 'home')} ${homesVerb}`, detail: 'They stay in Homes & 3D, ready to assign to another Home Owner.' })
  if (fp.appointments)
    items.push({
      key: 'appointments',
      icon: CalendarDays,
      title: `${pluralize(fp.appointments, 'appointment')} removed`,
      detail: fp.upcomingAppointments ? `${fp.upcomingAppointments} still upcoming` : 'None upcoming',
      destructive: true,
    })
  if (fp.requests)
    items.push({
      key: 'requests',
      icon: Wrench,
      title: `${pluralize(fp.requests, 'maintenance request')} removed`,
      detail: fp.openRequests ? `${fp.openRequests} still open` : 'All resolved or closed',
      destructive: true,
    })
  if (fp.agreements)
    items.push({
      key: 'agreements',
      icon: FileSignature,
      title: `${pluralize(fp.agreements, 'agreement')} removed`,
      detail: fp.unsignedAgreements ? `${fp.unsignedAgreements} not signed yet` : fp.agreements === 1 ? 'Including a signed document' : 'Including signed documents',
      destructive: true,
    })
  return items
}

/** A team member's work that is handed back: open requests, active appointments and website leads. */
function staffItems(fp: AccountFootprint): ImpactItem[] {
  const items: ImpactItem[] = []
  if (fp.assignedRequests)
    items.push({ key: 'assigned', icon: UserMinus, title: `${pluralize(fp.assignedRequests, 'open request')} unassigned`, detail: 'They go back to the team’s queue for someone else to pick up.' })
  if (fp.staffAppointments)
    items.push({
      key: 'staff-appointments',
      icon: CalendarDays,
      title: `${pluralize(fp.staffAppointments, 'appointment')} without a team member`,
      detail: 'The bookings stay. Choose someone else in Appointments.',
    })
  if (fp.leads) items.push({ key: 'leads', icon: Inbox, title: `${pluralize(fp.leads, 'website lead')} unassigned`, detail: 'They stay in Website leads.' })
  return items
}

/** Everything deleting this account changes (mirrors deleteUser in the store). */
export function deleteImpact(fp: AccountFootprint, name: string): ImpactItem[] {
  return [
    ...ownerItems(fp, 'left without an owner'),
    ...staffItems(fp),
    { key: 'log', icon: History, title: 'Their history stays in the activity log', detail: `Shown as “${name} (deleted)”.` },
  ]
}

/** Everything changing the account type changes (mirrors updateUser in the store). */
export function roleChangeImpact(fp: AccountFootprint, from: Role, to: Role): ImpactItem[] {
  if (from === to) return []
  if (from === 'homeowner') return ownerItems(fp, 'unassigned')
  if (to === 'homeowner') return staffItems(fp)
  return []
}

/** True when the change removes or reassigns something (not just the activity-log note). */
export function hasRecords(items: ImpactItem[]): boolean {
  return items.some((i) => i.key !== 'log')
}

/** "2 homes unassigned, 2 appointments removed and 1 agreement removed" — one sentence for a confirmation. */
export function impactSummary(items: ImpactItem[]): string {
  return listText(items.filter((i) => i.key !== 'log').map((i) => i.title))
}

function listText(parts: string[]): string {
  return parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

/** Toast text after a delete or a type change: "Removed 3 appointments, 3 requests and 5 agreements. 2 homes have no owner now." */
export function changeSummary(fp: AccountFootprint, { owner, staff }: { owner: boolean; staff: boolean }): string {
  const out: string[] = []
  if (owner) {
    const removed = [
      fp.appointments ? pluralize(fp.appointments, 'appointment') : '',
      fp.requests ? pluralize(fp.requests, 'request') : '',
      fp.agreements ? pluralize(fp.agreements, 'agreement') : '',
    ].filter(Boolean)
    if (removed.length) out.push(`Removed ${listText(removed)}.`)
    if (fp.homes) out.push(`${pluralize(fp.homes, 'home')} ${fp.homes === 1 ? 'has' : 'have'} no owner now.`)
  }
  if (staff) {
    if (fp.assignedRequests) out.push(`${pluralize(fp.assignedRequests, 'open request')} went back to the team’s queue.`)
    if (fp.staffAppointments) out.push(`${pluralize(fp.staffAppointments, 'appointment')} need${fp.staffAppointments === 1 ? 's' : ''} a new team member.`)
    if (fp.leads) out.push(`${pluralize(fp.leads, 'lead')} unassigned.`)
  }
  return out.join(' ')
}

/** Short preview for the Delete row: "Permanently removes the account along with 4 appointments, 3 requests and 5 agreements. 2 homes are left without an owner." */
export function deletePreview(fp: AccountFootprint): string {
  const removed = [
    fp.appointments ? pluralize(fp.appointments, 'appointment') : '',
    fp.requests ? pluralize(fp.requests, 'request') : '',
    fp.agreements ? pluralize(fp.agreements, 'agreement') : '',
  ].filter(Boolean)
  const out = [`Permanently removes the account${removed.length ? ` along with ${listText(removed)}` : ''}.`]
  if (fp.homes) out.push(`${pluralize(fp.homes, 'home')} ${fp.homes === 1 ? 'is' : 'are'} left without an owner.`)
  if (fp.assignedRequests) out.push(`${pluralize(fp.assignedRequests, 'open request')} ${fp.assignedRequests === 1 ? 'goes' : 'go'} back to the queue.`)
  return out.join(' ')
}

/** Icon list of consequences, used in the delete dialog and the role-change warning. */
export function ImpactList({ items, className }: { items: ImpactItem[]; className?: string }) {
  return (
    <ul className={cn('divide-y divide-ink-100 rounded-xl ring-1 ring-ink-200/70 ring-inset', className)}>
      {items.map((item) => (
        <li key={item.key} className="flex items-start gap-3 px-4 py-3">
          <span
            className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', item.destructive ? 'bg-rose-50 text-rose-700' : 'bg-ink-100 text-ink-600')}
            aria-hidden
          >
            <item.icon className="size-4" />
          </span>
          <div className="min-w-0 text-sm">
            <p className="font-medium text-ink-900">{item.title}</p>
            {item.detail && <p className="wrap-anywhere text-ink-500">{item.detail}</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}
