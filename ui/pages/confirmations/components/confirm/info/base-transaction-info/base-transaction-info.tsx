import { TransactionMeta } from '@metamask/transaction-controller';
import React from 'react';

import { useConfirmContext } from '../../../../context/confirm';
import { AdvancedDetails } from '../shared/advanced-details/advanced-details';
import { GasFeesSection } from '../shared/gas-fees-section/gas-fees-section';
import { TransactionDetails } from '../shared/transaction-details/transaction-details';
import { TransactionAccountDetails } from '../batch/transaction-account-details';
import { BatchSimulationDetails } from '../batch/batch-simulation-details/batch-simulation-details';
import { EnforcedSimulationsRow } from '../../../rows/enforced-simulations-row';
import { isOneDoWalletNativeTransferTransactionCandidate } from '../../../../utils/onedo-clear-signing';

const BaseTransactionInfo = () => {
  const { currentConfirmation: transactionMeta } =
    useConfirmContext<TransactionMeta>();
  const isOneDoWalletNativeTransfer =
    isOneDoWalletNativeTransferTransactionCandidate(transactionMeta);

  if (!transactionMeta?.txParams) {
    return null;
  }

  return (
    <>
      <TransactionAccountDetails />
      <BatchSimulationDetails />
      {!isOneDoWalletNativeTransfer && <EnforcedSimulationsRow />}
      <TransactionDetails />
      <GasFeesSection />
      <AdvancedDetails />
    </>
  );
};

export default BaseTransactionInfo;
