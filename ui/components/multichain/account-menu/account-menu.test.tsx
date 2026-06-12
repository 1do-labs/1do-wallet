/* eslint-disable jest/require-top-level-describe */
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { merge } from 'lodash';
import { KeyringTypes } from '@metamask/keyring-controller';
import configureStore from '../../../store/store';
import mockState from '../../../../test/data/mock-state.json';
import { enLocale as messages } from '../../../../test/lib/i18n-helpers';
import {
  CONNECT_HARDWARE_ROUTE,
  IMPORT_SRP_ROUTE,
} from '../../../helpers/constants/routes';
import { createMockInternalAccount } from '../../../../test/jest/mocks';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';
import { AccountMenu } from '.';

const mockOnClose = jest.fn();
const mockGetEnvironmentType = jest.fn();
const mockGenerateNewHdKeyring = jest.fn();
const mockDetectNfts = jest.fn();

jest.mock('../../../../app/scripts/lib/util', () => ({
  ...jest.requireActual('../../../../app/scripts/lib/util'),
  getEnvironmentType: () => () => mockGetEnvironmentType(),
}));

jest.mock('../../../store/actions', () => {
  return {
    ...jest.requireActual('../../../store/actions'),
    generateNewHdKeyring: () => mockGenerateNewHdKeyring(),
    detectNfts: () => mockDetectNfts,
  };
});

const mockUseNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  return {
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockUseNavigate,
  };
});

const render = (
  state = {},
  props: {
    onClose: () => void;
  } = {
    onClose: () => jest.fn(),
  },
  location: string = '/',
) => {
  const defaultState = {
    ...mockState,
    metamask: {
      ...mockState.metamask,
      remoteFeatureFlags: {},
      permissionHistory: {
        'https://test.dapp': {
          // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
          // eslint-disable-next-line @typescript-eslint/naming-convention
          eth_accounts: {
            accounts: {
              '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc': 1596681857076,
            },
          },
        },
      },
      subjects: {
        'https://test.dapp': {
          permissions: {
            'endowment:caip25': {
              caveats: [
                {
                  type: 'authorizedScopes',
                  value: {
                    requiredScopes: {},
                    optionalScopes: {
                      'eip155:1': {
                        accounts: [
                          'eip155:1:0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
                        ],
                      },
                    },
                    isMultichainOrigin: false,
                  },
                },
              ],
              invoker: 'https://test.dapp',
              parentCapability: 'endowment:caip25',
            },
          },
        },
      },
    },
    activeTab: {
      id: 113,
      title: 'E2E Test Dapp',
      origin: 'https://metamask.github.io',
      protocol: 'https:',
      url: 'https://metamask.github.io/test-dapp/',
    },
    unconnectedAccount: {
      state: 'OPEN',
    },
  };
  const store = configureStore(merge({}, defaultState, state));
  return renderWithProvider(<AccountMenu {...props} />, store, location);
};

