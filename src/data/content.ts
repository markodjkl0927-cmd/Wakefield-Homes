/**
 * Static marketing content for the public website, taken from the current wakefieldhomeslc.com and the
 * documents it links. Public copy states only facts found there (when unsure, say less).
 */
import { homeModels } from './models'
import { photos, wp } from './images'

export const office = {
  name: 'Wakefield Homes, LC',
  address: '8400 Radford Ave, Suite 200',
  cityLine: 'Alexandria, VA 22309',
  fullAddress: '8400 Radford Ave, Suite 200, Alexandria, VA 22309',
  phone: '+17033603134',
  phoneDisplay: '(703) 360-3134',
  /** The live site publishes no email address. UIs hide the email row/link when this is empty. */
  email: '',
  /** The client's own business data (schema.org opening hours on wakefieldhomeslc.com). */
  hours: 'Mon–Fri, 8:00 AM – 5:30 PM',
  mapEmbed:
    'https://www.openstreetmap.org/export/embed.html?bbox=-77.0860%2C38.7280%2C-77.0560%2C38.7470&layer=mapnik&marker=38.7375%2C-77.0710',
  mapLink: 'https://www.openstreetmap.org/?mlat=38.7375&mlon=-77.0710#map=15/38.7375/-77.0710',
}

export const social = [
  { label: 'Facebook', href: 'https://www.facebook.com/Wakefield-Homes-LC-1452937661649998/' },
  { label: 'Instagram', href: 'https://www.instagram.com/wakefieldhomeslc' },
  { label: 'Houzz', href: 'https://www.houzz.com/professionals/home-builders/wakefield-homes-lc-pfvwus-pf~563539019' },
]

export const serviceAreas = ['City of Alexandria', 'Fairfax County', 'Arlington County']

/** L.V. Genuario & Associates began building homes in Northern Virginia in 1970 (Our Story). */
export const buildingSince = 1970

export const trustStats = [
  { value: '50+', label: 'Years building homes in Northern Virginia' },
  { value: '3', label: 'Generations of the Genuario family' },
  { value: String(homeModels.length), label: 'Home plans in our portfolio' },
  { value: '7×', label: 'Best of Houzz winner' },
]

/* ------------------------------------------------------------------ */
/* Contact                                                              */
/* ------------------------------------------------------------------ */

/** The live Contact Us introduction. */
export const contactIntro =
  'For more information on our new home communities, our Build On Your Lot program or remodeling your Wakefield home, send us a note and a Wakefield representative will contact you.'

/** What happens after someone writes in — the live site makes no response-time promise. */
export const contactFollowUp = 'A Wakefield representative will contact you to help make your dreams and ideas a reality.'

/* ------------------------------------------------------------------ */
/* Our Story                                                            */
/* ------------------------------------------------------------------ */

export const storyIntro =
  'From conception to completion, the Genuario name stands for the same care and craftsmanship that builders brought to homes two centuries ago — paired with responsive communication and service you can count on.'

export const storyTimeline = [
  { year: '1964', title: 'A Corps of Engineers officer comes to Virginia', body: 'Louis V. Genuario, Sr. (West Point ’50, Harvard ’56) moves to Northern Virginia on assignment to the Pentagon.' },
  { year: '1970', title: 'Building homes begins', body: 'After leading the Mall Tunnel Project for the District of Columbia, he founds L.V. Genuario & Associates and starts building homes in Northern Virginia.' },
  { year: '1978', title: 'Genuario Construction Company', body: 'Rick Genuario (UVA ’77) joins Genuario Construction Company, which has served customers since 1978, and soon becomes its president. GCC holds a Virginia Class A Contractor’s license.' },
  { year: '1983', title: 'Genuario Properties', body: 'GPI is organized to focus on land acquisition, land development and resale.' },
  { year: '1995', title: 'Wakefield Homes, LC', body: 'Wakefield is formed to build new homes on individual lots and in small subdivisions. Louis V. Genuario, Jr. (VA Tech ’80) leads GPI and Wakefield.' },
  { year: '2022', title: 'The third generation', body: 'Arthur Genuario (VA Tech ’13) joins after nearly a decade building homes with national builders in California and Virginia.' },
]

