import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import log from 'loglevel';
import { Box } from '@metamask/design-system-react';
import {
  ONBOARDING_COMPLETION_ROUTE,
  ONBOARDING_IMPORT_WITH_SRP_ROUTE,
  ONBOARDING_REVIEW_SRP_ROUTE,
  ONBOARDING_WELCOME_ROUTE,
} from '../../../helpers/constants/routes';
import { getFirstTimeFlowType, getCurrentKeyring } from '../../../selectors';
import { FirstTimeFlowType } from '../../../../shared/constants/onboarding';
import { PLATFORM_FIREFOX } from '../../../../shared/constants/app';
import { getBrowserName } from '../../../../shared/lib/browser-runtime.utils';
import {
  forceUpdateMetamaskState,
  resetOnboarding,
} from '../../../store/actions';
import { TraceName, TraceOperation } from '../../../../shared/lib/trace';
import { getIsWalletResetInProgress } from '../../../ducks/metamask/metamask';
import { CreatePasswordForm } from '../../create-password-form';

type CreatePasswordProps = {
  createNewAccount: (password: string) => void;
  importWithRecoveryPhrase: (
    password: string,
    secretRecoveryPhrase: string,
  ) => void;
  secretRecoveryPhrase: string;
};

const isFirefox = getBrowserName() === PLATFORM_FIREFOX;

// TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
// eslint-disable-next-line @typescript-eslint/naming-convention
export default function CreatePassword({
  createNewAccount,
  importWithRecoveryPhrase,
  secretRecoveryPhrase,
}: CreatePasswordProps) {
  const [newAccountCreationInProgress, setNewAccountCreationInProgress] =
    useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const firstTimeFlowType = useSelector(getFirstTimeFlowType);
  const currentKeyring = useSelector(getCurrentKeyring);
  const isWalletResetInProgress = useSelector(getIsWalletResetInProgress);

  const shouldInjectMetametricsIframe = false;
  const analyticsIframeUrl = '';

  useEffect(() => {
    if (
      currentKeyring &&
      !newAccountCreationInProgress &&
      !isWalletResetInProgress
    ) {
      if (
        firstTimeFlowType === FirstTimeFlowType.import ||
        firstTimeFlowType === FirstTimeFlowType.restore
      ) {
        navigate(ONBOARDING_COMPLETION_ROUTE, { replace: true });
      } else {
        navigate(ONBOARDING_REVIEW_SRP_ROUTE, { replace: true });
      }
    } else if (
      firstTimeFlowType === FirstTimeFlowType.import &&
      !secretRecoveryPhrase
    ) {
      navigate(ONBOARDING_IMPORT_WITH_SRP_ROUTE, { replace: true });
    }
  }, [
    currentKeyring,
    navigate,
    firstTimeFlowType,
    newAccountCreationInProgress,
    secretRecoveryPhrase,
    isWalletResetInProgress,
  ]);

  const handleWalletImport = async (password: string) => {
    await importWithRecoveryPhrase(password, secretRecoveryPhrase);

    navigate(ONBOARDING_COMPLETION_ROUTE, { replace: true });
  };

  const handleCreateNewWallet = async (
    password: string,
    termsChecked: boolean,
  ) => {
    setNewAccountCreationInProgress(true);
    await createNewAccount(password);

    navigate(ONBOARDING_REVIEW_SRP_ROUTE, { replace: true });
  };

  const handleBackClick = async (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();

    if (firstTimeFlowType === FirstTimeFlowType.import) {
      // for SRP import flow, we will just navigate back to the import SRP page
      navigate(ONBOARDING_IMPORT_WITH_SRP_ROUTE, { replace: true });
    } else {
      // reset onboarding flow
      await dispatch(resetOnboarding());
      await forceUpdateMetamaskState(dispatch);

      navigate(ONBOARDING_WELCOME_ROUTE, { replace: true });
    }
  };

  const handleCreatePassword = async (
    password: string,
    termsChecked: boolean,
  ) => {
    if (!password) {
      return;
    }

    try {
      // If secretRecoveryPhrase is defined we are in import wallet flow
      if (
        secretRecoveryPhrase &&
        firstTimeFlowType === FirstTimeFlowType.import
      ) {
        await handleWalletImport(password);
      } else {
        // Otherwise we are in create new wallet flow
        await handleCreateNewWallet(password, termsChecked);
      }
    } catch (error) {
      log.error('Error creating password', error);
    }
  };

  return (
    <Box className="h-full w-full">
      <CreatePasswordForm
        onSubmit={handleCreatePassword}
        onBack={handleBackClick}
      />
      {shouldInjectMetametricsIframe ? (
        <iframe
          src={analyticsIframeUrl}
          className="create-password__analytics-iframe"
          data-testid="create-password-iframe"
        />
      ) : null}
    </Box>
  );
}
