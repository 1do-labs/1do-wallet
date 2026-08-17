import React from 'react';
import {
  ACCOUNT_LIST_PAGE_ROUTE,
  ACCOUNT_IDENTICON_ROUTE,
  IMPORT_SRP_ROUTE,
  LANGUAGE_ROUTE,
  NEW_ACCOUNT_ROUTE,
  THEME_ROUTE,
} from '../../../helpers/constants/routes';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { SettingsSelectItem, SettingsTab } from '../shared';
import type { SettingItemConfig } from '../types';

const AccountsTab = () => {
  const t = useI18nContext();
  const items: SettingItemConfig[] = [
    {
      id: 'manage-accounts',
      component: () => (
        <SettingsSelectItem
          label={t('manageAccounts')}
          value=""
          to={ACCOUNT_LIST_PAGE_ROUTE}
          dataTestId="manage-accounts-link"
        />
      ),
    },
    {
      id: 'add-account',
      component: () => (
        <SettingsSelectItem
          label={t('addAccount')}
          value=""
          to={NEW_ACCOUNT_ROUTE}
          dataTestId="add-account-link"
        />
      ),
    },
    {
      id: 'import-wallet',
      component: () => (
        <SettingsSelectItem
          label={t('importWallet')}
          value=""
          to={IMPORT_SRP_ROUTE}
          dataTestId="import-wallet-link"
        />
      ),
    },
    {
      id: 'account-identicon',
      component: () => (
        <SettingsSelectItem
          label={t('accountIdenticon')}
          value=""
          to={ACCOUNT_IDENTICON_ROUTE}
        />
      ),
    },
    {
      id: 'language',
      component: () => (
        <SettingsSelectItem
          label={t('language')}
          value=""
          to={LANGUAGE_ROUTE}
        />
      ),
    },
    {
      id: 'theme',
      component: () => (
        <SettingsSelectItem label={t('theme')} value="" to={THEME_ROUTE} />
      ),
    },
  ];

  return <SettingsTab items={items} />;
};

export default AccountsTab;
