import { useMemo } from 'react';
import { Alert } from '../../../ducks/confirm-alerts/confirm-alerts';
import useAccountMismatchAlerts from './alerts/signatures/useAccountMismatchAlerts';
import useDomainMismatchAlerts from './alerts/signatures/useDomainMismatchAlerts';
import { useAccountTypeUpgrade } from './alerts/transactions/useAccountTypeUpgrade';
import { useFirstTimeInteractionAlert } from './alerts/transactions/useFirstTimeInteractionAlert';
import { useGasEstimateFailedAlerts } from './alerts/transactions/useGasEstimateFailedAlerts';
import { useGasFeeLowAlerts } from './alerts/transactions/useGasFeeLowAlerts';
import { useGasTooLowAlerts } from './alerts/transactions/useGasTooLowAlerts';
import { useSuggestedGasFeeHighAlert } from './alerts/transactions/useSuggestedGasFeeHighAlert';
import { useInsufficientBalanceAlerts } from './alerts/transactions/useInsufficientBalanceAlerts';
import { useMultipleApprovalsAlerts } from './alerts/transactions/useMultipleApprovalsAlerts';
import { useNoGasPriceAlerts } from './alerts/transactions/useNoGasPriceAlerts';
import { useNonContractAddressAlerts } from './alerts/transactions/useNonContractAddressAlerts';
import { usePendingTransactionAlerts } from './alerts/transactions/usePendingTransactionAlerts';
import { usePayHardwareAccountAlert } from './alerts/transactions/usePayHardwareAccountAlert';
import { useResimulationAlert } from './alerts/transactions/useResimulationAlert';
import { useSigningOrSubmittingAlerts } from './alerts/transactions/useSigningOrSubmittingAlerts';
import useConfirmationOriginAlerts from './alerts/useConfirmationOriginAlerts';
import { useNetworkAndOriginSwitchingAlerts } from './alerts/useNetworkAndOriginSwitchingAlerts';
import { useSelectedAccountAlerts } from './alerts/useSelectedAccountAlerts';
import { useSpenderAlerts } from './alerts/useSpenderAlerts';
import { useAddEthereumChainAlerts } from './alerts/useAddEthereumChainAlerts';
import { useBurnAddressAlert } from './alerts/transactions/useBurnAddressAlert';
import { useTokenContractAlert } from './alerts/transactions/useTokenContractAlert';

function useSignatureAlerts(): Alert[] {
  const accountMismatchAlerts = useAccountMismatchAlerts();
  const domainMismatchAlerts = useDomainMismatchAlerts();

  return useMemo(
    () => [...accountMismatchAlerts, ...domainMismatchAlerts],
    [accountMismatchAlerts, domainMismatchAlerts],
  );
}

function useTransactionAlerts(): Alert[] {
  const accountTypeUpgradeAlerts = useAccountTypeUpgrade();
  const burnAddressAlert = useBurnAddressAlert();
  const firstTimeInteractionAlert = useFirstTimeInteractionAlert();
  const gasEstimateFailedAlerts = useGasEstimateFailedAlerts();
  const gasFeeLowAlerts = useGasFeeLowAlerts();
  const gasTooLowAlerts = useGasTooLowAlerts();
  const insufficientBalanceAlerts = useInsufficientBalanceAlerts();
  const multipleApprovalAlerts = useMultipleApprovalsAlerts();
  const noGasPriceAlerts = useNoGasPriceAlerts();
  const nonContractAddressAlerts = useNonContractAddressAlerts();
  const pendingTransactionAlerts = usePendingTransactionAlerts();
  const payHardwareAccountAlerts = usePayHardwareAccountAlert();
  const resimulationAlert = useResimulationAlert();
  const signingOrSubmittingAlerts = useSigningOrSubmittingAlerts();
  const suggestedGasFeeHighAlert = useSuggestedGasFeeHighAlert();
  const tokenContractAlert = useTokenContractAlert();

  return useMemo(
    () => [
      ...accountTypeUpgradeAlerts,
      ...burnAddressAlert,
      ...firstTimeInteractionAlert,
      ...gasEstimateFailedAlerts,
      ...gasFeeLowAlerts,
      ...gasTooLowAlerts,
      ...insufficientBalanceAlerts,
      ...multipleApprovalAlerts,
      ...noGasPriceAlerts,
      ...nonContractAddressAlerts,
      ...pendingTransactionAlerts,
      ...payHardwareAccountAlerts,
      ...resimulationAlert,
      ...signingOrSubmittingAlerts,
      ...suggestedGasFeeHighAlert,
      ...tokenContractAlert,
    ],
    [
      accountTypeUpgradeAlerts,
      burnAddressAlert,
      firstTimeInteractionAlert,
      gasEstimateFailedAlerts,
      gasFeeLowAlerts,
      gasTooLowAlerts,
      insufficientBalanceAlerts,
      multipleApprovalAlerts,
      noGasPriceAlerts,
      nonContractAddressAlerts,
      pendingTransactionAlerts,
      payHardwareAccountAlerts,
      resimulationAlert,
      signingOrSubmittingAlerts,
      suggestedGasFeeHighAlert,
      tokenContractAlert,
    ],
  );
}

export default function useConfirmationAlerts(): Alert[] {
  const confirmationOriginAlerts = useConfirmationOriginAlerts();
  const signatureAlerts = useSignatureAlerts();
  const transactionAlerts = useTransactionAlerts();
  const selectedAccountAlerts = useSelectedAccountAlerts();
  const networkAndOriginSwitchingAlerts = useNetworkAndOriginSwitchingAlerts();
  const spenderAlerts = useSpenderAlerts();
  const addEthereumChainAlerts = useAddEthereumChainAlerts();

  return useMemo(
    () => [
      ...confirmationOriginAlerts,
      ...signatureAlerts,
      ...transactionAlerts,
      ...selectedAccountAlerts,
      ...networkAndOriginSwitchingAlerts,
      ...spenderAlerts,
      ...addEthereumChainAlerts,
    ],
    [
      confirmationOriginAlerts,
      signatureAlerts,
      transactionAlerts,
      selectedAccountAlerts,
      networkAndOriginSwitchingAlerts,
      spenderAlerts,
      addEthereumChainAlerts,
    ],
  );
}
