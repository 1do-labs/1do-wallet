import { useEffect, useCallback, useRef, useContext } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectFirstUnavailableEvmNetwork } from '../selectors/multichain/networks';
import {
  getNetworkConnectionBanner,
  getIsDeviceOffline,
} from '../selectors/selectors';
import { updateNetworkConnectionBanner, updateNetwork } from '../store/actions';
import { getNetworkConfigurationsByChainId } from '../../shared/lib/selectors/networks';
import { NetworkConnectionBanner } from '../../shared/constants/app-state';
import { setShowDefaultRpcSwitchToast } from '../components/app/toast-master/utils';

type UseNetworkConnectionBannerResult = NetworkConnectionBanner & {
  /**
   * Switch the current unavailable network to its built-in default RPC endpoint.
   * Only available when the network has a default endpoint to switch to.
   * Returns a promise that resolves when the switch is complete (or rejects on error).
   */
  switchToDefaultRpc: () => Promise<void>;
};

const DEGRADED_BANNER_TIMEOUT = 5 * 1000;
const UNAVAILABLE_BANNER_TIMEOUT = 30 * 1000;

export const useNetworkConnectionBanner =
  (): UseNetworkConnectionBannerResult => {
    const dispatch = useDispatch();
    const isOffline = useSelector(getIsDeviceOffline);
    const firstUnavailableEvmNetwork = useSelector(
      selectFirstUnavailableEvmNetwork,
    );
    const networkConnectionBannerState = useSelector(
      getNetworkConnectionBanner,
    );
    const networkConfigurationsByChainId = useSelector(
      getNetworkConfigurationsByChainId,
    );

    const timersRef = useRef<{
      degradedTimer?: NodeJS.Timeout;
      unavailableTimer?: NodeJS.Timeout;
    }>({});

    const clearDegradedTimer = useCallback(() => {
      if (timersRef.current.degradedTimer) {
        clearTimeout(timersRef.current.degradedTimer);
        timersRef.current.degradedTimer = undefined;
      }
    }, []);

    const clearUnavailableTimer = useCallback(() => {
      if (timersRef.current.unavailableTimer) {
        clearTimeout(timersRef.current.unavailableTimer);
        timersRef.current.unavailableTimer = undefined;
      }
    }, []);

    const clearTimers = useCallback(() => {
      clearDegradedTimer();
      clearUnavailableTimer();
    }, [clearDegradedTimer, clearUnavailableTimer]);

    const startUnavailableTimer = useCallback(() => {
      clearUnavailableTimer();

      timersRef.current.unavailableTimer = setTimeout(() => {
        if (firstUnavailableEvmNetwork) {
          dispatch(
            updateNetworkConnectionBanner({
              status: 'unavailable',
              networkName: firstUnavailableEvmNetwork.networkName,
              networkClientId: firstUnavailableEvmNetwork.networkClientId,
              chainId: firstUnavailableEvmNetwork.chainId,
              isDefaultRpcEndpoint:
                firstUnavailableEvmNetwork.isDefaultRpcEndpoint,
              defaultRpcEndpointIndex:
                firstUnavailableEvmNetwork.defaultRpcEndpointIndex,
            }),
          );
        }
      }, UNAVAILABLE_BANNER_TIMEOUT - DEGRADED_BANNER_TIMEOUT);
    }, [firstUnavailableEvmNetwork, dispatch, clearUnavailableTimer]);

    const startDegradedTimer = useCallback(() => {
      clearDegradedTimer();

      timersRef.current.degradedTimer = setTimeout(() => {
        if (firstUnavailableEvmNetwork) {
          dispatch(
            updateNetworkConnectionBanner({
              status: 'degraded',
              networkName: firstUnavailableEvmNetwork.networkName,
              networkClientId: firstUnavailableEvmNetwork.networkClientId,
              chainId: firstUnavailableEvmNetwork.chainId,
              isDefaultRpcEndpoint:
                firstUnavailableEvmNetwork.isDefaultRpcEndpoint,
              defaultRpcEndpointIndex:
                firstUnavailableEvmNetwork.defaultRpcEndpointIndex,
            }),
          );

          startUnavailableTimer();
        }
      }, DEGRADED_BANNER_TIMEOUT);
    }, [
      firstUnavailableEvmNetwork,
      dispatch,
      startUnavailableTimer,
      clearDegradedTimer,
    ]);

    // If the first unavailable network does not change but the status changes, start the degraded or unavailable timer
    // If the first unavailable network changes, reset all timers and change the status
    // If the device is offline, don't show network banners - the issue is device connectivity, not the network
    useEffect(() => {
      // When device is offline, clear timers and reset banner state
      // We don't want to show network degraded/unavailable banners when the real issue
      // is the device's internet connectivity
      if (isOffline) {
        clearTimers();
        if (networkConnectionBannerState.status !== 'available') {
          dispatch(updateNetworkConnectionBanner({ status: 'available' }));
        }
        return;
      }

      if (firstUnavailableEvmNetwork) {
        if (networkConnectionBannerState.status === 'degraded') {
          startUnavailableTimer();
        } else if (
          networkConnectionBannerState.status === 'unknown' ||
          networkConnectionBannerState.status === 'available'
        ) {
          startDegradedTimer();
        }
      } else if (networkConnectionBannerState.status !== 'available') {
        dispatch(updateNetworkConnectionBanner({ status: 'available' }));
      }

      return () => {
        clearTimers();
      };
    }, [
      isOffline,
      firstUnavailableEvmNetwork,
      clearTimers,
      dispatch,
      networkConnectionBannerState.status,
      startDegradedTimer,
      startUnavailableTimer,
    ]);

    const switchToDefaultRpc = useCallback(async () => {
      if (
        networkConnectionBannerState.status !== 'degraded' &&
        networkConnectionBannerState.status !== 'unavailable'
      ) {
        return;
      }

      const { chainId, defaultRpcEndpointIndex } = networkConnectionBannerState;
      if (defaultRpcEndpointIndex === undefined) {
        return;
      }

      const networkConfiguration = networkConfigurationsByChainId[chainId];
      if (!networkConfiguration) {
        return;
      }

      // Update the network configuration to use the built-in default endpoint.
      // Only show success toast if the update completes without error
      try {
        await dispatch(
          updateNetwork(
            {
              chainId,
              name: networkConfiguration.name,
              nativeCurrency: networkConfiguration.nativeCurrency,
              rpcEndpoints: networkConfiguration.rpcEndpoints,
              blockExplorerUrls: networkConfiguration.blockExplorerUrls,
              defaultBlockExplorerUrlIndex:
                networkConfiguration.defaultBlockExplorerUrlIndex,
              defaultRpcEndpointIndex,
            },
            { replacementSelectedRpcEndpointIndex: defaultRpcEndpointIndex },
          ),
        );
        dispatch(setShowDefaultRpcSwitchToast(true));
      } catch {
        // Error is already handled by updateNetwork which shows a warning
        // Do not show success toast on failure
      }
    }, [
      networkConnectionBannerState,
      networkConfigurationsByChainId,
      dispatch,
    ]);

    // When in degraded/unavailable status, use fresh selector data for network details
    // to prevent stale "Switch to 1do default RPC" button after switching endpoints
    if (
      (networkConnectionBannerState.status === 'degraded' ||
        networkConnectionBannerState.status === 'unavailable') &&
      firstUnavailableEvmNetwork
    ) {
      return {
        ...networkConnectionBannerState,
        // Override with fresh data from selector
        networkClientId: firstUnavailableEvmNetwork.networkClientId,
        networkName: firstUnavailableEvmNetwork.networkName,
        chainId: firstUnavailableEvmNetwork.chainId,
        isDefaultRpcEndpoint: firstUnavailableEvmNetwork.isDefaultRpcEndpoint,
        defaultRpcEndpointIndex:
          firstUnavailableEvmNetwork.defaultRpcEndpointIndex,
        switchToDefaultRpc,
      };
    }

    return {
      ...networkConnectionBannerState,
      switchToDefaultRpc,
    };
  };
