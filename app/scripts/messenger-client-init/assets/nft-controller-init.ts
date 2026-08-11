import { NftController } from '@metamask/assets-controllers';
import { MessengerClientInitFunction } from '../types';
import {
  NftControllerMessenger,
  NftControllerInitMessenger,
} from '../messengers/assets';

/**
 * Initialize the NFT controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state of the extension.
 * @returns The initialized controller.
 */
export const NftControllerInit: MessengerClientInitFunction<
  NftController,
  NftControllerMessenger,
  NftControllerInitMessenger
> = ({ controllerMessenger, persistedState }) => {
  const messengerClient = new NftController({
    state: persistedState.NftController,
    messenger: controllerMessenger,
  });

  return {
    messengerClient,
  };
};
