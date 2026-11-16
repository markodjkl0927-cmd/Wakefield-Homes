import { Landmark, SearchCheck, ShieldCheck, type LucideIcon } from 'lucide-react'
import { useDocumentTitle } from '@/lib/utils'
import { licenses } from '@/data/content'
import { Badge } from '@/components/ui'
import { PageHero } from '@/components/site/PageHero'
import { Section, SectionHeading } from '@/components/site/Section'
import { CTASection } from '@/components/site/CTASection'
import { AboutNav } from './company/AboutNav'
import { CopyButton } from './company/CopyButton'
import { ExternalLink } from './company/ExternalLink'

const DPOR_URL = 'https://www.dpor.virginia.gov/'

/** Spelled-out names for abbreviations used in the license labels. */
const holderNames: Record<string, string> = {
  GCC: 'Genuario Construction Company',
}

interface ParsedLicense {
  holder: string
  kind: string
  value: string
}

/** "Wakefield Homes — Virginia Class “A” Contractor’s License" -> holder + kind; "City of Alexandria Business License" -> jurisdiction + "Business license". */
function parseLicense(l: { label: string; value: string }): ParsedLicense {
  const [holder, kind] = l.label.split(' — ')
  if (kind) return { holder: holderNames[holder] ?? holder, kind, value: l.value }
  const jurisdiction = l.label.replace(/\s+Business License$/i, '')
  return { holder: jurisdiction, kind: jurisdiction === l.label ? 'License' : 'Business license', value: l.value }
}

const contractorLicenses = licenses.filter((l) => /class/i.test(l.label)).map(parseLicense)
const businessLicenses = licenses.filter((l) => !/class/i.test(l.label)).map(parseLicense)

function LicenseCard({ license, icon: Icon, badge }: { license: ParsedLicense; icon: LucideIcon; badge?: string }) {
  return (
    <li className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-200/70">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-800 ring-1 ring-brand-100" aria-hidden>
          <Icon className="size-6" />
        </span>
        {badge && (
          <Badge tone="brand" size="md">
            {badge}
          </Badge>
        )}
      </div>
      <h3 className="mt-5 text-lg font-semibold text-ink-900">{license.holder}</h3>
      <p className="mt-1 text-sm text-ink-600">{license.kind}</p>
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
        <p className="min-w-0 flex-1 rounded-lg bg-ink-50 px-3.5 py-2 ring-1 ring-ink-200 ring-inset">
          <span className="block text-[11px] font-semibold tracking-[0.14em] text-ink-500 uppercase">License no.</span>
          <code className="block font-mono text-base font-semibold tracking-wide break-all text-ink-900">{license.value}</code>
        </p>
        <CopyButton value={license.value} what={`${license.holder} license number`} toastTitle="License number copied" />
      </div>
    </li>
  )
}

export default function LicensesPage() {
  useDocumentTitle('Licenses')

  return (
    <>
      <PageHero
        eyebrow="About us"
        title="Licenses"
        description="The licenses Wakefield Homes and Genuario Construction Company hold: Commonwealth of Virginia Class “A” contractor’s licenses, and a business license in each jurisdiction where we build."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'About Us', to: '/about' }, { label: 'Licenses' }]}
      />
      <AboutNav />

      <Section>
        <SectionHeading
          eyebrow="Contractor licenses"
          title="Virginia Class A contractors"
          description="Held by Wakefield Homes and our sister company, Genuario Construction Company."
        />
        <ul className="mt-10 grid gap-6 md:grid-cols-2">
          {contractorLicenses.map((license) => (
            <LicenseCard key={license.value} license={license} icon={ShieldCheck} badge="Class A" />
          ))}
        </ul>

        <SectionHeading
          className="mt-20"
          eyebrow="Business licenses"
          title="Licensed where we build"
          description="Wakefield Homes is licensed to do business in each of the jurisdictions we serve."
        />
        <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {businessLicenses.map((license) => (
            <LicenseCard key={license.value} license={license} icon={Landmark} />
          ))}
        </ul>

        <div className="mt-16 flex flex-col gap-5 rounded-2xl bg-brand-50 p-6 ring-1 ring-brand-100 sm:flex-row sm:items-center sm:p-8">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white text-brand-800 ring-1 ring-brand-200" aria-hidden>
            <SearchCheck className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-ink-900">Verify a contractor license</h2>
            <p className="mt-1 text-ink-700">Virginia contractor licenses can be looked up with the Department of Professional and Occupational Regulation (DPOR).</p>
          </div>
          <ExternalLink
            href={DPOR_URL}
            className="h-11 shrink-0 justify-center rounded-lg bg-white px-4 text-sm font-semibold text-brand-800 shadow-sm ring-1 ring-brand-200 transition-colors hover:bg-brand-100"
          >
            Visit dpor.virginia.gov
          </ExternalLink>
        </div>
      </Section>

      <CTASection />
    </>
  )
}
