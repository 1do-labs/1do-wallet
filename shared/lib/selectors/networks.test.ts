import mockState from '../../../test/data/mock-state.json';
import {
  ARBITRUM_DISPLAY_NAME,
  BNB_DISPLAY_NAME,
  CAIP_FORMATTED_TEST_CHAINS,
  GOERLI_DISPLAY_NAME,
  POLYGON_DISPLAY_NAME,
} from '../../constants/network';
import {
  getNonTestNetworks,
  getNetworksByScopes,
  MultichainNetworkConfigurationsByChainIdState,
} from './networks';

const typedMockState =
  mockState as unknown as MultichainNetworkConfigurationsByChainIdState & {
    metamask: {
      internalAccounts: import('@metamask/accounts-controller').AccountsControllerState['internalAccounts'];
    };
  };

describe('Network Selectors', () => {
  describe('getNonTestNetworks', () => {
    it('returns non-test networks from the state', () => {
      const result = getNonTestNetworks(typedMockState);

      expect(result).toHaveLength(5);
      expect(result).toStrictEqual([
        {
          blockExplorerUrls: [],
          caipChainId: 'eip155:1',
          chainId: '0x1',
          defaultRpcEndpointIndex: 0,
          name: 'Custom Mainnet RPC',
          nativeCurrency: 'ETH',
          rpcEndpoints: [
            {
              networkClientId: 'testNetworkConfigurationId',
              type: 'custom',
              url: 'https://testrpc.com',
            },
          ],
          ticker: 'ETH',
        },
        {
          blockExplorerUrls: [],
          caipChainId: 'eip155:5',
          chainId: '0x5',
          defaultRpcEndpointIndex: 0,
          name: GOERLI_DISPLAY_NAME,
          nativeCurrency: 'ETH',
          rpcEndpoints: [
            {
              networkClientId: 'goerli',
              type: 'custom',
              url: 'https://goerli.com',
            },
          ],
          ticker: 'ETH',
        },
        {
          blockExplorerUrls: ['https://bscscan.com/'],
          caipChainId: 'eip155:56',
          chainId: '0x38',
          defaultBlockExplorerUrlIndex: 0,
          defaultRpcEndpointIndex: 0,
          lastUpdatedAt: 1738689643708,
          name: BNB_DISPLAY_NAME,
          nativeCurrency: 'BNB',
          rpcEndpoints: [
            {
              networkClientId: 'ae8c8c36-7478-42bf-9b1a-610c81380000',
              type: 'custom',
              url: 'https://bsc-dataseed.binance.org/',
            },
          ],
        },
        {
          blockExplorerUrls: ['https://polygonscan.com/'],
          caipChainId: 'eip155:137',
          chainId: '0x89',
          defaultBlockExplorerUrlIndex: 0,
          defaultRpcEndpointIndex: 0,
          lastUpdatedAt: 1738689655105,
          name: POLYGON_DISPLAY_NAME,
          nativeCurrency: 'POL',
          rpcEndpoints: [
            {
              networkClientId: 'b46d8e79-ebf2-4fdc-8cb9-45610e990000',
              type: 'custom',
              url: 'https://polygon-mainnet.infura.io/v3/',
            },
          ],
        },
        {
          blockExplorerUrls: ['https://explorer.arbitrum.io'],
          caipChainId: 'eip155:42161',
          chainId: '0xa4b1',
          defaultBlockExplorerUrlIndex: 0,
          defaultRpcEndpointIndex: 0,
          lastUpdatedAt: 1738689624782,
          name: ARBITRUM_DISPLAY_NAME,
          nativeCurrency: 'ETH',
          rpcEndpoints: [
            {
              networkClientId: '100849a6-a63c-4ebd-9bbe-0c84134d0000',
              type: 'custom',
              url: 'https://arbitrum-mainnet.infura.io/v3/',
            },
          ],
        },
      ]);

      const testNetworkIds = result.filter(
        (network) =>
          network.caipChainId &&
          CAIP_FORMATTED_TEST_CHAINS.includes(network.caipChainId),
      );
      expect(testNetworkIds).toHaveLength(0);
    });
  });

  describe('getNetworksByScopes', () => {
    it('returns empty array if scopes is undefined', () => {
      // @ts-expect-error Passing wrong type is intentional for testing
      const result = getNetworksByScopes(typedMockState, undefined);
      expect(result).toStrictEqual([]);
    });

    it('returns empty array if scopes is empty array', () => {
      const result = getNetworksByScopes(typedMockState, []);
      expect(result).toStrictEqual([]);
    });

    it('returns specific network by caip chainId scope', () => {
      const result = getNetworksByScopes(typedMockState, ['eip155:1']);

      expect(result).toContainEqual(
        expect.objectContaining({
          chainId: '0x1',
          name: 'Custom Mainnet RPC',
        }),
      );
    });

    it('returns all EVM networks when scope is eip155:0', () => {
      const result = getNetworksByScopes(typedMockState, ['eip155:0']);

      expect(result).toHaveLength(5);

      result.forEach((network) => {
        const evmChainId = `eip155:${network.chainId}`;

        expect(CAIP_FORMATTED_TEST_CHAINS).not.toContain(evmChainId);
        expect(network.chainId).toMatch(/^0x[0-9a-f]+$/iu);
      });
    });

    it('returns multiple networks for multiple scopes', () => {
      const scopes = ['eip155:0', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'];
      const result = getNetworksByScopes(typedMockState, scopes);

      expect(result).toHaveLength(5);
      expect(result).toStrictEqual([
        {
          chainId: '0x1',
          name: 'Custom Mainnet RPC',
        },
        {
          chainId: '0x5',
          name: GOERLI_DISPLAY_NAME,
        },
        {
          chainId: '0x38',
          name: BNB_DISPLAY_NAME,
        },
        {
          chainId: '0x89',
          name: POLYGON_DISPLAY_NAME,
        },
        {
          chainId: '0xa4b1',
          name: ARBITRUM_DISPLAY_NAME,
        },
      ]);
    });
  });
});
