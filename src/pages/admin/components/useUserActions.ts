import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { User } from '@/types'
import { accountFootprint, useAppStore } from '@/store'
import { useCurrentUser } from '@/store/hooks'
import { confirmDialog, toast } from '@/store/ui'
import { portalHomeFor } from '@/components/site/SiteHeader'
import { changeSummary } from './accountImpact'
import type { Credentials } from './CredentialsDialog'
import type { DeleteChoice, DeleteRequest } from './DeleteAccountDialog'
import { firstName } from './meta'

/**
 * Account actions shared by the users table, the mobile cards and the details drawer.
 * Every action guards against locking the platform out (yourself, the last Super Admin), and every
 * consequence is spelled out before it happens: the delete dialog lists what goes with the account.
 *
 * Render <DeleteAccountDialog request={deleteRequest} onResolve={resolveDelete} /> and
 * <CredentialsDialog value={credentials} onClose={closeCredentials} /> next to the components using it.
 */
export function useUserActions() {
  const me = useCurrentUser()
  const users = useAppStore((s) => s.users)
  const impersonate = useAppStore((s) => s.impersonate)
  const setUserStatus = useAppStore((s) => s.setUserStatus)
  const deleteUser = useAppStore((s) => s.deleteUser)
  const resetPassword = useAppStore((s) => s.resetPassword)
  const navigate = useNavigate()
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null)
  const pendingDelete = useRef<DeleteRequest | null>(null)
  const deleteResolver = useRef<((deleted: boolean) => void) | null>(null)

  const adminCount = useMemo(() => users.filter((u) => u.role === 'admin').length, [users])
  const activeAdminCount = useMemo(() => users.filter((u) => u.role === 'admin' && u.status !== 'disabled').length, [users])

  const isSelf = useCallback((u: User) => u.id === me?.id, [me])

  /** Why deleting is not allowed, or null when it is. */
  const deleteBlocked = useCallback(
    (u: User): { title: string; description: string } | null => {
      if (u.id === me?.id) return { title: 'You can’t delete your own account', description: 'Another Super Admin has to remove it for you.' }
      if (u.role === 'admin' && adminCount <= 1) return { title: 'Keep at least one Super Admin', description: 'Make another account a Super Admin before deleting this one.' }
      return null
    },
    [me, adminCount],
  )

  /** Why disabling is not allowed, or null when it is. */
  const disableBlocked = useCallback(
    (u: User): { title: string; description: string } | null => {
      if (u.id === me?.id) return { title: 'You can’t disable your own account', description: 'You’re signed in with it. Ask another Super Admin.' }
      if (u.role === 'admin' && u.status !== 'disabled' && activeAdminCount <= 1) {
        return { title: 'Keep at least one active Super Admin', description: 'Activate or create another Super Admin first.' }
      }
      return null
    },
    [me, activeAdminCount],
  )

  /** "View as": opens their portal. Changes are logged as the Super Admin (viewing as them); e-signing is off. */
  const viewAs = useCallback(
    (u: User) => {
      if (u.id === me?.id) return
      const result = impersonate(u.id)
      if (!result.ok) {
        toast.error(`Can’t view as ${firstName(u.name)}`, result.error)
        return
      }
      navigate(portalHomeFor(u.role))
      toast.info(
        `Viewing as ${u.name}`,
        `Anything you change is logged as ${me ? `${me.name} (viewing as ${firstName(u.name)})` : 'you'}${u.role === 'homeowner' ? ', and agreements can’t be signed' : ''}. Use “Return to Super Admin” in the yellow bar to come back.`,
      )
    },
    [me, impersonate, navigate],
  )

  const toggleStatus = useCallback(
    (u: User) => {
      if (u.status === 'disabled') {
        const result = setUserStatus(u.id, 'active')
        if (!result.ok) {
          toast.error('Couldn’t activate the account', result.error)
          return
        }
        // An account that never signed in goes back to "Invited".
        const now = useAppStore.getState().users.find((x) => x.id === u.id)
        if (now?.status === 'invited') toast.success('Account activated', `${firstName(u.name)} hasn’t signed in yet, so it shows as Invited until their first sign-in.`)
        else toast.success('Account activated', `${u.name} can sign in again.`)
        return
      }
      const blocked = disableBlocked(u)
      if (blocked) {
        toast.error(blocked.title, blocked.description)
        return
      }
      const result = setUserStatus(u.id, 'disabled')
      if (!result.ok) {
        toast.error('Couldn’t disable the account', result.error)
        return
      }
      toast.success('Account disabled', `${firstName(u.name)} can’t sign in until you activate the account again. Nothing was removed.`)
    },
    [setUserStatus, disableBlocked],
  )

  /** Opens the delete dialog. Resolves true when the account was deleted. */
  const remove = useCallback(
    (u: User): Promise<boolean> => {
      const blocked = deleteBlocked(u)
      if (blocked) {
        toast.error(blocked.title, blocked.description)
        return Promise.resolve(false)
      }
      deleteResolver.current?.(false)
      return new Promise<boolean>((resolve) => {
        const request: DeleteRequest = {
          user: u,
          footprint: accountFootprint(useAppStore.getState(), u.id),
          canDisable: u.status !== 'disabled' && !disableBlocked(u),
        }
        deleteResolver.current = resolve
        pendingDelete.current = request
        setDeleteRequest(request)
      })
    },
    [deleteBlocked, disableBlocked],
  )

  const resolveDelete = useCallback(
    (choice: DeleteChoice) => {
      // Read and clear refs first, so a double click can never act twice.
      const request = pendingDelete.current
      const resolve = deleteResolver.current
      pendingDelete.current = null
      deleteResolver.current = null
      setDeleteRequest(null)
      if (!request) return
      if (choice === 'cancel') {
        resolve?.(false)
        return
      }
      const { user } = request
      if (choice === 'disable') {
        const result = setUserStatus(user.id, 'disabled')
        if (result.ok) toast.success('Account disabled', `${firstName(user.name)} can’t sign in until you activate the account again. Nothing was removed.`)
        else toast.error('Couldn’t disable the account', result.error)
        resolve?.(false)
        return
      }
      const result = deleteUser(user.id)
      if (!result.ok) {
        toast.error('Couldn’t delete the account', result.error)
        resolve?.(false)
        return
      }
      const summary = result.removed ? changeSummary(result.removed, { owner: true, staff: true }) : ''
      toast.success('Account deleted', `${user.name} no longer has access.${summary ? ` ${summary}` : ''}`)
      resolve?.(true)
    },
    [deleteUser, setUserStatus],
  )

  /** Resets the password and shows the new temporary password once. */
  const reset = useCallback(
    async (u: User) => {
      const ok = await confirmDialog({
        title: `Reset ${firstName(u.name)}’s password?`,
        description: 'Their current password stops working right away. You’ll get a temporary password to share with them.',
        confirmLabel: 'Reset password',
      })
      if (!ok) return
      const password = resetPassword(u.id)
      setCredentials({ mode: 'reset', name: u.name, email: u.email, role: u.role, password })
    },
    [resetPassword],
  )

  /**
   * "Resend invitation" for an account that hasn't signed in yet. The demo sends no email: it issues a new
   * temporary password and shows the invitation to pass on.
   */
  const resendInvite = useCallback(
    (u: User) => {
      const password = resetPassword(u.id)
      setCredentials({ mode: 'resent', name: u.name, email: u.email, role: u.role, password })
    },
    [resetPassword],
  )

  const showCredentials = useCallback((value: Credentials) => setCredentials(value), [])
  const closeCredentials = useCallback(() => setCredentials(null), [])

  return {
    me,
    isSelf,
    deleteBlocked,
    disableBlocked,
    viewAs,
    toggleStatus,
    remove,
    reset,
    resendInvite,
    credentials,
    showCredentials,
    closeCredentials,
    deleteRequest,
    resolveDelete,
  }
}

export type UserActions = ReturnType<typeof useUserActions>
