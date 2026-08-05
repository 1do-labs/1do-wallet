import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { KeyringTypes } from '@metamask/keyring-controller';
import { useEIP7702Account } from '../../../pages/confirmations/hooks/useEIP7702Account';
import { getSelectedInternalAccount } from '../../../selectors';
import { getCurrentChainId } from '../../../../shared/lib/selectors/networks';
import { KEYRING_TYPES_SUPPORTING_7702 } from '../../../../shared/constants/keyring';
import {
  CONFIRM_TRANSACTION_ROUTE,
  MULTICHAIN_SMART_ACCOUNT_PAGE_ROUTE,
} from '../../../helpers/constants/routes';
import {
  ONE_DO_7702_DELEGATE,
  useOneDoSmartAccountStatus,
} from '../../../hooks/accounts/useOneDoSmartAccountStatus';
import { isOneDo7702SupportedChain } from '../../../../shared/lib/eip7702-utils';
import { useI18nContext } from '../../../hooks/useI18nContext';

/* eslint-disable @metamask/design-tokens/color-no-hex */

const ONE_DO_WALLET_AVATAR_MASK_ID = 'one-do-wallet-avatar-mask';

type SmartAccountHeaderButtonProps = {
  placement?: 'header' | 'runtime';
  onStatusChange?: (status: { isActive: boolean; isChecking: boolean }) => void;
};

