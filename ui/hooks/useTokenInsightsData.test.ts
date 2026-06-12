import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { isNativeAddress } from '@metamask/bridge-controller';
import { isEvmChainId } from '../../shared/lib/asset-utils';
import { formatCompactCurrency } from '../helpers/utils/token-insights';
import { useFormatters } from './useFormatters';
import {
  useTokenInsightsData,
  TokenInsightsToken,
} from './useTokenInsightsData';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../selectors', () => ({
  getMarketData: jest.fn((state) => state.marketData),
}));

jest.mock('../ducks/metamask/metamask', () => ({
  getCurrentCurrency: jest.fn((state) => state.currentCurrency),
}));

jest.mock('../selectors/selectors', () => ({
  getCurrencyRates: jest.fn((state) => state.currencyRates),
}));

jest.mock('@metamask/bridge-controller', () => ({
  BridgeClientId: {
    EXTENSION: 'extension',
  },
  formatChainIdToCaip: jest.fn(),
  isNativeAddress: jest.fn(),
}));

jest.mock('@metamask/utils', () => ({
  isCaipChainId: jest.fn((chainId: string) => chainId.includes(':')),
  Hex: {},
}));

jest.mock('../../shared/lib/asset-utils', () => ({
  isEvmChainId: jest.fn(),
}));

jest.mock('./useFormatters', () => ({
  useFormatters: jest.fn(),
}));

