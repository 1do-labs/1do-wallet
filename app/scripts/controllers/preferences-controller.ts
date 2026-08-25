import {
  AccountsControllerGetAccountByAddressAction,
  AccountsControllerSetAccountNameAction,
} from '@metamask/accounts-controller';
import {
  BaseController,
  ControllerGetStateAction,
  ControllerStateChangeEvent,
  StateMetadata,
} from '@metamask/base-controller';
import type { Messenger } from '@metamask/messenger';
import { type PreferencesState } from '@metamask/preferences-controller';
import { IPFS_DEFAULT_GATEWAY_URL } from '../../../shared/constants/network';
import { LedgerTransportTypes } from '../../../shared/constants/hardware-wallets';
import {
  DEFAULT_AUTO_LOCK_TIME_LIMIT,
  ThemeType,
} from '../../../shared/constants/preferences';
import { type DefaultAddressScope } from '../../../shared/constants/default-address';
import { FALLBACK_LOCALE } from '../../../shared/lib/i18n';
import { PreferencesControllerMethodActions } from './preferences-controller-method-action-types';

const controllerName = 'PreferencesController';

/**
 * Returns the state of the {@link PreferencesController}.
 */
export type PreferencesControllerGetStateAction = ControllerGetStateAction<
  typeof controllerName,
  PreferencesControllerState
>;

/**
 * Actions exposed by the {@link PreferencesController}.
 */
export type PreferencesControllerActions =
  | PreferencesControllerGetStateAction
  | PreferencesControllerMethodActions;

/**
 * Event emitted when the state of the {@link PreferencesController} changes.
 */
export type PreferencesControllerStateChangeEvent = ControllerStateChangeEvent<
  typeof controllerName,
  PreferencesControllerState
>;

/**
 * Events emitted by {@link PreferencesController}.
 */
export type PreferencesControllerEvents = PreferencesControllerStateChangeEvent;

/**
 * Actions that this controller is allowed to call.
 */
export type AllowedActions =
  | AccountsControllerGetAccountByAddressAction
  | AccountsControllerSetAccountNameAction;

export type PreferencesControllerMessenger = Messenger<
  typeof controllerName,
  PreferencesControllerActions | AllowedActions,
  PreferencesControllerEvents
>;

type PreferencesControllerOptions = {
  state?: Partial<PreferencesControllerState>;
  messenger: PreferencesControllerMessenger;
};

export type Preferences = {
  autoLockTimeLimit?: number;
  avatarType?: 'maskicon' | 'jazzicon' | 'blockies';
  defaultAddressScope: DefaultAddressScope;
  dismissSmartAccountSuggestionEnabled: boolean;
  featureNotificationsEnabled: boolean;
  hideZeroBalanceTokens: boolean;
  privacyMode: boolean;
  showConfirmationAdvancedDetails: boolean;
  showDefaultAddress: boolean;
  showExtensionInFullSizeView: boolean;
  showFiatInTestnets: boolean;
  showMultiRpcModal: boolean;
  showNativeTokenAsMainBalance: boolean;
  showTestNetworks: boolean;
  skipDeepLinkInterstitial: boolean;
  tokenNetworkFilter: Record<string, boolean>;
  tokenSortConfig: {
    key: string;
    order: string;
    sortCallback: string;
  };
  useNativeCurrencyAsPrimaryCurrency: boolean;
  useSidePanelAsDefault?: boolean;
};

// Omitting properties that already exist in the PreferencesState, as part of the preferences property.
export type PreferencesControllerState = Omit<
  PreferencesState,
  | 'displayNftMedia'
  | 'showTestNetworks'
  | 'privacyMode'
  | 'tokenSortConfig'
  | 'showMultiRpcModal'
  | 'dismissSmartAccountSuggestionEnabled'
  | 'smartAccountOptIn'
  | 'showIncomingTransactions'
  | 'securityAlertsEnabled'
  | 'smartTransactionsOptInStatus'
  | 'tokenNetworkFilter'
