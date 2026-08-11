import {
  type MultichainNetworkControllerState as InternalMultichainNetworkState,
  type MultichainNetworkConfiguration as InternalMultichainNetworkConfiguration,
  toEvmCaipChainId,
  toMultichainNetworkConfiguration,
  ActiveNetworksByAddress,
} from '@metamask/multichain-network-controller';
import {
  NetworkStatus,
  type NetworkConfiguration as InternalNetworkConfiguration,
} from '@metamask/network-controller';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { NetworkType } from '@metamask/controller-utils';
import {
  type CaipChainId,
  type Hex,
  KnownCaipNamespace,
} from '@metamask/utils';
import { createSelector } from 'reselect';
import {
  CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP,
  getRpcUrl,
} from '../../../shared/constants/network';
import {
  type ProviderConfigState,
  type SelectedNetworkClientIdState,
  getProviderConfig,
  getNetworkConfigurationsByChainId,
  getCurrentChainId,
  MultichainNetworkConfigurationsByChainIdState,
  selectDefaultNetworkClientIdsByChainId,
  getNetworksMetadata,
} from '../../../shared/lib/selectors/networks';
import { createDeepEqualSelector } from '../../../shared/lib/selectors/selector-creators';
import { getEnabledNetworks } from '../../../shared/lib/selectors/multichain';
import { getIsLegacyInfuraEndpointUrl } from '../../../shared/lib/network-utils';
import { type RemoteFeatureFlagsState } from '../remote-feature-flags';
import { type AccountsState } from '../accounts';

// Selector types

export type MultichainNetworkControllerState = {
  metamask: InternalMultichainNetworkState;
};

