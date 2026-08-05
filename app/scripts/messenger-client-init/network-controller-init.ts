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
import { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';
import { SECOND } from '../../../shared/constants/time';
import {
  onRpcEndpointDegraded,
  onRpcEndpointUnavailable,
} from '../lib/network-controller/messenger-action-handlers';
import {
  CHAIN_IDS,
  getRpcUrl,
  getFailoverUrlsForNetwork,
} from '../../../shared/constants/network';
import { captureException } from '../../../shared/lib/sentry';
import { MessengerClientInitFunction } from './types';
import { NetworkControllerInitMessenger } from './messengers';

export const ADDITIONAL_DEFAULT_NETWORKS = [
  ChainId['monad-testnet'],
  ChainId['megaeth-testnet-v2'],
];

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

function getInitialState(initialState?: Partial<NetworkController['state']>) {
  let initialNetworkControllerState = initialState;

  if (initialNetworkControllerState) {
    addBaseSepoliaNetwork(
      initialNetworkControllerState.networkConfigurationsByChainId,
    );
    initialNetworkControllerState.selectedNetworkClientId =
      normalizeAlchemyRpcEndpoints(
        initialNetworkControllerState.networkConfigurationsByChainId,
        initialNetworkControllerState.selectedNetworkClientId,
      );
  } else {
    initialNetworkControllerState = getDefaultNetworkControllerState(
      ADDITIONAL_DEFAULT_NETWORKS,
    );

    const networks =
      initialNetworkControllerState.networkConfigurationsByChainId ?? {};

    addBaseSepoliaNetwork(networks);

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

    // Update default popular network names.
    networks[CHAIN_IDS.MAINNET].name = 'Ethereum';
    networks[CHAIN_IDS.LINEA_MAINNET].name = 'Linea';
    networks[CHAIN_IDS.BASE].name = 'Base';
    networks[CHAIN_IDS.ARBITRUM].name = 'Arbitrum';
    networks[CHAIN_IDS.BSC].name = 'BNB Chain';
    networks[CHAIN_IDS.OPTIMISM].name = 'OP';
    networks[CHAIN_IDS.POLYGON].name = 'Polygon';

    // Remove Sei from initial state so it appears in Additional Networks section
    // Users can add it manually, and it will be available in FEATURED_RPCS
    delete networks[CHAIN_IDS.SEI];

    let network: NetworkConfiguration;
    if (process.env.IN_TEST) {
      network = {
        chainId: CHAIN_IDS.LOCALHOST,
        name: 'Localhost 8545',
        nativeCurrency: 'ETH',
        blockExplorerUrls: [],
        defaultRpcEndpointIndex: 0,
        rpcEndpoints: [
          {
            networkClientId: 'networkConfigurationId',
            url: 'http://localhost:8545',
            type: RpcEndpointType.Custom,
            failoverUrls: [],
          },
        ],
      };
      networks[CHAIN_IDS.LOCALHOST] = network;
    } else if (
      process.env.METAMASK_DEBUG ||
      process.env.METAMASK_ENVIRONMENT === 'test'
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
  const remoteFeatureFlagsControllerState = initMessenger.call(
    'RemoteFeatureFlagController:getState',
  );
  const initialState = getInitialState(persistedState.NetworkController);
  const networkControllerInfuraCompatibilityProjectId =
    infuraProjectId || NETWORK_CONTROLLER_PROJECT_ID_COMPATIBILITY_PLACEHOLDER;

  /**
   * Determines if RPC failover is enabled based on RemoteFeatureFlagController
   * state.
   *
   * @param state - RemoteFeatureFlagControllerState
   * @returns true if RPC failover is enabled, false otherwise
   */
  const getIsRpcFailoverEnabled = (state: RemoteFeatureFlagControllerState) => {
    const walletFrameworkRpcFailoverEnabled = state.remoteFeatureFlags
      .walletFrameworkRpcFailoverEnabled as boolean | undefined;
    return walletFrameworkRpcFailoverEnabled ?? false;
  };

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
    isRpcFailoverEnabled: getIsRpcFailoverEnabled(
      remoteFeatureFlagsControllerState,
    ),
  });

  initMessenger.subscribe(
    'NetworkController:rpcEndpointUnavailable',
    async ({ chainId, endpointUrl, error }) => {
      onRpcEndpointUnavailable({
        chainId,
        endpointUrl,
        error,
        infuraProjectId: networkControllerInfuraCompatibilityProjectId,
        trackEvent: initMessenger.call.bind(
          initMessenger,
          'MetaMetricsController:trackEvent',
        ),
        metaMetricsId: initMessenger.call(
          'MetaMetricsController:getMetaMetricsId',
        ),
      });
    },
  );

  initMessenger.subscribe(
    'NetworkController:rpcEndpointDegraded',
    async ({
      chainId,
      endpointUrl,
      error,
      rpcMethodName,
      type,
      retryReason,
    }) => {
      onRpcEndpointDegraded({
        chainId,
        endpointUrl,
        error,
        infuraProjectId: networkControllerInfuraCompatibilityProjectId,
        retryReason,
        rpcMethodName,
        trackEvent: initMessenger.call.bind(
          initMessenger,
          'MetaMetricsController:trackEvent',
        ),
        metaMetricsId: initMessenger.call(
          'MetaMetricsController:getMetaMetricsId',
        ),
        type,
      });
    },
  );

  initMessenger.subscribe(
    'RemoteFeatureFlagController:stateChange',
    (isRpcFailoverEnabled) => {
      if (isRpcFailoverEnabled) {
        console.log('Enabling RPC failover.');
        messengerClient.enableRpcFailover();
      } else {
        console.log('Disabling RPC failover.');
        messengerClient.disableRpcFailover();
      }
    },
    getIsRpcFailoverEnabled,
  );

  // Delay lookupNetwork until after onboarding to prevent network requests before the user can
  // update their RPC endpoints.
  messengerClient.initializeProvider({ lookupNetwork: false });

  return {
    messengerClient,
  };
};
