import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import { Text, TextVariant, TextColor } from '@metamask/design-system-react';
import TermsOfUsePopup from '../../components/app/terms-of-use-popup';
import RecoveryPhraseReminder from '../../components/app/recovery-phrase-reminder';
import { FirstTimeFlowType } from '../../../shared/constants/onboarding';
import HomeNotification from '../../components/app/home-notification';
import MultipleNotifications from '../../components/app/multiple-notifications';
import Button from '../../components/ui/button';
import Popover from '../../components/ui/popover';
import ConnectedSites from '../connected-sites';
import ConnectedAccounts from '../connected-accounts';
import { isMv3ButOffscreenDocIsMissing } from '../../../shared/lib/mv3.utils';
import ActionableMessage from '../../components/ui/actionable-message/actionable-message';
import { ScrollContainer } from '../../contexts/scroll-container';
import { FontWeight, Display } from '../../helpers/constants/design-system';
import { SECOND } from '../../../shared/constants/time';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Box,
  Icon,
} from '../../components/component-library';
import MultiRpcEditModal from '../../components/app/multi-rpc-edit-modal/multi-rpc-edit-modal';
import UpdateModal from '../../components/app/update-modal/update-modal';
import {
  RESTORE_VAULT_ROUTE,
  CONNECTED_ROUTE,
  CONNECTED_ACCOUNTS_ROUTE,
  ONBOARDING_REVIEW_SRP_ROUTE,
} from '../../helpers/constants/routes';
import ZENDESK_URLS from '../../helpers/constants/zendesk-url';
import { AccountOverview } from '../../components/multichain';
import { isBeta, isFlask } from '../../../shared/lib/build-types';
import BetaAndFlaskHomeFooter from './beta-and-flask-home-footer.component';
import { HomeDeepLinkActions } from './HomeDeepLinkActions';

function shouldCloseNotificationPopup({
  isNotification,
  totalUnapprovedCount,
  hasApprovalFlows,
  isSigningQRHardwareTransaction,
  isHardwareWalletErrorModalVisible,
}) {
  const baseCondition =
    isNotification &&
    totalUnapprovedCount === 0 &&
    !hasApprovalFlows &&
    !isSigningQRHardwareTransaction;

  const isHardwareWalletErrorModalBlockingClose =
    isHardwareWalletErrorModalVisible;

  const shouldClose = baseCondition && !isHardwareWalletErrorModalBlockingClose;

  return shouldClose;
}

export default class Home extends PureComponent {
  static contextTypes = {
    t: PropTypes.func,
  };

