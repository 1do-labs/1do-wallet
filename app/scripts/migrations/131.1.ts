import { cloneDeep } from 'lodash';

export const version = 131.1;

/**
 * Legacy no-op. 1DO does not migrate user RPC endpoints to Infura.
 *
 * @param originalVersionedData - Versioned extension state.
 * @param originalVersionedData.meta
 * @param originalVersionedData.meta.version
 * @param originalVersionedData.data
 * @returns Updated versioned extension state.
 */
export async function migrate(originalVersionedData: {
  meta: { version: number };
  data: Record<string, unknown>;
}) {
  const versionedData = cloneDeep(originalVersionedData);
  versionedData.meta.version = version;
  return versionedData;
}
