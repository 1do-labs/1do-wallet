/* eslint-disable @typescript-eslint/naming-convention */
import browser from 'webextension-polyfill';
import { AccountsControllerState } from '@metamask/accounts-controller';
import { NetworkState } from '@metamask/network-controller';
import { getIsSettingsPageDevOptionsEnabled } from '../../../shared/lib/environment';

type State = {
  AccountsController?: AccountsControllerState;
  NetworkController?: NetworkState;
};

async function developerOverrides() {
  const {
    splitStateMigrationEnabled,
    splitStateMigrationMaxAccounts,
    splitStateMigrationMaxNetworks,
  } = await browser.storage.local.get([
    'splitStateMigrationEnabled',
    'splitStateMigrationMaxAccounts',
    'splitStateMigrationMaxNetworks',
  ]);

  return {
    enabled:
      splitStateMigrationEnabled === undefined
        ? null
        : splitStateMigrationEnabled === '1',
    maxAccounts:
      splitStateMigrationMaxAccounts === undefined
        ? 0
        : Number(splitStateMigrationMaxAccounts),
    maxNetworks:
      splitStateMigrationMaxNetworks === undefined
        ? 0
        : Number(splitStateMigrationMaxNetworks),
  };
}

/**
 * Get current account and network counts from controller state
 *
 * @param state - The current state
 * @returns The account and network counts
 */
function getCounts(state: State) {
  const accountsState = state.AccountsController;
  const accountCount = Object.keys(
    accountsState?.internalAccounts?.accounts ?? {},
  ).length;

  const networkState = state.NetworkController;
  const networkCount = Object.keys(
    networkState?.networkConfigurationsByChainId ?? {},
  ).length;

  return {
    accountCount,
    networkCount,
  };
}

export async function useSplitStateStorage(state: State): Promise<boolean> {
  if (getIsSettingsPageDevOptionsEnabled() || process.env.IN_TEST) {
    const overrides = await developerOverrides();
    if (overrides.enabled !== null) {
      if (overrides.enabled === false) {
        return false;
      }

      const { accountCount, networkCount } = getCounts(state);

      return (
        accountCount <= overrides.maxAccounts &&
        networkCount <= overrides.maxNetworks
      );
    }
  }

  return false;
}
