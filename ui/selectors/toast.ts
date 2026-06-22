import { createSelector } from 'reselect';
import { createDeepEqualSelector } from '../../shared/lib/selectors/selector-creators';
import { SMART_TRANSACTION_CONFIRMATION_TYPES } from '../../shared/constants/app';
import type { MetaMaskReduxState } from '../store/store';
import { TOAST_EXCLUDED_TRANSACTION_TYPES } from '../helpers/constants/transactions';
import { getPendingApprovals } from './approvals';
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
        !TOAST_EXCLUDED_TRANSACTION_TYPES.has(type) &&
        !requiredTransactionIds.has(transaction.id) &&
        !(
          transaction.hash &&
          requiredTransactionHashes.has(transaction.hash.toLowerCase())
        )
      );
    });
  },
);

type TxRequest = {
  approvalId: string;
  txId: string;
  smartTransactionStatus: string | undefined;
};

export const selectSmartTransactions = createDeepEqualSelector(
  getPendingApprovals,
  (pendingApprovals) => {
    const result: TxRequest[] = [];

    for (const approval of pendingApprovals) {
      if (
        approval.type !==
        SMART_TRANSACTION_CONFIRMATION_TYPES.showSmartTransactionStatusPage
      ) {
        continue;
      }

      const { requestState = {} } = approval;
      const { txId, smartTransaction } = requestState as {
        txId?: string;
        smartTransaction?: { status?: string };
      };

      if (!txId) {
        continue;
      }

      result.push({
        approvalId: approval.id,
        txId,
        smartTransactionStatus: smartTransaction?.status,
      });
    }

    return result;
  },
);
