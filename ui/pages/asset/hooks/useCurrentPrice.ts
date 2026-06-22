import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { AssetType } from '../../../../shared/constants/transaction';
import { toChecksumHexAddress } from '../../../../shared/lib/hexstring-utils';
import { getCurrencyRates, getMarketData } from '../../../selectors';
import { Asset } from '../types/asset';

/**
 * Get the current price of an asset.
 *
 * @param asset - The asset to get the current price of
 * @returns The current price of the asset. If the asset is not found, or the price is not found, returns null.
 */
export const useCurrentPrice = (asset: Asset): { currentPrice?: number } => {
  const evmMarketData = useSelector(getMarketData);
  const evmCurrencyRates = useSelector(getCurrencyRates);

  const { chainId, type } = asset;

  if (type === AssetType.native) {
    return {
      currentPrice: evmCurrencyRates[asset.symbol]?.conversionRate ?? undefined,
    };
  }

  const address = toChecksumHexAddress(asset.address) as Hex;
  const tokenMarketPrice = evmMarketData[chainId]?.[address]?.price;
  const baseCurrency = evmMarketData[chainId]?.[address]?.currency;
  const tokenExchangeRate =
    evmCurrencyRates[baseCurrency]?.conversionRate ?? undefined;

  const currentPrice =
    tokenExchangeRate !== undefined && tokenMarketPrice !== undefined
      ? tokenExchangeRate * tokenMarketPrice
      : undefined;

  return { currentPrice };
};
