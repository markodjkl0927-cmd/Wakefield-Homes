import type { Home, HouseColors, HouseConfig } from '@/types'
import { getModel } from './models'
import { paletteColors } from './housePresets'
import { photos, wp } from './images'
import { isoFromNow } from '@/lib/utils'

/**
 * Public website listings (Move In Ready, community pages, homepage 3D explorer).
 * These describe the client's REAL homes and projects — addresses, plans, statuses, prices, delivery
 * dates and photos come from https://wakefieldhomeslc.com and the documents it links. Specs that are not
 * published for a home are listed in `unpublishedSpecs` (pages leave them out). Owned homes in the
 * portals are demo data and live in seed.ts.
 *
 * Order matters: the homepage shows the first homes for sale in this order, and the 3D explorer opens on
 * the first featured home.
 */
function plan(modelSlug: string) {
  const model = getModel(modelSlug)
  if (!model) throw new Error(`Unknown model ${modelSlug}`)
  return { modelId: model.id, config: structuredClone(model.house3d), image: model.image }
}

/** The plan's 3D design in the exterior colors of this particular home. */
function recolor(config: HouseConfig, colors: Partial<HouseColors>): HouseConfig {
  return { ...structuredClone(config), colors: { ...config.colors, ...colors } }
}

/** Hamilton interiors from the live Home Gallery (a completed Hamilton), shown on Hamiltons not built yet. */
const hamiltonGallery = {
  foyer: wp('2022/04/Hamilton-2-1536x1024.jpg'),
  familyRoom: wp('2022/04/Hamilton-3-1536x865.jpg'),
  kitchen: wp('2022/04/Hamilton-4-1536x1024.jpg'),
  laundry: wp('2022/04/Hamilton-5-1536x1024.jpg'),
  mudroom: wp('2022/04/Hamilton-6-1536x1024.jpg'),
}

/** Shared copy for the three Oronoco Street townhomes (from the live page and its Included Features PDF, 09/26). */
const ORONOCO_FEATURES =
  'Included features for the three homes list a finished basement with recreation room, wet bar, bedroom and bath, wide-plank engineered hardwood on the upper levels, a kitchen with GE Café appliances and marble-look quartz, a rear deck and two private rear-yard parking spaces. Price to be announced.'

const oronocoDocs = [
  { label: 'Included features (PDF, 09/26)', url: wp('2026/09/Oronoco-Street_Included-Features-09.26.pdf') },
  { label: 'Kitchens (PDF)', url: wp('2026/09/Oronoco-Kitchens.pdf') },
  { label: 'Owner’s suites (PDF)', url: wp('2026/09/Oronoco-Owners-Suites.pdf') },
]

