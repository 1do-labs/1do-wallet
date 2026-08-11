import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import withRouterHooks from '../../helpers/higher-order-components/with-router-hooks/with-router-hooks';
import {
  getUseExternalServices,
  getIsMainnet,
  getTotalUnapprovedCount,
  getShowRecoveryPhraseReminder,
  getShowTermsOfUse,
  getShowOutdatedBrowserWarning,
  getNewNetworkAdded,
  getIsSigningQRHardwareTransaction,
  getIsHardwareWalletErrorModalVisible,
  getNewNftAddedMessage,
  getNewTokensImported,
  getRemoveNftMessage,
  getApprovalFlows,
  getNewTokensImportedError,
  getSelectedInternalAccount,
  getEditedNetwork,
  getShowUpdateModal,
  getPendingRedirectRoute,
} from '../../selectors';
import { getInfuraBlocked } from '../../../shared/lib/selectors/networks';
import {
  attemptCloseNotificationPopup,
  setConnectedStatusPopoverHasBeenShown,
  setRecoveryPhraseReminderHasBeenShown,
  setRecoveryPhraseReminderLastShown,
  setTermsOfUseLastAgreed,
  setOutdatedBrowserWarningLastShown,
  setNewNetworkAdded,
  setNewNftAddedMessage,
  setRemoveNftMessage,
  setNewTokensImported,
  setActiveNetwork,
  setNewTokensImportedError,
  setEditedNetwork,
  lookupSelectedNetworks,
  setPendingRedirectRoute,
} from '../../store/actions';
import { openBasicFunctionalityModal } from '../../ducks/app/app';
import { getIsPrimarySeedPhraseBackedUp } from '../../ducks/metamask/metamask';
// TODO: Remove restricted import
// eslint-disable-next-line import-x/no-restricted-paths
import { getEnvironmentType } from '../../../app/scripts/lib/util';
import { getIsBrowserDeprecated } from '../../helpers/utils/util';
import {
  ENVIRONMENT_TYPE_NOTIFICATION,
  ENVIRONMENT_TYPE_POPUP,
} from '../../../shared/constants/app';
import { getShouldShowSeedPhraseReminder } from '../../selectors/multi-srp/multi-srp';
import {
  getRedirectAfterDefaultPage,
  clearRedirectAfterDefaultPage,
  setRedirectAfterDefaultPage,
} from '../../ducks/history/history';
import { AppHeader } from '../../components/multichain/app-header';
import { DappConnectionControlBar } from '../../components/multichain/dapp-connection-control-bar';
import Home from './home.component';

