import {
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { getShouldShowFiat } from '../../../selectors';
import { getNativeCurrency } from '../../../ducks/metamask/metamask';
import { isEIP1559Transaction } from '../../../../shared/lib/transaction.utils';

import {
  subtractHexes,
  sumHexes,
} from '../../../../shared/lib/conversion.utils';
import { MetaMaskReduxState } from '../../../store/store';
import { calcHexGasTotal } from '../../../../shared/lib/transaction-breakdown-utils';

export const getTransactionBreakdownData = ({
  state,
  transaction,
  isTokenApprove,
  isHardwareWalletAccount,
}: {
  state: MetaMaskReduxState;
  transaction: TransactionMeta;
  isTokenApprove: boolean;
  isHardwareWalletAccount: boolean;
}) => {
  const {
    txParams: { gas, gasPrice, maxFeePerGas, value } = {},
    txReceipt: { gasUsed, effectiveGasPrice, l1Fee: l1HexGasTotal } = {},
    baseFeePerGas,
    status,
    isGasFeeSponsored,
  } = transaction;

  const priorityFee =
    effectiveGasPrice &&
    baseFeePerGas &&
    subtractHexes(effectiveGasPrice, baseFeePerGas);

  const hexGasTotal = calcHexGasTotal(transaction);

  const totalInHex = sumHexes(
    hexGasTotal,
    // @ts-expect-error TODO: fix this, ported directly from original code
    value,
    l1HexGasTotal ?? 0,
  );

  const isGasActuallySponsored =
    isGasFeeSponsored &&
    !isHardwareWalletAccount &&
    status !== TransactionStatus.rejected &&
    !(status === TransactionStatus.failed && !transaction.txReceipt?.gasUsed);

  return {
    nativeCurrency: getNativeCurrency(state),
    showFiat: getShouldShowFiat(state),
    totalInHex,
    gas,
    gasPrice,
    maxFeePerGas,
    gasUsed,
    isTokenApprove,
    hexGasTotal,
    priorityFee,
    baseFee: baseFeePerGas,
    isEIP1559Transaction: isEIP1559Transaction(transaction),
    isGasFeeSponsored: isGasActuallySponsored,
    l1HexGasTotal,
  };
};