  static propTypes = {
    navigate: PropTypes.func,
    forgottenPassword: PropTypes.bool,
    isNotification: PropTypes.bool,
    hasApprovalFlows: PropTypes.bool,
    setConnectedStatusPopoverHasBeenShown: PropTypes.func,
    shouldShowSeedPhraseReminder: PropTypes.bool.isRequired,
    isPopup: PropTypes.bool,
    connectedStatusPopoverHasBeenShown: PropTypes.bool,
    showRecoveryPhraseReminder: PropTypes.bool.isRequired,
    showTermsOfUsePopup: PropTypes.bool.isRequired,
    firstTimeFlowType: PropTypes.string,
    completedOnboarding: PropTypes.bool,
    onboardedInThisUISession: PropTypes.bool,
    showMultiRpcModal: PropTypes.bool.isRequired,
    showUpdateModal: PropTypes.bool.isRequired,
    newNetworkAddedConfigurationId: PropTypes.string,
    totalUnapprovedCount: PropTypes.number.isRequired,
    location: PropTypes.object,
    infuraBlocked: PropTypes.bool.isRequired,
    setRecoveryPhraseReminderHasBeenShown: PropTypes.func.isRequired,
    setRecoveryPhraseReminderLastShown: PropTypes.func.isRequired,
    setTermsOfUseLastAgreed: PropTypes.func.isRequired,
    showOutdatedBrowserWarning: PropTypes.bool.isRequired,
    setOutdatedBrowserWarningLastShown: PropTypes.func.isRequired,
    newNetworkAddedName: PropTypes.string,
    editedNetwork: PropTypes.object,
    isSigningQRHardwareTransaction: PropTypes.bool,
    isHardwareWalletErrorModalVisible: PropTypes.bool,
    newNftAddedMessage: PropTypes.string,
    setNewNftAddedMessage: PropTypes.func.isRequired,
    removeNftMessage: PropTypes.string,
    setRemoveNftMessage: PropTypes.func.isRequired,
    attemptCloseNotificationPopup: PropTypes.func.isRequired,
    newTokensImported: PropTypes.string,
    newTokensImportedError: PropTypes.string,
    setNewTokensImported: PropTypes.func.isRequired,
    setNewTokensImportedError: PropTypes.func.isRequired,
    clearNewNetworkAdded: PropTypes.func,
    clearEditedNetwork: PropTypes.func,
    setActiveNetwork: PropTypes.func,
    useExternalServices: PropTypes.bool,
    setBasicFunctionalityModalOpen: PropTypes.func,
    redirectAfterDefaultPage: PropTypes.object,
    setRedirectAfterDefaultPage: PropTypes.func,
    clearRedirectAfterDefaultPage: PropTypes.func,
    isPrimarySeedPhraseBackedUp: PropTypes.bool,
    lookupSelectedNetworks: PropTypes.func.isRequired,
    envType: PropTypes.string,
    pendingRedirectRoute: PropTypes.object,
    clearPendingRedirectRoute: PropTypes.func,
  };

  state = {
    canShowBlockageNotification: true,
    notificationClosing: false,
  };

  constructor(props) {
    super(props);

    const {
      attemptCloseNotificationPopup,
      isNotification,
      totalUnapprovedCount,
      hasApprovalFlows,
      isSigningQRHardwareTransaction,
      isHardwareWalletErrorModalVisible,
    } = this.props;
    if (
      shouldCloseNotificationPopup({
        isNotification,
        totalUnapprovedCount,
        hasApprovalFlows,
        isSigningQRHardwareTransaction,
        isHardwareWalletErrorModalVisible,
      })
    ) {
      this.state.notificationClosing = true;
      attemptCloseNotificationPopup();
    }
  }

  checkRedirectAfterDefaultPage() {
    const {
      redirectAfterDefaultPage,
      navigate,
      clearRedirectAfterDefaultPage,
    } = this.props;

    if (
      redirectAfterDefaultPage?.shouldRedirect &&
      redirectAfterDefaultPage?.path
    ) {
      navigate(redirectAfterDefaultPage.path);
      clearRedirectAfterDefaultPage();
    }
  }

  /**
   * Hydrate history duck from persisted pendingRedirectRoute (cross-session redirect).
   * Must only be called once per arrival of a new pendingRedirectRoute, because
   * clearPendingRedirectRoute is an async thunk — the prop stays non-null across
   * several render cycles, so calling this unconditionally in componentDidUpdate
   * would create a re-render loop.
   */
  checkPendingRedirectRoute() {
    if (this.props.pendingRedirectRoute) {
      const { path, search, environmentType } = this.props.pendingRedirectRoute;
      const shouldRedirect =
        !environmentType || environmentType === this.props.envType;

      if (shouldRedirect) {
        this.props.setRedirectAfterDefaultPage({
          path: search ? `${path}${search}` : path,
        });
      }
      this.props.clearPendingRedirectRoute();
    }
  }

  componentDidMount() {
    this.checkPendingRedirectRoute();
    this.checkRedirectAfterDefaultPage();

    // Ensure we have up-to-date connectivity statuses for all enabled networks
    this.props.lookupSelectedNetworks();
  }

