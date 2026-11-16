import { Ban, KeyRound, Lock, MailPlus, MoreHorizontal, Pencil, ScanEye, Trash2, UserCheck, UserRound } from 'lucide-react'
import type { User } from '@/types'
import { Button, MenuDivider, MenuItem, Popover } from '@/components/ui'
import { firstName } from './meta'
import type { UserActions } from './useUserActions'

/**
 * "…" actions menu for one account (table rows and mobile cards). Clicks never reach the row.
 * Actions that can't apply (your own account, the last Super Admin) are replaced by the reason,
 * instead of being offered and then refused.
 */
export function UserRowMenu({
  user,
  actions,
  onDetails,
  onEdit,
}: {
  user: User
  actions: UserActions
  onDetails: () => void
  onEdit: () => void
}) {
  const self = actions.isSelf(user)
  const invited = user.status === 'invited'
  const disabled = user.status === 'disabled'
  const disableBlocked = disabled ? null : actions.disableBlocked(user)
  const deleteBlocked = actions.deleteBlocked(user)
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Popover
        align="right"
        panelClassName="w-64"
        trigger={({ open, toggle }) => (
          <Button variant="ghost" size="icon" aria-label={`Actions for ${user.name}`} aria-expanded={open} onClick={toggle}>
            <MoreHorizontal className="size-5" aria-hidden />
          </Button>
        )}
      >
        {({ close }) => {
          const run = (fn: () => void) => () => {
            close()
            fn()
          }
          return (
            <>
              <MenuItem icon={<UserRound />} onClick={run(onDetails)}>
                View details
              </MenuItem>
              <MenuItem icon={<Pencil />} onClick={run(onEdit)}>
                Edit account
              </MenuItem>
              {!self && !disabled && (
                <MenuItem icon={<ScanEye />} onClick={run(() => actions.viewAs(user))}>
                  <span className="min-w-0 truncate">View as {firstName(user.name)}</span>
                </MenuItem>
              )}
              {invited ? (
                <MenuItem icon={<MailPlus />} onClick={run(() => actions.resendInvite(user))}>
                  Resend invitation
                </MenuItem>
              ) : (
                <MenuItem icon={<KeyRound />} onClick={run(() => void actions.reset(user))}>
                  Reset password
                </MenuItem>
              )}
              <MenuDivider />
              {disableBlocked && deleteBlocked ? (
                <BlockedNote
                  reason={
                    self
                      ? 'This is your account, so you can’t disable or delete it. Another Super Admin can.'
                      : 'This is the only Super Admin. Make another account a Super Admin before disabling or deleting it.'
                  }
                />
              ) : (
                <>
                  {disableBlocked ? (
                    <BlockedNote reason={`${disableBlocked.title}.`} />
                  ) : (
                    <MenuItem icon={disabled ? <UserCheck /> : <Ban />} onClick={run(() => actions.toggleStatus(user))}>
                      {disabled ? 'Activate account' : 'Disable account'}
                    </MenuItem>
                  )}
                  {deleteBlocked ? (
                    <BlockedNote reason={`${deleteBlocked.title}.`} />
                  ) : (
                    <MenuItem tone="danger" icon={<Trash2 />} onClick={run(() => void actions.remove(user))}>
                      Delete account
                    </MenuItem>
                  )}
                </>
              )}
            </>
          )
        }}
      </Popover>
    </div>
  )
}

/** Why an action isn't available here (not focusable: there is nothing to do). */
function BlockedNote({ reason }: { reason: string }) {
  return (
    <p className="flex items-start gap-2.5 px-3 py-2 text-xs leading-5 text-ink-500">
      <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>{reason}</span>
    </p>
  )
}
