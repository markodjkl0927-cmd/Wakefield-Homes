import { useMemo, useState } from 'react'
import { FileSignature } from 'lucide-react'
import { useDocumentTitle } from '@/lib/utils'
import { useCurrentUser, useUsersById } from '@/store/hooks'
import { Card, EmptyState, Segmented } from '@/components/ui'
import { PageHeader } from '@/components/portal/PageHeader'
import { AgreementRow } from './components/rows'
import { agreementNeedsAction, useHomesById, useOwnerAgreements } from './components/data'

type Filter = 'all' | 'action' | 'signed' | 'void'

const emptyCopy: Record<Filter, { title: string; description: string }> = {
  all: { title: 'No agreements yet', description: 'Purchase agreements, contracts, change orders and warranties appear here as soon as your Wakefield team shares them.' },
  action: { title: 'Nothing needs your attention', description: 'You’re up to date. We’ll flag any document that needs your signature or has changed.' },
  signed: { title: 'No signed or active agreements', description: 'Once you sign a document, or a warranty becomes active, you’ll find it here.' },
  void: { title: 'No void agreements', description: 'Agreements that are canceled or replaced are kept here for your records.' },
}

export default function OwnerAgreements() {
  useDocumentTitle('My Agreements')
  const user = useCurrentUser()
  const agreements = useOwnerAgreements(user?.id)
  const homesById = useHomesById()
  const usersById = useUsersById()
  const [filter, setFilter] = useState<Filter>('all')

  const groups = useMemo(
    () => ({
      all: agreements,
      action: agreements.filter(agreementNeedsAction),
      signed: agreements.filter((a) => a.status === 'signed' || a.status === 'active'),
      void: agreements.filter((a) => a.status === 'void'),
    }),
    [agreements],
  )
  const visible = groups[filter]

  return (
    <>
      <PageHeader
        title="My Agreements"
        description="Purchase agreements, contracts, change orders and warranties for your homes. Your Wakefield team keeps them up to date — new documents are marked “New” and changed ones “Updated”."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented<Filter>
          ariaLabel="Filter agreements"
          value={filter}
          onChange={setFilter}
          className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto [&>button]:justify-center"
          items={[
            { value: 'all', label: 'All', count: groups.all.length },
            { value: 'action', label: 'Needs action', count: groups.action.length },
            { value: 'signed', label: 'Signed & active', count: groups.signed.length },
            { value: 'void', label: 'Void', count: groups.void.length },
          ]}
        />
      </div>

      <Card>
        <h2 className="sr-only">Agreements</h2>
        {visible.length === 0 ? (
          <EmptyState icon={<FileSignature className="size-6" aria-hidden />} title={emptyCopy[filter].title} description={emptyCopy[filter].description} />
        ) : (
          <ul className="divide-y divide-ink-100">
            {visible.map((a) => (
              <AgreementRow key={a.id} agreement={a} home={a.homeId ? homesById[a.homeId] : undefined} usersById={usersById} />
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
