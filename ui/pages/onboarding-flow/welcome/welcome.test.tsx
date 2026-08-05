import React from 'react';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { fireEvent, waitFor } from '@testing-library/react';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';
import { MetaMetricsContext } from '../../../contexts/metametrics';
import {
  MetaMetricsEventAccountType,
  MetaMetricsEventCategory,
  MetaMetricsEventName,
} from '../../../../shared/constants/metametrics';
import {
  ONBOARDING_CREATE_PASSWORD_ROUTE,
  ONBOARDING_IMPORT_WITH_SRP_ROUTE,
} from '../../../helpers/constants/routes';
import { enLocale as messages } from '../../../../test/lib/i18n-helpers';
import Welcome from './welcome';

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockUseNavigate,
}));

jest.mock('./fox-appear-animation', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __esModule: true,
  default: () => <div data-testid="welcome-loading-animation" />,
}));

jest.mock('./metamask-wordmark-animation', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __esModule: true,
  default: () => <div data-testid="onedo-wordmark" />,
}));

describe('Welcome Page', () => {
  const mockStore = configureMockStore([thunk])({
    metamask: {
      internalAccounts: {
        accounts: {},
        selectedAccount: '',
      },
      metaMetricsId: '0x00000000',
    },
  });
  const mockTrackEvent = jest.fn();
  const mockMetaMetricsContext = {
    trackEvent: mockTrackEvent,
    bufferedTrace: jest.fn(),
    bufferedEndTrace: jest.fn(),
    onboardingParentContext: { current: null },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    const { container } = renderWithProvider(<Welcome />, mockStore);

    expect(container).toMatchSnapshot();
  });

  it('displays 1Do product messaging and wallet actions', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <Welcome />,
      mockStore,
    );

    expect(getByTestId('onedo-wordmark')).toBeInTheDocument();
    expect(getByText(messages.appDescription.message)).toBeInTheDocument();
    expect(
      getByText(messages.onboardingCreateWallet.message),
    ).toBeInTheDocument();
    expect(
      getByText(messages.onboardingImportWallet.message),
    ).toBeInTheDocument();
  });

  it('starts the create wallet flow', async () => {
    const { getByText } = renderWithProvider(
      <MetaMetricsContext.Provider value={mockMetaMetricsContext}>
        <Welcome />
      </MetaMetricsContext.Provider>,
      mockStore,
    );

    fireEvent.click(getByText(messages.onboardingCreateWallet.message));

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith({
        category: MetaMetricsEventCategory.Onboarding,
        event: MetaMetricsEventName.WalletSetupStarted,
        properties: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          account_type: MetaMetricsEventAccountType.Default,
        },
      });
      expect(mockUseNavigate).toHaveBeenCalledWith(
        ONBOARDING_CREATE_PASSWORD_ROUTE,
      );
    });
  });

  it('starts the import wallet flow', async () => {
    const { getByText } = renderWithProvider(
      <MetaMetricsContext.Provider value={mockMetaMetricsContext}>
        <Welcome />
      </MetaMetricsContext.Provider>,
      mockStore,
    );

    fireEvent.click(getByText(messages.onboardingImportWallet.message));

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith({
        category: MetaMetricsEventCategory.Onboarding,
        event: MetaMetricsEventName.WalletImportStarted,
        properties: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          account_type: MetaMetricsEventAccountType.Imported,
        },
      });
      expect(mockUseNavigate).toHaveBeenCalledWith(
        ONBOARDING_IMPORT_WITH_SRP_ROUTE,
      );
    });
  });
});
