import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import copyToClipboard from 'copy-to-clipboard';
import {
  TextButton,
  Text,
  Box,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react';
import { getErrorMessage } from '../../../shared/lib/error';
import ZENDESK_URLS from '../../helpers/constants/zendesk-url';
import { useI18nContext } from '../../hooks/useI18nContext';
import { requestRevealSeedWords } from '../../store/actions';
import { endTrace, trace, TraceName } from '../../../shared/lib/trace';
import { PREVIOUS_ROUTE } from '../../helpers/constants/routes';
import { Toast, ToastContainer } from '../../components/multichain/toast';
import { useBoolean } from '../../hooks/useBoolean';
import type { RevealSeedScreen, RevealSeedLocationState } from './types';
import { RevealSeedPageHeader } from './reveal-seed-page-header';
import { RevealSeedWarning } from './reveal-seed-warning';
import { QuizIntroduction } from './quiz-introduction';
import { QuizQuestion } from './quiz-question';
import { PasswordPrompt } from './password-prompt';
import { RevealSeedContent } from './reveal-seed-content';

const QUIZ_INTRODUCTION_SCREEN: RevealSeedScreen = 'QUIZ_INTRODUCTION_SCREEN';
const QUIZ_QUESTIONS_SCREEN: RevealSeedScreen = 'QUIZ_QUESTIONS_SCREEN';
// Screen identifier for the unlock step (not a credential)
const PASSWORD_PROMPT_SCREEN: RevealSeedScreen = 'PASSWORD_PROMPT_SCREEN'; // NOSONAR
const REVEAL_SEED_SCREEN: RevealSeedScreen = 'REVEAL_SEED_SCREEN';

function RevealSeedPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const t = useI18nContext();
  const { keyringId } = useParams<Record<string, string | undefined>>();
  const locationState = useLocation().state as RevealSeedLocationState | null;
  const skipQuiz = locationState?.skipQuiz ?? false;

  const [screen, setScreen] = useState<RevealSeedScreen>(
    skipQuiz ? PASSWORD_PROMPT_SCREEN : QUIZ_INTRODUCTION_SCREEN,
  );
  const [password, setPassword] = useState('');
  const [seedWords, setSeedWords] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { value: showPassword, toggle } = useBoolean();
  const [phraseRevealed, setPhraseRevealed] = useState(false);

  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const onClickCopy = useCallback(() => {
    if (!seedWords || !phraseRevealed) {
      return;
    }
    copyToClipboard(seedWords);
    setShowSuccessToast(true);
  }, [seedWords, phraseRevealed]);

  useEffect(() => {
    const passwordBox = document.getElementById('password-box');
    if (passwordBox) {
      passwordBox.focus();
    }
  }, []);

  const handleSubmit = useCallback(
    (event: React.FormEvent | React.MouseEvent) => {
      event.preventDefault();
      trace({ name: TraceName.RevealSeed });
      setSeedWords(null);
      setError(null);

      (
        dispatch(
          requestRevealSeedWords(password, keyringId),
        ) as unknown as Promise<string>
      )
        .then((revealedSeedWords) => {
          setSeedWords(revealedSeedWords);
          setScreen(REVEAL_SEED_SCREEN);
        })
        .catch((requestError: Error) => {
          setError(getErrorMessage(requestError));
        })
        .finally(() => {
          endTrace({ name: TraceName.RevealSeed });
        });
    },
    [dispatch, password, keyringId],
  );

  const togglePasswordVisibility = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      toggle();
    },
    [toggle],
  );

  const openSupportArticle = useCallback(() => {
    globalThis.platform.openTab({
      url: `${ZENDESK_URLS.PASSWORD_AND_SRP_ARTICLE}#metamask-secret-recovery-phrase-dos-and-donts`,
    });
  }, []);

  const handleBack = useCallback(() => {
    navigate(PREVIOUS_ROUTE);
  }, [navigate]);

  const handleQuizComplete = useCallback(() => {
    setScreen(PASSWORD_PROMPT_SCREEN);
  }, []);

  const handleRevealPhrase = useCallback(() => {
    setPhraseRevealed(true);
  }, []);

  const handlePasswordContinueClick = useCallback(
    (event: React.MouseEvent) => {
      handleSubmit(event);
    },
    [handleSubmit],
  );

  const handleQuizGetStarted = useCallback(() => {
    setScreen(QUIZ_QUESTIONS_SCREEN);
  }, []);

  const renderContent = () => {
    if (screen === QUIZ_INTRODUCTION_SCREEN) {
      return (
        <QuizIntroduction
          onGetStarted={handleQuizGetStarted}
          onLearnMore={openSupportArticle}
        />
      );
    }
    if (screen === QUIZ_QUESTIONS_SCREEN) {
      return (
        <QuizQuestion
          onQuizComplete={handleQuizComplete}
          onLearnMore={openSupportArticle}
        />
      );
    }
    if (screen === PASSWORD_PROMPT_SCREEN) {
      return (
        <PasswordPrompt
          password={password}
          error={error}
          showPassword={showPassword}
          onPasswordChange={setPassword}
          onTogglePasswordVisibility={togglePasswordVisibility}
          onSubmit={handleSubmit}
          onContinueClick={handlePasswordContinueClick}
        />
      );
    }
    if (seedWords) {
      return (
        <RevealSeedContent
          seedWords={seedWords}
          phraseRevealed={phraseRevealed}
          onRevealPhrase={handleRevealPhrase}
          onCopy={onClickCopy}
        />
      );
    }
    return null;
  };

  const handleSrpClick = () => {
    globalThis.platform.openTab({
      url: ZENDESK_URLS.SECRET_RECOVERY_PHRASE,
    });
  };

  return (
    <Box
      className="page-container h-full md:w-[490px]"
      paddingTop={8}
      paddingBottom={8}
      paddingLeft={4}
      paddingRight={4}
      gap={4}
      data-testid="reveal-seed-page"
    >
      <RevealSeedPageHeader
        onBack={handleBack}
        title={t('revealSecretRecoveryPhraseSettings')}
        backButtonAriaLabel={t('back')}
      />
      {screen === PASSWORD_PROMPT_SCREEN && (
        <>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {t('revealSeedWordsDescription1', [
              <TextButton
                key="srp-learn-srp"
                onClick={handleSrpClick}
                className="hover:bg-transparent"
              >
                {t('revealSeedWordsSRPName')}
              </TextButton>,
            ])}
          </Text>
          <RevealSeedWarning message={t('revealSeedWordsWarning')} />
        </>
      )}
      {renderContent()}
      {showSuccessToast && (
        <ToastContainer>
          <Toast
            startAdornment={null}
            text={t('copiedToClipboard')}
            onClose={() => setShowSuccessToast(false)}
            autoHideTime={5000}
            onAutoHideToast={() => setShowSuccessToast(false)}
            dataTestId="reveal-seed-copy-success-toast"
          />
        </ToastContainer>
      )}
    </Box>
  );
}

export default RevealSeedPage;