export const leadership = [
  { name: 'Rick Genuario', role: 'President, Genuario Construction Company', note: 'UVA ’77 · Custom Builder of the Year 2015' },
  { name: 'Louis V. Genuario, Jr.', role: 'President, Wakefield Homes & GPI', note: 'Virginia Tech ’80 · formerly Bechtel Engineering' },
  { name: 'Arthur Genuario', role: 'Third generation', note: 'Virginia Tech ’13 · joined in 2022' },
]

/* ------------------------------------------------------------------ */
/* Awards, memberships, licenses, news                                  */
/* ------------------------------------------------------------------ */

/** Exactly as listed on https://wakefieldhomeslc.com/awards/. */
export const awards: { year: number; org: string; title: string; highlight?: boolean }[] = [
  { year: 2023, org: 'Houzz', title: 'Best of Houzz — Service', highlight: true },
  { year: 2022, org: 'Houzz', title: 'Best of Houzz — Service' },
  { year: 2021, org: 'Houzz', title: 'Best of Houzz — Design' },
  { year: 2020, org: 'Houzz', title: 'Best of Houzz — Design' },
  { year: 2019, org: 'Houzz', title: 'Best of Houzz — Design' },
  { year: 2018, org: 'Houzz', title: 'Best of Houzz — Design' },
  { year: 2017, org: 'Houzz', title: 'Best of Houzz — Design' },
  { year: 2017, org: 'GALA', title: 'Best Feature Award for 208 S. Patrick’s Kitchen' },
  { year: 2015, org: 'Custom Builder of the Year', title: 'Rick Genuario, for Wakefield Homes', highlight: true },
  { year: 2015, org: 'Great American Living Award', title: 'Best Feature, Staircase in the Jefferson Model' },
  { year: 2015, org: 'Great American Living Award', title: 'Award of Merit: Design and Architecture, Custom Home on Single Lot 3,000–5,000 Sq. Ft., Plymouth Model' },
  { year: 2011, org: 'NVBIA', title: 'Custom Builder of the Year', highlight: true },
  { year: 2007, org: 'PWC Summit Award', title: 'Outstanding Customer Service and Satisfaction' },
  { year: 2005, org: 'Monument Awards', title: 'Honorable Mention' },
  { year: 2004, org: 'Finest in Family Living Award', title: '1st place' },
  { year: 2003, org: 'Finest in Family Living Award', title: '1st place' },
  { year: 2001, org: 'NVBIA', title: 'Alexandria Chapter — Builder of the Year' },
  { year: 1999, org: 'NVBIA', title: 'Emiel Keen Award' },
  { year: 1997, org: 'NVBIA', title: 'Builder of the Year' },
  { year: 1995, org: 'NARI', title: 'Contractor of the Year (COTY) — Finalist' },
  { year: 1994, org: 'NVBIA', title: 'ORAA — Honorable Mention' },
  { year: 1993, org: 'HWC', title: 'Award for Construction Excellence (ACE) — Regional Finalist' },
  { year: 1993, org: 'HOW', title: 'Builder of the Year — Honorable Mention' },
  { year: 1992, org: 'HOW', title: 'Builder of the Quarter' },
]

export const awardHighlights = [
  { label: 'Best of Houzz', value: '7×', note: 'Design & Service, 2017–2023' },
  { label: 'Builder of the Year', value: '3×', note: 'NVBIA 1997, 2001 (Alexandria Chapter) & 2011 (Custom)' },
  { label: 'Great American Living Awards', value: '3×', note: 'Design honors, 2015–2017' },
  { label: 'Custom Builder of the Year', value: '2015', note: 'Rick Genuario' },
]

export interface Membership {
  name: string
  short: string
  href: string
  logoKey: 'nvbia' | 'nahb' | 'chamber' | 'cbusa' | 'hbav'
}

