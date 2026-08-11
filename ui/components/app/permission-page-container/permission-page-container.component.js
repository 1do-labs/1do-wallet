import PropTypes from 'prop-types';
import React, { Component } from 'react';
import {
  Caip25EndowmentPermissionName,
  generateCaip25Caveat,
  getCaipAccountIdsFromCaip25CaveatValue,
  getAllScopesFromCaip25CaveatValue,
} from '@metamask/chain-agnostic-permission';
import PermissionsConnectFooter from '../permissions-connect-footer';

import {
  Display,
  FlexDirection,
} from '../../../helpers/constants/design-system';
import { Box } from '../../component-library';
import {
  getCaip25CaveatValueFromPermissions,
  getCaip25PermissionsResponse,
} from '../../../pages/permissions-connect/connect-page/utils';
import { TemplateAlertContextProvider } from '../../../pages/confirmations/confirmation/alerts/TemplateAlertContext';
import { PermissionPageContainerFooter } from './permission-page-container-footer.component';
import PermissionPageContainerContent from './permission-page-container-content';

export default class PermissionPageContainer extends Component {
  static propTypes = {
    approvePermissionsRequest: PropTypes.func.isRequired,
    rejectPermissionsRequest: PropTypes.func.isRequired,
    selectedAccounts: PropTypes.array,
    requestedChainIds: PropTypes.array,
    /**
     * Full CAIP account IDs for chain-agnostic permission approval.
     * When provided, these are used instead of selectedAccounts for building
     * the CAIP-25 permission response.
     */
    selectedCaipAccountIds: PropTypes.arrayOf(PropTypes.string),
    /**
     * Full CAIP chain IDs for chain-agnostic permission approval.
     * When provided, these are used instead of requestedChainIds.
     */
    selectedCaipChainIds: PropTypes.arrayOf(PropTypes.string),
    allAccountsSelected: PropTypes.bool,
    request: PropTypes.object,
    requestMetadata: PropTypes.object,
    targetSubjectMetadata: PropTypes.shape({
      name: PropTypes.string,
      origin: PropTypes.string.isRequired,
      subjectType: PropTypes.string.isRequired,
      extensionId: PropTypes.string,
      iconUrl: PropTypes.string,
    }),
    navigate: PropTypes.func.isRequired,
    connectPath: PropTypes.string.isRequired,
  };

  static defaultProps = {
    request: {},
    requestMetadata: {},
    selectedAccounts: [],
    selectedCaipAccountIds: null,
    selectedCaipChainIds: null,
    allAccountsSelected: false,
  };

  static contextTypes = {
    t: PropTypes.func,
  };

  state = {};

  getRequestedPermissions() {
    const { request } = this.props;

    // if the request contains a diff this means its an incremental permission request
    return request?.diff?.permissionDiffMap ?? request.permissions ?? {};
  }

  goBack() {
    const { navigate, connectPath } = this.props;
    navigate(connectPath);
  }

  onCancel = () => {
    const { request, rejectPermissionsRequest } = this.props;
    rejectPermissionsRequest(request?.metadata?.id);
  };

  onSubmit = () => {
    const {
      request: _request,
      approvePermissionsRequest,
      rejectPermissionsRequest,
      selectedAccounts,
      requestedChainIds,
      selectedCaipAccountIds,
      selectedCaipChainIds,
    } = this.props;

    const requestedCaip25CaveatValue = getCaip25CaveatValueFromPermissions(
      _request.permissions,
    );

    let permissionsResponse;

    if (
      selectedCaipAccountIds?.length > 0 &&
      selectedCaipChainIds?.length > 0
    ) {
      // Use the CAIP-25 selection directly when the connect flow already
      // resolved CAIP account IDs and EVM chain IDs.
      permissionsResponse = generateCaip25Caveat(
        requestedCaip25CaveatValue,
        selectedCaipAccountIds,
        selectedCaipChainIds,
      );
    } else if (selectedAccounts?.length > 0) {
      // Fallback to EVM-only approach when only account addresses are selected.
      permissionsResponse = getCaip25PermissionsResponse(
        requestedCaip25CaveatValue,
        selectedAccounts.map((account) => account.address),
        requestedChainIds,
      );
    } else {
      // No user selection occurred (no selectedCaipAccountIds and no selectedAccounts).
      // This happens in scenarios like:
      // - Network-only permission changes (adding a new chain without changing accounts)
      // - Incremental permission requests that don't involve account selection UI
      //
      // Extract the account/chain IDs already embedded in the request's CAIP-25 caveat.
      // We must preserve these values rather than passing empty arrays, which would
      // effectively deny the permission or create an invalid state.
      const originalCaipAccountIds = getCaipAccountIdsFromCaip25CaveatValue(
        requestedCaip25CaveatValue,
      );
      const originalCaipChainIds = getAllScopesFromCaip25CaveatValue(
        requestedCaip25CaveatValue,
      );

      permissionsResponse = generateCaip25Caveat(
        requestedCaip25CaveatValue,
        originalCaipAccountIds,
        originalCaipChainIds,
      );
    }

    const request = {
      ..._request,
      permissions: {
        ..._request.permissions,
        ...permissionsResponse,
      },
    };

    if (Object.keys(request.permissions).length > 0) {
      approvePermissionsRequest(request);
    } else {
      rejectPermissionsRequest(request?.metadata?.id);
    }
  };

  onLeftFooterClick = () => {
    const requestedPermissions = this.getRequestedPermissions();
    if (requestedPermissions[Caip25EndowmentPermissionName] === undefined) {
      this.goBack();
    } else {
      this.onCancel();
    }
  };

  render() {
    const {
      request,
      requestMetadata,
      targetSubjectMetadata,
      selectedAccounts,
      allAccountsSelected,
      requestedChainIds,
      selectedCaipChainIds,
    } = this.props;

    const requestedPermissions = this.getRequestedPermissions();

    const footerLeftActionText = requestedPermissions[
      Caip25EndowmentPermissionName
    ]
      ? this.context.t('cancel')
      : this.context.t('back');

    return (
      <TemplateAlertContextProvider
        onSubmit={() => this.onSubmit()}
        confirmationId={request?.metadata?.id}
      >
        <PermissionPageContainerContent
          request={request}
          requestMetadata={requestMetadata}
          subjectMetadata={targetSubjectMetadata}
          selectedPermissions={requestedPermissions}
          requestedChainIds={requestedChainIds}
          selectedCaipChainIds={selectedCaipChainIds}
          selectedAccounts={selectedAccounts}
          allAccountsSelected={allAccountsSelected}
        />
        <Box display={Display.Flex} flexDirection={FlexDirection.Column}>
          <PermissionsConnectFooter />
          <PermissionPageContainerFooter
            onCancel={() => this.onLeftFooterClick()}
            cancelText={footerLeftActionText}
            onSubmit={() => this.onSubmit()}
          />
        </Box>
      </TemplateAlertContextProvider>
    );
  }
}
