import type { AccountGroupBalance as AccountGroupBalanceType } from '@metamask/assets-controllers';
import React from 'react';
import configureMockStore from 'redux-mock-store';
import { CaipChainId, Hex } from '@metamask/utils';
import mockState from '../../../../../test/data/mock-state.json';
import { renderWithProvider } from '../../../../../test/lib/render-helpers-navigate';
import { getIntlLocale } from '../../../../ducks/locale/locale';
import { getCurrentCurrency } from '../../../../ducks/metamask/metamask';
import {
  getPreferences,
  selectAnyEnabledNetworksAreAvailable,
} from '../../../../selectors';
import {
  selectBalanceBySelectedAccountGroup,
  selectAggregatedBalanceForSelectedAccount,
} from '../../../../selectors/assets';
import {
  AccountGroupBalance,
  AccountGroupBalanceProps,
} from './account-group-balance';

const mockStore = configureMockStore()(mockState);

jest.mock('../../../../selectors/assets');
jest.mock('../../../../selectors');
jest.mock('../../../../ducks/locale/locale');
jest.mock('../../../../ducks/metamask/metamask');

describe('AccountGroupBalance', () => {
  const createMockBalance = (): AccountGroupBalanceType => ({
    walletId: 'w1',
    groupId: 'w1/g1',
    totalBalanceInUserCurrency: 123.45,
    userCurrency: 'usd',
  });

  const arrange = (
    selectedGroupBalance: AccountGroupBalanceType | null = null,
    showNativeTokenAsMainBalance: boolean = false,
    aggregatedBalance: {
      entries: unknown[];
      totalBalanceInFiat?: number;
    } | null = null,
    anyEnabledNetworksAreAvailable: boolean = true,
  ) => {
    const mockSelectBalanceBySelectedAccountGroup = jest
      .mocked(selectBalanceBySelectedAccountGroup)
      .mockReturnValue(selectedGroupBalance);

    jest
      .mocked(selectAggregatedBalanceForSelectedAccount)
      .mockReturnValue(
        aggregatedBalance as ReturnType<
          typeof selectAggregatedBalanceForSelectedAccount
        >,
      );

    jest
      .mocked(selectAnyEnabledNetworksAreAvailable)
      .mockReturnValue(anyEnabledNetworksAreAvailable);

    const mockGetPreferences = jest
      .mocked(getPreferences)
      .mockReturnValue({ privacyMode: false, showNativeTokenAsMainBalance });

    const mockGetIntlLocale = jest.mocked(getIntlLocale).mockReturnValue('en');

    const mockGetCurrentCurrency = jest
      .mocked(getCurrentCurrency)
      .mockReturnValue('usd');

    return {
      mockSelectBalanceBySelectedAccountGroup,
      mockGetPreferences,
      mockGetIntlLocale,
      mockGetCurrentCurrency,
    };
  };

  const renderComponent = (
    props: Partial<AccountGroupBalanceProps> = {
      classPrefix: 'coin',
      balanceIsCached: false,
      handleSensitiveToggle: () => undefined,
      balance: '1000000000000000000',
      chainId: '0x1',
    },
  ) =>
    renderWithProvider(
      <AccountGroupBalance
        classPrefix={props.classPrefix || 'coin'}
        balanceIsCached={props.balanceIsCached || false}
        handleSensitiveToggle={props.handleSensitiveToggle || (() => undefined)}
        balance={props.balance || '1000000000000000000'}
        chainId={props.chainId || '0x1'}
      />,
      mockStore,
    );

  const actAssertSkeletonPresent = () => {
    const { container } = renderComponent();
    expect(container.querySelector('.mm-skeleton')).toBeTruthy();
  };

  const actAssertBalanceContent = (props: {
    currency: string;
    amount: string;
    balance: string;
    chainId: string;
  }) => {
    const { getByText } = renderComponent({
      balance: props.balance,
      chainId: props.chainId as CaipChainId | Hex,
    });
    expect(
      getByText((content) => content.includes(props.amount)),
    ).toBeInTheDocument();
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a skeleton when no selected group balance and no networks available', () => {
    arrange(null, false, null, false);
    actAssertSkeletonPresent();
  });

  it('renders formatted balance and currency when data available', () => {
    arrange(createMockBalance());
    actAssertBalanceContent({
      currency: 'USD',
      amount: '$123.45',
      balance: '1000000000000000000',
      chainId: '0x1',
    });
  });

  it('renders total balance when setting showNativeTokenAsMainBalance to true', () => {
    arrange(createMockBalance(), true);
    actAssertBalanceContent({
      currency: 'USD',
      amount: '$123.45',
      balance: '0x0217b4f7389e02',
      chainId: '0x1',
    });
  });

  it('renders aggregated balance when selectAggregatedBalanceForSelectedAccount returns totalBalanceInFiat', () => {
    arrange(null, false, {
      entries: [],
      totalBalanceInFiat: 99.5,
    });
    const { getByText } = renderComponent({
      balance: '1000000000000000000',
      chainId: '0x1',
    });
    expect(
      getByText(
        (content) => content.includes('99.50') || content.includes('99.5'),
      ),
    ).toBeInTheDocument();
  });

  it('renders legacy balance when aggregatedBalance is null and selectedGroupBalance is set', () => {
    arrange(createMockBalance(), false, null);
    actAssertBalanceContent({
      currency: 'USD',
      amount: '$123.45',
      balance: '1000000000000000000',
      chainId: '0x1',
    });
  });

  it('renders skeleton when no networks available and no balance', () => {
    arrange(null, false, null, false);
    actAssertSkeletonPresent();
  });

  it('applies cached balance class when balanceIsCached is true', () => {
    arrange(createMockBalance());
    const { container } = renderComponent({
      balanceIsCached: true,
      balance: '1000000000000000000',
      chainId: '0x1',
    });
    expect(
      container.querySelector('.coin-overview__cached-balance'),
    ).toBeTruthy();
  });

  it('renders masked balance when privacy mode is enabled', () => {
    arrange(createMockBalance());
    jest.mocked(getPreferences).mockReturnValue({
      privacyMode: true,
      showNativeTokenAsMainBalance: false,
    });
    const { getByText } = renderComponent();
    // SensitiveText shows bullet pattern when isHidden (privacyMode) is true
    expect(getByText('••••••')).toBeInTheDocument();
  });
});
