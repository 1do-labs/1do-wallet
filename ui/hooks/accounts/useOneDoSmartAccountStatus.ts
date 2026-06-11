import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { IN_PROGRESS_TRANSACTION_STATUSES } from '../../../shared/constants/transaction';
import { ONE_DO_7702_DELEGATE } from '../../../shared/lib/eip7702-utils';
import { getTransactions } from '../../selectors';
import { isAtomicBatchSupported } from '../../store/controller-actions/transaction-controller';
import { useEIP7702Account } from '../../pages/confirmations/hooks/useEIP7702Account';

export { ONE_DO_7702_DELEGATE };

type UseOneDoSmartAccountStatusParams = {
  address?: Hex;
  chainId?: Hex;
  enabled?: boolean;
};

type OneDoSmartAccountStatus = {
  isActive: boolean;
  isChecking: boolean;
  pendingUpgradeTransaction?: TransactionMeta;
  refresh: () => Promise<boolean>;
  setActive: (isActive: boolean) => void;
};

const SMART_ACCOUNT_PENDING_REFRESH_INTERVAL_MS = 2500;
const SMART_ACCOUNT_COMPLETED_REFRESH_ATTEMPTS = 6;

const isSameAddress = (addressA?: string, addressB?: string) =>
  addressA?.toLowerCase() === addressB?.toLowerCase();

export function getPendingOneDoUpgradeTransaction({
  transactions,
  address,
  chainId,
}: {
  transactions: TransactionMeta[];
  address?: Hex;
  chainId?: Hex;
}) {
  if (!address || !chainId) {
    return undefined;
  }

  return transactions
    .filter((transaction) => {
      return (
        transaction.chainId === chainId &&
        isSameAddress(transaction.txParams?.from, address) &&
        IN_PROGRESS_TRANSACTION_STATUSES.includes(transaction.status) &&
        transaction.txParams?.authorizationList?.some(
          ({ address: authorizationAddress }) =>
            isSameAddress(authorizationAddress, ONE_DO_7702_DELEGATE),
        )
      );
    })
    .sort(
      (transactionA, transactionB) => transactionB.time - transactionA.time,
    )[0];
}

export async function getOneDoSmartAccountIsActive({
  address,
  chainId,
  getDelegationAddress,
}: {
  address: Hex;
  chainId: Hex;
  getDelegationAddress: (address: Hex) => Promise<Hex | undefined>;
}) {
  const support = await isAtomicBatchSupported({
    address,
    chainIds: [chainId],
  });
  const currentChainSupport = support.find(
    ({ chainId: supportedChainId }) => supportedChainId === chainId,
  );
  return (
    isSameAddress(
      currentChainSupport?.delegationAddress,
      ONE_DO_7702_DELEGATE,
    ) ||
    isSameAddress(await getDelegationAddress(address), ONE_DO_7702_DELEGATE)
  );
}

export function useOneDoSmartAccountStatus({
  address,
  chainId,
  enabled = true,
}: UseOneDoSmartAccountStatusParams): OneDoSmartAccountStatus {
  const transactions = useSelector(getTransactions) as TransactionMeta[];
  const { getDelegationAddress } = useEIP7702Account({
    chainId: chainId ?? ('0x' as Hex),
  });
  const [isActive, setIsActive] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const hadPendingUpgradeTransaction = useRef(false);

  const pendingUpgradeTransaction = useMemo(
    () =>
      getPendingOneDoUpgradeTransaction({
        transactions,
        address,
        chainId,
      }),
    [address, chainId, transactions],
  );

  const refresh = useCallback(async () => {
    if (!enabled || !address || !chainId) {
      return false;
    }

    return getOneDoSmartAccountIsActive({
      address,
      chainId,
      getDelegationAddress,
    });
  }, [address, chainId, enabled, getDelegationAddress]);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!enabled || !address || !chainId) {
        setIsActive(false);
        return;
      }

      setIsChecking(true);
      try {
        const result = await refresh();
        if (!cancelled) {
          setIsActive(result);
        }
      } catch {
        if (!cancelled) {
          setIsActive(false);
        }
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    };

    check();

    return () => {
      cancelled = true;
    };
  }, [address, chainId, enabled, refresh]);

  useEffect(() => {
    if (!pendingUpgradeTransaction || isActive) {
      return undefined;
    }

    let cancelled = false;
    let isRefreshing = false;

    const refreshPendingUpgrade = async () => {
      if (isRefreshing) {
        return;
      }

      isRefreshing = true;
      try {
        const result = await refresh();
        if (!cancelled && result) {
          setIsActive(true);
        }
      } catch {
        // Keep the current UI state and retry while the upgrade transaction is pending.
      } finally {
        isRefreshing = false;
      }
    };

    refreshPendingUpgrade();
    const intervalId = setInterval(
      refreshPendingUpgrade,
      SMART_ACCOUNT_PENDING_REFRESH_INTERVAL_MS,
    );

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [isActive, pendingUpgradeTransaction, refresh]);

  useEffect(() => {
    if (pendingUpgradeTransaction) {
      hadPendingUpgradeTransaction.current = true;
      return;
    }

    if (!hadPendingUpgradeTransaction.current || isActive) {
      return;
    }

    hadPendingUpgradeTransaction.current = false;
    let cancelled = false;
    let attempts = 0;
    // Assigned after the async callback is declared so the callback can clear its own interval.
    // eslint-disable-next-line prefer-const
    let intervalId: ReturnType<typeof setInterval>;

    const refreshCompletedUpgrade = async () => {
      attempts += 1;
      try {
        const result = await refresh();
        if (!cancelled && result) {
          setIsActive(true);
          if (intervalId) {
            clearInterval(intervalId);
          }
        }
      } catch {
        // Keep the existing state; the normal address/network refresh path will retry.
      } finally {
        if (
          attempts >= SMART_ACCOUNT_COMPLETED_REFRESH_ATTEMPTS &&
          intervalId
        ) {
          clearInterval(intervalId);
        }
      }
    };

    intervalId = setInterval(
      refreshCompletedUpgrade,
      SMART_ACCOUNT_PENDING_REFRESH_INTERVAL_MS,
    );
    refreshCompletedUpgrade();

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [isActive, pendingUpgradeTransaction, refresh]);

  return {
    isActive,
    isChecking,
    pendingUpgradeTransaction,
    refresh,
    setActive: setIsActive,
  };
}
