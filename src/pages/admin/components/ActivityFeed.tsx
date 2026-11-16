import { History } from 'lucide-react'
import type { ActivityEntry } from '@/types'
import { formatDateTime, formatRelative } from '@/lib/format'
import { usePersonLookup } from '@/store/hooks'
import { EmptyState } from '@/components/ui'
import { ActorAvatar, KindBadge, ViewingAsNote } from './bits'
import { displayTarget, personLabel, viewingAs } from './meta'

/**
 * Compact, sentence-style activity list used on the overview and in the account drawer:
 * "Alex Morgan (viewing as Daniel Ellis) signed agreement Change Order #3".
 */
export function ActivityFeed({ entries, emptyTitle = 'No activity yet', emptyDescription }: { entries: ActivityEntry[]; emptyTitle?: string; emptyDescription?: string }) {
  const person = usePersonLookup()
  if (!entries.length) {
    return <EmptyState compact icon={<History className="size-6" aria-hidden />} title={emptyTitle} description={emptyDescription} />
  }
  return (
    <ol className="divide-y divide-ink-100">
      {entries.map((entry) => {
        const target = displayTarget(entry, person)
        const as = viewingAs(entry, person)
        return (
          <li key={entry.id} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
            <ActorAvatar actorId={entry.actorId} user={person(entry.actorId)?.user} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-6 text-ink-600">
                <span className="font-semibold wrap-anywhere text-ink-900">{personLabel(entry.actorId, person)}</span>
                {as && (
                  <>
                    {' '}
                    <ViewingAsNote name={as.label} />
                  </>
                )}{' '}
                {entry.action}
                {target && (
                  <>
                    {' '}
                    <span className="font-medium wrap-anywhere text-ink-800">{target}</span>
                  </>
                )}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <KindBadge kind={entry.kind} />
                <time dateTime={entry.at} title={formatDateTime(entry.at)} className="text-xs text-ink-500">
                  {formatRelative(entry.at)}
                </time>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
