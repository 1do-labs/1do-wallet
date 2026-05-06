import { createSelector } from 'reselect';
import { isEvmAccountType } from '@metamask/keyring-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { KeyringObject } from '@metamask/keyring-controller';
import {
  getSelectedAccountTokensAcrossChains,
  getCrossChainMetaMaskCachedBalances,
  getMetaMaskHdKeyrings,
  getInternalAccounts,
} from '..';
import { getMultichainAggregatedBalance } from '../assets';
import { isEqualCaseInsensitive } from '../../../shared/lib/string-utils';

type AccountsByChainId = {
  [chainId: string]: {
    [address: string]: string;
  };
};

type TokensByChainId = {
  [chainId: string]: {
    balance: string;
  }[];
};

const isPrimaryHdAccount = createSelector(
  (_state, account) => account,
  getMetaMaskHdKeyrings,
  (account, hdKeyrings: KeyringObject[]) => {
    const [primaryKeyring] = hdKeyrings;

    // There are no keyrings during onboarding.
    if (!primaryKeyring) {
      return false;
    }

    if (
      primaryKeyring.accounts.find((address: string) =>
        isEqualCaseInsensitive(account.address, address),
      )
    ) {
      return true;
    }

    return false;
  },
);

export const getShouldShowSeedPhraseReminder = createSelector(
  (state) => state,
  (_state, account) => account,
  getSelectedAccountTokensAcrossChains,
  getCrossChainMetaMaskCachedBalances,
  (state, account) => getMultichainAggregatedBalance(state, account),
  (state, account) => isPrimaryHdAccount(state, account),
  (
    state,
    account: InternalAccount,
    tokens: TokensByChainId,
    crossChainBalances: AccountsByChainId,
    aggregatedBalance,
    isAccountFromPrimaryHdKeyring,
  ) => {
    const { seedPhraseBackedUp, dismissSeedBackUpReminder } = state.metamask;

    // Imported accounts are treated as already backed up. Only the primary HD
    // SRP account set participates in this reminder flow.
    if (!account || !isAccountFromPrimaryHdKeyring) {
      return false;
    }

    let hasBalance = false;

    if (isEvmAccountType(account.type)) {
      hasBalance =
        Object.values(tokens).some((chains) => {
          return chains.some(
            (chain) => chain.balance && parseInt(chain.balance, 16) > 0,
          );
        }) ||
        Object.values(crossChainBalances).some((chain) => {
          return (
            chain?.[account.address as keyof typeof chain] &&
            parseInt(chain?.[account.address as keyof typeof chain], 16) > 0
          );
        });
    } else {
      hasBalance = aggregatedBalance > 0;
    }

    const showMessage =
      seedPhraseBackedUp === false &&
      hasBalance &&
      dismissSeedBackUpReminder === false;

    return showMessage;
  },
);
