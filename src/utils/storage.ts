import { AppSettings } from '../types';

const STORAGE_KEY = 'mobile_photobooth_settings_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  brandName: 'SNAPMOMENT',
  eventName: 'Special Celebration',
  eventSubtitle: 'Capture Your Best Smile • Photobooth Experience',
  brandLogoUrl: '',
  adminPassword: 'admin123',
  gasWebAppUrl: '',
  driveFolderId: '',
  autoUploadEnabled: true,
  mirrorDefault: true,
  countdownSeconds: 5, // Default changed to 5 seconds as requested
  frame1: {
    id: 'frame1',
    name: 'Classic Ivory Luxe',
    description: 'Frame elegan bernuansa minimalis mewah dengan aksen border ganda dan kartu tanda tangan.',
    theme: 'classic',
    accentColor: '#f5efe6',
    badgeText: 'FRAME 01 • MINIMAL',
  },
  frame2: {
    id: 'frame2',
    name: 'Cyber Party Glow',
    description: 'Frame modern bernuansa pesta dengan aksen neon gradasi violet & pink aesthetic.',
    theme: 'neon',
    accentColor: '#f43f5e',
    badgeText: 'FRAME 02 • PARTY',
  },
};

/**
 * Encodes app settings into a compact URL-safe base64 string so it can be shared via a single link.
 */
export function encodeConfigToQuery(settings: AppSettings): string {
  try {
    const compact = {
      b: settings.brandName,
      e: settings.eventName,
      s: settings.eventSubtitle,
      g: settings.gasWebAppUrl,
      d: settings.driveFolderId,
      f1Id: settings.frame1.driveFileId || '',
      f1N: settings.frame1.name,
      f2Id: settings.frame2.driveFileId || '',
      f2N: settings.frame2.name,
      l: settings.brandLogoUrl && !settings.brandLogoUrl.startsWith('data:') ? settings.brandLogoUrl : '',
    };
    const json = JSON.stringify(compact);
    // Safe base64 encoding for unicode
    const b64 = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
    return b64;
  } catch (err) {
    console.error('Failed to encode config:', err);
    return '';
  }
}

/**
 * Decodes config from base64 URL query parameter.
 */
export function decodeConfigFromQuery(b64: string): Partial<AppSettings> | null {
  try {
    const json = decodeURIComponent(Array.prototype.map.call(atob(b64), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    const parsed = JSON.parse(json);
    return {
      brandName: parsed.b,
      eventName: parsed.e,
      eventSubtitle: parsed.s,
      gasWebAppUrl: parsed.g,
      driveFolderId: parsed.d,
      brandLogoUrl: parsed.l || '',
      frame1: {
        ...DEFAULT_SETTINGS.frame1,
        name: parsed.f1N || DEFAULT_SETTINGS.frame1.name,
        driveFileId: parsed.f1Id || '',
      },
      frame2: {
        ...DEFAULT_SETTINGS.frame2,
        name: parsed.f2N || DEFAULT_SETTINGS.frame2.name,
        driveFileId: parsed.f2Id || '',
      },
    };
  } catch (err) {
    console.error('Failed to decode config from URL:', err);
    return null;
  }
}

/**
 * Generates the full shareable URL that can be sent to any phone.
 */
export function getShareableAppUrl(settings: AppSettings): string {
  const currentBase = window.location.origin + window.location.pathname;
  const cfg = encodeConfigToQuery(settings);
  if (!cfg) return currentBase;
  return `${currentBase}?cfg=${encodeURIComponent(cfg)}`;
}

export function loadSettings(): AppSettings {
  // 1. Check if URL contains shared config (?cfg=...)
  if (typeof window !== 'undefined' && window.location.search) {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const cfgParam = urlParams.get('cfg');
      if (cfgParam) {
        const decoded = decodeConfigFromQuery(cfgParam);
        if (decoded) {
          const merged: AppSettings = {
            ...DEFAULT_SETTINGS,
            ...decoded,
            frame1: { ...DEFAULT_SETTINGS.frame1, ...(decoded.frame1 || {}) },
            frame2: { ...DEFAULT_SETTINGS.frame2, ...(decoded.frame2 || {}) },
          };
          saveSettings(merged);
          // Clean the query string without reloading page
          window.history.replaceState({}, document.title, window.location.pathname);
          return merged;
        }
      }
    } catch (urlErr) {
      console.warn('Could not parse URL config:', urlErr);
    }
  }

  // 2. Fallback to localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      frame1: { ...DEFAULT_SETTINGS.frame1, ...parsed.frame1 },
      frame2: { ...DEFAULT_SETTINGS.frame2, ...parsed.frame2 },
      countdownSeconds: parsed.countdownSeconds ?? 5,
    };
  } catch (err) {
    console.error('Failed to load settings from localStorage:', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch (err) {
    console.error('Failed to save settings to localStorage:', err);
    return false;
  }
}

export function resetSettings(): AppSettings {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear settings:', err);
  }
  return DEFAULT_SETTINGS;
}
