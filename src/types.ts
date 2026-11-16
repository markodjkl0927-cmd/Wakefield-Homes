/**
 * Domain types for the Wakefield Homes presentation app.
 * Everything dynamic lives in the client-side demo store (src/store) and is persisted to localStorage.
 */

/* ------------------------------------------------------------------ */
/* 3D house configuration (rendered procedurally by src/three)          */
/* ------------------------------------------------------------------ */

export type HouseStyle =
  | 'colonial'
  | 'craftsman'
  | 'farmhouse'
  | 'modern-farmhouse'
  | 'federal'
  | 'cottage'
  | 'nantucket'
  | 'traditional'
  | 'foursquare'

export type RoofType = 'gable' | 'hip' | 'cross-gable'
export type SidingType = 'lap' | 'board-batten' | 'shingle' | 'brick'
export type PorchType = 'none' | 'front' | 'wrap' | 'portico'
export type GaragePosition = 'left' | 'right' | 'courtyard' | 'none'

export interface HouseColors {
  siding: string
  trim: string
  roof: string
  door: string
  shutters: string
  stone: string
  windowFrame: string
}

/** Parameters for the procedural 3D house. Units are metres. */
export interface HouseConfig {
  style: HouseStyle
  /** Above-grade levels: 2, or 3 when the plan has a finished loft / third level. */
  stories: 2 | 3
  width: number
  depth: number
  roof: RoofType
  /** Roof rise over run, 0.35 (low) – 1.0 (steep). */
  roofPitch: number
  siding: SidingType
  porch: PorchType
  garageBays: 0 | 1 | 2 | 3
  garagePosition: GaragePosition
  dormers: 0 | 1 | 2 | 3
  chimney: boolean
  shutters: boolean
  stoneBase: boolean
  /** Front-facade windows per upper floor (2–6). */
  windowsPerFloor: number
  screenPorch: boolean
  colors: HouseColors
}

export type TimeOfDay = 'day' | 'dusk' | 'night'

/* ------------------------------------------------------------------ */
/* Catalog: floor plans (models) and communities                        */
/* ------------------------------------------------------------------ */

/** A document the client publishes on the live site (brochure, included-features list, site plan…). */
export interface DocumentLink {
  label: string
  url: string
}

/** One row of the live Build On Your Lot price list, exactly as published (as of PRICE_AS_OF). */
export interface PriceListRow {
  sqft: number
  beds: string
  baths: string
  style: string
  /** null = published as "Call for update". */
  price: number | null
  /** Extra price published in the row, e.g. "Expanded plan $963,371". */
  priceNote?: string
  /** The row's model description, as published. */
  description: string
}

export interface HomeModel {
  id: string
  slug: string
  name: string
  style: string
  isNew?: boolean
  beds: string
  baths: string
  sqftMin: number
  sqftMax?: number
  garage: string
  levels?: string
  /** Build On Your Lot base price (as of priceAsOf). null = call for pricing. */
  basePrice: number | null
  basePriceNote?: string
  /** The plan's row on the live BOYL price list. Only the 19 published plans have one. */
  priceList?: PriceListRow
  /** The plan brochure (PDF) the live Home Gallery links. */
  brochureUrl?: string
  summary: string
  highlights: string[]
  image: string
  house3d: HouseConfig
}

export type CommunityStatus = 'now-selling' | 'coming-soon' | 'under-construction' | 'sold-out'

export interface Community {
  id: string
  slug: string
  name: string
  area: string
  address: string
  status: CommunityStatus
  lots: string
  /** Not every project publishes a lot size. */
  lotSize?: string
  summary: string
  modelSlugs: string[]
  image: string
  priceFrom?: number
  /** Shown when no price is published, e.g. "Price TBD". */
  priceNote?: string
  /** One-line status detail as published, e.g. "Available December 2026". */
  statusNote?: string
  /** Listed under "Current Projects" on the live Our Communities page. */
  current?: boolean
  /** A Build On Your Lot project on the client's own lot (not for sale). */
  buildOnYourLot?: boolean
  /** Brochures, included-features lists and site plans the live page links. */
  documents?: DocumentLink[]
}

/* ------------------------------------------------------------------ */
/* Users and auth                                                       */
/* ------------------------------------------------------------------ */

export type Role = 'homeowner' | 'staff' | 'admin'
export type UserStatus = 'active' | 'invited' | 'disabled'

export interface User {
  id: string
  role: Role
  name: string
  email: string
  phone: string
  /** Demo only — this prototype has no real backend or password hashing. */
  password: string
  title?: string
  status: UserStatus
  createdAt: string
  lastLoginAt?: string
  /** Homeowner mailing address. */
  address?: string
}

/**
 * A deleted account, kept so the activity log, comments and version history can still name the person
 * ("Tom Becker (deleted)"). Deleting an account removes the records that would otherwise point at it.
 */
