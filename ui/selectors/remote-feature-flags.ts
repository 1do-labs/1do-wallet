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
 * @param _state - The MetaMask state object (ignored; remote state is disabled)
 * @returns Combined feature flags object with manifest flags taking precedence over state flags
 */
export const getRemoteFeatureFlags = (
  _state?: RemoteFeatureFlagsState,
): ManifestFlags['remoteFeatureFlags'] =>
  getManifestFlags().remoteFeatureFlags ?? {};
