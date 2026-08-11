import { cloneDeep } from 'lodash';
import { hasProperty, isObject } from '@metamask/utils';

type VersionedData = {
  meta: { version: number };
  data: Record<string, unknown>;
};

export const version = 114;

export async function migrate(
  originalVersionedData: VersionedData,
): Promise<VersionedData> {
  const versionedData = cloneDeep(originalVersionedData);
  versionedData.meta.version = version;
  transformState(versionedData.data);
  return versionedData;
}

// TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31973
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformState(state: Record<string, any>) {
  if (!hasProperty(state, 'PreferencesController')) {
    return state;
  }

  if (!isObject(state.PreferencesController)) {
    state.PreferencesController = {};
  } else if (
    hasProperty(state.PreferencesController, 'transactionSecurityCheckEnabled')
  ) {
    delete state.PreferencesController.transactionSecurityCheckEnabled;
  }

  return state;
}
