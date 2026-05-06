import { useCallback } from 'react';
import { EthScope } from '@metamask/keyring-api';
import { type MultichainNetworkConfiguration } from '@metamask/multichain-network-controller';
import { type Hex } from '@metamask/utils';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { CHAIN_ID_PORTFOLIO_LANDING_PAGE_URL_MAP } from '../../../../../shared/constants/network';
import {
  convertCaipToHexChainId,
  getRpcDataByChainId,
} from '../../../../../shared/lib/network.utils';
import { openWindow } from '../../../../helpers/utils/window';
import { setEditedNetwork, showModal } from '../../../../store/actions';
import {
  getMultichainNetworkConfigurationsTuple,
  getNetworkDiscoverButtonEnabled,
  getSelectedMultichainNetworkChainId,
} from '../../../../selectors';
import {
  getCompletedOnboarding,
  getIsUnlocked,
} from '../../../../ducks/metamask/metamask';

export const useNetworkItemCallbacks = () => {
  const dispatch = useDispatch();
  const [, setSearchParams] = useSearchParams();
  const isUnlocked = useSelector(getIsUnlocked);
  const currentChainId = useSelector(getSelectedMultichainNetworkChainId);
  const isNetworkDiscoverButtonEnabled = useSelector(
    getNetworkDiscoverButtonEnabled,
  );
  const [, evmNetworks] = useSelector(
    getMultichainNetworkConfigurationsTuple,
  );
  const completedOnboarding = useSelector(getCompletedOnboarding);

  const isDiscoverBtnEnabled = useCallback(
    (chainId: Hex | `${string}:${string}`): boolean => {
      // The "Discover" button should be enabled when the mapping for the chainId is enabled in the feature flag json
      // and in the constants `CHAIN_ID_PORTFOLIO_LANDING_PAGE_URL_MAP`.
      return Boolean(
        isNetworkDiscoverButtonEnabled?.[
          chainId as keyof typeof isNetworkDiscoverButtonEnabled
        ] && CHAIN_ID_PORTFOLIO_LANDING_PAGE_URL_MAP[chainId] !== undefined,
      );
    },
    [isNetworkDiscoverButtonEnabled],
  );

  const hasMultiRpcOptions = useCallback(
    (network: MultichainNetworkConfiguration): boolean =>
      network.isEvm &&
      getRpcDataByChainId(network.chainId, evmNetworks).rpcEndpoints.length > 1,
    [evmNetworks],
  );

  const isNetworkEnabled = useCallback(
    (_network: MultichainNetworkConfiguration): boolean => completedOnboarding,
    [completedOnboarding],
  );

  const getItemCallbacks = useCallback(
    (
      network: MultichainNetworkConfiguration,
    ): Record<string, (() => void) | undefined> => {
      const { chainId } = network;
      const hexChainId = convertCaipToHexChainId(chainId);
      const isDeletable =
        isUnlocked &&
        network.chainId !== currentChainId &&
        network.chainId !== EthScope.Mainnet;

      const modalProps = {
        onConfirm: () => undefined,
        onHide: () => undefined,
      };

      return {
        onDelete: isDeletable
          ? () => {
              dispatch(
                showModal({
                  name: 'CONFIRM_DELETE_NETWORK',
                  target: hexChainId,
                  ...modalProps,
                }),
              );
            }
          : undefined,
        onEdit: () => {
          dispatch(
            setEditedNetwork({
              chainId: hexChainId,
              nickname: network.name,
            }),
          );
          setSearchParams({ view: 'edit' });
        },
        onDiscoverClick: isDiscoverBtnEnabled(hexChainId)
          ? () => {
              openWindow(
                CHAIN_ID_PORTFOLIO_LANDING_PAGE_URL_MAP[hexChainId],
                '_blank',
              );
            }
          : undefined,
        onRpcConfigEdit: hasMultiRpcOptions(network)
          ? () => {
              setSearchParams({ view: 'add-rpc' });
              dispatch(
                setEditedNetwork({
                  chainId: hexChainId,
                }),
              );
            }
          : undefined,
        onRpcSelect: () => {
          dispatch(
            setEditedNetwork({
              chainId: hexChainId,
            }),
          );
          setSearchParams({ view: 'select-rpc' });
        },
      };
    },
    [
      currentChainId,
      dispatch,
      hasMultiRpcOptions,
      isUnlocked,
      isDiscoverBtnEnabled,
      setSearchParams,
    ],
  );

  return {
    getItemCallbacks,
    hasMultiRpcOptions,
    isNetworkEnabled,
  };
};
