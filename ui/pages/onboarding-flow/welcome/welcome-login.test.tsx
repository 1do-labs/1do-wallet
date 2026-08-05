import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';
import { enLocale as messages } from '../../../../test/lib/i18n-helpers';
import configureStore from '../../../store/store';
import { setBackgroundConnection } from '../../../store/background-connection';
import WelcomeLogin from './welcome-login';

describe('Welcome login', () => {
  beforeEach(() => {
    setBackgroundConnection(
      new Proxy(
        {},
        {
          get: () => jest.fn().mockResolvedValue(undefined),
        },
      ) as never,
    );
  });

  it('renders the product message and wallet actions', () => {
    const mockOnLogin = jest.fn();
    const store = configureStore({});
    const { getByTestId, getByText } = renderWithProvider(
      <WelcomeLogin onLogin={mockOnLogin} isAnimationComplete={false} />,
      store,
    );
    expect(getByTestId('get-started')).toBeInTheDocument();

    const importButton = getByText(messages.onboardingImportWallet.message);
    expect(importButton).toBeInTheDocument();

    const createButton = getByText(messages.onboardingCreateWallet.message);
    expect(createButton).toBeInTheDocument();
    expect(getByText(messages.appDescription.message)).toBeInTheDocument();
  });

  it('links to the 1Do terms and privacy pages', () => {
    const store = configureStore({});
    const { getByRole } = renderWithProvider(
      <WelcomeLogin onLogin={jest.fn()} isAnimationComplete={true} />,
      store,
    );

    expect(
      getByRole('link', {
        name: messages.onboardingLoginFooterTermsOfUse.message,
      }),
    ).toHaveAttribute('href', 'https://www.1do.io/terms');
    expect(
      getByRole('link', {
        name: messages.onboardingLoginFooterPrivacyNotice.message,
      }),
    ).toHaveAttribute('href', 'https://www.1do.io/privacy');
  });

  it('starts the existing wallet SRP flow', async () => {
    const mockOnLogin = jest.fn();

    const store = configureStore({});
    const { getByTestId, getByText } = renderWithProvider(
      <WelcomeLogin onLogin={mockOnLogin} isAnimationComplete={true} />,
      store,
    );
    expect(getByTestId('get-started')).toBeInTheDocument();

    const importButton = getByText(messages.onboardingImportWallet.message);
    expect(importButton).toBeInTheDocument();

    fireEvent.click(importButton);

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith('srp', 'existing');
    });
  });
});
