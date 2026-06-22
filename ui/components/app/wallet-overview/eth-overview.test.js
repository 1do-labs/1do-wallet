import React from 'react';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { fireEvent } from '@testing-library/react';
import { EthAccountType, EthMethod } from '@metamask/keyring-api';
import { AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS } from '@metamask/multichain-network-controller';
import { CHAIN_IDS } from '../../../../shared/constants/network';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';
import { KeyringType } from '../../../../shared/constants/keyring';
import { useIsOriginalNativeTokenSymbol } from '../../../hooks/useIsOriginalNativeTokenSymbol';
import useMultiPolling from '../../../hooks/useMultiPolling';
import { ETH_EOA_METHODS } from '../../../../shared/constants/eth-methods';
import { getIntlLocale } from '../../../ducks/locale/locale';
import { mockNetworkState } from '../../../../test/stub/networks';
import { MetaMetricsContext } from '../../../contexts/metametrics';
import {
  MetaMetricsEventCategory,
  MetaMetricsEventName,
} from '../../../../shared/constants/metametrics';
import EthOverview from './eth-overview';

// TODO: Remove this mock when multichain accounts feature flag is entirely removed.
// TODO: Convert any old tests (UI/UX state 1) to its state 2 equivalent (if possible).
jest.mock(
  '../../../../shared/lib/multichain-accounts/remote-feature-flag',
  () => ({
    ...jest.requireActual(
      '../../../../shared/lib/multichain-accounts/remote-feature-flag',
    ),
    isMultichainAccountsFeatureEnabled: () => false,
  }),
);

jest.mock('../../../hooks/useIsOriginalNativeTokenSymbol', () => {
  return {
    useIsOriginalNativeTokenSymbol: jest.fn(),
  };
});

jest.mock('../../../ducks/locale/locale', () => ({
  ...jest.requireActual('../../../ducks/locale/locale'),
  getIntlLocale: jest.fn(),
}));

jest.mock('../../../store/actions', () => ({
  startNewDraftTransaction: jest.fn(),
  tokenBalancesStartPolling: jest.fn().mockResolvedValue('pollingToken'),
  tokenBalancesStopPollingByPollingToken: jest.fn(),
}));

