import {
  getDefaultNetworkControllerState,
  NetworkConfiguration,
  NetworkController,
  RpcEndpointType,
  NetworkControllerMessenger,
} from '@metamask/network-controller';
import {
  DEFAULT_MAX_RETRIES,
  BlockExplorerUrl,
  ChainId,
} from '@metamask/controller-utils';
import { CONNECTIVITY_STATUSES } from '@metamask/connectivity-controller';
import { hasProperty } from '@metamask/utils';
import { SECOND } from '../../../shared/constants/time';
import {
  CHAIN_IDS,
  BSC_TESTNET_DISPLAY_NAME,
  BSC_TESTNET_RPC_URL,
  MEGAETH_MAINNET_DISPLAY_NAME,
  MEGAETH_TESTNET_DISPLAY_NAME,
  getRpcUrl,
  getFailoverUrlsForNetwork,
} from '../../../shared/constants/network';
import { captureException } from '../../../shared/lib/local-error-log';
import { MessengerClientInitFunction } from './types';
import { NetworkControllerInitMessenger } from './messengers';

export const ADDITIONAL_DEFAULT_NETWORKS = [ChainId['megaeth-testnet-v2']];

const ALCHEMY_NETWORKS = {
  [CHAIN_IDS.MAINNET]: {
    legacyNetworkClientId: 'mainnet',
    network: 'mainnet',
  },
  [CHAIN_IDS.ARBITRUM]: {
    legacyNetworkClientId: 'arbitrum-mainnet',
    network: 'arbitrum-mainnet',
  },
  [CHAIN_IDS.AVALANCHE]: {
    legacyNetworkClientId: 'avalanche-mainnet',
    network: 'avalanche-mainnet',
  },
  [CHAIN_IDS.BSC]: {
    legacyNetworkClientId: 'bsc-mainnet',
    network: 'bsc-mainnet',
  },
  [CHAIN_IDS.OPTIMISM]: {
    legacyNetworkClientId: 'optimism-mainnet',
    network: 'optimism-mainnet',
  },
  [CHAIN_IDS.POLYGON]: {
    legacyNetworkClientId: 'polygon-mainnet',
    network: 'polygon-mainnet',
  },
  [CHAIN_IDS.BASE]: {
    legacyNetworkClientId: 'base-mainnet',
    network: 'base-mainnet',
  },
  [CHAIN_IDS.BASE_SEPOLIA]: {
    legacyNetworkClientId: 'base-sepolia',
    network: 'base-sepolia',
  },
  [CHAIN_IDS.SEPOLIA]: {
    legacyNetworkClientId: 'sepolia',
    network: 'sepolia',
  },
  [CHAIN_IDS.LINEA_MAINNET]: {
    legacyNetworkClientId: 'linea-mainnet',
    network: 'linea-mainnet',
  },
  [CHAIN_IDS.LINEA_SEPOLIA]: {
    legacyNetworkClientId: 'linea-sepolia',
    network: 'linea-sepolia',
  },
} as const;

const NETWORK_CONTROLLER_PROJECT_ID_COMPATIBILITY_PLACEHOLDER =
  '1do-alchemy-rpc-only';

const MEGAETH_MAINNET_NETWORK_CLIENT_ID = 'megaeth-mainnet-alchemy';

function normalizeMegaethRpcEndpoint(
  networks: NetworkController['state']['networkConfigurationsByChainId'],
) {
  const endpoint = networks?.[CHAIN_IDS.MEGAETH_MAINNET]?.rpcEndpoints?.[0];
  if (endpoint) {
    const previousNetworkClientId = endpoint.networkClientId;
    endpoint.networkClientId = MEGAETH_MAINNET_NETWORK_CLIENT_ID;
    endpoint.url = getRpcUrl({ network: 'megaeth-mainnet' });
    endpoint.type = RpcEndpointType.Custom;
    endpoint.failoverUrls = [];
    return previousNetworkClientId;
  }
  return undefined;
}

function normalizeMegaethTestnetRpcEndpoints(
  networks: NetworkController['state']['networkConfigurationsByChainId'],
) {
  for (const chainId of [
    CHAIN_IDS.MEGAETH_TESTNET,
    CHAIN_IDS.MEGAETH_TESTNET_V2,
  ]) {
    const endpoint = networks?.[chainId]?.rpcEndpoints?.[0];
    if (endpoint) {
      endpoint.networkClientId = 'megaeth-testnet-alchemy';
      endpoint.url = getRpcUrl({ network: 'megaeth-testnet' });
      endpoint.type = RpcEndpointType.Custom;
      endpoint.failoverUrls = [];
    }
  }
}

