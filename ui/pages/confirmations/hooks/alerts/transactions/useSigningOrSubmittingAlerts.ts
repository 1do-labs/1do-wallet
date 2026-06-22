'use no memo';

import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import {
  getApprovedAndSignedTransactions,
  getTransactions,
} from '../../../../../selectors';
import { Severity } from '../../../../../helpers/constants/design-system';
import { useI18nContext } from '../../../../../hooks/useI18nContext';
import { Alert } from '../../../../../ducks/confirm-alerts/confirm-alerts';
import { useConfirmContext } from '../../../context/confirm';
import { isCorrectDeveloperTransactionType } from '../../../../../../shared/lib/confirmation.utils';
import { AlertsName } from '../constants';

const PENDING_STATUSES = [
  TransactionStatus.approved,
  TransactionStatus.signed,
  TransactionStatus.submitted,
];

export function useSigningOrSubmittingAlerts(): Alert[] {
  const t = useI18nContext();
  const { currentConfirmation } = useConfirmContext();
  const { type } = (currentConfirmation ?? {}) as
    | TransactionMeta
    | Record<string, never>;

  const signingOrSubmittingTransactions = useSelector(
    getApprovedAndSignedTransactions,
  );

  const isValidType = isCorrectDeveloperTransactionType(type);

  const isSigningOrSubmitting =
    isValidType && signingOrSubmittingTransactions.length > 0;

  return useMemo(() => {
    if (!isSigningOrSubmitting) {
      return [];
    }

    return [
      {
        isBlocking: true,
        key: AlertsName.SigningOrSubmitting,
        message: t('isSigningOrSubmitting'),
        severity: Severity.Danger,
      },
    ];
  }, [isSigningOrSubmitting, t]);
}
