/**
 * Every shared photo used by the prototype, in one place.
 * They are served from the current wakefieldhomeslc.com media library (the client's own photos).
 * Address-specific photos live with their homes (listings.ts, communities.ts, portfolio.ts) and use `wp()`.
 * To ship them locally later, download them into /public/images and swap WP_UPLOADS here.
 */
export const WP_UPLOADS = 'https://wakefieldhomeslc.com/wp-content/uploads'

/** Full URL of a file in the client's media library, e.g. wp('2024/02/Lot-2_Final_2.jpg'). */
export function wp(path: string): string {
  return `${WP_UPLOADS}/${path}`
}

const WP = WP_UPLOADS

export const photos = {
  /** Large, wide photos for heroes and banners. */
  hero: {
    exteriorWhiteFarmhouse: `${WP}/2023/03/51.jpeg`,
    kitchenChandelier: `${WP}/2024/09/Veatch-Kitchen-4_-1.jpg`,
    kitchenIsland: `${WP}/2023/03/31K-scaled-1.jpeg`,
    /** Screened porch with a stone fireplace overlooking the Potomac — 5019 Burke Drive. */
    porchFireplaceRiver: `${WP}/2024/09/Frucht-Fireplace_.jpg`,
    floatingStair: `${WP}/2023/10/Bambha-009-_-Edited-1536x1027.jpg`,
    masterBath: `${WP}/2023/03/31-scaled-1.jpeg`,
    /** Mudroom with built-in cubbies — 5019 Burke Drive. */
    mudroom: `${WP}/2024/09/Frucht-Mudroom_.jpg`,
    laundry: `${WP}/2024/09/Veatch-Laundry-2_-1.jpg`,
    /** Hunter Station (8405 & 8407 Riverside Road) in winter. */
    twoHomesStreet: `${WP}/2024/02/Hunter-Station-new-first-photo_-3.jpg`,
    /** 8405 Riverside Road (Hunter Station Lot 1, a Wellington). */
    blueCraftsman: `${WP}/2024/02/Hunter-Station-new-second-photo_-2.jpg`,
    blueColonialLawn: `${WP}/2024/09/Wellington-800x534a.webp`,
    framing: `${WP}/2022/05/Framing-Progress-3-1200x675.jpg`,
    /** Summer exterior: a blue Franklin on a sunny street (2048 px). */
    summerStreet: `${WP}/2023/07/Franklin-111.jpg`,
    /** Summer exterior: the Build On Your Lot Fairfax at 7720 Lee Avenue, with its wraparound porch (2048 px). */
    craftsmanPorch: `${WP}/2024/09/Lee-Avenue-photo-2-1536x1025.jpg`,
    /** Kitchen with a navy island — the Harrison at 8628 Plymouth Road (2500 px). */
    kitchenNavyIsland: `${WP}/2025/08/8628_Plymouth_Road_004-1-1-1.jpg`,
    /** Bar with navy cabinetry beside the stair — the Harrison at 8628 Plymouth Road (2500 px). */
    barAndStair: `${WP}/2025/08/8628_Plymouth_Road_011-1-1.jpg`,
    /** 1700 Jamestown Road rendering on its wooded lot (2560 × 1280). */
    jamestownRendering: `${WP}/2026/07/jpeg-optimizer_1700-Jamestown-Road1-scaled.jpg`,
    /** 1007–1009 Oronoco Street townhomes, front rendering at dusk. */
    oronocoTownhomesDusk: `${WP}/2026/11/1007-1009FrontRender10-13Dusk-1200x675.png`,
  },
  company: {
    team: `${WP}/2023/06/uChTKWDQaa.jpeg`,
    awards: `${WP}/2023/03/Wakefield-awards.jpeg`,
    /** The photo on the live VPDES page: silt fence and a stone-lined planting bed at a Wakefield site. */
    vpdesSite: `${WP}/2023/06/5kXw8Ulg.jpegVPDES-Permit-Photo22-1.jpg`,
  },
  memberships: {
    nvbia: `${WP}/2020/08/NVBIA-Wakefield-Homes-LC-300x251.png`,
    nahb: `${WP}/2020/07/nahb-logo.jpg`,
    chamber: `${WP}/2020/07/chamber-member-300x251.png`,
    cbusa: `${WP}/2020/07/CBUSA-300x251.png`,
    hbav: `${WP}/2020/07/Untitled-design-5-300x251.png`,
  },
  /**
   * Construction progress photos of 8405 Riverside Road (Hunter Station Lot 1, a Wellington), grouped by stage.
   * Dates are in the file names (June 2023 – January 2024).
   */
  construction: {
    excavation: `${WP}/2023/11/8405_Excavation_06.01.23.jpg`,
    foundation: `${WP}/2023/11/8405_Foundation_06.05.23.jpg`,
    foundationWalls: `${WP}/2023/11/8405_Foundation_06.08.23.jpg`,
    groundwork: `${WP}/2023/11/8405_Groundwork_06.20.23.jpg`,
    framingExterior: `${WP}/2023/11/8405_Progress1_10.20.23.jpg`,
    framingSide: `${WP}/2023/11/8405_Progress2_10.20.23.jpg`,
    cornice: `${WP}/2023/11/8405_Cornice_10.04.23.jpg`,
    masonry: `${WP}/2023/11/8405_Masonry_09.20.23-1.jpg`,
    screenPorch: `${WP}/2023/11/8405_ScreenPorch_10.11.23.jpg`,
    interiorStair: `${WP}/2023/11/8405_Progress5_10.20.23.jpg`,
    interiorRooms: `${WP}/2023/11/8405_Progress6_10.20.23.jpg`,
    /** Bathroom vanity in progress (the file name says "Progress8"). */
    interiorBath: `${WP}/2023/11/8405_Progress8_10.20.23.jpg`,
    completedFront: `${WP}/2024/01/8405-Front-Elevation_1-1.jpg`,
    completedRear: `${WP}/2024/01/8405-Rear-Elevation_2-1.jpg`,
    completedPorch: `${WP}/2024/01/8405-Screened-Porch-View_3.jpg`,
    completedKitchen: `${WP}/2024/01/8405-Kitchen-Dining_4-1.jpg`,
  },
  /** One exterior photo per floor plan (the largest clean version in the client's media library). */
  models: {
    abigail: `${WP}/2026/09/01-1-1.jpg`,
    belleview: `${WP}/2020/08/photo_980782-1500x1000-1.jpg`,
    carlyle: `${WP}/2020/07/Lot-13-Front-Exterior-004-1536x1152.jpg`,
    custis: `${WP}/2020/07/The-Custis-.png`,
    fairfax: `${WP}/2024/09/7720-Lee-Ave-New-Thumbnail-image-1536x969.jpg`,
    'fort-hunt': `${WP}/2023/06/Fort-Hunt-Photo-1_revised.jpg`,
    franklin: `${WP}/2023/07/Franklin-111a.jpg`,
    hamilton: `${WP}/2022/04/imageedit_20_2642773128-1-e1651516567761.jpg`,
    /** The Harrison built at 8628 Plymouth Road (Plymouth Haven). */
    harrison: `${WP}/2025/07/Photoshopped-Exterior-1.jpg`,
    jamestown: `${WP}/2026/07/jpeg-optimizer_1700-Jamestown-Road1-scaled.jpg`,
    howell: `${WP}/2020/06/DHC_5338-2627186230-O-1.jpg`,
    jefferson: `${WP}/2023/06/jeff.png`,
    lexington: `${WP}/2020/06/DSC03305-3752350.jpg`,
    melson: `${WP}/2020/06/Melson-2-2.jpg`,
    plymouth: `${WP}/2020/06/8704-Plymouth-Rd-6.jpg`,
    radford: `${WP}/2023/06/The-Radforddd.png`,
    sherwood: `${WP}/2020/08/8708_Plymouth_Rd__Alexandria__VA_22308__USA-20160915185301-1536x1024.jpg`,
    standish: `${WP}/2022/04/Standish-1-1.jpg`,
    stockton: `${WP}/2024/06/Stockton-Model.jpg`,
    wellington: `${WP}/2023/06/Wellington.jpg`,
    westmoreland: `${WP}/2023/06/003_003_1114_westmoreland_rd377.ab_aa.jpg`,
    winfield: `${WP}/2020/07/reserve-winfield.jpg`,
    woodlawn: `${WP}/2023/10/Woodlawn-Front-Elevation-_-Edited-1536x1027.jpg`,
    yorktown: `${WP}/2023/06/Yorktown-Model.jpg`,
  } as Record<string, string>,
}
