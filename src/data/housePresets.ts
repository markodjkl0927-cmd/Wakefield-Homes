import type { HouseColors, HouseConfig, HouseStyle } from '@/types'

/** Exterior colour palettes staff can pick from in the 3D configurator. */
export const colorPalettes: { id: string; name: string; colors: HouseColors }[] = [
  {
    id: 'classic-white',
    name: 'Classic White',
    colors: { siding: '#F4F2EC', trim: '#FFFFFF', roof: '#3A3D44', door: '#1F2A44', shutters: '#22252B', stone: '#9C968C', windowFrame: '#FFFFFF' },
  },
  {
    id: 'modern-farmhouse',
    name: 'Modern Farmhouse',
    colors: { siding: '#F6F5F1', trim: '#F6F5F1', roof: '#2B2D31', door: '#C08A4A', shutters: '#2B2D31', stone: '#8E8A84', windowFrame: '#1E1F22' },
  },
  {
    id: 'harbor-blue',
    name: 'Harbor Blue',
    colors: { siding: '#5D7A9E', trim: '#FFFFFF', roof: '#363A42', door: '#FFFFFF', shutters: '#2F3B52', stone: '#9A948A', windowFrame: '#FFFFFF' },
  },
  {
    id: 'stone-gray',
    name: 'Stone Gray',
    colors: { siding: '#A9ACA8', trim: '#FFFFFF', roof: '#3B3E44', door: '#7A2E2A', shutters: '#3B3E44', stone: '#8B857C', windowFrame: '#FFFFFF' },
  },
  {
    id: 'sage-green',
    name: 'Sage',
    colors: { siding: '#9DAA92', trim: '#FBFAF6', roof: '#3E4040', door: '#2E3B2F', shutters: '#3D4A3E', stone: '#9A9286', windowFrame: '#FBFAF6' },
  },
  {
    id: 'colonial-brick',
    name: 'Colonial Brick',
    colors: { siding: '#9C4A3A', trim: '#FFFFFF', roof: '#34373D', door: '#1D2B3A', shutters: '#1F2328', stone: '#8E8478', windowFrame: '#FFFFFF' },
  },
  {
    id: 'cedar-shingle',
    name: 'Cedar Shingle',
    colors: { siding: '#8D8579', trim: '#FFFFFF', roof: '#46484C', door: '#23415E', shutters: '#5A5A56', stone: '#9E978C', windowFrame: '#FFFFFF' },
  },
  {
    id: 'navy-classic',
    name: 'Navy Classic',
    colors: { siding: '#2F3E5C', trim: '#FFFFFF', roof: '#2E3036', door: '#B5832F', shutters: '#FFFFFF', stone: '#9A9389', windowFrame: '#FFFFFF' },
  },
  {
    id: 'warm-khaki',
    name: 'Warm Khaki',
    colors: { siding: '#C2B190', trim: '#FFFFFF', roof: '#4A4642', door: '#5B2F23', shutters: '#4E4A3F', stone: '#9C9284', windowFrame: '#FFFFFF' },
  },
]

export function paletteColors(id: string): HouseColors {
  return (colorPalettes.find((p) => p.id === id) ?? colorPalettes[0]).colors
}

const styleDefaults: Record<HouseStyle, Omit<HouseConfig, 'colors'>> = {
  colonial: {
    style: 'colonial', stories: 2, width: 14, depth: 10, roof: 'gable', roofPitch: 0.62, siding: 'lap', porch: 'portico',
    garageBays: 2, garagePosition: 'right', dormers: 0, chimney: true, shutters: true, stoneBase: false, windowsPerFloor: 5, screenPorch: false,
  },
  craftsman: {
    style: 'craftsman', stories: 2, width: 13, depth: 11, roof: 'cross-gable', roofPitch: 0.6, siding: 'lap', porch: 'front',
    garageBays: 2, garagePosition: 'right', dormers: 0, chimney: false, shutters: false, stoneBase: true, windowsPerFloor: 4, screenPorch: false,
  },
  farmhouse: {
    style: 'farmhouse', stories: 2, width: 14, depth: 11, roof: 'cross-gable', roofPitch: 0.85, siding: 'board-batten', porch: 'wrap',
    garageBays: 2, garagePosition: 'right', dormers: 2, chimney: true, shutters: false, stoneBase: false, windowsPerFloor: 4, screenPorch: false,
  },
  'modern-farmhouse': {
    style: 'modern-farmhouse', stories: 2, width: 13, depth: 11, roof: 'gable', roofPitch: 0.9, siding: 'board-batten', porch: 'front',
    garageBays: 2, garagePosition: 'right', dormers: 0, chimney: true, shutters: false, stoneBase: false, windowsPerFloor: 4, screenPorch: false,
  },
  federal: {
    style: 'federal', stories: 2, width: 16, depth: 11, roof: 'hip', roofPitch: 0.5, siding: 'brick', porch: 'portico',
    garageBays: 3, garagePosition: 'courtyard', dormers: 3, chimney: true, shutters: true, stoneBase: false, windowsPerFloor: 5, screenPorch: false,
  },
  cottage: {
    style: 'cottage', stories: 2, width: 11, depth: 10, roof: 'cross-gable', roofPitch: 0.75, siding: 'lap', porch: 'front',
    garageBays: 0, garagePosition: 'none', dormers: 1, chimney: false, shutters: true, stoneBase: true, windowsPerFloor: 3, screenPorch: false,
  },
  nantucket: {
    style: 'nantucket', stories: 2, width: 14, depth: 11, roof: 'gable', roofPitch: 0.8, siding: 'shingle', porch: 'front',
    garageBays: 2, garagePosition: 'courtyard', dormers: 2, chimney: true, shutters: false, stoneBase: false, windowsPerFloor: 4, screenPorch: false,
  },
  traditional: {
    style: 'traditional', stories: 2, width: 15, depth: 11, roof: 'hip', roofPitch: 0.55, siding: 'lap', porch: 'portico',
    garageBays: 2, garagePosition: 'left', dormers: 0, chimney: true, shutters: true, stoneBase: true, windowsPerFloor: 5, screenPorch: false,
  },
  foursquare: {
    style: 'foursquare', stories: 2, width: 12, depth: 12, roof: 'hip', roofPitch: 0.5, siding: 'lap', porch: 'wrap',
    garageBays: 3, garagePosition: 'left', dormers: 1, chimney: true, shutters: false, stoneBase: true, windowsPerFloor: 3, screenPorch: true,
  },
}

/** Build a complete HouseConfig from a style, a palette and optional overrides. */
export function makeHouse(style: HouseStyle, paletteId: string, overrides: Partial<Omit<HouseConfig, 'colors'>> = {}, colorOverrides: Partial<HouseColors> = {}): HouseConfig {
  return {
    ...styleDefaults[style],
    ...overrides,
    colors: { ...paletteColors(paletteId), ...colorOverrides },
  }
}

export const houseStyleLabels: Record<HouseStyle, string> = {
  colonial: 'Colonial',
  craftsman: 'Craftsman',
  farmhouse: 'Farmhouse',
  'modern-farmhouse': 'Modern Farmhouse',
  federal: 'Federal',
  cottage: 'Cottage',
  nantucket: 'Nantucket',
  traditional: 'Traditional',
  foursquare: 'American Foursquare',
}
