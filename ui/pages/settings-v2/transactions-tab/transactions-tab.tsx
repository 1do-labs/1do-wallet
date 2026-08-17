import React from 'react';
import { SettingItemConfig } from '../types';
import { SettingsTab, createToggleItem } from '../shared';
import { getPreferences } from '../../../selectors';
import {
  setDismissSmartAccountSuggestionEnabled,
  setFeatureFlag,
} from '../../../store/actions';
import type { MetaMaskReduxState } from '../../../store/store';
import { TRANSACTION_ITEMS } from '../search-config';

const SmartAccountRequestsFromDappsItem = createToggleItem({
  name: 'SmartAccountRequestsFromDappsItem',
  titleKey: TRANSACTION_ITEMS['smart-account-requests-from-dapps'],
  descriptionKey: 'smartAccountRequestsFromDappsDescription',
  selector: (state: MetaMaskReduxState) =>
    !getPreferences(state)?.dismissSmartAccountSuggestionEnabled,
  action: (value: boolean) => setDismissSmartAccountSuggestionEnabled(!value),
  dataTestId: 'transactions-smart-account-requests-toggle',
});

const ShowHexDataItem = createToggleItem({
  name: 'ShowHexDataItem',
  titleKey: TRANSACTION_ITEMS['show-hex-data'],
  descriptionKey: 'showHexDataDescription',

  selector: (state: MetaMaskReduxState) =>
    Boolean(state.metamask?.featureFlags?.sendHexData),

  action: (value: boolean) => setFeatureFlag('sendHexData', value, ''),
  dataTestId: 'transactions-show-hex-data-toggle',
  containerDataTestId: 'transactions-settings-hex-data-toggle',
});

const TRANSACTION_SETTING_ITEMS: SettingItemConfig[] = [
  {
    id: 'smart-account-requests-from-dapps',
    component: SmartAccountRequestsFromDappsItem,
  },
  { id: 'show-hex-data', component: ShowHexDataItem, hasDividerBefore: true },
];

const TransactionsTab = () => <SettingsTab items={TRANSACTION_SETTING_ITEMS} />;

export default TransactionsTab;
