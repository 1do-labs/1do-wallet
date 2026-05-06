import { KnownCaipNamespace, parseCaipChainId } from '@metamask/utils';
import { getAccountLink } from '@metamask/etherscan-link';
import type { MultichainNetwork } from '../../../selectors/multichain/networks';
// TODO: Remove restricted import
// eslint-disable-next-line import-x/no-restricted-paths
import { normalizeSafeAddress } from '../../../../app/scripts/lib/multichain/address';

export const getMultichainBlockExplorerUrl = (
  network: MultichainNetwork,
): string => {
  return network.network?.rpcPrefs?.blockExplorerUrl ?? '';
};

export const getMultichainAccountUrl = (
  address: string,
  network: MultichainNetwork,
): string => {
  const { namespace } = parseCaipChainId(network.chainId);
  if (namespace !== KnownCaipNamespace.Eip155) {
    return '';
  }

  const normalizedAddress = normalizeSafeAddress(address);
  return `https://etherscan.io/address/${normalizedAddress}#asset-multichain`;
};

export const getAssetDetailsAccountUrl = (
  address: string,
  network: MultichainNetwork,
): string => {
  const { namespace } = parseCaipChainId(network.chainId);
  if (namespace !== KnownCaipNamespace.Eip155) {
    return '';
  }

  return getAccountLink(
    normalizeSafeAddress(address),
    network.network.chainId,
    network.network?.rpcPrefs,
  );
};
