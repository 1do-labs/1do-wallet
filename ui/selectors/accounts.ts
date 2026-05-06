import { AccountsControllerState } from '@metamask/accounts-controller';
import {
  EthAccountType,
  CaipChainId,
  EthScope,
  isEvmAccountType,
} from '@metamask/keyring-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { KnownCaipNamespace, parseCaipChainId } from '@metamask/utils';
import { createSelector } from 'reselect';

import { EMPTY_OBJECT } from './shared';

export type AccountsState = {
  metamask: AccountsControllerState;
};

export const getInternalAccountsObject = (state: AccountsState) =>
  state.metamask.internalAccounts.accounts;

export const getInternalAccounts = createSelector(
  getInternalAccountsObject,
  (accounts) => Object.values(accounts),
);

// Uses EMPTY_OBJECT to preserve referential equality when accountIdByAddress
// is undefined, so downstream createSelector consumers don't recompute.
export const getAccountIdByAddress = (state: AccountsState) =>
  state.metamask.accountIdByAddress ?? EMPTY_OBJECT;

export const getInternalAccountByAddress = createSelector(
  [
    getInternalAccountsObject,
    getAccountIdByAddress,
    (_, address: string) => address,
  ],
  (accounts, accountIdByAddress, address) => {
    const accountId =
      accountIdByAddress[address] ?? accountIdByAddress[address?.toLowerCase()];
    return accountId ? accounts[accountId] : undefined;
  },
);

export function getSelectedInternalAccount(state: AccountsState) {
  const accountId = state.metamask.internalAccounts.selectedAccount;
  return state.metamask.internalAccounts.accounts[accountId];
}

/**
 * Same as `getSelectedInternalAccount`, but might potentially be `undefined`:
 * - This might happen during the onboarding
 *
 * @param state - The accounts state
 * @returns The selected internal account or undefined
 */
export function getMaybeSelectedInternalAccount(state: AccountsState) {
  const accountId = state.metamask.internalAccounts?.selectedAccount;
  return accountId
    ? state.metamask.internalAccounts?.accounts[accountId]
    : undefined;
}

export const isSelectedInternalAccountEth = createSelector(
  getSelectedInternalAccount,
  (account) => {
    const { Eoa, Erc4337 } = EthAccountType;
    return Boolean(
      account && (account.type === Eoa || account.type === Erc4337),
    );
  },
);

export const selectEvmAddress = createSelector(
  getSelectedInternalAccount,
  (account) =>
    account && isEvmAccountType(account.type) ? account.address : undefined,
);

/**
 * Returns all internal accounts that declare support for the provided CAIP scope.
 * The scope should be a CAIP-2 scope string (e.g., 'eip155:0', 'bip122:...').
 *
 * @param _state - Redux state (unused; required for selector signature)
 * @param scope - The CAIP scope string to filter accounts by
 */
export const getInternalAccountsByScope = createSelector(
  [getInternalAccounts, (_state: AccountsState, scope: CaipChainId) => scope],
  (accounts, scope): InternalAccount[] => {
    if (!Array.isArray(accounts) || accounts.length === 0) {
      return [];
    }

    let namespace: string;
    let reference: string;
    try {
      const parsed = parseCaipChainId(scope);
      namespace = parsed.namespace;
      reference = parsed.reference;
    } catch {
      return [];
    }

    if (namespace === KnownCaipNamespace.Eip155) {
      // If requesting eip155:0 (wildcard), include any account that has any EVM scope
      if (reference === '0') {
        return accounts.filter(
          (account) =>
            Array.isArray(account.scopes) &&
            account.scopes.some((s) =>
              s.startsWith(`${KnownCaipNamespace.Eip155}:`),
            ),
        );
      }

      // For a specific EVM chain, include accounts that either have the exact scope or the wildcard
      return accounts.filter(
        (account) =>
          Array.isArray(account.scopes) &&
          (account.scopes.includes(scope) ||
            account.scopes.includes(EthScope.Eoa)),
      );
    }

    // Non-EVM: exact scope match only
    return accounts.filter(
      (account) =>
        Array.isArray(account.scopes) && account.scopes.includes(scope),
    );
  },
);
