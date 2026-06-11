import {
  ClientType,
  DistributionType,
  EnvironmentType,
  RemoteFeatureFlagController,
} from '@metamask/remote-feature-flag-controller';
import { ENVIRONMENT } from '../../../development/build/constants';
import { getBaseSemVerVersion } from '../../../shared/lib/feature-flags/version-gating';
import { MessengerClientInitFunction } from './types';
import {
  RemoteFeatureFlagControllerInitMessenger,
  RemoteFeatureFlagControllerMessenger,
} from './messengers';

const BUILD_TYPE_MAPPING = {
  flask: DistributionType.Flask,
  main: DistributionType.Main,
  beta: DistributionType.Beta,
  // Experimental builds use main distribution.
  experimental: DistributionType.Main,
};

const ENVIRONMENT_MAPPING = {
  [ENVIRONMENT.DEVELOPMENT]: EnvironmentType.Development,
  [ENVIRONMENT.RELEASE_CANDIDATE]: EnvironmentType.ReleaseCandidate,
  [ENVIRONMENT.PRODUCTION]: EnvironmentType.Production,
};

export function getConfigForRemoteFeatureFlagRequest() {
  assert(process.env.METAMASK_BUILD_TYPE, 'METAMASK_BUILD_TYPE is not defined');
  assert(
    process.env.METAMASK_ENVIRONMENT,
    'METAMASK_ENVIRONMENT is not defined',
  );
  const buildType = process.env.METAMASK_BUILD_TYPE;

  const distribution =
    BUILD_TYPE_MAPPING[buildType as keyof typeof BUILD_TYPE_MAPPING] ||
    DistributionType.Main;

  let environment =
    ENVIRONMENT_MAPPING[
      process.env.METAMASK_ENVIRONMENT as keyof typeof ENVIRONMENT_MAPPING
    ] || EnvironmentType.Development;

  if (buildType === 'experimental') {
    environment = EnvironmentType.Exp;
  }

  return { distribution, environment };
}

/**
 * Initialize the remote feature flag controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state of the extension.
 * @returns The initialized controller.
 */
export const RemoteFeatureFlagControllerInit: MessengerClientInitFunction<
  RemoteFeatureFlagController,
  RemoteFeatureFlagControllerMessenger,
  RemoteFeatureFlagControllerInitMessenger
> = ({ controllerMessenger, persistedState }) => {
  const { distribution, environment } = getConfigForRemoteFeatureFlagRequest();
  const prevClientVersion =
    persistedState?.AppMetadataController?.currentAppVersion;

  const messengerClient = new RemoteFeatureFlagController({
    state: persistedState.RemoteFeatureFlagController,
    messenger: controllerMessenger,
    fetchInterval: 15 * 60 * 1000, // 15 minutes in milliseconds
    disabled: true,
    getMetaMetricsId: () => undefined,
    clientVersion: getBaseSemVerVersion(),
    prevClientVersion,
    clientConfigApiService: {
      config: {
        client: ClientType.Extension,
        distribution,
        environment,
      },
      fetchRemoteFeatureFlags: async () => ({}),
    },
  });

  return {
    messengerClient,
  };
};
