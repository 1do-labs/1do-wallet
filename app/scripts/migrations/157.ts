import { getErrorMessage, hasProperty, Hex, isObject } from '@metamask/utils';
import { cloneDeep } from 'lodash';
import { captureException } from '../../../shared/lib/local-error-log';

type VersionedData = {
  meta: { version: number };
  data: Record<string, unknown>;
};

export const version = 157;

export const INFURA_CHAINS_WITH_FAILOVERS: Map<Hex, { subdomain: string }> =
  new Map([
    ['0x1', { subdomain: 'mainnet' }],
    ['0xe708', { subdomain: 'linea-mainnet' }],
    ['0xa4b1', { subdomain: 'arbitrum' }],
    ['0xa86a', { subdomain: 'avalanche' }],
    ['0xa', { subdomain: 'optimism' }],
    ['0x89', { subdomain: 'polygon' }],
    ['0x2105', { subdomain: 'base' }],
  ]);

/**
 * This migration previously assigned failover URLs to legacy Infura endpoints.
 * 1do does not add remote failover URLs during migration.
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
    throw new Error('Missing NetworkController state');
  }

  if (!isObject(state.NetworkController)) {
    throw new Error(
      `Expected state.NetworkController to be an object, but is ${typeof state.NetworkController}`,
    );
  }

  if (!hasProperty(state.NetworkController, 'networkConfigurationsByChainId')) {
    throw new Error(
      'Missing state.NetworkController.networkConfigurationsByChainId',
    );
  }

  if (!isObject(state.NetworkController.networkConfigurationsByChainId)) {
    throw new Error(
      `Expected state.NetworkController.networkConfigurationsByChainId to be an object, but is ${typeof state
        .NetworkController.networkConfigurationsByChainId}`,
    );
  }

  const { networkConfigurationsByChainId } = state.NetworkController;

  for (const networkConfiguration of Object.values(
    networkConfigurationsByChainId,
  )) {
    if (
      !isObject(networkConfiguration) ||
      !hasProperty(networkConfiguration, 'rpcEndpoints') ||
      !Array.isArray(networkConfiguration.rpcEndpoints)
    ) {
      continue;
    }

    networkConfiguration.rpcEndpoints = networkConfiguration.rpcEndpoints.map(
      (rpcEndpoint) => {
        if (
          !isObject(rpcEndpoint) ||
          !hasProperty(rpcEndpoint, 'url') ||
          typeof rpcEndpoint.url !== 'string' ||
          (hasProperty(rpcEndpoint, 'failoverUrls') &&
            Array.isArray(rpcEndpoint.failoverUrls) &&
            rpcEndpoint.failoverUrls.length > 0)
        ) {
          return rpcEndpoint;
        }

        return rpcEndpoint;
      },
    );
  }
}
