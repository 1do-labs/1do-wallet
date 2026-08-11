import type { ControllerGetStateAction } from '@metamask/base-controller';
import { Messenger, MessengerEvents } from '@metamask/messenger';
import type { NetworkControllerFindNetworkClientIdByChainIdAction } from '@metamask/network-controller';
import {
  TokensControllerState,
  TokensControllerAddTokensAction,
} from '@metamask/assets-controllers';

import { RootMessenger } from '../../lib/messenger';
import { type StaticAssetsControllerMessenger as StaticAssetsControllerMessengerType } from '../../controllers/static-assets-controller';

type TokensControllerGetStateAction = ControllerGetStateAction<
  'TokensController',
  TokensControllerState
>;

type AllowedActions =
  | NetworkControllerFindNetworkClientIdByChainIdAction
  | TokensControllerGetStateAction
  | TokensControllerAddTokensAction;

type AllowedEvents = MessengerEvents<StaticAssetsControllerMessengerType>;

export type StaticAssetsControllerMessenger = ReturnType<
  typeof getStaticAssetsControllerMessenger
>;

export function getStaticAssetsControllerMessenger(
  messenger: RootMessenger<AllowedActions, AllowedEvents>,
) {
  const controllerMessenger = new Messenger<
    'StaticAssetsController',
    AllowedActions,
    AllowedEvents,
    typeof messenger
  >({
    namespace: 'StaticAssetsController',
    parent: messenger,
  });
  messenger.delegate({
    messenger: controllerMessenger,
    actions: [
      'NetworkController:findNetworkClientIdByChainId',
      'TokensController:getState',
      'TokensController:addTokens',
    ],
    events: [],
  });
  return controllerMessenger;
}
