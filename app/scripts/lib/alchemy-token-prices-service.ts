import type { MarketDataDetails } from '@metamask/assets-controllers';
import type { Hex } from '@metamask/utils';
import {
  ALCHEMY_API_KEY_PLACEHOLDER,
  alchemyApiKey,
} from '../../../shared/constants/network';

type Asset = {
  chainId: Hex;
  tokenAddress: Hex;
};

type AssetMarketData<Currency extends string> = Asset &
  MarketDataDetails & {
    currency: Currency;
  };

type ExchangeRate = {
  name: string;
  ticker: string;
  value: number;
  currencyType: string;
  usd?: number;
};

type AlchemyPrice = {
  currency: string;
  value: string;
};

type AlchemyAddressPrice = {
  address: string;
  network: string;
  prices: AlchemyPrice[];
};

type AlchemySymbolPrice = {
  symbol: string;
  prices: AlchemyPrice[];
};

type FiatRatesResponse = {
  result: string;
  rates: Record<string, number>;
};

export type HistoricalPricePoint = {
  value: string;
  timestamp: string;
};

const ALCHEMY_PRICE_API_BASE_URL = 'https://api.g.alchemy.com/prices/v1';
const FIAT_RATES_URL = 'https://open.er-api.com/v6/latest/USD';
const FIAT_RATES_CACHE_DURATION = 60 * 60 * 1000;
const MAX_ALCHEMY_ADDRESSES_PER_REQUEST = 25;

const CHAIN_ID_TO_ALCHEMY_NETWORK: Record<Hex, string> = {
  '0x1': 'eth-mainnet',
  '0xa': 'opt-mainnet',
  '0x38': 'bnb-mainnet',
  '0x89': 'polygon-mainnet',
  '0x531': 'sei-mainnet',
  '0x3e7': 'hyperliquid-mainnet',
  '0x8f': 'monad-mainnet',
  '0x2105': 'base-mainnet',
  '0xa4b1': 'arb-mainnet',
  '0xa86a': 'avax-mainnet',
  '0xe708': 'linea-mainnet',
};
const NATIVE_SYMBOL_BY_NETWORK: Record<string, string> = {
  'eth-mainnet': 'ETH',
  'opt-mainnet': 'ETH',
  'bnb-mainnet': 'BNB',
  'polygon-mainnet': 'MATIC',
  'base-mainnet': 'ETH',
  'arb-mainnet': 'ETH',
  'avax-mainnet': 'AVAX',
  'linea-mainnet': 'ETH',
  'sei-mainnet': 'SEI',
  'hyperliquid-mainnet': 'HYPE',
  'monad-mainnet': 'MON',
};

let fiatRatesCache:
  | {
      expiresAt: number;
      rates: Record<string, number>;
    }
  | undefined;

/**
 * Token price service backed by Alchemy Prices API and a wallet-agnostic fiat
 * exchange-rate feed. No requests are sent to MetaMask infrastructure.
 */
export class AlchemyTokenPricesService {
  readonly #apiKey: string | undefined;

  constructor(apiKey: string | undefined = alchemyApiKey) {
    this.#apiKey = apiKey;
  }

