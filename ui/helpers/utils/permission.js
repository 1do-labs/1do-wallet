import deepFreeze from 'deep-freeze-strict';
import React from 'react';

import { Caip25EndowmentPermissionName } from '@metamask/chain-agnostic-permission';
import {
  RestrictedMethods,
  ConnectionPermission,
  PermissionWeight,
} from '../../../shared/constants/permissions';
import { Text, IconName } from '../../components/component-library';
import { FontWeight, TextColor, TextVariant } from '../constants/design-system';
// TODO: Remove restricted import
// eslint-disable-next-line import-x/no-restricted-paths
import { PermissionNames } from '../../../app/scripts/controllers/permissions';
import { getURLHost } from './util';

const UNKNOWN_PERMISSION = Symbol('unknown');

const PERMISSION_DESCRIPTIONS = deepFreeze({
  [Caip25EndowmentPermissionName]: ({
    t,
    isRequestApprovalPermittedChains,
  }) => {
    if (isRequestApprovalPermittedChains) {
      return {
        label: t('permission_walletSwitchEthereumChain'),
        leftIcon: IconName.Wifi,
        weight: PermissionWeight.permittedChains,
      };
    }
    return {
      label: t('permission_ethereumAccounts'),
      leftIcon: IconName.Eye,
      weight: PermissionWeight.eth_accounts,
    };
  },
  [RestrictedMethods.eth_accounts]: ({ t }) => ({
    label: t('permission_ethereumAccounts'),
    leftIcon: IconName.Eye,
    weight: PermissionWeight.eth_accounts,
  }),
  [PermissionNames.permittedChains]: ({ t }) => ({
    label: t('permission_walletSwitchEthereumChain'),
    leftIcon: IconName.Wifi,
    weight: PermissionWeight.permittedChains,
  }),
  // connection_permission is pseudo permission used only for
  // displaying pre-approved connections alongside other permissions
  [ConnectionPermission.connection_permission]: ({
    t,
    permissionValue,
    subjectName,
  }) => {
    return Object.keys(permissionValue).map((connection) => {
      const connectionName = getURLHost(connection);
      return {
        label: t('permissionConnectTo', [
          <Text
            key="connectToMain"
            fontWeight={FontWeight.Medium}
            variant={TextVariant.inherit}
            color={TextColor.inherit}
            style={{ lineBreak: 'anywhere' }}
          >
            {connectionName}
          </Text>,
        ]),
        description: t('permissionConnectionDescription', [
          subjectName,
          <Text
            key="connectToDescription"
            fontWeight={FontWeight.Medium}
            variant={TextVariant.inherit}
            color={TextColor.inherit}
          >
            {connectionName}
          </Text>,
        ]),
        leftIcon: undefined, // Icon for connections is handled by PermissionCell
        connection,
        connectionName,
        subjectName,
        weight: PermissionWeight.connection_permission,
      };
    });
  },
  [UNKNOWN_PERMISSION]: ({ t, permissionName }) => ({
    label: t('permission_unknown', [permissionName ?? 'undefined']),
    leftIcon: IconName.Question,
    rightIcon: null,
    weight: PermissionWeight.unknown_permission,
  }),
});

/**
 * @typedef {object} PermissionLabelObject
 * @property {string} label - The text label.
 * @property {string} [description] - An optional description, shown when the
 * `rightIcon` is hovered.
 * @property {string} leftIcon - The left icon.
 * @property {string} rightIcon - The right icon.
 * @property {number} weight - The weight of the permission.
 * @property {string} permissionName - The name of the permission.
 * @property {string} permissionValue - The raw value of the permission.
 */

/**
 * @typedef {object} PermissionDescriptionParamsObject
 * @property {Function} t - The translation function.
 * @property {boolean} [isRequestApprovalPermittedChains] - Flag for checking if request incoming from 'wallet_switchEthereumChain'.
 * @property {string} permissionName - The name of the permission.
 * @property {object} permissionValue - The permission object.
 * @property {string} subjectName - The name of the subject.
 * @property {Function} getSubjectName - The function used to get the subject name.
 */

/**
 * @param {PermissionDescriptionParamsObject} params - The permission description params object.
 * @returns {PermissionLabelObject[]}
 */
export const getPermissionDescription = ({
  t,
  isRequestApprovalPermittedChains,
  permissionName,
  permissionValue,
  subjectName,
  getSubjectName,
}) => {
  let value = PERMISSION_DESCRIPTIONS[UNKNOWN_PERMISSION];

  if (Object.hasOwnProperty.call(PERMISSION_DESCRIPTIONS, permissionName)) {
    value = PERMISSION_DESCRIPTIONS[permissionName];
  }

  const result = value({
    t,
    isRequestApprovalPermittedChains,
    permissionName,
    permissionValue,
    subjectName,
    getSubjectName,
  });
  if (!Array.isArray(result)) {
    return [{ ...result, permissionName, permissionValue }];
  }

  return result.map((item) => ({
    ...item,
    permissionName,
    permissionValue,
  }));
};

/**
 * @typedef {object} WeightedPermissionDescriptionParamsObject
 * @property {Function} t - The translation function.
 * @property {boolean} [isRequestApprovalPermittedChains] - Flag for checking if request incoming from 'wallet_switchEthereumChain'.
 * @property {string} permissions - The permissions object.
 * @property {Function} [getSubjectName] - The function to get a subject name.
 * @property {string} [subjectName] - The name of the subject.
 */

/**
 * Get the weighted permissions from a permissions object. The weight is used to
 * sort the permissions in the UI.
 *
 * @param {WeightedPermissionDescriptionParamsObject} params - The weighted permissions params object.
 * @returns {PermissionLabelObject[]}
 */
export function getWeightedPermissions({
  t,
  isRequestApprovalPermittedChains,
  permissions,
  getSubjectName,
  subjectName,
}) {
  return Object.entries(permissions)
    .reduce(
      (target, [permissionName, permissionValue]) =>
        target.concat(
          getPermissionDescription({
            t,
            isRequestApprovalPermittedChains,
            permissionName,
            permissionValue,
            subjectName,
            getSubjectName,
          }),
        ),
      [],
    )
    .sort((left, right) => left.weight - right.weight);
}
