import { TransactionMeta } from '@metamask/transaction-controller';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { isCorrectDeveloperTransactionType } from '../../../../../../shared/lib/confirmation.utils';
import { ConfirmAlertModal } from '../../../../../components/app/alert-system/confirm-alert-modal';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
} from '../../../../../components/component-library';
import { Footer as PageFooter } from '../../../../../components/multichain/pages/page';
import { Alert } from '../../../../../ducks/confirm-alerts/confirm-alerts';
import {
  Display,
  FlexDirection,
  Severity,
} from '../../../../../helpers/constants/design-system';
import { DEFAULT_ROUTE } from '../../../../../helpers/constants/routes';
import useAlerts from '../../../../../hooks/useAlerts';
import { useI18nContext } from '../../../../../hooks/useI18nContext';
import { useConfirmationNavigation } from '../../../hooks/useConfirmationNavigation';
import { resolvePendingApproval } from '../../../../../store/actions';
import { useConfirmContext } from '../../../context/confirm';
import { useTransactionConfirm } from '../../../hooks/transactions/useTransactionConfirm';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import { useOriginThrottling } from '../../../hooks/useOriginThrottling';
import {
  isAddEthereumChainType,
  useAddEthereumChain,
} from '../../../hooks/useAddEthereumChain';
import { isSignatureTransactionType } from '../../../utils';
import { getConfirmationSender } from '../utils';
import {
  useHardwareFooter,
  useHardwareWalletError,
} from '../../../../../contexts/hardware-wallets';
import OriginThrottleModal from './origin-throttle-modal';

export type OnCancelHandler = (options?: {
  navigateBackForSend?: boolean;
  navigateBackToPreviousPage?: boolean;
}) => void;

function reviewAlertButtonText(
  unconfirmedDangerAlerts: Alert[],
  t: ReturnType<typeof useI18nContext>,
) {
  if (unconfirmedDangerAlerts.length === 1) {
    return t('reviewAlert');
  }

  if (unconfirmedDangerAlerts.length > 1) {
    return t('reviewAlerts');
  }

  return t('confirm');
}

function getButtonDisabledState(
  hasUnconfirmedDangerAlerts: boolean,
  hasBlockingAlerts: boolean,
  disabled: boolean,
) {
  if (hasBlockingAlerts) {
    return true;
  }

  if (hasUnconfirmedDangerAlerts) {
    return false;
  }

  return disabled;
}

const ConfirmButton = ({
  alertOwnerId = '',
  disabled,
  onSubmit,
  onCancel,
}: {
  alertOwnerId?: string;
  disabled: boolean;
  onSubmit: () => void;
  onCancel: OnCancelHandler;
}) => {
  const t = useI18nContext();

  const { currentConfirmation } = useConfirmContext<TransactionMeta>();

  const [confirmModalVisible, setConfirmModalVisible] =
    useState<boolean>(false);

  const {
    alerts,
    hasUnconfirmedDangerAlerts,
    hasUnconfirmedFieldDangerAlerts,
    setAlertConfirmed,
    unconfirmedDangerAlerts,
    unconfirmedFieldDangerAlerts,
  } = useAlerts(alertOwnerId);

  const hasDangerBlockingAlerts = alerts.some(
    (alert) => alert.severity === Severity.Danger && alert.isBlocking,
  );
  const shouldShowDangerConfirmButton =
    hasUnconfirmedDangerAlerts || hasDangerBlockingAlerts;

  const handleCloseConfirmModal = useCallback(() => {
    setConfirmModalVisible(false);
  }, []);

  const handleOpenConfirmModal = useCallback(() => {
    setConfirmModalVisible(true);
  }, []);

  const handleSubmitConfirmModal = useCallback(async () => {
    if (currentConfirmation?.id && alertOwnerId === currentConfirmation.id) {
      const [selectedUnconfirmedDangerAlert] = unconfirmedDangerAlerts;

      if (selectedUnconfirmedDangerAlert) {
        setAlertConfirmed(selectedUnconfirmedDangerAlert.key, true);
      }
    }

    setConfirmModalVisible(false);
  }, [
    alertOwnerId,
    currentConfirmation?.id,
    setAlertConfirmed,
    unconfirmedDangerAlerts,
  ]);

  return (
    <>
      {confirmModalVisible && (
        <ConfirmAlertModal
          ownerId={alertOwnerId}
          onClose={handleCloseConfirmModal}
          onCancel={onCancel}
          onSubmit={handleSubmitConfirmModal}
        />
      )}
      {shouldShowDangerConfirmButton ? (
        <Button
          block
          danger
          data-testid="confirm-footer-button"
          disabled={getButtonDisabledState(
            hasUnconfirmedDangerAlerts,
            hasDangerBlockingAlerts,
            disabled,
          )}
          onClick={handleOpenConfirmModal}
          size={ButtonSize.Lg}
          startIconName={
            hasUnconfirmedFieldDangerAlerts
              ? IconName.SecuritySearch
              : IconName.Danger
          }
        >
          {reviewAlertButtonText(unconfirmedFieldDangerAlerts, t)}
        </Button>
      ) : (
        <Button
          block
          data-testid="confirm-footer-button"
          disabled={disabled}
          onClick={onSubmit}
          size={ButtonSize.Lg}
        >
          {t('confirm')}
        </Button>
      )}
    </>
  );
};