  /**
   * Retrieves prices for EVM tokens by contract address.
   *
   * @param args - Assets and display currency.
   * @param args.assets
   * @param args.currency
   * @returns Market data entries for assets with available prices.
   */
  async fetchTokenPrices<Currency extends string>({
    assets,
    currency,
  }: {
    assets: Asset[];
    currency: Currency;
  }): Promise<AssetMarketData<Currency>[]> {
    const conversionRate = await this.#getUsdConversionRate(currency);
    const groupedAssets = groupAssetsByAlchemyNetwork(assets);
    const results: AssetMarketData<Currency>[] = [];

    for (const [network, networkAssets] of groupedAssets) {
      for (
        let index = 0;
        index < networkAssets.length;
        index += MAX_ALCHEMY_ADDRESSES_PER_REQUEST
      ) {
        const batch = networkAssets.slice(
          index,
          index + MAX_ALCHEMY_ADDRESSES_PER_REQUEST,
        );
        const response = await this.#fetchAlchemyAddressPrices(
          network,
          batch.map(({ tokenAddress }) => tokenAddress),
        );
        const priceByAddress = new Map(
          response.map(({ address, prices }) => [
            address.toLowerCase(),
            getUsdPrice(prices),
          ]),
        );

        for (const asset of batch) {
          const usdPrice = priceByAddress.get(asset.tokenAddress.toLowerCase());
          if (usdPrice === undefined) {
            continue;
          }
          results.push(
            createMarketData(asset, currency, usdPrice * conversionRate),
          );
        }
      }
    }

