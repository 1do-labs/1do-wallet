import {
  type NetworkConfiguration,
  RpcEndpointType,
  NetworkStatus,
} from '@metamask/network-controller';
import {
  type Hex,
  type CaipChainId,
  KnownCaipNamespace,
} from '@metamask/utils';
import { type MultichainNetworkConfiguration } from '@metamask/multichain-network-controller';

import { type NetworkState } from '../../../shared/lib/selectors/networks';
import type { AccountsState } from '../accounts';
import { MOCK_ACCOUNT_EOA } from '../../../test/data/mock-accounts';
import { RemoteFeatureFlagsState } from '../remote-feature-flags';
import {
  type MultichainNetworkControllerState,
  getNonEvmMultichainNetworkConfigurationsByChainId,
  getMultichainNetworkConfigurationsByChainId,
  getMultichainNetworkConfigurationsTuple,
  getSelectedMultichainNetworkChainId,
  getSelectedMultichainNetworkConfiguration,
  getIsEvmMultichainNetworkSelected,
  selectFirstUnavailableEvmNetwork,
  getEvmMultichainNetworkConfigurations,
  getAllMultichainNetworkConfigurations,
} from './networks';

jest.mock('../../../shared/lib/selectors/multichain', () => ({
  getEnabledNetworks: jest.fn(
    (state) => state.metamask.enabledNetworkMap ?? { eip155: {} },
  ),
}));

type TestState = AccountsState &
  MultichainNetworkControllerState &
  NetworkState &
  RemoteFeatureFlagsState;

const mockEvmNetworksWithNewConfig: Record<
  CaipChainId,
  MultichainNetworkConfiguration
> = {
  'eip155:1': {
    chainId: 'eip155:1',
    name: 'Ethereum Mainnet',
    nativeCurrency: 'ETH',
    blockExplorerUrls: ['https://etherscan.io'],
    defaultBlockExplorerUrlIndex: 0,
    isEvm: true,
  },
  'eip155:11155111': {
    chainId: 'eip155:11155111',
    name: 'Sepolia',
    nativeCurrency: 'SepoliaETH',
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    defaultBlockExplorerUrlIndex: 0,
    isEvm: true,
  },
};

const mockEvmNetworksWithOldConfig: Record<Hex, NetworkConfiguration> = {
  '0x1': {
    chainId: '0x1',
    name: 'Ethereum Mainnet',
    nativeCurrency: 'ETH',
    rpcEndpoints: [
      {
        networkClientId: 'mainnet',
        type: RpcEndpointType.Infura,
        url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
      },
    ],
    defaultRpcEndpointIndex: 0,
    blockExplorerUrls: ['https://etherscan.io'],
    defaultBlockExplorerUrlIndex: 0,
    lastUpdatedAt: 1739466375574,
  },
  '0xaa36a7': {
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    chainId: '0xaa36a7',
    defaultBlockExplorerUrlIndex: 0,
    defaultRpcEndpointIndex: 0,
    name: 'Sepolia',
    nativeCurrency: 'SepoliaETH',
    rpcEndpoints: [
      {
        networkClientId: 'sepolia',
        type: RpcEndpointType.Infura,
        url: 'https://sepolia.infura.io/v3/{infuraProjectId}',
      },
    ],
  },
};

const mockState: TestState = {
  metamask: {
    remoteFeatureFlags: {},
    multichainNetworkConfigurationsByChainId: {},
    selectedMultichainNetworkChainId: 'solana:ignored' as CaipChainId,
    isEvmSelected: false,
    selectedNetworkClientId: 'mainnet',
    networkConfigurationsByChainId: {
      ...mockEvmNetworksWithOldConfig,
    },
    networksMetadata: {
      mainnet: {
        EIPS: { 1559: true },
        status: NetworkStatus.Available,
      },
      sepolia: {
        EIPS: { 1559: true },
        status: NetworkStatus.Available,
      },
    },
    networksWithTransactionActivity: {},
    internalAccounts: {
      selectedAccount: MOCK_ACCOUNT_EOA.id,
      accounts: {
        [MOCK_ACCOUNT_EOA.id]: MOCK_ACCOUNT_EOA,
      },
    },
    accountIdByAddress: {
      [MOCK_ACCOUNT_EOA.address]: MOCK_ACCOUNT_EOA.id,
    },
  },
};

