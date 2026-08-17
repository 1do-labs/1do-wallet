import React from 'react';
import { CONNECT_HARDWARE_ROUTE } from '../../../helpers/constants/routes';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { SettingsSelectItem, SettingsTab } from '../shared';
import type { SettingItemConfig } from '../types';

const HardwareWalletsTab = () => {
  const t = useI18nContext();
  const items: SettingItemConfig[] = [
    {
      id: 'connect-hardware-wallet',
      component: () => (
        <SettingsSelectItem
          label={t('connectHardwareWallet')}
          value=""
          to={CONNECT_HARDWARE_ROUTE}
          dataTestId="connect-hardware-wallet-link"
        />
      ),
    },
  ];

  return (
    <SettingsTab
      subHeader={t('onedoHardwareWalletsDescription')}
      items={items}
    />
  );
};

export default HardwareWalletsTab;
