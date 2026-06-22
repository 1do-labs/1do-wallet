import { TransactionType } from '@metamask/transaction-controller';
import { TransactionGroupCategory } from '../../../../shared/constants/transaction';
import transactions from '../../../../test/data/transaction-data.json';
import { mapTransactionTypeToCategory } from './helpers';

const expectedResults = [
  {
    title: 'Sent',
    category: TransactionGroupCategory.send,
  },
  {
    title: 'Sent',
    category: TransactionGroupCategory.send,
  },
  {
    title: 'Sent',
    category: TransactionGroupCategory.send,
  },
  {
    title: 'Received',
    category: TransactionGroupCategory.receive,
  },
  {
    title: 'Received',
    category: TransactionGroupCategory.receive,
  },
  {
    title: 'Received',
    category: TransactionGroupCategory.receive,
  },
  {
    title: 'Contract deployment',
    category: TransactionGroupCategory.interaction,
  },
  {
    title: 'Safe transfer from',
    category: TransactionGroupCategory.send,
  },
  {
    title: 'Approve ABC spending cap',
    category: TransactionGroupCategory.approval,
  },
  {
    title: 'Sent ABC',
    category: TransactionGroupCategory.send,
  },
];

describe('mapTransactionTypeToCategory', () => {
  it('returns correct categories for transaction types', () => {
    const supportedTransactions = transactions.filter(
      ({ primaryTransaction }) =>
        ![
          'swap',
          'swapAndSend',
          'bridge',
          'swapApproval',
          'bridgeApproval',
        ].includes(primaryTransaction.type),
    );

    supportedTransactions.forEach(({ primaryTransaction }, index) => {
      const transactionType = primaryTransaction.type as TransactionType;

      const result = mapTransactionTypeToCategory(transactionType);

      expect(result).toBe(expectedResults[index].category);
    });
  });
});
