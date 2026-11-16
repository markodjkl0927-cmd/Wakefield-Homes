import type { LeadInterest } from '@/types'
import { leadInterest } from '@/data/labels'
import { emailError, normalizePhone as normalizePhoneShared, phoneError } from '@/lib/utils'

export const BEST_TIMES = ['Anytime', 'Morning', 'Afternoon', 'Evening'] as const
export type BestTime = (typeof BEST_TIMES)[number]

export const MESSAGE_MAX = 1000
export const NAME_MAX = 60

export interface ContactValues {
  firstName: string
  lastName: string
  email: string
  phone: string
  interest: LeadInterest | ''
  modelSlug: string
  bestTime: BestTime
  message: string
}

export type ContactField = keyof ContactValues
export type ContactErrors = Partial<Record<ContactField, string>>

export const EMPTY_CONTACT: ContactValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  interest: '',
  modelSlug: '',
  bestTime: 'Anytime',
  message: '',
}

/** Fields that can be invalid, in on-screen order (the first invalid one receives focus on submit). */
export const VALIDATED_FIELDS: ContactField[] = ['firstName', 'lastName', 'email', 'phone', 'interest', 'message']

export function isLeadInterest(value: string | null | undefined): value is LeadInterest {
  return !!value && Object.prototype.hasOwnProperty.call(leadInterest, value)
}

export function isBestTime(value: string | null | undefined): value is BestTime {
  return !!value && (BEST_TIMES as readonly string[]).includes(value)
}

/** Stores phone numbers like the rest of the demo data: "+17035550123" (US) or "+<digits>" (international). */
export const normalizePhone = normalizePhoneShared

/** One rule set for every form: email and phone checks come from @/lib/utils. */
export function validateField(name: ContactField, values: ContactValues): string | undefined {
  switch (name) {
    case 'firstName':
    case 'lastName': {
      const label = name === 'firstName' ? 'first' : 'last'
      const value = values[name].trim()
      if (!value) return `Enter your ${label} name.`
      if (value.length > NAME_MAX) return `Your ${label} name must be ${NAME_MAX} characters or fewer.`
      if (!/\p{L}/u.test(value)) return `Your ${label} name should include letters.`
      return undefined
    }
    case 'email':
      return emailError(values.email)
    case 'phone':
      // The live contact form asks for a phone number so a Wakefield representative can call back.
      return phoneError(values.phone, { required: true })
    case 'interest':
      return values.interest ? undefined : 'Choose what you’re interested in.'
    case 'message': {
      if (!values.message.trim()) return 'Add a short message so we can prepare for your call.'
      if (values.message.length > MESSAGE_MAX) return `Please keep your message to ${MESSAGE_MAX.toLocaleString('en-US')} characters or fewer.`
      return undefined
    }
    default:
      return undefined
  }
}

export function validateAll(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {}
  for (const field of VALIDATED_FIELDS) {
    const error = validateField(field, values)
    if (error) errors[field] = error
  }
  return errors
}