  static getDerivedStateFromProps({
    isNotification,
    totalUnapprovedCount,
    hasApprovalFlows,
    isSigningQRHardwareTransaction,
    isHardwareWalletErrorModalVisible,
  }) {
    const shouldClose = shouldCloseNotificationPopup({
      isNotification,
      totalUnapprovedCount,
      hasApprovalFlows,
      isSigningQRHardwareTransaction,
      isHardwareWalletErrorModalVisible,
    });
    if (shouldClose) {
      return { notificationClosing: true };
    }
    return null;
  }

  componentDidUpdate(prevProps, prevState) {
    const {
      attemptCloseNotificationPopup,
      newNetworkAddedConfigurationId,
      setActiveNetwork,
      clearNewNetworkAdded,
    } = this.props;

    const {
      newNetworkAddedConfigurationId: prevNewNetworkAddedConfigurationId,
    } = prevProps;
    const { notificationClosing } = this.state;

    if (
      newNetworkAddedConfigurationId &&
      prevNewNetworkAddedConfigurationId !== newNetworkAddedConfigurationId
    ) {
      setActiveNetwork(newNetworkAddedConfigurationId);
      clearNewNetworkAdded();
    }

    if (notificationClosing && !prevState.notificationClosing) {
      attemptCloseNotificationPopup();
    }

    // Only process pendingRedirectRoute when the prop first transitions from null to non-null
    if (this.props.pendingRedirectRoute && !prevProps.pendingRedirectRoute) {
      this.checkPendingRedirectRoute();
    }

    // clearRedirectAfterDefaultPage is a synchronous Redux action, so the guard condition flips before the next render.
    this.checkRedirectAfterDefaultPage();
  }

  onRecoveryPhraseReminderClose = () => {
    const {
      setRecoveryPhraseReminderHasBeenShown,
      setRecoveryPhraseReminderLastShown,
    } = this.props;
    setRecoveryPhraseReminderHasBeenShown(true);
    setRecoveryPhraseReminderLastShown(new Date().getTime());
  };

  onAcceptTermsOfUse = () => {
    const { setTermsOfUseLastAgreed } = this.props;
    setTermsOfUseLastAgreed(new Date().getTime());
  };

  onSupportLinkClick = () => undefined;

  onOutdatedBrowserWarningClose = () => {
    const { setOutdatedBrowserWarningLastShown } = this.props;
    setOutdatedBrowserWarningLastShown(new Date().getTime());
  };

