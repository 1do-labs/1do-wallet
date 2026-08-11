import {
  AccountsControllerAccountsAddedEvent,
  AccountsControllerAccountsRemovedEvent,
  AccountsControllerGetAccountAction,
  AccountsControllerGetSelectedMultichainAccountAction,
  AccountsControllerListMultichainAccountsAction,
  AccountsControllerSelectedAccountChangeEvent,
  AccountsControllerSetSelectedAccountAction,
} from '@metamask/accounts-controller';
import { Messenger } from '@metamask/messenger';
import { KeyringControllerGetStateAction } from '@metamask/keyring-controller';
import {
  MultichainAccountServiceCreateMultichainAccountGroupAction,
  MultichainAccountServiceCreateMultichainAccountGroupsAction,
  MultichainAccountServiceWalletStatusChangeEvent,
} from '@metamask/multichain-account-service';
import type { AccountTreeControllerMessenger as AccountTreeControllerMessengerType } from '@metamask/account-tree-controller';
import { RootMessenger } from '../../../lib/messenger';
import { AccountOrderControllerGetStateAction } from '../../../controllers/account-order';
import {
  UserStorageControllerGetStateAction,
  UserStorageControllerStateChangeEvent,
} from '../../../lib/no-remote-user-storage';

type Actions =
  | AccountsControllerGetAccountAction
  | AccountsControllerGetSelectedMultichainAccountAction
  | AccountsControllerSetSelectedAccountAction
  | AccountsControllerListMultichainAccountsAction
  | KeyringControllerGetStateAction
  | MultichainAccountServiceCreateMultichainAccountGroupAction
  | MultichainAccountServiceCreateMultichainAccountGroupsAction
  | UserStorageControllerGetStateAction;

type Events =
  | AccountsControllerAccountsAddedEvent
  | AccountsControllerAccountsRemovedEvent
  | AccountsControllerSelectedAccountChangeEvent
  | MultichainAccountServiceWalletStatusChangeEvent
  | UserStorageControllerStateChangeEvent;

export type AccountTreeControllerMessenger = AccountTreeControllerMessengerType;

/**
 * Get a restricted messenger for the account tree controller. This is scoped to the
 * actions and events that this controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getAccountTreeControllerMessenger(
  messenger: RootMessenger<Actions, Events>,
) {
  const accountTreeControllerMessenger = new Messenger<
    'AccountTreeController',
    Actions,
    Events,
    typeof messenger
  >({
    namespace: 'AccountTreeController',
    parent: messenger,
  });
  messenger.delegate({
    messenger: accountTreeControllerMessenger,
    events: [
      'AccountsController:accountsAdded',
      'AccountsController:accountsRemoved',
      'AccountsController:selectedAccountChange',
      'UserStorageController:stateChange',
      'MultichainAccountService:walletStatusChange',
    ],
    actions: [
      'AccountsController:listMultichainAccounts',
      'AccountsController:getAccount',
      'AccountsController:getSelectedMultichainAccount',
      'AccountsController:setSelectedAccount',
      'MultichainAccountService:createMultichainAccountGroup',
      'MultichainAccountService:createMultichainAccountGroups',
      'KeyringController:getState',
      'UserStorageController:getState',
    ],
  });
  return accountTreeControllerMessenger as unknown as AccountTreeControllerMessengerType;
}

export type AllowedInitializationActions =
  | AccountsControllerGetAccountAction
  | AccountOrderControllerGetStateAction;

export type AccountTreeControllerInitMessenger = ReturnType<
  typeof getAccountTreeControllerInitMessenger
>;

/**
 * Get a restricted messenger for the account tree controller. This is scoped to the
 * actions and events that this controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getAccountTreeControllerInitMessenger(
  messenger: RootMessenger<AllowedInitializationActions, Events>,
) {
  const accountTreeControllerInitMessenger = new Messenger<
    'AccountTreeControllerInit',
    AllowedInitializationActions,
    Events,
    typeof messenger
  >({
    namespace: 'AccountTreeControllerInit',
    parent: messenger,
  });
  messenger.delegate({
    messenger: accountTreeControllerInitMessenger,
    actions: [
      'AccountsController:getAccount',
      'AccountOrderController:getState',
    ],
    events: [],
  });
  return accountTreeControllerInitMessenger;
}
