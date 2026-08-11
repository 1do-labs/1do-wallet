import { useCallback, useContext, useEffect, useState } from 'react';
import { type CaipChainId } from '@metamask/utils';
import { useDispatch, useSelector } from 'react-redux';
import {
  convertCaipToHexChainId,
  getRpcDataByChainId,
} from '../../../../../shared/lib/network.utils';
import {
  detectNfts,
  setActiveNetwork,
  setEnabledNetworks,
  setNextNonce,
  updateCustomNonce,
} from '../../../../store/actions';
import {
  getAllChainsToPoll,
  getEnabledNetworksByNamespace,
  getMultichainNetworkConfigurationsByChainId,
  getMultichainNetworkConfigurationsTuple,
  getSelectedMultichainNetworkChainId,
} from '../../../../selectors';
import {
  BUILT_IN_NETWORKS,
  FEATURED_RPCS,
} from '../../../../../shared/constants/network';

// TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
// eslint-disable-next-line @typescript-eslint/naming-convention
export enum ACTION_MODE {
  // Displays the search box and network list
  LIST,
  // Displays the form to add or edit a network
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ADD_EDIT,
  // Displays the page for adding an additional RPC URL
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ADD_RPC,
  // Displays the page for adding an additional explorer URL
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ADD_EXPLORER_URL,
  // Displays the page for selecting an RPC URL
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  SELECT_RPC,
}

export const useNetworkChangeHandlers = () => {
  const dispatch = useDispatch();

  const [multichainNetworks] = useSelector(
    getMultichainNetworkConfigurationsTuple,
  );
  const currentChainId = useSelector(getSelectedMultichainNetworkChainId);

  const enabledNetworksByNamespace = useSelector(getEnabledNetworksByNamespace);
  const allChainIds = useSelector(getAllChainsToPoll);
  const [, evmNetworks] = useSelector(getMultichainNetworkConfigurationsTuple);
  const [actionMode, setActionMode] = useState(ACTION_MODE.LIST);

  useEffect(() => {
    // Fire and forget async operations for better performance
    // setTimeout with 0 delay pushes these operations to the next event loop tick,
    // preventing them from blocking the current execution stack and improving UI responsiveness.
    // This technique is called "yielding to the event loop" - it allows higher priority
    // tasks (like UI updates) to execute first before these background operations run.
    setTimeout(() => {
      dispatch(updateCustomNonce(''));
      dispatch(setNextNonce(''));
      dispatch(detectNfts(allChainIds));
    }, 0);
  }, [enabledNetworksByNamespace, dispatch, allChainIds]);

  const handleEvmNetworkChange = useCallback(
    (chainId: CaipChainId) => {
      const hexChainId = convertCaipToHexChainId(chainId);

      const { defaultRpcEndpoint } = getRpcDataByChainId(chainId, evmNetworks);
      const finalNetworkClientId = defaultRpcEndpoint.networkClientId;

      dispatch(setEnabledNetworks(hexChainId));

      // deferring execution to keep select all unblocked
      setTimeout(() => {
        dispatch(setActiveNetwork(finalNetworkClientId));
      }, 0);
    },
    [dispatch, evmNetworks],
  );

  const getMultichainNetworkConfigurationOrThrow = useCallback(
    (chainId: CaipChainId) => {
      const network = multichainNetworks[chainId];
      if (!network) {
        throw new Error(
          `Network configuration not found for chainId: ${chainId}`,
        );
      }
      return network;
    },
    [multichainNetworks],
  );

  const handleNetworkChange = useCallback(
    async (chainId: CaipChainId) => {
      const currentChain =
        getMultichainNetworkConfigurationOrThrow(currentChainId);
      const chain = getMultichainNetworkConfigurationOrThrow(chainId);

      await handleEvmNetworkChange(chainId);

      const chainIdToTrack = convertCaipToHexChainId(chainId);
      const currentChainIdToTrack = convertCaipToHexChainId(currentChainId);

      // Check if the destination network is custom (not built-in or featured)
      const hexChainId = convertCaipToHexChainId(chain.chainId);

      const isBuiltInNetwork = Object.values(BUILT_IN_NETWORKS).some(
        (builtInNetwork) => builtInNetwork.chainId === hexChainId,
      );
      const isFeaturedRpc = FEATURED_RPCS.some(
        (featuredRpc) => featuredRpc.chainId === hexChainId,
      );
      const isCustomNetwork = !isBuiltInNetwork && !isFeaturedRpc;
    },
    [
      getMultichainNetworkConfigurationOrThrow,
      currentChainId,
      handleEvmNetworkChange,
    ],
  );

  return {
    handleNetworkChange,
    handleEvmNetworkChange,
    getMultichainNetworkConfigurationOrThrow,
    actionMode,
    setActionMode,
    ACTION_MODE,
  };
};
