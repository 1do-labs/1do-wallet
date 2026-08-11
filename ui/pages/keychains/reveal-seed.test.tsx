import React from 'react';
import configureMockStore from 'redux-mock-store';
import { fireEvent, waitFor } from '@testing-library/react';
import thunk from 'redux-thunk';
import { renderWithProvider } from '../../../test/lib/render-helpers-navigate';
import mockState from '../../../test/data/mock-state.json';
import { enLocale as messages } from '../../../test/lib/i18n-helpers';
import RevealSeedPage from './reveal-seed';

const mockUseParams = jest.fn().mockReturnValue({});

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockUseParams(),
}));

const mockRequestRevealSeedWords = jest.fn();
const password = 'password';
const revealedSeedWords = 'test srp';

jest.mock('../../store/actions.ts', () => ({
  ...jest.requireActual('../../store/actions.ts'),
  requestRevealSeedWords: (userPassword: string, keyringId?: string) =>
    mockRequestRevealSeedWords(userPassword, keyringId),
}));

type NavigateQuizToPasswordScreenArgs = {
  getByText: (id: string | RegExp) => HTMLElement;
  queryByTestId: (id: string) => HTMLElement | null;
};

async function navigateQuizToPasswordScreen({
  getByText,
  queryByTestId,
}: NavigateQuizToPasswordScreenArgs) {
  fireEvent.click(getByText(messages.srpSecurityQuizGetStarted.message));

  for (let question = 0; question < 2; question += 1) {
    await waitFor(() => {
      expect(queryByTestId('srp-quiz-right-answer')).toBeInTheDocument();
    });
    fireEvent.click(queryByTestId('srp-quiz-right-answer') as HTMLElement);

    await waitFor(() => {
      expect(queryByTestId('srp-quiz-continue')).toBeInTheDocument();
    });
    fireEvent.click(queryByTestId('srp-quiz-continue') as HTMLElement);
  }

  await waitFor(() => {
    expect(queryByTestId('input-password')).toBeInTheDocument();
  });
}

describe('RevealSeedPage', () => {
  const store = configureMockStore([thunk])(mockState as object);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({});
    mockRequestRevealSeedWords.mockImplementation(() => {
      return (dispatch: jest.Mock) => {
        dispatch({ type: 'MOCK_REQUEST_REVEAL_SEED_WORDS' });
        return Promise.resolve(revealedSeedWords);
      };
    });
  });

  it('shows the quiz introduction first', () => {
    const { getByText } = renderWithProvider(<RevealSeedPage />, store);

    expect(
      getByText(messages.srpSecurityQuizGetStarted.message),
    ).toBeInTheDocument();
  });

  it('reveals the recovery phrase after the correct password is submitted', async () => {
    const { getByText, queryByTestId } = renderWithProvider(
      <RevealSeedPage />,
      store,
    );

    await navigateQuizToPasswordScreen({ getByText, queryByTestId });
    fireEvent.change(queryByTestId('input-password') as HTMLElement, {
      target: { value: password },
    });
    fireEvent.click(getByText(messages.continue.message));

    await waitFor(() => {
      expect(mockRequestRevealSeedWords).toHaveBeenCalledWith(
        password,
        undefined,
      );
      expect(getByText(messages.copyToClipboard.message)).toBeInTheDocument();
    });
  });

  it('shows an error when recovery phrase retrieval fails', async () => {
    mockRequestRevealSeedWords.mockImplementationOnce(() => {
      return () => Promise.reject(new Error('bad password'));
    });

    const { getByText, queryByTestId } = renderWithProvider(
      <RevealSeedPage />,
      store,
    );

    await navigateQuizToPasswordScreen({ getByText, queryByTestId });
    fireEvent.change(queryByTestId('input-password') as HTMLElement, {
      target: { value: 'bad-password' },
    });
    fireEvent.click(getByText(messages.continue.message));

    await waitFor(() => {
      expect(getByText('bad password')).toBeInTheDocument();
    });
  });

  it('passes the selected keyring ID to the reveal action', async () => {
    const keyringId = 'ULID01234567890ABCDEFGHIJKLMN';
    mockUseParams.mockReturnValue({ keyringId });
    const { getByText, queryByTestId } = renderWithProvider(
      <RevealSeedPage />,
      store,
    );

    await navigateQuizToPasswordScreen({ getByText, queryByTestId });
    fireEvent.change(queryByTestId('input-password') as HTMLElement, {
      target: { value: password },
    });
    fireEvent.click(getByText(messages.continue.message));

    await waitFor(() => {
      expect(mockRequestRevealSeedWords).toHaveBeenCalledWith(
        password,
        keyringId,
      );
    });
  });
});
