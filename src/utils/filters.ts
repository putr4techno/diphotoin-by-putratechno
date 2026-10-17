export type ColorFilter = 'original' | 'bw' | 'vintage';

export interface FilterDefinition {
  id: ColorFilter;
  label: string;
  cssFilter: string;
  canvasFilter: string;
  description: string;
}

export const COLOR_FILTERS: FilterDefinition[] = [
  {
    id: 'original',
    label: 'Original',
    cssFilter: 'none',
    canvasFilter: 'none',
    description: 'Warna asli natural',
  },
  {
    id: 'bw',
    label: 'Black & White',
    cssFilter: 'grayscale(100%) contrast(115%)',
    canvasFilter: 'grayscale(100%) contrast(115%)',
    description: 'Monokrom klasik elegan',
  },
  {
    id: 'vintage',
    label: 'Vintage',
    cssFilter: 'sepia(60%) contrast(105%) brightness(96%) saturate(125%)',
    canvasFilter: 'sepia(60%) contrast(105%) brightness(96%) saturate(125%)',
    description: 'Nuansa hangat retro',
  },
];

export function getFilterDefinition(filterId: ColorFilter): FilterDefinition {
  return COLOR_FILTERS.find((f) => f.id === filterId) || COLOR_FILTERS[0];
}
