import { Messenger } from '@metamask/messenger';
import type {
  ControllerGetStateAction,
  ControllerStateChangeEvent,
} from '@metamask/base-controller';
import type {
  AccountsControllerGetSelectedAccountAction,
  AccountsControllerSelectedEvmAccountChangeEvent,
} from '@metamask/accounts-controller';
import type {
  NetworkControllerFindNetworkClientIdByChainIdAction,
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerGetStateAction,
  NetworkControllerStateChangeEvent,
} from '@metamask/network-controller';
import type { TokenListState } from '@metamask/assets-controllers';
import {
  StorageServiceGetAllKeysAction,
  StorageServiceGetItemAction,
  StorageServiceSetItemAction,
} from '@metamask/storage-service';
import {
  PreferencesControllerGetStateAction,
  PreferencesControllerStateChangeEvent,
} from '../../controllers/preferences-controller';
import { RootMessenger } from '../../lib/messenger';

type AllowedActions =
  | ControllerGetStateAction<'TokenListController', TokenListState>
  | AccountsControllerGetSelectedAccountAction
  | NetworkControllerFindNetworkClientIdByChainIdAction
  | NetworkControllerGetNetworkClientByIdAction
  | StorageServiceGetAllKeysAction
  | StorageServiceSetItemAction
  | StorageServiceGetItemAction;

type AllowedEvents =
  | AccountsControllerSelectedEvmAccountChangeEvent
  | NetworkControllerStateChangeEvent
  | ControllerStateChangeEvent<'TokenListController', TokenListState>;

export type TokenListControllerMessenger = ReturnType<
  typeof getTokenListControllerMessenger
>;

/**
 * Create a messenger restricted to the allowed actions and events of the
 * token list controller.
 *
 * @param messenger - The base messenger used to create the restricted
 * messenger.
 */
export function getTokenListControllerMessenger(
  messenger: RootMessenger<AllowedActions, AllowedEvents>,
) {
  const controllerMessenger = new Messenger<
    'TokenListController',
    AllowedActions,
    AllowedEvents,
    typeof messenger
  >({
    namespace: 'TokenListController',
    parent: messenger,
  });
  messenger.delegate({
    messenger: controllerMessenger,
    actions: [
      'AccountsController:getSelectedAccount',
      'NetworkController:findNetworkClientIdByChainId',
      'NetworkController:getNetworkClientById',
      'StorageService:getAllKeys',
      'StorageService:setItem',
      'StorageService:getItem',
    ],
    events: [
      'AccountsController:selectedEvmAccountChange',
      'NetworkController:stateChange',
    ],
  });
  return controllerMessenger;
}

type AllowedInitializationActions =
  | NetworkControllerGetNetworkClientByIdAction
  | NetworkControllerGetStateAction
  | PreferencesControllerGetStateAction;

type AllowedInitializationEvents = PreferencesControllerStateChangeEvent;

export type TokenListControllerInitMessenger = ReturnType<
  typeof getTokenListControllerInitMessenger
>;

/**
 * Create a messenger restricted to the allowed actions and events needed during
 * initialization of the token list controller.
 *
 * @param messenger
 */
export function getTokenListControllerInitMessenger(
  messenger: RootMessenger<
    AllowedInitializationActions,
    AllowedInitializationEvents
  >,
) {
  const controllerInitMessenger = new Messenger<
    'TokenListControllerInit',
    AllowedInitializationActions,
    AllowedInitializationEvents,
    typeof messenger
  >({
    namespace: 'TokenListControllerInit',
    parent: messenger,
  });
  messenger.delegate({
    messenger: controllerInitMessenger,
    actions: [
      'NetworkController:getNetworkClientById',
      'NetworkController:getState',
      'PreferencesController:getState',
    ],
    events: ['PreferencesController:stateChange'],
  });
  return controllerInitMessenger;
}
