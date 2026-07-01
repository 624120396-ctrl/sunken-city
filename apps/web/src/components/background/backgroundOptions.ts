export type BackgroundReadabilityProfile = 'luminous' | 'balanced' | 'dark';

export interface BackgroundOption {
  id: string;
  name: string;
  url: string;
  readabilityProfile: BackgroundReadabilityProfile;
}

export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  { id: 'bg-vellum', name: '羊皮纸', url: '/bg-vellum.png', readabilityProfile: 'luminous' },
  { id: 'bg-sunken', name: '沉没之城', url: '/bg-sunken.png', readabilityProfile: 'balanced' },
  { id: 'bg-ocean-blue', name: '深海蓝', url: '/bg-ocean-blue.png', readabilityProfile: 'balanced' },
  { id: 'bg-ruins-beige', name: '废墟米', url: '/bg-ruins-beige.png', readabilityProfile: 'luminous' },
  { id: 'bg-deep-sea', name: '深海遗迹', url: '/bg-deep-sea.png', readabilityProfile: 'dark' },
  { id: 'bg-underwater-city', name: '水下城邦', url: '/bg-underwater-city.png', readabilityProfile: 'balanced' },
  { id: 'bg-void-runes', name: '虚空符文', url: '/bg-void-runes.png', readabilityProfile: 'dark' },
];

export const DEFAULT_BACKGROUND_ID = 'bg-sunken';

export function getBackgroundById(id?: string | null): BackgroundOption {
  return BACKGROUND_OPTIONS.find((item) => item.id === id)
    ?? BACKGROUND_OPTIONS.find((item) => item.id === DEFAULT_BACKGROUND_ID)!;
}