function getIsDefaultRpcEndpointUrl(endpointUrl: string): boolean {
  return (
    getIsLegacyInfuraEndpointUrl(
      endpointUrl,
      globalThis.INFURA_PROJECT_ID ?? '',
    ) ||
    endpointUrl === getRpcUrl({ network: 'mainnet' }) ||
    endpointUrl.endsWith('.g.alchemy.com/v2/{alchemyApiKey}') ||
    /^https:\/\/[^/]+\.g\.alchemy\.com\/v2\/[^/?#]+$/u.test(endpointUrl)
  );
}

type NetworksWithTransactionActivityByAccountsState = {
  metamask: {
    networksWithTransactionActivity: ActiveNetworksByAddress;
  };
};

/**
 * This type takes into account the state
 * of the multichain-network-controller and
 * the network-controller.
 */
export type MultichainNetworkConfigState =
  MultichainNetworkConfigurationsByChainIdState &
    SelectedNetworkClientIdState &
    ProviderConfigState &
    NetworksWithTransactionActivityByAccountsState &
    RemoteFeatureFlagsState &
    AccountsState;

// Selectors

/**
 * Returns all EVM networks converted to multichain network configuration format.
 * This selector provides stable references when the underlying data hasn't changed.
 */
export const getEvmMultichainNetworkConfigurations = createSelector(
  getNetworkConfigurationsByChainId,
  (
    networkConfigurationsByChainId,
  ): Record<CaipChainId, InternalMultichainNetworkConfiguration> => {
    // There's a fallback for EVM network names/nicknames, in case the network
    // does not have a name/nickname the fallback is the first rpc endpoint url.
    // TODO: Update toMultichainNetworkConfigurationsByChainId to handle this case.
    const evmNetworks: Record<
      CaipChainId,
      InternalMultichainNetworkConfiguration
    > = {};

    for (const [, network] of Object.entries(networkConfigurationsByChainId)) {
      evmNetworks[toEvmCaipChainId(network.chainId)] = {
        ...toMultichainNetworkConfiguration(network),
        name:
          network.name ||
          network.rpcEndpoints[network.defaultRpcEndpointIndex].url,
      };
    }

    return evmNetworks;
  },
);

/**
 * Returns EVM network configurations by chain ID.
 * 1Do supports EVM networks only; non-EVM network state is intentionally ignored.
 */
export const getAllMultichainNetworkConfigurations = createSelector(
  getEvmMultichainNetworkConfigurations,
  (
    evmNetworks,
  ): Record<CaipChainId, InternalMultichainNetworkConfiguration> => {
    return evmNetworks;
  },
);

/**
 * Returns a tuple of [multichain networks, EVM network configurations].
 * This selector provides stable references when the underlying data hasn't changed.
 *
 * @deprecated Prefer using `getAllMultichainNetworkConfigurations` for multichain networks
 * or `getNetworkConfigurationsByChainId` for EVM-only networks directly.
 */
export const getMultichainNetworkConfigurationsByChainId = createSelector(
  getAllMultichainNetworkConfigurations,
  getNetworkConfigurationsByChainId,
  (
    networks,
    networkConfigurationsByChainId,
  ): [
    Record<CaipChainId, InternalMultichainNetworkConfiguration>,
    Record<Hex, InternalNetworkConfiguration>,
  ] => {
    return [networks, networkConfigurationsByChainId];
  },
);

// Backward-compatible alias used by the network manager UI and tests.
export const getMultichainNetworkConfigurationsTuple =
  getMultichainNetworkConfigurationsByChainId;

export const getIsEvmMultichainNetworkSelected = () => true;

export const getSelectedMultichainNetworkChainId = (
  state: MultichainNetworkConfigState,
) => {
  const evmNetworkConfig = getProviderConfig(state);
  return toEvmCaipChainId(evmNetworkConfig.chainId);
};

export const getSelectedMultichainNetworkConfiguration = createSelector(
  getSelectedMultichainNetworkChainId,
  getAllMultichainNetworkConfigurations,
  (chainId, networkConfigurationsByChainId) => {
    return networkConfigurationsByChainId[chainId];
  },
);

export const getEnabledNetworksByNamespace = createSelector(
  getEnabledNetworks,
  (enabledNetworkMap) => {
    const namespaceMap = enabledNetworkMap[KnownCaipNamespace.Eip155] ?? {};
    return Object.fromEntries(
      Object.entries(namespaceMap).filter(([, enabled]) => enabled === true),
    );
  },
);

export const getAllEnabledNetworksForAllNamespaces = createSelector(
  getEnabledNetworks,
  (enabledNetworkMap) =>
    Object.entries(enabledNetworkMap[KnownCaipNamespace.Eip155] ?? {})
      .filter(([, enabled]) => enabled)
      .map(([chainId]) => chainId),
);

export const selectEnabledNetworksAsCaipChainIds = createSelector(
  getEnabledNetworks,
  (enabledNetworkMap): CaipChainId[] =>
    Object.entries(enabledNetworkMap[KnownCaipNamespace.Eip155] ?? {})
      .filter(([, enabled]) => enabled)
      .map(([chainId]) => toEvmCaipChainId(chainId as Hex))
      .sort(),
);

export const getEnabledChainIds = createSelector(
  getNetworkConfigurationsByChainId,
  getEnabledNetworks,
  (networkConfigurations, enabledNetworks) => {
    const networksForNamespace =
      enabledNetworks[KnownCaipNamespace.Eip155] || {};

    return Object.keys(networkConfigurations).filter(
      (chainId) => networksForNamespace[chainId],
    );
  },
);

export const getEnabledNetworkClientIds = createSelector(
  getNetworkConfigurationsByChainId,
  getEnabledNetworks,
  (networkConfigurations, enabledNetworks) => {
    const networksForNamespace =
      enabledNetworks[KnownCaipNamespace.Eip155] || {};

    return Object.entries(networkConfigurations).reduce(
      (acc, [chainId, network]) => {
        if (networksForNamespace[chainId]) {
          acc.push(
            network.rpcEndpoints[network.defaultRpcEndpointIndex]
              .networkClientId,
          );
        }
        return acc;
      },
      [] as string[],
    );
  },
);

export const selectAnyEnabledNetworksAreAvailable = createSelector(
  getEnabledNetworks,
  selectDefaultNetworkClientIdsByChainId,
  getNetworksMetadata,
  (allEnabledNetworks, defaultNetworkClientIdsByChainId, networksMetadata) => {
    const chainIds = Object.entries(
      allEnabledNetworks[KnownCaipNamespace.Eip155] ?? {},
    )
      .filter(([, isEnabled]) => isEnabled)
      .map(([chainId]) => chainId as Hex);
    const networkClientIds = chainIds.map(
      (chainId) => defaultNetworkClientIdsByChainId[chainId],
    );
    return (
      networkClientIds.length === 0 ||
      networkClientIds.some(
        (networkClientId) =>
          networksMetadata[networkClientId]?.status === NetworkStatus.Available,
      )
    );
  },
);

export const selectFirstUnavailableEvmNetwork = createSelector(
  getEnabledNetworks,
  getNetworkConfigurationsByChainId,
  getNetworksMetadata,
  (enabledNetworks, networkConfigurationsByChainId, networksMetadata) => {
    const enabledEvmNetworks = enabledNetworks[KnownCaipNamespace.Eip155] ?? {};
    const enabledChainIds = Object.entries(enabledEvmNetworks)
      .filter(([, isEnabled]) => isEnabled)
      .map(([chainId]) => chainId as Hex);

    for (const chainId of enabledChainIds) {
      const networkConfiguration = networkConfigurationsByChainId[chainId];
      if (networkConfiguration) {
        // Get the network client ID directly from the network configuration
        const { rpcEndpoints, defaultRpcEndpointIndex, name } =
          networkConfiguration;
        const rpcEndpoint = rpcEndpoints[defaultRpcEndpointIndex];

        if (rpcEndpoint) {
          const metadata = networksMetadata[rpcEndpoint.networkClientId];

          if (
            metadata !== undefined &&
            metadata.status !== NetworkStatus.Available
          ) {
            const isDefaultRpcEndpoint = getIsDefaultRpcEndpointUrl(
              rpcEndpoint.url,
            );

            // For custom endpoints, check if there's a built-in default
            // endpoint available for this network that we can switch to.
            let fallbackDefaultRpcEndpointIndex: number | undefined;
            if (!isDefaultRpcEndpoint) {
              fallbackDefaultRpcEndpointIndex = rpcEndpoints.findIndex(
                (endpoint, index) =>
                  index !== defaultRpcEndpointIndex &&
                  getIsDefaultRpcEndpointUrl(endpoint.url),
              );
              if (fallbackDefaultRpcEndpointIndex === -1) {
                fallbackDefaultRpcEndpointIndex = undefined;
              }
            }

            return {
              networkClientId: rpcEndpoint.networkClientId,
              chainId,
              networkName: name,
              // We check by URL because legacy endpoints may have stale types.
              isDefaultRpcEndpoint,
              // Index of an available built-in default endpoint that can be
              // used when the current custom endpoint is unavailable.
              defaultRpcEndpointIndex: fallbackDefaultRpcEndpointIndex,
            };
          }
        }
      }
    }
    return null;
  },
);

// TODO: Remove after updating to @metamask/network-controller 20.0.0
type ProviderConfigWithImageUrlAndExplorerUrl = {
  rpcUrl?: string;
  type: NetworkType;
  chainId: Hex;
  ticker: string;
  nickname?: string;
  id?: string;
} & {
  rpcPrefs?: { blockExplorerUrl?: string; imageUrl?: string };
};

export type MultichainNetwork = {
  nickname: string;
  isEvmNetwork: boolean;
  chainId: CaipChainId;
  network: // TODO: Maybe updates ProviderConfig to add rpcPrefs.imageUrl field
  ProviderConfigWithImageUrlAndExplorerUrl;
};

// FIXME: All the following might have side-effect, like if the current account is a bitcoin one and that
// a popup (for ethereum related stuffs) is being shown (and uses this function), then the native
// currency will be BTC..

export function getMultichainIsEvm(
  _state: MultichainNetworkConfigState & AccountsState,
  _account?: InternalAccount,
) {
  return true;
}

export function getMultichainNetwork(
  state: MultichainNetworkConfigState & AccountsState,
  account?: InternalAccount,
): MultichainNetwork {
  const evmChainId: Hex = getCurrentChainId(state);
  const evmNetwork: ProviderConfigWithImageUrlAndExplorerUrl =
    getProviderConfig(state) as ProviderConfigWithImageUrlAndExplorerUrl;
  const evmChainIdKey =
    evmChainId as keyof typeof CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP;

  evmNetwork.rpcPrefs = {
    ...evmNetwork.rpcPrefs,
    imageUrl: CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP[evmChainIdKey],
  };

  const networkConfigurations = getNetworkConfigurationsByChainId(state);
  return {
    nickname: networkConfigurations[evmChainId]?.name ?? evmNetwork.rpcUrl,
    isEvmNetwork: true,
    chainId: `${KnownCaipNamespace.Eip155}:${Number(
      evmChainId,
    )}` as CaipChainId,
    network: evmNetwork,
  };
}
