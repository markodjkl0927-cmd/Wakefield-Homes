import { Link } from 'react-router'
import { ArrowRight, Bath, BedDouble, Home as HomeIcon, MapPin, PencilRuler, Phone, Ruler } from 'lucide-react'
import type { Home } from '@/types'
import { useDocumentTitle } from '@/lib/utils'
import { formatNumber } from '@/lib/format'
import { getModel } from '@/data/models'
import { useCan3d, useCurrentUser, useHomesByOwner, useOffice, useSettings } from '@/store/hooks'
import { ButtonLink, Card, EmptyState, SmartImage, StatusBadge, buttonStyles } from '@/components/ui'
import { Spec, ThreeDChip } from '@/components/site/cards'
import { PageHeader } from '@/components/portal/PageHeader'
import { View3DButton } from '@/three/View3DButton'
import { Home3DDetails, HomeStatusSummary, hasSpec, ownerHomeStatus } from './components/homeBits'

function OwnerHomeCard({ home }: { home: Home }) {
  const model = getModel(home.modelId)
  const can3d = useCan3d(home)
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink-200/70">
      <Link to={`/owner/homes/${home.id}`} className="group relative block focus-visible:outline-offset-[-3px]" tabIndex={-1} aria-hidden>
        <SmartImage src={home.images[0] ?? model?.image} alt="" className="aspect-[16/9] w-full" imgClassName="transition-transform duration-700 group-hover:scale-[1.03]" />
        <span className="absolute top-3 left-3">
          <StatusBadge def={ownerHomeStatus(home)} className="bg-white/95 shadow-sm" />
        </span>
        {can3d && <ThreeDChip className="absolute top-3 right-3" />}
      </Link>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h2 className="text-lg font-semibold wrap-anywhere text-ink-900">
          <Link to={`/owner/homes/${home.id}`} className="rounded-sm hover:text-brand-800">
            {home.title}
          </Link>
        </h2>
        <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-600">
          <MapPin className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
          {home.address}, {home.city}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {model && <Spec icon={<PencilRuler />}>{model.name} plan</Spec>}
          {hasSpec(home, 'beds') && <Spec icon={<BedDouble />}>{home.beds} beds</Spec>}
          {hasSpec(home, 'baths') && <Spec icon={<Bath />}>{home.baths} baths</Spec>}
          {hasSpec(home, 'sqft') && <Spec icon={<Ruler />}>{formatNumber(home.sqft)} sq ft</Spec>}
        </div>
        <HomeStatusSummary home={home} className="mt-5 rounded-xl bg-ink-50 p-4 ring-1 ring-ink-200/60 ring-inset" />
        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          <ButtonLink to={`/owner/homes/${home.id}`} rightIcon={<ArrowRight className="size-4" aria-hidden />}>
            View details
          </ButtonLink>
          {can3d && (
            <View3DButton
              title={home.title}
              subtitle={`${model?.name ?? 'Your home'} · ${home.address}, ${home.city}`}
              config={home.view3d.config}
              customModelId={home.view3d.hasCustomModel ? home.id : null}
              details={<Home3DDetails home={home} />}
            />
          )}
        </div>
      </div>
    </article>
  )
}

export default function OwnerHomes() {
  useDocumentTitle('My Homes')
  const user = useCurrentUser()
  const homes = useHomesByOwner(user?.id)
  const office = useOffice()
  // 3D is only promised while a Super Admin has 3D viewing switched on.
  const view3dOn = useSettings().features.view3d

  return (
    <>
      <PageHeader
        title="My Homes"
        description={
          view3dOn
            ? 'Follow construction, browse photos, see your home in 3D and find the documents and service history for each home.'
            : 'Follow construction, browse photos and find the documents and service history for each home.'
        }
      />
      {homes.length === 0 ? (
        <Card>
          <EmptyState
            icon={<HomeIcon className="size-6" aria-hidden />}
            title="No homes on your account yet"
            description={`When Wakefield adds a home to your account, its progress, photos${view3dOn ? ', 3D view' : ''} and documents will appear here.`}
            action={
              <a href={`tel:${office.phone}`} className={buttonStyles('secondary', 'md')}>
                <Phone className="size-4" aria-hidden /> Call {office.phoneDisplay}
              </a>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {homes.map((h) => (
            <OwnerHomeCard key={h.id} home={h} />
          ))}
        </div>
      )}
    </>
  )
}