  renderNotifications() {
    const { t } = this.context;

    const {
      navigate,
      shouldShowSeedPhraseReminder,
      isPopup,
      infuraBlocked,
      showOutdatedBrowserWarning,
      newNftAddedMessage,
      setNewNftAddedMessage,
      newNetworkAddedName,
      editedNetwork,
      removeNftMessage,
      setRemoveNftMessage,
      newTokensImported,
      newTokensImportedError,
      setNewTokensImported,
      setNewTokensImportedError,
      clearNewNetworkAdded,
      clearEditedNetwork,
      isPrimarySeedPhraseBackedUp,
    } = this.props;

    const onAutoHide = () => {
      setNewNftAddedMessage('');
      setRemoveNftMessage('');
      setNewTokensImported(''); // Added this so we dnt see the notif if user does not close it
      setNewTokensImportedError('');
      clearEditedNetwork(); // dispatches setEditedNetwork(), setting editedNetwork to undefined, which clears the editedNetwork state
    };

    const autoHideDelay = 5 * SECOND;

    const outdatedBrowserNotificationDescriptionText =
      isMv3ButOffscreenDocIsMissing ? (
        <div>
          <Text>{t('outdatedBrowserNotification')}</Text>
          <br />
          <Text fontWeight={FontWeight.Bold} color={TextColor.WarningDefault}>
            {t('noHardwareWalletSupport')}
          </Text>
        </div>
      ) : (
        t('outdatedBrowserNotification')
      );

    const items = [
      newNftAddedMessage === 'success' ? (
        <ActionableMessage
          key="new-nft-added"
          type="success"
          className="home__new-network-notification"
          autoHideTime={autoHideDelay}
          onAutoHide={onAutoHide}
          message={
            <Box display={Display.InlineFlex}>
              <i className="fa fa-check-circle home__new-nft-notification-icon" />
              <Text variant={TextVariant.BodySm} asChild>
                <h6>{t('newNftAddedMessage')}</h6>
              </Text>
              <ButtonIcon
                iconName={IconName.Close}
                size={ButtonIconSize.Sm}
                ariaLabel={t('close')}
                onClick={onAutoHide}
              />
            </Box>
          }
        />
      ) : null,
      removeNftMessage === 'success' ? (
        <ActionableMessage
          key="remove-nft"
          type="success"
          className="home__new-network-notification"
          autoHideTime={autoHideDelay}
          onAutoHide={onAutoHide}
          message={
            <Box display={Display.InlineFlex}>
              <i className="fa fa-check-circle home__new-nft-notification-icon" />
              <Text variant={TextVariant.BodySm} asChild>
                <h6>{t('removeNftMessage')}</h6>
              </Text>
              <ButtonIcon
                iconName={IconName.Close}
                size={ButtonIconSize.Sm}
                ariaLabel={t('close')}
                onClick={onAutoHide}
              />
            </Box>
          }
        />
      ) : null,
      removeNftMessage === 'error' ? (
        <ActionableMessage
          key="remove-nft-error"
          type="danger"
          className="home__new-network-notification"
          autoHideTime={autoHideDelay}
          onAutoHide={onAutoHide}
          message={
            <Box display={Display.InlineFlex}>
              <i className="fa fa-check-circle home__new-nft-notification-icon" />
              <Text variant={TextVariant.BodySm} asChild>
                <h6>{t('removeNftErrorMessage')}</h6>
              </Text>
              <ButtonIcon
                iconName={IconName.Close}
                size={ButtonIconSize.Sm}
                ariaLabel={t('close')}
                onClick={onAutoHide}
              />
            </Box>
          }
        />
      ) : null,
      newNetworkAddedName ? (
        <ActionableMessage
          key="new-network-added"
          type="success"
          className="home__new-network-notification"
          message={
            <Box display={Display.InlineFlex}>
              <i className="fa fa-check-circle home__new-network-notification-icon" />
              <Text variant={TextVariant.BodySm} asChild>
                <h6>{t('newNetworkAdded', [newNetworkAddedName])}</h6>
              </Text>
              <ButtonIcon
                iconName={IconName.Close}
                size={ButtonIconSize.Sm}
                ariaLabel={t('close')}
                onClick={() => clearNewNetworkAdded()}
                className="home__new-network-notification-close"
              />
            </Box>
          }
        />
      ) : null,
      editedNetwork?.editCompleted ? (
        <ActionableMessage
          key="edited-network"
          type="success"
          className="home__new-tokens-imported-notification"
          autoHideTime={autoHideDelay}
          onAutoHide={onAutoHide}
          message={
            <Box display={Display.InlineFlex}>
              <i className="fa fa-check-circle home__new-network-notification-icon" />
              <Text variant={TextVariant.BodySm} asChild>
                <h6>
                  {editedNetwork.newNetwork
                    ? t('newNetworkAdded', [editedNetwork.nickname])
                    : t('newNetworkEdited', [editedNetwork.nickname])}
                </h6>
              </Text>
              <ButtonIcon
                iconName={IconName.Close}
                size={ButtonIconSize.Sm}
                ariaLabel={t('close')}
                onClick={() => clearEditedNetwork()}
                className="home__new-network-notification-close"
              />
            </Box>
          }
        />
      ) : null,
      newTokensImported ? (
        <ActionableMessage
          key="new-tokens-imported"
          type="success"
          autoHideTime={autoHideDelay}
          onAutoHide={onAutoHide}
          className="home__new-tokens-imported-notification"
          message={
            <Box display={Display.InlineFlex}>
              <i className="fa fa-check-circle home__new-tokens-imported-notification-icon" />
              <Box>
                <Text
                  className="home__new-tokens-imported-notification-title"
                  variant={TextVariant.BodySm}
                  asChild
                >
                  <h6>{t('newTokensImportedTitle')}</h6>
                </Text>
                <Text
                  className="home__new-tokens-imported-notification-message"
                  variant={TextVariant.BodySm}
                  asChild
                >
                  <h6>{t('newTokensImportedMessage', [newTokensImported])}</h6>
                </Text>
              </Box>

              <ButtonIcon
                iconName={IconName.Close}
                size={ButtonIconSize.Sm}
                ariaLabel={t('close')}
                onClick={() => setNewTokensImported('')}
                className="home__new-tokens-imported-notification-close"
              />
            </Box>
          }
        />
      ) : null,
      newTokensImportedError ? (
        <ActionableMessage
          key="new-tokens-imported-error"
          type="danger"
          className="home__new-tokens-imported-notification"
          autoHideTime={autoHideDelay}
          onAutoHide={onAutoHide}
          message={
            <Box display={Display.InlineFlex}>
              <Icon name={IconName.Danger} marginRight={1} />
              <Text variant={TextVariant.BodySm} asChild>
                <h6>{t('importTokensError')}</h6>
              </Text>
              <ButtonIcon
                iconName={IconName.Close}
                size={ButtonIconSize.Sm}
                ariaLabel={t('close')}
                onClick={onAutoHide}
              />
            </Box>
          }
        />
      ) : null,
      !isPrimarySeedPhraseBackedUp && shouldShowSeedPhraseReminder ? (
        <HomeNotification
          key="show-seed-phrase-reminder"
          descriptionText={t('backupApprovalNotice')}
          acceptText={t('backupNow')}
          onAccept={() => {
            const backUpSRPRoute = `${ONBOARDING_REVIEW_SRP_ROUTE}/?isFromReminder=true`;
            if (isPopup) {
              global.platform.openExtensionInBrowser(backUpSRPRoute);
            } else {
              navigate(backUpSRPRoute);
            }
          }}
          infoText={t('backupApprovalInfo')}
        />
      ) : null,
      infuraBlocked && this.state.canShowBlockageNotification ? (
        <HomeNotification
          key="infura-blocked"
          descriptionText={t('infuraBlockedNotification', [
            <span
              key="infuraBlockedNotificationLink"
              className="home-notification__text-link"
              onClick={() =>
                global.platform.openTab({ url: ZENDESK_URLS.INFURA_BLOCKAGE })
              }
            >
              {t('here')}
            </span>,
          ])}
          ignoreText={t('dismiss')}
          onIgnore={() => {
            this.setState({
              canShowBlockageNotification: false,
            });
          }}
        />
      ) : null,
      showOutdatedBrowserWarning ? (
        <HomeNotification
          key="outdated-browser-notification"
          descriptionText={outdatedBrowserNotificationDescriptionText}
          acceptText={t('gotIt')}
          onAccept={this.onOutdatedBrowserWarningClose}
        />
      ) : null,
    ].filter(Boolean);

    return items.length ? (
      <MultipleNotifications>{items}</MultipleNotifications>
    ) : null;
  }

