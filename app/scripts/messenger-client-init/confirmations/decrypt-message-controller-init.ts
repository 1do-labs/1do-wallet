import {
  DecryptMessageController,
  DecryptMessageControllerMessenger,
} from '../../controllers/decrypt-message';
import { MessengerClientInitFunction } from '../types';
import { DecryptMessageControllerInitMessenger } from '../messengers/decrypt-message-controller-messenger';

/**
 * Initialize the decryptMessage controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.getMessengerClient - Function to get other initialized controllers.
 * @param request.getUIState - Function to get the UI state.
 * @returns The initialized controller.
 */
export const DecryptMessageControllerInit: MessengerClientInitFunction<
  DecryptMessageController,
  DecryptMessageControllerMessenger,
  DecryptMessageControllerInitMessenger
> = ({ controllerMessenger, getMessengerClient, getUIState }) => {
  const manager = getMessengerClient('DecryptMessageManager');

  const messengerClient = new DecryptMessageController({
    messenger: controllerMessenger,
    manager,
    getState: getUIState,
  });

  return {
    persistedStateKey: null,
    memStateKey: null,
    messengerClient,
  };
};
