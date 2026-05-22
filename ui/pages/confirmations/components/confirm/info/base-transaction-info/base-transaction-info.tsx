import { TransactionMeta } from '@metamask/transaction-controller';
import React from 'react';

import { TransactionPaySection } from '../../../rows/transaction-pay-section/transaction-pay-section';
import { useConfirmContext } from '../../../../context/confirm';
import { useDappSwapContext } from '../../../../context/dapp-swap';
import { DappSwapComparisonBanner } from '../../dapp-swap-comparison-banner/dapp-swap-comparison-banner';
import { AdvancedDetails } from '../shared/advanced-details/advanced-details';
import { GasFeesSection } from '../shared/gas-fees-section/gas-fees-section';
import { TransactionDetails } from '../shared/transaction-details/transaction-details';
import { TransactionAccountDetails } from '../batch/transaction-account-details';
import { BatchSimulationDetails } from '../batch/batch-simulation-details/batch-simulation-details';
import { EstimatedPointsSection } from '../../../estimated-points';
import { EnforcedSimulationsRow } from '../../../rows/enforced-simulations-row';
import { isOneDoWalletNativeTransferTransactionCandidate } from '../../../../utils/onedo-clear-signing';

const BaseTransactionInfo = () => {
  const { currentConfirmation: transactionMeta } =
    useConfirmContext<TransactionMeta>();
  const { isQuotedSwapDisplayedInInfo } = useDappSwapContext();
  const isOneDoWalletNativeTransfer =
    isOneDoWalletNativeTransferTransactionCandidate(transactionMeta);

  if (!transactionMeta?.txParams) {
    return null;
  }

  return (
    <>
      <DappSwapComparisonBanner />
      {!isQuotedSwapDisplayedInInfo && (
        <>
          <TransactionAccountDetails />
          <BatchSimulationDetails />
          {!isOneDoWalletNativeTransfer && <EnforcedSimulationsRow />}
          <TransactionDetails />
        </>
      )}
      <TransactionPaySection />
      <GasFeesSection />
      <AdvancedDetails />
      <EstimatedPointsSection />
    </>
  );
};

export default BaseTransactionInfo;
