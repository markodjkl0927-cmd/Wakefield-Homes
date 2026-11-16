import type { ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { Lock, LogOut, UserX } from 'lucide-react'
import type { Permission, Role } from '@/types'
import { useCurrentUser, useImpersonator, useOffice, usePermissions } from '@/store/hooks'
import { EmptyState, Button, ButtonLink } from '@/components/ui'
import { portalHomeFor } from '@/components/site/SiteHeader'
import { SIGN_OUT_STATE } from '@/components/site/SiteLayout'
import { hasNavPermission } from './navConfig'

/**
 * Redirects to the right login page when signed out, or to the user's own portal when the role doesn't
 * match. A session whose account has since been disabled is stopped here (except while a Super Admin
 * is viewing as that account).
 */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const user = useCurrentUser()
  const impersonator = useImpersonator()
  const { pathname, search } = useLocation()
  if (!user) {
    const portal = roles.includes('homeowner') ? 'homeowners' : 'staff'
    return <Navigate to={`/access/${portal}?next=${encodeURIComponent(pathname + search)}`} replace />
  }
  if (user.status === 'disabled' && !impersonator) return <AccountDisabled />
  if (!roles.includes(user.role)) return <Navigate to={portalHomeFor(user.role)} replace />
  return <>{children}</>
}

function AccountDisabled() {
  const office = useOffice()
  const navigate = useNavigate()
  return (
    <main id="main" tabIndex={-1} className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-card ring-1 ring-ink-200/70">
        <EmptyState
          icon={<UserX className="size-6" aria-hidden />}
          title={<span className="text-lg">This account has been disabled</span>}
          description={`Please contact Wakefield Homes at ${office.phoneDisplay} if you think this is a mistake.`}
          action={
            <Button leftIcon={<LogOut className="size-4" aria-hidden />} onClick={() => navigate('/', { replace: true, state: SIGN_OUT_STATE })}>
              Sign out and go to the website
            </Button>
          }
        />
      </div>
    </main>
  )
}

/**
 * Shows a friendly "no access" state when the signed-in staff member lacks a permission.
 * Pass a list to allow any one of several permissions (e.g. ['homes.edit', 'homes.3d']).
 */
export function RequirePermission({ permission, children }: { permission: Permission | Permission[]; children: ReactNode }) {
  const perms = usePermissions()
  if (hasNavPermission(perms, permission)) return <>{children}</>
  return (
    <EmptyState
      icon={<Lock className="size-6" />}
      title="You don’t have access to this area"
      description="A Super Admin can grant this permission under Roles & permissions."
      action={<ButtonLink to="/staff" variant="secondary">Back to overview</ButtonLink>}
    />
  )
}
