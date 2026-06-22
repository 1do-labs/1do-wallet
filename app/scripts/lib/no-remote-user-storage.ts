import { Messenger } from '@metamask/messenger';
import type { RootMessenger } from './messenger';

export type NoRemoteUserStorageControllerState = {
  isBackupAndSyncEnabled: boolean;
  isBackupAndSyncUpdateLoading: boolean;
  isAccountSyncingEnabled: boolean;
  isContactSyncingEnabled: boolean;
  isContactSyncingInProgress: boolean;
};

export type UserStorageControllerGetStateAction = {
  type: 'UserStorageController:getState';
  handler: () => NoRemoteUserStorageControllerState;
};

export type UserStorageControllerStateChangeEvent = {
  type: 'UserStorageController:stateChange';
  payload: [NoRemoteUserStorageControllerState, unknown[]];
};

export const noRemoteUserStorageControllerState: NoRemoteUserStorageControllerState =
  {
    isBackupAndSyncEnabled: false,
    isBackupAndSyncUpdateLoading: false,
    isAccountSyncingEnabled: false,
    isContactSyncingEnabled: false,
    isContactSyncingInProgress: false,
  };

export function registerNoRemoteUserStorageControllerHandlers(
  messenger: RootMessenger<
    UserStorageControllerGetStateAction,
    UserStorageControllerStateChangeEvent
  >,
) {
  const userStorageMessenger = new Messenger<
    'UserStorageController',
    UserStorageControllerGetStateAction,
    UserStorageControllerStateChangeEvent,
    typeof messenger
  >({
    namespace: 'UserStorageController',
    parent: messenger,
  });

  userStorageMessenger.registerActionHandler(
    'UserStorageController:getState',
    () => ({
      ...noRemoteUserStorageControllerState,
    }),
  );
}
