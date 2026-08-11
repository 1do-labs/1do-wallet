import React, { useCallback, useContext, useEffect, useMemo } from 'react';

import { type MultichainNetworkConfiguration } from '@metamask/multichain-network-controller';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlignItems,
  BlockSize,
  Display,
  FlexDirection,
  JustifyContent,
} from '../../../helpers/constants/design-system';
import {
  Box as BoxDeprecated,
  ButtonIcon,
  ButtonIconSize,
  IconName as IconNameDeprecated,
  PickerNetwork,
  Text,
} from '../../component-library';
import { MultichainTriggeredAddressRowsList } from '../../multichain-accounts/multichain-address-rows-triggered-list';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { AccountPicker } from '../account-picker';
import { GlobalMenuDrawerWithList } from '../global-menu-drawer';
import {
  getSelectedInternalAccount,
  getIsDefaultAddressEnabled,
  getTestNetworkBackgroundColor,
} from '../../../selectors';
// TODO: Remove restricted import
// eslint-disable-next-line import-x/no-restricted-paths
import { normalizeSafeAddress } from '../../../../app/scripts/lib/multichain/address';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';
import { ACCOUNT_LIST_PAGE_ROUTE } from '../../../helpers/constants/routes';
import { transitionForward } from '../../ui/transition';
import { setShowCopyAddressToast } from '../../../ducks/app/app';
import {
  getAccountListStats,
  getMultichainAccountGroupById,
  getSelectedAccountGroup,
} from '../../../selectors/multichain-accounts/account-tree';
import { trace, TraceName, TraceOperation } from '../../../../shared/lib/trace';
import { MultichainAccountNetworkGroupWithCopyIcon } from '../../multichain-accounts/multichain-account-network-group-with-copy-icon';
import type { AvatarGroupProps } from '../avatar-group/avatar-group.types';

type AppHeaderUnlockedContentProps = {
  currentNetwork?: MultichainNetworkConfiguration;
  networkIconSrc?: string;
  networkPickerLabel?: string;
  networkPickerAvatarGroupProps?: AvatarGroupProps;
  networkOpenCallback?: () => void;
  disableNetworkPicker?: boolean;
  disableAccountPicker: boolean;
  menuRef: React.RefObject<HTMLButtonElement>;
};

