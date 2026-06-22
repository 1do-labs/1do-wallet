import { ControllerStateChangeEvent } from '@metamask/base-controller';
import {
  ActionConstraint,
  MOCK_ANY_NAMESPACE,
  Messenger,
  MockAnyNamespace,
} from '@metamask/messenger';
import {
  NetworkController,
  NetworkControllerMessenger,
} from '@metamask/network-controller';
import {
  RemoteFeatureFlagControllerGetStateAction,
  RemoteFeatureFlagControllerState,
} from '@metamask/remote-feature-flag-controller';
import { MessengerClientInitRequest } from './types';
import { buildControllerInitRequestMock } from './test/utils';
import {
  NetworkControllerInitMessenger,
  getNetworkControllerMessenger,
  getNetworkControllerInitMessenger,
} from './messengers';
import {
  ADDITIONAL_DEFAULT_NETWORKS,
  NetworkControllerInit,
} from './network-controller-init';

jest.mock('@metamask/network-controller', () => {
  const originalModule = jest.requireActual('@metamask/network-controller');
  const NetworkControllerMock = jest.fn().mockImplementation(() => {
    return {
      initializeProvider: jest.fn(),
      enableRpcFailover: jest.fn(),
      disableRpcFailover: jest.fn(),
    };
  });

  return {
    ...originalModule,
    NetworkController: NetworkControllerMock,
  };
});

function getInitRequestMock(
  messenger = new Messenger<
    MockAnyNamespace,
    RemoteFeatureFlagControllerGetStateAction | ActionConstraint,
    ControllerStateChangeEvent<
      'RemoteFeatureFlagController',
      RemoteFeatureFlagControllerState
    >
  >({ namespace: MOCK_ANY_NAMESPACE }),
): jest.Mocked<
  MessengerClientInitRequest<
    NetworkControllerMessenger,
    NetworkControllerInitMessenger
  >
> {
  messenger.registerActionHandler(
    'RemoteFeatureFlagController:getState',
    jest.fn().mockReturnValue({
      remoteFeatureFlags: {
        walletFrameworkRpcFailoverEnabled: true,
      },
    }),
  );

  const requestMock = {
    ...buildControllerInitRequestMock(),
    controllerMessenger: getNetworkControllerMessenger(messenger),
    initMessenger: getNetworkControllerInitMessenger(messenger),
  };

  return requestMock;
}