jest.mock('../helpers/utils/token-insights', () => ({
  formatCompactCurrency: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;
const mockIsEvmChainId = isEvmChainId as jest.Mock;
const mockIsNativeAddress = isNativeAddress as jest.Mock;
const mockUseFormatters = useFormatters as jest.Mock;
const mockFormatCompactCurrency = formatCompactCurrency as jest.Mock;

describe('useTokenInsightsData', () => {
  const defaultToken: TokenInsightsToken = {
    address: '0x1234567890123456789012345678901234567890',
    symbol: 'TEST',
    name: 'Test Token',
    chainId: '0x1',
    iconUrl: 'https://example.com/icon.png',
  };

  const defaultMarketData = {
    price: 100,
    pricePercentChange1d: 5.25,
    totalVolume: 1000000,
    marketCap: 50000000,
    dilutedMarketCap: 55000000,
  };

  const mockEvmMarketData = {
    ...defaultMarketData,
    currency: 'ETH',
  };

  const defaultCurrencyRates = {
    ETH: { conversionRate: 2000 },
    BTC: { conversionRate: 40000 },
    TEST: { conversionRate: 100 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEvmChainId.mockReturnValue(true);
    mockIsNativeAddress.mockReturnValue(false);
    mockUseFormatters.mockReturnValue({
      formatCurrencyWithMinThreshold: jest
        .fn()
        .mockImplementation((value) => `$${value}`),
    });
    mockFormatCompactCurrency.mockImplementation((value) => {
      if (!value) {
        return '—';
      }
      return `$${(value / 1000000).toFixed(2)}M`;
    });
  });

  describe('EVM tokens with cache data', () => {
    it('should return cached market data for EVM tokens', () => {
      mockUseSelector
        .mockReturnValueOnce('USD') // getCurrentCurrency
        .mockReturnValueOnce(defaultCurrencyRates) // getCurrencyRates
        .mockReturnValueOnce({
          // getMarketData
          '0x1': {
            '0x1234567890123456789012345678901234567890': mockEvmMarketData,
          },
        });

      const { result } = renderHook(() => useTokenInsightsData(defaultToken));

      expect(result.current.marketData).toEqual({
        price: 100,
        pricePercentChange1d: 5.25,
        totalVolume: 1000000,
        marketCap: 50000000,
        dilutedMarketCap: 55000000,
      });
      expect(result.current.error).toBe(null);
    });

    it('should convert EVM token prices to fiat', () => {
      mockUseSelector
        .mockReturnValueOnce('USD') // getCurrentCurrency
        .mockReturnValueOnce(defaultCurrencyRates) // getCurrencyRates
        .mockReturnValueOnce({
          // getMarketData
          '0x1': {
            '0x1234567890123456789012345678901234567890': mockEvmMarketData,
          },
        });

      const { result } = renderHook(() => useTokenInsightsData(defaultToken));

      expect(result.current.marketDataFiat.price).toBe(200000);
      expect(result.current.marketDataFiat.volume).toBe(2000000000);
      expect(result.current.marketDataFiat.marketCap).toBe(110000000000);
      expect(result.current.marketDataFiat.formattedPrice).toBe('$200000');
      expect(result.current.marketDataFiat.formattedVolume).toBe('$2000.00M');
      expect(result.current.marketDataFiat.formattedMarketCap).toBe(
        '$110000.00M',
      );
    });

    it('should use diluted market cap when available', () => {
      mockUseSelector
        .mockReturnValueOnce('USD') // getCurrentCurrency
        .mockReturnValueOnce(defaultCurrencyRates) // getCurrencyRates
        .mockReturnValueOnce({
          // getMarketData
          '0x1': {
            '0x1234567890123456789012345678901234567890': {
              ...mockEvmMarketData,
              dilutedMarketCap: 60000000,
            },
          },
        });

      const { result } = renderHook(() => useTokenInsightsData(defaultToken));

      expect(result.current.marketData?.dilutedMarketCap).toBe(60000000);
    });

    it('should fallback to market cap when diluted market cap is not available', () => {
      mockUseSelector
        .mockReturnValueOnce('USD') // getCurrentCurrency
        .mockReturnValueOnce(defaultCurrencyRates) // getCurrencyRates
        .mockReturnValueOnce({
          // getMarketData
          '0x1': {
            '0x1234567890123456789012345678901234567890': {
              ...mockEvmMarketData,
              dilutedMarketCap: undefined,
            },
          },
        });

      const { result } = renderHook(() => useTokenInsightsData(defaultToken));

      expect(result.current.marketData?.dilutedMarketCap).toBe(50000000);
    });
  });

  describe('Native tokens', () => {
    beforeEach(() => {
      mockIsNativeAddress.mockReturnValue(true);
    });

    it('should identify native tokens correctly', () => {
      const nativeToken = {
        ...defaultToken,
        address: '0x0000000000000000000000000000000000000000',
      };

      const { result } = renderHook(() => useTokenInsightsData(nativeToken));

      expect(result.current.isNativeToken).toBe(true);
    });

    it('should use token symbol for native token currency conversion', () => {
      mockUseSelector
        .mockReturnValueOnce('USD') // getCurrentCurrency
        .mockReturnValueOnce({
          // getCurrencyRates
          ETH: { conversionRate: 2000 },
        })
        .mockReturnValueOnce({
          // getMarketData
          '0x1': {
            '0x0000000000000000000000000000000000000000': {
              price: 1,
              currency: 'USD',
            },
          },
        });

      const nativeToken = {
        ...defaultToken,
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
      };

      const { result } = renderHook(() => useTokenInsightsData(nativeToken));

      expect(result.current.marketDataFiat.price).toBe(2000);
      expect(result.current.marketDataFiat.formattedPrice).toBe('$2000');
    });
  });

  describe('Currency conversion', () => {
    it('should handle missing exchange rate', () => {
      mockUseSelector
        .mockReturnValueOnce('USD') // getCurrentCurrency
        .mockReturnValueOnce({}) // getCurrencyRates - No rates available
        .mockReturnValueOnce({
          // getMarketData
          '0x1': {
            '0x1234567890123456789012345678901234567890': mockEvmMarketData,
          },
        });

      const { result } = renderHook(() => useTokenInsightsData(defaultToken));

      // Should use direct values without conversion
      expect(result.current.marketDataFiat.price).toBe(100);
      expect(result.current.marketDataFiat.formattedPrice).toBe('$100');
    });

    it('should handle null values in market data', () => {
      mockUseSelector
        .mockReturnValueOnce('USD') // getCurrentCurrency
        .mockReturnValueOnce(defaultCurrencyRates) // getCurrencyRates
        .mockReturnValueOnce({
          // getMarketData
          '0x1': {
            '0x1234567890123456789012345678901234567890': {
              price: null,
              totalVolume: null,
              marketCap: null,
              currency: 'ETH',
            },
          },
        });

      const { result } = renderHook(() => useTokenInsightsData(defaultToken));

      expect(result.current.marketDataFiat.price).toBeUndefined();
      expect(result.current.marketDataFiat.volume).toBeUndefined();
      expect(result.current.marketDataFiat.marketCap).toBeUndefined();
      expect(result.current.marketDataFiat.formattedPrice).toBe('—');
      expect(result.current.marketDataFiat.formattedVolume).toBe('—');
      expect(result.current.marketDataFiat.formattedMarketCap).toBe('—');
    });
  });

  describe('Edge cases', () => {
    it('should handle null token input', () => {
      const { result } = renderHook(() => useTokenInsightsData(null));

      expect(result.current.marketData).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.isNativeToken).toBe(false);
    });

    it('should handle token without address', () => {
      mockUseSelector
        .mockReturnValueOnce('USD') // getCurrentCurrency
        .mockReturnValueOnce(defaultCurrencyRates) // getCurrencyRates
        .mockReturnValueOnce(null); // getMarketData

      const tokenWithoutAddress = {
        ...defaultToken,
        address: '',
      };

      const { result } = renderHook(() =>
        useTokenInsightsData(tokenWithoutAddress),
      );

      expect(result.current.isNativeToken).toBe(false);
    });

    it('should handle CAIP chain IDs without remote fetches', () => {
      mockUseSelector
        .mockReturnValueOnce('USD') // getCurrentCurrency
        .mockReturnValueOnce(defaultCurrencyRates) // getCurrencyRates
        .mockReturnValueOnce(null); // getMarketData

      const tokenWithCaipChainId = {
        ...defaultToken,
        chainId: 'eip155:1',
      };

      const { result } = renderHook(() =>
        useTokenInsightsData(tokenWithCaipChainId),
      );

      expect(result.current.marketData).toBeNull();
    });

    it('should not fetch when token is in cache for EVM', () => {
      mockUseSelector
        .mockReturnValueOnce('USD') // getCurrentCurrency
        .mockReturnValueOnce(defaultCurrencyRates) // getCurrencyRates
        .mockReturnValueOnce({
          // getMarketData
          '0x1': {
            '0x1234567890123456789012345678901234567890': mockEvmMarketData,
          },
        });

      renderHook(() => useTokenInsightsData(defaultToken));
    });
  });
});