    return results;
  }

  /**
   * Retrieves native-asset exchange rates in the selected display currency.
   *
   * @param args - Currency and native asset symbols.
   * @param args.baseCurrency
   * @param args.includeUsdRate
   * @param args.cryptocurrencies
   * @returns Exchange rates keyed by lowercase asset symbol.
   */
  async fetchExchangeRates<Currency extends string>({
    baseCurrency,
    includeUsdRate,
    cryptocurrencies,
  }: {
    baseCurrency: Currency;
    includeUsdRate: boolean;
    cryptocurrencies: string[];
  }): Promise<Record<string, ExchangeRate>> {
    const symbols = [...new Set(cryptocurrencies.map(toUpperCase))];
    const baseSymbol = baseCurrency.toUpperCase();
    const fiatRates = baseSymbol === 'USD' ? {} : await getFiatRates();
    const baseIsFiat =
      baseSymbol === 'USD' || fiatRates[baseSymbol] !== undefined;
    const requestedSymbols = baseIsFiat
      ? symbols
      : [...new Set([...symbols, baseSymbol])];
    const prices = await this.#fetchAlchemySymbolPrices(requestedSymbols);
    const usdPriceBySymbol = new Map(
      prices.map(({ symbol, prices: symbolPrices }) => [
        symbol.toUpperCase(),
        getUsdPrice(symbolPrices),
      ]),
    );
    const baseUsdPrice = baseIsFiat
      ? 1
      : requireFinitePrice(usdPriceBySymbol.get(baseSymbol), baseSymbol);
    const baseFiatRate = baseIsFiat
      ? requireFinitePrice(
          baseSymbol === 'USD' ? 1 : fiatRates[baseSymbol],
          baseSymbol,
        )
      : 1;

    return Object.fromEntries(
      symbols.flatMap((symbol) => {
        const usdPrice = usdPriceBySymbol.get(symbol);
        if (usdPrice === undefined || usdPrice <= 0) {
          return [];
        }

        // CurrencyRateController inverts `value` and `usd` before storing
        // them. Return reciprocal prices here so its resulting rates are in
        // the expected units (display currency per crypto asset and USD per
        // crypto asset respectively).
        const value = baseIsFiat
          ? 1 / (usdPrice * baseFiatRate)
          : baseUsdPrice / usdPrice;
        const rate: ExchangeRate = {
          name: symbol,
          ticker: symbol,
          value,
          currencyType: 'crypto',
          ...(includeUsdRate ? { usd: 1 / usdPrice } : {}),
        };
        return [[symbol.toLowerCase(), rate]];
      }),
    );
  }

  /**
   * Retrieves historical token prices directly from Alchemy.
   * @param options0
   * @param options0.chainId
   * @param options0.address
   * @param options0.currency
   * @param options0.timePeriod
   */
  async fetchHistoricalPrices({
    chainId,
    address,
    currency,
    timePeriod,
  }: {
    chainId: Hex;
    address: string;
    currency: string;
    timePeriod: string;
  }): Promise<{ prices: [number, number][] }> {
    const network = CHAIN_ID_TO_ALCHEMY_NETWORK[chainId];
    if (!network) {
      return { prices: [] };
    }
    const days = getHistoricalPeriodDays(timePeriod);
    const isNativeAsset = /^0x0{40}$/u.test(address);
    let interval = '1d';
    if (days <= 1) {
      interval = '1h';
    } else if (days >= 365) {
      interval = '1w';
    }
    const response = await fetch(
      `${ALCHEMY_PRICE_API_BASE_URL}/${this.#requireApiKey()}/tokens/historical`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isNativeAsset
            ? { symbol: NATIVE_SYMBOL_BY_NETWORK[network] ?? 'ETH' }
            : { network, address }),
          startTime: new Date(
            Date.now() - days * 24 * 60 * 60 * 1000,
          ).toISOString(),
          endTime: new Date().toISOString(),
          interval,
        }),
      },
    );
    const result = await getResponseObject<{
      data?: HistoricalPricePoint[];
    }>(response, 'Alchemy historical prices');
    const conversionRate = await this.#getUsdConversionRate(currency);
    return {
      prices: (result.data ?? []).flatMap(({ value, timestamp }) => {
        const price = Number(value);
        const time = Date.parse(timestamp);
        return Number.isFinite(price) && Number.isFinite(time)
          ? [[time, price * conversionRate] as [number, number]]
          : [];
      }),
    };
  }

  /**
   * Checks whether Alchemy accepts address prices for a chain.
   *
   * @param chainId - EVM chain ID.
   * @returns Whether the chain is supported.
   */
  validateChainIdSupported(chainId: unknown): chainId is Hex {
    return (
      typeof chainId === 'string' && chainId in CHAIN_ID_TO_ALCHEMY_NETWORK
    );
  }

  /**
   * Checks whether a display currency has a valid symbol shape.
   *
   * @param currency - Display currency code.
   * @returns Whether the currency can be queried.
   */
  validateCurrencySupported(currency: unknown): currency is string {
    return typeof currency === 'string' && /^[a-z]{3,5}$/iu.test(currency);
  }

  async #getUsdConversionRate(currency: string): Promise<number> {
    const symbol = currency.toUpperCase();
    if (symbol === 'USD') {
      return 1;
    }
    const fiatRates = await getFiatRates();
    if (fiatRates[symbol] !== undefined) {
      return fiatRates[symbol];
    }
    const [price] = await this.#fetchAlchemySymbolPrices([symbol]);
    return 1 / requireFinitePrice(getUsdPrice(price?.prices ?? []), symbol);
  }

  async #fetchAlchemyAddressPrices(
    network: string,
    addresses: Hex[],
  ): Promise<AlchemyAddressPrice[]> {
    const response = await fetch(
      `${ALCHEMY_PRICE_API_BASE_URL}/${this.#requireApiKey()}/tokens/by-address`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addresses: addresses.map((address) => ({ address, network })),
        }),
      },
    );
    return getResponseData<AlchemyAddressPrice>(
      response,
      'Alchemy address prices',
    );
  }

  async #fetchAlchemySymbolPrices(
    symbols: string[],
  ): Promise<AlchemySymbolPrice[]> {
    if (symbols.length === 0) {
      return [];
    }
    const query = new URLSearchParams();
    symbols.forEach((symbol) => query.append('symbols', symbol));
    const response = await fetch(
      `${ALCHEMY_PRICE_API_BASE_URL}/${this.#requireApiKey()}/tokens/by-symbol?${query}`,
    );
    return getResponseData<AlchemySymbolPrice>(
      response,
      'Alchemy symbol prices',
    );
  }

  #requireApiKey(): string {
    if (!this.#apiKey || this.#apiKey === ALCHEMY_API_KEY_PLACEHOLDER) {
      throw new Error('Alchemy API key is required for token prices');
    }
    return this.#apiKey;
  }
}

export function resetAlchemyTokenPricesServiceCache(): void {
  fiatRatesCache = undefined;
}

