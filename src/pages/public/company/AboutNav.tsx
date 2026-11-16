import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router'
import { cn } from '@/lib/cn'
import { mainNav, type NavLinkDef } from '@/components/site/nav'

const fallbackLinks: NavLinkDef[] = [
  { label: 'Our Story', to: '/about' },
  { label: 'Awards', to: '/about/awards' },
  { label: 'Memberships', to: '/about/memberships' },
  { label: 'Licenses', to: '/about/licenses' },
  { label: 'In the News', to: '/about/news' },
]

/**
 * Secondary navigation shared by the "About Us" pages (Our Story, Awards, Memberships, Licenses, News).
 * Uses the same links as the header's About Us menu so the two never drift apart.
 * On narrow screens the row scrolls sideways; the current page is scrolled into view.
 */
export function AboutNav({ className }: { className?: string }) {
  const links = mainNav.find((item) => item.to === '/about')?.children ?? fallbackLinks
  const listRef = useRef<HTMLUListElement>(null)
  const { pathname } = useLocation()

  useEffect(() => {
    const list = listRef.current
    const active = list?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!list || !active || list.scrollWidth <= list.clientWidth) return
    // Adjust only the horizontal scroll of the list — never the page.
    list.scrollLeft = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2
  }, [pathname])

  return (
    <nav aria-label="About Wakefield Homes" className={cn('border-b border-ink-200/70 bg-white', className)}>
      <div className="container-page">
        <ul
          ref={listRef}
          className="scrollbar-thin relative -mb-px flex gap-6 overflow-x-auto pr-8 [mask-image:linear-gradient(to_right,#000_calc(100%_-_2.5rem),transparent)] sm:gap-8 sm:pr-0 sm:[mask-image:none]"
        >
          {links.map((link) => (
            <li key={link.to} className="shrink-0">
              <NavLink
                to={link.to}
                end
                className={({ isActive }) =>
                  cn(
                    'inline-flex h-14 items-center border-b-2 text-sm font-medium whitespace-nowrap transition-colors',
                    isActive ? 'border-brand-800 text-brand-900' : 'border-transparent text-ink-600 hover:border-ink-300 hover:text-ink-900',
                  )
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