/** Associations shown (with links) on the live homepage. */
export const memberships: Membership[] = [
  { name: 'Northern Virginia Building Industry Association', short: 'NVBIA', href: 'https://www.nvbia.com/', logoKey: 'nvbia' },
  { name: 'National Association of Home Builders', short: 'NAHB', href: 'https://www.nahb.org/', logoKey: 'nahb' },
  { name: 'Construction Buyers Union (CBUSA)', short: 'CBUSA', href: 'https://cbusa.us/', logoKey: 'cbusa' },
  { name: 'Home Builders Association of Virginia', short: 'HBAV', href: 'https://www.hbav.com/', logoKey: 'hbav' },
]

/**
 * The chamber logo on the live site reads "Mount Vernon–Lee Chamber of Commerce — 2020 member". Its homepage link
 * (mountvernonchamber.com) now belongs to a chamber in Washington State and the address printed on the logo no longer
 * resolves, so show this logo without a link until the client confirms the current membership.
 */
export const chamberMembership = { name: 'Mount Vernon–Lee Chamber of Commerce', short: 'Chamber', logoKey: 'chamber' as const, note: '2020 member' }

export const licenses = [
  { label: 'Wakefield Homes — Virginia Class “A” Contractor’s License', value: '2705 032552A' },
  { label: 'GCC — Virginia Class “A” Contractor’s License', value: '2701 019002A' },
  { label: 'City of Alexandria Business License', value: '52223-01' },
  { label: 'Arlington County Business License', value: 'BLC-1000063179-02' },
  { label: 'County of Fairfax Business License', value: '1234322' },
]

export const news = [
  {
    date: 'March 2024',
    outlet: 'Alexandria Living Magazine',
    issue: 'March/April 2024',
    title: 'Q&A with Wakefield Homes',
    summary: 'Your Alexandria homebuilders introduce Hybla Valley Farms this spring — and talk about more than fifty years of building in the community.',
    /** The article as published (PDF on the live In the News page). */
    pdfUrl: wp('2024/03/Magazine-Article_AlxLiving_Spring-2024.pdf'),
  },
]

/* ------------------------------------------------------------------ */
/* Reviews (from https://wakefieldhomeslc.com/our-reviews/)             */
/* ------------------------------------------------------------------ */

/**
 * The nine reviews on the live Our Reviews page, in the live order, signed as published.
 * `quote` is a short verbatim excerpt for cards; `full` is the complete review ("Read full review").
 * `context` summarizes what the reviewer says about their project. No star ratings are published.
 */
