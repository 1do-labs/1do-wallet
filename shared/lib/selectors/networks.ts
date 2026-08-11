import {
  MultichainNetworkConfiguration,
  type MultichainNetworkConfiguration as InternalMultichainNetworkConfiguration,
} from '@metamask/multichain-network-controller';
import {
  RpcEndpointType,
  type NetworkState as InternalNetworkState,
  type NetworkConfiguration as InternalNetworkConfiguration,
  NetworkConfiguration,
  NetworkClientId,
} from '@metamask/network-controller';
import { createSelector } from 'reselect';
import { AccountsControllerState } from '@metamask/accounts-controller';
import type { CaipChainId, Hex } from '@metamask/utils';
import {
  CAIP_FORMATTED_TEST_CHAINS,
  NetworkStatus,
} from '../../constants/network';
import { hexToDecimal } from '../conversion.utils';

export type NetworkState = {
  metamask: InternalNetworkState;
};

export type NetworkConfigurationsState = {
  metamask: {
    networkConfigurations: Record<string, InternalNetworkConfiguration>;
  };
};

export type SelectedNetworkClientIdState = {
  metamask: Pick<InternalNetworkState, 'selectedNetworkClientId'>;
};

export type NetworkConfigurationsByChainIdState = {
  metamask: Pick<InternalNetworkState, 'networkConfigurationsByChainId'>;
};

export type NetworksMetadataState = {
  metamask: Pick<InternalNetworkState, 'networksMetadata'>;
};

export type ProviderConfigState = NetworkConfigurationsByChainIdState &
  SelectedNetworkClientIdState;

export type MultichainNetworkConfigurationsByChainIdState = {
  metamask: {
    multichainNetworkConfigurationsByChainId: Record<
      string,
      InternalMultichainNetworkConfiguration
    >;
    networkConfigurationsByChainId: Record<
      string,
      InternalNetworkConfiguration
    >;
  };
};

export type EvmNetworkConfigurationsWithCaipChainId = (
  | NetworkConfiguration
  | MultichainNetworkConfiguration
) & {
  caipChainId: CaipChainId;
};

export const getNetworkConfigurationsByChainId = (
  state: NetworkConfigurationsByChainIdState,
) => state.metamask.networkConfigurationsByChainId;

export const selectDefaultNetworkClientIdsByChainId = createSelector(
  getNetworkConfigurationsByChainId,
  (networkConfigurationsByChainId) => {
    const clientIdsByChain: Record<Hex, NetworkClientId> = {};

    for (const [chainId, networkConfiguration] of Object.entries(
      networkConfigurationsByChainId,
    )) {
      clientIdsByChain[chainId as Hex] =
        networkConfiguration.rpcEndpoints[
          networkConfiguration.defaultRpcEndpointIndex
        ].networkClientId;
    }

    return clientIdsByChain;
  },
);

export function getSelectedNetworkClientId(
  state: SelectedNetworkClientIdState,
) {
  return state.metamask.selectedNetworkClientId;
}

/**
 * Combines and returns network configurations for EVM chains by CAIP chain id.
 *
 * @param params - The parameters object.
 * @param params.multichainNetworkConfigurationsByChainId - network configurations by caip chain id from the MultichainNetworkController state.
 * @param params.networkConfigurationsByChainId - network configurations by hex chain id from the NetworkController state.
 * @param params.internalAccounts - InternalAccounts object from the AccountController state.
 * @returns A consolidated object containing all available network configurations by caip chain id.
 */
export const getNetworkConfigurationsByCaipChainId = ({
  multichainNetworkConfigurationsByChainId:
    _multichainNetworkConfigurationsByChainId,
  networkConfigurationsByChainId,
  internalAccounts: _internalAccounts,
}: {
  multichainNetworkConfigurationsByChainId: Record<
    CaipChainId,
    InternalMultichainNetworkConfiguration
  >;
  networkConfigurationsByChainId: Record<string, InternalNetworkConfiguration>;
  internalAccounts: AccountsControllerState['internalAccounts'];
}) => {
  const caipFormattedEvmNetworkConfigurations: Record<
    CaipChainId,
    InternalNetworkConfiguration
  > = {};

  Object.entries(networkConfigurationsByChainId).forEach(
    ([chainId, network]) => {
      const caipChainId = `eip155:${hexToDecimal(chainId)}` as CaipChainId;
      caipFormattedEvmNetworkConfigurations[caipChainId] = network;
    },
  );

  return caipFormattedEvmNetworkConfigurations;
};

/**
 * Combines and returns network configurations for EVM chains.
 *
 * @param state - Redux state.
 * @returns A consolidated object containing all available network configurations.
 */
export const getAllNetworkConfigurationsByCaipChainId = createSelector(
  (state: MultichainNetworkConfigurationsByChainIdState) =>
    state.metamask.networkConfigurationsByChainId,
  (state: MultichainNetworkConfigurationsByChainIdState) =>
    state.metamask.multichainNetworkConfigurationsByChainId,
  (state: {
    metamask: { internalAccounts: AccountsControllerState['internalAccounts'] };
  }) => state.metamask.internalAccounts,
  (
    networkConfigurationsByChainId,
    multichainNetworkConfigurationsByChainId,
    internalAccounts,
  ) =>
    getNetworkConfigurationsByCaipChainId({
      multichainNetworkConfigurationsByChainId,
      networkConfigurationsByChainId,
      internalAccounts,
    }),
);