function addBaseSepoliaNetwork(
  networks: NetworkController['state']['networkConfigurationsByChainId'],
) {
  if (!networks || networks[CHAIN_IDS.BASE_SEPOLIA]) {
    return;
  }

  networks[CHAIN_IDS.BASE_SEPOLIA] = {
    chainId: CHAIN_IDS.BASE_SEPOLIA,
    name: 'Base Sepolia',
    nativeCurrency: 'ETH',
    blockExplorerUrls: ['https://sepolia.basescan.org'],
    defaultBlockExplorerUrlIndex: 0,
    defaultRpcEndpointIndex: 0,
    rpcEndpoints: [
      {
        networkClientId: 'base-sepolia',
        url: getRpcUrl({ network: 'base-sepolia' }),
        type: RpcEndpointType.Custom,
        failoverUrls: [],
      },
    ],
  };
}

function addBscTestnetNetwork(
  networks: NetworkController['state']['networkConfigurationsByChainId'],
) {
  if (networks?.[CHAIN_IDS.BSC_TESTNET]) {
    return;
  }

  networks[CHAIN_IDS.BSC_TESTNET] = {
    chainId: CHAIN_IDS.BSC_TESTNET,
    name: BSC_TESTNET_DISPLAY_NAME,
    nativeCurrency: 'tBNB',
    blockExplorerUrls: ['https://testnet.bscscan.com/'],
    defaultBlockExplorerUrlIndex: 0,
    defaultRpcEndpointIndex: 0,
    rpcEndpoints: [
      {
        networkClientId: 'bsc-testnet',
        url: BSC_TESTNET_RPC_URL,
        type: RpcEndpointType.Custom,
        failoverUrls: [],
      },
    ],
  };
}

function normalizeAlchemyRpcEndpoints(
  networks: NetworkController['state']['networkConfigurationsByChainId'],
  selectedNetworkClientId?: string,
) {
  let normalizedSelectedNetworkClientId = selectedNetworkClientId;

  for (const [chainId, { legacyNetworkClientId, network }] of Object.entries(
    ALCHEMY_NETWORKS,
  )) {
    const networkClientId = `${legacyNetworkClientId}-alchemy`;
    const rpcEndpoint = networks?.[
      chainId as keyof typeof networks
    ]?.rpcEndpoints.find(
      (endpoint) =>
        endpoint.networkClientId === legacyNetworkClientId ||
        endpoint.networkClientId === networkClientId,
    );

    if (rpcEndpoint) {
      rpcEndpoint.networkClientId = networkClientId;
      rpcEndpoint.url = getRpcUrl({ network });
      rpcEndpoint.type = RpcEndpointType.Custom;
      rpcEndpoint.failoverUrls = [];
    }

    if (normalizedSelectedNetworkClientId === legacyNetworkClientId) {
      normalizedSelectedNetworkClientId = networkClientId;
    }
  }

  return normalizedSelectedNetworkClientId;
}

function normalizeSelectedNetworkClientId(
  selectedNetworkClientId: string | undefined,
  networks: NetworkController['state']['networkConfigurationsByChainId'],
): string | undefined {
  // Older test builds selected the synthetic localhost endpoint by default.
  // Do not carry that accidental selection into a normal wallet session.
  const selectedEndpointIsLocalhost = Object.values(networks ?? {}).some(
    ({ rpcEndpoints }) =>
      rpcEndpoints.some(
        ({ networkClientId, url }) =>
          networkClientId === selectedNetworkClientId &&
          url === 'http://localhost:8545',
      ),
  );
  if (
    selectedNetworkClientId === 'networkConfigurationId' ||
    selectedEndpointIsLocalhost
  ) {
    return `${ALCHEMY_NETWORKS[CHAIN_IDS.SEPOLIA].legacyNetworkClientId}-alchemy`;
  }

  return selectedNetworkClientId;
}