export const reviews: { name: string; context: string; quote: string; full: string }[] = [
  {
    name: 'Evan C.',
    context: 'Bought a new Wakefield home',
    quote: 'Build quality and design is as good as it gets. But the best part about Wakefield is their commitment to their product; they stand behind it.',
    full: 'Wakefield is one of the finest homebuilders in the area. Build quality and design is as good as it gets. But the best part about Wakefield is their commitment to their product; they stand behind it. We purchased a new build from them and part of their process is they meet with you and do an entire walkthrough with you. Even after closing they continue to reach out to ensure everything is going smoothly. They are literally always a phone call away which, to me, is worth a fortune in peace of mind. There’s a good reason why realtors always heavily advertise the Wakefield brand. Wonderful purchasing from them and we would absolutely do so again.',
  },
  {
    name: 'Sarah S.',
    context: 'First-time buyers and builders',
    quote: 'Wakefield built our beautiful home, and completed it a couple months ahead of schedule.',
    full: 'Wakefield built our beautiful home, and completed it a couple months ahead of schedule during 2021-2022 no less! From the first contact, Lindsay was a dream to work with – she had graciously allowed me to bug her for weeks before the right property landed in their pipeline and we were able to jump on it. Being first-time buyers and builders, we were comforted that Louis and Rick knew the contracting and construction processes inside and out, and answered all of our questions and even those we didn’t know to ask. Ed managed construction expertly, and we learned so much from him about how to work our house, and he continues to answer questions months after we moved in. We had our own inspector, arranged through our realtor, inspect before drywall and at substantial completion, and both times our inspector said that Wakefield built us a great home and found only one or two minimal items that Rick immediately addressed. Pricing was reasonable and clear, and we don’t feel like we had to compromise on anything important to us. We love our home!',
  },
  {
    name: 'Chris K.',
    context: 'Built with the Wakefield team',
    quote: 'They were professional, extremely detailed, and well-versed in their respective responsibilities.',
    full: 'Louis, Rick, Lindsay, Amy, Mike and Marcelo were an extraordinary team to work with during our home construction. They were professional, extremely detailed, and well-versed in their respective responsibilities. The craftsmanship, and their extra attention given to the finite details to our home are remarkable. We are absolutely thrilled (5+stars) with their product they built, aka our new home! Definitely give this team your business.',
  },
  {
    name: 'K DC',
    context: 'Bought a new Wakefield home',
    quote: 'We couldn’t be happier with our Wakefield Homes experience, specifically our new, beautiful home.',
    full: '6 out of 5 stars! Start the buying process with the always cordial/helpful Lindsay, work with expert builders Mike and Amy to construct & allow Louis + Rick (the owners) to close the deal!! We couldn’t be happier with our Wakefield Homes experience, specifically our new, beautiful home; highly recommend working with this wonderful company/team and buying your next dream home from Wakefield!!!',
  },
  {
    name: 'Shanna M.',
    context: 'Custom home build',
    quote: 'Our finished home is just gorgeous; the craftsmanship, the attention to detail, the quality of products and the builder standards.',
    full: 'I would highly recommend Wakefield for any home build or construction project. Wakefield built my family and I, our first, custom 1 million+ home; and from day 1, we couldn’t be more pleased. It was a long, intense and demanding build, however the professionalism of the Wakefield team put my husband and I at ease. A huge KUDOS to Lindsay G, she is the oil to their engine and her knowledge, follow through, expertise and professionalism is unmatched. Our construction site manager, Chip C, was just about heaven sent! There are sooo many different phases of constructions, things to be done, systems to be in place, subcontractors to hire (and look after), and this wonderful man, did it all, day after day, expertly.. and get this, With a SMILE.\n\nOur finished home, is just gorgeous; the craftsmanship, the attention to detail, the quality of products and the builder standards, has resulted in our forever home that is just beautiful. The owners Rick and Louis care about their customers, and want the home to be no less than what they would accept themselves. We are thrilled to have worked with this team, and would HIGHLY recommend to anyone.',
  },
  {
    name: 'Cameron',
    context: 'New home',
    quote: 'They were professional, transparent and communicated well. The job site was kept clean and tidy.',
    full: 'Wakefield Homes made the building process as easy as it can be. They were professional, transparent and communicated well. The job site was kept clean and tidy. Workmanship is high quality and they follow through on their promises. We love our new home. Thank you!',
  },
  {
    name: 'jakethegreatdog',
    context: 'Built a home with Wakefield',
    quote: 'The most important trait a builder must have is a track record of trust.',
    full: 'My wife and I are VERY happy with our decision to select Wakefield Homes to be our builder! The most important trait a builder must have is a track record of trust. I strongly recommend you talk with Wakefield if you are considering building a home or remodeling your present one! You know how there were certain people way back in high school you knew you could completely trust? I went to high school with Rick and Louis Genuario, the owners of Wakefield Homes. Decades later, upon returning to Alexandria and wanting to build a home, I knew deep inside me that I could trust their character & competence and approached them as my potential builders. I knew that even if we had disagreements, we would work them out fairly, quickly, and equitably. Their work ethic, customer service, and desire to meet or exceed your expectations permeates their company! Lindsay Gainer is probably the most competent and articulate designer/detail person I have ever known! She is awesome!! Danny Normyle, their construction manager, gets things done and kept us informed when there were subcontractor or weather-related delays. Any issues on the punch list were dealt with quickly and efficiently. As you are looking at potential builders, you will have to develop mutual trust with the builder you select…in other words, you have to feel the trust! I encourage you to at least meet with them and give them an opportunity to see if you are able to develop a partnership with them the way my wife and I did!',
  },
  {
    name: 'bruce_k_scott',
    context: 'Built a home with Wakefield',
    quote: 'Very happy with the quality of the construction, the timeliness, and equally important, the cost of the home.',
    full: 'We had an absolutely wonderful experience with Wakefield Homes, the exclusive builder we selected to construct our beautiful home. We CONSTANTLY receive positive comments about our home, often our guests describe it as the most beautiful home they have ever seen! Very happy with the quality of the construction, the timeliness, and equally important, the cost of the home.',
  },
  {
    name: 'brucewitty3',
    context: '20-year client: new home, remodel and carriage house',
    quote: 'All the work was excellent but the best thing about them is they stand by their work.',
    full: 'We have a 20 year relationship with Wakefield. They built our house 20 years ago. We hired them to do a major remodel 2 years ago. Plus we hired them to design build a 4 car garage/carriage house last year. All the work was excellent but the best thing about them is they stand by their work. We discovered an issue with the house 18 years after it was built. They reviewed the issue, determined it was a workmanship issue, and corrected it at no cost. Due to the time lapse they had no obligation to do the correction but they stepped up anyway.',
  },
]

