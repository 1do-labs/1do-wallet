import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import configureStore from '../../../store/store';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';
import { CONFIRM_TRANSACTION_ROUTE } from '../../../helpers/constants/routes';
import { SmartAccountHeaderButton } from './smart-account-header-button';

const MOCK_ADDRESS = '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc';
const MOCK_CHAIN_ID = '0xaa36a7';

const mockNavigate = jest.fn();
const mockUpgradeAccount = jest.fn();
const mockRefreshSmartAccountStatus = jest.fn();
const mockSetSmartAccountActive = jest.fn();
const mockUseOneDoSmartAccountStatus = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../pages/confirmations/hooks/useEIP7702Account', () => ({
  useEIP7702Account: () => ({
    upgradeAccount: mockUpgradeAccount,
  }),
}));

jest.mock('../../../hooks/accounts/useOneDoSmartAccountStatus', () => ({
  ONE_DO_7702_DELEGATE: '0x69d2927735c3E57c512177B32e216431B1Aba1fF',
  useOneDoSmartAccountStatus: () => mockUseOneDoSmartAccountStatus(),
}));

function renderComponent() {
  const store = configureStore({
    metamask: {
      selectedNetworkClientId: 'sepolia',
      networkConfigurationsByChainId: {
        [MOCK_CHAIN_ID]: {
          chainId: MOCK_CHAIN_ID,
          name: 'Sepolia',
          nativeCurrency: 'ETH',
          defaultRpcEndpointIndex: 0,
          rpcEndpoints: [
            {
              type: 'custom',
              url: 'https://sepolia.example',
              networkClientId: 'sepolia',
            },
          ],
          blockExplorerUrls: [],
        },
      },
      internalAccounts: {
        accounts: {
          selected: {
            address: MOCK_ADDRESS,
            id: 'selected',
            metadata: {
              keyring: {
                type: 'HD Key Tree',
              },
            },
          },
        },
        selectedAccount: 'selected',
      },
    },
  });

  return renderWithProvider(<SmartAccountHeaderButton />, store);
}

describe('SmartAccountHeaderButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOneDoSmartAccountStatus.mockReturnValue({
      isActive: false,
      pendingUpgradeTransaction: undefined,
      refresh: mockRefreshSmartAccountStatus,
      setActive: mockSetSmartAccountActive,
    });
    mockRefreshSmartAccountStatus.mockResolvedValue(false);
  });

  it('renders the active 1Do logo when the current chain smart account is active', () => {
    mockUseOneDoSmartAccountStatus.mockReturnValue({
      isActive: true,
      pendingUpgradeTransaction: undefined,
      refresh: mockRefreshSmartAccountStatus,
      setActive: mockSetSmartAccountActive,
    });

    renderComponent();

    expect(
      screen.getByLabelText('Smart account active on this network'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Smart')).not.toBeInTheDocument();
  });

  it('navigates to the pending upgrade transaction instead of starting a new upgrade', () => {
    mockUseOneDoSmartAccountStatus.mockReturnValue({
      isActive: false,
      pendingUpgradeTransaction: { id: 'pending-upgrade' },
      refresh: mockRefreshSmartAccountStatus,
      setActive: mockSetSmartAccountActive,
    });

    renderComponent();

    fireEvent.click(screen.getByTestId('smart-account-header-button'));

    expect(mockNavigate).toHaveBeenCalledWith(
      `${CONFIRM_TRANSACTION_ROUTE}/pending-upgrade`,
    );
    expect(mockUpgradeAccount).not.toHaveBeenCalled();
  });

  it('does not start an upgrade when the account is already active', () => {
    mockUseOneDoSmartAccountStatus.mockReturnValue({
      isActive: true,
      pendingUpgradeTransaction: undefined,
      refresh: mockRefreshSmartAccountStatus,
      setActive: mockSetSmartAccountActive,
    });

    renderComponent();

    fireEvent.click(screen.getByTestId('smart-account-header-button'));

    expect(mockUpgradeAccount).not.toHaveBeenCalled();
  });
});
