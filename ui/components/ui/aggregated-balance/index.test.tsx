import React from 'react';
import configureMockStore from 'redux-mock-store';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import thunk from 'redux-thunk';
import { EthAccountType, EthMethod, EthScope } from '@metamask/keyring-api';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';
import mockState from '../../../../test/data/mock-state.json';
import { mockNetworkState } from '../../../../test/stub/networks';
import { AggregatedBalance } from './aggregated-balance';

const mockDispatch = jest.fn().mockReturnValue(() => jest.fn());
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

const mockNativeAssetId = 'eip155:1/slip44:60';
const mockNativeBalance = '1';

const mockEvmAccount = {
  address: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
  id: '542490c8-d178-433b-9f31-f680b11f45a5',
  scopes: [EthScope.Eoa],
  metadata: {
    name: 'Account 1',
    keyring: {
      type: 'HD Key Tree',
    },
  },
  options: {},
  methods: [EthMethod.PersonalSign],
  type: EthAccountType.Eoa,
};

const mockMetamaskStore = {
  ...mockState.metamask,
  ...mockNetworkState({
    chainId: '0x1',
    ticker: 'ETH',
    blockExplorerUrl: 'https://etherscan.io',
  }),
  completedOnboarding: true,
  internalAccounts: {
    selectedAccount: mockEvmAccount.id,
    accounts: {
      [mockEvmAccount.id]: mockEvmAccount,
    },
  },
  accountIdByAddress: {
    [mockEvmAccount.address]: mockEvmAccount.id,
  },
  preferences: {
    showNativeTokenAsMainBalance: false,
    tokenNetworkFilter: {},
    privacyMode: false,
  },
  accountsAssets: {
    [mockEvmAccount.id]: [mockNativeAssetId],
  },
  enabledNetworkMap: {
    eip155: {
      '0x1': true,
    },
  },
  balances: {
    [mockEvmAccount.id]: {
      [mockNativeAssetId]: {
        amount: mockNativeBalance,
        unit: 'ETH',
      },
    },
  },
  fiatCurrency: 'usd',
  conversionRates: {
    [mockNativeAssetId]: {
      rate: '1.000',
      conversionDate: 0,
    },
  },
};

function getStore(state?: Record<string, unknown>) {
  return configureMockStore([thunk])({
    metamask: mockMetamaskStore,
    localeMessages: {
      currentLocale: 'en',
    },
    ...state,
  });
}

describe('AggregatedBalance Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a skeleton when balances are missing', () => {
    const testStore = getStore({
      metamask: {
        ...mockMetamaskStore,
        accountsAssets: {
          [mockEvmAccount.id]: [],
        },
      },
    });
    const { container } = renderWithProvider(
      <AggregatedBalance
        classPrefix="test"
        balanceIsCached={false}
        handleSensitiveToggle={jest.fn()}
      />,
      testStore,
    );

    const skeleton = container.querySelector('.mm-skeleton');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders fiat balance when showNativeTokenAsMainBalance is false', () => {
    renderWithProvider(
      <AggregatedBalance
        classPrefix="test"
        balanceIsCached={false}
        handleSensitiveToggle={jest.fn()}
      />,
      getStore(),
    );

    expect(screen.getByTestId('account-value-and-suffix')).toHaveTextContent(
      '$1.00',
    );
    expect(screen.getByText('USD')).toBeInTheDocument();
  });

  it('renders 0 fiat balance when showNativeTokenAsMainBalance is false, and balance is 0', () => {
    renderWithProvider(
      <AggregatedBalance
        classPrefix="test"
        balanceIsCached={false}
        handleSensitiveToggle={jest.fn()}
      />,
      getStore({
        metamask: {
          ...mockMetamaskStore,
          balances: {
            [mockEvmAccount.id]: {
              [mockNativeAssetId]: {
                amount: 0,
                unit: 'ETH',
              },
            },
          },
        },
      }),
    );

    expect(screen.getByTestId('account-value-and-suffix')).toHaveTextContent(
      '$0.00',
    );
    expect(screen.getByText('USD')).toBeInTheDocument();
  });

  it('renders token balance when showNativeTokenAsMainBalance is true, up to 5 decimal places with no trailing zero', () => {
    renderWithProvider(
      <AggregatedBalance
        classPrefix="test"
        balanceIsCached={false}
        handleSensitiveToggle={jest.fn()}
      />,
      getStore({
        metamask: {
          ...mockMetamaskStore,
          preferences: {
            showNativeTokenAsMainBalance: true,
          },
        },
      }),
    );

    expect(screen.getByTestId('account-value-and-suffix')).toHaveTextContent(
      '1',
    );
    expect(screen.getByText('ETH')).toBeInTheDocument();
  });

  it('renders 0 native balance when showNativeTokenAsMainBalance is true, and balance is 0', () => {
    renderWithProvider(
      <AggregatedBalance
        classPrefix="test"
        balanceIsCached={false}
        handleSensitiveToggle={jest.fn()}
      />,
      getStore({
        metamask: {
          ...mockMetamaskStore,
          preferences: {
            showNativeTokenAsMainBalance: true,
          },
          balances: {
            [mockEvmAccount.id]: {
              [mockNativeAssetId]: {
                amount: 0,
                unit: 'ETH',
              },
            },
          },
        },
      }),
    );

    expect(screen.getByTestId('account-value-and-suffix')).toHaveTextContent(
      '0',
    );
    expect(screen.getByText('ETH')).toBeInTheDocument();
  });

  it('renders token balance when rates are not available', () => {
    renderWithProvider(
      <AggregatedBalance
        classPrefix="test"
        balanceIsCached={false}
        handleSensitiveToggle={jest.fn()}
      />,
      getStore({
        metamask: {
          ...mockMetamaskStore,
          preferences: {
            showNativeTokenAsMainBalance: false,
          },
          conversionRates: {},
        },
      }),
    );

    expect(screen.getByTestId('account-value-and-suffix')).toHaveTextContent(
      '1',
    );
    expect(screen.getByText('ETH')).toBeInTheDocument();
  });

  it('renders token balance when setting prices is disabled', () => {
    renderWithProvider(
      <AggregatedBalance
        classPrefix="test"
        balanceIsCached={false}
        handleSensitiveToggle={jest.fn()}
      />,
      getStore({
        metamask: {
          ...mockMetamaskStore,
          useCurrencyRateCheck: false,
          preferences: {
            showNativeTokenAsMainBalance: false,
          },
          conversionRates: {
            [mockNativeAssetId]: {
              rate: '1.000',
              conversionDate: 0,
            },
          },
        },
      }),
    );

    expect(screen.getByTestId('account-value-and-suffix')).toHaveTextContent(
      '1',
    );
    expect(screen.getByText('ETH')).toBeInTheDocument();
  });
});