/* ------------------------------------------------------------------ */
/* Build On Your Lot                                                    */
/* ------------------------------------------------------------------ */

export const boylIntro =
  'Already own land? Our Build On Your Lot program uses the Wakefield New Home Portfolio to put a dream home on property you own — and lets you explore feasibility without paying costly architectural design fees.'

export const boylPhases = [
  {
    step: 1,
    title: 'Preliminary phase',
    body: 'Explore feasibility without paying architectural design fees. We prepare schematic sketches of your home on your lot, with an estimated price.',
  },
  {
    step: 2,
    title: 'Design development',
    body: 'Sketches become construction plans, with project specifications and a construction proposal for your approval.',
  },
  {
    step: 3,
    title: 'Construction',
    body: 'Plans are completed in enough detail to obtain building permits — then we build, keeping you involved at every phase.',
  },
]

export const boylBenefits = [
  { title: 'You stay in control', body: 'Move from one phase to the next only after you approve — and pause or stop the design process if needed.' },
  { title: 'Lower design costs', body: 'Designing from our New Home Portfolio minimizes design costs and design development time.' },
  { title: 'A realistic budget early', body: 'With the portfolio and its options packages we can prepare a construction budget, adding or deleting options and value-engineering as needed.' },
  { title: 'An independent architect', body: 'A custom home designer who knows our portfolio is available to meet with you as needed.' },
]

/** The costs the live price list excludes from base prices, in the published order and wording. */
export const boylExclusions = [
  'Options',
  'Legal counsel',
  'Reports and submission',
  'Fees necessary to obtain a building permit',
  'Lot grading plan engineering fees',
  'Site engineering and testing',
  'Sitework',
  'Architectural customization fees',
  'Modifications to the house foundation and structure due to lot topography and soils',
  'Tree preservation and planting ordinances',
  'Deed covenants or proffers affecting your lot',
  'CBAY ordinance requirements',
  'Storm water management engineering and mitigation',
  'Driveway entrance construction',
  'Construction and land acquisition financing, settlement fees, and construction loan interest',
  'Builders Risk Insurance',
  'Utility services fees for establishing and connecting respective services',
  'Public utility availability',
  'Demolition of existing structures',
]

/** The notes printed with the live BOYL price list (https://wakefieldhomeslc.com/boyl-price-list/). */
export const priceListText = {
  asOf: 'As of 5/1/24',
  disclaimer: 'Above model prices are subject to change without notice.',
  basis:
    'House prices listed for each model are based on Wakefield Homes, LC’s General & Technical Provisions for construction and the “Build On Your Lot Standard Features.” Each house must be evaluated for costs that are applicable to your lot and its permit requirements.',
  exclusionsLead: 'The following costs are excluded:',
  closing: 'Prices are subject to change without prior written or published notice.',
  area: 'Build On Your Lot is offered in Fairfax County, Arlington County and the City of Alexandria.',
}

