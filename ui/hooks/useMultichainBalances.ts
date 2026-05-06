import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { type CaipChainId, type Hex } from '@metamask/utils';
import { type InternalAccount } from '@metamask/keyring-internal-api';
import { AssetType } from '../../shared/constants/transaction';
import { getTokenBalancesEvm } from '../selectors/assets';
import {
  getAccountGroupsByAddress,
  getInternalAccountByGroupAndCaip,
  getSelectedAccountGroup,
} from '../selectors/multichain-accounts/account-tree';
import { type MultichainAccountsState } from '../selectors/multichain-accounts/account-tree.types';

/**
 * This hook is used to get the balances of all tokens and native tokens across all chains
 * This also returns the total fiat balances by chainId/caipChainId
 *
 * @param accountAddress - the accountAddress to use for the token list, if not provided, the selected account will be used
 */
export const useMultichainBalances = (
  accountAddress?: InternalAccount['address'],
) => {
  // Use accountAddress's account group if it exists, otherwise use the selected account group
  const selectedAccountGroup = useSelector(getSelectedAccountGroup);
  const [requestedAccountGroup] = useSelector((state) =>
    getAccountGroupsByAddress(state as MultichainAccountsState, [
      accountAddress ?? '',
    ]),
  );
  const accountGroupIdToUse = requestedAccountGroup?.id ?? selectedAccountGroup;

  // Get internal account to use for each supported scope
  const evmAccount = useSelector((state) =>
    getInternalAccountByGroupAndCaip(state, accountGroupIdToUse, 'eip155:1'),
  );

  // EVM balances
  const evmBalancesWithFiatByChainId = useSelector((state) =>
    getTokenBalancesEvm(state, evmAccount?.address),
  );

  // return TokenWithFiat sorted by fiat balance amount
  const assetsWithBalance = useMemo(() => {
    return evmBalancesWithFiatByChainId
      .map((token) => ({
        ...token,
        type: token.isNative ? AssetType.native : AssetType.token,
      }))
      .sort((a, b) => (b.tokenFiatAmount ?? 0) - (a.tokenFiatAmount ?? 0));
  }, [evmBalancesWithFiatByChainId]);

  // return total fiat balances by chainId/caipChainId
  const balanceByChainId = useMemo(() => {
    return evmBalancesWithFiatByChainId.reduce(
      (acc: Record<Hex | CaipChainId, number>, tokenWithBalanceData) => {
        if (!acc[tokenWithBalanceData.chainId]) {
          acc[tokenWithBalanceData.chainId] = 0;
        }
        acc[tokenWithBalanceData.chainId] +=
          tokenWithBalanceData.tokenFiatAmount ?? 0;
        return acc;
      },
      {},
    );
  }, [evmBalancesWithFiatByChainId]);

  return { assetsWithBalance, balanceByChainId };
};
