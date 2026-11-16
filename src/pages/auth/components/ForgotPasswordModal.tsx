import { Phone } from 'lucide-react'
import { DEMO_PASSWORD } from '@/data/seed'
import { useOffice } from '@/store/hooks'
import { Alert, Button, Modal, buttonStyles } from '@/components/ui'
import type { Portal } from './authUtils'

/** Password help: resets go through the office (Home Owners) or a Super Admin (Staff). */
export function ForgotPasswordModal({ open, onClose, portal }: { open: boolean; onClose: () => void; portal: Portal }) {
  const office = useOffice()
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Forgot your password?"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <a href={`tel:${office.phone}`} className={buttonStyles('primary', 'md')}>
            <Phone className="size-4" aria-hidden /> Call the office
          </a>
        </>
      }
    >
      <div className="space-y-4 text-sm leading-6 text-ink-600">
        {portal === 'homeowner' ? (
          <p>For your security, passwords for Home Owner accounts are reset by the Wakefield office. We’ll confirm a few details with you and set up a new password.</p>
        ) : (
          <p>Staff passwords are reset by a Super Admin from Users &amp; accounts. If you can’t reach one, the office can help.</p>
        )}
        <p>
          Call{' '}
          <a href={`tel:${office.phone}`} className="font-semibold text-brand-800 underline-offset-2 hover:underline">
            {office.phoneDisplay}
          </a>{' '}
          ({office.hours})
          {office.email ? (
            <>
              {' '}
              or email{' '}
              <a href={`mailto:${office.email}`} className="font-semibold break-all text-brand-800 underline-offset-2 hover:underline">
                {office.email}
              </a>
              .
            </>
          ) : (
            '.'
          )}
        </p>
        <Alert tone="info" title="Presentation demo">
          Every sample account uses the password <strong className="font-semibold">{DEMO_PASSWORD}</strong>.
        </Alert>
      </div>
    </Modal>
  )
}