/** The live "Build On Your Lot Included Features" page links only this PDF (02/24). */
export const includedFeaturesDoc = {
  title: 'Build On Your Lot Included Features',
  date: '02/24',
  pdfUrl: wp('2024/02/BOYL-Included-Features-02.24-1.pdf'),
  footnote: '*If natural gas/propane is available',
  /**
   * The line printed at the foot of the PDF (and of every project's features PDF). Show it only as part of this
   * document's list — never as a stand-alone promise elsewhere on the site.
   */
  pdfClosingLine: 'Builder’s Ten-Year Warranty Program',
}

/** The groups and items of the BOYL Included Features PDF (02/24), in its order and wording (case and typography normalized). */
export const includedFeatures = [
  {
    group: 'Exterior',
    items: [
      'HardiePlank siding on front, side & rear elevations',
      'Flagstone-paved front porch or stoop with concrete lead-walk to driveway',
      'Fiberglass front door with insulated glass sidelites',
      '30-year fiberglass/asphalt dimensional shingles',
      'Public sewer and water',
      'Front and rear hose bibs; front and rear weatherproof electrical outlets',
      'Decorative wood exterior trim',
      'Professional landscape package and hydro-seeded lawn',
    ],
  },
  {
    group: 'Interior',
    items: [
      '9′-0″ ceilings on all levels',
      'Family room direct-vent gas prefabricated fireplace*',
      'Media package: 6 media outlets with CAT-6 wiring',
      '200-amp electrical service with smoke detectors on each floor and in each bedroom',
      'Finished basement recreation room and 3-piece basement bathroom',
      'Two-car garage with finished, painted drywall interior walls',
      'Traditional oak main stair with stained oak handrail',
      'Wide-plank engineered hardwood flooring in foyer, living room, dining room, den/study, kitchen/breakfast room, powder room and 2nd-floor hall',
      'Two-panel interior doors',
      'Wall-to-wall carpeting in family room, rear stairs (if applicable) and 2nd-floor bedrooms',
      'Upgrade carpet and upgrade carpet pad',
      'Recessed lighting',
    ],
  },
  {
    group: 'Trim',
    items: ['Upgrade 5½″ base & 3½″ sanitary casing throughout', 'Two-piece crown molding in foyer, living room, dining room & 2nd-floor hall'],
  },
  {
    group: 'Bathrooms',
    items: [
      'Traditional maple vanity cabinets with Group 1 quartz countertops in secondary bathrooms',
      'Traditional pedestal sink in powder room with Moen Gibson chrome faucet',
      'Ceramic tile floors and shower surrounds in baths',
      'Elongated WaterSaver toilets with chrome fixtures',
      'Moen Gibson chrome faucets in all bathrooms',
      'Group 1 quartz countertops, freestanding soaking tub & glass shower door in the primary bathroom',
    ],
  },
  {
    group: 'Kitchen',
    items: [
      'Traditional maple 42″ cabinets',
      'Group 3 quartz countertops',
      'GE 30″ gas range*',
      'GE 30″ electric wall oven with separate built-in microwave',
      'GE Potscrubber dishwasher',
      'GE 23 cu. ft. refrigerator with icemaker',
      'Stainless steel undermount kitchen sink with Moen pull-out sprayer faucet',
      'Ceramic tile flooring in the laundry room',
      'Designer and recessed lighting',
    ],
  },
  {
    group: 'Energy saving',
    items: [
      'Vinyl double-hung tilt insulated glass windows with grilles between the glass',
      'Insulated full-view glass metal terrace door',
      'House wrap and Air-Guard wall treatment',
      'R-38 ceiling insulation and R-15 exterior wall insulation',
      'Passive radon system',
      'Two-zone high-efficiency (gas & heat pump) heating and electric cooling (AC)*',
      'Honeywell programmable thermostat',
      '75-gallon gas water heater*',
      'Zone 1 humidifier',
    ],
  },
]

