import { Link } from 'react-router'
import { boylExclusions, constructionLoanPoints, includedFeaturesDoc, loanToValue, priceListText } from '@/data/content'
import { useOffice } from '@/store/hooks'
import { PRICE_AS_OF } from '@/data/models'
import { Bullets, type FaqItem } from './shared'

const link = 'font-semibold text-brand-800 underline-offset-4 hover:underline'

/** Office phone from Platform settings (FAQ answers are static JSX, so the hook lives in this tiny component). */
function OfficePhoneLink() {
  const office = useOffice()
  return (
    <a href={`tel:${office.phone}`} className={link}>
      {office.phoneDisplay}
    </a>
  )
}

function listSentence(items: string[]) {
  if (items.length < 2) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

function IncludedFeaturesPdfLink() {
  return (
    <a href={includedFeaturesDoc.pdfUrl} target="_blank" rel="noreferrer" className={link}>
      the full list (PDF, {includedFeaturesDoc.date})<span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

/**
 * FAQ for /build-on-your-lot. Every answer restates the live Build On Your Lot pages, the price list and
 * the Included Features list (02/24) — nothing beyond what they publish.
 */
export const boylFaq: FaqItem[] = [
  {
    q: 'What is included in the base price?',
    a: (
      <>
        <p>
          Base prices are based on Wakefield Homes, LC’s General &amp; Technical Provisions for construction and our Build On Your Lot standard features — for
          example HardiePlank siding, 30-year dimensional shingles, 9′ ceilings on all levels, Group 3 quartz kitchen countertops, GE appliances and a finished
          basement recreation room with a 3-piece bath. Prices are as of {PRICE_AS_OF} and subject to change without notice.
        </p>
        <p className="mt-3">
          <Link to="/build-on-your-lot/features" className={link}>
            See the included features
          </Link>{' '}
          or download <IncludedFeaturesPdfLink />.
        </p>
      </>
    ),
  },
  {
    q: 'Which costs are not included?',
    a: (
      <>
        <p>
          Each house must be evaluated for costs that are applicable to your lot and its permit requirements. {priceListText.exclusionsLead}
        </p>
        <Bullets items={boylExclusions} className="mt-3" />
        <p className="mt-3">{priceListText.closing}</p>
      </>
    ),
  },
  {
    q: 'Can I customize a plan?',
    a: (
      <p>
        Yes. Our portfolio plans come with customizable options packages, so we can add or delete options and value-engineer costs to meet your budget. An
        independent architect who is a custom home designer and knows our portfolio is available to meet with you as needed. Options and architectural
        customization fees are not included in the base price.
      </p>
    ),
  },
  {
    q: 'Who handles site engineering and permits?',
    a: (
      <p>
        We do. Wakefield Homes performs the site engineering and permitting tasks to obtain the building permit for you. The fees to obtain the permit, lot grading
        plan engineering and site engineering and testing are priced separately from the base price.
      </p>
    ),
  },
  {
    q: 'How long does it take?',
    a: (
      <p>
        It depends largely on your lot and on permitting, and the design phases move at your pace — you approve each one before the next begins. Construction loans
        typically run about twelve months and can be extended if needed. If an existing house has to come down, construction begins about 60 days after you have
        moved out, once we have cut off the utilities and obtained a demolition permit.
      </p>
    ),
  },
  {
    q: 'Do you build in my county?',
    a: (
      <p>
        We build on your lot in {listSentence(['Fairfax County', 'Arlington County', 'the City of Alexandria'])}. Not sure whether your lot is a fit? Call us at{' '}
        <OfficePhoneLink /> or{' '}
        <Link to="/contact?interest=build-on-your-lot" className={link}>
          tell us about your lot
        </Link>
        .
      </p>
    ),
  },
]

const point = (title: string) => constructionLoanPoints.find((p) => p.title === title)?.body ?? ''

/** FAQ for /finance/build-on-your-lot (the live BOYL financing and Finance pages). */
export const boylFinanceFaq: FaqItem[] = [
  {
    q: 'What is a construction-to-permanent loan?',
    a: (
      <p>
        One loan that finances the construction of your home and then rolls over to your permanent mortgage, so you settle once instead of twice. {point('One-time close')}
      </p>
    ),
  },
  {
    q: 'What do I pay while my home is being built?',
    a: (
      <p>
        Interest only: it is a simple-interest loan, calculated monthly, and each month you pay your lender the interest accrued on the outstanding balance. You
        also pay the property taxes on your lot.
      </p>
    ),
  },
  {
    q: 'I already own my lot but still have a mortgage on it. Can I still build?',
    a: <p>{point('Fold in your current mortgage')}</p>,
  },
  {
    q: 'Is my rate locked during construction?',
    a: <p>{point('Rates locked in')} Ask your lender about the specific terms they offer.</p>,
  },
  {
    q: 'Which permanent loans can I choose?',
    a: (
      <p>
        You can choose a 15- or 30-year fixed rate, or a 5/1, 7/1 or 10/1 ARM (available products may change). All ARM products may be refinanced or modified
        into a 15- or 30-year fixed rate after construction of the home is complete.
      </p>
    ),
  },
  {
    q: 'How much can I borrow?',
    a: (
      <p>
        The construction and permanent loan-to-value ratio is based on the lower of the appraised value of the completed home and lot or the total acquisition
        cost (lot plus house). The program publishes {listSentence(loanToValue)}; ratios may differ between lenders.
      </p>
    ),
  },
  {
    q: 'Are financing costs included in the base price?',
    a: (
      <p>
        No. Construction and land acquisition financing, settlement fees, construction loan interest and builders risk insurance are not included in Build On Your
        Lot base prices.{' '}
        <Link to="/build-on-your-lot/price-list" className={link}>
          See the price list
        </Link>{' '}
        for everything that is priced separately.
      </p>
    ),
  },
]
