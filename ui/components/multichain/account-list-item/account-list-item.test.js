/* eslint-disable jest/require-top-level-describe */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { merge } from 'lodash';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';
import configureStore from '../../../store/store';
import mockState from '../../../../test/data/mock-state.json';
import { shortenAddress } from '../../../helpers/utils/util';
import { toChecksumHexAddress } from '../../../../shared/lib/hexstring-utils';
import {
  SEPOLIA_DISPLAY_NAME,
  CHAIN_IDS,
} from '../../../../shared/constants/network';
import { mockNetworkState } from '../../../../test/stub/networks';
import { AccountListItem, AccountListItemMenuTypes } from '.';

const mockAccount = {
  ...mockState.metamask.internalAccounts.accounts[
    'cf8dace4-9439-4bd4-b3a8-88c821c8fcb3'
  ],
  balance: '0x152387ad22c3f0',
};

const DEFAULT_PROPS = {
  account: mockAccount,
  selected: false,
  onClick: jest.fn(),
};

const render = (props = {}, state = {}) => {
  const defaultState = {
    metamask: {
      ...mockState.metamask,
      completedOnboarding: true,
      internalAccounts: {
        accounts: {
          ...mockState.metamask.internalAccounts.accounts,
          [mockAccount.id]: mockAccount,
        },
        selectedAccount: mockAccount.id,
      },
    },
    activeTab: {
      id: 113,
      title: 'E2E Test Dapp',
      origin: 'https://metamask.github.io',
      protocol: 'https:',
      url: 'https://metamask.github.io/test-dapp/',
    },
  };

  const store = configureStore(merge(defaultState, state));
  const allProps = { ...DEFAULT_PROPS, ...props };
  return renderWithProvider(<AccountListItem {...allProps} />, store);
};

describe('AccountListItem', () => {
  it('renders AccountListItem component and shows account name, address, and balance', () => {
    const { container } = render();
    expect(screen.getByText(mockAccount.metadata.name)).toBeInTheDocument();
    expect(
      screen.getByText(
        shortenAddress(toChecksumHexAddress(mockAccount.address)),
      ),
    ).toBeInTheDocument();
    expect(document.querySelector('[title="0.006 ETH"]')).toBeInTheDocument();
    expect(screen.getByTestId('account-network-indicator')).toBeInTheDocument();

    expect(container).toMatchSnapshot('evm-account-list-item');
  });

  it('renders selected block when account is selected', () => {
    render({ selected: true });
    expect(
      document.querySelector('.multichain-account-list-item--selected'),
    ).toBeInTheDocument();
  });

  it('renders the account name tooltip for long names', () => {
    render({
      selected: true,
      account: {
        ...mockAccount,
        metadata: {
          ...mockAccount.metadata,
          name: 'This is a super long name that requires tooltip',
        },
      },
    });
    expect(
      document.querySelector('.multichain-account-list-item__tooltip'),
    ).toBeInTheDocument();
  });

  it('renders the three-dot menu to launch the details menu', () => {
    render({ menuType: AccountListItemMenuTypes.Account });
    const optionsButton = document.querySelector(
      '[aria-label="Test Account Options"]',
    );
    expect(optionsButton).toBeInTheDocument();
    fireEvent.click(optionsButton);
    expect(
      document.querySelector('.multichain-account-list-item-menu__popover'),
    ).toBeInTheDocument();
  });

  it('executes the action when the item is clicked', () => {
    const onClick = jest.fn();
    render({ onClick });
    const item = document.querySelector('.multichain-account-list-item');
    fireEvent.click(item);
    expect(onClick).toHaveBeenCalled();
  });

  it('clicking the three-dot menu opens up options', () => {
    const onClick = jest.fn();
    render({ onClick, menuType: AccountListItemMenuTypes.Account });
    const item = document.querySelector(
      '[data-testid="account-list-item-menu-button"]',
    );
    fireEvent.click(item);
    expect(
      document.querySelector('[data-testid="account-list-menu-open-explorer"]'),
    ).toBeInTheDocument();
  });

  it('does not render a tag for a null label', () => {
    const { container } = render({
      account: {
        ...mockAccount,
        label: null,
      },
    });
    expect(container.querySelector('.mm-tag')).not.toBeInTheDocument();
  });

  describe('Multichain Behaviour', () => {
    describe('currency display', () => {
      it('renders fiat for EVM account', () => {
        const { container } = render(
          {
            account: mockAccount,
          },
          {
            metamask: {
              ...mockNetworkState({
                chainId: CHAIN_IDS.SEPOLIA,
                nickname: SEPOLIA_DISPLAY_NAME,
                ticker: 'ETH',
              }),
              preferences: {
                showFiatInTestnets: true,
              },
            },
          },
        );

        const firstCurrencyDisplay = container.querySelector(
          '[data-testid="first-currency-display"]',
        );

        const expectedBalance = '$3.31';

        expect(firstCurrencyDisplay).toBeInTheDocument();
        expect(firstCurrencyDisplay.firstChild.textContent).toContain(
          expectedBalance,
        );
      });

    });
  });
  describe('Account labels', () => {
    it('renders the SRP pill for account when multi SRP are present in state', () => {
      const { container } = render(
        {
          account: {
            ...mockAccount,
            metadata: {
              ...mockAccount.metadata,
              keyring: {
                type: 'HD Key Tree',
              },
            },
            balance: '0x0',
          },
        },
        {
          metamask: {
            keyrings: [
              {
                type: 'HD Key Tree',
                accounts: ['0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc'],
                metadata: {
                  id: '01JKAF3DSGM3AB87EM9N0K41AJ',
                  name: '',
                },
              },
              {
                type: 'HD Key Tree',
                accounts: ['0xec1adf982415d2ef5ec55899b9bfb8bc0f29251b'],
                metadata: {
                  id: '01JKAF3DSGM3AB87EM9N0K41AJ',
                  name: '',
                },
              },
            ],
          },
        },
      );

      const tag = container.querySelector('.mm-tag');
      expect(tag.textContent).toBe('SRP #1');
    });

    it('does not render the any account label when explicitly disabled', () => {
      const { container } = render(
        {
          showAccountLabels: false,
          account: {
            ...mockAccount,
            metadata: {
              ...mockAccount.metadata,
              keyring: {
                type: 'HD Key Tree',
              },
            },
            balance: '0x0',
          },
        },
        {
          metamask: {
            keyrings: [
              {
                type: 'HD Key Tree',
                accounts: ['0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc'],
                metadata: {
                  id: '01JKAF3DSGM3AB87EM9N0K41AJ',
                  name: '',
                },
              },
              {
                type: 'HD Key Tree',
                accounts: ['0xec1adf982415d2ef5ec55899b9bfb8bc0f29251b'],
                metadata: {
                  id: '01JKAF3DSGM3AB87EM9N0K41AJ',
                  name: '',
                },
              },
            ],
          },
        },
      );

      expect(container.querySelector('.mm-tag')).not.toBeInTheDocument();
    });
  });
});