describe('NetworkControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes the controller', () => {
    const { messengerClient } = NetworkControllerInit(getInitRequestMock());
    expect(messengerClient).toStrictEqual({
      initializeProvider: expect.any(Function),
      enableRpcFailover: expect.any(Function),
      disableRpcFailover: expect.any(Function),
    });
  });

  it('passes the proper arguments to the controller', () => {
    NetworkControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(NetworkController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: expect.any(Object),
      additionalDefaultNetworks: ADDITIONAL_DEFAULT_NETWORKS,
      getBlockTrackerOptions: expect.any(Function),
      getRpcServiceOptions: expect.any(Function),
      infuraProjectId: '1do-alchemy-rpc-only',
      isRpcFailoverEnabled: true,
    });
  });

  it('sets the default state for the controller', () => {
    NetworkControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(NetworkController);
    const initialState = controllerMock.mock.calls[0][0].state;
    expect(initialState).toMatchInlineSnapshot(`
      {
        "networkConfigurationsByChainId": {
          "0x1": {
            "blockExplorerUrls": [
              "https://etherscan.io",
            ],
            "chainId": "0x1",
            "defaultBlockExplorerUrlIndex": 0,
            "defaultRpcEndpointIndex": 0,
            "name": "Ethereum",
            "nativeCurrency": "ETH",
            "rpcEndpoints": [
              {
                "failoverUrls": [],
                "networkClientId": "mainnet-alchemy",
                "type": "custom",
                "url": "https://eth-mainnet.g.alchemy.com/v2/{alchemyApiKey}",
              },
            ],
          },
          "0x18c7": {
            "blockExplorerUrls": [
              "https://megaeth-testnet-v2.blockscout.com",
            ],
            "chainId": "0x18c7",
            "defaultBlockExplorerUrlIndex": 0,
            "defaultRpcEndpointIndex": 0,
            "name": "MegaETH Testnet",
            "nativeCurrency": "MegaETH",
            "rpcEndpoints": [
              {
                "failoverUrls": [],
                "networkClientId": "megaeth-testnet-v2",
                "type": "custom",
                "url": "https://carrot.megaeth.com/rpc",
              },
            ],
          },
          "0x2105": {
            "blockExplorerUrls": [
              "https://basescan.org",
            ],
            "chainId": "0x2105",
            "defaultBlockExplorerUrlIndex": 0,
            "defaultRpcEndpointIndex": 0,
            "name": "Base",
            "nativeCurrency": "ETH",
            "rpcEndpoints": [
              {
                "failoverUrls": [],
                "networkClientId": "base-mainnet-alchemy",
                "type": "custom",
                "url": "https://base-mainnet.g.alchemy.com/v2/{alchemyApiKey}",
              },
            ],
          },
          "0x279f": {
            "blockExplorerUrls": [
              "https://testnet.monadexplorer.com",
            ],
            "chainId": "0x279f",
            "defaultBlockExplorerUrlIndex": 0,
            "defaultRpcEndpointIndex": 0,
            "name": "Monad Testnet",
            "nativeCurrency": "MON",
            "rpcEndpoints": [
              {
                "failoverUrls": [],
                "networkClientId": "monad-testnet",
                "type": "custom",
                "url": "https://testnet-rpc.monad.xyz",
              },
            ],
          },
          "0x38": {
            "blockExplorerUrls": [
              "https://bscscan.com",
            ],
            "chainId": "0x38",
            "defaultBlockExplorerUrlIndex": 0,
            "defaultRpcEndpointIndex": 0,
            "name": "BNB Chain",
            "nativeCurrency": "BNB",
            "rpcEndpoints": [
              {
                "failoverUrls": [],
                "networkClientId": "bsc-mainnet-alchemy",
                "type": "custom",
                "url": "https://bnb-mainnet.g.alchemy.com/v2/{alchemyApiKey}",
              },
            ],
          },
          "0x539": {
            "blockExplorerUrls": [],
            "chainId": "0x539",
            "defaultRpcEndpointIndex": 0,
            "name": "Localhost 8545",
            "nativeCurrency": "ETH",
            "rpcEndpoints": [
              {
                "failoverUrls": [],
                "networkClientId": "networkConfigurationId",
                "type": "custom",
                "url": "http://localhost:8545",
              },
            ],
          },
          "0x89": {
            "blockExplorerUrls": [
              "https://polygonscan.com",
            ],
            "chainId": "0x89",
            "defaultBlockExplorerUrlIndex": 0,
            "defaultRpcEndpointIndex": 0,
            "name": "Polygon",
            "nativeCurrency": "POL",
            "rpcEndpoints": [
              {
                "failoverUrls": [],
                "networkClientId": "polygon-mainnet-alchemy",
                "type": "custom",
                "url": "https://polygon-mainnet.g.alchemy.com/v2/{alchemyApiKey}",
              },
            ],
          },
          "0xa": {
            "blockExplorerUrls": [
              "https://optimistic.etherscan.io",
            ],
            "chainId": "0xa",
            "defaultBlockExplorerUrlIndex": 0,
            "defaultRpcEndpointIndex": 0,
            "name": "OP",
            "nativeCurrency": "ETH",
            "rpcEndpoints": [
              {
                "failoverUrls": [],
                "networkClientId": "optimism-mainnet-alchemy",
                "type": "custom",
                "url": "https://opt-mainnet.g.alchemy.com/v2/{alchemyApiKey}",
              },
            ],
          },
          "0xa4b1": {
            "blockExplorerUrls": [
              "https://arbiscan.io",
            ],
            "chainId": "0xa4b1",
            "defaultBlockExplorerUrlIndex": 0,
            "defaultRpcEndpointIndex": 0,
            "name": "Arbitrum",
            "nativeCurrency": "ETH",
            "rpcEndpoints": [
              {
                "failoverUrls": [],
                "networkClientId": "arbitrum-mainnet-alchemy",
                "type": "custom",
                "url": "https://arb-mainnet.g.alchemy.com/v2/{alchemyApiKey}",
              },
            ],
          },
          "0xaa36a7": {
            "blockExplorerUrls": [
              "https://sepolia.etherscan.io",
            ],
            "chainId": "0xaa36a7",
            "defaultBlockExplorerUrlIndex": 0,
            "defaultRpcEndpointIndex": 0,
            "name": "Sepolia",
            "nativeCurrency": "SepoliaETH",
            "rpcEndpoints": [
              {
                "failoverUrls": [],
                "networkClientId": "sepolia-alchemy",
                "type": "custom",
                "url": "https://eth-sepolia.g.alchemy.com/v2/{alchemyApiKey}",
              },
            ],
          },
          "0xe705": {
            "blockExplorerUrls": [
              "https://sepolia.lineascan.build",
            ],
            "chainId": "0xe705",
            "defaultBlockExplorerUrlIndex": 0,
            "defaultRpcEndpointIndex": 0,
            "name": "Linea Sepolia",
            "nativeCurrency": "LineaETH",
            "rpcEndpoints": [
              {
                "failoverUrls": [],
                "networkClientId": "linea-sepolia-alchemy",
                "type": "custom",
                "url": "https://linea-sepolia.g.alchemy.com/v2/{alchemyApiKey}",
              },
            ],
          },
          "0xe708": {
            "blockExplorerUrls": [
              "https://lineascan.build",
            ],
            "chainId": "0xe708",
            "defaultBlockExplorerUrlIndex": 0,
            "defaultRpcEndpointIndex": 0,
            "name": "Linea",
            "nativeCurrency": "ETH",
            "rpcEndpoints": [
              {
                "failoverUrls": [],
                "networkClientId": "linea-mainnet-alchemy",
                "type": "custom",
                "url": "https://linea-mainnet.g.alchemy.com/v2/{alchemyApiKey}",
              },
            ],
          },
        },
        "networksMetadata": {},
        "selectedNetworkClientId": "networkConfigurationId",
      }
    `);
  });

  it('normalizes persisted Sepolia custom RPC state to a non-Infura network client ID', () => {
    const request = getInitRequestMock();
    request.persistedState = {
      NetworkController: {
        selectedNetworkClientId: 'sepolia',
        networksMetadata: {},
        networkConfigurationsByChainId: {
          '0x1': {
            chainId: '0x1',
            name: 'Ethereum',
            nativeCurrency: 'ETH',
            blockExplorerUrls: ['https://etherscan.io'],
            defaultBlockExplorerUrlIndex: 0,
            defaultRpcEndpointIndex: 0,
            rpcEndpoints: [
              {
                networkClientId: 'mainnet',
                url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
                type: 'infura',
                failoverUrls: [],
              },
            ],
          },
          '0xaa36a7': {
            chainId: '0xaa36a7',
            name: 'Sepolia',
            nativeCurrency: 'SepoliaETH',
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
            defaultBlockExplorerUrlIndex: 0,
            defaultRpcEndpointIndex: 0,
            rpcEndpoints: [
              {
                networkClientId: 'sepolia',
                url: 'https://sepolia.infura.io/v3/{infuraProjectId}',
                type: 'infura',
                failoverUrls: [],
              },
            ],
          },
        },
      },
    };

    NetworkControllerInit(request);

    const controllerMock = jest.mocked(NetworkController);
    const initialState = controllerMock.mock.calls[0][0].state;
    expect(initialState.selectedNetworkClientId).toBe('sepolia-alchemy');
    expect(
      initialState.networkConfigurationsByChainId['0xaa36a7'].rpcEndpoints[0],
    ).toStrictEqual({
      failoverUrls: [],
      networkClientId: 'sepolia-alchemy',
      type: 'custom',
      url: 'https://eth-sepolia.g.alchemy.com/v2/{alchemyApiKey}',
    });
  });

  it('enables RPC failover when the `walletFrameworkRpcFailoverEnabled` feature flag is enabled', () => {
    const messenger = new Messenger<
      MockAnyNamespace,
      RemoteFeatureFlagControllerGetStateAction,
      ControllerStateChangeEvent<
        'RemoteFeatureFlagController',
        RemoteFeatureFlagControllerState
      >
    >({ namespace: MOCK_ANY_NAMESPACE });

    const request = getInitRequestMock(messenger);

    const { messengerClient } = NetworkControllerInit(request);
    expect(messengerClient.enableRpcFailover).not.toHaveBeenCalled();

    messenger.publish(
      'RemoteFeatureFlagController:stateChange',
      // @ts-expect-error: Partial mock.
      {
        remoteFeatureFlags: {
          walletFrameworkRpcFailoverEnabled: true,
        },
      },
      [],
    );

    expect(messengerClient.enableRpcFailover).toHaveBeenCalled();
  });

  it('disables RPC failover when the `walletFrameworkRpcFailoverEnabled` feature flag is disabled', () => {
    const messenger = new Messenger<
      MockAnyNamespace,
      RemoteFeatureFlagControllerGetStateAction,
      ControllerStateChangeEvent<
        'RemoteFeatureFlagController',
        RemoteFeatureFlagControllerState
      >
    >({ namespace: MOCK_ANY_NAMESPACE });

    const request = getInitRequestMock(messenger);

    const { messengerClient } = NetworkControllerInit(request);
    expect(messengerClient.disableRpcFailover).not.toHaveBeenCalled();

    messenger.publish(
      'RemoteFeatureFlagController:stateChange',
      // @ts-expect-error: Partial mock.
      {
        remoteFeatureFlags: {
          walletFrameworkRpcFailoverEnabled: false,
        },
      },
      [],
    );

    expect(messengerClient.disableRpcFailover).toHaveBeenCalled();
  });
});
