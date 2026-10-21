import { ColorFilter } from '../types';

export interface FilterDefinition {
  id: ColorFilter;
  label: string;
  badge: string;
  cssFilter: string;
  canvasFilter: string;
  description: string;
  tagline: string;
  previewBg: string;
}

export const COLOR_FILTERS: FilterDefinition[] = [
  {
    id: 'none',
    label: 'Tanpa Efek',
    badge: '🌿 Tanpa Efek',
    cssFilter: 'none',
    canvasFilter: 'none',
    description: 'Warna asli kamera tanpa filter',
    tagline: 'Natural & Authentic',
    previewBg: 'from-zinc-500/20 via-zinc-600/10 to-zinc-700/20',
  },
  {
    id: 'beauty',
    label: 'Beauty',
    badge: '✨ Beauty Filter',
    cssFilter: 'brightness(108%) contrast(98%) saturate(110%)',
    canvasFilter: 'brightness(108%) contrast(98%) saturate(110%)',
    description: 'Kulit halus, cerah merata & natural',
    tagline: 'Soft & Flawless Skin',
    previewBg: 'from-pink-500/20 via-rose-500/10 to-amber-500/20',
  },
  {
    id: 'glowing',
    label: 'Glowing',
    badge: '🌟 Glowing Filter',
    cssFilter: 'brightness(115%) contrast(104%) saturate(124%)',
    canvasFilter: 'brightness(115%) contrast(104%) saturate(124%)',
    description: 'Efek kilau bercahaya & fresh',
    tagline: 'Luminous Radiant Glow',
    previewBg: 'from-amber-400/20 via-orange-500/10 to-rose-400/20',
  },
];

export function getFilterDefinition(filterId: ColorFilter): FilterDefinition {
  return COLOR_FILTERS.find((f) => f.id === filterId) || COLOR_FILTERS[0];
}
