import { Suspense, useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { useAppStore } from '@/store'
import { toast } from '@/store/ui'
import { SiteHeader } from './SiteHeader'
import { SiteFooter } from './SiteFooter'
import { PageLoader } from '@/components/PageLoader'

/**
 * Navigation state for signing out of a portal: `navigate('/', { state: SIGN_OUT_STATE })`.
 * The sign-out happens once the public page has opened — signing out first would let the portal's
 * role guard redirect to the login page before the navigation lands.
 */
export const SIGN_OUT_STATE = { signOut: true } as const

function useSignOutOnArrival() {
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAppStore((s) => s.logout)
  const handled = useRef<string | null>(null)
  useEffect(() => {
    if ((location.state as { signOut?: boolean } | null)?.signOut !== true || handled.current === location.key) return
    handled.current = location.key
    logout()
    // Drop the state so Back/refresh never signs out again.
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null })
    toast.info('You’re signed out')
  }, [location, navigate, logout])
}

export function SiteLayout() {
  useSignOutOnArrival()
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1" tabIndex={-1}>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  )
}
