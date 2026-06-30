import { BACKGROUND_OPTIONS, DEFAULT_BACKGROUND_ID, getBackgroundById } from '@components/background/backgroundOptions';

export const BG_OPTIONS = Object.fromEntries(
  BACKGROUND_OPTIONS.map((item) => [item.id, { name: item.name, url: item.url }])
);

export const DEFAULT_BG = getBackgroundById(DEFAULT_BACKGROUND_ID).url;

export function usePageBackground() {
  return;
}
