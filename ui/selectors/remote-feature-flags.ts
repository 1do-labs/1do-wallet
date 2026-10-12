import {
  getManifestFlags,
  ManifestFlags,
} from '../../shared/lib/manifestFlags';

export type RemoteFeatureFlagsState = {
  metamask: {
    remoteFeatureFlags?: ManifestFlags['remoteFeatureFlags'];
  };
};

/**
 * Gets the remote feature flags by combining flags from both the manifest and state.
 * Manifest flags take precedence and will override any duplicate flags from state.
 * This allows for both static (manifest) and dynamic (state) feature flag configuration.
 *
 * @param state - The MetaMask state object.
 * @returns Combined feature flags object with manifest flags taking precedence over state flags
 */
export const getRemoteFeatureFlags = (
  state?: RemoteFeatureFlagsState,
): ManifestFlags['remoteFeatureFlags'] => ({
  ...state?.metamask?.remoteFeatureFlags,
  ...getManifestFlags().remoteFeatureFlags,
});
