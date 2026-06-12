import { KeyringAccountType } from '@metamask/keyring-api';

// This map is used to display the account type label next to the token / account name
// Add more account type here to support labels in case we need them for other networks
export const ACCOUNT_TYPE_LABELS: Partial<Record<KeyringAccountType, string>> =
  {};

export const ASSET_CELL_HEIGHT = 62;
