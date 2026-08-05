import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import configureStore from '../../../store/store';
import mockDefaultState from '../../../../test/data/mock-state.json';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';
import { enLocale as messages } from '../../../../test/lib/i18n-helpers';
import { AppHeaderUnlockedContent } from './app-header-unlocked-content';

jest.mock('../../../../shared/lib/trace', () => {
  const actual = jest.requireActual('../../../../shared/lib/trace');
  return {
    ...actual,
    trace: jest.fn(),
    endTrace: jest.fn(),
  };
});

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('AppHeaderUnlockedContent trace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls trace ShowAccountList when AccountPicker is clicked in multichain mode', async () => {
    const store = configureStore(mockDefaultState);
    const menuRef = { current: null } as React.RefObject<HTMLButtonElement>;
    renderWithProvider(
      <AppHeaderUnlockedContent
        disableAccountPicker={false}
        menuRef={menuRef}
      />,
      store,
    );

    const accountName = await screen.findByText('Account 1');
    fireEvent.click(accountName);

    const traceLib = jest.requireMock('../../../../shared/lib/trace');
    await waitFor(() => {
      expect(traceLib.trace).toHaveBeenCalledWith(
        expect.objectContaining({ name: traceLib.TraceName.ShowAccountList }),
      );
    });
    expect(mockNavigate).toHaveBeenCalledWith('/account-list');
  });

  it('shows the selected account address in the account picker', async () => {
    const store = configureStore(mockDefaultState);
    const menuRef = { current: null } as React.RefObject<HTMLButtonElement>;
    renderWithProvider(
      <AppHeaderUnlockedContent
        disableAccountPicker={false}
        menuRef={menuRef}
      />,
      store,
    );

    expect(await screen.findByText('0x0DCD5...3E7bc')).toBeInTheDocument();
  });

  it('shows the current network picker to the right of the menu button', () => {
    const store = configureStore(mockDefaultState);
    const menuRef = { current: null } as React.RefObject<HTMLButtonElement>;
    const networkOpenCallback = jest.fn();
    const currentNetwork = {
      chainId: '0xaa36a7',
      name: 'Sepolia',
      isEvm: true,
    } as never;

    renderWithProvider(
      <AppHeaderUnlockedContent
        currentNetwork={currentNetwork}
        networkIconSrc="./images/eth_logo.svg"
        networkOpenCallback={networkOpenCallback}
        disableNetworkPicker={false}
        disableAccountPicker={false}
        menuRef={menuRef}
      />,
      store,
    );

    const menuButton = screen.getByTestId('account-options-menu-button');
    const networkPicker = screen.getByTestId('network-display');
    const networkLogo = screen.getByRole('img', { name: 'Sepolia logo' });

    expect(menuButton.compareDocumentPosition(networkPicker)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(networkLogo).toHaveAttribute('src', './images/eth_logo.svg');

    fireEvent.click(networkPicker);
    expect(networkOpenCallback).toHaveBeenCalledTimes(1);
  });

  it('calls trace ShowAccountAddressList when View All button is clicked in address popover', async () => {
    const store = configureStore(mockDefaultState);
    const menuRef = { current: null } as React.RefObject<HTMLButtonElement>;
    renderWithProvider(
      <AppHeaderUnlockedContent
        disableAccountPicker={false}
        menuRef={menuRef}
      />,
      store,
    );

    const networksSubtitle = screen.getByTestId('networks-subtitle-test-id');
    // The hover handler is on the first child Box inside MultichainTriggeredAddressRowsList
    const hoverTarget = networksSubtitle.firstElementChild as HTMLElement;
    fireEvent.mouseEnter(hoverTarget);

    await waitFor(() => {
      expect(
        screen.getByTestId('multichain-address-rows-list'),
      ).toBeInTheDocument();
    });

    const viewAllButton = screen.getByText(
      messages.multichainAddressViewAll.message,
    );
    fireEvent.click(viewAllButton);

    const traceLib = jest.requireMock('../../../../shared/lib/trace');
    expect(traceLib.trace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: traceLib.TraceName.ShowAccountAddressList,
      }),
    );
  });
});

describe('Default address section', () => {
  it('renders the default address when feature flag and preference is on', async () => {
    const stateWithFlagOn = {
      ...mockDefaultState,
      metamask: {
        ...mockDefaultState.metamask,
        remoteFeatureFlags: { extensionUxDefaultAddressVersioned: true },
        preferences: {
          ...mockDefaultState.metamask.preferences,
          showDefaultAddress: true,
        },
      },
    };
    const store = configureStore(stateWithFlagOn);
    const menuRef = { current: null } as React.RefObject<HTMLButtonElement>;
    renderWithProvider(
      <AppHeaderUnlockedContent
        disableAccountPicker={false}
        menuRef={menuRef}
      />,
      store,
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId('default-address-container'),
      ).toBeInTheDocument();
    });
  });

  it('keeps the header address visible when preference is off', async () => {
    const stateWithPreferenceOff = {
      ...mockDefaultState,
      metamask: {
        ...mockDefaultState.metamask,
        remoteFeatureFlags: { extensionUxDefaultAddressVersioned: true },
        preferences: {
          ...mockDefaultState.metamask.preferences,
          showDefaultAddress: false,
        },
      },
    };
    const store = configureStore(stateWithPreferenceOff);
    const menuRef = { current: null } as React.RefObject<HTMLButtonElement>;
    renderWithProvider(
      <AppHeaderUnlockedContent
        disableAccountPicker={false}
        menuRef={menuRef}
      />,
      store,
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId('default-address-container'),
      ).toBeInTheDocument();
    });
  });
});
