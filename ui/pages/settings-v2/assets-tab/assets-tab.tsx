import React from 'react';
import { SettingItemConfig } from '../types';
import { SettingsTab, createToggleItem } from '../shared';
import {
  getShouldHideZeroBalanceTokens,
  getShowNativeTokenAsMainBalance,
} from '../../../selectors';
import {
  setHideZeroBalanceTokens,
  setShowNativeTokenAsMainBalancePreference,
} from '../../../store/actions';
import { ASSET_ITEMS } from '../search-config';
import { LocalCurrencyItem } from './local-currency-item';

const ShowNetworkTokenToggleItem = createToggleItem({
  name: 'ShowNetworkTokenToggleItem',
  titleKey: ASSET_ITEMS['show-network-token'],
  selector: getShowNativeTokenAsMainBalance,
  action: setShowNativeTokenAsMainBalancePreference,
  dataTestId: 'show-native-token-as-main-balance',
  containerDataTestId: 'show-native-token-as-main-balance-toggle',
});

const HideZeroBalanceTokensToggleItem = createToggleItem({
  name: 'HideZeroBalanceTokensToggleItem',
  titleKey: ASSET_ITEMS['hide-zero-balance-tokens'],
  selector: getShouldHideZeroBalanceTokens,
  action: setHideZeroBalanceTokens,
  dataTestId: 'toggle-zero-balance-button',
});

/** Registry of setting items for the Assets page. Add new items here */
const ASSET_SETTING_ITEMS: SettingItemConfig[] = [
  { id: 'local-currency', component: LocalCurrencyItem },
  { id: 'show-network-token', component: ShowNetworkTokenToggleItem },
  {
    id: 'hide-zero-balance-tokens',
    component: HideZeroBalanceTokensToggleItem,
    hasDividerBefore: true,
  },
];

const AssetsTab = () => {
  return <SettingsTab items={ASSET_SETTING_ITEMS} />;
};

export default AssetsTab;
