import { ApprovalController } from '@metamask/approval-controller';
import { ApprovalType } from '@metamask/controller-utils';
import { MessengerClientInitFunction } from '../types';
import { ApprovalControllerMessenger } from '../messengers';

/**
 * Initialize the approval controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.showUserConfirmation
 * @returns The initialized controller.
 */
export const ApprovalControllerInit: MessengerClientInitFunction<
  ApprovalController,
  ApprovalControllerMessenger
> = ({ controllerMessenger, showUserConfirmation }) => {
  const messengerClient = new ApprovalController({
    messenger: controllerMessenger,
    showApprovalRequest: showUserConfirmation,
    typesExcludedFromRateLimiting: [
      ApprovalType.PersonalSign,
      ApprovalType.EthSignTypedData,
      ApprovalType.Transaction,
      ApprovalType.WatchAsset,
      ApprovalType.EthGetEncryptionPublicKey,
      ApprovalType.EthDecrypt,
    ],
  });

  return {
    persistedStateKey: null,
    memStateKey: null,
    messengerClient,
  };
};
