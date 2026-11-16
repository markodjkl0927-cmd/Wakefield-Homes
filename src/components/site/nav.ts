/**
 * Public site navigation — the same pages as the current wakefieldhomeslc.com menu,
 * plus the new "Access" entry for the Home Owner and Staff portals.
 */
export interface NavLinkDef {
  label: string
  to: string
  description?: string
  /** Description to use instead while 3D viewing is switched on (so copy never promises 3D when it's off). */
  description3d?: string
}

export interface NavItemDef {
  label: string
  to?: string
  /** The dropdown's main links. Section sub-navigation (e.g. the About pages' tabs) reuses these. */
  children?: NavLinkDef[]
  /** Further pages listed under the main links in the header menus only (not in section sub-navigation). */
  more?: NavLinkDef[]
}

export const mainNav: NavItemDef[] = [
  { label: 'Move In Ready Homes', to: '/move-in-ready' },
  {
    label: 'Our Homes',
    to: '/our-homes',
    children: [
      { label: 'Our Homes', to: '/our-homes', description: 'How we build and what makes a Wakefield home' },
      { label: 'Home Gallery', to: '/our-homes/gallery', description: '24 floor plans to browse and compare', description3d: '24 floor plans — explore each one in 3D' },
      { label: 'Build On Your Lot', to: '/build-on-your-lot', description: 'How the BOYL program works' },
      { label: 'Included Features', to: '/build-on-your-lot/features', description: 'What comes standard in every home' },
      { label: 'BOYL Price List', to: '/build-on-your-lot/price-list', description: 'Base prices for every plan' },
      { label: 'View My Home', to: '/view-my-home', description: 'Photo galleries of the homes we’re building' },
    ],
  },
  {
    label: 'About Us',
    to: '/about',
    children: [
      { label: 'Our Story', to: '/about', description: 'Three generations of the Genuario family' },
      { label: 'Awards', to: '/about/awards', description: 'Recognition since 1992' },
      { label: 'Memberships', to: '/about/memberships', description: 'Professional associations' },
      { label: 'Licenses', to: '/about/licenses', description: 'Class A contractor licenses' },
      { label: 'In the News', to: '/about/news', description: 'Press and features' },
    ],
    more: [{ label: 'VPDES', to: '/vpdes', description: 'Virginia Pollutant Discharge Elimination System' }],
  },
  { label: 'Our Communities', to: '/communities' },
  { label: 'Our Reviews', to: '/reviews' },
  { label: 'Contact Us', to: '/contact' },
  {
    label: 'Finance',
    to: '/finance',
    children: [
      { label: 'Financing overview', to: '/finance', description: 'How buying or building is financed' },
      { label: 'Home Purchase', to: '/finance/home-purchase', description: 'Our preferred local lenders' },
      { label: 'Build On Your Lot (BOYL)', to: '/finance/build-on-your-lot', description: 'Construction-to-permanent loans' },
    ],
  },
]

/** The two login pages behind the header's "Access" button (Home Owners and Staff). */
export const accessLinks: (NavLinkDef & { role: 'homeowner' | 'staff' })[] = [
  { role: 'homeowner', label: 'Home Owner login', to: '/access/homeowners', description: 'Agreements, your homes, appointments and maintenance' },
  { role: 'staff', label: 'Staff login', to: '/access/staff', description: 'Bookings, requests, homes and 3D — for staff and admins' },
]

export const footerNav: { title: string; links: NavLinkDef[] }[] = [
  {
    title: 'Homes',
    links: [
      { label: 'Move In Ready Homes', to: '/move-in-ready' },
      { label: 'Home Gallery', to: '/our-homes/gallery' },
      { label: 'Our Communities', to: '/communities' },
      { label: 'Build On Your Lot', to: '/build-on-your-lot' },
      { label: 'BOYL Price List', to: '/build-on-your-lot/price-list' },
      { label: 'View My Home', to: '/view-my-home' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Our Story', to: '/about' },
      { label: 'Awards', to: '/about/awards' },
      { label: 'Our Reviews', to: '/reviews' },
      { label: 'Memberships', to: '/about/memberships' },
      { label: 'Licenses', to: '/about/licenses' },
      { label: 'In the News', to: '/about/news' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Finance', to: '/finance' },
      { label: 'Contact Us', to: '/contact' },
      { label: 'VPDES', to: '/vpdes' },
    ],
  },
  {
    title: 'Access',
    links: [
      { label: 'Home Owner login', to: '/access/homeowners' },
      { label: 'Staff login', to: '/access/staff' },
    ],
  },
]
