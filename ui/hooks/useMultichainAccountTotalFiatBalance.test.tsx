import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { InternalAccount } from '@metamask/keyring-internal-api';
import mockState from '../../test/data/mock-state.json';
import configureStore from '../store/store';
import { createMockInternalAccount } from '../../test/jest/mocks';
import { CHAIN_IDS } from '../../shared/constants/network';
import { mockNetworkState } from '../../test/stub/networks';
import { useMultichainAccountTotalFiatBalance } from './useMultichainAccountTotalFiatBalance';

const mockTokenBalances = [
  {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    balance: '48573',
    balanceError: null,
    decimals: 6,
    string: 0.04857,
    symbol: 'USDC',
    tokenFiatAmount: '0.05',
  },
  {
    address: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e',
    symbol: 'YFI',
    balance: '1409247882142934',
    balanceError: null,
    decimals: 18,
    string: 0.00141,
    tokenFiatAmount: '7.52',
  },
];

const mockAccount = createMockInternalAccount({
  name: 'Account 1',
  address: '0x0836f5ed6b62baf60706fe3adc0ff0fd1df833da',
});

const renderUseMultichainAccountTotalFiatBalance = (
  account: InternalAccount,
) => {
  const state = {
    ...mockState,
    metamask: {
      ...mockState.metamask,
      completedOnboarding: true,
      allTokens: {
        [CHAIN_IDS.MAINNET]: {
          [mockAccount.address]: [
            {
              address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              aggregators: [],
              decimals: 6,
              symbol: 'USDC',
            },
            {
              address: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e',
              aggregators: [],
              decimals: 18,
              symbol: 'YFI',
            },
          ],
        },
      },
      internalAccounts: {
        accounts: {
          [mockAccount.id]: mockAccount,
        },
        selectedAccount: mockAccount.id,
      },
      currentCurrency: 'usd',
      currencyRates: {
        ETH: {
          conversionRate: 1612.92,
        },
      },
      marketData: {
        [CHAIN_IDS.MAINNET]: {
          '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': { price: 0.0006189 },
          '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e': { price: 3.304588 },
        },
      },
      accountsByChainId: {
        [CHAIN_IDS.MAINNET]: {
          '0x0836f5ed6b62baf60706fe3adc0ff0fd1df833da': {
            balance: '0x041173b2c0e57d',
          },
          '0xd8ad671f1fcc94bcf0ebc6ec4790da35e8d5e1e1': {
            balance: '0x048010d1739513',
          },
        },
      },
      tokenBalances: {
        [mockAccount.address]: {
          [CHAIN_IDS.MAINNET]: {
            '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': '0xbdbd',
            '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e': '0x501b4176a64d6',
          },
        },
      },
      ...mockNetworkState({ chainId: CHAIN_IDS.MAINNET }),
    },
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={configureStore(state)}>{children}</Provider>
  );

  return renderHook(() => useMultichainAccountTotalFiatBalance(account), {
    wrapper,
  });
};

describe('useMultichainAccountTotalFiatBalance', () => {
  it('returns the EVM account total fiat balance', () => {
    const { result } = renderUseMultichainAccountTotalFiatBalance(mockAccount);

    expect(result.current).toStrictEqual({
      formattedFiat: '$9.41',
      loading: false,
      mergedRates: {
        '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e': 3.304588,
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 0.0006189,
      },
      totalWeiBalance: '14ba1e6a08a9ed',
      tokensWithBalances: mockTokenBalances,
      totalFiatBalance: '9.41',
      orderedTokenList: [
        {
          fiatBalance: '1.85',
          iconUrl: './images/eth_logo.svg',
          symbol: 'ETH',
        },
      ],
    });
  });
});
