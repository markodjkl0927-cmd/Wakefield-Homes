import { Ban, Info, Trash2 } from 'lucide-react'
import type { User } from '@/types'
import type { AccountFootprint } from '@/store'
import { Button, Modal } from '@/components/ui'
import { deleteImpact, hasRecords, ImpactList } from './accountImpact'
import { firstName } from './meta'

export interface DeleteRequest {
  user: User
  footprint: AccountFootprint
  /** Whether "Disable instead" is possible (not already disabled, and not blocked). */
  canDisable: boolean
}

export type DeleteChoice = 'delete' | 'disable' | 'cancel'

/**
 * Delete confirmation that lists exactly what goes with the account (its appointments, requests and
 * agreements, the homes left without an owner, the work handed back) and offers the safer "Disable instead".
 */
export function DeleteAccountDialog({ request, onResolve }: { request: DeleteRequest | null; onResolve: (choice: DeleteChoice) => void }) {
  if (!request) return null
  const { user, footprint, canDisable } = request
  const first = firstName(user.name)
  const items = deleteImpact(footprint, user.name)
  const records = hasRecords(items)

  return (
    <Modal
      open
      onClose={() => onResolve('cancel')}
      size="md"
      title={<span className="wrap-anywhere">Delete {user.name}’s account?</span>}
      description={
        <span className="wrap-anywhere">
          {user.email} loses access straight away. This can’t be undone.
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={() => onResolve('cancel')} data-autofocus>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => onResolve('delete')} leftIcon={<Trash2 className="size-4" aria-hidden />}>
            Delete account
          </Button>
        </>
      }
    >
      <h3 className="text-sm font-semibold text-ink-900">{records ? 'What else happens' : 'Nothing else is removed'}</h3>
      {!records && <p className="mt-1 text-sm text-ink-500">{first} has no homes, appointments, requests, agreements or assigned work.</p>}
      <ImpactList items={items} className="mt-3" />
      {records && canDisable && (
        <div className="mt-5 flex items-start gap-3 rounded-xl bg-brand-50 p-4 ring-1 ring-brand-200 ring-inset">
          <Info className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
          <div className="min-w-0 text-sm text-brand-950">
            <p className="font-semibold">Want to keep their records?</p>
            <p className="mt-1">Disable the account instead: {first} can’t sign in, nothing is removed, and you can activate it again any time.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => onResolve('disable')} leftIcon={<Ban className="size-4" aria-hidden />}>
              Disable instead
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
