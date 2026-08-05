import React, {
  ChangeEvent,
  Component,
  ComponentType,
  FormEvent,
  MutableRefObject,
} from 'react';
import PropTypes from 'prop-types';
import { Location as RouterLocation, NavigateFunction } from 'react-router-dom';
import {
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextAlign,
  TextButton,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react';
import {
  FormTextField,
  FormTextFieldSize,
  TextFieldType,
} from '../../components/component-library';
import {
  BlockSize,
  TextTransform,
} from '../../helpers/constants/design-system';
import { DEFAULT_ROUTE } from '../../helpers/constants/routes';
import {
  MetaMetricsEventCategory,
  MetaMetricsEventName,
} from '../../../shared/constants/metametrics';
import { isBeta, isFlask } from '../../../shared/lib/build-types';
import { TraceName, TraceOperation } from '../../../shared/lib/trace';
import { withMetaMetrics } from '../../contexts/metametrics';
import ResetPasswordModal from './reset-password-modal';
import FormattedCounter from './formatted-counter';
import { OneDoUnlockLogo } from './one-do-unlock-logo';

type UnlockPageProps = {
  navigate: NavigateFunction;
  location: RouterLocation;
  isUnlocked: boolean;
  isOnboardingCompleted: boolean;
  onRestore: () => void;
  onSubmit: (password: string) => Promise<void>;
  forceUpdateMetamaskState: () => Promise<void>;
  onboardingParentContext: MutableRefObject<unknown>;
  firstTimeFlowType: string | null;
  resetWallet: () => Promise<void>;
  isPopup: boolean;
  isWalletResetInProgress: boolean;
};

type UnlockPageState = {
  password: string;
  error: string | null;
  showResetPasswordModal: boolean;
  isLocked: boolean;
  isSubmitting: boolean;
  unlockDelayPeriod: number;
};

type UnlockPageContext = {
  trackEvent: (event: object, options?: object) => void;
  bufferedTrace: (trace: object) => void;
  bufferedEndTrace: (trace: object) => void;
  t: (key: string, args?: unknown[]) => string;
};

type LoginError = {
  message: string;
  data?: {
    numberOfAttempts?: number;
    remainingTime?: number;
  };
};

class UnlockPage extends Component<UnlockPageProps, UnlockPageState> {
  static contextTypes = {
    trackEvent: PropTypes.func,
    bufferedTrace: PropTypes.func,
    bufferedEndTrace: PropTypes.func,
    t: PropTypes.func,
  };

  static propTypes = {
    navigate: PropTypes.func.isRequired,
    location: PropTypes.object.isRequired,
    isUnlocked: PropTypes.bool,
    isOnboardingCompleted: PropTypes.bool,
    onRestore: PropTypes.func,
    onSubmit: PropTypes.func,
    forceUpdateMetamaskState: PropTypes.func,
    onboardingParentContext: PropTypes.object,
    firstTimeFlowType: PropTypes.string,
    resetWallet: PropTypes.func,
    isPopup: PropTypes.bool,
    isWalletResetInProgress: PropTypes.bool,
  };

  state: UnlockPageState = {
    password: '',
    error: null,
    showResetPasswordModal: false,
    isLocked: false,
    isSubmitting: false,
    unlockDelayPeriod: 0,
  };

  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  failed_attempts = 0;

  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  UNSAFE_componentWillMount() {
    const { isUnlocked, navigate, location } = this.props;

    if (isUnlocked) {
      let redirectTo = DEFAULT_ROUTE;
      const fromLocation = location.state?.from;
      if (fromLocation?.pathname) {
        const search = fromLocation.search || '';
        redirectTo = fromLocation.pathname + search;
      }
      navigate(redirectTo);
    }
  }

  async componentDidMount() {
    if (
      this.props.isWalletResetInProgress &&
      this.props.firstTimeFlowType === null
    ) {
      this.props.navigate(DEFAULT_ROUTE, { replace: true });
    }
  }

  handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const { password, isSubmitting } = this.state;
    const { onSubmit, isOnboardingCompleted } = this.props;

    if (password === '' || isSubmitting) {
      return;
    }

    this.setState({ error: null, isSubmitting: true });

    if (!isOnboardingCompleted) {
      this.context.bufferedTrace({
        name: TraceName.OnboardingPasswordLoginAttempt,
        op: TraceOperation.OnboardingUserJourney,
        parentContext: this.props.onboardingParentContext?.current,
      });
    }

    try {
      await onSubmit(password);

      if (!isOnboardingCompleted) {
        this.context.bufferedEndTrace({
          name: TraceName.OnboardingPasswordLoginAttempt,
        });
        this.context.bufferedEndTrace({
          name: TraceName.OnboardingJourneyOverall,
        });
      }

      this.context.trackEvent(
        {
          category: MetaMetricsEventCategory.Navigation,
          event: MetaMetricsEventName.AppUnlocked,
          properties: {
            // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
            // eslint-disable-next-line @typescript-eslint/naming-convention
            failed_attempts: this.failed_attempts,
          },
        },
        {
          isNewVisit: true,
        },
      );
    } catch (error) {
      await this.handleLoginError(error as LoginError);
    } finally {
      this.setState({ isSubmitting: false });
    }
  };

  handleLoginError = async (error: LoginError) => {
    const { t } = this.context as UnlockPageContext;
    const { message, data } = error;

    if (data?.numberOfAttempts !== undefined) {
      this.failed_attempts = data.numberOfAttempts;
    }

    let finalErrorMessage = message;
    let finalUnlockDelayPeriod = 0;
    let errorReason;

    switch (message) {
      case 'Incorrect password':
        finalErrorMessage = t('unlockPageIncorrectPassword');
        errorReason = 'incorrect_password';
        break;
      case 'Too many login attempts':
        this.setState({ isLocked: true });
        finalErrorMessage = t('unlockPageTooManyFailedAttempts');
        errorReason = 'too_many_login_attempts';
        finalUnlockDelayPeriod = data?.remainingTime ?? 0;
        break;
      default:
        finalErrorMessage = message;
        break;
    }

    if (errorReason) {
      await this.props.forceUpdateMetamaskState();
      this.context.trackEvent({
        category: MetaMetricsEventCategory.Navigation,
        event: MetaMetricsEventName.AppUnlockedFailed,
        properties: {
          reason: errorReason,
          // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
          // eslint-disable-next-line @typescript-eslint/naming-convention
          failed_attempts: this.failed_attempts,
        },
      });
    }

    this.setState({
      error: finalErrorMessage,
      unlockDelayPeriod: finalUnlockDelayPeriod,
    });
  };

  handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const { target } = event;
    this.setState({ password: target.value, error: null });
  }

  renderHelpText = () => {
    const { error, unlockDelayPeriod } = this.state;

    if (!error) {
      return null;
    }

    return (
      <Box
        className="unlock-page__help-text"
        flexDirection={BoxFlexDirection.Column}
      >
        <Text
          data-testid="unlock-page-help-text"
          variant={TextVariant.BodySm}
          textAlign={TextAlign.Left}
          color={TextColor.ErrorDefault}
        >
          {error}
          {unlockDelayPeriod > 0 && (
            <FormattedCounter
              startFrom={unlockDelayPeriod}
              onCountdownEnd={() =>
                this.setState({
                  isLocked: false,
                  error: null,
                  unlockDelayPeriod: 0,
                })
              }
            />
          )}
        </Text>
      </Box>
    );
  };

  onForgotPasswordOrLoginWithDiffMethods = async () => {
    this.context.trackEvent({
      category: MetaMetricsEventCategory.Onboarding,
      event: MetaMetricsEventName.ForgotPasswordClicked,
      properties: {
        // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
        // eslint-disable-next-line @typescript-eslint/naming-convention
        account_type: 'metamask',
      },
    });

    this.setState({ showResetPasswordModal: true });
  };

  onRestoreWallet = async () => {
    this.context.trackEvent({
      category: MetaMetricsEventCategory.Accounts,
      event: MetaMetricsEventName.ResetWallet,
      properties: {
        // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
        // eslint-disable-next-line @typescript-eslint/naming-convention
        account_type: 'metamask',
      },
    });
    this.props.onRestore();
  };

  onResetWallet = async () => {
    this.setState({ showResetPasswordModal: false });
    await this.props.resetWallet();
    await this.props.forceUpdateMetamaskState();
    this.props.navigate(DEFAULT_ROUTE, { replace: true });
  };

  render() {
    const { password, error, isLocked, showResetPasswordModal } = this.state;
    const { t } = this.context as UnlockPageContext;

    return (
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        backgroundColor={BoxBackgroundColor.BackgroundDefault}
        className="w-full"
        paddingBottom={12}
      >
        {showResetPasswordModal && (
          <ResetPasswordModal
            onClose={() => this.setState({ showResetPasswordModal: false })}
            onRestore={this.onRestoreWallet}
          />
        )}
        <Box
          flexDirection={BoxFlexDirection.Column}
          justifyContent={BoxJustifyContent.Center}
          alignItems={BoxAlignItems.Center}
          padding={4}
          className="unlock-page w-full"
          data-testid="unlock-page"
          asChild
        >
          <form onSubmit={this.handleSubmit}>
            <Box
              flexDirection={BoxFlexDirection.Column}
              className="w-full"
              alignItems={BoxAlignItems.Center}
            >
              <Box
                className="unlock-page__mascot-container"
                marginBottom={isBeta() || isFlask() ? 6 : 0}
              >
                <Box
                  className="unlock-page__brand"
                  flexDirection={BoxFlexDirection.Column}
                  alignItems={BoxAlignItems.Center}
                >
                  <OneDoUnlockLogo isPopup={this.props.isPopup ?? false} />
                  <Text
                    data-testid="unlock-page-brand-title"
                    variant={TextVariant.HeadingSm}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextDefault}
                    textAlign={TextAlign.Center}
                    className="unlock-page__brand-title"
                  >
                    1Do
                  </Text>
                  <Text
                    variant={TextVariant.HeadingLg}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextDefault}
                    textAlign={TextAlign.Center}
                    className="unlock-page__welcome-title"
                  >
                    {t('welcomeBack')}
                  </Text>
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    textAlign={TextAlign.Center}
                    className="unlock-page__welcome-description"
                  >
                    {t('enterYourPasswordContinue')}
                  </Text>
                </Box>
                {isBeta() ? (
                  <Text
                    className="unlock-page__mascot-container__beta bg-primary-default rounded-lg p-1"
                    color={TextColor.PrimaryInverse}
                    textTransform={TextTransform.Uppercase}
                    fontWeight={FontWeight.Medium}
                  >
                    {t('beta')}
                  </Text>
                ) : null}
              </Box>
              <FormTextField
                id="password"
                placeholder={t('enterYourPassword')}
                size={FormTextFieldSize.Lg}
                inputProps={{
                  'data-testid': 'unlock-password',
                  'aria-label': t('password'),
                }}
                textFieldProps={{
                  disabled: isLocked,
                }}
                onChange={(event) =>
                  this.handleInputChange(event as ChangeEvent<HTMLInputElement>)
                }
                type={TextFieldType.Password}
                value={password}
                error={Boolean(error)}
                helpText={this.renderHelpText()}
                autoComplete={false}
                autoFocus
                width={BlockSize.Full}
                marginBottom={4}
              />
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                className="unlock-page__submit-button w-full mb-6"
                type="submit"
                data-testid="unlock-submit"
                disabled={!password || isLocked}
              >
                {t('unlock')}
              </Button>
              <TextButton
                data-testid="unlock-forgot-password-button"
                key="import-account"
                type="button"
                onClick={this.onForgotPasswordOrLoginWithDiffMethods}
                className="mb-4"
                color={TextColor.PrimaryDefault}
              >
                {t('forgotPassword')}
              </TextButton>
            </Box>
          </form>
        </Box>
      </Box>
    );
  }
}

export default withMetaMetrics(
  UnlockPage as unknown as ComponentType<Record<string, unknown>>,
);
