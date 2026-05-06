/** Max items shown in the Perps tab Recent Activity preview (matches Activity page slice). */
export const PERPS_RECENT_ACTIVITY_MAX_TRANSACTIONS = 5;

export const VALID_MARKET_FILTERS = [
  'all',
  'crypto',
  'stocks',
  'commodities',
  'forex',
  'new',
] as const;

export type MarketFilter = (typeof VALID_MARKET_FILTERS)[number];

/**
 * Contact support (Help Center). Single source of truth aligned with mobile perpsConfig.
 */
export const SUPPORT_CONFIG = {
  Url: 'https://www.1do.io/',
} as const;

/**
 * Perps feedback survey (third-party). Single source of truth aligned with mobile perpsConfig.
 */
export const FEEDBACK_CONFIG = {
  Url: 'https://www.1do.io/',
} as const;
