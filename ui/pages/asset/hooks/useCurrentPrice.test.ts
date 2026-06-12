/* eslint-disable @typescript-eslint/no-explicit-any */
import { AssetType } from '@metamask/bridge-controller';
import { EthScope } from '@metamask/keyring-api';
import { renderHookWithProvider } from '../../../../test/lib/render-helpers-navigate';
import { Asset } from '../types/asset';
import { useCurrentPrice } from './useCurrentPrice';

describe('useCurrentPrice', () => {
  const mockBaseState = {
    metamask: {
      isUnlocked: true,
      completedOnboarding: true,
      selectedNetworkClientId: 'selectedNetworkClientId',
      networkConfigurationsByChainId: {
        '0x1': {
          chainId: '0x1',
          name: 'Ethereum',
          nativeCurrency: 'ETH',
          isEvm: true,
          defaultRpcEndpointIndex: 0,
          rpcEndpoints: [
            {
              networkClientId: 'selectedNetworkClientId',
            },
          ],
        },
      },
      useCurrencyRateCheck: true,
      internalAccounts: {
        accounts: {
          '81b1ead4-334c-4921-9adf-282fde539752': {
            id: '81b1ead4-334c-4921-9adf-282fde539752',
            address: '0x458036e7bc0612e9b207640dc07ca7711346aae5',
            type: 'eip155:eoa',
            scopes: [EthScope.Eoa],
          },
        },
        selectedAccount: '', // To be set in each test
      },
    },
  };

  describe('when the chain is EVM', () => {
    const mockStateIsEvm = {
      metamask: {
        ...mockBaseState.metamask,
        currencyRates: {
          ETH: {
            conversionDate: 1745579164.04,
            conversionRate: 1776.47,
            usdConversionRate: 1776.47,
          },
          USDC: {
            conversionDate: 1745579164.04,
            conversionRate: 1,
            usdConversionRate: 1,
          },
        },
        marketData: {
          '0x1': {
            '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
              currency: 'USDC',
              tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              price: 0.9998967852645477,
            },
          },
        },
        internalAccounts: {
          ...mockBaseState.metamask.internalAccounts,
          selectedAccount: '',
        },
      },
    };

    it('returns the current price for a native asset', () => {
      const nativeAsset: Asset = {
        type: AssetType.native,
        isOriginalNativeSymbol: true,
        decimals: 18,
        chainId: '0x1',
        symbol: 'ETH',
        name: 'Ether',
        image: '',
      };

      const { result } = renderHookWithProvider(
        () => useCurrentPrice(nativeAsset),
        mockStateIsEvm,
      );

      expect(result.current.currentPrice).toBe(1776.47);
    });

    it('returns the current price for a token asset', () => {
      const tokenAsset: Asset = {
        chainId: '0x1',
        type: AssetType.token,
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        symbol: 'USDC',
        decimals: 6,
        name: 'USD Coin',
        image: '',
      };

      const { result } = renderHookWithProvider(
        () => useCurrentPrice(tokenAsset),
        mockStateIsEvm,
      );

      expect(result.current.currentPrice).toBe(0.9998967852645477);
    });

    it('returns undefined if market data is missing', () => {
      const tokenAssetMissingMarket: Asset = {
        chainId: '0x1',
        type: AssetType.token,
        address: '0xMissingTokenAddress', // An address not in marketData
        symbol: 'MISS',
        decimals: 18,
        name: 'Missing Token',
        image: '',
      };

      const { result } = renderHookWithProvider(
        () => useCurrentPrice(tokenAssetMissingMarket),
        mockStateIsEvm,
      );

      expect(result.current.currentPrice).toBeUndefined();
    });

    it('returns undefined if currency rate is missing', () => {
      const tokenAsset: Asset = {
        chainId: '0x1',
        type: AssetType.token,
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        symbol: 'USDC',
        decimals: 6,
        name: 'USD Coin',
        image: '',
      };

      const mockStateMissingRate = {
        metamask: {
          ...mockStateIsEvm.metamask,
          currencyRates: {},
        },
      };

      const { result } = renderHookWithProvider(
        () => useCurrentPrice(tokenAsset),
        mockStateMissingRate,
      );

      expect(result.current.currentPrice).toBeUndefined();
    });
  });
});