function getInitialState(initialState?: Partial<NetworkController['state']>) {
  let initialNetworkControllerState = initialState;

  if (initialNetworkControllerState) {
    const networks =
      initialNetworkControllerState.networkConfigurationsByChainId ?? {};
    initialNetworkControllerState.networkConfigurationsByChainId = networks;
    addBaseSepoliaNetwork(networks);
    addBscTestnetNetwork(networks);
    initialNetworkControllerState.selectedNetworkClientId =
      normalizeAlchemyRpcEndpoints(
        networks,
        initialNetworkControllerState.selectedNetworkClientId,
      );
    const previousMegaethNetworkClientId =
      normalizeMegaethRpcEndpoint(networks);
    normalizeMegaethTestnetRpcEndpoints(networks);
    if (
      initialNetworkControllerState.selectedNetworkClientId ===
      previousMegaethNetworkClientId
    ) {
      initialNetworkControllerState.selectedNetworkClientId =
        MEGAETH_MAINNET_NETWORK_CLIENT_ID;
    }
    initialNetworkControllerState.selectedNetworkClientId =
      normalizeSelectedNetworkClientId(
        initialNetworkControllerState.selectedNetworkClientId,
        networks,
      );
  } else {
    initialNetworkControllerState = getDefaultNetworkControllerState(
      ADDITIONAL_DEFAULT_NETWORKS,
    );

    const networks =
      initialNetworkControllerState.networkConfigurationsByChainId ?? {};

    addBaseSepoliaNetwork(networks);
    addBscTestnetNetwork(networks);

    // TODO: Consider changing `getDefaultNetworkControllerState` on the
    // controller side to include some of these tweaks.

    Object.values(networks).forEach((network) => {
      const id = network.rpcEndpoints[0].networkClientId;
      // Process only if the default network has a corresponding networkClientId
      // in BlockExplorerUrl.
      if (hasProperty(BlockExplorerUrl, id)) {
        network.blockExplorerUrls = [BlockExplorerUrl[id] as string];
      }
      network.defaultBlockExplorerUrlIndex = 0;
    });

    // Add failovers for default RPC endpoints.
    networks[CHAIN_IDS.MAINNET].rpcEndpoints[0].failoverUrls =
      getFailoverUrlsForNetwork('ethereum-mainnet');
    networks[CHAIN_IDS.LINEA_MAINNET].rpcEndpoints[0].failoverUrls =
      getFailoverUrlsForNetwork('linea-mainnet');
    networks[CHAIN_IDS.BASE].rpcEndpoints[0].failoverUrls =
      getFailoverUrlsForNetwork('base-mainnet');
    if (networks[CHAIN_IDS.ARBITRUM]?.rpcEndpoints?.[0]) {
      networks[CHAIN_IDS.ARBITRUM].rpcEndpoints[0].failoverUrls =
        getFailoverUrlsForNetwork('arbitrum-mainnet');
    }
    if (networks[CHAIN_IDS.BSC]?.rpcEndpoints?.[0]) {
      networks[CHAIN_IDS.BSC].rpcEndpoints[0].failoverUrls =
        getFailoverUrlsForNetwork('bsc-mainnet');
    }
    if (networks[CHAIN_IDS.OPTIMISM]?.rpcEndpoints?.[0]) {
      networks[CHAIN_IDS.OPTIMISM].rpcEndpoints[0].failoverUrls =
        getFailoverUrlsForNetwork('optimism-mainnet');
    }
    if (networks[CHAIN_IDS.POLYGON]?.rpcEndpoints?.[0]) {
      networks[CHAIN_IDS.POLYGON].rpcEndpoints[0].failoverUrls =
        getFailoverUrlsForNetwork('polygon-mainnet');
    }
    normalizeAlchemyRpcEndpoints(networks);
    normalizeMegaethRpcEndpoint(networks);
    normalizeMegaethTestnetRpcEndpoints(networks);
    if (networks[CHAIN_IDS.MEGAETH_MAINNET]) {
      networks[CHAIN_IDS.MEGAETH_MAINNET].name = MEGAETH_MAINNET_DISPLAY_NAME;
    }
    if (networks[CHAIN_IDS.MEGAETH_TESTNET]) {
      networks[CHAIN_IDS.MEGAETH_TESTNET].name = MEGAETH_TESTNET_DISPLAY_NAME;
    }
    if (networks[CHAIN_IDS.MEGAETH_TESTNET_V2]) {
      networks[CHAIN_IDS.MEGAETH_TESTNET_V2].name =
        MEGAETH_TESTNET_DISPLAY_NAME;
    }
    if (networks[CHAIN_IDS.BSC_TESTNET]) {
      networks[CHAIN_IDS.BSC_TESTNET].name = BSC_TESTNET_DISPLAY_NAME;
    }

    // Update default popular network names.
    networks[CHAIN_IDS.MAINNET].name = 'Ethereum';
    networks[CHAIN_IDS.LINEA_MAINNET].name = 'Linea';
    networks[CHAIN_IDS.BASE].name = 'Base';
    networks[CHAIN_IDS.ARBITRUM].name = 'Arbitrum';
    networks[CHAIN_IDS.BSC].name = 'BNB';
    networks[CHAIN_IDS.BSC_TESTNET].name = BSC_TESTNET_DISPLAY_NAME;
    networks[CHAIN_IDS.OPTIMISM].name = 'OP';
    networks[CHAIN_IDS.POLYGON].name = 'Polygon';

    // Keep the initial network set limited to the core supported networks.
    // These networks remain available only when explicitly configured by the
    // user, rather than being presented by default.
    delete networks[CHAIN_IDS.AVALANCHE];
    delete networks[CHAIN_IDS.ZKSYNC_ERA];
    delete networks[CHAIN_IDS.SEI];
    delete networks[CHAIN_IDS.MONAD];
    delete networks[CHAIN_IDS.MONAD_TESTNET];
    delete networks[CHAIN_IDS.HYPE];

    let network: NetworkConfiguration;
    if (
      process.env.METAMASK_DEBUG ||
      process.env.METAMASK_ENVIRONMENT === 'test' ||
      process.env.IN_TEST
    ) {
      network = networks[CHAIN_IDS.SEPOLIA];
    } else {
      network = networks[CHAIN_IDS.MAINNET];
    }

    initialNetworkControllerState.selectedNetworkClientId =
      network.rpcEndpoints[network.defaultRpcEndpointIndex].networkClientId;
  }

  // Fix the network controller state (selectedNetworkClientId) if it is invalid and report the error
  if (
    initialNetworkControllerState.networkConfigurationsByChainId &&
    !Object.values(initialNetworkControllerState.networkConfigurationsByChainId)
      .flatMap((networkConfiguration) =>
        networkConfiguration.rpcEndpoints.map(
          (rpcEndpoint) => rpcEndpoint.networkClientId,
        ),
      )
      .includes(initialNetworkControllerState.selectedNetworkClientId as string)
  ) {
    captureException(
      new Error(
        `NetworkController state is invalid: \`selectedNetworkClientId\` '${initialNetworkControllerState.selectedNetworkClientId}' does not refer to an RPC endpoint within a network configuration`,
      ),
    );

    initialNetworkControllerState.selectedNetworkClientId =
      initialNetworkControllerState.networkConfigurationsByChainId[
        CHAIN_IDS.MAINNET
      ].rpcEndpoints[0].networkClientId;
  }

  return initialNetworkControllerState;
}