describe('Multichain network selectors', () => {
  describe('getNonEvmMultichainNetworkConfigurationsByChainId', () => {
    it('returns an empty object', () => {
      expect(
        getNonEvmMultichainNetworkConfigurationsByChainId(mockState),
      ).toStrictEqual({});
    });
  });

  describe('getMultichainNetworkConfigurationsByChainId', () => {
    it('returns only EVM multichain network configurations by chain ID', () => {
      expect(
        getMultichainNetworkConfigurationsByChainId(mockState),
      ).toStrictEqual(mockEvmNetworksWithNewConfig);
    });
  });

  describe('getMultichainNetworkConfigurationsTuple', () => {
    it('returns multichain and EVM network configurations', () => {
      expect(getMultichainNetworkConfigurationsTuple(mockState)).toStrictEqual(
        [mockEvmNetworksWithNewConfig, mockEvmNetworksWithOldConfig],
      );
    });
  });

  describe('getEvmMultichainNetworkConfigurations', () => {
    it('returns EVM networks in multichain format', () => {
      expect(getEvmMultichainNetworkConfigurations(mockState)).toStrictEqual(
        mockEvmNetworksWithNewConfig,
      );
    });
  });

  describe('getAllMultichainNetworkConfigurations', () => {
    it('returns all multichain networks as EVM-only', () => {
      expect(getAllMultichainNetworkConfigurations(mockState)).toStrictEqual(
        mockEvmNetworksWithNewConfig,
      );
    });
  });

  describe('getSelectedMultichainNetworkChainId', () => {
    it('returns the selected EVM multichain network chain ID', () => {
      expect(getSelectedMultichainNetworkChainId(mockState)).toStrictEqual(
        'eip155:1',
      );
    });
  });

  describe('getIsEvmMultichainNetworkSelected', () => {
    it('always returns true', () => {
      expect(getIsEvmMultichainNetworkSelected(mockState)).toStrictEqual(true);
    });
  });

  describe('getSelectedMultichainNetworkConfiguration', () => {
    it('returns the selected EVM multichain network configuration', () => {
      expect(
        getSelectedMultichainNetworkConfiguration(mockState),
      ).toStrictEqual(mockEvmNetworksWithNewConfig['eip155:1']);
    });
  });

  describe('selectFirstUnavailableEvmNetwork', () => {
    it('returns the first unavailable enabled EVM network', () => {
      const mockStateWithMultipleUnavailableNetworks = {
        metamask: {
          enabledNetworkMap: {
            [KnownCaipNamespace.Eip155]: {
              '0x1': true,
              '0xaa36a7': true,
            },
          },
          networksMetadata: {
            mainnet: {
              EIPS: {},
              status: NetworkStatus.Unavailable,
            },
            sepolia: {
              EIPS: {},
              status: NetworkStatus.Blocked,
            },
          },
          networkConfigurationsByChainId: {
            '0x1': {
              chainId: '0x1' as const,
              name: 'Ethereum Mainnet',
              nativeCurrency: 'ETH',
              rpcEndpoints: [
                {
                  type: RpcEndpointType.Infura as const,
                  url: 'https://mainnet.infura.io/v3/{infuraProjectId}' as const,
                  networkClientId: 'mainnet' as const,
                },
              ],
              defaultRpcEndpointIndex: 0,
              blockExplorerUrls: [],
              defaultBlockExplorerUrlIndex: 0,
            },
            '0xaa36a7': {
              chainId: '0xaa36a7' as const,
              name: 'Sepolia',
              nativeCurrency: 'SepoliaETH',
              rpcEndpoints: [
                {
                  type: RpcEndpointType.Infura as const,
                  url: 'https://sepolia.infura.io/v3/{infuraProjectId}' as const,
                  networkClientId: 'sepolia' as const,
                },
              ],
              defaultRpcEndpointIndex: 0,
              blockExplorerUrls: [],
              defaultBlockExplorerUrlIndex: 0,
            },
          },
          selectedNetworkClientId: 'mainnet',
        },
      };

      expect(
        selectFirstUnavailableEvmNetwork(
          mockStateWithMultipleUnavailableNetworks,
        ),
      ).toStrictEqual({
        networkName: 'Ethereum Mainnet',
        networkClientId: 'mainnet',
        chainId: '0x1',
        isInfuraEndpoint: true,
        infuraEndpointIndex: undefined,
      });
    });
  });
});
