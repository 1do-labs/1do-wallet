import { ENVIRONMENT_TYPE_BACKGROUND } from '../../../shared/constants/app';
import { getEnvironmentType } from '../../../shared/lib/environment-type';
import { getManifestFlags } from '../../../shared/lib/manifestFlags';
import { FixtureExtensionStore } from '../../../shared/lib/stores/fixture-extension-store';
import ExtensionStore from '../../../shared/lib/stores/extension-store';
import { PersistenceManager } from '../../../shared/lib/stores/persistence-manager';

function createLocalStore() {
  const useFixtureStore =
    process.env.IN_TEST &&
    getManifestFlags().testing?.forceExtensionStore !== true;
  if (!useFixtureStore) {
    return new ExtensionStore();
  }
  // Use globalThis.self (not window) so this works in both the UI and the background/service worker, where window is undefined.
  const locationHref = globalThis.self?.location?.href;
  if (!locationHref) {
    throw new Error(
      'setup-initial-state-hooks: globalThis.self?.location?.href is not defined; expected to run in a document or service worker context.',
    );
  }
  const isBackground =
    getEnvironmentType(locationHref) === ENVIRONMENT_TYPE_BACKGROUND;
  return new FixtureExtensionStore({ initialize: isBackground });
}

const localStore = createLocalStore();

// Single PersistenceManager per context: one in background, one per UI context.
export const persistenceManager = new PersistenceManager({ localStore });

/**
 * Get the persisted wallet state.
 *
 * @returns The persisted wallet state.
 */
globalThis.stateHooks.getPersistedState = async function () {
  return await persistenceManager.get({ validateVault: false });
};

/**
 * Get the backup state from IndexedDB.
 * This is used as a fallback when primary storage is unavailable.
 *
 * @returns The backup state, or null if unavailable.
 */
globalThis.stateHooks.getBackupState = async function () {
  return await persistenceManager.getBackup();
};
