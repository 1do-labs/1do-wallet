import { hasProperty, isObject } from '@metamask/utils';
import { cloneDeep } from 'lodash';

type VersionedData = {
  meta: { version: number };
  data: Record<string, unknown>;
};

export const version = 148;

/**
 * This migration deletes properties from state which have been removed in
 * previous commits.
 *
 * @param originalVersionedData - Versioned MetaMask extension state, exactly
 * what we persist to dist.
 * @param originalVersionedData.meta - State metadata.
 * @param originalVersionedData.meta.version - The current state version.
 * @param originalVersionedData.data - The persisted MetaMask state, keyed by
 * controller.
 * @returns Updated versioned MetaMask extension state.
 */
export async function migrate(
  originalVersionedData: VersionedData,
): Promise<VersionedData> {
  const versionedData = cloneDeep(originalVersionedData);
  versionedData.meta.version = version;
  transformState(versionedData.data);
  return versionedData;
}

function transformState(state: Record<string, unknown>) {
  if (
    hasProperty(state, 'AppStateController') &&
    isObject(state.AppStateController)
  ) {
    delete state.AppStateController.enableEIP1559V2NoticeDismissed;
  }

  if (hasProperty(state, 'NftController') && isObject(state.NftController)) {
    delete state.NftController.collectibles;
    delete state.NftController.collectibleContracts;
  }

  if (
    hasProperty(state, 'PreferencesController') &&
    isObject(state.PreferencesController) &&
    hasProperty(state.PreferencesController, 'preferences') &&
    isObject(state.PreferencesController.preferences)
  ) {
    // Removed in https://github.com/MetaMask/metamask-extension/pull/23460
    delete state.PreferencesController.preferences
      .transactionSecurityCheckEnabled;
    // Removed in https://github.com/MetaMask/metamask-extension/pull/29301
    delete state.PreferencesController.preferences.useRequestQueue;
  }

  return state;
}
