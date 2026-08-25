import { isObject } from '@metamask/utils';
import type { Migrate } from './types';

export const version = 207;

/**
 * Removes persisted DeFi referral decisions from PreferencesController state.
 *
 * @param versionedData - Versioned extension state persisted to disk.
 * @param changedKeys - Controller keys changed by this migration.
 */
export const migrate = (async (versionedData, changedKeys) => {
  versionedData.meta.version = version;

  const preferencesController = versionedData.data.PreferencesController;
  if (!isObject(preferencesController)) {
    return;
  }

  if ('referrals' in preferencesController) {
    delete preferencesController.referrals;
    changedKeys.add('PreferencesController');
  }
}) satisfies Migrate;
