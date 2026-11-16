import type { Community, CommunityStatus } from '@/types'
import { photos, wp } from './images'

/**
 * Wakefield's communities and single-home projects, as published on https://wakefieldhomeslc.com.
 * The first nine are the live "Current Projects" (Our Communities, updated Oct 30, 2026) in the live order
 * (`current: true`); the rest are earlier communities and the locations listed on the live homepage.
 * Statuses, prices and lot facts come from each project's own page (or the homepage when there is none).
 */
export const communities: Community[] = [
  /* ----------------------------- Current projects ----------------------------- */
  {
    id: 'cmt_oronoco', slug: 'oronoco-street', name: 'Oronoco Street', area: 'City of Alexandria',
    address: '1007, 1007½ & 1009 Oronoco Street, Alexandria, VA 22314', status: 'under-construction', lots: '3 townhomes',
    summary: 'Three brand-new, four-level townhomes in the City of Alexandria — available December 2026.',
    modelSlugs: [], image: photos.hero.oronocoTownhomesDusk, priceNote: 'Price TBD', statusNote: 'Available December 2026', current: true,
    documents: [
      { label: '1009 Oronoco Street brochure (PDF)', url: wp('2025/10/1009-Oronoco-Street-Brochure.pdf') },
      { label: '1007½ Oronoco Street brochure (PDF)', url: wp('2025/10/1007.5-Oronoco-Street-Brochure.pdf') },
      { label: '1007 Oronoco Street brochure (PDF)', url: wp('2025/10/1007-Oronoco-Street-Brochure.pdf') },
      { label: 'Included features (PDF, 09/26)', url: wp('2026/09/Oronoco-Street_Included-Features-09.26.pdf') },
      { label: 'Kitchens (PDF)', url: wp('2026/09/Oronoco-Kitchens.pdf') },
      { label: 'Owner’s suites (PDF)', url: wp('2026/09/Oronoco-Owners-Suites.pdf') },
      { label: 'Secondary baths (PDF)', url: wp('2026/09/Oronoco-Secondary-Baths.pdf') },
      { label: 'Site plan (PDF)', url: wp('2024/12/Oronoco-Street-plan-to-upload.pdf') },
    ],
  },
  {
    id: 'cmt_shenandoah', slug: '1208-shenandoah-road', name: '1208 Shenandoah Road', area: 'Alexandria, VA',
    address: '1208 Shenandoah Road, Alexandria, VA', status: 'now-selling', lots: '1 lot', lotSize: '½ acre',
    summary: 'A new Hamilton with a finished walkout basement and a two-car side-load garage, now in the permit phase — delivery late summer 2027.',
    modelSlugs: ['hamilton'], image: wp('2025/08/Untitled-design-18-1200x500.png'), priceFrom: 2445000,
    statusNote: 'Permit phase · delivery late summer 2027', current: true,
    documents: [{ label: 'Included features (PDF, 08/26)', url: wp('2026/10/1208-Shenandoah-Road-Included-Features-08.26.pdf') }],
  },
  {
    id: 'cmt_plymouth', slug: 'plymouth-haven', name: 'Plymouth Haven', area: 'Plymouth Road, Alexandria',
    address: '8628 Plymouth Road, Alexandria, VA', status: 'sold-out', lots: 'Lot 38', lotSize: '½ acre',
    summary: 'A Harrison with five bedrooms, six full and three half baths and 6,758 sq ft — including a finished lower level with a wet bar and bedroom suite — plus a three-car courtyard garage. Sold.',
    modelSlugs: ['harrison'], image: photos.models.harrison, priceFrom: 2799000, statusNote: 'Sold', current: true,
    documents: [
      { label: 'Project features (PDF, 02/25)', url: wp('2025/02/8628-Plymouth-Road-Features-02.25.pdf') },
      { label: 'Floor plans (PDF)', url: wp('2024/12/Plymouth-Floor-Plans.pdf') },
      { label: 'Site plan and side elevations (PDF)', url: wp('2024/12/Plymouth-Site-Plan-Side-Elevations.pdf') },
    ],
  },
  {
    id: 'cmt_jamestown', slug: '1700-jamestown-road', name: '1700 Jamestown Road', area: 'Alexandria, VA',
    address: '1700 Jamestown Road, Alexandria, VA', status: 'under-construction', lots: '1 lot', lotSize: '0.27 acre',
    summary: 'A new home on our newly designed Jamestown plan, now under construction — delivery spring 2027.',
    modelSlugs: ['jamestown'], image: photos.hero.jamestownRendering, priceNote: 'Price TBD', statusNote: 'Delivery spring 2027', current: true,
    documents: [{ label: 'Jamestown brochure (PDF, 08/26)', url: wp('2026/08/Jamestown-Brochure-08.26.pdf') }],
  },
  {
    id: 'cmt_oakwood', slug: 'oakwood', name: 'Oakwood', area: 'Surrey Drive, Alexandria',
    address: '3609 Surrey Drive, Alexandria, VA 22309', status: 'sold-out', lots: 'Lots 10, 15 & 16', lotSize: '½ acre each',
    summary: 'Hamilton and Wellington homes on half-acre lots, each with a finished basement recreation room and full bath — all three lots are sold.',
    modelSlugs: ['hamilton', 'wellington'], image: wp('2025/08/Lot-15_1.jpg'), priceFrom: 1565000, statusNote: 'All lots sold', current: true,
    documents: [
      { label: 'Included features (PDF, 03/25)', url: wp('2025/03/Oakwood-Included-Features-03.25.pdf') },
      { label: 'Site plan (PDF)', url: wp('2026/09/Surrey-Drive-Site-Plan-4.8.24-pdf-3-1.pdf') },
    ],
  },
  {
    id: 'cmt_alfred', slug: 's-alfred-street', name: '207 S. Alfred Street', area: 'Old Town Alexandria',
    address: '207 S. Alfred Street, Old Town Alexandria', status: 'sold-out', lots: '1 townhouse',
    summary: 'A complete renovation of an existing Old Town townhouse, with two off-street parking spaces. Sold.',
    modelSlugs: [], image: wp('2026/03/1.jpg'), priceFrom: 2295000, statusNote: 'Sold', current: true,
    documents: [
      { label: 'Brochure (PDF)', url: wp('2025/09/Model-207-S.-Alfred-Street-Brochure_Final-1.pdf') },
      { label: 'Included features (PDF, 12/25)', url: wp('2026/01/207-S.-Alfred-Remodel_Included-Features-12.25_V2.pdf') },
      { label: 'Kitchen (PDF)', url: wp('2025/12/207-S.-Alfred-KITCHEN-12.25.pdf') },
      { label: 'Baths (PDF)', url: wp('2025/12/207-S.-Alfred-BATHS-12.25.pdf') },
    ],
  },
  {
    id: 'cmt_tauxemont', slug: '7700-tauxemont-road', name: '7700 Tauxemont Road', area: 'Alexandria, VA',
    address: '7700 Tauxemont Road, Alexandria, VA', status: 'coming-soon', lots: '1 lot', lotSize: '½ acre',
    summary: 'Coming soon: a new Hamilton with a finished walkout basement and a two-car garage — delivery summer 2027.',
    modelSlugs: ['hamilton'], image: wp('2026/09/7700-Tauxemont-new-thumbnail.jpg'), priceFrom: 2349000, priceNote: 'Subject to change',
    statusNote: 'Permit phase · delivery summer 2027', current: true,
    documents: [
      { label: 'Included features (PDF, 08/26)', url: wp('2026/09/7700-Tauxemont-Road-Included-Features-08.26.pdf') },
      { label: 'Hamilton brochure (PDF)', url: wp('2026/09/Hamilton-Model-Brochure-05.20-1-6.pdf') },
    ],
  },
  {
    id: 'cmt_beatty', slug: 'beatty-drive', name: 'Beatty Drive', area: 'Alexandria, VA',
    address: '9005 Beatty Drive, Alexandria, VA', status: 'under-construction', lots: '1 lot', lotSize: '½ acre',
    summary: 'A customized Hamilton built on the owner’s own lot, with a finished basement — bedroom, full bath, recreation room and gym — a rear deck and a side-load two-car garage. Delivery spring 2027.',
    modelSlugs: ['hamilton'], image: wp('2026/07/9005-Beatty-Photo-1200x800.jpg'), priceNote: 'Custom Build On Your Lot home',
    statusNote: 'Delivery spring 2027', current: true, buildOnYourLot: true,
    documents: [
      { label: 'Included features (PDF)', url: wp('2026/08/Beatty-Drive-Included-Features_08.14.26.pdf') },
      { label: 'Hamilton brochure (PDF)', url: wp('2026/09/Hamilton-Model-Brochure-05.20-1-6.pdf') },
    ],
  },
  {
    id: 'cmt_burke', slug: 'burke-drive', name: 'Burke Drive', area: 'Mount Vernon Terrace, Alexandria',
    address: '5019 Burke Drive, Alexandria, VA 22309', status: 'sold-out', lots: '1 river-front lot', lotSize: '½ acre',
    summary: 'A custom home on the Potomac: a Hamilton on a half-acre river-front lot in the Mount Vernon Terrace subdivision, with a finished basement recreation room and full bath and a two-car garage. Sold.',
    modelSlugs: ['hamilton'], image: wp('2023/10/FUKEkQBEcT-DSC01580.jpg'), statusNote: 'Sold', current: true,
  },

  /* ------------------------- Earlier communities ------------------------------ */
  {
    id: 'cmt_hybla', slug: 'hybla-valley-farms', name: 'Hybla Valley Farms', area: 'Fort Hunt, Alexandria',
    address: '2804 Boswell Avenue, Alexandria, VA 22306', status: 'sold-out', lots: 'Lots 35–38', lotSize: '½ acre each',
    summary: 'Four Stockton homes on half-acre lots on Boswell Avenue, within walking distance of stores and restaurants — all four lots are sold.',
    modelSlugs: ['stockton'], image: wp('2025/11/2728-Boswell_1.jpg'), priceFrom: 1245000, statusNote: 'All lots sold',
    documents: [
      { label: 'Included features (PDF, 11/24)', url: wp('2024/11/Hollin-Valley-Farms-Included-Features-11.24.pdf') },
      { label: 'Stockton brochure (PDF)', url: wp('2025/03/Stockton-Brochure-Elevation-C_3.4.25.pdf') },
    ],
  },
  {
    id: 'cmt_hunter', slug: 'hunter-station', name: 'Hunter Station', area: 'Riverside Road, Alexandria',
    address: '8405 & 8407 Riverside Road, Alexandria, VA', status: 'sold-out', lots: 'Lots 1 & 2', lotSize: '0.38–0.41 acre',
    summary: 'A Wellington (Lot 1) and a Hamilton (Lot 2), each with a finished basement recreation room, fifth bedroom and full bath — both sold.',
    modelSlugs: ['hamilton', 'wellington'], image: wp('2024/02/Lot-2_Final_1.jpg'), priceFrom: 1629000, statusNote: 'Both lots sold',
    documents: [
      { label: 'Included features, Lot 2 (PDF, 06/23)', url: wp('2023/06/Hunter-Stat.-8407-Riverside-Road-Included-Features-06.23-HAMILTON.docx.pdf') },
      { label: 'Site plan (PDF)', url: wp('2023/06/Hunter-Station_Marketing-Site-Plan.pdf') },
    ],
  },
  {
    id: 'cmt_gladstone', slug: 'gladstone-place', name: 'Gladstone Place', area: 'Alexandria',
    address: '1108 & 1110 Gladstone Place, Alexandria, VA', status: 'sold-out', lots: 'Lots 12 & 13',
    summary: 'Two Lexington homes, each with a finished basement recreation room and full bath and a one-car garage — both sold.',
    modelSlugs: ['lexington'], image: wp('2022/02/Lexington_Elev-B-04.23.21.jpg'), priceFrom: 1549000, statusNote: 'Both lots sold',
    documents: [
      { label: 'Included features (PDF, 07/24)', url: wp('2024/07/1108-1110-Gladstone-Pl.-Included-Features-07.24.pdf') },
      { label: 'Lexington brochure (PDF)', url: wp('2021/05/Wakefield-Lexington-Brochure_v3-05.2021.pdf') },
    ],
  },
  {
    id: 'cmt_lee', slug: 'lee-avenue', name: '7720 Lee Avenue', area: 'Alexandria',
    address: '7720 Lee Avenue, Alexandria, VA', status: 'sold-out', lots: '1 lot', lotSize: '0.43 acre',
    summary: 'A Fairfax built on the owner’s own lot: 4,115 sq ft on the first and second floors, a 1,330 sq ft finished basement and a three-car garage — completed September 2024.',
    modelSlugs: ['fairfax'], image: photos.models.fairfax, priceNote: 'Custom Build On Your Lot home', statusNote: 'Completed September 2024', buildOnYourLot: true,
    documents: [{ label: 'Included features (PDF, 06/23)', url: wp('2023/07/7720-Lee-Avenue-Included-Features.pdf') }],
  },
  {
    id: 'cmt_fort_hunt', slug: 'fort-hunt-road', name: 'Fort Hunt Road', area: 'Plymouth Haven, Alexandria',
    address: 'Fort Hunt Road, Alexandria, VA', status: 'sold-out', lots: 'Lots 4 & 5',
    summary: 'Two new single-family homes in the Plymouth Haven community.',
    modelSlugs: [], image: wp('2021/12/Fort-Hunt-Road-%E2%80%93-Wakefield-Homes-LC-Google-Chrome-12_11_2021-11_27_52-PM-400x249.png'),
    statusNote: 'Lot 4 sold · Lot 5 under contract',
  },
  {
    id: 'cmt_chadwick', slug: 'chadwick-avenue', name: 'Chadwick Avenue', area: 'Fort Hunt, Alexandria',
    address: 'Chadwick Avenue, Alexandria, VA', status: 'sold-out', lots: 'Lots 16 & 17',
    summary: 'New construction in the Fort Hunt community, directly across from Collingwood Park — both homes are sold.',
    modelSlugs: [], image: wp('2020/08/5.png'), statusNote: 'Both lots sold',
  },
  {
    id: 'cmt_arbour', slug: 'the-arbour-at-olive-court', name: 'The Arbour at Olive Court', area: 'Fort Hunt, Alexandria',
    address: 'Olive Court, Alexandria, VA', status: 'sold-out', lots: '5 homes',
    summary: 'Five modern farmhouses on a tree-lined court in the Fort Hunt community — all five are sold.',
    modelSlugs: [], image: wp('2020/08/4.png'), statusNote: 'All five sold',
  },
  {
    id: 'cmt_colonial', slug: 'colonial-avenue', name: 'Colonial Avenue', area: 'Mount Vernon, Alexandria',
    address: 'Colonial Avenue, Alexandria, VA', status: 'sold-out', lots: 'Lot 14', lotSize: '½ acre',
    summary: 'A new single-family home on a half-acre lot in the Mount Vernon Colonial Acres community. Sold.',
    modelSlugs: [], image: wp('2022/02/wellingtonNewPic.png'), statusNote: 'Sold',
  },
  {
    id: 'cmt_washington', slug: 'washington-avenue', name: 'Washington Avenue', area: 'Wellington, Alexandria',
    address: '8017 & 8019 Washington Avenue, Alexandria, VA', status: 'sold-out', lots: 'Lots 15 & 16',
    summary: 'Two single-family Lexington homes in the Wellington subdivision.',
    modelSlugs: ['lexington'], image: photos.models.lexington, statusNote: 'Lexington models',
  },
]

export const communityStatusLabels: Record<CommunityStatus, string> = {
  'now-selling': 'Now selling',
  'coming-soon': 'Coming soon',
  'under-construction': 'Under construction',
  'sold-out': 'Sold out',
}

/** The live "Current Projects" list, in the live order. */
export const currentCommunities: Community[] = communities.filter((c) => c.current)

/** Earlier communities and the other locations listed on the live homepage. */
export const pastCommunities: Community[] = communities.filter((c) => !c.current)

export function getCommunity(idOrSlug: string): Community | undefined {
  return communities.find((c) => c.id === idOrSlug || c.slug === idOrSlug)
}
