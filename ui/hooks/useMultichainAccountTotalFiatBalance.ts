import { InternalAccount } from '@metamask/keyring-internal-api';
import { useAccountTotalFiatBalance } from './useAccountTotalFiatBalance';

export const EMPTY_VALUES = {
  formattedFiat: '0',
  totalFiatBalance: '0',
  totalWeiBalance: '0',
  tokensWithBalances: [],
  loading: false,
  orderedTokenList: [],
};

export const useMultichainAccountTotalFiatBalance = (
  account: InternalAccount,
  shouldHideZeroBalanceTokens: boolean = false,
): {
  formattedFiat: string;
  totalFiatBalance: string;
  tokensWithBalances: {
    address: string;
    symbol: string;
    decimals: number;
    isERC721?: boolean;
    image?: string;
  }[];
  totalWeiBalance?: string;
  totalBalance?: string;
  loading: boolean;
  orderedTokenList: { iconUrl: string; symbol: string; fiatBalance: string }[];
} => {
  return useAccountTotalFiatBalance(
    account,
    shouldHideZeroBalanceTokens,
  );
};
