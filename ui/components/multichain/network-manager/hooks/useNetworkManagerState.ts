import { BUILT_IN_NETWORKS } from '@metamask/controller-utils';
import {
  toEvmCaipChainId,
  type MultichainNetworkConfiguration,
} from '@metamask/multichain-network-controller';
import { CaipChainId, Hex, isStrictHexString } from '@metamask/utils';
import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { convertCaipToHexChainId } from '../../../../../shared/lib/network.utils';
import {
  FEATURED_NETWORK_CHAIN_IDS,
  FEATURED_NETWORK_CHAIN_IDS_MULTICHAIN,
  FEATURED_RPCS,
  TEST_CHAINS,
} from '../../../../../shared/constants/network';
import {
  getAllEnabledNetworksForAllNamespaces,
  getMultichainNetworkConfigurationsTuple,
} from '../../../../selectors';

export const useNetworkManagerState = ({
  showDefaultNetworks = false,
}: {
  showDefaultNetworks?: boolean;
} = {}) => {
  const [multichainNetworks] = useSelector(
    getMultichainNetworkConfigurationsTuple,
  );

  const [nonTestNetworks, testNetworks] = useMemo(
    () =>
      Object.entries(multichainNetworks).reduce(
        ([nonTestnetsList, testnetsList], [_id, network]) => {
          const chainId = convertCaipToHexChainId(network.chainId);
          const isTest = TEST_CHAINS.includes(chainId as Hex);

          if (showDefaultNetworks) {
            (isTest ? testnetsList : nonTestnetsList)[chainId] = network;
            return [nonTestnetsList, testnetsList];
          }

          // Pre-filter to only include networks that are NOT in built-in networks or featured RPCs
          const hexChainId = convertCaipToHexChainId(network.chainId);

          // Check if the network is NOT a built-in network or featured RPC
          const isBuiltInNetwork = Object.values(BUILT_IN_NETWORKS).some(
            (builtInNetwork) => builtInNetwork.chainId === hexChainId,
          );
          const isFeaturedRpc = FEATURED_RPCS.some(
            (featuredRpc) => featuredRpc.chainId === hexChainId,
          );
          const shouldInclude = !isBuiltInNetwork && !isFeaturedRpc;

          if (shouldInclude || isTest) {
            (isTest ? testnetsList : nonTestnetsList)[chainId] = network;
          }

          return [nonTestnetsList, testnetsList];
        },
        [
          {} as Record<string, MultichainNetworkConfiguration>,
          {} as Record<string, MultichainNetworkConfiguration>,
        ],
      ),
    [multichainNetworks, showDefaultNetworks],
  );

  const isNetworkInDefaultNetworkTab = useCallback(
    (network: MultichainNetworkConfiguration) => {
      return FEATURED_NETWORK_CHAIN_IDS.includes(
        convertCaipToHexChainId(network.chainId),
      );
    },
    [],
  );

  return {
    nonTestNetworks,
    testNetworks,
    isNetworkInDefaultNetworkTab,
  };
};

export const useNetworkManagerInitialTab = () => {
  const allEnabledNetworksForAllNamespaces = useSelector(
    getAllEnabledNetworksForAllNamespaces,
  );

  const initialTab = useMemo(() => {
    const isSubset = (subset: string[], superset: string[]) => {
      const supersetSet = new Set(superset);
      return subset.every((x) => supersetSet.has(x));
    };

    const enabledNetworksCaipIds = allEnabledNetworksForAllNamespaces.map(
      (c) => (isStrictHexString(c) ? toEvmCaipChainId(c) : (c as CaipChainId)),
    );

    const featuredNetworksCaipIds = FEATURED_NETWORK_CHAIN_IDS_MULTICHAIN.map(
      (c) => (isStrictHexString(c) ? toEvmCaipChainId(c) : c),
    );

    // Check against known list of popular chainIds
    return isSubset(enabledNetworksCaipIds, featuredNetworksCaipIds)
      ? 'networks'
      : 'custom-networks';
  }, [allEnabledNetworksForAllNamespaces]);

  return { initialTab };
};
