import type {
  MultichainAssetsControllerState,
  MultichainAssetsRatesControllerState,
  MultichainBalancesControllerState,
} from '@metamask/assets-controllers';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { NetworkConfiguration } from '@metamask/network-controller';
import { CaipChainId, Hex } from '@metamask/utils';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';
import { Numeric } from '../../shared/lib/Numeric';
import { getMultiChainBalancesControllerBalances } from '../../shared/lib/selectors/assets-migration';
import {
  getConversionRate,
  getCurrentCurrency,
  getNativeCurrency,
} from '../ducks/metamask/metamask';
import {
  CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP,
  CHAIN_IDS,
  TEST_NETWORK_IDS,
} from '../../shared/constants/network';
import {
  getNetworkConfigurationsByChainId,
  getProviderConfig,
  NetworkState,
} from '../../shared/lib/selectors/networks';
import { createDeepEqualSelector } from '../../shared/lib/selectors/selector-creators';
import { AccountsState } from './accounts';
import {
  getIsMainnet,
  getNativeCurrencyImage,
  getSelectedAccountCachedBalance,
  getShouldShowFiat,
} from './selectors';
import {
  type MultichainNetworkConfigState,
  getMultichainNetwork,
  getMultichainIsEvm,
} from './multichain/networks';

// TODO: Update all references to use networks.ts
export { getMultichainNetwork, getMultichainIsEvm };

export type AssetsState = {
  metamask: MultichainAssetsControllerState;
};

export type AssetsRatesState = {
  metamask: MultichainAssetsRatesControllerState;
};

type BalancesState = {
  metamask: MultichainBalancesControllerState;
};

export type MultichainState = AccountsState &
  BalancesState &
  NetworkState &
  AssetsRatesState &
  AssetsState &
  MultichainNetworkConfigState;

export const MultichainNetworkPropType = PropTypes.shape({
  nickname: PropTypes.string.isRequired,
  isEvmNetwork: PropTypes.bool.isRequired,
  chainId: PropTypes.string,
  network: PropTypes.oneOfType([
    PropTypes.shape({
      rpcUrl: PropTypes.string,
      type: PropTypes.string.isRequired,
      chainId: PropTypes.string.isRequired,
      ticker: PropTypes.string.isRequired,
      rpcPrefs: PropTypes.shape({
        blockExplorerUrl: PropTypes.string,
        imageUrl: PropTypes.string,
      }),
      nickname: PropTypes.string,
      id: PropTypes.string,
    }),
    PropTypes.shape({
      chainId: PropTypes.string.isRequired,
      ticker: PropTypes.string.isRequired,
      rpcPrefs: PropTypes.shape({
        blockExplorerUrl: PropTypes.string,
        imageUrl: PropTypes.string,
      }),
    }),
  ]).isRequired,
});

export const InternalAccountPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  address: PropTypes.string.isRequired,
  metadata: PropTypes.shape({
    name: PropTypes.string.isRequired,
    keyring: PropTypes.shape({
      type: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  type: PropTypes.string.isRequired,
});

/**
 * Retrieves the provider configuration for a multichain network.
 *
 * This function extracts the `network` field from the result of `getMultichainNetwork(state)`,
 * which is expected to be a `MultichainProviderConfig` object. The naming might suggest that
 * it returns a network, but it actually returns a provider configuration specific to a multichain setup.
 *
 * @param state - The redux state.
 * @param account - The multichain account.
 * @returns The current multichain provider configuration.
 */
export function getMultichainProviderConfig(
  state: MultichainState,
  account?: InternalAccount,
) {
  return getMultichainNetwork(state, account).network;
}

export function getMultichainCurrentNetwork(
  state: MultichainState,
  account?: InternalAccount,
) {
  return getMultichainProviderConfig(state, account);
}

export function getMultichainNativeCurrency(
  state: MultichainState,
  _account?: InternalAccount,
) {
  return getNativeCurrency(state);
}

export { getCurrentCurrency as getMultichainCurrentCurrency };

export function getMultichainCurrencyImage(
  state: MultichainState,
  _account?: InternalAccount,
) {
  return getNativeCurrencyImage(state);
}
export const makeGetMultichainShouldShowFiatByChainId =
  (chainId: Hex | CaipChainId) =>
  (state: MultichainState, account?: InternalAccount) =>
    getMultichainShouldShowFiat(state, account, chainId);

export function getMultichainShouldShowFiat(
  state: MultichainState,
  _account?: InternalAccount,
  chainId?: Hex | CaipChainId,
) {
  return getShouldShowFiat(state, chainId);
}

export function getMultichainDefaultToken(
  state: MultichainState,
  _account?: InternalAccount,
) {
  const symbol =
    // We fallback to 'ETH' to keep the original native token behavior.
    getProviderConfig(state)?.ticker ?? 'ETH';

  return { symbol };
}

export function getMultichainCurrentChainId(state: MultichainState) {
  const { chainId } = getMultichainProviderConfig(state);
  return chainId;
}

export function isChainIdMainnet(chainId: string) {
  return chainId === CHAIN_IDS.MAINNET;
}

export function getMultichainIsMainnet(
  state: MultichainState,
  _account?: InternalAccount,
) {
  return getIsMainnet(state);
}
export function getMultichainIsTestnet(
  state: MultichainState,
  _account?: InternalAccount,
) {
  const providerConfig = getMultichainProviderConfig(state);
  return (TEST_NETWORK_IDS as string[]).includes(providerConfig.chainId);
}

export const getMultichainBalances = getMultiChainBalancesControllerBalances;

export function getImageForChainId(chainId: string): string | undefined {
  return CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP[chainId];
}

// This selector is not compatible with `useMultichainSelector` since it uses the selected
// account implicitly!
export function getMultichainSelectedAccountCachedBalance(
  state: MultichainState,
) {
  return getSelectedAccountCachedBalance(state);
}

export const getMultichainSelectedAccountCachedBalanceIsZero = createSelector(
  [getMultichainSelectedAccountCachedBalance],
  (balance) => {
    const base = 16;
    const numericBalance = new Numeric(balance, base);
    return numericBalance.isZero();
  },
);

export function getMultichainConversionRate(
  state: MultichainState,
  _account?: InternalAccount,
) {
  const conversionRate = getConversionRate(state);

  const parsedConversionRate =
    conversionRate === null || conversionRate === undefined
      ? undefined
      : Number(conversionRate);

  return parsedConversionRate;
}

// TODO get this from the multichain network controller
export const getMultichainNetworkConfigurationsByChainId = (
  state: MultichainState,
): Record<Hex | CaipChainId, NetworkConfiguration> => {
  return getNetworkConfigurationsByChainId(state);
};

export const getMemoizedMultichainNetworkConfigurationsByChainId =
  createDeepEqualSelector(
    [getMultichainNetworkConfigurationsByChainId],
    (networkConfigurations) => networkConfigurations,
  );