const mapStateToProps = (state) => {
  const { metamask, appState } = state;
  const {
    seedPhraseBackedUp,
    connectedStatusPopoverHasBeenShown,
    firstTimeFlowType,
    completedOnboarding,
    forgottenPassword,
  } = metamask;
  const selectedAccount = getSelectedInternalAccount(state);
  const { address: selectedAddress } = selectedAccount;
  const totalUnapprovedCount = getTotalUnapprovedCount(state);
  const redirectAfterDefaultPage = getRedirectAfterDefaultPage(state);

  const envType = getEnvironmentType();
  const isPopup = envType === ENVIRONMENT_TYPE_POPUP;
  const isNotification = envType === ENVIRONMENT_TYPE_NOTIFICATION;

  const shouldShowSeedPhraseReminder =
    selectedAccount && getShouldShowSeedPhraseReminder(state, selectedAccount);

  return {
    useExternalServices: getUseExternalServices(state),
    isBasicConfigurationModalOpen: appState.showBasicFunctionalityModal,
    forgottenPassword,
    shouldShowSeedPhraseReminder,
    envType,
    isPopup,
    isNotification,
    selectedAddress,
    totalUnapprovedCount,
    hasApprovalFlows: getApprovalFlows(state)?.length > 0,
    connectedStatusPopoverHasBeenShown,
    firstTimeFlowType,
    completedOnboarding,
    isMainnet: getIsMainnet(state),
    infuraBlocked: getInfuraBlocked(state),
    showRecoveryPhraseReminder: getShowRecoveryPhraseReminder(state),
    showTermsOfUsePopup: getShowTermsOfUse(state),
    showOutdatedBrowserWarning:
      getIsBrowserDeprecated() && getShowOutdatedBrowserWarning(state),
    seedPhraseBackedUp,
    newNetworkAddedName: getNewNetworkAdded(state),
    editedNetwork: getEditedNetwork(state),
    isSigningQRHardwareTransaction: getIsSigningQRHardwareTransaction(state),
    isHardwareWalletErrorModalVisible:
      getIsHardwareWalletErrorModalVisible(state),
    newNftAddedMessage: getNewNftAddedMessage(state),
    removeNftMessage: getRemoveNftMessage(state),
    newTokensImported: getNewTokensImported(state),
    newTokensImportedError: getNewTokensImportedError(state),
    newNetworkAddedConfigurationId: appState.newNetworkAddedConfigurationId,
    onboardedInThisUISession: appState.onboardedInThisUISession,
    hasAllowedPopupRedirectApprovals: false,
    showMultiRpcModal: state.metamask.preferences.showMultiRpcModal,
    showUpdateModal: getShowUpdateModal(state),
    redirectAfterDefaultPage,
    isPrimarySeedPhraseBackedUp: getIsPrimarySeedPhraseBackedUp(state),
    pendingRedirectRoute: getPendingRedirectRoute(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    attemptCloseNotificationPopup: () => attemptCloseNotificationPopup(),
    setConnectedStatusPopoverHasBeenShown: () =>
      dispatch(setConnectedStatusPopoverHasBeenShown()),
    setRecoveryPhraseReminderHasBeenShown: () =>
      dispatch(setRecoveryPhraseReminderHasBeenShown()),
    setRecoveryPhraseReminderLastShown: (lastShown) =>
      dispatch(setRecoveryPhraseReminderLastShown(lastShown)),
    setTermsOfUseLastAgreed: (lastAgreed) => {
      dispatch(setTermsOfUseLastAgreed(lastAgreed));
    },
    setOutdatedBrowserWarningLastShown: (lastShown) => {
      dispatch(setOutdatedBrowserWarningLastShown(lastShown));
    },
    setNewNftAddedMessage: (message) => {
      dispatch(setRemoveNftMessage(''));
      dispatch(setNewNftAddedMessage(message));
    },
    setRemoveNftMessage: (message) => {
      dispatch(setNewNftAddedMessage(''));
      dispatch(setRemoveNftMessage(message));
    },
    setNewTokensImported: (newTokens) => {
      dispatch(setNewTokensImported(newTokens));
    },
    setNewTokensImportedError: (msg) => {
      dispatch(setNewTokensImportedError(msg));
    },
    clearNewNetworkAdded: () => {
      dispatch(setNewNetworkAdded({}));
    },
    clearEditedNetwork: () => {
      dispatch(setEditedNetwork());
    },
    setActiveNetwork: (networkConfigurationId) => {
      dispatch(setActiveNetwork(networkConfigurationId));
    },
    setBasicFunctionalityModalOpen: () =>
      dispatch(openBasicFunctionalityModal()),
    setRedirectAfterDefaultPage: (redirectAfterDefaultPage) =>
      dispatch(setRedirectAfterDefaultPage(redirectAfterDefaultPage)),
    clearRedirectAfterDefaultPage: () =>
      dispatch(clearRedirectAfterDefaultPage()),
    lookupSelectedNetworks: () => dispatch(lookupSelectedNetworks()),
    clearPendingRedirectRoute: () => dispatch(setPendingRedirectRoute(null)),
  };
};

// Strip unused 'match' prop from withRouter
// It causes cascading, unnecessary re-renders
// eslint-disable-next-line react/prop-types
const HomeWithRouter = ({ match: _match, ...props }) => {
  return (
    <>
      <AppHeader />

      <div className="flex flex-col flex-1 min-h-0">
        <Home {...props} />
        <DappConnectionControlBar />
      </div>
    </>
  );
};

export default compose(
  withRouterHooks,
  connect(mapStateToProps, mapDispatchToProps),
)(HomeWithRouter);
