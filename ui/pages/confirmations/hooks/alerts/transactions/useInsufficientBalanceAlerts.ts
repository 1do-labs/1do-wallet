'use no memo';

import { TransactionMeta } from '@metamask/transaction-controller';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  AlertActionKey,
  RowAlertKey,
} from '../../../../../components/app/confirm/info/row/constants';
import { Alert } from '../../../../../ducks/confirm-alerts/confirm-alerts';
import { Severity } from '../../../../../helpers/constants/design-system';
import { useI18nContext } from '../../../../../hooks/useI18nContext';
import { getUseTransactionSimulations } from '../../../../../selectors';
import { useConfirmContext } from '../../../context/confirm';
import { useHasInsufficientBalance } from '../../useHasInsufficientBalance';

export function useInsufficientBalanceAlerts({
  ignoreGasFeeToken,
}: {
  ignoreGasFeeToken?: boolean;
} = {}): Alert[] {
  const t = useI18nContext();
  const { currentConfirmation } = useConfirmContext<TransactionMeta>();
  const { selectedGasFeeToken, gasFeeTokens, excludeNativeTokenForFee } =
    currentConfirmation ?? {};
  const { hasInsufficientBalance, nativeCurrency } =
    useHasInsufficientBalance();
  const isSimulationEnabled = useSelector(getUseTransactionSimulations);

  const isGasFeeTokensEmpty = gasFeeTokens?.length === 0;

  // Simulation is complete if it's disabled, or if enabled and gasFeeTokens is loaded
  const isSimulationComplete = !isSimulationEnabled || Boolean(gasFeeTokens);

  // Check if user has selected a gas fee token (or we're ignoring that check)
  // Note: In the case of chains with no native token (ex: Tempo), `selectedGasFeeToken`
  // may be populated despite no gas token being available.
  // For those chains, `excludeNativeTokenForFee` will always be `true`, hence we can
  // rely on the combination of `excludeNativeTokenForFee` and `isGasFeeTokensEmpty`.
  const hasNoGasFeeTokenSelected =
    ignoreGasFeeToken ||
    !selectedGasFeeToken ||
    (excludeNativeTokenForFee && isGasFeeTokensEmpty);

  const showAlert =
    hasInsufficientBalance && isSimulationComplete && hasNoGasFeeTokenSelected;

  return useMemo(() => {
    if (!showAlert) {
      return [];
    }

    return [
      {
        actions: [
          {
            key: AlertActionKey.Buy,
            label: t('alertActionBuyWithNativeCurrency', [nativeCurrency]),
          },
        ],
        field: RowAlertKey.EstimatedFee,
        isBlocking: true,
        key: 'insufficientBalance',
        message: t('alertMessageInsufficientBalanceWithNativeCurrency', [
          nativeCurrency,
        ]),
        reason: t('alertReasonInsufficientBalance'),
        severity: Severity.Danger,
      },
    ];
  }, [nativeCurrency, showAlert, t]);
}
