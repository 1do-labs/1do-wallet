import React from 'react';
import configureMockStore from 'redux-mock-store';
import { fireEvent } from '@testing-library/react';
import thunk from 'redux-thunk';
import { renderWithProvider } from '../../../test/lib/render-helpers-navigate';
import { enLocale as messages } from '../../../test/lib/i18n-helpers';
import UnlockPageImport from '.';

// The container uses compose() which returns ComponentType, but TypeScript sees it as 'any'
const UnlockPage = UnlockPageImport as React.ComponentType<
  Record<string, unknown>
>;

const mockUseNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  return {
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockUseNavigate,
  };
});

jest.mock('../onboarding-flow/welcome/fox-appear-animation', () => ({
  // This is the name of the property that turns this into an ES module.
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __esModule: true,
  default: () => <div data-testid="fox-appear-animation" />,
}));

const mockTryUnlockMetamask = jest.fn(() => {
  return async () => {
    return Promise.resolve();
  };
});
const mockMarkPasswordForgotten = jest.fn();
const mockResetWallet = jest.fn(() => {
  return Promise.resolve();
});

jest.mock('../../store/actions.ts', () => ({
  ...jest.requireActual('../../store/actions.ts'),
  tryUnlockMetamask: () => mockTryUnlockMetamask,
  markPasswordForgotten: () => mockMarkPasswordForgotten,
  resetWallet: () => mockResetWallet,
}));

describe('Unlock Page', () => {
  process.env.METAMASK_BUILD_TYPE = 'main';

  const mockState = {
    metamask: {},
  };
  const mockStore = configureMockStore([thunk])(mockState);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should match snapshot', () => {
    const { container } = renderWithProvider(<UnlockPage />, mockStore);

    expect(container).toMatchSnapshot();
  });

  it('renders centered 1Do branding on the unlock page', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <UnlockPage />,
      mockStore,
    );

    expect(getByTestId('unlock-page-brand-title')).toHaveTextContent('1Do');
    expect(getByTestId('unlock-page-brand-logo')).toBeInTheDocument();
    expect(getByText(messages.welcomeBack.message)).toBeInTheDocument();
    expect(
      getByText(messages.enterYourPasswordContinue.message),
    ).toBeInTheDocument();
  });

  it('changes password and submits', async () => {
    const props = {
      onSubmit: jest.fn(),
    };

    const { queryByTestId } = renderWithProvider(
      <UnlockPage {...props} />,
      mockStore,
    );

    const passwordField = queryByTestId('unlock-password');
    const loginButton = queryByTestId('unlock-submit');

    expect(passwordField).toBeInTheDocument();
    expect(passwordField).toHaveAttribute('type', 'password');
    expect(passwordField?.nodeName).toBe('INPUT');
    expect(loginButton).toBeInTheDocument();
    expect(loginButton).toBeDisabled();

    fireEvent.change(passwordField as HTMLElement, {
      target: { value: 'a-password' },
    });

    expect(loginButton).toBeEnabled();

    fireEvent.click(loginButton as HTMLElement);

    expect(props.onSubmit).toHaveBeenCalled();
  });

  it('clicks imports seed button', () => {
    const mockStateNonUnlocked = {
      metamask: { completedOnboarding: true },
    };
    const store = configureMockStore([thunk])(mockStateNonUnlocked);
    const { getByText, getByTestId } = renderWithProvider(
      <UnlockPage />,
      store,
    );

    fireEvent.click(getByText(messages.forgotPassword.message));

    const resetPasswordButton = getByTestId('reset-password-modal-button');

    expect(resetPasswordButton).toBeInTheDocument();

    fireEvent.click(resetPasswordButton);

    expect(mockMarkPasswordForgotten).toHaveBeenCalled();
  });

  it('should redirect to history location when unlocked (from state)', () => {
    const intendedPath = '/previous-route';
    const mockStateWithUnlock = {
      metamask: { isUnlocked: true },
    };
    const store = configureMockStore([thunk])(mockStateWithUnlock);

    // Set up the router to have the location state that would come from a redirect
    const locationState = { from: { pathname: intendedPath } };

    renderWithProvider(<UnlockPage />, store, {
      pathname: '/unlock',
      state: locationState,
    } as unknown as string);

    expect(mockUseNavigate).toHaveBeenCalledTimes(1);
    expect(mockUseNavigate).toHaveBeenCalledWith(intendedPath);
  });

  it('changes password, submits, and redirects to the specified route (from location.state)', async () => {
    const intendedPath = '/intended-route';
    const intendedSearch = '?abc=123';
    const mockStateNonUnlocked = {
      metamask: { isUnlocked: false },
    };
    const store = configureMockStore([thunk])(mockStateNonUnlocked);

    // Set up the router to have the location state that would come from a redirect
    const locationState = {
      from: { pathname: intendedPath, search: intendedSearch },
    };

    const { queryByTestId } = renderWithProvider(<UnlockPage />, store, {
      pathname: '/unlock',
      state: locationState,
    } as unknown as string);

    const passwordField = queryByTestId('unlock-password') as HTMLElement;
    const loginButton = queryByTestId('unlock-submit') as HTMLElement;
    fireEvent.change(passwordField, { target: { value: 'a-password' } });
    fireEvent.click(loginButton);
    await Promise.resolve(); // Wait for async operations

    expect(mockTryUnlockMetamask).toHaveBeenCalledTimes(1);
    expect(mockUseNavigate).toHaveBeenCalledTimes(1);
    expect(mockUseNavigate).toHaveBeenCalledWith(intendedPath + intendedSearch);
  });
});
