import React, { useState, useContext, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import {
  Text,
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
  ButtonIcon,
  IconName,
  ButtonIconSize,
  TextVariant,
  TextColor,
  IconColor,
  TextAlign,
  BoxFlexDirection,
  BoxJustifyContent,
  BoxAlignItems,
  TextButton,
  TextButtonSize,
} from '@metamask/design-system-react';
import { useI18nContext } from '../../../hooks/useI18nContext';
import {
  ONBOARDING_CONFIRM_SRP_ROUTE,
  ONBOARDING_REVEAL_SRP_ROUTE,
  ONBOARDING_COMPLETION_ROUTE,
  MANAGE_WALLET_RECOVERY_ROUTE,
} from '../../../helpers/constants/routes';
import { getHDEntropyIndex, getFirstTimeFlowType } from '../../../selectors';
import SRPDetailsModal from '../../../components/app/srp-details-modal';
import { setSeedPhraseBackedUp } from '../../../store/actions';
import { TraceName } from '../../../../shared/lib/trace';
import { getBrowserName } from '../../../../shared/lib/browser-runtime.utils';
import { PLATFORM_FIREFOX } from '../../../../shared/constants/app';
import { FirstTimeFlowType } from '../../../../shared/constants/onboarding';
import { getSeedPhraseBackedUp } from '../../../ducks/metamask/metamask';
import RecoveryPhraseChips from './recovery-phrase-chips';

type RecoveryPhraseProps = {
  secretRecoveryPhrase: string;
};

// TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
// eslint-disable-next-line @typescript-eslint/naming-convention
export default function RecoveryPhrase({
  secretRecoveryPhrase,
}: RecoveryPhraseProps) {
  const navigate = useNavigate();
  const t = useI18nContext();
  const { search } = useLocation();
  const dispatch = useDispatch();
  const firstTimeFlowType = useSelector(getFirstTimeFlowType);
  const hasSeedPhraseBackedUp = useSelector(getSeedPhraseBackedUp);
  const hdEntropyIndex = useSelector(getHDEntropyIndex);
  const [phraseRevealed, setPhraseRevealed] = useState(false);
  const [showSrpDetailsModal, setShowSrpDetailsModal] = useState(false);
  const searchParams = new URLSearchParams(search);
  const isFromReminder = searchParams.get('isFromReminder');
  const isFromSettingsSecurity = searchParams.get('isFromSettingsSecurity');

  const queryParams = new URLSearchParams();
  if (isFromReminder) {
    queryParams.set('isFromReminder', isFromReminder);
  }
  if (isFromSettingsSecurity) {
    queryParams.set('isFromSettingsSecurity', isFromSettingsSecurity);
  }
  const nextRouteQueryString = queryParams.toString();

  useEffect(() => {
    if (!secretRecoveryPhrase) {
      navigate(
        {
          pathname: ONBOARDING_REVEAL_SRP_ROUTE,
          search: nextRouteQueryString ? `?${nextRouteQueryString}` : '',
        },
        {
          replace: true,
        },
      );
    } else if (hasSeedPhraseBackedUp) {
      // if user has already done the Secure Wallet flow, we can redirect to the next page
      navigate(ONBOARDING_COMPLETION_ROUTE, { replace: true });
    }
  }, [
    navigate,
    secretRecoveryPhrase,
    nextRouteQueryString,
    hasSeedPhraseBackedUp,
  ]);

  const handleContinue = useCallback(() => {
    navigate({
      pathname: ONBOARDING_CONFIRM_SRP_ROUTE,
      search: nextRouteQueryString ? `?${nextRouteQueryString}` : '',
    });
  }, [hdEntropyIndex, navigate, nextRouteQueryString]);

  const handleOnShowSrpDetailsModal = useCallback(() => {
    setShowSrpDetailsModal(true);
  }, []);

  const handleRemindLater = useCallback(async () => {
    await dispatch(setSeedPhraseBackedUp(false));

    navigate(ONBOARDING_COMPLETION_ROUTE, { replace: true });
  }, [dispatch, firstTimeFlowType, hdEntropyIndex, navigate]);

  const handleBack = useCallback(() => {
    navigate(
      `${ONBOARDING_REVEAL_SRP_ROUTE}${
        nextRouteQueryString ? `?${nextRouteQueryString}` : ''
      }`,
      { replace: true },
    );
  }, [navigate, nextRouteQueryString]);

  const onClose = useCallback(() => {
    navigate(MANAGE_WALLET_RECOVERY_ROUTE, { replace: true });
  }, [navigate]);

  return (
    <Box
      flexDirection={BoxFlexDirection.Column}
      justifyContent={BoxJustifyContent.Between}
      alignItems={BoxAlignItems.Center}
      gap={6}
      className="recovery-phrase h-full"
      data-testid="recovery-phrase"
    >
      <Box>
        {showSrpDetailsModal && (
          <SRPDetailsModal onClose={() => setShowSrpDetailsModal(false)} />
        )}
        {isFromReminder && isFromSettingsSecurity ? (
          <Box
            className="recovery-phrase__header grid w-full"
            alignItems={BoxAlignItems.Center}
            gap={3}
            marginBottom={4}
          >
            <ButtonIcon
              iconName={IconName.ArrowLeft}
              color={IconColor.IconDefault}
              size={ButtonIconSize.Md}
              data-testid="reveal-recovery-phrase-review-back-button"
              onClick={handleBack}
              ariaLabel={t('back')}
            />
            <Text variant={TextVariant.HeadingSm} textAlign={TextAlign.Center}>
              {t('seedPhraseReviewTitleSettings')}
            </Text>
            <ButtonIcon
              iconName={IconName.Close}
              color={IconColor.IconDefault}
              size={ButtonIconSize.Md}
              data-testid="reveal-recovery-phrase-review-close-button"
              onClick={onClose}
              ariaLabel={t('close')}
            />
          </Box>
        ) : (
          <Box
            justifyContent={BoxJustifyContent.Start}
            marginBottom={4}
            className="w-full"
          >
            <Text variant={TextVariant.HeadingLg}>
              {t('seedPhraseReviewTitle')}
            </Text>
          </Box>
        )}
        <Box>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {t('seedPhraseReviewDetails', [
              <TextButton
                key="seedPhraseReviewDetails"
                onClick={handleOnShowSrpDetailsModal}
                className="hover:bg-transparent active:bg-transparent w-fit"
              >
                {t('secretRecoveryPhrase')}
              </TextButton>,
            ])}
          </Text>
        </Box>
        <RecoveryPhraseChips
          secretRecoveryPhrase={secretRecoveryPhrase.split(' ')}
          phraseRevealed={phraseRevealed}
          revealPhrase={() => {
            setPhraseRevealed(true);
          }}
        />
      </Box>
      <Box className="w-full" flexDirection={BoxFlexDirection.Column} gap={4}>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          data-testid="recovery-phrase-continue"
          className="recovery-phrase__footer--button w-full"
          disabled={!phraseRevealed}
          onClick={handleContinue}
        >
          {t('continue')}
        </Button>
        {!isFromReminder && (
          <TextButton
            size={TextButtonSize.BodyMd}
            onClick={handleRemindLater}
            className="w-full hover:bg-transparent active:bg-transparent"
            data-testid="recovery-phrase-remind-later"
          >
            {t('secureWalletRemindLaterButton')}
          </TextButton>
        )}
      </Box>
    </Box>
  );
}

RecoveryPhrase.propTypes = {
  secretRecoveryPhrase: PropTypes.string,
};
