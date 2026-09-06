import { asRecord, createStore } from '@/lib/storage/store';

/**
 * The account's display choices, mirrored on the device.
 *
 * Appearance and the accessibility switches are applied as attributes on `<html>`
 * and read from there by CSS. The session itself is an HttpOnly cookie resolved
 * after mount, which would mean a signed-in reader watches the page load in the
 * default look and then rearrange itself — a true-black theme flashing charcoal,
 * or a whole layout reflowing once larger text arrives.
 *
 * So the last known set is kept in local storage and applied by a small script
 * before the first paint. Nothing here is private: it is a description of what the
 * page looks like, and the server remains the only source of truth — the mirror is
 * refreshed on every load and cleared on sign-out.
 */

/**
 * Structurally the account's `appearance` plus its four accessibility switches,
 * declared here rather than imported so the storage layer keeps its own model of
 * what it writes — a value coming back out of local storage is untrusted and has to
 * be validated field by field regardless of where its shape was declared.
 */
export interface DisplayFlags {
  appearance: 'dark' | 'midnight';
  reduceMotion: boolean;
  reduceTransparency: boolean;
  largerText: boolean;
  highContrast: boolean;
}

/** What a visitor without an account sees, and what signing out returns to. */
export const DEFAULT_DISPLAY_FLAGS: DisplayFlags = {
  appearance: 'dark',
  reduceMotion: false,
  reduceTransparency: false,
  largerText: false,
  highContrast: false,
};

const APPEARANCE_ATTRIBUTE = 'data-appearance';

/** The four booleans and the attribute each one sets. Also the boot script's map. */
const FLAG_ATTRIBUTES = {
  reduceMotion: 'data-reduce-motion',
  reduceTransparency: 'data-reduce-transparency',
  largerText: 'data-larger-text',
  highContrast: 'data-high-contrast',
} as const;

type BooleanFlag = keyof typeof FLAG_ATTRIBUTES;

const displayFlagsStore = createStore<DisplayFlags>({
  name: 'display',
  version: 1,
  fallback: DEFAULT_DISPLAY_FLAGS,
  parse: (value) => {
    const record = asRecord(value);
    if (!record) return null;
    // Read field by field: a stored object from an older build must degrade to
    // defaults rather than put an unknown value into an attribute selector.
    return {
      appearance: record.appearance === 'midnight' ? 'midnight' : 'dark',
      reduceMotion: record.reduceMotion === true,
      reduceTransparency: record.reduceTransparency === true,
      largerText: record.largerText === true,
      highContrast: record.highContrast === true,
    };
  },
});

function applyDisplayFlags(flags: DisplayFlags): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  // Appearance is always present, so a stylesheet can key off either value; the
  // booleans are present only when on, which keeps the attribute selectors simple.
  root.setAttribute(APPEARANCE_ATTRIBUTE, flags.appearance);
  for (const [flag, attribute] of Object.entries(FLAG_ATTRIBUTES) as Array<[BooleanFlag, string]>) {
    if (flags[flag]) {
      root.setAttribute(attribute, 'true');
    } else {
      root.removeAttribute(attribute);
    }
  }
}

/**
 * Applies a resolved set and keeps it for the next cold start.
 *
 * `null` means no account, which restores the default look and drops the mirror —
 * otherwise the next visitor to this device would inherit someone else's theme.
 */
export function syncDisplayFlags(flags: DisplayFlags | null): void {
  applyDisplayFlags(flags ?? DEFAULT_DISPLAY_FLAGS);
  if (flags) {
    displayFlagsStore.set(flags);
  } else {
    displayFlagsStore.clear();
  }
}

/**
 * The pre-paint script, built from the same key and attribute names used above so
 * the two cannot drift apart.
 *
 * It is deliberately tiny and total: any failure — storage blocked in a locked-down
 * WebView, a half-written value, private mode — leaves the default look, which is
 * the same thing a signed-out visitor gets.
 */
export const DISPLAY_BOOT_SCRIPT = `(function(){try{var r=document.documentElement,m=${JSON.stringify(
  FLAG_ATTRIBUTES,
)},s=window.localStorage.getItem(${JSON.stringify(displayFlagsStore.key)}),d=s?JSON.parse(s).d:null;if(!d||typeof d!=='object')d={};r.setAttribute(${JSON.stringify(
  APPEARANCE_ATTRIBUTE,
)},d.appearance==='midnight'?'midnight':'dark');for(var k in m){if(d[k]===true){r.setAttribute(m[k],'true');}else{r.removeAttribute(m[k]);}}}catch(e){}})();`;