export interface FormerUser {
  id: string
  name: string
  email: string
  role: Role
  deletedAt: string
}

/** A deleted home, kept so agreements, requests and appointments can still name the property. */
export interface FormerHome {
  id: string
  title: string
  address: string
  city: string
  deletedAt: string
}

export type Permission =
  | 'appointments.manage'
  | 'requests.manage'
  | 'homes.edit'
  | 'homes.3d'
  | 'agreements.edit'
  | 'leads.view'
  | 'homeowners.view'
  | 'users.manage'
  | 'settings.manage'
  | 'activity.view'

/* ------------------------------------------------------------------ */
/* Homes (single source of truth for listings AND owned homes)          */
/* ------------------------------------------------------------------ */

export type HomeStatus =
  | 'available'
  | 'coming-soon'
  | 'under-contract'
  | 'under-construction'
  | 'completed'
  | 'sold'

export type ConstructionStageKey =
  | 'contract'
  | 'site'
  | 'foundation'
  | 'framing'
  | 'mep'
  | 'drywall'
  | 'finishes'
  | 'final'
  | 'closing'

export interface ConstructionStage {
  key: ConstructionStageKey
  label: string
  status: 'done' | 'current' | 'upcoming'
  date?: string
  note?: string
}

export interface Home {
  id: string
  slug: string
  /** e.g. "Lot 36 · The Stockton" */
  title: string
  address: string
  city: string
  communityId?: string
  lot?: string
  /** '' when the home isn't built on a portfolio plan (e.g. the Oronoco Street townhomes). */
  modelId: string
  status: HomeStatus
  /** Shown on the public website (Move In Ready / listings) when true. */
  published: boolean
  featured: boolean
  price: number | null
  priceNote?: string
  beds: number
  baths: number
  sqft: number
  lotSizeAcres?: number
  /** Published delivery timing for a home not finished yet, e.g. "Spring 2027". */
  delivery?: string
  /** Specs not published for this home: pages leave them out (the numeric fields then hold placeholders). */
  unpublishedSpecs?: ('beds' | 'baths' | 'sqft')[]
  /** Brochures and included-features lists the live listing links. */
  documents?: DocumentLink[]
  description: string
  images: string[]
  /** The Home Owner it belongs to. An owned home is never 'available' or 'coming-soon' (the store enforces it). */
  ownerId?: string
  /** 3D viewer settings managed by staff. */
  view3d: {
    enabled: boolean
    config: HouseConfig
    /** true when staff uploaded a custom .glb (stored in IndexedDB under the home id). */
    hasCustomModel: boolean
  }
  construction?: {
    progress: number
    stages: ConstructionStage[]
    estCompletion?: string
    photos: { stage: string; url: string; caption?: string }[]
  }
  /** yyyy-mm-dd; matches the Closing construction stage. */
  closingDate?: string
  /** yyyy-mm-dd end of the one-year workmanship warranty (structural coverage runs ten years from closingDate). */
  warrantyEnds?: string
  updatedAt: string
}

/* ------------------------------------------------------------------ */
/* Agreements                                                           */
/* ------------------------------------------------------------------ */

export type AgreementType = 'purchase' | 'construction' | 'change-order' | 'warranty' | 'addendum' | 'hoa'
export type AgreementStatus = 'draft' | 'awaiting-signature' | 'signed' | 'active' | 'void'

export interface AgreementSection {
  heading: string
  body: string
}

export interface AgreementVersion {
  version: number
  at: string
  byUserId: string
  note: string
}

export interface Agreement {
  id: string
  homeownerId: string
  homeId?: string
  type: AgreementType
  title: string
  reference: string
  status: AgreementStatus
  version: number
  amount?: number
  summary: string
  sections: AgreementSection[]
  history: AgreementVersion[]
  createdAt: string
  updatedAt: string
  updatedByUserId: string
  signedAt?: string
  signatureName?: string
  /** The Home Owner who signed (signing is never done on someone's behalf). */
  signedByUserId?: string
  /** Homeowner has viewed the latest version. */
  seenByOwner: boolean
  /**
   * Latest version the Home Owner has opened (undefined/0 = never opened). "New" when never opened,
   * "Updated" when 0 < seenVersion < version.
   */
  seenVersion?: number
}

/* ------------------------------------------------------------------ */
/* Appointments                                                         */
/* ------------------------------------------------------------------ */

export type AppointmentType =
  | 'consultation'
  | 'design-selections'
  | 'site-visit'
  | 'walkthrough'
  | 'warranty-inspection'
  | 'closing'
  | 'office-meeting'

export type AppointmentStatus = 'requested' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled' | 'declined'