export function createPublicListings(): Home[] {
  const stockton = plan('stockton')
  const hamilton = plan('hamilton')
  const jamestown = plan('jamestown')
  const lexington = plan('lexington')
  const whiteFarmhouse = paletteColors('modern-farmhouse')

  return [
    /* --------------------------- For sale / coming soon -------------------------- */
    {
      id: 'hm_shenandoah', slug: '1208-shenandoah-road', title: '1208 Shenandoah Road · The Hamilton', address: '1208 Shenandoah Road', city: 'Alexandria, VA',
      communityId: 'cmt_shenandoah', modelId: hamilton.modelId, status: 'coming-soon', published: true, featured: true,
      price: 2445000, beds: 5, baths: 4.5, sqft: 5046, lotSizeAcres: 0.5, delivery: 'Late summer 2027',
      description:
        'A new Hamilton (Elevation A) on a half-acre lot: 3,678 sq ft on the first and second floors plus a 1,368 sq ft finished walkout basement with a recreation room, a bedroom, a gym and a full bath, and a two-car side-load garage. Now in the permit phase, with delivery expected in late summer 2027. Photos show a completed Hamilton.',
      images: [wp('2025/08/Untitled-design-18-1200x500.png'), hamiltonGallery.familyRoom, hamiltonGallery.kitchen, hamiltonGallery.mudroom, hamiltonGallery.laundry],
      documents: [{ label: 'Included features (PDF, 08/26)', url: wp('2026/10/1208-Shenandoah-Road-Included-Features-08.26.pdf') }],
      view3d: { enabled: true, config: recolor(hamilton.config, whiteFarmhouse), hasCustomModel: false },
      updatedAt: isoFromNow(-2),
    },
    {
      id: 'hm_tauxemont', slug: '7700-tauxemont-road', title: '7700 Tauxemont Road · The Hamilton', address: '7700 Tauxemont Road', city: 'Alexandria, VA',
      communityId: 'cmt_tauxemont', modelId: hamilton.modelId, status: 'coming-soon', published: true, featured: true,
      price: 2349000, priceNote: 'Subject to change', beds: 5, baths: 4.5, sqft: 5046, lotSizeAcres: 0.5, delivery: 'Summer 2027',
      description:
        'Coming soon: a new Hamilton (Elevation A) on a half-acre lot, with 3,678 sq ft on the first and second floors plus a 1,368 sq ft finished walkout basement with a recreation room, a bedroom, a gym and a full bath, and a two-car garage. In the permit phase, with delivery expected in summer 2027. Photos show a completed Hamilton.',
      images: [wp('2026/09/7700-Tauxemont-new-thumbnail.jpg'), hamiltonGallery.kitchen, hamiltonGallery.foyer, hamiltonGallery.familyRoom, hamiltonGallery.mudroom],
      documents: [
        { label: 'Included features (PDF, 08/26)', url: wp('2026/09/7700-Tauxemont-Road-Included-Features-08.26.pdf') },
        { label: 'Hamilton brochure (PDF)', url: wp('2026/09/Hamilton-Model-Brochure-05.20-1-6.pdf') },
      ],
      view3d: { enabled: true, config: recolor(hamilton.config, { ...whiteFarmhouse, door: '#2B2D31' }), hasCustomModel: false },
      updatedAt: isoFromNow(-4),
    },
    {
      id: 'hm_jamestown', slug: '1700-jamestown-road', title: '1700 Jamestown Road · The Jamestown', address: '1700 Jamestown Road', city: 'Alexandria, VA',
      communityId: 'cmt_jamestown', modelId: jamestown.modelId, status: 'under-construction', published: true, featured: true,
      price: null, priceNote: 'Price TBD', beds: 5, baths: 4.5, sqft: 5246, lotSizeAcres: 0.27, delivery: 'Spring 2027',
      description:
        'A new home on our newly designed Jamestown plan — five bedrooms and 4.5 baths across three finished levels, with a one-car garage — on a 0.27-acre lot. Now under construction, with delivery expected in spring 2027. Price to be announced.',
      images: [
        photos.hero.jamestownRendering,
        wp('2026/11/HC_Jamestown_19-rotated.jpg'),
        wp('2026/11/HC_Jamestown_15-rotated.jpg'),
        wp('2026/11/HC_Jamestown_5.jpg'),
        wp('2026/08/Jamestown-Site-Plan1.jpg'),
      ],
      documents: [{ label: 'Jamestown brochure (PDF, 08/26)', url: wp('2026/08/Jamestown-Brochure-08.26.pdf') }],
      view3d: { enabled: true, config: jamestown.config, hasCustomModel: false },
      updatedAt: isoFromNow(-1),
    },
    {
      id: 'hm_oronoco', slug: '1009-oronoco-street', title: '1009 Oronoco Street · Townhome', address: '1009 Oronoco Street', city: 'Alexandria, VA 22314',
      communityId: 'cmt_oronoco', modelId: '', status: 'under-construction', published: true, featured: false,
      price: null, priceNote: 'Price TBD', beds: 0, baths: 0, sqft: 0, unpublishedSpecs: ['beds', 'baths', 'sqft'], delivery: 'December 2026',
      description: `A brand-new, four-level townhome on Oronoco Street in the City of Alexandria, now under construction and available December 2026. ${ORONOCO_FEATURES}`,
      images: [
        wp('2026/07/1_1009-Oronoco-St_rendering-600x600.png'),
        photos.hero.oronocoTownhomesDusk,
        wp('2026/11/1007-1009RearRender10-13Dusk-1200x627.png'),
        wp('2026/07/1009_House-15-rotated.jpg'),
        wp('2026/07/1009_House-13-rotated.jpg'),
      ],
      documents: [{ label: '1009 Oronoco Street brochure (PDF)', url: wp('2025/10/1009-Oronoco-Street-Brochure.pdf') }, ...oronocoDocs],
      view3d: { enabled: false, config: lexington.config, hasCustomModel: false },
      updatedAt: isoFromNow(-3),
    },
    {
      id: 'hm_oronoco_10075', slug: '1007-half-oronoco-street', title: '1007½ Oronoco Street · Townhome', address: '1007½ Oronoco Street', city: 'Alexandria, VA 22314',
      communityId: 'cmt_oronoco', modelId: '', status: 'under-construction', published: true, featured: false,
      price: null, priceNote: 'Price TBD', beds: 0, baths: 0, sqft: 0, unpublishedSpecs: ['beds', 'baths', 'sqft'], delivery: 'December 2026',
      description: `A brand-new, four-level townhome on Oronoco Street in the City of Alexandria, now under construction and available December 2026. At 1007½, the plans include a kitchenette and an accessory dwelling unit. ${ORONOCO_FEATURES}`,
      images: [
        wp('2026/07/2_1007-1-2-Oronoco-St_rendering-600x600.png'),
        photos.hero.oronocoTownhomesDusk,
        wp('2026/11/1007-1009RearRender10-13Dusk-1200x627.png'),
        wp('2026/07/10075_House-13-rotated.jpg'),
        wp('2026/07/10075_House-11-rotated.jpg'),
      ],
      documents: [{ label: '1007½ Oronoco Street brochure (PDF)', url: wp('2025/10/1007.5-Oronoco-Street-Brochure.pdf') }, ...oronocoDocs],
      view3d: { enabled: false, config: lexington.config, hasCustomModel: false },
      updatedAt: isoFromNow(-3),
    },
    {
      id: 'hm_oronoco_1007', slug: '1007-oronoco-street', title: '1007 Oronoco Street · Townhome', address: '1007 Oronoco Street', city: 'Alexandria, VA 22314',
      communityId: 'cmt_oronoco', modelId: '', status: 'under-construction', published: true, featured: false,
      price: null, priceNote: 'Price TBD', beds: 0, baths: 0, sqft: 0, unpublishedSpecs: ['beds', 'baths', 'sqft'], delivery: 'December 2026',
      description: `A brand-new, four-level townhome on Oronoco Street in the City of Alexandria, now under construction and available December 2026. ${ORONOCO_FEATURES}`,
      images: [
        wp('2026/07/3_1007-Oronoco-St_rendering-600x600.png'),
        photos.hero.oronocoTownhomesDusk,
        wp('2026/11/1007-1009RearRender10-13Dusk-1200x627.png'),
        wp('2026/07/1007-House_16-rotated.jpg'),
        wp('2026/07/1007-House_11-rotated.jpg'),
      ],
      documents: [{ label: '1007 Oronoco Street brochure (PDF)', url: wp('2025/10/1007-Oronoco-Street-Brochure.pdf') }, ...oronocoDocs],
      view3d: { enabled: false, config: lexington.config, hasCustomModel: false },
      updatedAt: isoFromNow(-3),
    },

    /* ------------------------------ Sold examples ------------------------------- */
    {
      id: 'hm_hybla36', slug: 'hybla-valley-farms-lot-36', title: 'Lot 36 · The Stockton', address: '2800 Boswell Avenue', city: 'Alexandria, VA 22306',
      communityId: 'cmt_hybla', lot: 'Lot 36', modelId: stockton.modelId, status: 'sold', published: true, featured: false,
      price: 1245000, beds: 5, baths: 4.5, sqft: 4125, unpublishedSpecs: ['sqft'], lotSizeAcres: 0.5,
      description:
        'A Stockton with a classically beautiful first floor made for family and friends, generous bedrooms and baths upstairs with a separate laundry room, and a finished basement with bonus space for multi-generational living. The loft can be finished at the buyer’s request. Sold.',
      images: [
        wp('2024/06/2800_Boswell_Avenue.jpg'),
        wp('2024/05/4_living-room-fireplace.jpg'),
        wp('2024/05/6_kitchen-up-close.jpg'),
        wp('2024/05/3_dining-room-1.jpg'),
        wp('2024/05/8_master-bedroom.jpg'),
        wp('2024/05/9_master-bathroom.jpg'),
        wp('2024/05/12_basement-1-scaled.jpg'),
      ],
      view3d: { enabled: true, config: recolor(stockton.config, { siding: '#9B968C', door: '#2F3338', stone: '#8B857C' }), hasCustomModel: false },
      updatedAt: isoFromNow(-30),
    },
    {
      id: 'hm_hybla38', slug: 'hybla-valley-farms-lot-38', title: 'Lot 38 · The Stockton, expanded kitchen', address: '2724 Boswell Avenue', city: 'Alexandria, VA 22306',
      communityId: 'cmt_hybla', lot: 'Lot 38', modelId: stockton.modelId, status: 'sold', published: true, featured: false,
      price: 1339000, priceNote: 'Plus $20,000 lot premium', beds: 5, baths: 4.5, sqft: 4125, unpublishedSpecs: ['sqft'], lotSizeAcres: 0.5,
      description:
        'A Stockton with the expanded kitchen and breakfast room across the rear of the house, a storage shed in the back yard and a finished basement with bonus space for multi-generational living. The loft can be finished at the buyer’s request. Sold.',
      images: [
        wp('2024/05/2724_Boswell_Finished_1_.jpg'),
        wp('2024/05/2724_Boswell_Finished_5_.jpg'),
        wp('2024/05/2724_Boswell_Finished_4_.jpg'),
        wp('2024/05/2724_Boswell_Finished_8_.jpg'),
        wp('2024/05/2724_Boswell_Finished_13_.jpg'),
        wp('2024/05/2724_Boswell_Finished_14_.jpg'),
        wp('2024/05/2724_Boswell_Finished_2_.jpg'),
      ],
      view3d: { enabled: true, config: recolor(stockton.config, { siding: '#6E7C8A', door: '#2F3338' }), hasCustomModel: false },
      updatedAt: isoFromNow(-30),
    },
    {
      id: 'hm_burke', slug: 'burke-drive-river-front', title: '5019 Burke Drive · Custom home on the Potomac', address: '5019 Burke Drive', city: 'Alexandria, VA 22309',
      communityId: 'cmt_burke', lot: 'River-front lot', modelId: hamilton.modelId, status: 'sold', published: true, featured: false,
      price: null, priceNote: 'Sold', beds: 4, baths: 4.5, sqft: 4487, unpublishedSpecs: ['beds', 'baths', 'sqft'], lotSizeAcres: 0.5,
      description:
        'A custom home on the Potomac, built on the Hamilton plan (Elevation A) on a one-half acre river-front lot in the Mount Vernon Terrace subdivision: first and second floors plus an 809 sq ft finished basement recreation room and full bath, and a two-car garage. Sold.',
      images: [
        wp('2023/10/FUKEkQBEcT-DSC01580.jpg'),
        wp('2023/10/DSC01592.jpg'),
        photos.hero.porchFireplaceRiver,
        wp('2023/10/FUKEkQBEcT-DSC01286.jpg'),
        wp('2023/10/DSC01302-1.jpg'),
        wp('2023/10/DSC01427-1.jpg'),
        wp('2023/10/DSC01503.jpg'),
        photos.hero.mudroom,
      ],
      view3d: { enabled: false, config: hamilton.config, hasCustomModel: false },
      updatedAt: isoFromNow(-60),
    },
    {
      id: 'hm_hunter2', slug: 'hunter-station-lot-2', title: 'Lot 2 · The Hamilton', address: '8407 Riverside Road', city: 'Alexandria, VA',
      communityId: 'cmt_hunter', lot: 'Lot 2', modelId: hamilton.modelId, status: 'sold', published: true, featured: false,
      price: 1629000, beds: 5, baths: 4.5, sqft: 4848, lotSizeAcres: 0.38,
      description:
        'A Hamilton with 3,678 sq ft on the first and second floors plus a 1,170 sq ft finished basement with a recreation room, a fifth bedroom and a full bath, and a two-car side-load garage, on a 0.38-acre lot at Hunter Station. Sold.',
      images: [
        wp('2024/02/Lot-2_Final_2.jpg'),
        wp('2024/02/Lot-2_Final_1.jpg'),
        wp('2024/02/Lot-2_Final_4.jpg'),
        wp('2024/02/Lot-2_Final_7.jpg'),
        wp('2024/02/Lot-2_Final_9.jpg'),
        wp('2024/02/Lot-2_Final_10.jpg'),
        wp('2024/02/Lot-2_Final_12.jpg'),
      ],
      view3d: { enabled: false, config: recolor(hamilton.config, whiteFarmhouse), hasCustomModel: false },
      updatedAt: isoFromNow(-90),
    },
  ]
}
