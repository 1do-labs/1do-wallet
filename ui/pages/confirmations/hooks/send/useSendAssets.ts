import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import type { CaipChainId, Hex } from '@metamask/utils';
import { type Asset } from '../../types/send';
import { getAllMultichainNetworkConfigurations } from '../../../../selectors/multichain/networks';
import { isEvmChainId } from '../../../../../shared/lib/asset-utils';
import { useSendTokens } from './useSendTokens';
import { useSendNfts } from './useSendNfts';

type SendAssets = {
  nfts: Asset[];
  tokens: Asset[];
};

type UseSendAssetsOptions = {
  includeNoBalance?: boolean;
};

const isEvmChainIdSafe = (chainId: string): chainId is Hex => {
  try {
    return isEvmChainId(chainId as CaipChainId | Hex);
  } catch {
    return false;
  }
};

export const useSendAssets = (
  options: UseSendAssetsOptions = {},
): SendAssets => {
  const { includeNoBalance = false } = options;
  const tokens = useSendTokens({ includeNoBalance });
  const nfts = useSendNfts();
  const allMultichainNetworkConfigurations = useSelector(
    getAllMultichainNetworkConfigurations,
  );

  // Helper to check if a chain ID is in the available networks
  const isChainIdAvailable = useCallback(
    (chainId: string): boolean => {
      if (!chainId) {
        return false;
      }
      if (!isEvmChainIdSafe(chainId)) {
        return false;
      }

      const availableChainIds = Object.keys(allMultichainNetworkConfigurations);
      const caipChainId = toEvmCaipChainId(chainId);
      return availableChainIds.includes(caipChainId);
    },
    [allMultichainNetworkConfigurations],
  );

  return useMemo(() => {
    // Filter out assets from networks that are not in the Network Manager
    const networkFilteredTokens = tokens.filter((token) => {
      const chainId = String(token.chainId ?? '');
      return isChainIdAvailable(chainId);
    });
    const networkFilteredNfts = nfts.filter((nft) => {
      if (nft.chainId === undefined) {
        return false;
      }
      const chainId = String(nft.chainId);
      return isChainIdAvailable(chainId);
    });

    return {
      tokens: networkFilteredTokens,
      nfts: networkFilteredNfts,
    };
  }, [tokens, nfts, isChainIdAvailable]);
};
