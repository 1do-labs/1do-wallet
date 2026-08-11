import { createSelector } from 'reselect';
import { getRemoteFeatureFlags } from '../remote-feature-flags';

export const getIsTransactionLabelsEnabled = createSelector(
  getRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    Boolean(remoteFeatureFlags?.extensionTransactionLabels),
);
