import { CaipAssetType, CaipChainId, Hex } from '@metamask/utils';
import { AssetType } from '../../../../../../shared/constants/transaction';
import { useAsyncResult } from '../../../../../hooks/useAsync';

/**
 * Fetches token metadata for a single token if searchQuery is defined but filteredTokenList is empty
 *
 * @param searchQuery - The search query to fetch metadata for
 * @param shouldFetchMetadata - Whether to fetch metadata
 * @param abortControllerRef - The abort controller ref to use for the fetch request
 * @param chainId - The chain id to fetch metadata for
 * @returns The asset metadata
 */
export const useAssetMetadata = (
  searchQuery: string,
  shouldFetchMetadata: boolean,
  abortControllerRef: React.MutableRefObject<AbortController | null>,
  chainId?: Hex | CaipChainId,
) => {
  const { value: assetMetadata } = useAsyncResult<
    | {
        address: Hex | CaipAssetType | string;
        symbol: string;
        decimals: number;
        image: string;
        chainId: Hex | CaipChainId;
        isNative: boolean;
        type: AssetType.token;
        balance: string;
        string: string;
      }
    | undefined
  >(async () => {
    // Remote token metadata lookup is disabled in this build.
    if (
      !searchQuery ||
      !shouldFetchMetadata ||
      !abortControllerRef ||
      !chainId
    ) {
      return undefined;
    }
    return undefined;
  }, [abortControllerRef, shouldFetchMetadata, searchQuery, chainId]);

  return assetMetadata;
};
