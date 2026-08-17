import { AlchemyTokenListController } from '../controllers/alchemy-token-list-controller';
import { MessengerClientInitFunction } from './types';
import {
  TokenListControllerInitMessenger,
  TokenListControllerMessenger,
} from './messengers';

export const TokenListControllerInit: MessengerClientInitFunction<
  AlchemyTokenListController,
  TokenListControllerMessenger,
  TokenListControllerInitMessenger
> = ({ controllerMessenger, persistedState }) => {
  const messengerClient = new AlchemyTokenListController({
    messenger: controllerMessenger,
    state: persistedState.TokenListController,
  });

  // Initialize the controller to load cached token lists from storage.
  // This is a fire-and-forget operation - if it fails, the controller will
  // self-heal by fetching token lists on demand when needed.
  messengerClient.initialize().catch((error: Error) => {
    console.error(
      'TokenListController: Failed to initialize from storage:',
      error,
    );
  });

  return {
    messengerClient,
  };
};
