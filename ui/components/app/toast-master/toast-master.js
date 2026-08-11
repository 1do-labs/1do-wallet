/* eslint-disable react/prop-types -- TODO: upgrade to TypeScript */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AvatarNetwork,
  AvatarNetworkSize,
} from '@metamask/design-system-react';
import { SECOND } from '../../../../shared/constants/time';
import { ENVIRONMENT_TYPE_SIDEPANEL } from '../../../../shared/constants/app';
// eslint-disable-next-line import-x/no-restricted-paths
import { getEnvironmentType } from '../../../../app/scripts/lib/util';
import { PRIVACY_POLICY_LINK } from '../../../../shared/lib/ui-utils';
import {
  BorderRadius,
  IconColor,
  TextVariant,
} from '../../../helpers/constants/design-system';
import {
  DEFAULT_ROUTE,
  REVEAL_SEED_ROUTE,
  REVIEW_PERMISSIONS,
  SETTINGS_ROUTE,
} from '../../../helpers/constants/routes';
import { getURLHost } from '../../../helpers/utils/util';
import { useI18nContext } from '../../../hooks/useI18nContext';
import {
  getCurrentNetwork,
  getOriginOfCurrentTab,
  getUseNftDetection,
} from '../../../selectors';
import { CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP } from '../../../../shared/constants/network';
import {
  hidePermittedNetworkToast,
  toggleDefaultView,
} from '../../../store/actions';
import { Icon, IconName, IconSize } from '../../component-library';
import { Toast, ToastContainer } from '../../multichain';
import { StorageWriteErrorType } from '../../../../shared/constants/app-state';
import { getDappActiveNetwork } from '../../../selectors/dapp';
import {
  selectNftDetectionEnablementToast,
  selectShowPrivacyPolicyToast,
  selectNewSrpAdded,
  selectShowCopyAddressToast,
  selectShowStorageErrorToast,
  selectStorageWriteErrorType,
  selectShowDefaultRpcSwitchToast,
  selectShowSidePanelMigrationToast,
} from './selectors';
import {
  setNewPrivacyPolicyToastClickedOrClosed,
  setNewPrivacyPolicyToastShownDate,
  setShowNftDetectionEnablementToast,
  setShowNewSrpAddedToast,
  setShowCopyAddressToast,
  setShowDefaultRpcSwitchToast,
  dismissSidePanelMigrationToast,
} from './utils';

export function ToastMaster() {
  const location = useLocation();

  // Check if storage error toast should be shown (needed for conditional rendering on other screens)
  // The selector includes all conditions: flag is true, onboarding complete, and unlocked
  const shouldShowStorageErrorToast = useSelector(selectShowStorageErrorToast);

  // Get current pathname from React Router
  const currentPathname = location?.pathname ?? DEFAULT_ROUTE;
  const onHomeScreen = currentPathname === DEFAULT_ROUTE;
  const onSettingsScreen = currentPathname.startsWith(SETTINGS_ROUTE);

  // Storage error toast should show on ALL screens
  const storageErrorToast = <StorageErrorToast />;

  if (onHomeScreen) {
    return (
      <ToastContainer>
        {storageErrorToast}
        <PrivacyPolicyToast />
        <NftEnablementToast />
        <PermittedNetworkToast />
        <NewSrpAddedToast />
        <DefaultRpcSwitchToast />
        <CopyAddressToast />
        <SidePanelMigrationToast />
      </ToastContainer>
    );
  }

  if (onSettingsScreen) {
    return <ToastContainer>{storageErrorToast}</ToastContainer>;
  }

  // On other screens, only render ToastContainer if storage error toast should show
  // ToastContainer provides essential CSS styling (position: fixed, z-index, etc.)
  if (shouldShowStorageErrorToast) {
    return <ToastContainer>{storageErrorToast}</ToastContainer>;
  }

  return null;
}

function PrivacyPolicyToast() {
  const t = useI18nContext();

  const { showPrivacyPolicyToast, newPrivacyPolicyToastShownDate } =
    useSelector(selectShowPrivacyPolicyToast);

  // If the privacy policy toast is shown, and there is no date set, set it
  if (showPrivacyPolicyToast && !newPrivacyPolicyToastShownDate) {
    setNewPrivacyPolicyToastShownDate(Date.now());
  }

  return (
    showPrivacyPolicyToast && (
      <Toast
        key="privacy-policy-toast"
        startAdornment={
          <Icon name={IconName.Info} color={IconColor.iconDefault} />
        }
        text={t('newPrivacyPolicyTitle')}
        actionText={t('newPrivacyPolicyActionButton')}
        onActionClick={() => {
          global.platform.openTab({
            url: PRIVACY_POLICY_LINK,
          });
          setNewPrivacyPolicyToastClickedOrClosed();
        }}
        onClose={setNewPrivacyPolicyToastClickedOrClosed}
      />
    )
  );
}

