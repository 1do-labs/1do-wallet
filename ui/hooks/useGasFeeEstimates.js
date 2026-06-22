import isEqual from 'lodash/isEqual';
import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import {
  getGasEstimateTypeByChainId,
  getGasFeeEstimatesByChainId,
  getIsGasEstimatesLoadingByChainId,
  getIsNetworkBusyByChainId,
} from '../ducks/metamask/metamask';
import {
  gasFeeStartPollingByNetworkClientId,
  gasFeeStopPollingByPollingToken,
  getNetworkConfigurationByNetworkClientId,
} from '../store/actions';
import {
  getNetworkConfigurationsByChainId,
  getSelectedNetworkClientId,
} from '../../shared/lib/selectors/networks';
import usePolling from './usePolling';

const getChainIdForNetworkClientId = (
  networkConfigurationsByChainId,
  networkClientId,
) => {
  if (!networkClientId) {
    return '';
  }

  return (
    Object.entries(networkConfigurationsByChainId ?? {}).find(
      ([, networkConfiguration]) =>
        networkConfiguration.rpcEndpoints?.some(
          (rpcEndpoint) => rpcEndpoint.networkClientId === networkClientId,
        ),
    )?.[0] ?? ''
  );
};

/**
 * @typedef {object} GasEstimates
 * @property {import(
 *   '@metamask/gas-fee-controller'
 * ).GasFeeState['gasFeeEstimates']} gasFeeEstimates - The estimate object
 * @property {object} gasEstimateType - The type of estimate provided
 * @property {boolean} isGasEstimatesLoading - indicates whether the gas
 *  estimates are currently loading.
 * @property {boolean} isNetworkBusy - indicates whether the network is busy.
 */

/**
 * Gets the current gasFeeEstimates from state and begins polling for new
 * estimates. When this hook is removed from the tree it will signal to the
 * GasFeeController that it is done requiring new gas estimates. Also checks
 * the returned gas estimate for validity on the current network.
 *
 * @param _networkClientId - The optional network client ID to get gas fee estimates for. Defaults to the currently selected network.
 * @param enabled - Whether to enable gas fee estimation polling. Defaults to true.
 * @returns {GasEstimates} GasEstimates object
 */
export function useGasFeeEstimates(_networkClientId, enabled = true) {
  const selectedNetworkClientId = useSelector(getSelectedNetworkClientId);
  const networkClientId = _networkClientId ?? selectedNetworkClientId;
  const networkConfigurationsByChainId = useSelector(
    getNetworkConfigurationsByChainId,
  );
  const chainIdFromState = getChainIdForNetworkClientId(
    networkConfigurationsByChainId,
    networkClientId,
  );

  const [chainIdFromBackground, setChainIdFromBackground] = useState('');
  const chainId = chainIdFromState || chainIdFromBackground;

  const gasEstimateType = useSelector((state) =>
    getGasEstimateTypeByChainId(state, chainId),
  );
  const gasFeeEstimates = useSelector(
    (state) => getGasFeeEstimatesByChainId(state, chainId),
    isEqual,
  );
  const isGasEstimatesLoading = useSelector((state) =>
    getIsGasEstimatesLoadingByChainId(state, {
      chainId,
      networkClientId,
    }),
  );
  const isNetworkBusy = useSelector((state) =>
    getIsNetworkBusyByChainId(state, chainId),
  );

  useEffect(() => {
    if (!enabled) {
      return () => {
        // No cleanup needed when disabled
      };
    }

    if (chainIdFromState) {
      setChainIdFromBackground('');
      return () => {
        // No cleanup needed when chain ID is available in state
      };
    }

    let isMounted = true;
    getNetworkConfigurationByNetworkClientId(networkClientId).then(
      (networkConfig) => {
        if (networkConfig && isMounted) {
          setChainIdFromBackground(networkConfig.chainId);
        }
      },
    );

    return () => {
      isMounted = false;
    };
  }, [networkClientId, enabled, chainIdFromState]);

  usePolling({
    startPolling: (input) =>
      gasFeeStartPollingByNetworkClientId(input.networkClientId),
    stopPollingByPollingToken: gasFeeStopPollingByPollingToken,
    input: { networkClientId },
    enabled,
  });

  return {
    gasFeeEstimates,
    gasEstimateType,
    isGasEstimatesLoading,
    isNetworkBusy,
  };
}
