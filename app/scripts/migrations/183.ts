import { getErrorMessage, hasProperty, Hex, isObject } from '@metamask/utils';
import { cloneDeep } from 'lodash';
import { captureException } from '../../../shared/lib/local-error-log';
import { CHAIN_IDS } from '../../../shared/constants/network';

type VersionedData = {
  meta: { version: number };
  data: Record<string, unknown>;
};

export const version = 183;

const SEI_CHAIN_ID: Hex = CHAIN_IDS.SEI;

/**
 * This migration adds QuickNode failover URL to Sei network RPC endpoints
 * that use Infura and don't already have a failover URL configured.
 *
 * @param originalVersionedData - The original MetaMask extension state.
 * @returns Updated versioned MetaMask extension state.
 */
export async function migrate(
  originalVersionedData: VersionedData,
): Promise<VersionedData> {
  const versionedData = cloneDeep(originalVersionedData);
  versionedData.meta.version = version;

  try {
    transformState(versionedData.data);
  } catch (error) {
    console.error(error);
    const newError = new Error(
      `Migration #${version}: ${getErrorMessage(error)}`,
    );
    captureException(newError);
    // Even though we encountered an error, we need the migration to pass for
    // the migrator tests to work
    versionedData.data = originalVersionedData.data;
  }

  return versionedData;
}

function transformState(state: Record<string, unknown>) {
  if (!hasProperty(state, 'NetworkController')) {
    console.warn(`Migration ${version}: NetworkController not found.`);
    return state;
  }

  const networkState = state.NetworkController;
  if (!isObject(networkState)) {
    return state;
  }

  if (!hasProperty(networkState, 'networkConfigurationsByChainId')) {
    return state;
  }

  if (!isObject(networkState.networkConfigurationsByChainId)) {
    return state;
  }

  const { networkConfigurationsByChainId } = networkState;

  // Get Sei network configuration
  const seiNetworkConfiguration = networkConfigurationsByChainId[SEI_CHAIN_ID];

  if (!seiNetworkConfiguration) {
    // Sei network doesn't exist, nothing to migrate
    return state;
  }

  if (
    !isObject(seiNetworkConfiguration) ||
    !hasProperty(seiNetworkConfiguration, 'rpcEndpoints') ||
    !Array.isArray(seiNetworkConfiguration.rpcEndpoints)
  ) {
    return state;
  }

  // Update RPC endpoints to add failover URL if needed
  seiNetworkConfiguration.rpcEndpoints =
    seiNetworkConfiguration.rpcEndpoints.map((rpcEndpoint) => {
      // Skip if endpoint is not an object or doesn't have a url property
      if (
        !isObject(rpcEndpoint) ||
        !hasProperty(rpcEndpoint, 'url') ||
        typeof rpcEndpoint.url !== 'string'
      ) {
        return rpcEndpoint;
      }

      // Skip if endpoint already has failover URLs
      if (
        hasProperty(rpcEndpoint, 'failoverUrls') &&
        Array.isArray(rpcEndpoint.failoverUrls) &&
        rpcEndpoint.failoverUrls.length > 0
      ) {
        return rpcEndpoint;
      }

      return rpcEndpoint;
    });

  return state;
}
