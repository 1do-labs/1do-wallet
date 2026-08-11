import { AccountsControllerState } from '@metamask/accounts-controller';
import { NetworkConfiguration } from '@metamask/network-controller';
import { hasProperty, isObject } from '@metamask/utils';
import { cloneDeep } from 'lodash';

type VersionedData = {
  meta: { version: number };
  data: Record<string, unknown>;
};

export const version = 134.1;

/**
 * This migration attempts to reset `TokensController.tokens` to the list of tokens
 * found in `TokensController.allTokens[currentChainId][selectedAccount]`. The
 * `currentChainId` is determined by matching the `selectedNetworkClientId` to a
 * chain's RPC endpoints in `networkConfigurationsByChainId`.
 *
 * If any step fails (missing or invalid state), the migration is skipped, and
 *
 * @param originalVersionedData - Versioned MetaMask extension state, exactly
 * what we persist to disk.
 * @returns Updated versioned MetaMask extension state.
 */
export async function migrate(
  originalVersionedData: VersionedData,
): Promise<VersionedData> {
  const versionedData = cloneDeep(originalVersionedData);
  versionedData.meta.version = version;

  versionedData.data = transformState(versionedData.data);

  return versionedData;
}

function transformState(
  state: Record<string, unknown>,
): Record<string, unknown> {
  if (!hasProperty(state, 'AccountsController')) {
    return state;
  }

  const accountsControllerState =
    state.AccountsController as unknown as AccountsControllerState;
  if (!isObject(accountsControllerState)) {
    return state;
  }

  if (
    !hasProperty(accountsControllerState, 'internalAccounts') ||
    !isObject(accountsControllerState.internalAccounts)
  ) {
    return state;
  }

  const { internalAccounts } = accountsControllerState;
  if (
    !hasProperty(internalAccounts, 'selectedAccount') ||
    typeof internalAccounts.selectedAccount !== 'string' ||
    internalAccounts.selectedAccount === ''
  ) {
    return state;
  }

  // NEW: Extract the selected account's address from internalAccounts.accounts
  if (
    !hasProperty(internalAccounts, 'accounts') ||
    !isObject(internalAccounts.accounts)
  ) {
    return state;
  }
  const { accounts } = internalAccounts;
  const selectedAccountKey = internalAccounts.selectedAccount;
  if (
    !hasProperty(accounts, selectedAccountKey) ||
    !isObject(accounts[selectedAccountKey])
  ) {
    return state;
  }
  const selectedAccountEntry = accounts[selectedAccountKey];
  if (
    !hasProperty(selectedAccountEntry, 'address') ||
    typeof selectedAccountEntry.address !== 'string' ||
    selectedAccountEntry.address === ''
  ) {
    return state;
  }
  const selectedAccountAddress = selectedAccountEntry.address;

  if (!hasProperty(state, 'NetworkController')) {
    return state;
  }

  const networkControllerState = state.NetworkController;
  if (!isObject(networkControllerState)) {
    return state;
  }

  if (
    !hasProperty(networkControllerState, 'selectedNetworkClientId') ||
    typeof networkControllerState.selectedNetworkClientId !== 'string' ||
    !networkControllerState.selectedNetworkClientId
  ) {
    return state;
  }

  const { selectedNetworkClientId } = networkControllerState;

  if (
    !hasProperty(networkControllerState, 'networkConfigurationsByChainId') ||
    !isObject(networkControllerState.networkConfigurationsByChainId)
  ) {
    return state;
  }

  const { networkConfigurationsByChainId } = networkControllerState;

  const currentChainId = getChainIdForNetworkClientId(
    networkConfigurationsByChainId as Record<string, NetworkConfiguration>,
    selectedNetworkClientId,
  );

  if (!currentChainId) {
    return state;
  }

  if (!hasProperty(state, 'TokensController')) {
    return state;
  }

  const tokensControllerState = state.TokensController;
  if (!isObject(tokensControllerState)) {
    return state;
  }

  if (
    !hasProperty(tokensControllerState, 'allTokens') ||
    !isObject(tokensControllerState.allTokens)
  ) {
    return state;
  }

  const { tokens } = tokensControllerState;
  const { allTokens } = tokensControllerState;
  const allTokensForChain = allTokens[currentChainId];

  if (
    Array.isArray(tokens) &&
    tokens.length > 0 &&
    !isObject(allTokensForChain)
  ) {
    return state;
  }

  if (!isObject(allTokensForChain)) {
    return state;
  }

  const accountTokens = allTokensForChain[selectedAccountAddress];
  if (!Array.isArray(accountTokens)) {
    return state;
  }

  tokensControllerState.tokens = accountTokens;
  return state;
}

function getChainIdForNetworkClientId(
  networkConfigurationsByChainId: Record<string, NetworkConfiguration>,
  networkClientId: string,
): string | undefined {
  for (const [chainId, networkConfiguration] of Object.entries(
    networkConfigurationsByChainId,
  )) {
    if (Array.isArray(networkConfiguration.rpcEndpoints)) {
      for (const endpoint of networkConfiguration.rpcEndpoints) {
        if (endpoint.networkClientId === networkClientId) {
          return chainId;
        }
      }
    }
  }
  return undefined;
}