async function getFiatRates(): Promise<Record<string, number>> {
  if (fiatRatesCache && fiatRatesCache.expiresAt > Date.now()) {
    return fiatRatesCache.rates;
  }
  const response = await fetch(FIAT_RATES_URL);
  if (!response.ok) {
    throw new Error(`Fiat exchange rates request failed (${response.status})`);
  }
  const result = (await response.json()) as FiatRatesResponse;
  if (result.result !== 'success' || !result.rates) {
    throw new Error('Fiat exchange rates response is invalid');
  }
  fiatRatesCache = {
    expiresAt: Date.now() + FIAT_RATES_CACHE_DURATION,
    rates: result.rates,
  };
  return result.rates;
}

async function getResponseData<Entry>(
  response: Response,
  serviceName: string,
): Promise<Entry[]> {
  if (!response.ok) {
    throw new Error(`${serviceName} request failed (${response.status})`);
  }
  const result = (await response.json()) as { data?: Entry[] };
  if (!Array.isArray(result.data)) {
    throw new Error(`${serviceName} response is invalid`);
  }
  return result.data;
}

async function getResponseObject<ResponseBody>(
  response: Response,
  serviceName: string,
): Promise<ResponseBody> {
  if (!response.ok) {
    throw new Error(`${serviceName} request failed (${response.status})`);
  }
  return (await response.json()) as ResponseBody;
}

function getHistoricalPeriodDays(timePeriod: string): number {
  switch (timePeriod) {
    case '1D':
      return 1;
    case '7D':
      return 7;
    case '1M':
      return 30;
    case '3M':
      return 90;
    case '1Y':
      return 365;
    default:
      return 3650;
  }
}

function getUsdPrice(prices: AlchemyPrice[]): number | undefined {
  const value = prices.find(
    ({ currency }) =>
      typeof currency === 'string' && currency.toLowerCase() === 'usd',
  )?.value;
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function requireFinitePrice(price: number | undefined, symbol: string): number {
  if (price === undefined || !Number.isFinite(price) || price <= 0) {
    throw new Error(`Price unavailable for ${symbol}`);
  }
  return price;
}

function createMarketData<Currency extends string>(
  asset: Asset,
  currency: Currency,
  price: number,
): AssetMarketData<Currency> {
  // The Alchemy address-price endpoint only supplies a spot price. Keep
  // unavailable change metrics as undefined at runtime instead of reporting a
  // misleading zero-percent change. MarketDataDetails currently types these
  // fields as numbers, so the cast preserves compatibility with the upstream
  // controller until its type allows nullable metrics.
  const unavailableChange = undefined as unknown as number;

  return {
    ...asset,
    currency,
    price,
    allTimeHigh: 0,
    allTimeLow: 0,
    circulatingSupply: 0,
    dilutedMarketCap: 0,
    high1d: 0,
    low1d: 0,
    marketCap: 0,
    marketCapPercentChange1d: unavailableChange,
    priceChange1d: unavailableChange,
    pricePercentChange1d: unavailableChange,
    pricePercentChange1h: unavailableChange,
    pricePercentChange1y: unavailableChange,
    pricePercentChange7d: unavailableChange,
    pricePercentChange14d: unavailableChange,
    pricePercentChange30d: unavailableChange,
    pricePercentChange200d: unavailableChange,
    totalVolume: 0,
  };
}

function toUpperCase(value: string): string {
  return value.toUpperCase();
}

function groupAssetsByAlchemyNetwork(assets: Asset[]): Map<string, Asset[]> {
  const groupedAssets = new Map<string, Asset[]>();
  for (const asset of assets) {
    const network = CHAIN_ID_TO_ALCHEMY_NETWORK[asset.chainId];
    if (!network) {
      continue;
    }
    groupedAssets.set(network, [...(groupedAssets.get(network) ?? []), asset]);
  }
  return groupedAssets;
}
