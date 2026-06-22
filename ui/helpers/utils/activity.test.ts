import { TransactionType } from '@metamask/transaction-controller';
import { filterTransactionByChain } from './activity';

const CHAIN_IDS = {
  MAINNET: '0x1',
  ARBITRUM: '0xa4b1',
  BASE: '0x2105',
  POLYGON: '0x89',
};

describe('filterTransactionByChain', () => {
  describe('non-PAY transaction types', () => {
    it('returns true when transaction chain is in enabled chains', () => {
      const transactionGroup = {
        initialTransaction: {
          type: TransactionType.simpleSend,
          chainId: CHAIN_IDS.MAINNET,
        },
      };

      expect(
        filterTransactionByChain(transactionGroup as never, [
          CHAIN_IDS.MAINNET,
        ]),
      ).toBe(true);
    });

    it('returns false when transaction chain is not in enabled chains', () => {
      const transactionGroup = {
        initialTransaction: {
          type: TransactionType.simpleSend,
          chainId: CHAIN_IDS.MAINNET,
        },
      };

      expect(
        filterTransactionByChain(transactionGroup as never, [
          CHAIN_IDS.ARBITRUM,
        ]),
      ).toBe(false);
    });
  });
});
