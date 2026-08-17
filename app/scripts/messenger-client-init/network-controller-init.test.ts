import {
  ActionConstraint,
  MOCK_ANY_NAMESPACE,
  Messenger,
  MockAnyNamespace,
} from '@metamask/messenger';
import {
  NetworkController,
  NetworkControllerMessenger,
  RpcEndpointType,
} from '@metamask/network-controller';
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
  messenger = new Messenger<MockAnyNamespace, ActionConstraint, never>({
    namespace: MOCK_ANY_NAMESPACE,
  }),
): jest.Mocked<
  MessengerClientInitRequest<
    NetworkControllerMessenger,
    NetworkControllerInitMessenger
  >
> {
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
      isRpcFailoverEnabled: false,
    });
  });

  it('sets the default state for the controller', () => {
    NetworkControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(NetworkController);
    const initialState = controllerMock.mock.calls[0][0].state;
    expect(
      initialState?.networkConfigurationsByChainId?.['0x14a34'],
    ).toStrictEqual({
      chainId: '0x14a34',
      name: 'Base Sepolia',
      nativeCurrency: 'ETH',
      blockExplorerUrls: ['https://sepolia.basescan.org'],
      defaultBlockExplorerUrlIndex: 0,
      defaultRpcEndpointIndex: 0,
      rpcEndpoints: [
        {
          networkClientId: 'base-sepolia-alchemy',
          url: 'https://base-sepolia.g.alchemy.com/v2/{alchemyApiKey}',
          type: 'custom',
          failoverUrls: [],
        },
      ],
    });
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
          "0x10e6": {
            "blockExplorerUrls": [
              "https://megaeth.blockscout.com",
            ],
            "chainId": "0x10e6",
            "defaultBlockExplorerUrlIndex": 0,
            "defaultRpcEndpointIndex": 0,
            "name": "MegaETH Mainnet",
            "nativeCurrency": "ETH",
            "rpcEndpoints": [
              {
                "failoverUrls": [],
                "networkClientId": "megaeth-mainnet",
                "type": "infura",
                "url": "https://megaeth-mainnet.infura.io/v3/{infuraProjectId}",
              },
            ],
          },
          "0x14a34": {
            "blockExplorerUrls": [
              "https://sepolia.basescan.org",
            ],
            "chainId": "0x14a34",
            "defaultBlockExplorerUrlIndex": 0,
            "defaultRpcEndpointIndex": 0,
            "name": "Base Sepolia",
            "nativeCurrency": "ETH",
            "rpcEndpoints": [
              {
                "failoverUrls": [],
                "networkClientId": "base-sepolia-alchemy",
                "type": "custom",
                "url": "https://base-sepolia.g.alchemy.com/v2/{alchemyApiKey}",
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
        "selectedNetworkClientId": "sepolia-alchemy",
      }
    `);
  });

  it('selects Ethereum mainnet for a new production wallet', () => {
    const originalInTest = process.env.IN_TEST;
    const originalMetamaskDebug = process.env.METAMASK_DEBUG;
    const originalMetamaskEnvironment = process.env.METAMASK_ENVIRONMENT;
    delete process.env.IN_TEST;
    delete process.env.METAMASK_DEBUG;
    delete process.env.METAMASK_ENVIRONMENT;

    try {
      NetworkControllerInit(getInitRequestMock());

      const controllerMock = jest.mocked(NetworkController);
      expect(
        controllerMock.mock.calls[0]?.[0].state?.selectedNetworkClientId,
      ).toBe('mainnet-alchemy');
    } finally {
      if (originalInTest === undefined) {
        delete process.env.IN_TEST;
      } else {
        process.env.IN_TEST = originalInTest;
      }
      if (originalMetamaskDebug === undefined) {
        delete process.env.METAMASK_DEBUG;
      } else {
        process.env.METAMASK_DEBUG = originalMetamaskDebug;
      }
      if (originalMetamaskEnvironment === undefined) {
        delete process.env.METAMASK_ENVIRONMENT;
      } else {
        process.env.METAMASK_ENVIRONMENT = originalMetamaskEnvironment;
      }
    }
  });

  it('replaces a persisted localhost selection with Sepolia', () => {
    const request = getInitRequestMock();
    request.persistedState = {
      NetworkController: {
        selectedNetworkClientId: 'local-rpc',
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
                type: RpcEndpointType.Custom,
                failoverUrls: [],
              },
            ],
          },
          '0x539': {
            chainId: '0x539',
            name: 'Localhost 8545',
            nativeCurrency: 'ETH',
            blockExplorerUrls: [],
            defaultBlockExplorerUrlIndex: 0,
            defaultRpcEndpointIndex: 0,
            rpcEndpoints: [
              {
                networkClientId: 'local-rpc',
                url: 'http://localhost:8545',
                type: RpcEndpointType.Custom,
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
                type: RpcEndpointType.Custom,
                failoverUrls: [],
              },
            ],
          },
        },
      },
    };

    NetworkControllerInit(request);

    const controllerMock = jest.mocked(NetworkController);
    expect(
      controllerMock.mock.calls[0]?.[0].state?.selectedNetworkClientId,
    ).toBe('sepolia-alchemy');
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
                type: RpcEndpointType.Custom,
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
                type: RpcEndpointType.Custom,
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
    expect(initialState).toBeDefined();
    expect(initialState?.selectedNetworkClientId).toBe('sepolia-alchemy');
    expect(
      initialState?.networkConfigurationsByChainId?.['0xaa36a7']
        ?.rpcEndpoints[0],
    ).toStrictEqual({
      failoverUrls: [],
      networkClientId: 'sepolia-alchemy',
      type: 'custom',
      url: 'https://eth-sepolia.g.alchemy.com/v2/{alchemyApiKey}',
    });
  });

  it('preserves a persisted mainnet selection and adds Base Sepolia', () => {
    const request = getInitRequestMock();
    request.persistedState = {
      NetworkController: {
        selectedNetworkClientId: 'mainnet',
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
                type: RpcEndpointType.Custom,
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
                type: RpcEndpointType.Custom,
                failoverUrls: [],
              },
            ],
          },
        },
      },
    };

    NetworkControllerInit(request);

    const controllerMock = jest.mocked(NetworkController);
    expect(
      controllerMock.mock.calls[0]?.[0].state?.selectedNetworkClientId,
    ).toBe('mainnet-alchemy');
    expect(
      controllerMock.mock.calls[0]?.[0].state?.networkConfigurationsByChainId?.[
        '0x14a34'
      ],
    ).toMatchObject({
      chainId: '0x14a34',
      name: 'Base Sepolia',
      rpcEndpoints: [
        expect.objectContaining({
          networkClientId: 'base-sepolia-alchemy',
          url: 'https://base-sepolia.g.alchemy.com/v2/{alchemyApiKey}',
        }),
      ],
    });
  });
});