> & {
  advancedGasFee: Record<string, Record<string, string>>;
  currentLocale: string;
  dismissSeedBackUpReminder: boolean;
  enableMV3TimestampSave: boolean;
  forgottenPassword: boolean;
  knownMethodData: Record<string, string>;
  ledgerTransportType: LedgerTransportTypes;
  openSeaEnabled: boolean;
  overrideContentSecurityPolicyHeader: boolean;
  preferences: Preferences;
  textDirection?: string;
  theme: ThemeType;
  use4ByteResolution: boolean;
  useAddressBarEnsResolution: boolean;
  useCurrencyRateCheck: boolean;
  useExternalNameSources: boolean;
  useExternalServices: boolean;
  useIndexedActivity: boolean;
  useVerifiedContractDecoding: boolean;
  isMultiAccountBalancesEnabled: boolean;
  useMultiAccountBalanceChecker: boolean;
  usePhishDetect: boolean;
  showSidePanelMigrationToast: boolean;
};

/**
 * Function to get default state of the {@link PreferencesController}.
 */
export const getDefaultPreferencesControllerState =
  (): PreferencesControllerState => ({
    advancedGasFee: {},
    currentLocale: '',
    dismissSeedBackUpReminder: false,
    enableMV3TimestampSave: true,
    featureFlags: {},
    forgottenPassword: false,
    // ENS decentralized website resolution
    ipfsGateway: IPFS_DEFAULT_GATEWAY_URL,
    isIpfsGatewayEnabled: true,
    knownMethodData: {},
    // Ledger transport type is deprecated. We currently only support webhid
    // on chrome, and u2f on firefox.
    ledgerTransportType: window.navigator.hid
      ? LedgerTransportTypes.webhid
      : LedgerTransportTypes.u2f,
    openSeaEnabled: true,
    overrideContentSecurityPolicyHeader: true,
    preferences: {
      autoLockTimeLimit: undefined,
      avatarType: 'maskicon',
      dismissSmartAccountSuggestionEnabled: false,
      featureNotificationsEnabled: false,
      hideZeroBalanceTokens: false,
      privacyMode: false,
      showConfirmationAdvancedDetails: false,
      showDefaultAddress: true,
      defaultAddressScope: 'eip155',
      showExtensionInFullSizeView: false,
      showFiatInTestnets: false,
      showMultiRpcModal: false,
      showNativeTokenAsMainBalance: false,
      showTestNetworks: true,
      skipDeepLinkInterstitial: false,
      tokenNetworkFilter: {},
      tokenSortConfig: {
        key: 'tokenFiatAmount',
        order: 'dsc',
        sortCallback: 'stringNumeric',
      },
      useNativeCurrencyAsPrimaryCurrency: true,
      useSidePanelAsDefault: true,
    },
    showSidePanelMigrationToast: false,
    theme: ThemeType.os,
    use4ByteResolution: true,
    useAddressBarEnsResolution: true,
    useCurrencyRateCheck: true,
    useExternalNameSources: true,
    // Default this fork to local-first behavior. Remote-backed features stay
    // off unless the user explicitly re-enables them.
    useExternalServices: false,
    useIndexedActivity: true,
    useVerifiedContractDecoding: true,
    // from core PreferencesController
    isMultiAccountBalancesEnabled: true,
    useMultiAccountBalanceChecker: true,
    useNftDetection: true,
    usePhishDetect: true,
    useSafeChainsListValidation: true,
    // set to true means the dynamic list from the API is being used
    // set to false will be using the static list from contract-metadata
    useTokenDetection: true,
    useTransactionSimulations: true,
  });

/**
 * {@link PreferencesController}'s metadata.
 *
 * This allows us to choose if fields of the state should be persisted or not
 * using the `persist` flag; and if they can appear in diagnostic snapshots, using
 * the `anonymous` flag.
 */
