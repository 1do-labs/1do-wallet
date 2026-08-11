import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Hex } from '@metamask/utils';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';
import { enLocale as messages } from '../../../../test/lib/i18n-helpers';
import baseMockState from '../../../../test/data/mock-state.json';
import configureStore from '../../../store/store';
import {
  useEIP7702Networks,
  EIP7702NetworkConfiguration,
} from '../../../pages/confirmations/hooks/useEIP7702Networks';
import { useEIP7702Account } from '../../../pages/confirmations/hooks/useEIP7702Account';
import { useBatchAuthorizationRequests } from '../../../pages/confirmations/hooks/useBatchAuthorizationRequests';
import { useOneDoSmartAccountStatus } from '../../../hooks/accounts/useOneDoSmartAccountStatus';
import ZENDESK_URLS from '../../../helpers/constants/zendesk-url';
import { SmartContractAccountToggleSection } from './smart-contract-account-toggle-section';

// Mock the hooks
jest.mock('../../../pages/confirmations/hooks/useEIP7702Networks');
jest.mock('../../../pages/confirmations/hooks/useEIP7702Account');
jest.mock('../../../pages/confirmations/hooks/useBatchAuthorizationRequests');
jest.mock('../../../hooks/accounts/useOneDoSmartAccountStatus');

// Mock global.platform.openTab
const mockOpenTab = jest.fn();
// @ts-expect-error mocking platform
global.platform = {
  openTab: mockOpenTab,
  closeCurrentWindow: jest.fn(),
};

const mockUseEIP7702Networks = useEIP7702Networks as jest.MockedFunction<
  typeof useEIP7702Networks
>;
const mockUseEIP7702Account = useEIP7702Account as jest.MockedFunction<
  typeof useEIP7702Account
>;
const mockUseBatchAuthorizationRequests =
  useBatchAuthorizationRequests as jest.MockedFunction<
    typeof useBatchAuthorizationRequests
  >;
const mockUseOneDoSmartAccountStatus =
  useOneDoSmartAccountStatus as jest.MockedFunction<
    typeof useOneDoSmartAccountStatus
  >;

// Mock functions for the toggle hooks
const mockDowngradeAccount = jest.fn();
const mockUpgradeAccount = jest.fn();
const mockIsUpgraded = jest.fn();
const mockGetDelegationAddress = jest.fn();
const mockGetRuntimeDeploymentStatus = jest.fn();

const mockAddress = '0x742d35Cc6634C0532925a3b8D4E8f3c9B26e6e6e';

const mockState = {
  ...baseMockState,
  appState: {
    ...baseMockState.appState,
    accountDetailsAddress: mockAddress,
  },
};

const mockNetworksData: EIP7702NetworkConfiguration[] = [
  {
    chainId: 'eip155:1' as const,
    chainIdHex: '0x1' as Hex,
    name: 'Ethereum Mainnet',
    isSupported: true,
    upgradeContractAddress: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B' as Hex,
    nativeCurrency: 'ETH',
    blockExplorerUrls: ['https://etherscan.io'],
    defaultBlockExplorerUrlIndex: 0,
    isEvm: true,
  },
  {
    chainId: 'eip155:11155111' as const,
    chainIdHex: '0xaa36a7' as Hex,
    name: 'Sepolia',
    isSupported: false,
    upgradeContractAddress: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B' as Hex,
    nativeCurrency: 'SepoliaETH',
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    defaultBlockExplorerUrlIndex: 0,
    isEvm: true,
  },
];

const render = (stateOverride = {}) => {
  const store = configureStore({
    ...mockState,
    ...stateOverride,
  });
  return renderWithProvider(
    <SmartContractAccountToggleSection address={mockAddress} />,
    store,
  );
};

