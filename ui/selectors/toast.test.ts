import { TransactionType } from '@metamask/transaction-controller';
import {
  selectTransactionIds,
  selectEvmTransactionsForToast,
  selectSmartTransactions,
} from './toast';

type SelectorState = Parameters<typeof selectTransactionIds>[0];

describe('toast selectors', () => {
  describe('selectTransactionIds', () => {
    it('returns a Set of all transaction ids', () => {
      const state = {
        metamask: {
          transactions: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
        },
      } as unknown as SelectorState;
      const result = selectTransactionIds(state);
      expect(result).toStrictEqual(new Set(['a', 'b', 'c']));
    });

    it('returns an empty Set when there are no transactions', () => {
      const result = selectTransactionIds({
        metamask: {},
      } as unknown as SelectorState);
      expect(result).toStrictEqual(new Set());
    });
  });

  describe('selectEvmTransactionsForToast', () => {
    it('returns all transactions except excluded types', () => {
      const state = {
        metamask: {
          transactions: [
            { id: '0', time: 1, type: TransactionType.simpleSend },
            { id: '1', time: 2, type: TransactionType.deployContract },
            { id: '2', time: 3, type: TransactionType.contractInteraction },
            { id: '3', time: 4 },
            { id: '4', time: 5, type: TransactionType.gasPayment },
          ],
        },
      } as unknown as SelectorState;

      const results = selectEvmTransactionsForToast(state);

      expect(results).toStrictEqual([
        { id: '0', time: 1, type: TransactionType.simpleSend },
        { id: '1', time: 2, type: TransactionType.deployContract },
        { id: '2', time: 3, type: TransactionType.contractInteraction },
      ]);
    });

    it('deduplicates transactions by id', () => {
      const state = {
        metamask: {
          transactions: [
            { id: '0', time: 1, type: TransactionType.simpleSend },
            { id: '0', time: 2, type: TransactionType.simpleSend },
          ],
        },
      } as unknown as SelectorState;
      const results = selectEvmTransactionsForToast(state);
      expect(results).toHaveLength(1);
    });

    it('returns an empty array if there are no transactions', () => {
      const results = selectEvmTransactionsForToast(
        {} as unknown as SelectorState,
      );
      expect(results).toStrictEqual([]);
    });

    it('excludes transactions listed as requiredTransactionIds of another tx', () => {
      const primary = {
        id: 'primary',
        time: 1,
        type: TransactionType.contractInteraction,
        requiredTransactionIds: ['satellite-id'],
      };
      const satellite = {
        id: 'satellite-id',
        time: 2,
        type: TransactionType.simpleSend,
      };
      const state = {
        metamask: {
          transactions: [primary, satellite],
        },
      } as unknown as SelectorState;

      const results = selectEvmTransactionsForToast(state);

      expect(results).toStrictEqual([primary]);
    });

    it('excludes transactions whose hash matches a required transaction hash', () => {
      const sharedHash = '0xdeadbeef';
      const satellite = {
        id: 'satellite-id',
        time: 1,
        type: TransactionType.simpleSend,
        hash: sharedHash,
      };
      const primary = {
        id: 'primary',
        time: 2,
        type: TransactionType.contractInteraction,
        requiredTransactionIds: ['satellite-id'],
      };
      const duplicateHashDifferentId = {
        id: 'other-id',
        time: 3,
        type: TransactionType.simpleSend,
        hash: sharedHash,
      };
      const state = {
        metamask: {
          transactions: [satellite, primary, duplicateHashDifferentId],
        },
      } as unknown as SelectorState;

      const results = selectEvmTransactionsForToast(state);

      expect(results).toStrictEqual([primary]);
    });
  });

  describe('selectSmartTransactions', () => {
    it('returns only smart transaction status page approvals with tx ids', () => {
      const state = {
        metamask: {
          pendingApprovals: {
            'approval-1': {
              id: 'approval-1',
              type: 'smartTransaction:showSmartTransactionStatusPage',
              requestState: {
                txId: 'tx-1',
                smartTransaction: {
                  status: 'pending',
                },
              },
            },
            'approval-2': {
              id: 'approval-2',
              type: 'wallet_addEthereumChain',
              requestState: {
                txId: 'tx-2',
              },
            },
            'approval-3': {
              id: 'approval-3',
              type: 'smartTransaction:showSmartTransactionStatusPage',
              requestState: {},
            },
          },
        },
      } as unknown as SelectorState;

      expect(selectSmartTransactions(state)).toStrictEqual([
        {
          approvalId: 'approval-1',
          txId: 'tx-1',
          smartTransactionStatus: 'pending',
        },
      ]);
    });
  });
});
