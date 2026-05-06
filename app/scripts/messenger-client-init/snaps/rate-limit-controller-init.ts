import {
  RateLimitController,
  RateLimitedApiMap,
} from '@metamask/rate-limit-controller';
import log from 'loglevel';
import { MessengerClientInitFunction } from '../types';
import {
  RateLimitControllerInitMessenger,
  RateLimitControllerMessenger,
} from '../messengers/snaps';

/**
 * Initialize the rate limit controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The controller messenger to use for the
 * controller.
 * @param request.persistedState - The persisted state of the extension.
 * @param request.initMessenger - The init messenger. This has access to
 * different functions than the controller messenger, and should be used for
 * initialization purposes only.
 * @param request.showNotification - Function to show a notification.
 * @returns The initialized controller.
 */
export const RateLimitControllerInit: MessengerClientInitFunction<
  RateLimitController<RateLimitedApiMap>,
  RateLimitControllerMessenger,
  RateLimitControllerInitMessenger
> = ({
  controllerMessenger,
  initMessenger,
  persistedState,
  showNotification,
}) => {
  const messengerClient = new RateLimitController({
    state: persistedState.RateLimitController,
    messenger: controllerMessenger,

    implementations: {
      showNativeNotification: {
        method: (origin, message) => {
          const subjectMetadataState = initMessenger.call(
            'SubjectMetadataController:getState',
          );

          const originMetadata = subjectMetadataState.subjectMetadata[origin];

          showNotification(originMetadata?.name ?? origin, message).catch(
            (error: unknown) => {
              log.error('Failed to create notification', error);
            },
          );

          return null;
        },

        // 2 calls per 5 minutes
        rateLimitCount: 2,
        rateLimitTimeout: 300_000,
      },

      showInAppNotification: {
        method: () => {
          // External Snap in-app notifications are disabled in the EVM-only build.
          return null;
        },

        // 5 calls per minute
        rateLimitCount: 5,
        rateLimitTimeout: 60_000,
      },
    },
  });

  return {
    messengerClient,
    memStateKey: null,
    persistedStateKey: null,
  };
};