jest.mock('../../../hooks/useMultiPolling', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockGetIntlLocale = getIntlLocale;

let openTabSpy;

describe('EthOverview', () => {
  useIsOriginalNativeTokenSymbol.mockReturnValue(true);
  mockGetIntlLocale.mockReturnValue('en-US');

  const mockEvmAccount1 = {
    address: '0x1',
    id: 'cf8dace4-9439-4bd4-b3a8-88c821c8fcb3',
    metadata: {
      name: 'Account 1',
      keyring: {
        type: KeyringType.imported,
      },
    },
    options: {},
    methods: ETH_EOA_METHODS,
    type: EthAccountType.Eoa,
    scopes: ['eip155:0'],
  };

  const mockEvmAccount2 = {
    address: '0x2',
    id: 'e9b992f9-e151-4317-b8b7-c771bb73dd02',
    metadata: {
      name: 'Account 2',
      keyring: {
        type: KeyringType.imported,
      },
    },
    options: {},
    methods: ETH_EOA_METHODS,
    type: EthAccountType.Eoa,
    scopes: ['eip155:0'],
  };

  const mockStore = {
    appState: {
      confirmationExchangeRates: {},
    },
    localeMessages: {
      currentLocale: 'en-US',
    },
    metamask: {
      ...mockNetworkState({ chainId: CHAIN_IDS.MAINNET }),
      selectedAccountGroup: 'entropy:wallet1/group1',
      accountTree: {
        wallets: {
          'entropy:wallet1': {
            id: 'entropy:wallet1',
            groups: {
              'entropy:wallet1/group1': {
                id: 'entropy:wallet1/group1',
                type: 'multichain-account',
                accounts: [mockEvmAccount1.id],
                metadata: {
                  name: 'Account 1',
                  hidden: false,
                  pinned: false,
                  lastSelected: 0,
                },
              },
            },
          },
        },
      },
      tokenBalances: {
        [CHAIN_IDS.MAINNET]: {},
      },
      remoteFeatureFlags: {},
      accountsByChainId: {
        [CHAIN_IDS.MAINNET]: {
          '0x1': { address: mockEvmAccount1.address, balance: '0x1F4' },
        },
        [CHAIN_IDS.SEPOLIA]: {
          '0x1': {
            address: mockEvmAccount1.address,
            balance: '0x24da51d247e8b8',
          },
        },
      },
      tokenList: [],
      cachedBalances: {
        '0x1': {
          [mockEvmAccount1.address]: '0x1F4',
        },
      },
      preferences: {
        showNativeTokenAsMainBalance: true,
        tokenNetworkFilter: {},
      },
      enabledNetworkMap: {
        eip155: {
          [CHAIN_IDS.MAINNET]: true,
        },
      },
      useExternalServices: true,
      useCurrencyRateCheck: true,
      currentCurrency: 'usd',
      currencyRates: {
        ETH: {
          conversionRate: 2,
        },
      },
      accounts: {
        [mockEvmAccount1.address]: {
          address: mockEvmAccount1.address,
          balance: '0x1F4',
        },
      },
      internalAccounts: {
        accounts: {
          [mockEvmAccount1.id]: mockEvmAccount1,
          [mockEvmAccount2.id]: mockEvmAccount2,
        },
        selectedAccount: mockEvmAccount1.id,
      },
      keyrings: [
        {
          type: KeyringType.imported,
          accounts: [mockEvmAccount1.address, mockEvmAccount2.address],
        },
        {
          type: KeyringType.ledger,
          accounts: [],
        },
      ],
      balances: {},
      isEvmSelected: true,
      multichainNetworkConfigurationsByChainId:
        AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS,
      selectedMultichainNetworkChainId: CHAIN_IDS.MAINNET,
    },
    ramps: {
      buyableChains: [],
    },
  };

  const store = configureMockStore([thunk])(mockStore);
  const ETH_OVERVIEW_RECEIVE = 'eth-overview-receive';
  const ETH_OVERVIEW_SEND = 'eth-overview-send';
  const ETH_OVERVIEW_PRIMARY_CURRENCY = 'eth-overview__primary-currency';

  afterEach(() => {
    store.clearActions();
  });

  describe('EthOverview', () => {
    beforeAll(() => {
      jest.clearAllMocks();
      Object.defineProperty(global, 'platform', {
        value: {
          openTab: jest.fn(),
        },
      });
      openTabSpy = jest.spyOn(global.platform, 'openTab');
    });

    beforeEach(() => {
      openTabSpy.mockClear();
      // Clear previous mock implementations
      useMultiPolling.mockClear();

      // Mock implementation for useMultiPolling
      useMultiPolling.mockImplementation(({ input }) => {
        // Mock startPolling and stopPollingByPollingToken for each input
        const startPolling = jest.fn().mockResolvedValue('mockPollingToken');
        const stopPollingByPollingToken = jest.fn();

        input.forEach((inputItem) => {
          const key = JSON.stringify(inputItem);
          // Simulate returning a unique token for each input
          startPolling.mockResolvedValueOnce(`mockToken-${key}`);
        });

        return { startPolling, stopPollingByPollingToken };
      });
    });

    it('should show the primary balance', async () => {
      const { queryByTestId, queryByText } = renderWithProvider(
        <EthOverview />,
        store,
      );

      const primaryBalance = queryByTestId(ETH_OVERVIEW_PRIMARY_CURRENCY);
      expect(primaryBalance).toBeInTheDocument();
      expect(primaryBalance).toHaveTextContent('$0.00');
      expect(queryByText('*')).not.toBeInTheDocument();
    });

    it('should show the cached primary balance', async () => {
      const mockedStoreWithCachedBalance = {
        ...mockStore,
        metamask: {
          ...mockStore.metamask,
          accounts: {
            '0x1': {
              address: '0x1',
            },
          },
          accountsByChainId: {
            [CHAIN_IDS.MAINNET]: {
              '0x1': { address: '0x1', balance: '0x24da51d247e8b8' },
            },
          },
        },
      };
      const mockedStore = configureMockStore([thunk])(
        mockedStoreWithCachedBalance,
      );

      const { queryByTestId, queryByText } = renderWithProvider(
        <EthOverview />,
        mockedStore,
      );

      const primaryBalance = queryByTestId(ETH_OVERVIEW_PRIMARY_CURRENCY);
      expect(primaryBalance).toBeInTheDocument();
      expect(primaryBalance).toHaveTextContent('$0.00');
      expect(queryByText('*')).not.toBeInTheDocument();
    });

    it('should always show the Receive button', () => {
      const { queryByTestId } = renderWithProvider(<EthOverview />, store);
      const receiveButton = queryByTestId(ETH_OVERVIEW_RECEIVE);
      expect(receiveButton).toBeInTheDocument();
    });

    it('should always show the Portfolio button', () => {
      const { queryByTestId } = renderWithProvider(<EthOverview />, store);
      const portfolioButton = queryByTestId('portfolio-link');
      expect(portfolioButton).toBeInTheDocument();
    });
  });

  describe('Disabled buttons when an account cannot sign transactions', () => {
    it('should have the Send button disabled when an account cannot sign transactions or user operations', () => {
      const mockedStoreWithoutSigningMethods = {
        ...mockStore,
        metamask: {
          ...mockStore.metamask,
          internalAccounts: {
            ...mockStore.metamask.internalAccounts,
            accounts: {
              [mockEvmAccount1.id]: {
                ...mockEvmAccount1,
                // Filter out all methods used for signing transactions.
                methods: Object.values(EthMethod).filter(
                  (method) =>
                    method !== EthMethod.SignTransaction &&
                    method !== EthMethod.SignUserOperation,
                ),
              },
            },
          },
        },
      };

      const mockedStore = configureMockStore([thunk])(
        mockedStoreWithoutSigningMethods,
      );
      const { queryByTestId } = renderWithProvider(
        <EthOverview />,
        mockedStore,
      );

      const button = queryByTestId(ETH_OVERVIEW_SEND);
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
      expect(button.parentElement).toHaveAttribute(
        'data-original-title',
        'Not supported with this account.',
      );
    });
  });

  it.each([
    CHAIN_IDS.MAINNET,
    // We want to test with a different chain ID than mainnet to make sure the events are still using
    // the right `token_symbol`.
    CHAIN_IDS.SEPOLIA,
  ])('sends an event when clicking the Send button: %s', (chainId) => {
    const mockTrackEvent = jest.fn();
    const mockMetaMetricsContext = {
      trackEvent: mockTrackEvent,
      bufferedTrace: jest.fn(),
      bufferedEndTrace: jest.fn(),
      onboardingParentContext: { current: null },
    };
    const mockedStoreWithSpecificChainId = {
      ...mockStore,
      metamask: {
        ...mockStore.metamask,
        ...mockNetworkState({ chainId }),
      },
    };

    const mockedStore = configureMockStore([thunk])(
      mockedStoreWithSpecificChainId,
    );
    const { queryByTestId } = renderWithProvider(
      <MetaMetricsContext.Provider value={mockMetaMetricsContext}>
        <EthOverview />
      </MetaMetricsContext.Provider>,
      mockedStore,
    );

    const sendButton = queryByTestId(ETH_OVERVIEW_SEND);
    expect(sendButton).toBeInTheDocument();
    expect(sendButton).not.toBeDisabled();
    fireEvent.click(sendButton);

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      {
        event: MetaMetricsEventName.SendStarted,
        category: MetaMetricsEventCategory.Navigation,
        properties: {
          account_type: mockEvmAccount1.type,
          chain_id: chainId,
          location: 'Home',
          text: 'Send',
          token_symbol: 'ETH',
        },
      },
      expect.any(Object),
    );
  });
});