/* ------------------------------------------------------------------ */
/* Finance                                                              */
/* ------------------------------------------------------------------ */

export interface Lender {
  company: string
  contact: string
  title: string
  /** As published, e.g. "483527". */
  nmls: string
  /** "NMLS" or "NMLSR ID" — the label the lender's card uses. */
  nmlsLabel: string
  /** E.164, for tel: links. */
  phone: string
  phoneDisplay: string
  email: string
  address: string
  city: string
  website: string
  /** The lender's online application. Missing when the live link points somewhere else. */
  applyUrl?: string
}

const selectLending: Lender = {
  company: 'Select Lending Services', contact: 'Christian A. Hartung', title: 'Divisional Sales Executive', nmls: '483527', nmlsLabel: 'NMLS',
  phone: '+12023608773', phoneDisplay: '202-360-8773', email: 'chartung@hartungteam.com',
  address: '211 N. Union Street, Suite 100, Alexandria, VA 22314', city: 'Alexandria, VA', website: 'https://www.hartunglending.com',
  applyUrl: 'https://my.selectlendingservices.com/homehub/signup/christian.hartung@selectlendingservices.com?from_mobile_share=true',
}
const firstNational: Lender = {
  company: 'First National Bank Corporation', contact: 'John Yannetti', title: 'Mortgage Banking Specialist', nmls: '461904', nmlsLabel: 'NMLS',
  phone: '+17036234100', phoneDisplay: '703-623-4100', email: 'yannettij@fnb-corp.com',
  address: '4114 Legato Road, Suite 450, Fairfax, VA 22033', city: 'Fairfax, VA', website: 'https://www.fnb-corp.com',
  applyUrl: 'https://www.fnb-online.com/Mortgage/yannettij',
}
const rateMortgage: Lender = {
  company: 'Rate Mortgage', contact: 'Ryan Larson', title: 'Senior VP of Mortgage Lending', nmls: '1371688', nmlsLabel: 'NMLS',
  phone: '+17038729029', phoneDisplay: '703-872-9029', email: 'Ryan.Larson@rate.com',
  address: '1300 N. 17th Street, Suite 550, Arlington, VA 22209', city: 'Arlington, VA', website: 'https://www.rate.com',
  applyUrl: 'https://apply.guaranteedrate.com/apply/loan-purpose?emp-id=23694',
}
const wesBanco: Lender = {
  company: 'WesBanco Bank, Inc. – Builder Division', contact: 'Mark Ferguson', title: 'VP & Senior Market Leader', nmls: '408119', nmlsLabel: 'NMLS',
  phone: '+13016745851', phoneDisplay: '301-674-5851', email: 'mark.ferguson@wesbanco.com',
  address: '11325 Random Hills Road, 6th Floor, Fairfax, VA 22030', city: 'Fairfax, VA', website: 'https://www.wesbanco.com',
}
const wellsFargo: Lender = {
  company: 'Wells Fargo Home Mortgage', contact: 'Darnell Stanley Glover, Jr.', title: 'Private Mortgage Banker, Builder Division', nmls: '429841', nmlsLabel: 'NMLSR ID',
  phone: '+12024104993', phoneDisplay: '202-410-4993', email: 'Darnell.S.Glover@wellsfargo.com',
  address: '20370 Exchange Street, Suite 230, Ashburn, VA 20147', city: 'Ashburn, VA', website: 'https://www.wellsfargo.com/mortgage/',
  applyUrl: 'https://yourmortgageapp.wf.com/#/loan-officers/Darnell.S.Glover@wellsfargo',
}

/** Preferred lenders on the live Home Purchase page. */
export const homePurchaseLenders: Lender[] = [selectLending, firstNational, rateMortgage]
/** Preferred lenders on the live Build On Your Lot financing page. */
export const boylLenders: Lender[] = [selectLending, firstNational, wesBanco]
/** Preferred lenders on the live Finance overview page. */
export const financeLenders: Lender[] = [selectLending, firstNational, wellsFargo]

