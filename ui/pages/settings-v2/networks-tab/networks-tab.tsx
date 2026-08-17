import React from 'react';
import { ADD_NETWORK_ROUTE } from '../../../helpers/constants/routes';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { SettingsSelectItem, SettingsTab } from '../shared';
import type { SettingItemConfig } from '../types';

const NetworksTab = () => {
  const t = useI18nContext();
  const items: SettingItemConfig[] = [
    {
      id: 'add-network',
      component: () => (
        <SettingsSelectItem
          label={t('addNetwork')}
          value=""
          to={ADD_NETWORK_ROUTE}
          dataTestId="add-network-link"
        />
      ),
    },
  ];

  return (
    <SettingsTab
      subHeader={t('onedoNetworksSettingsDescription')}
      items={items}
    />
  );
};

export default NetworksTab;
