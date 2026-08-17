import React from 'react';
import { RuntimeTools } from '../../../components/multichain/account-overview/runtime-tools';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { SettingsTab } from '../shared';
import type { SettingItemConfig } from '../types';

const RuntimeTab = () => {
  const t = useI18nContext();
  const items: SettingItemConfig[] = [
    {
      id: 'runtime-account',
      component: () => (
        <div className="px-4 py-3">
          <RuntimeTools />
        </div>
      ),
    },
  ];

  return (
    <SettingsTab
      subHeader={t('onedoRuntimeSettingsDescription')}
      items={items}
    />
  );
};

export default RuntimeTab;
