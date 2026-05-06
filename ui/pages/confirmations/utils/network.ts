import { CaipChainId, Hex } from '@metamask/utils';
import { CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP } from '../../../../shared/constants/network';

export function getImageForChainId(chainId: string): string | undefined {
  return CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP[chainId];
}

export const isTronChainId = (
  _chainId: Hex | number | CaipChainId | string,
) => false;
