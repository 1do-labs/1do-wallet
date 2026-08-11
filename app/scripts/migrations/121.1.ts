import { hasProperty } from '@metamask/utils';
import { cloneDeep, isObject } from 'lodash';
import log from 'loglevel';

type VersionedData = {
  meta: { version: number };
  data: Record<string, unknown>;
};

export const version = 121.1;

/**
 * Fix AccountsController state corruption, where the `selectedAccount` state is set to an invalid
 * ID.
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

function transformState(state: Record<string, unknown>): void {
  if (!hasProperty(state, 'AccountsController')) {
    return;
  }

  const accountsControllerState = state.AccountsController;

  if (!isObject(accountsControllerState)) {
    return;
  } else if (!hasProperty(accountsControllerState, 'internalAccounts')) {
    return;
  } else if (!isObject(accountsControllerState.internalAccounts)) {
    return;
  } else if (
    !hasProperty(accountsControllerState.internalAccounts, 'selectedAccount')
  ) {
    return;
  } else if (
    typeof accountsControllerState.internalAccounts.selectedAccount !== 'string'
  ) {
    return;
  } else if (
    !hasProperty(accountsControllerState.internalAccounts, 'accounts')
  ) {
    return;
  } else if (!isObject(accountsControllerState.internalAccounts.accounts)) {
    return;
  }

  if (
    Object.keys(accountsControllerState.internalAccounts.accounts).length === 0
  ) {
    log.warn(`Migration ${version}: Skipping, no accounts found`);
    return;
  } else if (accountsControllerState.internalAccounts.selectedAccount === '') {
    log.warn(`Migration ${version}: Skipping, no selected account set`);
    return;
  }

  const firstAccount = Object.values(
    accountsControllerState.internalAccounts.accounts,
  )[0];
  if (!isObject(firstAccount)) {
    return;
  } else if (!hasProperty(firstAccount, 'id')) {
    return;
  } else if (typeof firstAccount.id !== 'string') {
    return;
  }

  if (
    !hasProperty(
      accountsControllerState.internalAccounts.accounts,
      accountsControllerState.internalAccounts.selectedAccount,
    )
  ) {
    accountsControllerState.internalAccounts.selectedAccount = firstAccount.id;
  }
}