function NftEnablementToast() {
  const t = useI18nContext();
  const dispatch = useDispatch();

  const showNftEnablementToast = useSelector(selectNftDetectionEnablementToast);
  const useNftDetection = useSelector(getUseNftDetection);

  const autoHideToastDelay = 5 * SECOND;

  return (
    showNftEnablementToast &&
    useNftDetection && (
      <Toast
        key="enabled-nft-auto-detection"
        startAdornment={
          <Icon name={IconName.CheckBold} color={IconColor.iconDefault} />
        }
        text={t('nftAutoDetectionEnabled')}
        borderRadius={BorderRadius.LG}
        textVariant={TextVariant.bodyMd}
        autoHideTime={autoHideToastDelay}
        onAutoHideToast={() =>
          dispatch(setShowNftDetectionEnablementToast(false))
        }
      />
    )
  );
}

function PermittedNetworkToast() {
  const t = useI18nContext();
  const dispatch = useDispatch();

  const isPermittedNetworkToastOpen = useSelector(
    (state) => state.appState.showPermittedNetworkToastOpen,
  );

  const currentNetwork = useSelector(getCurrentNetwork);
  const activeTabOrigin = useSelector(getOriginOfCurrentTab);
  const dappActiveNetwork = useSelector(getDappActiveNetwork);
  const safeEncodedHost = encodeURIComponent(activeTabOrigin);
  const navigate = useNavigate();

  // Use dapp's active network if available, otherwise fall back to global network
  const displayNetwork = dappActiveNetwork || currentNetwork;

  // Get the correct image URL - dapp network structure is different
  const getNetworkImageUrl = () => {
    if (dappActiveNetwork) {
      // For dapp networks, check rpcPrefs.imageUrl first, then fallback to CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP
      return (
        dappActiveNetwork.rpcPrefs?.imageUrl ||
        (dappActiveNetwork.chainId &&
          CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP[dappActiveNetwork.chainId])
      );
    }
    // For global network, use existing logic
    return currentNetwork?.rpcPrefs?.imageUrl || '';
  };

  return (
    isPermittedNetworkToastOpen && (
      <Toast
        key="switched-permitted-network-toast"
        startAdornment={
          <AvatarNetwork
            size={AvatarNetworkSize.Md}
            className="border-transparent"
            src={getNetworkImageUrl()}
            name={displayNetwork?.name || displayNetwork?.nickname}
          />
        }
        text={t('permittedChainToastUpdate', [
          getURLHost(activeTabOrigin),
          displayNetwork?.name || displayNetwork?.nickname,
        ])}
        actionText={t('editPermissions')}
        onActionClick={() => {
          dispatch(hidePermittedNetworkToast());
          navigate(`${REVIEW_PERMISSIONS}?origin=${safeEncodedHost}`);
        }}
        onClose={() => dispatch(hidePermittedNetworkToast())}
      />
    )
  );
}

function NewSrpAddedToast() {
  const t = useI18nContext();
  const dispatch = useDispatch();

  const walletNumber = useSelector(selectNewSrpAdded);
  const autoHideDelay = 5 * SECOND;

  // This will close the toast if the user clicks the account menu.
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dismissElement = document.querySelector(
        '[data-testid="account-menu-icon"]',
      );
      if (dismissElement && dismissElement.contains(event.target)) {
        dispatch(setShowNewSrpAddedToast(false));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dispatch]);

  return (
    walletNumber && (
      <Toast
        key="new-srp-added-toast"
        text={t('importWalletSuccess', [walletNumber])}
        startAdornment={
          <Icon name={IconName.CheckBold} color={IconColor.iconDefault} />
        }
        onClose={() => dispatch(setShowNewSrpAddedToast(false))}
        autoHideTime={autoHideDelay}
        onAutoHideToast={() => dispatch(setShowNewSrpAddedToast(false))}
      />
    )
  );
}

