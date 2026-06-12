import React, { useCallback, useContext, useMemo, useState } from 'react';
import { AccountGroupId, AccountWalletId } from '@metamask/account-api';
import { useSelector } from 'react-redux';
import classnames from 'clsx';
import { useI18nContext } from '../../../../hooks/useI18nContext';
import {
  IconName,
  ButtonIcon,
  ButtonIconSize,
  ButtonSecondary,
  ButtonSecondarySize,
} from '../../../component-library';

import {
  BackgroundColor,
  TextVariant,
} from '../../../../helpers/constants/design-system';
import {
  MetaMetricsEventCategory,
  MetaMetricsEventName,
} from '../../../../../shared/constants/metametrics';
import { MetaMetricsContext } from '../../../../contexts/metametrics';
import { MultichainAccountList } from '../../multichain-account-list';
import { getAccountTree } from '../../../../selectors/multichain-accounts/account-tree';
import { AccountGroupWithInternalAccounts } from '../../../../selectors/multichain-accounts/account-tree.types';
import { Footer, Header, Page } from '../../../multichain/pages/page';
import { extractWalletIdFromGroupId } from '../../../../selectors/multichain-accounts/utils';
import { ScrollContainer } from '../../../../contexts/scroll-container';

type MultichainEditAccountsPageProps = {
  title?: string;
  confirmButtonText?: string;
  defaultSelectedAccountGroups: AccountGroupId[];
  supportedAccountGroups: AccountGroupWithInternalAccounts[];
  onSubmit: (accountGroups: AccountGroupId[]) => void;
  onClose: () => void;
};

export const MultichainEditAccountsPage: React.FC<
  MultichainEditAccountsPageProps
> = ({
  title,
  confirmButtonText,
  defaultSelectedAccountGroups,
  supportedAccountGroups,
  onSubmit,
  onClose,
}) => {
  const t = useI18nContext();
  const { trackEvent } = useContext(MetaMetricsContext);
  const [selectedAccountGroups, setSelectedAccountGroups] = useState(
    defaultSelectedAccountGroups,
  );
  const accountTree = useSelector(getAccountTree);

  const walletsWithSupportedAccountGroups = useMemo(() => {
    const walletMap = new Map();

    // Build wallets from scratch using only supported account groups
    supportedAccountGroups.forEach((group) => {
      const walletId = extractWalletIdFromGroupId(group.id);
      const walletIdTyped = walletId as AccountWalletId;
      const wallet = accountTree.wallets[walletIdTyped];

      if (wallet) {
        if (!walletMap.has(walletId)) {
          walletMap.set(walletId, {
            id: wallet.id,
            type: wallet.type,
            metadata: wallet.metadata,
            groups: {},
          });
        }
        walletMap.get(walletId).groups[group.id] = group;
      }
    });

    return Object.fromEntries(walletMap);
  }, [accountTree.wallets, supportedAccountGroups]);

  const handleAccountClick = useCallback(
    (accountGroupId: AccountGroupId) => {
      if (selectedAccountGroups.includes(accountGroupId)) {
        // Remove item if it exists
        setSelectedAccountGroups(
          selectedAccountGroups.filter((id) => id !== accountGroupId),
        );
      } else {
        // Add item if it doesn't exist
        setSelectedAccountGroups([...selectedAccountGroups, accountGroupId]);
      }
    },
    [selectedAccountGroups],
  );

  const handleConnect = useCallback(() => {
    const defaultSet = new Set(defaultSelectedAccountGroups);
    const selectedSet = new Set(selectedAccountGroups);

    const addedAccounts = selectedAccountGroups.filter(
      (accountGroup) => !defaultSet.has(accountGroup),
    );
    const removedAccounts = defaultSelectedAccountGroups.filter(
      (accountGroup) => !selectedSet.has(accountGroup),
    );

    onSubmit(selectedAccountGroups);
    trackEvent({
      category: MetaMetricsEventCategory.Permissions,
      event: MetaMetricsEventName.UpdatePermissionedAccounts,
      properties: {
        addedAccounts: addedAccounts.length,
        removedAccounts: removedAccounts.length,
        location: 'Edit Accounts Modal',
      },
    });
  }, [
    selectedAccountGroups,
    defaultSelectedAccountGroups,
    onSubmit,
    trackEvent,
  ]);

  return (
    <Page
      data-testid="modal-page"
      className={classnames(
        'main-container',
        'connect-page',
        'multichain-edit-accounts-page',
      )}
      backgroundColor={BackgroundColor.backgroundDefault}
    >
      <Header
        textProps={{
          variant: TextVariant.headingSm,
        }}
        startAccessory={
          <ButtonIcon
            size={ButtonIconSize.Md}
            ariaLabel={t('back')}
            iconName={IconName.ArrowLeft}
            onClick={onClose}
            data-testid="back-button"
          />
        }
      >
        {title ?? t('editAccounts')}
      </Header>
      <ScrollContainer className="flex-1 px-4 overflow-y-auto">
        <MultichainAccountList
          wallets={walletsWithSupportedAccountGroups}
          selectedAccountGroups={selectedAccountGroups}
          handleAccountClick={handleAccountClick}
          showAccountCheckbox={true}
        />
      </ScrollContainer>
      <Footer className="multichain-edit-accounts-page__footer">
        <ButtonSecondary
          data-testid="connect-more-accounts-button"
          onClick={handleConnect}
          size={ButtonSecondarySize.Lg}
          block
        >
          {confirmButtonText ?? t('connect')}
        </ButtonSecondary>
      </Footer>
    </Page>
  );
};
