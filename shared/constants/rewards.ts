export const REWARDS_API_URL = {
  UAT: 'http://127.0.0.1:9',
  PRD: 'http://127.0.0.1:9',
};

// Error message constants for rewards errors
export const REWARDS_ERROR_MESSAGES = {
  AUTHORIZATION_FAILED:
    'Rewards authorization failed. Please login and try again.',
  SEASON_NOT_FOUND:
    'Season not found. Please try again with a different season.',
} as const;