/**
 * Get the provider configuration for the current selected network.
 *
 * @param state - Redux state object.
 * @throws `new Error('Provider configuration not found')` If the provider configuration is not found.
 */
export const getProviderConfig = createSelector(
  (state: ProviderConfigState) => getNetworkConfigurationsByChainId(state),
  getSelectedNetworkClientId,
  (networkConfigurationsByChainId, selectedNetworkClientId) => {
    for (const network of Object.values(networkConfigurationsByChainId)) {
      for (const rpcEndpoint of network.rpcEndpoints) {
        if (rpcEndpoint.networkClientId === selectedNetworkClientId) {
          const blockExplorerUrl =
            network.defaultBlockExplorerUrlIndex === undefined
              ? undefined
              : network.blockExplorerUrls?.[
                  network.defaultBlockExplorerUrlIndex
                ];

          return {
            chainId: network.chainId,
            ticker: network.nativeCurrency,
            rpcPrefs: { ...(blockExplorerUrl && { blockExplorerUrl }) },
            type:
              rpcEndpoint.type === RpcEndpointType.Custom
                ? 'rpc'
                : rpcEndpoint.networkClientId,
            ...(rpcEndpoint.type === RpcEndpointType.Custom && {
              id: rpcEndpoint.networkClientId,
              nickname: network.name,
              rpcUrl: rpcEndpoint.url,
            }),
          };
        }
      }
    }
    throw new Error('Provider configuration not found');
  },
);

export function getNetworkConfigurations(
  state: NetworkConfigurationsState,
): Record<string, InternalNetworkConfiguration> {
  return state.metamask.networkConfigurations;
}

/**
 * Returns true if the currently selected network is inaccessible or whether no
 * provider has been set yet for the currently selected network.
 *
 * @param state - Redux state object.
 */
export function isNetworkLoading(state: NetworkState) {
  const selectedNetworkClientId = getSelectedNetworkClientId(state);
  return (
    selectedNetworkClientId &&
    state.metamask.networksMetadata[selectedNetworkClientId].status !==
      NetworkStatus.Available
  );
}

export function getInfuraBlocked(
  state: SelectedNetworkClientIdState & NetworksMetadataState,
) {
  return (
    state.metamask.networksMetadata[getSelectedNetworkClientId(state)]
      .status === NetworkStatus.Blocked
  );
}

export function getNetworksMetadata(state: NetworkState) {
  return state.metamask.networksMetadata;
}

export function getCurrentChainId(state: ProviderConfigState) {
  const { chainId } = getProviderConfig(state);
  return chainId;
}

export const getIsAllNetworksFilterEnabled = createSelector(
  getNetworkConfigurationsByChainId,
  (allNetworks) => {
    const allOpts: Record<string, boolean> = {};
    Object.keys(allNetworks || {}).forEach((chain) => {
      allOpts[chain] = true;
    });
    return allOpts;
  },
);

/**
 * Returns all available network configurations without test networks.
 *
 * @param state - Redux state object.
 * @returns Array of network configurations, excluding test networks.
 */
export const getNonTestNetworks = createSelector(
  [getAllNetworkConfigurationsByCaipChainId],
  (
    networkConfigurationsByCaipChainId,
  ): EvmNetworkConfigurationsWithCaipChainId[] => {
    return Object.entries(networkConfigurationsByCaipChainId)
      .filter(([chainId]) => {
        const caipChainId = chainId as CaipChainId;
        return !CAIP_FORMATTED_TEST_CHAINS.includes(caipChainId);
      })
      .map(([chainId, network]) => ({
        ...network,
        caipChainId: chainId as CaipChainId,
      }));
  },
);

/**
 * Returns an array of simplified network configurations available based on the CAIP account scopes,
 * without test networks.
 *
 * @param _state - Redux state object.
 * @param scopes - Array of CAIP account scopes to filter networks by.
 * @returns Array of network configurations with chainId and name, filtered by provided scopes.
 */
export const getNetworksByScopes = createSelector(
  [getNonTestNetworks, (_state, scopes: string[]) => scopes],
  (nonTestNetworks, scopes): { chainId: string | number; name: string }[] => {
    if (!scopes) {
      return [];
    }

    return scopes.reduce(
      (result: { chainId: string | number; name: string }[], scope) => {
        // Special case for eip155:0 - include all EVM networks
        if (scope === 'eip155:0') {
          const evmNetworks = nonTestNetworks
            .filter((network) => network.caipChainId?.startsWith('eip155:'))
            .map((network) => ({
              chainId: network.chainId,
              name: network.name,
            }));

          return result.concat(evmNetworks);
        }

        const matchingNetwork = nonTestNetworks.find(
          (network) => network.caipChainId === scope,
        );

        if (matchingNetwork) {
          return result.concat({
            chainId: matchingNetwork.chainId,
            name: matchingNetwork.name,
          });
        }

        return result;
      },
      [],
    );
  },
);