const CancelButton = ({
  handleFooterCancel,
}: {
  handleFooterCancel: () => void;
}) => {
  const t = useI18nContext();
  const { currentConfirmation } = useConfirmContext<TransactionMeta>();

  return (
    <Button
      block
      data-testid="confirm-footer-cancel-button"
      onClick={handleFooterCancel}
      size={ButtonSize.Lg}
      variant={ButtonVariant.Secondary}
    >
      {t('cancel')}
    </Button>
  );
};

const Footer = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { onTransactionConfirm } = useTransactionConfirm();
  const { navigateNext } = useConfirmationNavigation();
  const { onSubmit: onAddEthereumChain } = useAddEthereumChain();

  const { currentConfirmation, isScrollToBottomCompleted, goBackTo } =
    useConfirmContext<TransactionMeta>();
  const currentConfirmationId = currentConfirmation?.id;
  const t = useI18nContext();

  const { from: fromAddress } = getConfirmationSender(currentConfirmation);
  const { shouldThrottleOrigin } = useOriginThrottling();
  const [showOriginThrottleModal, setShowOriginThrottleModal] = useState(false);
  const { onCancel, resetTransactionState } = useConfirmActions();
  const { hasUnconfirmedDangerAlerts } = useAlerts(
    currentConfirmation?.id ?? '',
  );

  const { dismissErrorModal, setErrorModalSuppressed } =
    useHardwareWalletError();

  useEffect(() => {
    return () => {
      setErrorModalSuppressed(false);
    };
  }, [setErrorModalSuppressed]);

  const isSignature = isSignatureTransactionType(currentConfirmation);
  const isTransactionConfirmation = isCorrectDeveloperTransactionType(
    currentConfirmation?.type,
  );
  const isAddEthereumChain = isAddEthereumChainType(currentConfirmation);

  const onUserRejectedHardwareWalletError = useCallback(async () => {
    // User intentionally rejected on device; follow the cancel flow.
    await onCancel();
    dismissErrorModal();
    if (currentConfirmationId) {
      navigateNext(currentConfirmationId);
    }
  }, [currentConfirmationId, navigateNext, onCancel, dismissErrorModal]);

  const {
    walletType,
    shouldRunHardwareWalletPreflight,
    isHardwareWalletReady,
    onSubmitPreflightCheck,
    withHardwareWalletModalHandling,
  } = useHardwareFooter({
    currentConfirmation,
    currentConfirmationId,
    onUserRejectedHardwareWalletError,
  });

  useEffect(() => {
    const shouldSuppressHardwareWalletErrors =
      hasUnconfirmedDangerAlerts && shouldRunHardwareWalletPreflight;

    setErrorModalSuppressed(shouldSuppressHardwareWalletErrors);
  }, [
    hasUnconfirmedDangerAlerts,
    setErrorModalSuppressed,
    shouldRunHardwareWalletPreflight,
  ]);

  const isConfirmDisabled = !isScrollToBottomCompleted && !isSignature;

  const shouldShowReconnectButton =
    shouldRunHardwareWalletPreflight &&
    !isHardwareWalletReady &&
    !hasUnconfirmedDangerAlerts;

  const onReconnectHardwareWalletCta = useCallback(async () => {
    await onSubmitPreflightCheck();
  }, [onSubmitPreflightCheck]);

  const onSubmit = useCallback(async () => {
    if (!currentConfirmation) {
      return;
    }

    if (shouldRunHardwareWalletPreflight) {
      const isReady = await onSubmitPreflightCheck();
      if (!isReady) {
        return;
      }
    }

    try {
      if (isAddEthereumChain) {
        await onAddEthereumChain();
        navigate(DEFAULT_ROUTE);
        return;
      }

      if (isTransactionConfirmation) {
        const didConfirm = await onTransactionConfirm();
        if (didConfirm && currentConfirmationId) {
          navigateNext(currentConfirmationId);
        }
        return;
      }

      const resolveApprovalWithHardwareWalletHandling =
        withHardwareWalletModalHandling(async () => {
          const resolveApprovalOptions = walletType
            ? {
                fromAddress,
                waitForResult: true,
                walletType,
              }
            : {
                fromAddress,
              };

          await dispatch(
            resolvePendingApproval(currentConfirmation.id, undefined, {
              ...resolveApprovalOptions,
            }),
          );

          if (currentConfirmationId) {
            navigateNext(currentConfirmationId);
          }
        });

      await resolveApprovalWithHardwareWalletHandling();
    } finally {
      resetTransactionState();
    }
  }, [
    currentConfirmation,
    currentConfirmationId,
    onSubmitPreflightCheck,
    shouldRunHardwareWalletPreflight,
    isAddEthereumChain,
    isTransactionConfirmation,
    onAddEthereumChain,
    navigate,
    onTransactionConfirm,
    navigateNext,
    dispatch,
    fromAddress,
    walletType,
    withHardwareWalletModalHandling,
    resetTransactionState,
  ]);

  const handleFooterCancel = useCallback(async () => {
    if (shouldThrottleOrigin) {
      setShowOriginThrottleModal(true);
      return;
    }

    await onCancel({
      navigateBackToPreviousPage: Boolean(goBackTo),
    });

    dismissErrorModal();

    if (goBackTo) {
      return;
    }

    if (isAddEthereumChain) {
      navigate(DEFAULT_ROUTE);
      return;
    }

    if (currentConfirmationId) {
      navigateNext(currentConfirmationId);
    }
  }, [
    navigateNext,
    onCancel,
    goBackTo,
    shouldThrottleOrigin,
    currentConfirmationId,
    isAddEthereumChain,
    navigate,
    dismissErrorModal,
  ]);

  if (!currentConfirmation) {
    return null;
  }

  return (
    <PageFooter
      className="confirm-footer_page-footer"
      flexDirection={FlexDirection.Column}
    >
      <OriginThrottleModal
        isOpen={showOriginThrottleModal}
        onConfirmationCancel={onCancel}
      />
      <Box display={Display.Flex} flexDirection={FlexDirection.Row} gap={4}>
        <CancelButton handleFooterCancel={handleFooterCancel} />
        {shouldShowReconnectButton ? (
          <Button
            block
            data-testid="reconnect-hardware-wallet-button"
            onClick={onReconnectHardwareWalletCta}
            size={ButtonSize.Lg}
          >
            {walletType
              ? t('connectHardwareDevice', [t(walletType)])
              : t('connect')}
          </Button>
        ) : (
          <ConfirmButton
            alertOwnerId={currentConfirmation?.id}
            onSubmit={onSubmit}
            disabled={isConfirmDisabled}
            onCancel={onCancel}
          />
        )}
      </Box>
    </PageFooter>
  );
};

export default Footer;