describe('AccountMenu', () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  it('displays important controls', () => {
    const { getByText } = render();

    expect(getByText(messages.addAccountOrWallet.message)).toBeInTheDocument();
    expect(document.querySelector('[aria-label="Back"]')).toStrictEqual(null);
  });

  it('add / Import / Hardware button functions as it should', () => {
    const { getByText, getAllByTestId, getByLabelText } = render();

    // Ensure the button is displaying
    const button = getAllByTestId(
      'multichain-account-menu-popover-action-button',
    );
    expect(button).toHaveLength(1);

    // Click the button to ensure the options and close button display
    button[0].click();
    expect(
      getByText(messages.addNewEthereumAccountLabel.message),
    ).toBeInTheDocument();
    expect(getByText(messages.importPrivateKey.message)).toBeInTheDocument();
    expect(
      getByText(messages.addHardwareWalletLabel.message),
    ).toBeInTheDocument();
    const header = document.querySelector('header') as Element;
    expect(header.innerHTML).toContain(messages.addAccount.message);
    expect(
      document.querySelector('button[aria-label="Close"]'),
    ).toBeInTheDocument();

    const backButton = getByLabelText(messages.back.message);
    expect(backButton).toBeInTheDocument();
    backButton.click();

    expect(getByText(messages.accounts.message)).toBeInTheDocument();
  });

  it('shows the account creation UI when Add Account is clicked', () => {
    const { getByText, getByTestId } = render();

    const button = getByTestId('multichain-account-menu-popover-action-button');
    button.click();

    fireEvent.click(getByText(messages.addNewEthereumAccountLabel.message));
    const header = document.querySelector('header') as Element;
    expect(header.innerHTML).toContain(
      messages.addAccountFromNetwork.message.replace(
        '$1',
        messages.networkNameEthereum.message,
      ),
    );
    const addAccountButton = document.querySelector(
      '[data-testid="submit-add-account-with-name"]',
    );
    expect(addAccountButton).toBeInTheDocument();
    expect(getByText(messages.cancel.message)).toBeInTheDocument();

    fireEvent.click(getByText(messages.cancel.message));
    expect(getByText(messages.addAccountOrWallet.message)).toBeInTheDocument();
  });

  it('shows the account import UI when Import Private Key is clicked', () => {
    const { getByText, getByTestId } = render();

    const button = getByTestId('multichain-account-menu-popover-action-button');
    button.click();

    fireEvent.click(getByText(messages.importPrivateKey.message));
    expect(getByText(messages.import.message)).toBeInTheDocument();
    expect(getByText(messages.cancel.message)).toBeInTheDocument();

    fireEvent.click(getByText(messages.cancel.message));
    expect(getByText(messages.addAccountOrWallet.message)).toBeInTheDocument();
  });

  it('navigates to hardware wallet connection screen when clicked', () => {
    const { getByText, getByTestId } = render();

    const button = getByTestId('multichain-account-menu-popover-action-button');
    button.click();

    fireEvent.click(getByText(messages.addHardwareWalletLabel.message));
    expect(mockUseNavigate).toHaveBeenCalledWith(CONNECT_HARDWARE_ROUTE);
  });

  describe('Multi Srp', () => {
    it('redirects to import srp component', () => {
      const { getByTestId } = render();

      const button = getByTestId(
        'multichain-account-menu-popover-action-button',
      );
      button.click();

      const addAccountButton = getByTestId(
        'multichain-account-menu-popover-import-srp',
      );
      addAccountButton.click();

      expect(mockUseNavigate).toHaveBeenCalledWith(IMPORT_SRP_ROUTE);
    });

    it('shows srp list if there are multiple srps when adding a new account', async () => {
      const accountInSecondSrp = createMockInternalAccount({
        address: '0xb1baf6a2f4a808937bb97a2f12ccf08f1233e3d9',
        name: 'Account in second Srp',
      });
      const secondHdKeyring = {
        accounts: [accountInSecondSrp.address],
        type: KeyringTypes.hd,
        metadata: {
          id: '01JN2RD391JM4K7Q5T4RP3JXMA',
          name: '',
        },
      };

      const { getByTestId } = render({
        metamask: {
          ...mockState.metamask,
          accounts: {
            [accountInSecondSrp.address]: {
              address: accountInSecondSrp.address,
              balance: '0x0',
            },
          },
          keyrings: [...mockState.metamask.keyrings, secondHdKeyring],
          internalAccounts: {
            ...mockState.metamask.internalAccounts,
            accounts: {
              ...mockState.metamask.internalAccounts.accounts,
              [accountInSecondSrp.id]: accountInSecondSrp,
            },
            selectedAccount: accountInSecondSrp.id,
          },
        },
      });

      const button = getByTestId(
        'multichain-account-menu-popover-action-button',
      );
      await button.click();

      const addAccountButton = getByTestId(
        'multichain-account-menu-popover-add-account',
      );
      await addAccountButton.click();

      expect(getByTestId('select-srp-container')).toBeInTheDocument();
    });
  });
});