const controllerMetadata: StateMetadata<PreferencesControllerState> = {
  advancedGasFee: {
    persist: true,
    includeInStateLogs: true,
    includeInDebugSnapshot: true,
    usedInUi: true,
  },
  currentLocale: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: true,
    usedInUi: true,
  },
  dismissSeedBackUpReminder: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: true,
    usedInUi: true,
  },
  enableMV3TimestampSave: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: true,
    usedInUi: true,
  },
  featureFlags: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: true,
    usedInUi: true,
  },
  forgottenPassword: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: true,
    usedInUi: true,
  },
  ipfsGateway: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  isIpfsGatewayEnabled: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  knownMethodData: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  ledgerTransportType: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: true,
    usedInUi: true,
  },
  openSeaEnabled: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: true,
    usedInUi: true,
  },
  overrideContentSecurityPolicyHeader: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: true,
    usedInUi: true,
  },
  preferences: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: true,
    usedInUi: true,
  },
  showSidePanelMigrationToast: {
    includeInStateLogs: false,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  textDirection: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  theme: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: true,
    usedInUi: true,
  },
  use4ByteResolution: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: true,
    usedInUi: true,
  },
  useAddressBarEnsResolution: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: true,
    usedInUi: true,
  },
  useCurrencyRateCheck: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: true,
    usedInUi: true,
  },
  useExternalNameSources: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  useExternalServices: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  useIndexedActivity: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  useVerifiedContractDecoding: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: true,
    usedInUi: true,
  },
  isMultiAccountBalancesEnabled: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: true,
    usedInUi: true,
  },
  useMultiAccountBalanceChecker: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: true,
    usedInUi: true,
  },
  useNftDetection: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: true,
    usedInUi: true,
  },
  usePhishDetect: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: true,
    usedInUi: true,
  },
  useSafeChainsListValidation: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  useTokenDetection: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: true,
    usedInUi: true,
  },
  useTransactionSimulations: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: true,
    usedInUi: true,
  },
};

const MESSENGER_EXPOSED_METHODS = [
  'setPasswordForgotten',
  'setUsePhishDetect',
  'setUseMultiAccountBalanceChecker',
  'setUseSafeChainsListValidation',
  'toggleExternalServices',
  'setUseTokenDetection',
  'setUseNftDetection',
  'setUse4ByteResolution',
  'setUseCurrencyRateCheck',
  'setOpenSeaEnabled',
  'setUseExternalNameSources',
  'setUseIndexedActivity',
  'setUseVerifiedContractDecoding',
  'setUseTransactionSimulations',
  'setAdvancedGasFee',
  'setTheme',
  'addKnownMethodData',
  'setCurrentLocale',
  'setAccountLabel',
  'setFeatureFlag',
  'setPreference',
  'getPreferences',
  'getIpfsGateway',
  'setIpfsGateway',
  'setIsIpfsGatewayEnabled',
  'setUseAddressBarEnsResolution',
  'setLedgerTransportPreference',
  'setDismissSeedBackUpReminder',
  'setOverrideContentSecurityPolicyHeader',
  'setServiceWorkerKeepAlivePreference',
  'setUseSidePanelAsDefault',
  'setShowDefaultAddress',
  'setDefaultAddressScope',
  'resetState',
] as const;

export class PreferencesController extends BaseController<
  typeof controllerName,
  PreferencesControllerState,
  PreferencesControllerMessenger