export interface Appointment {
  id: string
  homeownerId: string
  homeId?: string
  type: AppointmentType
  /** yyyy-mm-dd */
  date: string
  /** HH:mm (24h) */
  time: string
  durationMins: number
  location: 'office' | 'home-site' | 'video'
  status: AppointmentStatus
  notes: string
  staffId?: string
  staffNote?: string
  /** Who booked it: the Home Owner, or a staff member booking on their behalf (e.g. a phone call). */
  bookedById?: string
  /** Set when the date or time changed: the previous slot, who moved it and when. */
  rescheduled?: { fromDate: string; fromTime: string; byUserId: string; at: string }
  createdAt: string
  updatedAt: string
}

/* ------------------------------------------------------------------ */
/* Maintenance & service requests                                       */
/* ------------------------------------------------------------------ */

/** The four request types the client asked for. */
export type RequestCategory = 'gardening' | 'road-fixing' | 'report' | 'house-fix'
export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent'
export type RequestStatus = 'submitted' | 'assigned' | 'scheduled' | 'in-progress' | 'resolved' | 'closed'

export interface RequestComment {
  id: string
  authorId: string
  /** The author's role when they wrote it (so old staff replies stay labelled "Staff" after a role change). */
  authorRole?: Role
  body: string
  at: string
  /** Staff-only internal note (hidden from the homeowner). */
  internal?: boolean
}

/**
 * Timeline entry for a request: status, assignee and work-date changes. Shown as small timeline lines
 * ("Daniel confirmed the fix · Closed"), never as chat messages.
 */
export interface RequestEvent {
  id: string
  at: string
  /** Who made the change. */
  byUserId: string
  type: 'status' | 'assignee' | 'schedule'
  /** type 'status': the new status. */
  status?: RequestStatus
  /** type 'assignee': the new assignee, null when unassigned. */
  assigneeId?: string | null
  /** type 'schedule': the new work date (yyyy-mm-dd), null when cleared. */
  date?: string | null
  /** Optional context, e.g. "Confirmed the fix" or why it was unassigned. */
  note?: string
}

export interface MaintenanceRequest {
  id: string
  number: number
  homeownerId: string
  homeId: string
  category: RequestCategory
  title: string
  description: string
  priority: RequestPriority
  status: RequestStatus
  assignedToId?: string
  preferredDate?: string
  scheduledFor?: string
  photos: string[]
  comments: RequestComment[]
  /** Status / assignee / schedule history, oldest first. */
  events?: RequestEvent[]
  /** Who filed it: the Home Owner, or a staff member logging it on their behalf. */
  createdById?: string
  createdAt: string
  updatedAt: string
}

/* ------------------------------------------------------------------ */
/* Leads from the public contact form                                   */
/* ------------------------------------------------------------------ */

export type LeadInterest = 'move-in-ready' | 'build-on-your-lot' | 'custom-home' | 'remodeling' | 'general'
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'closed'

export interface Lead {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  interest: LeadInterest
  modelSlug?: string
  bestTime?: string
  message: string
  source: string
  status: LeadStatus
  createdAt: string
  assignedToId?: string
  /** The listing the inquiry was sent from (home detail page), with a snapshot of its title and URL slug. */
  homeId?: string
  homeSlug?: string
  homeTitle?: string
}

/* ------------------------------------------------------------------ */
/* Notifications, activity log, settings                                */
/* ------------------------------------------------------------------ */

export interface Notification {
  id: string
  /** Recipient user id, or a role broadcast ("role:staff" reaches staff and admins). */
  to: string
  title: string
  body: string
  link?: string
  at: string
  readBy: string[]
  /** Staff only see it when their role holds this permission (the area the link opens). */
  perm?: Permission
  /** Internal: a newer notification with the same key replaces an unread one sent seconds earlier. */
  key?: string
}

export interface ActivityEntry {
  id: string
  /** Who did it. During "View as" this is the Super Admin, and viewingAsId is the user they were viewing as. */
  actorId: string
  /** Set when a Super Admin acted while viewing as this user: "Alex Morgan (viewing as Daniel Ellis)". */
  viewingAsId?: string
  action: string
  target: string
  at: string
  kind: 'auth' | 'home' | 'agreement' | 'appointment' | 'request' | 'lead' | 'user' | 'settings'
}

export interface Settings {
  features: {
    view3d: boolean
    booking: boolean
    maintenance: boolean
    agreementsEsign: boolean
    contactForm: boolean
  }
  /** Which request categories homeowners can choose. */
  categories: Record<RequestCategory, boolean>
  booking: {
    /** 0 = Sunday … 6 = Saturday */
    workDays: number[]
    startTime: string
    endTime: string
    slotMins: number
    daysAhead: number
  }
  office: {
    name: string
    address: string
    phone: string
    email: string
    hours: string
  }
  /** Permissions granted to the staff role (admins always have every permission). */
  staffPermissions: Permission[]
}
