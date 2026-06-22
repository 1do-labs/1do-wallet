import { cloneDeep } from 'lodash';

export const version = 106;

export async function migrate(originalVersionedData) {
  const versionedData = cloneDeep(originalVersionedData);
  versionedData.meta.version = version;
  return versionedData;
}
