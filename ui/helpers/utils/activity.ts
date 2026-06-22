import { TransactionMeta } from '@metamask/transaction-controller';

type TransactionGroup = {
  initialTransaction: TransactionMeta;
};

export function filterTransactionByChain(
  transactionGroup: TransactionGroup,
  enabledChainIds: string[],
): boolean {
  const { initialTransaction } = transactionGroup;
  const { chainId } = initialTransaction;

  return enabledChainIds.includes(chainId);
}
