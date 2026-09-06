/**
 * Turns a user-agent string into something a person recognises in their device
 * list.
 *
 * This is a label, never a security decision. User-agent strings are trivially
 * forged and increasingly frozen by browsers, so the result is presentational: it
 * helps someone spot "Chrome on Windows" as not theirs. Nothing in the account
 * system branches on it.
 */

const BROWSERS: ReadonlyArray<[RegExp, string]> = [
  // Order matters: nearly every engine claims to be Safari and most claim Chrome.
  [/\bCineoraApp\b/i, 'Cineora app'],
  [/\bEdg(?:e|A|iOS)?\//, 'Edge'],
  [/\bOPR\/|\bOpera\b/, 'Opera'],
  [/\bSamsungBrowser\//, 'Samsung Internet'],
  [/\bVivaldi\//, 'Vivaldi'],
  [/\bBrave\//, 'Brave'],
  [/\bYaBrowser\//, 'Yandex Browser'],
  [/\bDuckDuckGo\//, 'DuckDuckGo'],
  [/\bFxiOS\/|\bFirefox\//, 'Firefox'],
  [/\bCriOS\//, 'Chrome'],
  [/\bChrome\//, 'Chrome'],
  [/\bSafari\//, 'Safari'],
];

const PLATFORMS: ReadonlyArray<[RegExp, string]> = [
  [/\biPhone\b/, 'iPhone'],
  [/\biPad\b/, 'iPad'],
  [/\bAndroid\b/, 'Android'],
  [/\bWindows NT\b/, 'Windows'],
  [/\bMac OS X\b|\bMacintosh\b/, 'macOS'],
  [/\bCrOS\b/, 'ChromeOS'],
  [/\bLinux\b/, 'Linux'],
];

function match(value: string, table: ReadonlyArray<[RegExp, string]>): string | null {
  for (const [pattern, name] of table) {
    if (pattern.test(value)) return name;
  }
  return null;
}

export function describeDevice(userAgent: string): string {
  const ua = userAgent.slice(0, 300);
  const browser = match(ua, BROWSERS);
  const platform = match(ua, PLATFORMS);

  if (browser === 'Cineora app') {
    return platform ? `Cineora app on ${platform}` : 'Cineora app';
  }
  // An in-app browser is worth naming: someone who only ever signs in from
  // Chrome should notice a session created inside a social app's viewer.
  const embedded = /\bwv\b|; wv\)|\bFBAN\b|\bFBAV\b|\bInstagram\b|\bLine\/|\bMicroMessenger\b/.test(ua)
    ? ' (in-app browser)'
    : '';

  if (browser && platform) return `${browser} on ${platform}${embedded}`;
  if (browser) return `${browser}${embedded}`;
  if (platform) return `${platform} device${embedded}`;
  return 'Unknown device';
}

/** True for a viewport that should be treated as a handset by server-rendered mail. */
export function isMobileAgent(userAgent: string): boolean {
  return /\bAndroid\b|\biPhone\b|\biPad\b|\bMobile\b/.test(userAgent);
}
