import { isEvmAccountType } from '@metamask/keyring-api';
import { getNetworkConfigurationsByChainId } from '../../shared/lib/selectors/networks';
import { createDeepEqualSelector } from '../../shared/lib/selectors/selector-creators';
import {
  getOrderedConnectedAccountsForActiveTab,
  getOriginOfCurrentTab,
  getAllDomains,
} from './selectors';

export const getDappActiveNetwork = createDeepEqualSelector(
  getOrderedConnectedAccountsForActiveTab,
  getOriginOfCurrentTab,
  getAllDomains,
  getNetworkConfigurationsByChainId,
  (
    orderedConnectedAccounts,
    activeTabOrigin,
    allDomains,
    networkConfigurationsByChainId,
  ) => {
    if (!orderedConnectedAccounts || orderedConnectedAccounts.length === 0) {
      return null;
    }

    const selectedAccount = orderedConnectedAccounts[0];
    if (!isEvmAccountType(selectedAccount.type)) {
      return null;
    }

    if (!activeTabOrigin || !allDomains) {
      return null;
    }

    const networkClientId = allDomains[activeTabOrigin];
    if (!networkClientId) {
      return null;
    }

    for (const chainId in networkConfigurationsByChainId) {
      if (
        Object.prototype.hasOwnProperty.call(
          networkConfigurationsByChainId,
          chainId,
        )
      ) {
        const network =
          networkConfigurationsByChainId[
            chainId as keyof typeof networkConfigurationsByChainId
          ];
        const hasMatchingEndpoint = network.rpcEndpoints.some(
          (rpcEndpoint) => rpcEndpoint.networkClientId === networkClientId,
        );
        if (hasMatchingEndpoint) {
          return { ...network, isEvm: true };
        }
      }
    }

    return null;
  },
);