const OneDoWalletAvatar = () => {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="smart-account-header-logo__avatar"
    >
      <defs>
        <mask id={ONE_DO_WALLET_AVATAR_MASK_ID}>
          <rect width="40" height="40" fill="white" />
          <circle cx="16" cy="12" r="2" fill="black" />
        </mask>
      </defs>
      <rect
        x="11"
        y="6"
        width="18"
        height="16"
        rx="5"
        fill="black"
        mask={`url(#${ONE_DO_WALLET_AVATAR_MASK_ID})`}
      />
      <path
        d="M7 38 C7 29 12 23 20 23 C28 23 33 29 33 38"
        fill="url(#bodyGradient)"
      />
      <path
        d="M9.5 37.5 C9.5 29.8 13.8 24.5 20 24.5 C26.2 24.5 30.5 29.8 30.5 37.5"
        fill="url(#bodyGradientMid)"
        opacity="0.7"
      />
      <path
        d="M12 36 C12 31 14.8 27.5 20 27.5 C25.2 27.5 28 31 28 36"
        fill="url(#bodyGradientInner)"
        opacity="0.8"
      />
      <defs>
        <linearGradient
          id="bodyGradient"
          x1="7"
          y1="23"
          x2="33"
          y2="38"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#fde2e7" />
          <stop offset="55%" stopColor="#f7b5c9" />
          <stop offset="100%" stopColor="#db8fa9" />
        </linearGradient>
        <linearGradient
          id="bodyGradientMid"
          x1="9.5"
          y1="24.5"
          x2="30.5"
          y2="37.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#fbe3ea" />
          <stop offset="65%" stopColor="#f3a3bd" />
          <stop offset="100%" stopColor="#db8fa9" />
        </linearGradient>
        <linearGradient
          id="bodyGradientInner"
          x1="12"
          y1="27.5"
          x2="28"
          y2="36"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffd4e0" />
          <stop offset="60%" stopColor="#f58fb5" />
          <stop offset="100%" stopColor="#d36394" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export const SmartAccountHeaderButton = ({
  placement = 'header',
  onStatusChange,
}: SmartAccountHeaderButtonProps) => {
  const t = useI18nContext();
  const navigate = useNavigate();
  const selectedAccount = useSelector(getSelectedInternalAccount);
  const currentChainId = useSelector(getCurrentChainId);
  const { address, metadata } = selectedAccount ?? {};
  const keyringType = metadata?.keyring?.type;

  const isSupportedKeyring = Boolean(
    keyringType &&
      KEYRING_TYPES_SUPPORTING_7702.includes(keyringType as KeyringTypes),
  );
  const isSupportedNetwork = isOneDo7702SupportedChain(currentChainId);

  const { upgradeAccount } = useEIP7702Account({
    chainId: currentChainId,
  });
  const [pending, setPending] = useState(false);
  const {
    isActive,
    isChecking,
    hasError,
    pendingUpgradeTransaction,
    refresh: refreshSmartAccountStatus,
    setActive: setSmartAccountActive,
  } = useOneDoSmartAccountStatus({
    address: address as Hex | undefined,
    chainId: currentChainId,
    enabled: isSupportedKeyring && isSupportedNetwork,
  });

  useEffect(() => {
    if (pendingUpgradeTransaction) {
      setPending(false);
    }
  }, [pendingUpgradeTransaction]);

  useEffect(() => {
    onStatusChange?.({ isActive, isChecking });
  }, [isActive, isChecking, onStatusChange]);

  const onClick = useCallback(async () => {
    if (
      !address ||
      !isSupportedKeyring ||
      !isSupportedNetwork ||
      pending ||
      isChecking
    ) {
      return;
    }

    if (pendingUpgradeTransaction?.id) {
      navigate(`${CONFIRM_TRANSACTION_ROUTE}/${pendingUpgradeTransaction.id}`);
      return;
    }

    if (isActive) {
      navigate(
        `${MULTICHAIN_SMART_ACCOUNT_PAGE_ROUTE}/${encodeURIComponent(address)}`,
      );
      return;
    }

    setPending(true);
    try {
      if (await refreshSmartAccountStatus()) {
        setSmartAccountActive(true);
        navigate(
          `${MULTICHAIN_SMART_ACCOUNT_PAGE_ROUTE}/${encodeURIComponent(
            address,
          )}`,
        );
        return;
      }
      await upgradeAccount(address as Hex, ONE_DO_7702_DELEGATE);
    } finally {
      setPending(false);
    }
  }, [
    address,
    isSupportedKeyring,
    isSupportedNetwork,
    pending,
    isChecking,
    pendingUpgradeTransaction?.id,
    isActive,
    navigate,
    upgradeAccount,
    refreshSmartAccountStatus,
    setSmartAccountActive,
  ]);

  const content = useMemo(() => {
    if (isActive && address) {
      if (placement === 'runtime') {
        return null;
      }
      const activeLabel = `${t('smartAccount')}: ${t('active')}`;
      return (
        <button
          type="button"
          className="smart-account-header-logo"
          onClick={onClick}
          data-testid="smart-account-header-button"
          aria-label={activeLabel}
          title={activeLabel}
        >
          <OneDoWalletAvatar />
        </button>
      );
    }

    const isPending = pending || Boolean(pendingUpgradeTransaction);
    let visibleLabel = placement === 'runtime' ? t('setUp') : 'Smart';
    if (isPending) {
      visibleLabel = t('pending');
    } else if (isChecking) {
      visibleLabel = t('loading');
    } else if (hasError) {
      visibleLabel = t('tryAgain');
    }
    const accessibleLabel = hasError ? visibleLabel : t('smartAccount');

    if (placement === 'runtime') {
      return (
        <button
          type="button"
          className="smart-account-header-button smart-account-header-button--runtime"
          onClick={onClick}
          data-testid="smart-account-header-button"
          aria-label={accessibleLabel}
          aria-busy={isPending || isChecking}
          title={accessibleLabel}
          disabled={pending || isChecking}
        >
          <span className="smart-account-header-button__runtime-icon">
            {isPending || isChecking ? (
              <Icon
                name={IconName.Loading}
                size={IconSize.Md}
                color={IconColor.PrimaryDefault}
              />
            ) : (
              <OneDoWalletAvatar />
            )}
          </span>
          <span className="smart-account-header-button__runtime-content">
            <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
              {visibleLabel}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {t('smartAccount')}
            </Text>
          </span>
          <Icon
            className="smart-account-header-button__runtime-arrow"
            name={IconName.ArrowRight}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        </button>
      );
    }

    return (
      <button
        type="button"
        className={`smart-account-header-button smart-account-header-button--${placement}`}
        onClick={onClick}
        data-testid="smart-account-header-button"
        aria-label={accessibleLabel}
        aria-busy={isPending || isChecking}
        title={accessibleLabel}
        disabled={pending || isChecking}
      >
        {isPending || isChecking ? (
          <Icon
            name={IconName.Loading}
            size={IconSize.Md}
            color={IconColor.PrimaryDefault}
          />
        ) : null}
        <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
          {visibleLabel}
        </Text>
      </button>
    );
  }, [
    address,
    hasError,
    isActive,
    isChecking,
    onClick,
    pending,
    pendingUpgradeTransaction,
    placement,
    t,
  ]);

  if (!address || !isSupportedKeyring || !isSupportedNetwork) {
    return null;
  }

  return content;
};
