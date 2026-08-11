import {
  CaipAssetType,
  parseCaipChainId,
  CaipAssetTypeStruct,
  CaipChainId,
  type Hex,
  isCaipAssetType,
  isCaipChainId,
  isStrictHexString,
  parseCaipAssetType,
  KnownCaipNamespace,
  numberToHex,
} from '@metamask/utils';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import {
  getNativeAssetForChainId,
  isNativeAddress,
  isNonEvmChainId,
} from './chain-utils';

export const toAssetId = (
  address: Hex | CaipAssetType | string,
  chainId?: CaipChainId | Hex,
): CaipAssetType | undefined => {
  let addressToUse = address;
  let chainIdToUse = isStrictHexString(chainId)
    ? toEvmCaipChainId(chainId)
    : chainId;

  // Use chainId and address from caip assetId if provided
  if (isCaipAssetType(address)) {
    const { assetReference, chainId: chainIdFromCaipAssetId } =
      parseCaipAssetType(address);
    addressToUse = assetReference;
    chainIdToUse = chainIdFromCaipAssetId;
  }
  if (!chainIdToUse) {
    return undefined;
  }

  if (isNonEvmChainId(chainIdToUse)) {
    return undefined;
  }

  if (isNativeAddress(addressToUse)) {
    try {
      return getNativeAssetForChainId(chainIdToUse)?.assetId;
    } catch {
      // Return undefined for unsupported chains (e.g., custom networks)
      // This allows the send flow to work for custom networks even if they're not in the swaps map
      // Format normalization in isEvmChainId should prevent most errors, but this is a defensive fallback
      return undefined;
    }
  }
  // EVM assets
  const checksummedAddress = toChecksumHexAddress(addressToUse) ?? addressToUse;
  if (isStrictHexString(checksummedAddress)) {
    return CaipAssetTypeStruct.create(
      `${chainIdToUse}/erc20:${checksummedAddress}`,
    );
  }
  return undefined;
};

/**
 * Returns the image url for a caip-formatted asset
 *
 * @param _assetId - The hex address or caip-formatted asset id
 * @param _chainId - The chainId in caip or hex format
 * @returns The image url for the asset
 */
export const getAssetImageUrl = (
  _assetId: CaipAssetType | Hex | string,
  _chainId: CaipChainId | Hex,
) => {
  // 1Do does not use MetaMask's static asset service. Asset metadata and
  // optional media are supplied by the configured Alchemy/NFT providers.
  return undefined;
};

export type AssetMetadata = {
  assetId: CaipAssetType;
  symbol: string;
  name: string;
  decimals: number;
};

/**
 * Fetches the metadata for a token
 *
 * @param _address - The address of the token
 * @param _chainId - The chainId of the token
 * @returns The metadata for the token
 */
export const fetchAssetMetadata = async (
  _address: string | CaipAssetType | Hex,
  _chainId: Hex | CaipChainId,
) => {
  return undefined;
};

/**
 * Fetches the metadata for a list of token assetIds
 *
 * @param _assetIds - The assetIds of the tokens
 * @returns The metadata for the tokens by assetId
 */
export const fetchAssetMetadataForAssetIds = async (
  _assetIds: (CaipAssetType | null)[],
) => {
  return null;
};

/**
 * Checks if the given chain ID is an EVM chain ID
 *
 * @param chainId - The chain ID to check. It can be in caip or hex format.
 * @returns `true` if the chain ID is an EVM chain ID, `false` otherwise.
 */
export const isEvmChainId = (chainId: CaipChainId | Hex) => {
  let chainIdInCaip: CaipChainId;

  if (isCaipChainId(chainId)) {
    chainIdInCaip = chainId;
  } else if (isStrictHexString(chainId)) {
    chainIdInCaip = toEvmCaipChainId(chainId);
  } else {
    // Before converting decimal strings to hex, check if it's a non-EVM chainId
    // This prevents misidentifying unsupported non-EVM chains as EVM
    if (isNonEvmChainId(chainId)) {
      return false;
    }
    // Handle decimal strings by converting to hex first
    // This fixes issues where chainIds are passed as decimal strings (e.g., '1439' for Injective testnet)
    // instead of hex format (e.g., '0x59f')
    chainIdInCaip = toEvmCaipChainId(numberToHex(Number(chainId)));
  }

  // TODO Replace with isEvmCaipChainId from @metamask/multichain-network-controller when it is exported
  const { namespace } = parseCaipChainId(chainIdInCaip);
  return namespace === KnownCaipNamespace.Eip155;
};
