import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  Box,
  ButtonIcon,
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
import { useI18nContext } from '../../../hooks/useI18nContext';
import { useEIP7702Account } from '../../../pages/confirmations/hooks/useEIP7702Account';
import { isAtomicBatchSupported } from '../../../store/controller-actions/transaction-controller';
import { getSelectedInternalAccount } from '../../../selectors';
import { getCurrentChainId } from '../../../../shared/lib/selectors/networks';
import { KEYRING_TYPES_SUPPORTING_7702 } from '../../../../shared/constants/keyring';
import { MULTICHAIN_SMART_ACCOUNT_PAGE_ROUTE } from '../../../helpers/constants/routes';

/* eslint-disable @metamask/design-tokens/color-no-hex */

const ONE_DO_7702_DELEGATE =
  '0x69d2927735c3E57c512177B32e216431B1Aba1fF' as Hex;

const OneDoWalletAvatar = () => {
  const maskId = useId();

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
        <mask id={maskId}>
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
        mask={`url(#${maskId})`}
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

export const SmartAccountHeaderButton = () => {
  const t = useI18nContext();
  const navigate = useNavigate();
  const selectedAccount = useSelector(getSelectedInternalAccount);
  const currentChainId = useSelector(getCurrentChainId);
  const address = selectedAccount?.address as Hex | undefined;
  const keyringType = selectedAccount?.metadata?.keyring?.type;

  const isSupportedKeyring = Boolean(
    keyringType &&
      KEYRING_TYPES_SUPPORTING_7702.includes(keyringType as KeyringTypes),
  );

  const { upgradeAccount } = useEIP7702Account({
    chainId: currentChainId,
  });
  const [upgraded, setUpgraded] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      if (!address || !isSupportedKeyring || !currentChainId) {
        if (!cancelled) {
          setUpgraded(false);
        }
        return;
      }

      try {
        const support = await isAtomicBatchSupported({
          address,
          chainIds: [currentChainId],
        });
        const currentChainSupport = support.find(
          ({ chainId }) => chainId === currentChainId,
        );
        const delegationAddress = currentChainSupport?.delegationAddress;
        const result =
          delegationAddress?.toLowerCase() ===
          ONE_DO_7702_DELEGATE.toLowerCase();
        if (!cancelled) {
          setUpgraded(result);
        }
      } catch {
        if (!cancelled) {
          setUpgraded(false);
        }
      }
    };

    checkStatus();

    return () => {
      cancelled = true;
    };
  }, [address, currentChainId, isSupportedKeyring]);

  const onClick = useCallback(async () => {
    if (!address || !isSupportedKeyring || pending) {
      return;
    }

    if (upgraded) {
      navigate(
        `${MULTICHAIN_SMART_ACCOUNT_PAGE_ROUTE}/${encodeURIComponent(address)}`,
      );
      return;
    }

    setPending(true);
    try {
      await upgradeAccount(address, ONE_DO_7702_DELEGATE);
    } finally {
      setPending(false);
    }
  }, [
    address,
    isSupportedKeyring,
    pending,
    upgraded,
    navigate,
    upgradeAccount,
  ]);

  const content = useMemo(() => {
    if (upgraded && address) {
      return (
        <Box
          className="smart-account-header-logo"
          onClick={onClick}
          data-testid="smart-account-header-button"
        >
          <OneDoWalletAvatar />
        </Box>
      );
    }

    return (
      <Box
        className="smart-account-header-button"
        onClick={onClick}
        data-testid="smart-account-header-button"
      >
        {pending ? (
          <Icon
            name={IconName.Loading}
            size={IconSize.Md}
            color={IconColor.PrimaryDefault}
          />
        ) : (
          <ButtonIcon
            ariaLabel={t('smartAccount')}
            iconName={IconName.UserCircleAdd}
            className="smart-account-header-button__icon"
          />
        )}
        <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
          Smart
        </Text>
      </Box>
    );
  }, [address, onClick, pending, t, upgraded]);

  if (!address || !isSupportedKeyring) {
    return null;
  }

  return content;
};