export const AppHeaderUnlockedContent = ({
  currentNetwork,
  networkIconSrc,
  networkPickerLabel,
  networkPickerAvatarGroupProps,
  networkOpenCallback,
  disableNetworkPicker,
  disableAccountPicker,
  menuRef,
}: AppHeaderUnlockedContentProps) => {
  const t = useI18nContext();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  // Derive from URL so drawer state survives route changes (e.g. homepage mount) without render>close>render flash
  const accountOptionsMenuOpen = searchParams.get('drawerOpen') === 'true';
  const selectedMultichainAccountId = useSelector(getSelectedAccountGroup);
  const selectedMultichainAccount = useSelector((state) =>
    getMultichainAccountGroupById(state, selectedMultichainAccountId),
  );
  const accountListStats = useSelector(getAccountListStats);
  const isDefaultAddressEnabled = useSelector(getIsDefaultAddressEnabled);
  const testNetworkBackgroundColor = useSelector(getTestNetworkBackgroundColor);

  // Used for account picker
  const internalAccount = useSelector(getSelectedInternalAccount);
  const accountName = selectedMultichainAccount?.metadata.name ?? '';

  // During onboarding there is no selected internal account
  const currentAddress = internalAccount?.address;

  // Passing non-evm address to checksum function will throw an error
  const normalizedCurrentAddress = currentAddress
    ? normalizeSafeAddress(currentAddress)
    : '';

  // useCopyToClipboard analysis: Copies a public address
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [copied, _, resetCopyState] = useCopyToClipboard({
    clearDelayMs: null,
  });

  const closeAccountOptionsMenu = useCallback(() => {
    setSearchParams((prev) => {
      prev.delete('drawerOpen');
      return prev;
    });
  }, [setSearchParams]);

  // Reset copy state when a switching accounts
  useEffect(() => {
    if (normalizedCurrentAddress) {
      resetCopyState();
    }
  }, [normalizedCurrentAddress, resetCopyState]);

  useEffect(() => {
    if (copied) {
      dispatch(setShowCopyAddressToast(true));
    } else {
      dispatch(setShowCopyAddressToast(false));
    }
  }, [copied, dispatch]);

  const handleMainMenuToggle = useCallback(() => {
    const isMenuOpen = !accountOptionsMenuOpen;

    setSearchParams((prev) => {
      if (isMenuOpen) {
        prev.set('drawerOpen', 'true');
      } else {
        prev.delete('drawerOpen');
      }
      return prev;
    });
  }, [accountOptionsMenuOpen, setSearchParams]);

  const multichainAccountAppContent = useMemo(() => {
    return (
      <BoxDeprecated style={{ overflow: 'hidden' }}>
        {/* Prevent overflow of account picker by long account names */}
        <Text
          as="div"
          display={Display.Flex}
          flexDirection={FlexDirection.Column}
          alignItems={AlignItems.flexStart}
          ellipsis
        >
          <AccountPicker
            address={''}
            name={accountName}
            showAvatarAccount={false}
            onClick={() => {
              trace({
                name: TraceName.ShowAccountList,
                op: TraceOperation.AccountUi,
              });
              transitionForward(() => navigate(ACCOUNT_LIST_PAGE_ROUTE));
            }}
            disabled={disableAccountPicker}
            paddingLeft={2}
            paddingRight={2}
          />
        </Text>
        {selectedMultichainAccountId && (
          <BoxDeprecated
            marginTop={1}
            marginLeft={2}
            style={{ width: 'fit-content' }}
            data-testid="networks-subtitle-test-id"
          >
            <MultichainTriggeredAddressRowsList
              groupId={selectedMultichainAccountId}
              showAccountHeaderAndBalance={false}
              onViewAllClick={() => {
                trace({
                  name: TraceName.ShowAccountAddressList,
                  op: TraceOperation.AccountUi,
                });
              }}
              showDefaultAddressSection={isDefaultAddressEnabled}
            >
              <MultichainAccountNetworkGroupWithCopyIcon
                groupId={selectedMultichainAccountId}
                alwaysDisplayAddress
              />
            </MultichainTriggeredAddressRowsList>
          </BoxDeprecated>
        )}
      </BoxDeprecated>
    );
  }, [
    accountName,
    disableAccountPicker,
    isDefaultAddressEnabled,
    selectedMultichainAccountId,
    navigate,
    accountListStats,
  ]);

  return (
    <>
      <BoxDeprecated
        display={Display.Flex}
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        className="min-w-0"
      >
        {multichainAccountAppContent}
      </BoxDeprecated>
      <BoxDeprecated
        display={Display.Flex}
        alignItems={AlignItems.center}
        justifyContent={JustifyContent.flexEnd}
        gap={2}
        style={{ marginLeft: 'auto' }}
      >
        <BoxDeprecated display={Display.Flex} gap={2}>
          <BoxDeprecated
            display={Display.Flex}
            justifyContent={JustifyContent.flexEnd}
            width={BlockSize.Full}
            style={{ position: 'relative' }}
          >
            <ButtonIcon
              ref={menuRef}
              iconName={IconNameDeprecated.Menu}
              data-testid="account-options-menu-button"
              ariaLabel={t('accountOptions')}
              onClick={handleMainMenuToggle}
              size={ButtonIconSize.Lg}
            />
          </BoxDeprecated>
        </BoxDeprecated>
        {currentNetwork && networkOpenCallback ? (
          <PickerNetwork
            avatarGroupProps={networkPickerAvatarGroupProps}
            avatarNetworkProps={{
              backgroundColor: testNetworkBackgroundColor,
              role: 'img',
              name: networkPickerLabel ?? currentNetwork.name,
            }}
            aria-label={`${t('networkMenu')} ${
              networkPickerLabel ?? currentNetwork.name
            }`}
            label={networkPickerLabel ?? currentNetwork.name}
            src={networkPickerAvatarGroupProps ? undefined : networkIconSrc}
            onClick={(event: React.MouseEvent<HTMLElement>) => {
              event.stopPropagation();
              event.preventDefault();
              networkOpenCallback();
            }}
            className="multichain-app-header__network-picker"
            data-testid="network-display"
            disabled={disableNetworkPicker}
          />
        ) : null}
        <GlobalMenuDrawerWithList
          anchorElement={menuRef.current}
          isOpen={accountOptionsMenuOpen}
          onClose={closeAccountOptionsMenu}
        />
      </BoxDeprecated>
    </>
  );
};
