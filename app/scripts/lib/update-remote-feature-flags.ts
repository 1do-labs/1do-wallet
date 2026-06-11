import MetamaskController from '../metamask-controller';

/**
 * Remote feature flag fetching is disabled for this wallet build.
 *
 * @param _metamaskController - The MetaMask controller instance.
 * @returns A resolved promise.
 */
export async function updateRemoteFeatureFlags(
  _metamaskController: MetamaskController,
): Promise<void> {
  await Promise.resolve();
}
