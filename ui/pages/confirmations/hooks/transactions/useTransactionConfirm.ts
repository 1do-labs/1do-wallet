import { TransactionMeta } from '@metamask/transaction-controller';
import { cloneDeep } from 'lodash';
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { getCustomNonceValue } from '../../../../selectors';
import { useConfirmContext } from '../../context/confirm';
import { updateAndApproveTx } from '../../../../store/actions';
import {
  isHardwareWalletError,
  isUserRejectedHardwareWalletError,
  useHardwareWalletError,
} from '../../../../contexts/hardware-wallets';

export function useTransactionConfirm() {
  const dispatch = useDispatch();
  const { showErrorModal } = useHardwareWalletError();
  const customNonceValue = useSelector(getCustomNonceValue);
  const { currentConfirmation: transactionMeta } =
    useConfirmContext<TransactionMeta>();

  const newTransactionMeta = useMemo(
    () => cloneDeep(transactionMeta),
    [transactionMeta],
  );

  const onTransactionConfirm = useCallback(async (): Promise<boolean> => {
    newTransactionMeta.customNonceValue = customNonceValue;

    try {
      await dispatch(updateAndApproveTx(newTransactionMeta, true, ''));
      return true;
    } catch (error) {
      if (!isHardwareWalletError(error)) {
        // Non-hardware wallet errors - just rethrow
        throw error;
      }
      if (isUserRejectedHardwareWalletError(error)) {
        // User intentionally rejected on device; do not show hardware error modal.
        return false;
      }
      showErrorModal(error);
      return false;
    }
  }, [newTransactionMeta, customNonceValue, dispatch, showErrorModal]);

  return {
    onTransactionConfirm,
  };
}
