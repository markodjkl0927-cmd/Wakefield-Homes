import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { ChevronDown, Clock, HardHat, Home, LayoutDashboard, LogIn, Menu, Phone, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { roleLabels } from '@/data/labels'
import { useAppStore } from '@/store'
import { useCurrentUser, useOffice } from '@/store/hooks'
import { Avatar, buttonStyles, Drawer } from '@/components/ui'
import { Wordmark } from './Wordmark'
import { accessLinks, mainNav, type NavItemDef, type NavLinkDef } from './nav'

export function portalHomeFor(role: string | undefined) {
  if (role === 'homeowner') return '/owner'
  if (role === 'admin') return '/admin'
  return '/staff'
}

function matches(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`)
}

function isActivePath(pathname: string, item: NavItemDef) {
  if (item.to && matches(pathname, item.to)) return true
  return [...(item.children ?? []), ...(item.more ?? [])].some((c) => matches(pathname, c.to))
}

/** Picks the 3D wording of a nav description only while 3D viewing is switched on. */
function useDescribe() {
  const view3d = useAppStore((s) => s.settings.features.view3d)
  return (l: NavLinkDef) => (view3d && l.description3d) || l.description
}

/**
 * Open/close state shared by the header's disclosure menus: closes on navigation, an outside click,
 * Escape (focus returns to the button) or when focus tabs out of the menu.
 */
function useDisclosure(wrapperRef: RefObject<HTMLDivElement | null>, triggerRef: RefObject<HTMLButtonElement | null>) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      // Return focus only if it was in the menu (a menu opened by hovering shouldn't pull focus).
      if (wrapperRef.current?.contains(document.activeElement)) triggerRef.current?.focus()
    }
    const onDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open, wrapperRef, triggerRef])
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (open && e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false)
  }
  /** ↓ on the button opens the menu and moves to its first link. */
  const onTriggerKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowDown') return
    e.preventDefault()
    setOpen(true)
    requestAnimationFrame(() => wrapperRef.current?.querySelector<HTMLElement>('[data-menu-panel] a')?.focus())
  }
  return { open, setOpen, onBlur, onTriggerKeyDown }
}

function MenuLink({ link, describe }: { link: NavLinkDef; describe: (l: NavLinkDef) => string | undefined }) {
  const description = describe(link)
  return (
    <NavLink
      to={link.to}
      end
      className={({ isActive }) => cn('block rounded-xl px-3.5 py-3 transition-colors hover:bg-brand-50 focus-visible:-outline-offset-2', isActive && 'bg-brand-50')}
    >
      <span className="block text-sm font-semibold text-ink-900">{link.label}</span>
      {description && <span className="mt-0.5 block text-xs leading-5 text-ink-500">{description}</span>}
    </NavLink>
  )
}

function DesktopDropdown({ item, align = 'left' }: { item: NavItemDef; align?: 'left' | 'right' }) {
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const { open, setOpen, onBlur, onTriggerKeyDown } = useDisclosure(ref, triggerRef)
  const closeTimer = useRef<number | undefined>(undefined)
  const { pathname } = useLocation()
  const describe = useDescribe()
  useEffect(() => () => window.clearTimeout(closeTimer.current), [])
  const active = isActivePath(pathname, item)
  const wide = (item.children?.length ?? 0) > 4
  return (
    <div
      ref={ref}
      className="relative"
      onBlur={onBlur}
      onMouseEnter={() => {
        window.clearTimeout(closeTimer.current)
        setOpen(true)
      }}
      onMouseLeave={() => {
        closeTimer.current = window.setTimeout(() => setOpen(false), 140)
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          'inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[14px] font-medium transition-colors',
          active ? 'text-brand-900' : 'text-ink-700 hover:text-brand-900',
        )}
      >
        {item.label}
        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {active && <span className="absolute inset-x-2.5 -bottom-[19px] h-0.5 rounded-full bg-brand-800" aria-hidden />}
      <div id={panelId} hidden={!open} data-menu-panel className={cn('absolute top-full z-50 pt-3', align === 'right' ? 'right-0' : '-left-4')}>
        {open && (
          <div className={cn('animate-scale-in rounded-2xl bg-white p-2 shadow-pop ring-1 ring-ink-200/70', wide ? 'w-[560px]' : 'w-80')}>
            <ul className={cn(wide && 'grid grid-cols-2 gap-1')}>
              {item.children!.map((c) => (
                <li key={c.to + c.label}>
                  <MenuLink link={c} describe={describe} />
                </li>
              ))}
            </ul>
            {item.more && (
              <ul className={cn('mt-1 border-t border-ink-100 pt-1', wide && 'grid grid-cols-2 gap-1')}>
                {item.more.map((c) => (
                  <li key={c.to + c.label}>
                    <MenuLink link={c} describe={describe} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Header "Access" entry: the Home Owner / Staff logins, or "My dashboard" once signed in. */
function AccessMenu() {
  const user = useCurrentUser()
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const { open, setOpen, onBlur, onTriggerKeyDown } = useDisclosure(ref, triggerRef)
  if (user) {
    return (
      <Link to={portalHomeFor(user.role)} className={buttonStyles('secondary', 'md', 'gap-2 pl-1.5')}>
        <Avatar name={user.name} size="xs" />
        My dashboard
      </Link>
    )
  }
  return (
    <div ref={ref} className="relative" onBlur={onBlur}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
        className={buttonStyles('primary', 'md', 'gap-2')}
      >
        <LogIn className="size-4" aria-hidden />
        Access
        <ChevronDown className={cn('size-4 opacity-70 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      <div id={panelId} hidden={!open} data-menu-panel className="absolute top-full right-0 z-50 pt-2">
        {open && (
          <div className="w-80 animate-scale-in rounded-2xl bg-white p-2 shadow-pop ring-1 ring-ink-200/70">
            <p className="px-3.5 pt-2 pb-1 text-xs font-semibold tracking-wider text-ink-500 uppercase">Sign in</p>
            <ul>
              {accessLinks.map((l) => {
                const Icon = l.role === 'homeowner' ? Home : HardHat
                return (
                  <li key={l.to}>
                    <Link to={l.to} className="flex gap-3 rounded-xl px-3.5 py-3 transition-colors hover:bg-brand-50 focus-visible:-outline-offset-2">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-800 ring-1 ring-brand-100">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-ink-900">{l.label}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-ink-500">{l.description}</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const office = useOffice()
  const [expanded, setExpanded] = useState<string | null>(null)
  const user = useCurrentUser()
  const describe = useDescribe()
  const { pathname } = useLocation()
  // Open the group that holds the current page.
  useEffect(() => {
    if (open) setExpanded(mainNav.find((i) => i.children && isActivePath(pathname, i))?.label ?? null)
  }, [open, pathname])
  return (
    <Drawer open={open} onClose={onClose} side="left" width="md" ariaLabel="Main menu">
      <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
        <Wordmark size="sm" />
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100" aria-label="Close menu" data-modal-close>
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <nav className="px-3 py-4" aria-label="Main">
        <ul className="space-y-1">
          {mainNav.map((item, index) =>
            item.children ? (
              <li key={item.label}>
                <button
                  type="button"
                  aria-expanded={expanded === item.label}
                  onClick={() => setExpanded((e) => (e === item.label ? null : item.label))}
                  data-autofocus={index === 0 ? '' : undefined}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-base font-medium hover:bg-ink-50',
                    isActivePath(pathname, item) ? 'text-brand-900' : 'text-ink-800',
                  )}
                >
                  {item.label}
                  <ChevronDown className={cn('size-5 text-ink-500 transition-transform', expanded === item.label && 'rotate-180')} aria-hidden />
                </button>
                {expanded === item.label && (
                  <ul className="mt-1 mb-2 ml-3 space-y-0.5 border-l border-ink-200 pl-3">
                    {[...item.children, ...(item.more ?? [])].map((c) => (
                      <li key={c.to + c.label}>
                        <NavLink
                          to={c.to}
                          end
                          onClick={onClose}
                          className={({ isActive }) => cn('block rounded-lg px-3 py-2.5 text-[15px] text-ink-600 hover:bg-ink-50', isActive && 'bg-brand-50 font-semibold text-brand-900')}
                        >
                          {c.label}
                          {c.to === '/vpdes' && <span className="block text-xs font-normal text-ink-500">{describe(c)}</span>}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ) : (
              <li key={item.label}>
                <NavLink
                  to={item.to!}
                  onClick={onClose}
                  data-autofocus={index === 0 ? '' : undefined}
                  className={({ isActive }) => cn('block rounded-xl px-3 py-3 text-base font-medium text-ink-800 hover:bg-ink-50', isActive && 'bg-brand-50 text-brand-900')}
                >
                  {item.label}
                </NavLink>
              </li>
            ),
          )}
        </ul>
      </nav>
      <section aria-labelledby="mobile-access-title" className="mx-4 rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-100">
        <h2 id="mobile-access-title" className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-brand-800 uppercase">
          <LogIn className="size-4" aria-hidden /> Access
        </h2>
        {user ? (
          <>
            <p className="mt-1.5 text-sm text-ink-600">
              Signed in as <span className="font-semibold text-ink-900">{user.name}</span> · {roleLabels[user.role]}
            </p>
            <Link to={portalHomeFor(user.role)} onClick={onClose} className={buttonStyles('primary', 'lg', 'mt-3 w-full')}>
              <LayoutDashboard className="size-4" aria-hidden /> My dashboard
            </Link>
          </>
        ) : (
          <>
            <p className="mt-1.5 text-sm text-ink-600">Sign in to the Home Owner portal or the Staff workspace.</p>
            <div className="mt-3 grid gap-2">
              {accessLinks.map((l) => (
                <Link key={l.to} to={l.to} onClick={onClose} className={buttonStyles(l.role === 'homeowner' ? 'primary' : 'periwinkle', 'lg', 'w-full')}>
                  {l.role === 'homeowner' ? <Home className="size-4" aria-hidden /> : <HardHat className="size-4" aria-hidden />}
                  {l.label}
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
      <div className="px-4 pt-4 pb-6">
        <a href={`tel:${office.phone}`} className={buttonStyles('secondary', 'lg', 'w-full')}>
          <Phone className="size-4" aria-hidden /> Call {office.phoneDisplay}
        </a>
        {office.hours && <p className="mt-2 text-center text-xs text-ink-500">{office.hours}</p>}
      </div>
    </Drawer>
  )
}

export function SiteHeader() {
  const office = useOffice()
  const user = useCurrentUser()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setMobileOpen(false), [pathname])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <aside aria-label="Office hours and phone" className="hidden bg-brand-900 text-brand-100 lg:block">
        <div className="container-page flex h-9 items-center justify-between gap-6 text-xs">
          <p>Custom homes in Alexandria, Fairfax &amp; Arlington — building in Northern Virginia since 1970</p>
          <div className="flex shrink-0 items-center gap-5">
            {office.hours && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" aria-hidden /> {office.hours}
              </span>
            )}
            <a href={`tel:${office.phone}`} className="inline-flex items-center gap-1.5 font-semibold text-white hover:underline">
              <Phone className="size-3.5" aria-hidden /> {office.phoneDisplay}
            </a>
          </div>
        </div>
      </aside>
      <header
        data-sticky-chrome
        className={cn(
          'sticky top-0 z-40 bg-white transition-shadow',
          scrolled ? 'shadow-[0_1px_0_var(--color-ink-200),0_8px_24px_-12px_rgb(16_24_40/0.15)]' : 'shadow-[0_1px_0_var(--color-ink-100)]',
        )}
      >
        <div className="container-page flex h-[72px] items-center justify-between gap-2 sm:gap-4">
          <Wordmark />
          <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Main">
            {mainNav.map((item) =>
              item.children ? (
                <DesktopDropdown key={item.label} item={item} align={item.label === 'Finance' ? 'right' : 'left'} />
              ) : (
                <NavLink
                  key={item.label}
                  to={item.to!}
                  className={({ isActive }) => cn('relative rounded-lg px-2.5 py-2 text-[14px] font-medium transition-colors', isActive ? 'text-brand-900' : 'text-ink-700 hover:text-brand-900')}
                >
                  {({ isActive }) => (
                    <>
                      {item.label}
                      {isActive && <span className="absolute inset-x-2.5 -bottom-[19px] h-0.5 rounded-full bg-brand-800" aria-hidden />}
                    </>
                  )}
                </NavLink>
              ),
            )}
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <a href={`tel:${office.phone}`} className={buttonStyles('ghost', 'icon', 'lg:hidden')} aria-label={`Call ${office.phoneDisplay}`}>
              <Phone className="size-5" aria-hidden />
            </a>
            <div className="hidden sm:block">
              <AccessMenu />
            </div>
            {/* Phones: the Access entry stays in the header as a compact button. */}
            {user ? (
              <Link to={portalHomeFor(user.role)} className={buttonStyles('ghost', 'icon', 'sm:hidden')} aria-label={`My dashboard (${user.name})`}>
                <Avatar name={user.name} size="sm" />
              </Link>
            ) : (
              <Link to="/access" className={buttonStyles('primary', 'icon', 'sm:hidden')} aria-label="Access: Home Owner and Staff login">
                <LogIn className="size-5" aria-hidden />
              </Link>
            )}
            <button type="button" onClick={() => setMobileOpen(true)} className={buttonStyles('ghost', 'icon', 'xl:hidden')} aria-label="Open menu" aria-expanded={mobileOpen}>
              <Menu className="size-6" aria-hidden />
            </button>
          </div>
        </div>
      </header>
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  )
}
