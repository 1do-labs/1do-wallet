export const COOKIE_ID_MARKETING_WHITELIST = [
  'https://1do.io',
  'https://www.1do.io',
];

if (process.env.IN_TEST) {
  COOKIE_ID_MARKETING_WHITELIST.push('http://127.0.0.1:8080');
}

// Extract the origin of each URL in the whitelist
export const COOKIE_ID_MARKETING_WHITELIST_ORIGINS =
  COOKIE_ID_MARKETING_WHITELIST.map((url) => new URL(url).origin);
