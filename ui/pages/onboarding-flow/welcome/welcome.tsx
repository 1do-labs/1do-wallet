import React, {
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ComponentType,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react';
import {
  ONBOARDING_COMPLETION_ROUTE,
  ONBOARDING_CREATE_PASSWORD_ROUTE,
  ONBOARDING_IMPORT_WITH_SRP_ROUTE,
  ONBOARDING_METAMETRICS,
  ONBOARDING_REVIEW_SRP_ROUTE,
} from '../../../helpers/constants/routes';
import {
  getCurrentKeyring,
  getFirstTimeFlowType,
  getIsParticipateInMetaMetricsSet,
} from '../../../selectors';
import { FirstTimeFlowType } from '../../../../shared/constants/onboarding';
import { MetaMetricsContext } from '../../../contexts/metametrics';
import { ENVIRONMENT } from '../../../../development/build/constants';
import {
  setFirstTimeFlowType,
  setParticipateInMetaMetrics,
} from '../../../store/actions';
import {
  MetaMetricsEventAccountType,
  MetaMetricsEventCategory,
  MetaMetricsEventName,
} from '../../../../shared/constants/metametrics';
import { getBrowserName } from '../../../../shared/lib/browser-runtime.utils';
import { PLATFORM_FIREFOX } from '../../../../shared/constants/app';
import { TraceName, TraceOperation } from '../../../../shared/lib/trace';
import { useRiveWasmContext } from '../../../contexts/rive-wasm';
import { getIsWalletResetInProgress } from '../../../ducks/metamask/metamask';
import WelcomeLogin from './welcome-login';
import { LOGIN_ERROR, LOGIN_OPTION, LOGIN_TYPE, LoginErrorType } from './types';
import LoginErrorModal from './login-error-modal';

const MetaMaskWordMarkAnimation = lazy(
  () =>
    // @ts-expect-error - TypeScript expects .js extension for ESM, but Jest needs the actual .tsx file
    import('./metamask-wordmark-animation') as unknown as Promise<{
      default: ComponentType<{
        setIsAnimationComplete: (isAnimationComplete: boolean) => void;
        isAnimationComplete?: boolean;
        skipTransition?: boolean;
      }>;
    }>,
);

const FoxAppearAnimation = lazy(
  () =>
    // @ts-expect-error - TypeScript expects .js extension for ESM, but Jest needs the actual .tsx file
    import('./fox-appear-animation') as unknown as Promise<{
      default: ComponentType<{
        isLoader?: boolean;
        skipTransition?: boolean;
      }>;
    }>,
);

// TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
// eslint-disable-next-line @typescript-eslint/naming-convention
export default function OnboardingWelcome() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentKeyring = useSelector(getCurrentKeyring);
  const firstTimeFlowType = useSelector(getFirstTimeFlowType);
  const isWalletResetInProgress = useSelector(getIsWalletResetInProgress);
  const isParticipateInMetaMetricsSet = useSelector(
    getIsParticipateInMetaMetricsSet,
  );
  const [newAccountCreationInProgress, setNewAccountCreationInProgress] =
    useState(false);

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<LoginErrorType | null>(null);

  const { animationCompleted } = useRiveWasmContext();
  const shouldSkipAnimation = Boolean(
    animationCompleted?.MetamaskWordMarkAnimation ||
      process.env.METAMASK_ENVIRONMENT === ENVIRONMENT.TESTING,
  );

  // In test environments or when returning from another page, skip animations
  const [isAnimationComplete, setIsAnimationComplete] =
    useState(shouldSkipAnimation);

  const isFireFox = getBrowserName() === PLATFORM_FIREFOX;

  // Don't allow users to come back to this screen after they
  // have already imported or created a wallet
  useEffect(() => {
    let isMounted = true;

    if (
      currentKeyring &&
      !newAccountCreationInProgress &&
      !isWalletResetInProgress
    ) {
      if (
        firstTimeFlowType === FirstTimeFlowType.import ||
        firstTimeFlowType === FirstTimeFlowType.restore
      ) {
        navigate(
          isParticipateInMetaMetricsSet
            ? ONBOARDING_COMPLETION_ROUTE
            : ONBOARDING_METAMETRICS,
          { replace: true },
        );
      } else {
        navigate(ONBOARDING_REVIEW_SRP_ROUTE, { replace: true });
      }
    }

    return () => {
      isMounted = false;
    };
  }, [
    currentKeyring,
    navigate,
    firstTimeFlowType,
    newAccountCreationInProgress,
    isParticipateInMetaMetricsSet,
    isFireFox,
    isWalletResetInProgress,
  ]);

  const {
    trackEvent,
    bufferedTrace,
    bufferedEndTrace,
    onboardingParentContext,
  } = useContext(MetaMetricsContext);

  const onCreateClick = useCallback(async () => {
    setIsLoggingIn(true);
    setNewAccountCreationInProgress(true);
    await dispatch(setFirstTimeFlowType(FirstTimeFlowType.create));
    trackEvent({
      category: MetaMetricsEventCategory.Onboarding,
      event: MetaMetricsEventName.WalletSetupStarted,
      properties: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        account_type: MetaMetricsEventAccountType.Default,
      },
    });
    bufferedTrace?.({
      name: TraceName.OnboardingNewSrpCreateWallet,
      op: TraceOperation.OnboardingUserJourney,
      parentContext: onboardingParentContext?.current,
    });

    navigate(ONBOARDING_CREATE_PASSWORD_ROUTE);
  }, [dispatch, navigate, trackEvent, onboardingParentContext, bufferedTrace]);

  const onImportClick = useCallback(async () => {
    setIsLoggingIn(true);
    await dispatch(setFirstTimeFlowType(FirstTimeFlowType.import));
    trackEvent({
      category: MetaMetricsEventCategory.Onboarding,
      event: MetaMetricsEventName.WalletImportStarted,
      properties: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        account_type: MetaMetricsEventAccountType.Imported,
      },
    });
    bufferedTrace?.({
      name: TraceName.OnboardingExistingSrpImport,
      op: TraceOperation.OnboardingUserJourney,
      parentContext: onboardingParentContext?.current,
    });

    navigate(ONBOARDING_IMPORT_WITH_SRP_ROUTE);
  }, [dispatch, navigate, trackEvent, onboardingParentContext, bufferedTrace]);

  const handleLoginError = useCallback((error) => {
    setLoginError(error ? LOGIN_ERROR.GENERIC : null);
  }, []);

  const handleLogin = useCallback(
    async (loginType, loginOption) => {
      try {
        if (!isFireFox) {
          // reset the participate in meta metrics in case it was set to true from previous login attempts
          // to prevent the queued events from being sent
          dispatch(setParticipateInMetaMetrics(null));
        }

        if (loginType === LOGIN_TYPE.SRP) {
          if (loginOption === LOGIN_OPTION.NEW) {
            await onCreateClick();
          } else if (loginOption === LOGIN_OPTION.EXISTING) {
            await onImportClick();
          }
        }
      } catch (error) {
        handleLoginError(error);
      }
    },
    [dispatch, onCreateClick, onImportClick, isFireFox, handleLoginError],
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Column}
      justifyContent={BoxJustifyContent.Center}
      alignItems={BoxAlignItems.Center}
      className="welcome-container h-full w-full"
    >
      {!isLoggingIn && (
        <Suspense fallback={<Box />}>
          <MetaMaskWordMarkAnimation
            setIsAnimationComplete={setIsAnimationComplete}
            isAnimationComplete={isAnimationComplete}
            skipTransition={shouldSkipAnimation}
          />
        </Suspense>
      )}

      {!isLoggingIn && (
        <>
          <WelcomeLogin
            onLogin={handleLogin}
            isAnimationComplete={isAnimationComplete}
            skipTransition={shouldSkipAnimation}
          />

          {loginError !== null && (
            <LoginErrorModal
              onDone={() => setLoginError(null)}
              loginError={loginError}
            />
          )}
        </>
      )}

      {isLoggingIn && (
        <Suspense fallback={<Box />}>
          <FoxAppearAnimation isLoader />
        </Suspense>
      )}
    </Box>
  );
}
