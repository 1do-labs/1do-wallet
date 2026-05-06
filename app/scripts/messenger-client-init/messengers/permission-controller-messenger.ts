import { Messenger } from '@metamask/messenger';
import { NetworkControllerFindNetworkClientIdByChainIdAction } from '@metamask/network-controller';
import type {
  ApprovalControllerAddRequestAction,
  ApprovalControllerHasRequestAction,
  ApprovalControllerAcceptRequestAction,
  ApprovalControllerRejectRequestAction,
} from '@metamask/approval-controller';
import type { GetSubjectMetadata } from '@metamask/permission-controller';
import { AccountsControllerListAccountsAction } from '@metamask/accounts-controller';
import { RootMessenger } from '../../lib/messenger';

type AllowedActions =
  | ApprovalControllerAddRequestAction
  | ApprovalControllerHasRequestAction
  | ApprovalControllerAcceptRequestAction
  | ApprovalControllerRejectRequestAction
  | GetSubjectMetadata;

export type PermissionControllerMessenger = ReturnType<
  typeof getPermissionControllerMessenger
>;

/**
 * Create a messenger restricted to the allowed actions and events of the
 * permission controller.
 *
 * @param messenger - The base messenger used to create the restricted
 * messenger.
 */
export function getPermissionControllerMessenger(
  messenger: RootMessenger<AllowedActions, never>,
) {
  const controllerMessenger = new Messenger<
    'PermissionController',
    AllowedActions,
    never,
    typeof messenger
  >({
    namespace: 'PermissionController',
    parent: messenger,
  });
  messenger.delegate({
    messenger: controllerMessenger,
    actions: [
      'ApprovalController:addRequest',
      'ApprovalController:hasRequest',
      'ApprovalController:acceptRequest',
      'ApprovalController:rejectRequest',
      'SubjectMetadataController:getSubjectMetadata',
    ],
  });
  return controllerMessenger;
}

type AllowedInitializationActions =
  | AccountsControllerListAccountsAction
  | NetworkControllerFindNetworkClientIdByChainIdAction;

export type PermissionControllerInitMessenger = ReturnType<
  typeof getPermissionControllerInitMessenger
>;

/**
 * Create a messenger restricted to the allowed actions and events needed to
 * initialize the permission controller.
 *
 * @param messenger - The base messenger used to create the restricted
 * messenger.
 */
export function getPermissionControllerInitMessenger(
  messenger: RootMessenger<AllowedInitializationActions, never>,
) {
  const controllerInitMessenger = new Messenger<
    'PermissionControllerInit',
    AllowedInitializationActions,
    never,
    typeof messenger
  >({
    namespace: 'PermissionControllerInit',
    parent: messenger,
  });
  messenger.delegate({
    messenger: controllerInitMessenger,
    actions: [
      'AccountsController:listAccounts',
      'NetworkController:findNetworkClientIdByChainId',
    ],
  });
  return controllerInitMessenger;
}
