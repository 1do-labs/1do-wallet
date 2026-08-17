import React from 'react';
import { SettingItemConfig } from '../types';
import { SettingsTab, createToggleItem } from '../shared';
import {
  getOpenSeaEnabled,
  getPreferences,
  getUseCurrencyRateCheck,
  getUseNftDetection,
  getUseTokenDetection,
  getUseTransactionSimulations,
} from '../../../selectors';
import {
  setOpenSeaEnabled,
  setUse4ByteResolution,
  setUseCurrencyRateCheck,
  setUseExternalNameSources,
  setUseIndexedActivity,
  setUseMultiAccountBalanceChecker,
  setUseNftDetection,
  setUseSafeChainsListValidation,
  setSkipDeepLinkInterstitial,
  setUseTokenDetection,
  setUseTransactionSimulations,
  setUseVerifiedContractDecoding,
} from '../../../store/actions';
import type { MetaMaskReduxState } from '../../../store/store';
import { PRIVACY_ITEMS } from '../search-config';
import { BasicFunctionalityToggleItem } from './basic-functionality-item';
import { ThirdPartyApisItem } from './third-party-apis-item';
import { DownloadStateLogsItem } from './download-state-logs-item';
import { ExportYourDataItem } from './export-your-data-item';

const BatchAccountBalanceRequestsToggleItem = createToggleItem({
  name: 'BatchAccountBalanceRequestsToggleItem',
  titleKey: PRIVACY_ITEMS['batch-account-balance-requests'],
  descriptionKey: 'useMultiAccountBalanceCheckerSettingDescriptionV2',
  selector: (state: MetaMaskReduxState) =>
    state.metamask.useMultiAccountBalanceChecker,
  action: setUseMultiAccountBalanceChecker,
  dataTestId: 'batch-account-balance-requests-toggle',
});

const SkipLinkConfirmationToggleItem = createToggleItem({
  name: 'SkipLinkConfirmationToggleItem',
  titleKey: PRIVACY_ITEMS['skip-link-confirmation'],
  descriptionKey: 'skipLinkConfirmationScreensDescription',
  selector: (state: MetaMaskReduxState) =>
    Boolean(getPreferences(state).skipDeepLinkInterstitial),
  action: setSkipDeepLinkInterstitial,
  dataTestId: 'skip-link-confirmation-toggle',
});

const REMOTE_SERVICE_ITEMS: SettingItemConfig[] = [
  {
    id: 'indexed-activity',
    component: createToggleItem({
      name: 'IndexedActivityToggleItem',
      titleKey: 'indexedActivity',
      descriptionKey: 'indexedActivityDescription',
      selector: (state) => Boolean(state.metamask.useIndexedActivity),
      action: setUseIndexedActivity,
      dataTestId: 'indexed-activity-toggle',
    }),
  },
  {
    id: 'fiat-prices',
    component: createToggleItem({
      name: 'FiatPricesToggleItem',
      titleKey: 'fiatPrices',
      descriptionKey: 'fiatPricesDescription',
      selector: getUseCurrencyRateCheck,
      action: setUseCurrencyRateCheck,
      dataTestId: 'fiat-prices-toggle',
    }),
  },
  {
    id: 'transaction-simulation',
    component: createToggleItem({
      name: 'TransactionSimulationToggleItem',
      titleKey: 'transactionSimulation',
      descriptionKey: 'transactionSimulationPrivacyDescription',
      selector: getUseTransactionSimulations,
      action: setUseTransactionSimulations,
      dataTestId: 'transaction-simulation-toggle',
    }),
  },
  {
    id: 'verified-contract-decoding',
    component: createToggleItem({
      name: 'VerifiedContractDecodingToggleItem',
      titleKey: 'verifiedContractDecoding',
      descriptionKey: 'verifiedContractDecodingDescription',
      selector: (state) => Boolean(state.metamask.useVerifiedContractDecoding),
      action: setUseVerifiedContractDecoding,
      dataTestId: 'verified-contract-decoding-toggle',
    }),
  },
  {
    id: 'function-signature-lookup',
    component: createToggleItem({
      name: 'FunctionSignatureLookupToggleItem',
      titleKey: 'functionSignatureLookup',
      descriptionKey: 'functionSignatureLookupDescription',
      selector: (state) => Boolean(state.metamask.use4ByteResolution),
      action: setUse4ByteResolution,
      dataTestId: 'function-signature-lookup-toggle',
    }),
  },
  {
    id: 'address-labels',
    component: createToggleItem({
      name: 'AddressLabelsToggleItem',
      titleKey: 'externalAddressLabels',
      descriptionKey: 'externalAddressLabelsDescription',
      selector: (state) => Boolean(state.metamask.useExternalNameSources),
      action: setUseExternalNameSources,
      dataTestId: 'external-address-labels-toggle',
    }),
  },
  {
    id: 'network-metadata',
    component: createToggleItem({
      name: 'NetworkMetadataToggleItem',
      titleKey: 'networkMetadata',
      descriptionKey: 'networkMetadataDescription',
      selector: (state) => Boolean(state.metamask.useSafeChainsListValidation),
      action: setUseSafeChainsListValidation,
      dataTestId: 'network-metadata-toggle',
    }),
  },
  {
    id: 'token-detection',
    component: createToggleItem({
      name: 'TokenDetectionToggleItem',
      titleKey: 'autoDetectTokens',
      descriptionKey: 'autoDetectTokensDescriptionV2',
      selector: getUseTokenDetection,
      action: setUseTokenDetection,
      dataTestId: 'token-detection-toggle',
    }),
  },
  {
    id: 'nft-detection',
    component: createToggleItem({
      name: 'NftDetectionToggleItem',
      titleKey: 'useNftDetection',
      descriptionKey: 'useNftDetectionDescription',
      selector: getUseNftDetection,
      action: setUseNftDetection,
      dataTestId: 'nft-detection-toggle',
    }),
  },
  {
    id: 'nft-media',
    component: createToggleItem({
      name: 'NftMediaToggleItem',
      titleKey: 'displayNftMedia',
      descriptionKey: 'displayNftMediaDescriptionV2',
      selector: getOpenSeaEnabled,
      action: setOpenSeaEnabled,
      dataTestId: 'nft-media-toggle',
    }),
  },
];

/** Registry of setting items for the Privacy page. Add new items here */
const PRIVACY_SETTING_ITEMS: SettingItemConfig[] = [
  { id: 'basic-functionality', component: BasicFunctionalityToggleItem },
  { id: 'third-party-apis', component: ThirdPartyApisItem },
  ...REMOTE_SERVICE_ITEMS,
  {
    id: 'batch-account-balance-requests',
    component: BatchAccountBalanceRequestsToggleItem,
  },
  { id: 'skip-link-confirmation', component: SkipLinkConfirmationToggleItem },
  {
    id: 'download-state-logs',
    component: DownloadStateLogsItem,
    hasDividerBefore: true,
  },
  {
    id: 'export-your-data',
    component: ExportYourDataItem,
  },
];

const PrivacyTab = () => <SettingsTab items={PRIVACY_SETTING_ITEMS} />;

export default PrivacyTab;
