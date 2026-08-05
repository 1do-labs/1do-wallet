import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextAlign,
  TextButton,
  TextButtonSize,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { setTermsOfUseLastAgreed } from '../../../store/actions';
import {
  ONEDO_TERMS_LINK,
  PRIVACY_POLICY_LINK,
} from '../../../../shared/lib/ui-utils';
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
          transform: isAnimationComplete ? 'translateY(0)' : 'translateY(8px)',
          // Skip transition when returning from another page
          transition: skipTransition
            ? 'none'
            : 'opacity 0.35s ease-out, transform 0.35s ease-out',
        }}
        className={'welcome-login'}
      >
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          textAlign={TextAlign.Center}
          className="welcome-login__description"
        >
          {t('appDescription')}
        </Text>
        <Box
          flexDirection={BoxFlexDirection.Column}
          gap={3}
          className="welcome-login__actions w-full"
        >
          <Button
            data-testid="onboarding-create-wallet"
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            className="welcome-login__button welcome-login__button--primary w-full"
            onClick={() => handleButtonClick(LOGIN_OPTION.NEW, LOGIN_TYPE.SRP)}
          >
            {t('onboardingCreateWallet')}
          </Button>
          <Button
            data-testid="onboarding-import-wallet"
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            className="welcome-login__button welcome-login__button--secondary w-full"
            onClick={() =>
              handleButtonClick(LOGIN_OPTION.EXISTING, LOGIN_TYPE.SRP)
            }
          >
            {t('onboardingImportWallet')}
          </Button>
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
          className="welcome-login__footer"
        >
          <TextButton size={TextButtonSize.BodyXs} asChild>
            <a
              href={ONEDO_TERMS_LINK}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('onboardingLoginFooterTermsOfUse')}
            </a>
          </TextButton>
          <Box className="welcome-login__footer-divider" aria-hidden="true" />
          <TextButton size={TextButtonSize.BodyXs} asChild>
            <a
              href={PRIVACY_POLICY_LINK}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('onboardingLoginFooterPrivacyNotice')}
            </a>
          </TextButton>
        </Box>
      </Box>
    </>
  );
}
