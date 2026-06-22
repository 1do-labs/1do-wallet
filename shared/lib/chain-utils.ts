import {
  CaipAssetType,
  CaipChainId,
  Hex,
  isCaipChainId,
  isStrictHexString,
  KnownCaipNamespace,
  numberToHex,
  parseCaipChainId,
} from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';

export const formatChainIdToCaip = (
  chainId: Hex | CaipChainId | string,
): CaipChainId => {
  if (isCaipChainId(chainId)) {
    return chainId;
  }

  if (isStrictHexString(chainId)) {
    return toEvmCaipChainId(chainId);
  }

  return toEvmCaipChainId(numberToHex(Number(chainId)));
};

export const formatChainIdToHex = (
  chainId: Hex | CaipChainId | string,
): Hex => {
  if (isStrictHexString(chainId)) {
    return chainId;
  }

  if (isCaipChainId(chainId)) {
    const { namespace, reference } = parseCaipChainId(chainId);
    if (namespace === KnownCaipNamespace.Eip155) {
      return numberToHex(Number(reference));
    }
  }

  return numberToHex(Number(chainId));
};

export const isNativeAddress = (address: unknown): boolean =>
  typeof address === 'string' &&
  address.toLowerCase() === '0x0000000000000000000000000000000000000000';

export const isNonEvmChainId = (chainId: unknown): boolean => {
  if (typeof chainId !== 'string' || !isCaipChainId(chainId)) {
    return false;
  }

  return parseCaipChainId(chainId).namespace !== KnownCaipNamespace.Eip155;
};

const NATIVE_ASSET_BY_CHAIN_ID: Record<
  number,
  {
    symbol: string;
    name: string;
    decimals: number;
    slip44: number;
  }
> = {
  1: { symbol: 'ETH', name: 'Ether', decimals: 18, slip44: 60 },
  10: { symbol: 'ETH', name: 'Ether', decimals: 18, slip44: 60 },
  56: { symbol: 'BNB', name: 'BNB', decimals: 18, slip44: 714 },
  137: { symbol: 'POL', name: 'Polygon', decimals: 18, slip44: 966 },
  324: { symbol: 'ETH', name: 'Ether', decimals: 18, slip44: 60 },
  42161: { symbol: 'ETH', name: 'Ether', decimals: 18, slip44: 60 },
  43114: { symbol: 'AVAX', name: 'Avalanche', decimals: 18, slip44: 9000 },
  59144: { symbol: 'ETH', name: 'Ether', decimals: 18, slip44: 60 },
  8453: { symbol: 'ETH', name: 'Ether', decimals: 18, slip44: 60 },
};

export const getNativeAssetForChainId = (
  chainId: Hex | CaipChainId | string,
) => {
  const caipChainId = formatChainIdToCaip(chainId);
  const { reference } = parseCaipChainId(caipChainId);
  const decimalChainId = Number(reference);
  const nativeAsset = NATIVE_ASSET_BY_CHAIN_ID[decimalChainId];

  if (!nativeAsset) {
    return undefined;
  }

  return {
    symbol: nativeAsset.symbol,
    name: nativeAsset.name,
    address: '0x0000000000000000000000000000000000000000' as Hex,
    decimals: nativeAsset.decimals,
    iconUrl: '',
    chainId: decimalChainId,
    assetId: `${caipChainId}/slip44:${nativeAsset.slip44}` as CaipAssetType,
  };
};
