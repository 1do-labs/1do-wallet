import {
  AlchemyTokenPricesService,
  resetAlchemyTokenPricesServiceCache,
} from './alchemy-token-prices-service';

const fetchMock = jest.fn();

describe('AlchemyTokenPricesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAlchemyTokenPricesServiceCache();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('fetchTokenPrices', () => {
    it('returns token prices from Alchemy in USD', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              network: 'eth-mainnet',
              address: '0x0000000000000000000000000000000000000001',
              prices: [{ currency: 'USD', value: '12.5' }],
            },
          ],
        }),
      );
      const service = new AlchemyTokenPricesService('test-key');

      const result = await service.fetchTokenPrices({
        assets: [
          {
            chainId: '0x1',
            tokenAddress: '0x0000000000000000000000000000000000000001',
          },
        ],
        currency: 'usd',
      });

      expect(result).toEqual([
        expect.objectContaining({
          chainId: '0x1',
          tokenAddress: '0x0000000000000000000000000000000000000001',
          currency: 'usd',
          price: 12.5,
          pricePercentChange1d: undefined,
        }),
      ]);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.g.alchemy.com/prices/v1/test-key/tokens/by-address',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('converts USD token prices to the selected fiat currency', async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({ result: 'success', rates: { CNY: 7 } }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            data: [
              {
                network: 'base-mainnet',
                address: '0x0000000000000000000000000000000000000002',
                prices: [{ currency: 'usd', value: '2' }],
              },
            ],
          }),
        );
      const service = new AlchemyTokenPricesService('test-key');

      const result = await service.fetchTokenPrices({
        assets: [
          {
            chainId: '0x2105',
            tokenAddress: '0x0000000000000000000000000000000000000002',
          },
        ],
        currency: 'cny',
      });

      expect(result[0].price).toBe(14);
    });

    it('ignores chains that are not supported by Alchemy Prices API', async () => {
      const service = new AlchemyTokenPricesService('test-key');

      const result = await service.fetchTokenPrices({
        assets: [
          {
            chainId: '0x1234',
            tokenAddress: '0x0000000000000000000000000000000000000001',
          },
        ],
        currency: 'usd',
      });

      expect(result).toStrictEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('fetchExchangeRates', () => {
    it('returns native asset prices converted to fiat', async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({ result: 'success', rates: { CNY: 7 } }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            data: [
              {
                symbol: 'ETH',
                prices: [{ currency: 'USD', value: '2000' }],
              },
            ],
          }),
        );
      const service = new AlchemyTokenPricesService('test-key');

      const result = await service.fetchExchangeRates({
        baseCurrency: 'cny',
        includeUsdRate: true,
        cryptocurrencies: ['ETH'],
      });

      expect(result).toStrictEqual({
        eth: {
          name: 'ETH',
          ticker: 'ETH',
          value: 1 / 14000,
          currencyType: 'crypto',
          usd: 1 / 2000,
        },
      });
    });

    it('converts native asset prices to another crypto asset', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ result: 'success', rates: {} }))
        .mockResolvedValueOnce(
          jsonResponse({
            data: [
              {
                symbol: 'ETH',
                prices: [{ currency: 'USD', value: '2000' }],
              },
              {
                symbol: 'BTC',
                prices: [{ currency: 'USD', value: '50000' }],
              },
            ],
          }),
        );
      const service = new AlchemyTokenPricesService('test-key');

      const result = await service.fetchExchangeRates({
        baseCurrency: 'btc',
        includeUsdRate: false,
        cryptocurrencies: ['ETH'],
      });

      expect(result.eth.value).toBe(25);
      expect(result.eth.usd).toBeUndefined();
    });

    it('returns reciprocal native asset prices when the display currency is USD', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              symbol: 'ETH',
              prices: [{ currency: 'USD', value: '2000' }],
            },
          ],
        }),
      );
      const service = new AlchemyTokenPricesService('test-key');

      const result = await service.fetchExchangeRates({
        baseCurrency: 'usd',
        includeUsdRate: true,
        cryptocurrencies: ['ETH'],
      });

      expect(result.eth).toEqual({
        name: 'ETH',
        ticker: 'ETH',
        value: 1 / 2000,
        currencyType: 'crypto',
        usd: 1 / 2000,
      });
    });
  });

  describe('fetchHistoricalPrices', () => {
    it('returns address history from Alchemy', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          data: [{ value: '10.5', timestamp: '2023-11-14T00:00:00.000Z' }],
        }),
      );
      const service = new AlchemyTokenPricesService('test-key');

      const result = await service.fetchHistoricalPrices({
        chainId: '0x1',
        address: '0x0000000000000000000000000000000000000001',
        currency: 'usd',
        timePeriod: '7D',
      });

      expect(result).toStrictEqual({
        prices: [[Date.parse('2023-11-14T00:00:00.000Z'), 10.5]],
      });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.g.alchemy.com/prices/v1/test-key/tokens/historical',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('validation', () => {
    it('accepts supported EVM chains and currency codes', () => {
      const service = new AlchemyTokenPricesService('test-key');

      expect(service.validateChainIdSupported('0x1')).toBe(true);
      expect(service.validateChainIdSupported('0x1234')).toBe(false);
      expect(service.validateCurrencySupported('cny')).toBe(true);
      expect(service.validateCurrencySupported('invalid currency')).toBe(false);
    });
  });

  describe('errors', () => {
    it('rejects price requests when the Alchemy API key is missing', async () => {
      const service = new AlchemyTokenPricesService(undefined);

      await expect(
        service.fetchExchangeRates({
          baseCurrency: 'usd',
          includeUsdRate: true,
          cryptocurrencies: ['ETH'],
        }),
      ).rejects.toThrow('Alchemy API key is required for token prices');
    });

    it('rejects invalid API responses', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ invalid: true }));
      const service = new AlchemyTokenPricesService('test-key');

      await expect(
        service.fetchTokenPrices({
          assets: [
            {
              chainId: '0x1',
              tokenAddress: '0x0000000000000000000000000000000000000001',
            },
          ],
          currency: 'usd',
        }),
      ).rejects.toThrow('Alchemy address prices response is invalid');
    });
  });
});

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  } as Response;
}
