import {
  NetworkEnablementController,
  NetworkEnablementControllerState,
} from '@metamask/network-enablement-controller';
import { NetworkState } from '@metamask/network-controller';
import { Hex, KnownCaipNamespace } from '@metamask/utils';
import {
  NetworkEnablementControllerMessenger,
  NetworkEnablementControllerInitMessenger,
} from '../messengers/assets';
import { MessengerClientInitFunction } from '../types';
import {
  CHAIN_IDS,
  FEATURED_NETWORK_CHAIN_IDS,
} from '../../../../shared/constants/network';

/**
 * Generates a map of EVM chain IDs to their enabled status based on NetworkController state.
 *
 * @param networkConfigurationsByChainId - The network configurations from NetworkController
 * @param enabledChainIds - Array of chain IDs that should be enabled
 * @returns Record mapping chain IDs to boolean enabled status
 */
const generateEVMNetworkMap = (
  networkConfigurationsByChainId: NetworkState['networkConfigurationsByChainId'],
  enabledChainIds: string[],
): Record<KnownCaipNamespace.Eip155, Record<Hex, boolean>> => {
  const networkMap: Record<KnownCaipNamespace.Eip155, Record<Hex, boolean>> = {
    [KnownCaipNamespace.Eip155]: {},
  };

  (Object.keys(networkConfigurationsByChainId) as Hex[]).forEach((chainId) => {
    networkMap[KnownCaipNamespace.Eip155][chainId] =
      enabledChainIds.includes(chainId);
  });

  return networkMap;
};

const generateDefaultNetworkEnablementControllerState = (
  networkControllerState: NetworkState,
): NetworkEnablementControllerState => {
  const { networkConfigurationsByChainId } = networkControllerState;

  if (process.env.IN_TEST) {
    return {
      enabledNetworkMap: {
        ...generateEVMNetworkMap(networkConfigurationsByChainId, [
          CHAIN_IDS.LOCALHOST,
        ]),
      },
      nativeAssetIdentifiers: {},
    };
  } else if (
    process.env.METAMASK_DEBUG ||
    process.env.METAMASK_ENVIRONMENT === 'test'
  ) {
    return {
      enabledNetworkMap: {
        ...generateEVMNetworkMap(networkConfigurationsByChainId, [
          CHAIN_IDS.SEPOLIA,
        ]),
      },
      nativeAssetIdentifiers: {},
    };
  }

  return {
    enabledNetworkMap: {
      ...generateEVMNetworkMap(
        networkConfigurationsByChainId,
        FEATURED_NETWORK_CHAIN_IDS,
      ),
    },
    nativeAssetIdentifiers: {},
  };
};

export const NetworkEnablementControllerInit: MessengerClientInitFunction<
  NetworkEnablementController,
  NetworkEnablementControllerMessenger,
  NetworkEnablementControllerInitMessenger
> = ({
  controllerMessenger,
  persistedState,
  getMessengerClient,
}) => {
  const networkControllerState = getMessengerClient('NetworkController').state;

  const messengerClient = new NetworkEnablementController({
    messenger: controllerMessenger,
    state: {
      ...generateDefaultNetworkEnablementControllerState(networkControllerState),
      ...persistedState.NetworkEnablementController,
    },
  });

  // Initialize native asset identifiers from network configurations.
  // This reads from NetworkController and MultichainNetworkController to populate
  // the nativeAssetIdentifiers state with CAIP-19-like identifiers for each network.
  // We intentionally don't await this - it will complete in the background.
  messengerClient.init();

  return {
    messengerClient,
  };
};
