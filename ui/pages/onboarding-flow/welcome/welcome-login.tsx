import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { ThemeType } from '../../../../shared/constants/preferences';
import { setTermsOfUseLastAgreed } from '../../../store/actions';
import { useTheme } from '../../../hooks/useTheme';
import { LOGIN_OPTION, LOGIN_TYPE, LoginOptionType, LoginType } from './types';

// TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
// eslint-disable-next-line @typescript-eslint/naming-convention
export default function WelcomeLogin({
  onLogin,
  isAnimationComplete,
  skipTransition = false,
}: {
  onLogin: (loginType: LoginType, loginOption: string) => Promise<void>;
  isAnimationComplete: boolean;
  skipTransition?: boolean;
}) {
  const t = useI18nContext();
  const dispatch = useDispatch();
  const theme = useTheme();

  const handleButtonClick = useCallback(
    async (option: LoginOptionType, loginType: LoginType) => {
      await dispatch(setTermsOfUseLastAgreed(new Date().getTime()));
      await onLogin(loginType, option);
    },
    [dispatch, onLogin],
  );

  return (
    <>
      <Box
        data-testid="get-started"
        style={{
          opacity: isAnimationComplete ? 1 : 0,
          transform: isAnimationComplete
            ? 'translateY(0) scale(1)'
            : 'translateY(80px) scale(0.8)',
          // Skip transition when returning from another page
          transition: skipTransition
            ? 'none'
            : 'opacity 0.6s ease-out, transform 0.6s ease-out',
        }}
        className={'welcome-login'}
      >
        <Box flexDirection={BoxFlexDirection.Column} gap={4} className="w-full">
          <Button
            data-testid="onboarding-create-wallet"
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            className="w-full"
            onClick={() => handleButtonClick(LOGIN_OPTION.NEW, LOGIN_TYPE.SRP)}
          >
            {t('onboardingCreateWallet')}
          </Button>
          <Button
            data-theme={
              theme === ThemeType.dark ? ThemeType.light : ThemeType.dark
            }
            data-testid="onboarding-import-wallet"
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            className="w-full"
            onClick={() =>
              handleButtonClick(LOGIN_OPTION.EXISTING, LOGIN_TYPE.SRP)
            }
          >
            {t('onboardingSrpImport')}
          </Button>
        </Box>
      </Box>
    </>
  );
}