/**
 * Initialize the network controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state of the extension.
 * @param request.infuraProjectId - Legacy NetworkController API parameter.
 * @param request.initMessenger
 * @returns The initialized controller.
 */
export const NetworkControllerInit: MessengerClientInitFunction<
  NetworkController,
  NetworkControllerMessenger,
  NetworkControllerInitMessenger
> = ({
  controllerMessenger,
  infuraProjectId,
  initMessenger,
  persistedState,
}) => {
  const initialState = getInitialState(persistedState.NetworkController);
  const networkControllerInfuraCompatibilityProjectId =
    infuraProjectId || NETWORK_CONTROLLER_PROJECT_ID_COMPATIBILITY_PLACEHOLDER;

  const getBlockTrackerOptions = () => {
    return process.env.IN_TEST
      ? {}
      : {
          pollingInterval: 20 * SECOND,
          // The retry timeout is pretty short by default, and if the endpoint is
          // down, it will end up exhausting the max number of consecutive
          // failures quickly.
          retryTimeout: 20 * SECOND,
        };
  };

  const getRpcServiceOptions = (rpcEndpointUrl: string) => {
    // Note that the total number of attempts is 1 more than this
    // (which is why we add 1 below).
    const maxRetries = DEFAULT_MAX_RETRIES;
    const isOffline = (): boolean => {
      const connectivityState = controllerMessenger.call(
        'ConnectivityController:getState',
      );
      return (
        connectivityState.connectivityStatus === CONNECTIVITY_STATUSES.Offline
      );
    };
    const commonOptions = {
      fetch: globalThis.fetch.bind(globalThis),
      btoa: globalThis.btoa.bind(globalThis),
      isOffline,
    };
    const commonPolicyOptions = {
      // Ensure that the "cooldown" period after breaking the circuit is short.
      circuitBreakDuration: 30 * SECOND,
      maxRetries,
    };

    return {
      ...commonOptions,
      policyOptions: {
        ...commonPolicyOptions,
        // Ensure that if the endpoint continually responds with errors, we
        // break the circuit relatively fast (but not prematurely).
        //
        // Note that the circuit will break much faster if the errors are
        // retriable (e.g. 503) than if not (e.g. 500), so we attempt to strike
        // a balance here.
        maxConsecutiveFailures: (maxRetries + 1) * 3,
      },
    };
  };

  const messengerClient = new NetworkController({
    messenger: controllerMessenger,
    state: initialState,
    infuraProjectId: networkControllerInfuraCompatibilityProjectId,
    getBlockTrackerOptions,
    getRpcServiceOptions,
    additionalDefaultNetworks: ADDITIONAL_DEFAULT_NETWORKS,
    isRpcFailoverEnabled: false,
  });

  // Delay lookupNetwork until after onboarding to prevent network requests before the user can
  // update their RPC endpoints.
  messengerClient.initializeProvider({ lookupNetwork: false });

  return {
    messengerClient,
  };
};
