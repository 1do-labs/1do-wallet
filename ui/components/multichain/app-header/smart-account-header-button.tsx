import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AvatarAccountSize,
  Box,
  ButtonIcon,
  ButtonIconSize,
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
import { PreferredAvatar } from '../../app/preferred-avatar';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { useEIP7702Account } from '../../../pages/confirmations/hooks/useEIP7702Account';
import { isAtomicBatchSupported } from '../../../store/controller-actions/transaction-controller';
import { getSelectedInternalAccount } from '../../../selectors';
import { getCurrentChainId } from '../../../../shared/lib/selectors/networks';
import { KEYRING_TYPES_SUPPORTING_7702 } from '../../../../shared/constants/keyring';
import { MULTICHAIN_SMART_ACCOUNT_PAGE_ROUTE } from '../../../helpers/constants/routes';

const ONE_DO_7702_DELEGATE = '0x69d2927735c3E57c512177B32e216431B1Aba1fF' as Hex;

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
          delegationAddress?.toLowerCase() === ONE_DO_7702_DELEGATE.toLowerCase();
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
  }, [address, isSupportedKeyring, pending, upgraded, navigate, upgradeAccount]);

  const content = useMemo(() => {
    if (upgraded && address) {
      return (
        <Box
          className="smart-account-header-button smart-account-header-button--upgraded"
          onClick={onClick}
          data-testid="smart-account-header-button"
        >
          <PreferredAvatar address={address} size={AvatarAccountSize.Sm} />
          <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
            1do
          </Text>
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
            size={ButtonIconSize.Md}
          />
        )}
        <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
          {t('smartAccount')}
        </Text>
      </Box>
    );
  }, [address, onClick, pending, t, upgraded]);

  if (!address || !isSupportedKeyring) {
    return null;
  }

  return content;
};