/** @deprecated Each finance page has its own list on the live site — use homePurchaseLenders, boylLenders or financeLenders. */
export const lenders: Lender[] = homePurchaseLenders

export const constructionLoanPoints = [
  { title: 'One-time close', body: 'Lot acquisition, construction financing and your permanent mortgage in a single settlement.' },
  { title: 'Fold in your current mortgage', body: 'Building on land you own? Lenders can pay off the balance of your existing mortgage within the construction-to-permanent loan.' },
  { title: 'Rates locked in', body: 'Permanent financing terms are guaranteed until construction is complete; the loan then rolls over to your mortgage.' },
  { title: 'Interest-only while you build', body: 'During construction (typically 12 months) you pay simple interest only on funds drawn so far.' },
  { title: 'Flexible permanent loans', body: 'Choose a fixed rate or a 5/1, 7/1 or 10/1 ARM for the permanent loan.' },
]

/** Construction & permanent loan-to-value ratios on the live Finance page (they may differ between lenders). */
export const loanToValue = ['90% to $1,500,000', '80% to $2,000,000', '70% to $3,000,000']

/** Permanent loan products on the live financing pages (available products may change). */
export const mortgageProducts = ['15-year fixed', '30-year fixed', '5/1 ARM', '7/1 ARM', '10/1 ARM']

/** Wakefield's New Home Construction/Permanent Loan program has been used since 1991 (Finance page). */
export const financingProgramSince = 1991

/** The "Financing Program Procedures" PDF linked from the live BOYL financing page. */
export const financingProceduresPdf = wp('2024/03/BOYL-New-pdf-to-insert.pdf')

/** How the New Home Financing Program works, from the live Finance page and the Financing Program Procedures PDF. */
export const newHomeFinancingSteps = [
  { title: 'Sign your Sales Agreement', body: 'After signing a Sales Agreement to purchase your home, you meet with our lender’s loan officer to begin the loan application process.' },
  { title: 'Loan approval and settlement', body: 'Upon loan approval, we schedule your settlement with Monument Title Company in the City of Alexandria.' },
  { title: 'Select your finishes', body: 'Before your loan’s settlement, you meet with our Sales Representative to select the finishes for your home, and we adjust your contract for any options or changes. At the same time, we submit your house plans for a building permit.' },
  { title: 'Own your lot, start construction', body: 'After settlement you own your lot and we obtain the building permit to begin construction. For Build On Your Lot customers, construction begins about 60 days after you move out; Wakefield Homes cuts off the utilities and obtains a demolition permit.' },
  { title: 'Construction draws', body: 'While we build, you pay the interest on your outstanding loan balance and the property taxes on your lot. Our lenders inspect the work in place and pay Wakefield Homes according to the draw schedule in your Sales Agreement.' },
  { title: 'Substantial Completion walkthrough', body: 'About one week before the scheduled completion date, we walk through your new home with you and note any items that need adjustment or attention.' },
  { title: 'Final walkthrough', body: 'Before you move in, the noted items are completed and we hold a final walkthrough.' },
  { title: 'Rollover to your mortgage', body: 'Upon Substantial Completion we ask the lender to convert your construction loan to your permanent mortgage — usually on the first of the following month.' },
]

/* ------------------------------------------------------------------ */
/* VPDES                                                                */
/* ------------------------------------------------------------------ */

/**
 * The live VPDES page (updated Oct 23, 2026) shows only its title and one site photo. No permit numbers or
 * stormwater commitments are published, so the prototype states none: `intro` and `points` stay empty.
 */
export const vpdes = {
  title: 'Virginia Pollutant Discharge Elimination System (VPDES)',
  photo: photos.company.vpdesSite,
  photoAlt: 'Silt fence and a stone-lined planting bed at a Wakefield Homes site',
  intro: '',
  points: [] as string[],
}