function DefaultRpcSwitchToast() {
  const t = useI18nContext();
  const dispatch = useDispatch();

  const showDefaultRpcSwitchToast = useSelector(
    selectShowDefaultRpcSwitchToast,
  );
  const autoHideDelay = 5 * SECOND;

  return (
    showDefaultRpcSwitchToast && (
      <Toast
        key="default-rpc-switch-toast"
        dataTestId="default-rpc-switch-toast"
        text={t('updatedToMetaMaskDefault')}
        startAdornment={
          <Icon name={IconName.CheckBold} color={IconColor.iconDefault} />
        }
        onClose={() => dispatch(setShowDefaultRpcSwitchToast(false))}
        autoHideTime={autoHideDelay}
        onAutoHideToast={() => dispatch(setShowDefaultRpcSwitchToast(false))}
      />
    )
  );
}

function CopyAddressToast() {
  const t = useI18nContext();
  const dispatch = useDispatch();

  const showCopyAddressToast = useSelector(selectShowCopyAddressToast);
  const autoHideToastDelay = 2 * SECOND;

  return (
    showCopyAddressToast && (
      <Toast
        key="copy-address-toast"
        text={t('addressCopied')}
        startAdornment={
          <Icon name={IconName.CopySuccess} color={IconColor.iconDefault} />
        }
        onClose={() => dispatch(setShowCopyAddressToast(false))}
        autoHideTime={autoHideToastDelay}
        onAutoHideToast={() => dispatch(setShowCopyAddressToast(false))}
        dataTestId="copy-address-toast"
      />
    )
  );
}

function StorageErrorToast() {
  const t = useI18nContext();
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);
  // Selector includes all conditions: flag is true, onboarding complete, and unlocked
  const showStorageErrorToast = useSelector(selectShowStorageErrorToast);
  const storageWriteErrorType = useSelector(selectStorageWriteErrorType);

  // Only show toast if selector returns true and user hasn't dismissed it
  const shouldShow = showStorageErrorToast && !isDismissed;

  // Show disk space-specific message when error is due to no space
  const isNoSpaceError =
    storageWriteErrorType === StorageWriteErrorType.FileErrorNoSpace;
  const description = isNoSpaceError
    ? t('storageErrorDescriptionNoSpace')
    : t('storageErrorDescriptionDefault');

  const handleRevealSrpClick = () => {
    setIsDismissed(true);
    navigate(REVEAL_SEED_ROUTE, { state: { skipQuiz: true } });
  };

  const handleClose = () => {
    setIsDismissed(true);
  };

  // Only show action button for default errors (not for no-space errors)
  const actionProps = isNoSpaceError
    ? {}
    : {
        actionText: t('storageErrorAction'),
        onActionClick: handleRevealSrpClick,
      };

  return (
    shouldShow && (
      <Toast
        key="storage-error-toast"
        dataTestId="storage-error-toast"
        startAdornment={
          <Icon
            name={IconName.Danger}
            color={IconColor.errorDefault}
            size={IconSize.Lg}
          />
        }
        text={t('storageErrorTitle')}
        description={description}
        {...actionProps}
        borderRadius={BorderRadius.LG}
        textVariant={TextVariant.bodyMd}
        onClose={handleClose}
      />
    )
  );
}

function SidePanelMigrationToast() {
  const t = useI18nContext();
  const dispatch = useDispatch();

  const showSidePanelMigrationToast = useSelector(
    selectShowSidePanelMigrationToast,
  );

  const isSidePanel = getEnvironmentType() === ENVIRONMENT_TYPE_SIDEPANEL;

  const handleSwitchBackToPopup = async () => {
    try {
      await dispatch(toggleDefaultView());
    } finally {
      dismissSidePanelMigrationToast();
    }
  };

  return (
    showSidePanelMigrationToast &&
    isSidePanel && (
      <Toast
        key="side-panel-migration-toast"
        dataTestId="side-panel-migration-toast"
        startAdornment={
          <Icon name={IconName.Info} color={IconColor.iconDefault} />
        }
        text={t('sidePanelMigrationToast', [
          <button
            key="side-panel-migration-switch-back"
            type="button"
            onClick={handleSwitchBackToPopup}
            className="inline h-auto min-h-0 cursor-pointer bg-transparent p-0 align-baseline text-inherit underline underline-offset-[0.25em]"
          >
            {t('switchBackToPopup')}
          </button>,
        ])}
        borderRadius={BorderRadius.LG}
        textVariant={TextVariant.bodyMd}
        onClose={() => dismissSidePanelMigrationToast()}
      />
    )
  );
}
