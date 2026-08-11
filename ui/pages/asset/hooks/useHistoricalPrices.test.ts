import { waitFor } from '@testing-library/react';
import { renderHookWithProvider } from '../../../../test/lib/render-helpers-navigate';
import {
  DEFAULT_USE_HISTORICAL_PRICES_METADATA,
  useHistoricalPrices,
} from './useHistoricalPrices';

const mockFetchHistoricalPrices = jest.fn();

jest.mock('../../../../app/scripts/lib/alchemy-token-prices-service', () => ({
  AlchemyTokenPricesService: jest.fn().mockImplementation(() => ({
    fetchHistoricalPrices: mockFetchHistoricalPrices,
  })),
}));

/**
 * In these tests, we represent the price data with 1 point per day.
 * For instance P7D: [1, 100], [2, 102], [3, 102], [4, 105], [5, 99], [6, 102], [7, 100]
 */

const SEVEN_DAY_PRICES: [number, number][] = [
  [1, 100],
  [2, 102],
  [3, 102],
  [4, 105],
  [5, 99],
  [6, 102],
  [7, 100],
];

const SEVEN_DAY_POINTS = [
  { x: 1, y: 100 },
  { x: 2, y: 102 },
  { x: 3, y: 102 },
  { x: 4, y: 105 },
  { x: 5, y: 99 },
  { x: 6, y: 102 },
  { x: 7, y: 100 },
];

const SEVEN_DAY_METADATA = {
  minPricePoint: { x: 5, y: 99 },
  maxPricePoint: { x: 4, y: 105 },
  xMin: 1,
  xMax: 7,
  yMin: 99,
  yMax: 105,
};

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
        rpcEndpoints: [{ networkClientId: 'selectedNetworkClientId' }],
      },
    },
    currencyRates: { ETH: { conversionRate: 1 } },
    remoteFeatureFlags: {},
    useCurrencyRateCheck: true,
    internalAccounts: {
      accounts: {
        '81b1ead4-334c-4921-9adf-282fde539752': {
          id: '81b1ead4-334c-4921-9adf-282fde539752',
          address: '0x458036e7bc0612e9b207640dc07ca7711346aae5',
          type: 'eip155:eoa',
          scopes: ['eip155'],
        },
      },
      selectedAccount: '',
    },
    selectedAccountGroup: 'entropy:wallet1/0',
    accountTree: {
      wallets: {
        'entropy:wallet1': {
          id: 'entropy:wallet1',
          type: 'entropy',
          status: 'ready',
          groups: {
            'entropy:wallet1/0': {
              id: 'entropy:wallet1/0',
              type: 'multichainAccount',
              accounts: ['81b1ead4-334c-4921-9adf-282fde539752'],
              metadata: {
                name: 'Wallet 1',
                entropy: { groupIndex: 0 },
                pinned: false,
                hidden: false,
                lastSelected: 0,
              },
            },
          },
          metadata: {
            name: 'Wallet 1',
            entropy: { id: 'wallet1' },
          },
        },
      },
    },
  },
};

describe('useHistoricalPrices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchHistoricalPrices.mockResolvedValue({ prices: [] });
  });

  describe('EVM chain', () => {
    const chainId = '0x1';
    const address = '0x458036e7bc0612e9b207640dc07ca7711346aae5';
    const currency = 'usd';
    const timeRange = 'P7D';
    const state = {
      ...mockBaseState,
      metamask: {
        ...mockBaseState.metamask,
        internalAccounts: {
          ...mockBaseState.metamask.internalAccounts,
          selectedAccount: '81b1ead4-334c-4921-9adf-282fde539752',
        },
      },
    };

    it('returns loading true and default data initially', () => {
      const { result, unmount } = renderHookWithProvider(
        () => useHistoricalPrices({ chainId, address, currency, timeRange }),
        state,
      );

      expect(result.current).toEqual({
        loading: true,
        data: {
          prices: [],
          metadata: DEFAULT_USE_HISTORICAL_PRICES_METADATA,
        },
      });

      unmount();
    });

    it('returns historical prices on successful fetch', async () => {
      mockFetchHistoricalPrices.mockResolvedValue({
        prices: SEVEN_DAY_PRICES,
      });

      const { result } = renderHookWithProvider(
        () => useHistoricalPrices({ chainId, address, currency, timeRange }),
        state,
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current).toEqual({
        loading: false,
        data: { prices: SEVEN_DAY_POINTS, metadata: SEVEN_DAY_METADATA },
      });
    });

    it('requests Alchemy historical prices with EVM parameters', async () => {
      mockFetchHistoricalPrices.mockResolvedValue({
        prices: SEVEN_DAY_PRICES,
      });

      const { result } = renderHookWithProvider(
        () => useHistoricalPrices({ chainId, address, currency, timeRange }),
        state,
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetchHistoricalPrices).toHaveBeenCalledWith({
        chainId: '0x1',
        address,
        currency: 'usd',
        timePeriod: '7D',
      });
    });

    it('returns default data on fetch error', async () => {
      mockFetchHistoricalPrices.mockRejectedValue(new Error('Network error'));

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const { result } = renderHookWithProvider(
        () => useHistoricalPrices({ chainId, address, currency, timeRange }),
        state,
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current).toEqual({
        loading: false,
        data: {
          prices: [],
          metadata: DEFAULT_USE_HISTORICAL_PRICES_METADATA,
        },
      });

      consoleSpy.mockRestore();
    });
  });
});
