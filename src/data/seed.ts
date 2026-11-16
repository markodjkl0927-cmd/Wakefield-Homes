import type {
  ActivityEntry,
  Agreement,
  Appointment,
  ConstructionStage,
  ConstructionStageKey,
  FormerHome,
  FormerUser,
  Home,
  Lead,
  MaintenanceRequest,
  Notification,
  RequestEvent,
  Settings,
  User,
} from '@/types'
import { constructionStages, stageProgress } from './labels'
import { getModel } from './models'
import { photos } from './images'
import { createPublicListings } from './listings'
import { addDaysIso, businessDayFromToday, daysBetween, isoFromNow, nowIso, snapToWorkDay, todayIso, workDayFromToday } from '@/lib/utils'
import { formatPrice } from '@/lib/format'

/**
 * Demo data for the presentation. All people, addresses and documents in the portals are fictional;
 * the public listings (listings.ts) are the client's real homes.
 *
 * Dates are generated relative to "today": appointments and work dates always fall on office working
 * days (Mon–Fri) within office hours, and every home's contract, stage, closing and estimated-completion
 * dates agree with each other. The store moves all dates forward when saved data is opened on a later day.
 */

export const DEMO_PASSWORD = 'demo1234'

/** One account per role for the presentation switcher (keyed by id, so edits to the email don't break it). */
export const demoAccounts = [
  { id: 'usr_daniel', role: 'homeowner' as const, email: 'daniel@example.com', name: 'Daniel Ellis', blurb: 'Two homes: one finished, one being built' },
  { id: 'usr_sarah', role: 'staff' as const, email: 'sarah@wakefieldhomes.test', name: 'Sarah Mitchell', blurb: 'Customer Care Manager' },
  { id: 'usr_admin', role: 'admin' as const, email: 'admin@wakefieldhomes.test', name: 'Alex Morgan', blurb: 'Super Admin — full access' },
]

/** Office hours (the client's published business hours) and the matching default booking window. */
export const OFFICE_HOURS = 'Mon–Fri, 8:00 AM – 5:30 PM'

/** Local timestamp on a given day, e.g. at('2026-11-10', '14:30'). Only use for past days. */
function at(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  return new Date(y, m - 1, d, h, min).toISOString()
}

/** Past dates snap back to the previous working day, future ones forward, so nothing moves across "today". */
function onWorkDay(date: string): string {
  return snapToWorkDay(date, date < todayIso() ? -1 : 1)
}

/**
 * Construction stages from contract to closing. Finished stages are spread evenly between the contract date
 * and the start of the current stage, upcoming ones between the current stage and closing — so the Contract
 * stage matches the signed contract and Closing matches the closing / estimated-completion date.
 */
function planStages(opts: { contract: string; current: ConstructionStageKey | 'done'; currentStart?: string; closing: string }): ConstructionStage[] {
  const n = constructionStages.length
  const done = opts.current === 'done'
  const ci = done ? n - 1 : constructionStages.findIndex((s) => s.key === opts.current)
  const start = done ? opts.closing : (opts.currentStart ?? opts.contract)
  const dates = constructionStages.map((_, i) => {
    if (i === 0) return opts.contract
    if (i === n - 1) return opts.closing
    if (i === ci) return start
    if (i < ci) return onWorkDay(addDaysIso(opts.contract, Math.round((daysBetween(opts.contract, start) * i) / ci)))
    return onWorkDay(addDaysIso(start, Math.round((daysBetween(start, opts.closing) * (i - ci)) / (n - 1 - ci))))
  })
  return constructionStages.map((s, i) => ({
    key: s.key,
    label: s.label,
    status: done || i < ci ? 'done' : i === ci ? 'current' : 'upcoming',
    date: dates[i],
  }))
}

function house(modelSlug: string) {
  const model = getModel(modelSlug)
  if (!model) throw new Error(`Unknown model ${modelSlug}`)
  return { modelId: model.id, config: structuredClone(model.house3d), image: model.image }
}

let eventSeq = 0
function event(at: string, byUserId: string, e: Omit<RequestEvent, 'id' | 'at' | 'byUserId'>): RequestEvent {
  eventSeq += 1
  return { id: `evt_seed_${eventSeq}`, at, byUserId, ...e }
}

