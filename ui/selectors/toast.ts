import { createSelector } from 'reselect';
import type { MetaMaskReduxState } from '../store/store';
import { EMPTY_ARRAY } from './shared';
import {
  selectRequiredTransactionHashes,
  selectRequiredTransactionIds,
} from './transactionController';

const selectTransactions = (state: MetaMaskReduxState) =>
  state.metamask?.transactions ?? EMPTY_ARRAY;

export const selectTransactionIds = createSelector(
  selectTransactions,
  (transactions) => new Set<string>(transactions.map((tx) => tx.id)),
);

/**
 * Returns EVM transactions eligible for toast notifications.
 *
 * @param {object} state - Root state
 * @returns {object[]} Filtered, deduplicated array of transaction objects
 */
export const selectEvmTransactionsForToast = createSelector(
  selectTransactions,
  selectRequiredTransactionIds,
  selectRequiredTransactionHashes,
  (rawTransactions, requiredTransactionIds, requiredTransactionHashes) => {
    if (!rawTransactions?.length) {
      return EMPTY_ARRAY;
    }

    const seen = new Set<string>();

    return rawTransactions.filter((transaction) => {
      if (seen.has(transaction.id)) {
        return false;
      }

      seen.add(transaction.id);

      const type = transaction?.type;
      if (typeof type !== 'string') {
        return false;
      }
      return (
        Boolean(type) &&
        !requiredTransactionIds.has(transaction.id) &&
        !(
          transaction.hash &&
          requiredTransactionHashes.has(transaction.hash.toLowerCase())
        )
      );
    });
  },
);
