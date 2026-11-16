import {
  Brush,
  CalendarCheck,
  ClipboardList,
  Construction,
  FileSignature,
  Flower2,
  Hammer,
  Home as HomeIcon,
  KeyRound,
  Map,
  MessageSquareWarning,
  Ruler,
  ShieldCheck,
  Truck,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react'
import type {
  AgreementStatus,
  AgreementType,
  AppointmentStatus,
  AppointmentType,
  ConstructionStageKey,
  HomeStatus,
  LeadInterest,
  LeadStatus,
  Permission,
  RequestCategory,
  RequestPriority,
  RequestStatus,
  Role,
} from '@/types'

/** Visual tone for status badges. */
export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'violet'

export interface LabelDef {
  label: string
  tone: Tone
}

export const roleLabels: Record<Role, string> = {
  homeowner: 'Home Owner',
  staff: 'Staff',
  admin: 'Super Admin',
}

export const homeStatus: Record<HomeStatus, LabelDef> = {
  available: { label: 'Available', tone: 'success' },
  'coming-soon': { label: 'Coming soon', tone: 'info' },
  'under-contract': { label: 'Under contract', tone: 'warning' },
  'under-construction': { label: 'Under construction', tone: 'brand' },
  completed: { label: 'Completed', tone: 'neutral' },
  sold: { label: 'Sold', tone: 'neutral' },
}

export const appointmentTypes: Record<AppointmentType, { label: string; description: string; durationMins: number; icon: LucideIcon }> = {
  consultation: { label: 'New home consultation', description: 'Talk through plans, lots, budget and timing.', durationMins: 60, icon: HomeIcon },
  'design-selections': { label: 'Design selections', description: 'Choose finishes, fixtures and options with our team.', durationMins: 90, icon: Brush },
  'site-visit': { label: 'Site visit', description: 'Walk your lot or home site with your construction manager.', durationMins: 60, icon: Map },
  walkthrough: { label: 'Walkthrough', description: 'Substantial completion or final walkthrough of your home.', durationMins: 60, icon: Ruler },
  'warranty-inspection': { label: 'Warranty inspection', description: 'Schedule a check-up under your home warranty.', durationMins: 60, icon: ShieldCheck },
  closing: { label: 'Closing & key handover', description: 'Sign documents and receive your keys.', durationMins: 60, icon: KeyRound },
  'office-meeting': { label: 'Office meeting', description: 'Meet the team at the Wakefield office.', durationMins: 30, icon: Users },
}

export const appointmentLocations: Record<'office' | 'home-site' | 'video', { label: string; icon: LucideIcon }> = {
  office: { label: 'Wakefield office', icon: HomeIcon },
  'home-site': { label: 'At the home / site', icon: Construction },
  video: { label: 'Video call', icon: Video },
}

export const appointmentStatus: Record<AppointmentStatus, LabelDef> = {
  requested: { label: 'Requested', tone: 'warning' },
  confirmed: { label: 'Confirmed', tone: 'success' },
  rescheduled: { label: 'Rescheduled', tone: 'info' },
  completed: { label: 'Completed', tone: 'neutral' },
  cancelled: { label: 'Canceled', tone: 'neutral' },
  declined: { label: 'Declined', tone: 'danger' },
}

/** The four request types from the client brief. */
export const requestCategories: Record<RequestCategory, { label: string; description: string; icon: LucideIcon; examples: string[] }> = {
  gardening: {
    label: 'Gardening',
    description: 'Landscaping, lawn, trees and planting',
    icon: Flower2,
    examples: ['Re-sod a patch of lawn', 'Replace a failed shrub', 'Adjust irrigation'],
  },
  'road-fixing': {
    label: 'Road fixing',
    description: 'Driveway, road, curb and walkway repairs',
    icon: Truck,
    examples: ['Crack in the driveway apron', 'Pothole near the curb', 'Loose paver on the walkway'],
  },
  report: {
    label: 'Make a report',
    description: 'Report a problem, safety concern or incident',
    icon: MessageSquareWarning,
    examples: ['Water stain on a ceiling', 'Debris from a neighboring site', 'Something doesn’t look right'],
  },
  'house-fix': {
    label: 'House fix',
    description: 'Repairs inside or outside the home',
    icon: Hammer,
    examples: ['Sticking door or window', 'Drywall crack', 'Leaking faucet'],
  },
}

export const requestPriority: Record<RequestPriority, LabelDef> = {
  low: { label: 'Low', tone: 'neutral' },
  normal: { label: 'Normal', tone: 'info' },
  high: { label: 'High', tone: 'warning' },
  urgent: { label: 'Urgent', tone: 'danger' },
}

export const requestStatus: Record<RequestStatus, LabelDef> = {
  submitted: { label: 'Submitted', tone: 'warning' },
  assigned: { label: 'Assigned', tone: 'info' },
  scheduled: { label: 'Scheduled', tone: 'violet' },
  'in-progress': { label: 'In progress', tone: 'brand' },
  resolved: { label: 'Resolved', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral' },
}

/** Ordered request workflow (used for progress trackers and kanban columns). */
export const requestFlow: RequestStatus[] = ['submitted', 'assigned', 'scheduled', 'in-progress', 'resolved', 'closed']

export const agreementTypes: Record<AgreementType, { label: string; icon: LucideIcon }> = {
  purchase: { label: 'Purchase agreement', icon: FileSignature },
  construction: { label: 'Construction contract', icon: Construction },
  'change-order': { label: 'Change order', icon: ClipboardList },
  warranty: { label: 'Home warranty', icon: ShieldCheck },
  addendum: { label: 'Addendum', icon: ClipboardList },
  hoa: { label: 'HOA documents', icon: Users },
}

export const agreementStatus: Record<AgreementStatus, LabelDef> = {
  draft: { label: 'Draft', tone: 'neutral' },
  'awaiting-signature': { label: 'Awaiting signature', tone: 'warning' },
  signed: { label: 'Signed', tone: 'success' },
  active: { label: 'Active', tone: 'brand' },
  void: { label: 'Void', tone: 'danger' },
}

export const leadInterest: Record<LeadInterest, string> = {
  'move-in-ready': 'Move-in ready home',
  'build-on-your-lot': 'Build On Your Lot',
  'custom-home': 'New custom home',
  remodeling: 'Remodeling',
  general: 'General question',
}

export const leadStatus: Record<LeadStatus, LabelDef> = {
  new: { label: 'New', tone: 'warning' },
  contacted: { label: 'Contacted', tone: 'info' },
  qualified: { label: 'Qualified', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral' },
}

export const constructionStages: { key: ConstructionStageKey; label: string }[] = [
  { key: 'contract', label: 'Contract signed' },
  { key: 'site', label: 'Site work' },
  { key: 'foundation', label: 'Foundation' },
  { key: 'framing', label: 'Framing' },
  { key: 'mep', label: 'Mechanicals' },
  { key: 'drywall', label: 'Insulation & drywall' },
  { key: 'finishes', label: 'Interior finishes' },
  { key: 'final', label: 'Final inspection' },
  { key: 'closing', label: 'Closing' },
]

/** Construction progress (%) while a stage is under way; a closed home ('done' or 'closing') is 100%. */
export function stageProgress(stage: ConstructionStageKey | 'done'): number {
  if (stage === 'done' || stage === 'closing') return 100
  const i = constructionStages.findIndex((s) => s.key === stage)
  return i < 0 ? 0 : Math.round(((i + 0.5) / constructionStages.length) * 100)
}

export const permissionLabels: Record<Permission, { label: string; description: string }> = {
  'appointments.manage': { label: 'Manage appointments', description: 'Confirm, decline and reschedule bookings.' },
  'requests.manage': { label: 'Manage requests', description: 'Assign, update and resolve Home Owner requests.' },
  'homes.edit': { label: 'Edit homes', description: 'Update home details, prices, status and photos, and use the market analysis.' },
  'homes.3d': { label: 'Manage 3D viewing', description: 'Turn 3D viewing on or off and configure 3D models.' },
  'agreements.edit': { label: 'Edit agreements', description: 'Create, share and update Home Owner agreements.' },
  'leads.view': { label: 'View website leads', description: 'See and manage inquiries from the website.' },
  'homeowners.view': { label: 'View Home Owners', description: 'Browse Home Owner profiles and their homes.' },
  'users.manage': { label: 'Manage accounts', description: 'Create, modify and delete Staff and Home Owner accounts.' },
  'settings.manage': { label: 'Platform settings', description: 'Feature toggles, booking hours and office details.' },
  'activity.view': { label: 'Activity log', description: 'See the audit trail of everything that happened.' },
}

export const allPermissions = Object.keys(permissionLabels) as Permission[]