  renderPopover = () => {
    const { setConnectedStatusPopoverHasBeenShown } = this.props;
    const { t } = this.context;
    return (
      <Popover
        title={t('whatsThis')}
        onClose={setConnectedStatusPopoverHasBeenShown}
        className="home__connected-status-popover"
        showArrow
        CustomBackground={({ onClose }) => {
          return (
            <div
              className="home__connected-status-popover-bg-container"
              onClick={onClose}
            >
              <div className="home__connected-status-popover-bg" />
            </div>
          );
        }}
        footer={
          <>
            <a
              href={ZENDESK_URLS.USER_GUIDE_DAPPS}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('learnMoreUpperCase')}
            </a>
            <Button
              type="primary"
              onClick={setConnectedStatusPopoverHasBeenShown}
            >
              {t('dismiss')}
            </Button>
          </>
        }
      >
        <main className="home__connect-status-text">
          <div>{t('metaMaskConnectStatusParagraphOne')}</div>
          <div>{t('metaMaskConnectStatusParagraphTwo')}</div>
          <div>{t('metaMaskConnectStatusParagraphThree')}</div>
        </main>
      </Popover>
    );
  };

  render() {
    const {
      useExternalServices,
      setBasicFunctionalityModalOpen,
      forgottenPassword,
      connectedStatusPopoverHasBeenShown,
      isPopup,
      showRecoveryPhraseReminder,
      showTermsOfUsePopup,
      completedOnboarding,
      onboardedInThisUISession,
      firstTimeFlowType,
      newNetworkAddedConfigurationId,
      showMultiRpcModal,
      showUpdateModal,
      isPrimarySeedPhraseBackedUp,
    } = this.props;

    if (forgottenPassword) {
      return <Navigate to={RESTORE_VAULT_ROUTE} replace />;
    } else if (this.state.notificationClosing) {
      return null;
    }

    const canSeeModals =
      completedOnboarding &&
      (!onboardedInThisUISession ||
        firstTimeFlowType === FirstTimeFlowType.import) &&
      !newNetworkAddedConfigurationId;

    const showMultiRpcEditModal =
      canSeeModals && showMultiRpcModal && !process.env.IN_TEST;

    const displayUpdateModal =
      canSeeModals && showUpdateModal && !showMultiRpcEditModal;

    const showTermsOfUse =
      completedOnboarding && !onboardedInThisUISession && showTermsOfUsePopup;

    const showRecoveryPhrase =
      showRecoveryPhraseReminder && !isPrimarySeedPhraseBackedUp;

    const { location } = this.props;

    // Handle connected routes
    if (location?.pathname === CONNECTED_ROUTE) {
      return (
        <ScrollContainer className="main-container main-container--has-shadow">
          <ConnectedSites navigate={this.props.navigate} />
        </ScrollContainer>
      );
    }

    if (location?.pathname === CONNECTED_ACCOUNTS_ROUTE) {
      return (
        <ScrollContainer className="main-container main-container--has-shadow">
          <ConnectedAccounts navigate={this.props.navigate} />
        </ScrollContainer>
      );
    }

    // Render normal home content
    return (
      <ScrollContainer className="main-container main-container--has-shadow">
        <div className="home__container">
          {showMultiRpcEditModal && <MultiRpcEditModal />}
          {displayUpdateModal && <UpdateModal />}
          {showRecoveryPhrase ? (
            <RecoveryPhraseReminder
              onConfirm={this.onRecoveryPhraseReminderClose}
            />
          ) : null}
          {showTermsOfUse ? (
            <TermsOfUsePopup onAccept={this.onAcceptTermsOfUse} />
          ) : null}
          {isPopup && !connectedStatusPopoverHasBeenShown
            ? this.renderPopover()
            : null}
          <div className="home__main-view">
            <AccountOverview
              onSupportLinkClick={this.onSupportLinkClick}
              useExternalServices={useExternalServices}
              setBasicFunctionalityModalOpen={setBasicFunctionalityModalOpen}
            />
            {(isBeta() || isFlask()) && (
              <div className="home__support">
                <BetaAndFlaskHomeFooter />
              </div>
            )}
          </div>
          {this.renderNotifications()}
        </div>

        {/* Ghost component that manages the useHomeDeepLinkEffects */}
        <HomeDeepLinkActions />
      </ScrollContainer>
    );
  }
}
