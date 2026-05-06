// TODO: remove dead code in this file and related files now that code fences are gone

import { createSelector } from 'reselect';
import { getRemoteFeatureFlags } from '../remote-feature-flags';

/**
 * Get the state of the `bitcoinAccounts` feature flag with version check.
 *
 * @param _state - The MetaMask state object
 * @returns The state of the `bitcoinAccounts` feature flag.
 */
export const getIsBitcoinSupportEnabled = createSelector(
  getRemoteFeatureFlags,
  () => false,
);

/**
 * Get the state of the `solanaAccounts` feature flag with version check.
 *
 * @param _state - The MetaMask state object
 * @returns The state of the `solanaAccounts` feature flag.
 */
export const getIsSolanaSupportEnabled = createSelector(
  getRemoteFeatureFlags,
  () => false,
);

/**
 * Get the state of the `tronSupportEnabled` remote feature flag.
 *
 * @param _state - The MetaMask state object
 * @returns The state of the `tronSupportEnabled` remote feature flag.
 */
export const getIsTronSupportEnabled = createSelector(
  getRemoteFeatureFlags,
  () => false,
);

/**
 * Get the state of the `solanaTestnetsEnabled` remote feature flag.
 *
 * @param _state - The MetaMask state object
 * @returns The state of the `solanaTestnetsEnabled` remote feature flag.
 */
export const getIsSolanaTestnetSupportEnabled = createSelector(
  getRemoteFeatureFlags,
  () => false,
);

/**
 * Get the state of the `bitcoinTestnetsEnabled` remote feature flag.
 *
 * @param _state - The MetaMask state object
 * @returns The state of the `bitcoinTestnetsEnabled` remote feature flag.
 */
export const getIsBitcoinTestnetSupportEnabled = createSelector(
  getRemoteFeatureFlags,
  () => false,
);

/**
 * Get the state of the `tronTestnetsEnabled` remote feature flag.
 *
 * @param _state - The MetaMask state object
 * @returns The state of the `tronTestnetsEnabled` remote feature flag.
 */
export const getIsTronTestnetSupportEnabled = createSelector(
  getRemoteFeatureFlags,
  () => false,
);

export const getIsTransactionLabelsEnabled = createSelector(
  getRemoteFeatureFlags,
  ({ extensionTransactionLabels }) => Boolean(extensionTransactionLabels),
);
