import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { setBackgroundConnection } from '../../../store/background-connection';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';
import { CHAIN_IDS } from '../../../../shared/constants/network';
import { SHOW_BASIC_FUNCTIONALITY_MODAL_OPEN } from '../../../store/actionConstants';
import { mockNetworkState } from '../../../../test/stub/networks';
import PrivacySettings from './privacy-settings';

const mockOpenBasicFunctionalityModal = jest.fn(() => ({
  type: SHOW_BASIC_FUNCTIONALITY_MODAL_OPEN,
}));

jest.mock('../../../ducks/app/app.ts', () => ({
  onboardingToggleBasicFunctionalityOn: () => ({ type: 'MOCK_ENABLE' }),
  openBasicFunctionalityModal: () => mockOpenBasicFunctionalityModal(),
}));

describe('Privacy Settings Onboarding View', () => {
  const setUseTokenDetection = jest.fn().mockResolvedValue(undefined);
  const setUseMultiAccountBalanceChecker = jest
    .fn()
    .mockResolvedValue(undefined);
  const setUseTransactionSimulations = jest.fn().mockResolvedValue(undefined);
  const setUseExternalNameSources = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    setBackgroundConnection({
      setUseTokenDetection,
      setUseMultiAccountBalanceChecker,
      setUseTransactionSimulations,
      setUseExternalNameSources,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it('shows categories for network services, asset data, and address information', () => {
    renderWithProvider(<PrivacySettings />, createStore());

    expect(screen.getByText('Network and data services')).toBeInTheDocument();
    expect(screen.getByText('Assets and simulations')).toBeInTheDocument();
    expect(screen.getByText('Address information')).toBeInTheDocument();
    expect(screen.queryByText('Security')).not.toBeInTheDocument();
  });

  it('saves the privacy choices exposed during onboarding', () => {
    const { container } = renderWithProvider(
      <PrivacySettings />,
      createStore(),
    );

    fireEvent.click(
      screen.getByTestId('category-item-Network and data services'),
    );
    fireEvent.click(container.querySelectorAll('input[type=checkbox]')[0]);
    expect(mockOpenBasicFunctionalityModal).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('category-item-Assets and simulations'));
    let toggles = container.querySelectorAll('input[type=checkbox]');
    fireEvent.click(toggles[0]);
    fireEvent.click(toggles[1]);
    fireEvent.click(toggles[2]);

    fireEvent.click(screen.getByTestId('category-item-Address information'));
    toggles = container.querySelectorAll('input[type=checkbox]');
    fireEvent.click(toggles[0]);

    fireEvent.click(screen.getByTestId('privacy-settings-back-button'));

    expect(setUseTokenDetection).toHaveBeenCalledWith(true);
    expect(setUseTransactionSimulations).toHaveBeenCalledWith(false);
    expect(setUseMultiAccountBalanceChecker).toHaveBeenCalledWith(false);
    expect(setUseExternalNameSources).toHaveBeenCalledWith(false);
  });

  it('does not expose advanced IPFS, ENS, price, or 4byte settings', () => {
    const { container } = renderWithProvider(
      <PrivacySettings />,
      createStore(),
    );

    fireEvent.click(screen.getByTestId('category-item-Assets and simulations'));

    expect(screen.queryByTestId('ipfs-input')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('currency-rate-check-toggle'),
    ).not.toBeInTheDocument();
    expect(container.textContent).not.toContain('Show ENS domains');
    expect(container.textContent).not.toContain('Decode smart contracts');
  });
});

function createStore() {
  return configureMockStore([thunk])({
    metamask: {
      ...mockNetworkState(
        { chainId: CHAIN_IDS.MAINNET },
        { chainId: CHAIN_IDS.BASE },
        { chainId: CHAIN_IDS.SEPOLIA },
      ),
      useTokenDetection: false,
      useMultiAccountBalanceChecker: true,
      useTransactionSimulations: true,
      useExternalNameSources: true,
      useExternalServices: true,
    },
    appState: {
      externalServicesOnboardingToggleState: true,
    },
  });
}