describe('SmartContractAccountToggleSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the hooks used by SmartContractAccountToggle
    mockUseEIP7702Account.mockReturnValue({
      isUpgraded: mockIsUpgraded,
      getDelegationAddress: mockGetDelegationAddress,
      getRuntimeDeploymentStatus: mockGetRuntimeDeploymentStatus,
      downgradeAccount: mockDowngradeAccount,
      upgradeAccount: mockUpgradeAccount,
    });

    mockUseBatchAuthorizationRequests.mockReturnValue({
      hasPendingRequests: false,
    });

    mockUseOneDoSmartAccountStatus.mockReturnValue({
      isActive: false,
      isChecking: false,
      hasError: false,
      pendingUpgradeTransaction: undefined,
      refresh: jest.fn().mockResolvedValue(false),
      setActive: jest.fn(),
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner while fetching networks', () => {
      mockUseEIP7702Networks.mockReturnValue({
        network7702List: [],
        networkSupporting7702Present: false,
        pending: true,
      });

      const { container } = render();

      expect(screen.getByTestId('network-loader')).toBeInTheDocument();
      expect(
        screen.getByText(messages.enableSmartContractAccount.message),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          messages.enableSmartContractAccountDescription.message,
        ),
      ).toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });

    it('renders preloader element during loading', () => {
      mockUseEIP7702Networks.mockReturnValue({
        network7702List: [],
        networkSupporting7702Present: false,
        pending: true,
      });

      const { container } = render();

      const preloader = container.querySelector('.preloader__icon');
      expect(preloader).toBeInTheDocument();
    });
  });

  describe('Network Integration', () => {
    it('displays toggle for each available network', () => {
      mockUseEIP7702Networks.mockReturnValue({
        network7702List: mockNetworksData,
        networkSupporting7702Present: true,
        pending: false,
      });

      const { container } = render();

      expect(screen.getByText('Ethereum Mainnet')).toBeInTheDocument();
      expect(screen.getByText('Sepolia')).toBeInTheDocument();
      // Check that the network toggles and Runtime upgrade action are rendered.
      expect(screen.getAllByRole('checkbox')).toHaveLength(2);
      expect(screen.getAllByRole('button')).toHaveLength(2);
      expect(screen.getByTestId('smart-account-upgrade-button')).toBeDisabled();
      expect(container).toMatchSnapshot();
    });

    it('clicking toggle calls correct account function', async () => {
      mockUseEIP7702Networks.mockReturnValue({
        network7702List: mockNetworksData,
        networkSupporting7702Present: true,
        pending: false,
      });

      render();

      // Find all toggle checkboxes
      const toggleCheckboxes = screen.getAllByRole('checkbox');

      expect(toggleCheckboxes).toHaveLength(2);

      // Click first toggle (Ethereum Mainnet - supported, should downgrade)
      fireEvent.click(toggleCheckboxes[0]);

      await waitFor(() => {
        expect(mockDowngradeAccount).toHaveBeenCalledWith(mockAddress);
      });
    });
  });

  describe('Learn More Button', () => {
    it('opens Zendesk article when clicked', () => {
      mockUseEIP7702Networks.mockReturnValue({
        network7702List: [],
        networkSupporting7702Present: false,
        pending: false,
      });

      const { container } = render();

      const learnMoreButton = screen.getByText(
        messages.learnMoreUpperCase.message,
      );
      fireEvent.click(learnMoreButton);

      expect(mockOpenTab).toHaveBeenCalledWith({
        url: ZENDESK_URLS.ACCOUNT_UPGRADE,
      });
      expect(container).toMatchSnapshot();
    });
  });

  describe('Disabled State Handling', () => {
    it('disables all toggles when requests are pending', () => {
      mockUseBatchAuthorizationRequests.mockReturnValue({
        hasPendingRequests: true,
      });

      mockUseEIP7702Networks.mockReturnValue({
        network7702List: mockNetworksData,
        networkSupporting7702Present: true,
        pending: false,
      });

      const { container } = render();

      const toggleCheckboxes = screen.getAllByRole('checkbox');

      toggleCheckboxes.forEach((checkbox) => {
        expect(checkbox.closest('.toggle-button')).toHaveClass(
          'toggle-button--disabled',
        );
      });
      expect(container).toMatchSnapshot();
    });
  });
});