> {
  /**
   * Constructs a Preferences controller.
   *
   * @param options - the controller options
   * @param options.messenger - The controller messenger
   * @param options.state - The initial controller state
   */
  constructor({ messenger, state }: PreferencesControllerOptions) {
    const defaultState = getDefaultPreferencesControllerState();

    const mergedState = {
      ...defaultState,
      ...state,
      preferences: {
        ...defaultState.preferences,
        ...state?.preferences,
      },
      // TODO - These two properties are the same, we only need isMultiAccountBalancesEnabled to keep it compatible with core PreferencesController
      // At some point we should completely remove all references and methods for useMultiAccountBalanceChecker and use isMultiAccountBalancesEnabled instead.
      isMultiAccountBalancesEnabled:
        state?.useMultiAccountBalanceChecker ??
        defaultState.isMultiAccountBalancesEnabled,
    };

    super({
      messenger,
      metadata: controllerMetadata,
      name: controllerName,
      state: mergedState,
    });

    globalThis.setPreference = (key: keyof Preferences, value: boolean) => {
      return this.setFeatureFlag(key, value);
    };

    this.messenger.registerMethodActionHandlers(
      this,
      MESSENGER_EXPOSED_METHODS,
    );
  }

  /**
   * Sets the {@code forgottenPassword} state property
   *
   * @param forgottenPassword - whether or not the user has forgotten their password
   */
  setPasswordForgotten(forgottenPassword: boolean): void {
    this.update((state) => {
      state.forgottenPassword = forgottenPassword;
    });
  }

  /**
   * Setter for the `usePhishDetect` property
   *
   * @param val - Whether or not the user prefers phishing domain protection
   */
  setUsePhishDetect(val: boolean): void {
    this.update((state) => {
      state.usePhishDetect = val;
    });
  }

  /**
   * Setter for the `useMultiAccountBalanceChecker` property
   *
   * @param val - Whether or not the user prefers to turn off/on all security settings
   */
  setUseMultiAccountBalanceChecker(val: boolean): void {
    this.update((state) => {
      state.useMultiAccountBalanceChecker = val;
      state.isMultiAccountBalancesEnabled = val;
    });
  }

  /**
   * Setter for the `useSafeChainsListValidation` property
   *
   * @param val - Whether or not the user prefers to turn off/on validation for manually adding networks
   */
  setUseSafeChainsListValidation(val: boolean): void {
    this.update((state) => {
      state.useSafeChainsListValidation = val;
    });
  }

  toggleExternalServices(useExternalServices: boolean): void {
    const nextValue = Boolean(useExternalServices);

    this.update((state) => {
      state.useExternalServices = nextValue;
    });
    this.setUseTokenDetection(nextValue);
    this.setUseCurrencyRateCheck(nextValue);
    this.setUsePhishDetect(nextValue);
    this.setUseAddressBarEnsResolution(nextValue);
    this.setOpenSeaEnabled(nextValue);
    this.setUseNftDetection(nextValue);
    this.setUseSafeChainsListValidation(nextValue);
    this.setUseIndexedActivity(nextValue);
    this.setUseVerifiedContractDecoding(nextValue);
  }

  /**
   * Setter for the `useTokenDetection` property
   *
   * @param val - Whether or not the user prefers to use the static token list or dynamic token list from the API
   */
  setUseTokenDetection(val: boolean): void {
    this.update((state) => {
      state.useTokenDetection = val;
    });
  }

  /**
   * Setter for the `useNftDetection` property
   *
   * @param useNftDetection - Whether or not the user prefers to autodetect NFTs.
   */
  setUseNftDetection(useNftDetection: boolean): void {
    this.update((state) => {
      state.useNftDetection = useNftDetection;
    });
  }

  /**
   * Setter for the `use4ByteResolution` property
   *
   * @param use4ByteResolution - (Privacy) Whether or not the user prefers to have smart contract name details resolved with 4byte.directory
   */
  setUse4ByteResolution(use4ByteResolution: boolean): void {
    this.update((state) => {
      state.use4ByteResolution = use4ByteResolution;
    });
  }

  /**
   * Setter for the `useCurrencyRateCheck` property
   *
   * @param val - Whether or not the user prefers to use currency rate check for ETH and tokens.
   */
  setUseCurrencyRateCheck(val: boolean): void {
    this.update((state) => {
      state.useCurrencyRateCheck = val;
    });
  }

  /**
   * Setter for the `openSeaEnabled` property
   *
   * @param openSeaEnabled - Whether or not the user prefers to use the OpenSea API for NFTs data.
   */
  setOpenSeaEnabled(openSeaEnabled: boolean): void {
    this.update((state) => {
      state.openSeaEnabled = openSeaEnabled;
    });
  }

  /**
   * Setter for the `useExternalNameSources` property
   *
   * @param useExternalNameSources - Whether or not to use external name providers in the name controller.
   */
  setUseExternalNameSources(useExternalNameSources: boolean): void {
    this.update((state) => {
      state.useExternalNameSources = useExternalNameSources;
    });
  }

  /**
   * Enables indexed Activity requests to configured Alchemy RPC endpoints.
   * @param useIndexedActivity
   */
  setUseIndexedActivity(useIndexedActivity: boolean): void {
    this.update((state) => {
      state.useIndexedActivity = useIndexedActivity;
    });
  }

  /**
   * Enables verified ABI lookups through Sourcify.
   * @param useVerifiedContractDecoding
   */
  setUseVerifiedContractDecoding(useVerifiedContractDecoding: boolean): void {
    this.update((state) => {
      state.useVerifiedContractDecoding = useVerifiedContractDecoding;
    });
  }

  /**
   * Setter for the `useTransactionSimulations` property
   *
   * @param useTransactionSimulations - Whether or not to use simulations in the transaction confirmations.
   */
  setUseTransactionSimulations(useTransactionSimulations: boolean): void {
    this.update((state) => {
      state.useTransactionSimulations = useTransactionSimulations;
    });
  }

  /**
   * Setter for the `advancedGasFee` property
   *
   * @param options
   * @param options.chainId - The chainId the advancedGasFees should be set on
   * @param options.gasFeePreferences - The advancedGasFee options to set
   */
  setAdvancedGasFee({
    chainId,
    gasFeePreferences,
  }: {
    chainId: string;
    gasFeePreferences: Record<string, string>;
  }): void {
    const { advancedGasFee } = this.state;
    this.update((state) => {
      state.advancedGasFee = {
        ...advancedGasFee,
        [chainId]: gasFeePreferences,
      };
    });
  }

  /**
   * Setter for the `theme` property
   *
   * @param val - 'default' or 'dark' value based on the mode selected by user.
   */
  setTheme(val: ThemeType): void {
    this.update((state) => {
      state.theme = val;
    });
  }

  /**
   * Add new methodData to state, to avoid requesting this information again through Infura
   *
   * @param fourBytePrefix - Four-byte method signature
   * @param methodData - Corresponding data method
   */
  addKnownMethodData(fourBytePrefix: string, methodData: string): void {
    const { knownMethodData } = this.state;

    const updatedKnownMethodData = { ...knownMethodData };
    updatedKnownMethodData[fourBytePrefix] = methodData;

    this.update((state) => {
      state.knownMethodData = updatedKnownMethodData;
    });
  }

  /**
   * Setter for the `currentLocale` property
   *
   * @param key - he preferred language locale key
   */
  setCurrentLocale(key: string): string {
    const textDirection = ['ar', 'dv', 'fa', 'he', 'ku'].includes(key)
      ? 'rtl'
      : 'auto';
    this.update((state) => {
      state.currentLocale = key;
      state.textDirection = textDirection;
    });
    return textDirection;
  }

  /**
   * Sets a custom label for an account
   *
   * @deprecated - Use setAccountName from the AccountsController
   * @param address - the account to set a label for
   * @param label - the custom label for the account
   * @returns the account label
   */
  setAccountLabel(address: string, label: string): string | undefined {
    if (!address) {
      throw new Error(
        `setAccountLabel requires a valid address, got ${String(address)}`,
      );
    }

    const account = this.messenger.call(
      'AccountsController:getAccountByAddress',
      address,
    );
    if (account) {
      this.messenger.call(
        'AccountsController:setAccountName',
        account.id,
        label,
      );

      return label;
    }

    return undefined;
  }

  /**
   * Updates the `featureFlags` property, which is an object. One property within that object will be set to a boolean.
   *
   * @param feature - A key that corresponds to a UI feature.
   * @param activated - Indicates whether or not the UI feature should be displayed
   * @returns the updated featureFlags object.
   */
  setFeatureFlag(feature: string, activated: boolean): Record<string, boolean> {
    const currentFeatureFlags = this.state.featureFlags;
    const updatedFeatureFlags = {
      ...currentFeatureFlags,
      [feature]: activated,
    };

    this.update((state) => {
      state.featureFlags = updatedFeatureFlags;
    });
    return updatedFeatureFlags;
  }

  /**
   * Updates the `preferences` property, which is an object. These are user-controlled features
   * found in the settings page.
   *
   * @param preference - The preference to enable or disable.
   * @param value - Indicates whether or not the preference should be enabled or disabled.
   * @returns Promises a updated Preferences object.
   */
  setPreference(
    preference: keyof Preferences,
    value: Preferences[typeof preference],
  ): Preferences {
    const currentPreferences = this.getPreferences();
    let updatedPreferences: Preferences = {
      ...currentPreferences,
      [preference]: value,
    };

    // Full-screen and default side panel are mutually exclusive. Disabling
    // full-screen restores side panel as the default extension entry point.
    switch (preference) {
      case 'showExtensionInFullSizeView':
        updatedPreferences = {
          ...updatedPreferences,
          useSidePanelAsDefault: !value,
        };
        break;
      case 'useSidePanelAsDefault':
        if (value) {
          updatedPreferences = {
            ...updatedPreferences,
            showExtensionInFullSizeView: false,
          };
        }
        break;
      default:
        break;
    }

    this.update((state) => {
      state.preferences = updatedPreferences;
    });
    return updatedPreferences;
  }

  /**
   * A getter for the `preferences` property
   *
   * @returns A map of user-selected preferences.
   */
  getPreferences(): Preferences {
    return this.state.preferences;
  }

  /**
   * A getter for the `ipfsGateway` property
   *
   * @returns The current IPFS gateway domain
   */
  getIpfsGateway(): string {
    return this.state.ipfsGateway;
  }

  /**
   * A setter for the `ipfsGateway` property
   *
   * @param domain - The new IPFS gateway domain
   * @returns the update IPFS gateway domain
   */
  setIpfsGateway(domain: string): string {
    this.update((state) => {
      state.ipfsGateway = domain;
    });
    return domain;
  }

  /**
   * A setter for the `isIpfsGatewayEnabled` property
   *
   * @param enabled - Whether or not IPFS is enabled
   */
  setIsIpfsGatewayEnabled(enabled: boolean): void {
    this.update((state) => {
      state.isIpfsGatewayEnabled = enabled;
    });
  }

  /**
   * A setter for the `useAddressBarEnsResolution` property
   *
   * @param useAddressBarEnsResolution - Whether or not user prefers IPFS resolution for domains
   */
  setUseAddressBarEnsResolution(useAddressBarEnsResolution: boolean): void {
    this.update((state) => {
      state.useAddressBarEnsResolution = useAddressBarEnsResolution;
    });
  }

  /**
   * A setter for the `ledgerTransportType` property.
   *
   * @deprecated We no longer support specifying a ledger transport type other
   * than webhid, therefore managing a preference is no longer necessary.
   * @param ledgerTransportType - 'webhid'
   * @returns The transport type that was set.
   */
  setLedgerTransportPreference(
    ledgerTransportType: LedgerTransportTypes,
  ): string {
    this.update((state) => {
      state.ledgerTransportType = ledgerTransportType;
    });
    return ledgerTransportType;
  }

  /**
   * A setter for the user preference to dismiss the seed phrase backup reminder
   *
   * @param dismissSeedBackUpReminder - User preference for dismissing the back up reminder.
   */
  setDismissSeedBackUpReminder(dismissSeedBackUpReminder: boolean): void {
    this.update((state) => {
      state.dismissSeedBackUpReminder = dismissSeedBackUpReminder;
    });
  }

  /**
   * A setter for the user preference to override the Content-Security-Policy header
   *
   * @param overrideContentSecurityPolicyHeader - User preference for overriding the Content-Security-Policy header.
   */
  setOverrideContentSecurityPolicyHeader(
    overrideContentSecurityPolicyHeader: boolean,
  ): void {
    this.update((state) => {
      state.overrideContentSecurityPolicyHeader =
        overrideContentSecurityPolicyHeader;
    });
  }

  setServiceWorkerKeepAlivePreference(value: boolean): void {
    this.update((state) => {
      state.enableMV3TimestampSave = value;
    });
  }

  setUseSidePanelAsDefault(value: boolean): void {
    this.setPreference('useSidePanelAsDefault', value);
  }

  setShowDefaultAddress(value: boolean): void {
    this.update((state) => {
      state.preferences.showDefaultAddress = value;
    });
  }

  setDefaultAddressScope(value: DefaultAddressScope): void {
    this.update((state) => {
      state.preferences.defaultAddressScope = value;
    });
  }

  dismissSidePanelMigrationToast(): void {
    this.update((state) => {
      state.showSidePanelMigrationToast = false;
    });
  }

  /**
   * Resets the preferences state to the default values.
   * This is used when the wallet is reset during the "Forgot Password" flow.
   */
  resetState(): void {
    const defaultState = getDefaultPreferencesControllerState();
    const resetState = {
      ...defaultState,
      currentLocale: FALLBACK_LOCALE,
      preferences: {
        ...defaultState.preferences,
        autoLockTimeLimit: DEFAULT_AUTO_LOCK_TIME_LIMIT,
        showNativeTokenAsMainBalance: true,
      },
    };
    this.update(() => resetState);
  }
}