export function createSeed() {
  eventSeq = 0
  const wd = workDayFromToday
  const bd = businessDayFromToday

  /* ------------------------------ timeline ------------------------------ */
  // Daniel — finished Hamilton
  const hamiltonContract = bd(-415)
  const hamiltonClosing = bd(-240)
  // Daniel — Stockton being built (framing)
  const stocktonContract = bd(-78)
  const stocktonFraming = bd(-14)
  const stocktonClosing = bd(150)
  // Priya — finished Wellington
  const wellingtonContract = bd(-795)
  const wellingtonClosing = bd(-640)
  // Olivia — Lexington in interior finishes; closing booked on the estimated completion date
  const lexingtonContract = bd(-168)
  const lexingtonFinishes = bd(-10)
  const lexingtonClosing = wd(32)

  const users: User[] = [
    { id: 'usr_admin', role: 'admin', name: 'Alex Morgan', email: 'admin@wakefieldhomes.test', phone: '+17035550100', password: DEMO_PASSWORD, title: 'Super Admin', status: 'active', createdAt: isoFromNow(-720), lastLoginAt: isoFromNow(-1) },
    { id: 'usr_sarah', role: 'staff', name: 'Sarah Mitchell', email: 'sarah@wakefieldhomes.test', phone: '+17035550101', password: DEMO_PASSWORD, title: 'Customer Care Manager', status: 'active', createdAt: isoFromNow(-610), lastLoginAt: isoFromNow(0, -3) },
    { id: 'usr_tom', role: 'staff', name: 'Tom Becker', email: 'tom@wakefieldhomes.test', phone: '+17035550102', password: DEMO_PASSWORD, title: 'Construction Manager', status: 'active', createdAt: isoFromNow(-540), lastLoginAt: isoFromNow(-2) },
    { id: 'usr_lisa', role: 'staff', name: 'Lisa Chen', email: 'lisa@wakefieldhomes.test', phone: '+17035550103', password: DEMO_PASSWORD, title: 'Sales & Design Coordinator', status: 'active', createdAt: isoFromNow(-300), lastLoginAt: isoFromNow(-5) },
    { id: 'usr_daniel', role: 'homeowner', name: 'Daniel Ellis', email: 'daniel@example.com', phone: '+17035550144', password: DEMO_PASSWORD, status: 'active', createdAt: at(bd(-420), '10:00'), lastLoginAt: isoFromNow(-3), address: '7 Wakefield Court, Alexandria, VA 22308' },
    { id: 'usr_priya', role: 'homeowner', name: 'Priya Raman', email: 'priya@example.com', phone: '+17035550145', password: DEMO_PASSWORD, status: 'active', createdAt: at(bd(-800), '10:00'), lastLoginAt: isoFromNow(-12), address: '21 Hollin Brook Lane, Alexandria, VA 22307' },
    { id: 'usr_olivia', role: 'homeowner', name: 'Olivia Bennett', email: 'olivia@example.com', phone: '+17035550146', password: DEMO_PASSWORD, status: 'active', createdAt: at(bd(-172), '11:00'), lastLoginAt: isoFromNow(-1), address: '410 Harbor Row, Alexandria, VA 22314' },
    { id: 'usr_marcus', role: 'homeowner', name: 'Marcus Grant', email: 'marcus@example.com', phone: '+17035550147', password: DEMO_PASSWORD, status: 'invited', createdAt: isoFromNow(-2) },
  ]

  const stockton = house('stockton')
  const hamilton = house('hamilton')
  const lexington = house('lexington')
  const wellington = house('wellington')

  const listings = createPublicListings()
  /** A real listing by address or title (listings.ts is maintained separately), if it exists. */
  const listing = (pattern: RegExp) => listings.find((h) => pattern.test(`${h.title} ${h.address} ${h.slug}`))
  const shenandoah = listing(/shenandoah/i)
  const tauxemont = listing(/tauxemont/i)
  const pricedListing = tauxemont?.price ? tauxemont : (shenandoah?.price ? shenandoah : listings.find((h) => h.price && h.status !== 'sold'))

  const homes: Home[] = [
    // ---- Public website listings (real homes): see listings.ts ----
    ...listings,
    // ---- Owned homes (Home Owner portal) ----
    {
      id: 'hm_ellis_hamilton', slug: 'ellis-hamilton', title: 'The Hamilton at Wakefield Court', address: '7 Wakefield Court', city: 'Alexandria, VA 22308',
      modelId: hamilton.modelId, status: 'completed', published: false, featured: false, price: 1590000,
      beds: 5, baths: 4.5, sqft: 4848, lotSizeAcres: 0.41, ownerId: 'usr_daniel',
      description: 'Completed Hamilton with finished lower level and screened porch.',
      images: [photos.construction.completedFront, photos.construction.completedRear, photos.construction.completedKitchen, photos.construction.completedPorch],
      view3d: { enabled: true, config: hamilton.config, hasCustomModel: false },
      construction: {
        progress: stageProgress('done'),
        stages: planStages({ contract: hamiltonContract, current: 'done', closing: hamiltonClosing }),
        photos: [
          { stage: 'Site work', url: photos.construction.excavation, caption: 'Excavation' },
          { stage: 'Foundation', url: photos.construction.foundationWalls, caption: 'Foundation walls' },
          { stage: 'Framing', url: photos.construction.framingExterior, caption: 'Framing and sheathing' },
          { stage: 'Exterior', url: photos.construction.masonry, caption: 'Stone water table' },
          { stage: 'Interior finishes', url: photos.construction.interiorStair, caption: 'Main stair' },
          { stage: 'Completed', url: photos.construction.completedFront, caption: 'Front elevation' },
          { stage: 'Completed', url: photos.construction.completedKitchen, caption: 'Kitchen and dining' },
        ],
      },
      closingDate: hamiltonClosing,
      warrantyEnds: addDaysIso(hamiltonClosing, 365),
      updatedAt: isoFromNow(-30),
    },
    {
      id: 'hm_ellis_stockton', slug: 'ellis-stockton', title: 'The Stockton at Laurel Bend', address: '14 Laurel Bend Way', city: 'Alexandria, VA 22306',
      modelId: stockton.modelId, status: 'under-construction', published: false, featured: false, price: 1185000,
      beds: 5, baths: 4.5, sqft: 4825, lotSizeAcres: 0.5, ownerId: 'usr_daniel',
      description: 'A Stockton with finished loft and bath, currently being framed.',
      images: [photos.construction.framingExterior, photos.construction.foundationWalls],
      view3d: { enabled: true, config: { ...structuredClone(stockton.config), colors: { ...stockton.config.colors, siding: '#5D7A9E', door: '#FFFFFF' } }, hasCustomModel: false },
      construction: {
        progress: stageProgress('framing'),
        stages: planStages({ contract: stocktonContract, current: 'framing', currentStart: stocktonFraming, closing: stocktonClosing }),
        estCompletion: stocktonClosing,
        photos: [
          { stage: 'Site work', url: photos.construction.excavation, caption: 'Excavation begins' },
          { stage: 'Foundation', url: photos.construction.foundation, caption: 'Footings poured' },
          { stage: 'Foundation', url: photos.construction.foundationWalls, caption: 'Foundation walls and waterproofing' },
          { stage: 'Site work', url: photos.construction.groundwork, caption: 'Backfill and groundwork' },
          { stage: 'Framing', url: photos.construction.framingExterior, caption: 'Second floor framing' },
          { stage: 'Framing', url: photos.construction.framingSide, caption: 'Roof trusses set' },
        ],
      },
      updatedAt: isoFromNow(-1),
    },
    {
      id: 'hm_raman_wellington', slug: 'raman-wellington', title: 'The Wellington at Hollin Brook', address: '21 Hollin Brook Lane', city: 'Alexandria, VA 22307',
      modelId: wellington.modelId, status: 'completed', published: false, featured: false, price: 1495000,
      beds: 5, baths: 4.5, sqft: 4372, lotSizeAcres: 0.45, ownerId: 'usr_priya',
      description: 'Wellington with oversized courtyard garage and finished basement.',
      images: [photos.hero.blueColonialLawn, photos.construction.completedKitchen],
      view3d: { enabled: true, config: wellington.config, hasCustomModel: false },
      construction: {
        progress: stageProgress('done'),
        stages: planStages({ contract: wellingtonContract, current: 'done', closing: wellingtonClosing }),
        photos: [{ stage: 'Completed', url: photos.hero.blueColonialLawn, caption: 'Front elevation' }],
      },
      closingDate: wellingtonClosing,
      warrantyEnds: addDaysIso(wellingtonClosing, 365),
      updatedAt: isoFromNow(-90),
    },
    {
      id: 'hm_bennett_lexington', slug: 'bennett-lexington', title: 'The Lexington at Harbor Row', address: '410 Harbor Row', city: 'Alexandria, VA 22314',
      modelId: lexington.modelId, status: 'under-construction', published: false, featured: false, price: 1420000,
      beds: 4, baths: 3.5, sqft: 3940, lotSizeAcres: 0.12, ownerId: 'usr_olivia',
      description: 'Three-level Lexington with finished loft, now in interior finishes.',
      images: [lexington.image, photos.construction.interiorBath],
      view3d: { enabled: true, config: lexington.config, hasCustomModel: false },
      construction: {
        progress: stageProgress('finishes'),
        stages: planStages({ contract: lexingtonContract, current: 'finishes', currentStart: lexingtonFinishes, closing: lexingtonClosing }),
        estCompletion: lexingtonClosing,
        photos: [
          { stage: 'Framing', url: photos.construction.framingExterior, caption: 'Framing complete' },
          { stage: 'Interior finishes', url: photos.construction.interiorRooms, caption: 'Trim and paint' },
          { stage: 'Interior finishes', url: photos.construction.interiorBath, caption: 'Bathroom vanity and fixtures installed' },
        ],
      },
      updatedAt: at(lexingtonFinishes, '15:00'),
    },
  ]

  /* ------------------------------ agreements ------------------------------ */
  const agreementBody = (lines: [string, string][]) => lines.map(([heading, body]) => ({ heading, body }))
  // Change Order #3 follows Daniel's loft design meeting (apt_8): issued that afternoon, revised the next day.
  const co3Issued = at(wd(-2), '15:00')
  const co3Revised = at(wd(-1), '16:00')

  const agreements: Agreement[] = [
    {
      id: 'agr_ellis_purchase', homeownerId: 'usr_daniel', homeId: 'hm_ellis_hamilton', type: 'purchase', title: 'Purchase Agreement — The Hamilton',
      reference: 'WH-PA-2025-014', status: 'signed', version: 1, amount: 1590000,
      summary: 'Agreement of sale for the Hamilton at 7 Wakefield Court, including lot, base house and selected options.',
      sections: agreementBody([
        ['Property', 'Lot and improvements at 7 Wakefield Court, Alexandria, VA 22308, built to the Hamilton plan (Elevation A).'],
        ['Purchase price', 'The total purchase price is $1,590,000, inclusive of the options listed in Schedule B.'],
        ['Deposit', 'An earnest money deposit of 5% is held in escrow until settlement.'],
        ['Settlement', 'Settlement occurs within 15 days of the certificate of occupancy.'],
      ]),
      history: [{ version: 1, at: at(bd(-420), '10:30'), byUserId: 'usr_lisa', note: 'Agreement issued' }],
      createdAt: at(bd(-420), '10:30'), updatedAt: at(hamiltonContract, '15:30'), updatedByUserId: 'usr_daniel',
      signedAt: at(hamiltonContract, '15:30'), signatureName: 'Daniel Ellis', signedByUserId: 'usr_daniel', seenByOwner: true, seenVersion: 1,
    },
    {
      id: 'agr_ellis_warranty', homeownerId: 'usr_daniel', homeId: 'hm_ellis_hamilton', type: 'warranty', title: 'Home Warranty — The Hamilton',
      reference: 'WH-WR-2025-014', status: 'active', version: 1,
      summary: 'One-year workmanship, two-year systems and ten-year structural coverage, starting at settlement.',
      sections: agreementBody([
        ['Workmanship', 'Covers defects in materials and workmanship for one year from settlement.'],
        ['Systems', 'Plumbing, electrical and HVAC distribution systems are covered for two years.'],
        ['Structural', 'Major structural defects are covered for ten years.'],
        ['How to file', 'Submit a “House fix” request in the Home Owner portal with photos; our team will schedule an inspection.'],
      ]),
      history: [{ version: 1, at: at(hamiltonClosing, '16:00'), byUserId: 'usr_sarah', note: 'Warranty activated at settlement' }],
      createdAt: at(hamiltonClosing, '16:00'), updatedAt: at(hamiltonClosing, '16:00'), updatedByUserId: 'usr_sarah', seenByOwner: true, seenVersion: 1,
    },
    {
      id: 'agr_ellis_construction', homeownerId: 'usr_daniel', homeId: 'hm_ellis_stockton', type: 'construction', title: 'Construction Contract — The Stockton',
      reference: 'WH-CC-2026-031', status: 'signed', version: 2, amount: 1185000,
      summary: 'Build On Your Lot construction contract for the Stockton at 14 Laurel Bend Way, with draw schedule.',
      sections: agreementBody([
        ['Scope of work', 'Construction of the Stockton plan with finished loft and bath per the approved construction drawings.'],
        ['Contract price', 'Contract price of $1,185,000, subject to approved change orders.'],
        ['Draw schedule', 'Draws at foundation, framing, drywall, trim and completion, as listed in Schedule C (revised).'],
        ['Schedule', 'Estimated completion within 11 months of permit issuance, weather permitting.'],
      ]),
      history: [
        { version: 1, at: at(bd(-95), '10:00'), byUserId: 'usr_lisa', note: 'Contract issued' },
        { version: 2, at: at(bd(-80), '14:00'), byUserId: 'usr_sarah', note: 'Revised draw schedule after lender review' },
      ],
      createdAt: at(bd(-95), '10:00'), updatedAt: at(stocktonContract, '11:15'), updatedByUserId: 'usr_daniel',
      signedAt: at(stocktonContract, '11:15'), signatureName: 'Daniel Ellis', signedByUserId: 'usr_daniel', seenByOwner: true, seenVersion: 2,
    },
    {
      id: 'agr_ellis_co3', homeownerId: 'usr_daniel', homeId: 'hm_ellis_stockton', type: 'change-order', title: 'Change Order #3 — Finished loft and bath',
      reference: 'WH-CO-2026-031-03', status: 'awaiting-signature', version: 2, amount: 28435,
      summary: 'Finish the third-floor loft with a full bath and two skylights. Adds 900 sq ft of finished space.',
      sections: agreementBody([
        ['Change description', 'Finish the 900 sq ft third-floor loft, add a full bath with shower, and install two operable skylights.'],
        ['Price adjustment', 'Adds $28,435 to the contract price, payable with the drywall draw.'],
        ['Schedule impact', 'Adds approximately 10 working days to the construction schedule.'],
      ]),
      history: [
        { version: 1, at: co3Issued, byUserId: 'usr_lisa', note: 'Issued after your design meeting' },
        { version: 2, at: co3Revised, byUserId: 'usr_sarah', note: 'Added two skylights and updated the price' },
      ],
      createdAt: co3Issued, updatedAt: co3Revised, updatedByUserId: 'usr_sarah', seenByOwner: false, seenVersion: 1,
    },
    {
      id: 'agr_ellis_selections', homeownerId: 'usr_daniel', homeId: 'hm_ellis_stockton', type: 'addendum', title: 'Selections Addendum — Kitchen and baths',
      reference: 'WH-AD-2026-031-01', status: 'draft', version: 1,
      summary: 'Finish selections from the upcoming design meeting (draft — not yet shared with the Home Owner).',
      sections: agreementBody([['Kitchen', 'Cabinetry, countertops and appliance package to be confirmed.'], ['Baths', 'Tile and fixture selections to be confirmed.']]),
      history: [{ version: 1, at: isoFromNow(0, -6), byUserId: 'usr_lisa', note: 'Draft started' }],
      createdAt: isoFromNow(0, -6), updatedAt: isoFromNow(0, -6), updatedByUserId: 'usr_lisa', seenByOwner: false, seenVersion: 0,
    },
    {
      id: 'agr_raman_purchase', homeownerId: 'usr_priya', homeId: 'hm_raman_wellington', type: 'purchase', title: 'Purchase Agreement — The Wellington',
      reference: 'WH-PA-2024-007', status: 'signed', version: 1, amount: 1495000,
      summary: 'Agreement of sale for the Wellington at 21 Hollin Brook Lane.',
      sections: agreementBody([['Property', 'Lot and improvements at 21 Hollin Brook Lane, built to the Wellington plan.'], ['Purchase price', '$1,495,000 including options.']]),
      history: [{ version: 1, at: at(bd(-800), '10:30'), byUserId: 'usr_lisa', note: 'Agreement issued' }],
      createdAt: at(bd(-800), '10:30'), updatedAt: at(wellingtonContract, '16:10'), updatedByUserId: 'usr_priya',
      signedAt: at(wellingtonContract, '16:10'), signatureName: 'Priya Raman', signedByUserId: 'usr_priya', seenByOwner: true, seenVersion: 1,
    },
    {
      id: 'agr_raman_warranty', homeownerId: 'usr_priya', homeId: 'hm_raman_wellington', type: 'warranty', title: 'Home Warranty — The Wellington',
      reference: 'WH-WR-2024-007', status: 'active', version: 1,
      summary: 'Ten-year structural coverage remains active; workmanship coverage has ended.',
      sections: agreementBody([['Structural', 'Major structural defects are covered for ten years from settlement.']]),
      history: [{ version: 1, at: at(wellingtonClosing, '16:00'), byUserId: 'usr_sarah', note: 'Warranty activated at settlement' }],
      createdAt: at(wellingtonClosing, '16:00'), updatedAt: at(wellingtonClosing, '16:00'), updatedByUserId: 'usr_sarah', seenByOwner: true, seenVersion: 1,
    },
    {
      id: 'agr_bennett_construction', homeownerId: 'usr_olivia', homeId: 'hm_bennett_lexington', type: 'construction', title: 'Construction Contract — The Lexington',
      reference: 'WH-CC-2026-022', status: 'signed', version: 1, amount: 1420000,
      summary: 'Construction contract for the Lexington at 410 Harbor Row.',
      sections: agreementBody([['Scope of work', 'Construction of the Lexington plan with finished loft.'], ['Contract price', '$1,420,000 subject to approved change orders.']]),
      history: [{ version: 1, at: at(bd(-170), '10:00'), byUserId: 'usr_lisa', note: 'Contract issued' }],
      createdAt: at(bd(-170), '10:00'), updatedAt: at(lexingtonContract, '13:20'), updatedByUserId: 'usr_olivia',
      signedAt: at(lexingtonContract, '13:20'), signatureName: 'Olivia Bennett', signedByUserId: 'usr_olivia', seenByOwner: true, seenVersion: 1,
    },
  ]

  /* ------------------------------ appointments ------------------------------ */
  // Every appointment is on a working day, inside office hours (8:00 AM – 5:30 PM) and on the booking grid.
  const designMeeting = wd(3)
  const appointments: Appointment[] = [
    { id: 'apt_1', homeownerId: 'usr_daniel', homeId: 'hm_ellis_stockton', type: 'design-selections', date: designMeeting, time: '10:00', durationMins: 90, location: 'office', status: 'confirmed', notes: 'Kitchen cabinetry and tile for both upstairs baths.', staffId: 'usr_lisa', staffNote: 'Samples will be ready in the design room.', bookedById: 'usr_daniel', createdAt: at(wd(-4), '09:20'), updatedAt: at(wd(-4), '11:05') },
    { id: 'apt_2', homeownerId: 'usr_daniel', homeId: 'hm_ellis_stockton', type: 'site-visit', date: wd(6), time: '14:00', durationMins: 60, location: 'home-site', status: 'requested', notes: 'Would like to walk the loft framing with Tom before insulation goes in.', bookedById: 'usr_daniel', createdAt: isoFromNow(0, -20), updatedAt: isoFromNow(0, -20) },
    { id: 'apt_3', homeownerId: 'usr_daniel', homeId: 'hm_ellis_hamilton', type: 'warranty-inspection', date: bd(-40), time: '11:00', durationMins: 60, location: 'home-site', status: 'completed', notes: 'Warranty check-up before the end of the first year.', staffId: 'usr_tom', bookedById: 'usr_daniel', createdAt: at(bd(-55), '09:00'), updatedAt: at(bd(-40), '12:10') },
    { id: 'apt_4', homeownerId: 'usr_priya', homeId: 'hm_raman_wellington', type: 'warranty-inspection', date: wd(2), time: '11:00', durationMins: 60, location: 'home-site', status: 'requested', notes: 'Please look at the basement ceiling stain at the same visit.', bookedById: 'usr_priya', createdAt: isoFromNow(-1), updatedAt: isoFromNow(-1) },
    { id: 'apt_5', homeownerId: 'usr_olivia', homeId: 'hm_bennett_lexington', type: 'site-visit', date: wd(1), time: '15:00', durationMins: 60, location: 'home-site', status: 'confirmed', notes: 'Review trim and paint progress.', staffId: 'usr_tom', bookedById: 'usr_olivia', createdAt: at(wd(-5), '08:45'), updatedAt: at(wd(-5), '10:30') },
    { id: 'apt_6', homeownerId: 'usr_olivia', homeId: 'hm_bennett_lexington', type: 'closing', date: lexingtonClosing, time: '10:00', durationMins: 60, location: 'office', status: 'requested', notes: 'Tentative closing date — flexible by a few days.', bookedById: 'usr_olivia', createdAt: isoFromNow(0, -2), updatedAt: isoFromNow(0, -2) },
    // The last few working days, so the staff calendar shows this week's history as well as what's coming up.
    { id: 'apt_7', homeownerId: 'usr_olivia', homeId: 'hm_bennett_lexington', type: 'office-meeting', date: wd(-1), time: '13:00', durationMins: 30, location: 'office', status: 'completed', notes: 'Final paint colors and cabinet hardware.', staffId: 'usr_lisa', bookedById: 'usr_olivia', createdAt: at(wd(-6), '16:40'), updatedAt: at(wd(-1), '13:40') },
    { id: 'apt_8', homeownerId: 'usr_daniel', homeId: 'hm_ellis_stockton', type: 'office-meeting', date: wd(-2), time: '10:00', durationMins: 30, location: 'office', status: 'completed', notes: 'Go over finish options for the third-floor loft.', staffId: 'usr_lisa', bookedById: 'usr_daniel', createdAt: at(wd(-7), '15:15'), updatedAt: at(wd(-2), '10:40') },
    { id: 'apt_9', homeownerId: 'usr_marcus', type: 'consultation', date: wd(-3), time: '14:00', durationMins: 60, location: 'office', status: 'completed', notes: 'First meeting about building on the lot he is buying in Fort Hunt.', staffId: 'usr_lisa', staffNote: 'Booked by phone.', bookedById: 'usr_lisa', createdAt: at(wd(-8), '09:40'), updatedAt: at(wd(-3), '15:05') },
  ]

  /* -------------------------------- requests -------------------------------- */
  const r1041Created = at(wd(-4), '08:40')
  const r1041Assigned = at(wd(-4), '10:15')
  const r1041Started = at(wd(-1), '09:30')
  const r1043Created = at(wd(-6), '14:10')
  const r1043Assigned = at(wd(-5), '09:00')
  const r1043Scheduled = at(wd(-2), '11:20')
  const r1038Created = at(wd(-2), '08:05')
  const r1038Assigned = at(wd(-1), '09:10')
  const r1029Created = at(bd(-35), '09:00')
  const r1029Assigned = at(bd(-34), '10:00')
  const r1029Resolved = at(bd(-20), '15:30')
  const r1042Created = isoFromNow(0, -5)
  const r1044Created = isoFromNow(0, -9)

  const requests: MaintenanceRequest[] = [
    {
      id: 'req_1041', number: 1041, homeownerId: 'usr_daniel', homeId: 'hm_ellis_hamilton', category: 'gardening', title: 'Two boxwoods by the front walk are browning',
      description: 'The two boxwoods on either side of the front walk have turned brown on the street side over the last two weeks.', priority: 'normal', status: 'in-progress',
      assignedToId: 'usr_tom', preferredDate: wd(2), scheduledFor: wd(2), photos: [],
      comments: [
        { id: 'cmt_1', authorId: 'usr_tom', authorRole: 'staff', body: 'Our landscaper will replace both under the landscaping warranty. The crew is booked for the work date on this request.', at: at(wd(-1), '09:32') },
        { id: 'cmt_2', authorId: 'usr_daniel', authorRole: 'homeowner', body: 'Thank you! That works — the side gate is unlocked.', at: isoFromNow(0, -20) },
      ],
      events: [
        event(r1041Created, 'usr_daniel', { type: 'status', status: 'submitted' }),
        event(r1041Assigned, 'usr_sarah', { type: 'assignee', assigneeId: 'usr_tom' }),
        event(r1041Assigned, 'usr_sarah', { type: 'status', status: 'assigned' }),
        event(r1041Started, 'usr_tom', { type: 'schedule', date: wd(2) }),
        event(r1041Started, 'usr_tom', { type: 'status', status: 'in-progress' }),
      ],
      createdById: 'usr_daniel', createdAt: r1041Created, updatedAt: isoFromNow(0, -20),
    },
    {
      id: 'req_1042', number: 1042, homeownerId: 'usr_daniel', homeId: 'hm_ellis_hamilton', category: 'road-fixing', title: 'Hairline crack across the driveway apron',
      description: 'A crack has opened up across the driveway apron where it meets the street. It is about 6 feet long.', priority: 'high', status: 'submitted',
      preferredDate: wd(4), photos: [], comments: [],
      events: [event(r1042Created, 'usr_daniel', { type: 'status', status: 'submitted' })],
      createdById: 'usr_daniel', createdAt: r1042Created, updatedAt: r1042Created,
    },
    {
      id: 'req_1043', number: 1043, homeownerId: 'usr_daniel', homeId: 'hm_ellis_hamilton', category: 'house-fix', title: 'Primary bath shower door sticks',
      description: 'The frameless shower door in the primary bath drags on the threshold when closing.', priority: 'low', status: 'scheduled',
      assignedToId: 'usr_tom', scheduledFor: wd(3), photos: [],
      comments: [{ id: 'cmt_3', authorId: 'usr_sarah', authorRole: 'staff', body: 'Scheduled with our glass installer. They will adjust the hinges.', at: at(wd(-2), '11:21') }],
      events: [
        event(r1043Created, 'usr_daniel', { type: 'status', status: 'submitted' }),
        event(r1043Assigned, 'usr_sarah', { type: 'assignee', assigneeId: 'usr_tom' }),
        event(r1043Assigned, 'usr_sarah', { type: 'status', status: 'assigned' }),
        event(r1043Scheduled, 'usr_sarah', { type: 'schedule', date: wd(3) }),
        event(r1043Scheduled, 'usr_sarah', { type: 'status', status: 'scheduled' }),
      ],
      createdById: 'usr_daniel', createdAt: r1043Created, updatedAt: at(wd(-2), '11:21'),
    },
    {
      id: 'req_1038', number: 1038, homeownerId: 'usr_priya', homeId: 'hm_raman_wellington', category: 'report', title: 'Water stain on basement ceiling',
      description: 'A small water stain appeared on the basement ceiling below the hall bathroom. It is dry to the touch.', priority: 'urgent', status: 'assigned',
      assignedToId: 'usr_tom', preferredDate: wd(2), photos: [],
      comments: [
        { id: 'cmt_4', authorId: 'usr_sarah', authorRole: 'staff', body: 'Thanks for reporting this. Tom will inspect it during your warranty visit.', at: at(wd(-1), '09:12') },
        { id: 'cmt_5', authorId: 'usr_tom', authorRole: 'staff', body: 'Bring moisture meter; check shower pan and supply lines.', at: at(wd(-1), '10:30'), internal: true },
      ],
      events: [
        event(r1038Created, 'usr_priya', { type: 'status', status: 'submitted' }),
        event(r1038Assigned, 'usr_sarah', { type: 'assignee', assigneeId: 'usr_tom' }),
        event(r1038Assigned, 'usr_sarah', { type: 'status', status: 'assigned' }),
      ],
      createdById: 'usr_priya', createdAt: r1038Created, updatedAt: at(wd(-1), '10:30'),
    },
    {
      id: 'req_1029', number: 1029, homeownerId: 'usr_priya', homeId: 'hm_raman_wellington', category: 'gardening', title: 'Lawn seed didn’t take along the side yard',
      description: 'Bare patches along the side yard after the fall seeding.', priority: 'low', status: 'resolved', assignedToId: 'usr_tom', photos: [],
      comments: [{ id: 'cmt_6', authorId: 'usr_tom', authorRole: 'staff', body: 'Side yard was re-sodded. Please water daily for two weeks.', at: r1029Resolved }],
      events: [
        event(r1029Created, 'usr_priya', { type: 'status', status: 'submitted' }),
        event(r1029Assigned, 'usr_sarah', { type: 'assignee', assigneeId: 'usr_tom' }),
        event(r1029Assigned, 'usr_sarah', { type: 'status', status: 'assigned' }),
        event(r1029Resolved, 'usr_tom', { type: 'status', status: 'resolved' }),
      ],
      createdById: 'usr_priya', createdAt: r1029Created, updatedAt: r1029Resolved,
    },
    {
      id: 'req_1044', number: 1044, homeownerId: 'usr_olivia', homeId: 'hm_bennett_lexington', category: 'report', title: 'Debris from the neighboring lot on our driveway',
      description: 'Some construction debris from the lot next door has been blowing onto our driveway apron.', priority: 'normal', status: 'submitted', photos: [], comments: [],
      events: [event(r1044Created, 'usr_olivia', { type: 'status', status: 'submitted' })],
      createdById: 'usr_olivia', createdAt: r1044Created, updatedAt: r1044Created,
    },
  ]

  /* ---------------------------------- leads ---------------------------------- */
  const leads: Lead[] = [
    { id: 'led_1', firstName: 'Megan', lastName: 'Fischer', email: 'megan.fischer@example.com', phone: '+17035550181', interest: 'build-on-your-lot', modelSlug: 'fort-hunt', bestTime: 'Evening', message: 'We own a half-acre lot in Fort Hunt and like the Fort Hunt plan. What would the first step look like?', source: 'Website contact form', status: 'new', createdAt: isoFromNow(0, -3) },
    shenandoah
      ? { id: 'led_2', firstName: 'Robert', lastName: 'Kim', email: 'rkim@example.com', phone: '+17035550182', interest: 'move-in-ready', modelSlug: 'hamilton', bestTime: 'Morning', message: `We’re interested in ${shenandoah.address}. Could we see the plans and walk the lot?`, source: `Listing: ${shenandoah.title}`, status: 'contacted', createdAt: at(wd(-2), '19:10'), assignedToId: 'usr_lisa', homeId: shenandoah.id, homeSlug: shenandoah.slug, homeTitle: shenandoah.title }
      : { id: 'led_2', firstName: 'Robert', lastName: 'Kim', email: 'rkim@example.com', phone: '+17035550182', interest: 'move-in-ready', modelSlug: 'hamilton', bestTime: 'Morning', message: 'We’re interested in your homes for sale. Could we see the plans for the Hamilton?', source: 'Website contact form', status: 'contacted', createdAt: at(wd(-2), '19:10'), assignedToId: 'usr_lisa' },
    { id: 'led_3', firstName: 'David', lastName: 'Okafor', email: 'd.okafor@example.com', phone: '+17035550183', interest: 'custom-home', modelSlug: 'harrison', bestTime: 'Anytime', message: 'We’re looking for a river-front custom home. Do you have another lot like Burke Drive coming up?', source: 'Website contact form', status: 'qualified', createdAt: at(wd(-6), '12:30'), assignedToId: 'usr_lisa' },
    { id: 'led_4', firstName: 'Helen', lastName: 'Park', email: 'helen.park@example.com', phone: '+17035550184', interest: 'remodeling', bestTime: 'Afternoon', message: 'You built our home in 2009 — we would like to talk about finishing the basement.', source: 'Website contact form', status: 'new', createdAt: isoFromNow(-1, -4) },
  ]

  /* ------------------------------ notifications ------------------------------ */
  const notifications: Notification[] = [
    { id: 'ntf_1', to: 'usr_daniel', title: 'Change Order #3 is ready to sign', body: 'Sarah Mitchell updated the change order for your finished loft and bath.', link: '/owner/agreements/agr_ellis_co3', at: co3Revised, readBy: [] },
    { id: 'ntf_2', to: 'usr_daniel', title: 'Design selections confirmed', body: 'Your design selections meeting is confirmed with Lisa Chen.', link: '/owner/appointments', at: at(wd(-4), '11:05'), readBy: [] },
    { id: 'ntf_3', to: 'usr_daniel', title: 'New construction photos', body: 'Roof trusses are set on the Stockton.', link: '/owner/homes/hm_ellis_stockton', at: isoFromNow(-2), readBy: ['usr_daniel'] },
    { id: 'ntf_4', to: 'role:staff', perm: 'appointments.manage', title: 'New booking request', body: 'Daniel Ellis requested a site visit.', link: '/staff/appointments', at: isoFromNow(0, -20), readBy: [] },
    { id: 'ntf_5', to: 'role:staff', perm: 'requests.manage', title: 'New request #1042 · Road fixing', body: 'Daniel Ellis: Hairline crack across the driveway apron.', link: '/staff/requests/req_1042', at: r1042Created, readBy: [] },
    { id: 'ntf_6', to: 'role:staff', perm: 'leads.view', title: 'New website inquiry', body: 'Megan Fischer is interested in Build On Your Lot.', link: '/staff/leads', at: isoFromNow(0, -3), readBy: [] },
    { id: 'ntf_7', to: 'usr_priya', title: 'Request #1038 assigned', body: 'Tom Becker will inspect the basement ceiling stain.', link: '/owner/maintenance/req_1038', at: r1038Assigned, readBy: [] },
    { id: 'ntf_8', to: 'role:staff', perm: 'appointments.manage', title: 'New booking request', body: 'Priya Raman requested a warranty inspection.', link: '/staff/appointments', at: isoFromNow(-1), readBy: ['usr_sarah'] },
  ]

  /* -------------------------------- activity -------------------------------- */
  const activity: ActivityEntry[] = [
    { id: 'act_1', actorId: 'usr_sarah', action: 'updated agreement', target: 'Change Order #3 — Finished loft and bath (v2)', at: co3Revised, kind: 'agreement' },
    { id: 'act_2', actorId: 'usr_daniel', action: 'requested appointment', target: 'Site visit — The Stockton at Laurel Bend', at: isoFromNow(0, -20), kind: 'appointment' },
    { id: 'act_3', actorId: 'usr_daniel', action: 'submitted request', target: '#1042 Hairline crack across the driveway apron', at: r1042Created, kind: 'request' },
    { id: 'act_4', actorId: 'usr_tom', action: 'commented on request', target: '#1041 Two boxwoods by the front walk are browning', at: at(wd(-1), '09:32'), kind: 'request' },
    { id: 'act_5', actorId: 'usr_admin', action: 'invited Home Owner', target: 'Marcus Grant', at: isoFromNow(-2), kind: 'user' },
    ...(pricedListing
      ? [{ id: 'act_6', actorId: 'usr_lisa', action: 'updated home', target: `${pricedListing.title} — price set to ${formatPrice(pricedListing.price)}`, at: isoFromNow(-3), kind: 'home' as const }]
      : []),
    { id: 'act_7', actorId: 'guest', action: 'submitted inquiry', target: 'Megan Fischer — Build On Your Lot', at: isoFromNow(0, -3), kind: 'lead' },
    { id: 'act_8', actorId: 'usr_sarah', action: 'confirmed appointment', target: 'Daniel Ellis — Design selections', at: at(wd(-4), '11:05'), kind: 'appointment' },
    { id: 'act_9', actorId: 'usr_tom', action: 'moved construction stage', target: 'The Lexington at Harbor Row → Interior finishes', at: at(lexingtonFinishes, '15:00'), kind: 'home' },
  ]

  const settings: Settings = {
    features: { view3d: true, booking: true, maintenance: true, agreementsEsign: true, contactForm: true },
    categories: { gardening: true, 'road-fixing': true, report: true, 'house-fix': true },
    booking: { workDays: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '17:30', slotMins: 60, daysAhead: 45 },
    office: {
      name: 'Wakefield Homes, LC',
      address: '8400 Radford Ave, Suite 200, Alexandria, VA 22309',
      phone: '+17033603134',
      // The live website publishes no email address; the Super Admin can add one in Platform settings.
      email: '',
      hours: OFFICE_HOURS,
    },
    staffPermissions: ['appointments.manage', 'requests.manage', 'homes.edit', 'homes.3d', 'agreements.edit', 'leads.view', 'homeowners.view'],
  }

  const formerUsers: FormerUser[] = []
  const formerHomes: FormerHome[] = []

  return {
    users,
    homes,
    /** Ids of the homes that come from listings.ts (the store refreshes them when that file changes). */
    listingIds: listings.map((h) => h.id),
    agreements,
    appointments,
    requests,
    leads,
    notifications,
    activity,
    settings,
    formerUsers,
    formerHomes,
    nextRequestNumber: 1045,
    /** Counter for new agreement references (WH-<type>-<year>-<number>). */
    nextAgreementNumber: 101,
    /** When the relative dates above were generated (the store shifts them when opened on a later day). */
    datesAsOf: nowIso(),
  }
}

export type SeedData = ReturnType<typeof createSeed>
