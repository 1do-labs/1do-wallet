import EventEmitter from 'events';
import { pipeline } from 'readable-stream';
import browser from 'webextension-polyfill';
import {
  createAsyncMiddleware,
  createScaffoldMiddleware,
  JsonRpcEngine,
} from '@metamask/json-rpc-engine';
import { createEngineStream } from '@metamask/json-rpc-middleware-stream';
import { ObservableStore } from '@metamask/obs-store';
import { storeAsStream } from '@metamask/obs-store/dist/asStream';
import { providerAsMiddleware } from '@metamask/eth-json-rpc-middleware';
import { debounce, uniq } from 'lodash';
import { KeyringTypes } from '@metamask/keyring-controller';
import createFilterMiddleware from '@metamask/eth-json-rpc-filters';
import createSubscriptionManager from '@metamask/eth-json-rpc-filters/subscriptionManager';
import {
  errorCodes,
  JsonRpcError,
  providerErrors,
  rpcErrors,
} from '@metamask/rpc-errors';
import { Mutex } from 'await-semaphore';
import log from 'loglevel';
import { OneKeyKeyring, TrezorKeyring } from '@metamask/eth-trezor-keyring';
import { LedgerKeyring } from '@metamask/eth-ledger-bridge-keyring';
import LatticeKeyring from 'eth-lattice-keyring';
import { rawChainData } from 'eth-chainlist';
import { QrKeyring } from '@metamask/eth-qr-keyring';
import { nanoid } from 'nanoid';
import { ApprovalRequestNotFoundError } from '@metamask/approval-controller';
import { Messenger } from '@metamask/messenger';
import {
  MethodNames,
  PermissionDoesNotExistError,
  PermissionsRequestNotFoundError,
  SubjectType,
} from '@metamask/permission-controller';
import {
  METAMASK_DOMAIN,
  createSelectedNetworkMiddleware,
} from '@metamask/selected-network-controller';

import { ERC1155, ERC20, ERC721, toHex } from '@metamask/controller-utils';

import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';

import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { Interface } from '@ethersproject/abi';
import { abiERC1155, abiERC721 } from '@metamask/metamask-eth-abis';
import { isEvmAccountType } from '@metamask/keyring-api';
import {
  hexToBigInt,
  toCaipChainId,
  parseCaipAccountId,
  hasProperty,
  isObject,
  isJsonRpcRequest,
  isJsonRpcNotification,
} from '@metamask/utils';
import { normalize } from '@metamask/eth-sig-util';

import {
  multichainMethodCallValidatorMiddleware,
  MultichainSubscriptionManager,
  MultichainMiddlewareManager,
  walletGetSession,
  walletRevokeSession,
  walletInvokeMethod,
  MultichainApiNotifications,
  walletCreateSession,
} from '@metamask/multichain-api-middleware';

import {
  getCallsStatus,
  getCapabilities,
  processSendCalls,
  walletGetCallsStatus,
  walletGetCapabilities,
  walletSendCalls,
} from '@metamask/eip-5792-middleware';

import {
  Caip25CaveatMutators,
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
  getEthAccounts,
  getSessionScopes,
  setPermittedEthChainIds,
  getPermittedAccountsForScopes,
  requestPermittedChainsPermissionIncremental,
  getCaip25PermissionFromLegacyPermissions,
} from '@metamask/chain-agnostic-permission';
import {
  findAtomicBatchSupportForChain,
  checkEip7702Support,
} from '../../shared/lib/eip7702-support-utils';
import { createEIP7702UpgradeTransaction } from '../../shared/lib/eip7702-utils';
import { verifyOneDoRuntimeDeployment } from '../../shared/lib/onedo-runtime/verify-deployment';
import { captureException } from '../../shared/lib/sentry';
import {
  CHAIN_IDS,
  CHAIN_SPEC_URL,
  NetworkStatus,
  UNSUPPORTED_RPC_METHODS,
} from '../../shared/constants/network';

import {
  HardwareDeviceNames,
  LedgerTransportTypes,
  KEYRING_DEVICE_PROPERTY_MAP,
} from '../../shared/constants/hardware-wallets';
import { KeyringType } from '../../shared/constants/keyring';
import { MILLISECOND, SECOND } from '../../shared/constants/time';
import {
  ORIGIN_METAMASK,
  POLLING_TOKEN_ENVIRONMENT_TYPES,
  MESSAGE_TYPE,
} from '../../shared/constants/app';

import {
  getStorageItem,
  setStorageItem,
} from '../../shared/lib/storage-helpers';
import {
  getTokenIdParam,
  fetchTokenBalance,
  fetchERC1155Balance,
} from '../../shared/lib/token-util';
import { toAssetId } from '../../shared/lib/asset-utils';
import { isEqualCaseInsensitive } from '../../shared/lib/string-utils';
import { parseStandardTokenTransactionData } from '../../shared/lib/transaction.utils';
import { STATIC_MAINNET_TOKEN_LIST } from '../../shared/constants/tokens';
import { START_UI_SYNC } from '../../shared/constants/ui-initialization';
import { PATCH_STORE_SUBSTREAM_METHODS } from '../../shared/constants/patch-store-substream-methods';
import {
  createEnsureOnboardingCompleteCallback,
  getTokenValueParam,
} from '../../shared/lib/metamask-controller-utils';
import { isManifestV3 } from '../../shared/lib/mv3.utils';
import { convertNetworkId } from '../../shared/lib/network.utils';
import {
  TOKEN_TRANSFER_LOG_TOPIC_HASH,
  TRANSFER_SINFLE_LOG_TOPIC_HASH,
} from '../../shared/lib/transactions-controller-utils';
import { getProviderConfig } from '../../shared/lib/selectors/networks';
import { selectAllEnabledNetworkClientIds } from '../../shared/lib/selectors/multichain';
import { trace, endTrace, TraceName } from '../../shared/lib/trace';
import { updateCurrentLocale } from '../../shared/lib/translate';
import { getIsAssetsUnifiedStateIncludedInBuild } from '../../shared/lib/environment';
import { toChecksumHexAddress } from '../../shared/lib/hexstring-utils';
import {
  getAccountTrackerControllerAccountsByChainId,
  getTokensControllerAllTokens,
} from '../../shared/lib/selectors/assets-migration';
import {
  isUserRejectedHardwareWalletError,
  toHardwareWalletError,
  // eslint-disable-next-line import-x/no-restricted-paths
} from '../../ui/contexts/hardware-wallets';
import { onStreamClosed } from '../../shared/lib/stream-utils';

import { AddressBookPetnamesBridge } from './lib/AddressBookPetnamesBridge';
import ComposableObservableStore from './lib/ComposableObservableStore';
import createDupeReqFilterStream from './lib/createDupeReqFilterStream';
import createLoggerMiddleware from './lib/createLoggerMiddleware';
import {
  createEthAccountsMethodMiddleware,
  createEip1193MethodMiddleware,
  createUnsupportedMethodMiddleware,
  createMultichainMethodMiddleware,
  makeMethodMiddlewareMaker,
} from './lib/rpc-method-middleware';
import createOriginMiddleware from './lib/createOriginMiddleware';
import createMainFrameOriginMiddleware from './lib/createMainFrameOriginMiddleware';
import createTabIdMiddleware from './lib/createTabIdMiddleware';
import createFrameIdMiddleware from './lib/createFrameIdMiddleware';
import createOnboardingMiddleware from './lib/createOnboardingMiddleware';
import { isStreamWritable, setupMultiplex } from './lib/stream-utils';
import { ReferralStatus } from './controllers/preferences-controller';
import Backup from './lib/backup';
import createMetaRPCHandler from './lib/createMetaRPCHandler';
import {
  previousValueComparator,
  initializeRpcProviderDomains,
  isPublicEndpointUrl,
} from './lib/util';
import createMetamaskMiddleware from './lib/createMetamaskMiddleware';
import {
  createDefiReferralMiddleware,
  ReferralTriggerType,
} from './lib/createDefiReferralMiddleware';

import {
  diffMap,
  getPermissionBackgroundApiMethods,
  getPermittedAccountsByOrigin,
  getPermittedChainsByOrigin,
  NOTIFICATION_NAMES,
  getRemovedAuthorizations,
  getChangedAuthorizations,
  getAuthorizedScopesByOrigin,
} from './controllers/permissions';
import { addDappTransaction, addTransaction } from './lib/transaction/util';
import { addTypedMessage, addPersonalMessage } from './lib/signature/util';
import {
  METAMASK_CAIP_MULTICHAIN_PROVIDER,
  METAMASK_EIP_1193_PROVIDER,
} from './constants/stream';

import { decodeTransactionData } from './lib/transaction/decode/util';
import createTracingMiddleware from './lib/createTracingMiddleware';
import createOriginThrottlingMiddleware from './lib/createOriginThrottlingMiddleware';
import { PatchStore } from './lib/PatchStore';
import { sanitizeUIState } from './lib/state-utils';
import {
  rejectAllApprovals,
  rejectOriginApprovals,
} from './lib/approval/utils';
import {
  MultichainAssetsControllerInit,
  MultichainBalancesControllerInit,
  MultichainAssetsRatesControllerInit,
  MultichainNetworkControllerInit,
} from './messenger-client-init/multichain';
import {
  AssetsContractControllerInit,
  AssetsControllerInit,
  ClientControllerInit,
  NetworkOrderControllerInit,
  NftControllerInit,
  NftDetectionControllerInit,
  TokenRatesControllerInit,
} from './messenger-client-init/assets';
import { TransactionControllerInit } from './messenger-client-init/confirmations/transaction-controller-init';
import { GeolocationApiServiceInit } from './messenger-client-init/geolocation-api-service-init';
import { GeolocationControllerInit } from './messenger-client-init/geolocation-controller-init';
import { initMessengerClients } from './messenger-client-init/utils';
import { openUpdateTabAndReload } from './lib/open-update-tab-and-reload';
import { AccountTreeControllerInit } from './messenger-client-init/accounts/account-tree-controller-init';
import { registerNoRemoteUserStorageControllerHandlers } from './lib/no-remote-user-storage';
import { MultichainAccountServiceInit } from './messenger-client-init/multichain/multichain-account-service-init';
import { setSentinelApiAuth } from './lib/transaction/sentinel-api';

import { TokenListControllerInit } from './messenger-client-init/token-list-controller-init';
import { TokenDetectionControllerInit } from './messenger-client-init/token-detection-controller-init';
import { TokensControllerInit } from './messenger-client-init/tokens-controller-init';
import { TokenBalancesControllerInit } from './messenger-client-init/token-balances-controller-init';
import { StaticAssetsControllerInit } from './messenger-client-init/static-assets-controller-init';
import { CurrencyRateControllerInit } from './messenger-client-init/currency-rate-controller-init';
import { EnsControllerInit } from './messenger-client-init/confirmations/ens-controller-init';
import { NameControllerInit } from './messenger-client-init/confirmations/name-controller-init';
import { GasFeeControllerInit } from './messenger-client-init/confirmations/gas-fee-controller-init';
import { SelectedNetworkControllerInit } from './messenger-client-init/selected-network-controller-init';
import { ConnectivityControllerInit } from './messenger-client-init/connectivity';
import { AccountTrackerControllerInit } from './messenger-client-init/account-tracker-controller-init';
import { OnboardingControllerInit } from './messenger-client-init/onboarding-controller-init';
import { PreferencesControllerInit } from './messenger-client-init/preferences-controller-init';
import { AppStateControllerInit } from './messenger-client-init/app-state-controller-init';
import { PermissionControllerInit } from './messenger-client-init/permission-controller-init';
import { SubjectMetadataControllerInit } from './messenger-client-init/subject-metadata-controller-init';
import { NetworkEnablementControllerInit } from './messenger-client-init/assets/network-enablement-controller-init';
import { KeyringControllerInit } from './messenger-client-init/keyring-controller-init';
import { PermissionLogControllerInit } from './messenger-client-init/permission-log-controller-init';
import { NetworkControllerInit } from './messenger-client-init/network-controller-init';
import { AccountOrderControllerInit } from './messenger-client-init/account-order-controller-init';
import { AccountsControllerInit } from './messenger-client-init/accounts-controller-init';
import { AlertControllerInit } from './messenger-client-init/alert-controller-init';
import { LoggingControllerInit } from './messenger-client-init/logging-controller-init';
import { AppMetadataControllerInit } from './messenger-client-init/app-metadata-controller-init';
import { StorageServiceInit } from './messenger-client-init/storage-service-init';
import { ApprovalControllerInit } from './messenger-client-init/confirmations/approval-controller-init';
import { AddressBookControllerInit } from './messenger-client-init/confirmations/address-book-controller-init';
import { DecryptMessageManagerInit } from './messenger-client-init/confirmations/decrypt-message-manager-init';
import { DecryptMessageControllerInit } from './messenger-client-init/confirmations/decrypt-message-controller-init';
import { EncryptionPublicKeyControllerInit } from './messenger-client-init/confirmations/encryption-public-key-controller-init';
import { EncryptionPublicKeyManagerInit } from './messenger-client-init/confirmations/encryption-public-key-message-manager-init';
import { SignatureControllerInit } from './messenger-client-init/confirmations/signature-controller-init';
import { getRootMessenger } from './lib/messenger';
import { MessengerSubscriptions } from './lib/MessengerSubscriptions';
import { getAddTransactionSendCallExtraOptions } from './lib/transaction/tempo-tx-utils';
import { LegacyBackgroundApiServiceInit } from './messenger-client-init/legacy-background-api-service-init';

export const METAMASK_CONTROLLER_EVENTS = {
  // Fired after state changes that impact the extension badge (unapproved msg count)
  // The process of updating the badge happens in app/scripts/background.js.
  UPDATE_BADGE: 'updateBadge',
  DECRYPT_MESSAGE_MANAGER_UPDATE_BADGE: 'DecryptMessageManager:updateBadge',
  ENCRYPTION_PUBLIC_KEY_MANAGER_UPDATE_BADGE:
    'EncryptionPublicKeyManager:updateBadge',
  // TODO: Add this and similar enums to the `controllers` repo and export them
  APPROVAL_STATE_CHANGE: 'ApprovalController:stateChange',
  APP_STATE_UNLOCK_CHANGE: 'AppStateController:unlockChange',
};

/**
 * @typedef {import('../../ui/store/store').MetaMaskReduxState} MetaMaskReduxState
 */

/**
 * @typedef {import('@metamask/object-multiplex/dist/Substream').Substream} Substream
 */

// Types of APIs
const API_TYPE = {
  EIP1193: 'eip-1193',
  CAIP_MULTICHAIN: 'caip-multichain',
};

export default class MetamaskController extends EventEmitter {
  /**
   * @param {object} opts
   */
  constructor(opts) {
    super();

    const {
      isFirstMetaMaskControllerSetup,
      controllerMessenger = getRootMessenger(),
    } = opts;

    this.defaultMaxListeners = 20;

    this.sendUpdate = debounce(
      this.privateSendUpdate.bind(this),
      MILLISECOND * 200,
      { maxWait: SECOND }, // Force flush to avoid indefinite sync starvation
    );
    this.opts = opts;
    this.requestSafeReload =
      opts.requestSafeReload ?? (() => Promise.resolve());
    this.extension = opts.browser;
    this.platform = opts.platform;
    this.notificationManager = opts.notificationManager;
    const initState = opts.initState || {};
    const version = process.env.METAMASK_VERSION;
    this.featureFlags = opts.featureFlags;

    // this keeps track of how many "controllerStream" connections are open
    // the only thing that uses controller connections are open metamask UI instances
    this.activeControllerConnections = 0;

    this.offscreenPromise = opts.offscreenPromise ?? Promise.resolve();

    this.getRequestAccountTabIds = opts.getRequestAccountTabIds;
    this.getOpenMetamaskTabsIds = opts.getOpenMetamaskTabsIds;

    this.initializeChainlist();

    this.controllerMessenger = controllerMessenger;
    registerNoRemoteUserStorageControllerHandlers(this.controllerMessenger);
    this.currentMigrationVersion = opts.currentMigrationVersion;

    // observable state store
    this.store = new ComposableObservableStore({
      state: initState,
      controllerMessenger: this.controllerMessenger,
      persist: true,
    });

    // external connections by origin
    // Do not modify directly. Use the associated methods.
    this.connections = {};

    // lock to ensure only one vault created at once
    this.createVaultMutex = new Mutex();

    this.extension.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'update') {
        if (version === '8.1.0') {
          this.platform.openExtensionInBrowser();
        }
      }
    });

    this.multichainSubscriptionManager = new MultichainSubscriptionManager({
      getNetworkClientById: this.controllerMessenger.call.bind(
        this.controllerMessenger,
        'NetworkController:getNetworkClientById',
      ),
      findNetworkClientIdByChainId: this.controllerMessenger.call.bind(
        this.controllerMessenger,
        'NetworkController:findNetworkClientIdByChainId',
      ),
    });
    this.multichainMiddlewareManager = new MultichainMiddlewareManager();
    this.deprecatedNetworkVersions = {};

    // start and stop polling for balances based on activeControllerConnections
    this.on('controllerConnectionChanged', (activeControllerConnections) => {
      const { completedOnboarding } = this.onboardingController.state;
      if (activeControllerConnections > 0 && completedOnboarding) {
        this.triggerNetworkrequests();
      } else {
        this.stopNetworkRequests();
      }
    });

    // Monitor for first wallet funding event based on activeControllerConnections
    this.on('controllerConnectionChanged', (activeControllerConnections) => {
      const { completedOnboarding } = this.onboardingController.state;
      if (
        activeControllerConnections > 0 &&
        completedOnboarding &&
        this.appStateController.state.canTrackWalletFundsObtained &&
        this.walletFundsObtainedMonitor
      ) {
        this.walletFundsObtainedMonitor.setupMonitoring();
      }
    });

    /** @type {import('./messenger-client-init/utils').InitFunctions} */
    const messengerClientInitFunctions = {
      ApprovalController: ApprovalControllerInit,
      LoggingController: LoggingControllerInit,
      StorageService: StorageServiceInit,
      AppMetadataController: AppMetadataControllerInit,
      PreferencesController: PreferencesControllerInit,
      KeyringController: KeyringControllerInit,
      AccountsController: AccountsControllerInit,
      AddressBookController: AddressBookControllerInit,
      AlertController: AlertControllerInit,
      DecryptMessageManager: DecryptMessageManagerInit,
      DecryptMessageController: DecryptMessageControllerInit,
      EncryptionPublicKeyManager: EncryptionPublicKeyManagerInit,
      EncryptionPublicKeyController: EncryptionPublicKeyControllerInit,
      SignatureController: SignatureControllerInit,
      PermissionController: PermissionControllerInit,
      PermissionLogController: PermissionLogControllerInit,
      SubjectMetadataController: SubjectMetadataControllerInit,
      AppStateController: AppStateControllerInit,
      OnboardingController: OnboardingControllerInit,
      NetworkController: NetworkControllerInit,
      GasFeeController: GasFeeControllerInit,
      SelectedNetworkController: SelectedNetworkControllerInit,
      GeolocationApiService: GeolocationApiServiceInit,
      GeolocationController: GeolocationControllerInit,
      AccountTrackerController: AccountTrackerControllerInit,
      TransactionController: TransactionControllerInit,
      NftController: NftControllerInit,
      AssetsContractController: AssetsContractControllerInit,
      NftDetectionController: NftDetectionControllerInit,
      CurrencyRateController: CurrencyRateControllerInit,
      TokenListController: TokenListControllerInit,
      TokenDetectionController: TokenDetectionControllerInit,
      TokensController: TokensControllerInit,
      TokenBalancesController: TokenBalancesControllerInit,
      StaticAssetsController: StaticAssetsControllerInit,
      // MultichainNetworkController and NetworkEnablementController must be initialized before TokenRatesController
      // because TokenRatesController depends on NetworkEnablementController:getState during construction.
      MultichainNetworkController: MultichainNetworkControllerInit,
      NetworkEnablementController: NetworkEnablementControllerInit,
      TokenRatesController: TokenRatesControllerInit,
      // Must be init before `AccountTreeController` to migrate existing pinned and hidden state to the new account tree controller.
      AccountOrderController: AccountOrderControllerInit,
      // FIXME: Must be init before `MultichainAccountService` to make sure account-tree is updated before
      // reacting to any `:multichainAccountGroup*` events.
      AccountTreeController: AccountTreeControllerInit,
      MultichainAssetsController: MultichainAssetsControllerInit,
      MultichainAssetsRatesController: MultichainAssetsRatesControllerInit,
      MultichainBalancesController: MultichainBalancesControllerInit,
      MultichainAccountService: MultichainAccountServiceInit,
      ConnectivityController: ConnectivityControllerInit,
      NetworkOrderController: NetworkOrderControllerInit,
      EnsController: EnsControllerInit,
      NameController: NameControllerInit,
      // ClientController must be initialized before AssetsController (AssetsController subscribes to ClientController:stateChange).
      ClientController: ClientControllerInit,
      ...(getIsAssetsUnifiedStateIncludedInBuild()
        ? { AssetsController: AssetsControllerInit }
        : {}),
      LegacyBackgroundApiService: LegacyBackgroundApiServiceInit,
    };

    const {
      messengerClientApi,
      controllerMemState,
      controllerPersistedState,
      messengerClientsByName,
    } = this.#initMessengerClients({
      initFunctions: messengerClientInitFunctions,
      initState,
    });

    this.messengerClientApi = messengerClientApi;
    this.controllerMemState = controllerMemState;
    this.controllerPersistedState = controllerPersistedState;
    this.messengerClientsByName = messengerClientsByName;

    // Backwards compatibility for existing references
    this.approvalController = messengerClientsByName.ApprovalController;
    this.loggingController = messengerClientsByName.LoggingController;
    this.appMetadataController = messengerClientsByName.AppMetadataController;
    this.preferencesController = messengerClientsByName.PreferencesController;
    this.keyringController = messengerClientsByName.KeyringController;
    this.accountsController = messengerClientsByName.AccountsController;
    this.addressBookController = messengerClientsByName.AddressBookController;
    this.alertController = messengerClientsByName.AlertController;
    this.decryptMessageController =
      messengerClientsByName.DecryptMessageController;
    this.encryptionPublicKeyController =
      messengerClientsByName.EncryptionPublicKeyController;
    this.signatureController = messengerClientsByName.SignatureController;
    this.permissionController = messengerClientsByName.PermissionController;
    this.permissionLogController =
      messengerClientsByName.PermissionLogController;
    this.subjectMetadataController =
      messengerClientsByName.SubjectMetadataController;
    this.appStateController = messengerClientsByName.AppStateController;
    this.networkController = messengerClientsByName.NetworkController;
    this.gasFeeController = messengerClientsByName.GasFeeController;
    this.selectedNetworkController =
      messengerClientsByName.SelectedNetworkController;
    this.onboardingController = messengerClientsByName.OnboardingController;
    this.accountTrackerController =
      messengerClientsByName.AccountTrackerController;
    this.txController = messengerClientsByName.TransactionController;
    this.nftController = messengerClientsByName.NftController;
    this.nftDetectionController = messengerClientsByName.NftDetectionController;
    this.assetsContractController =
      messengerClientsByName.AssetsContractController;
    this.assetsController = messengerClientsByName.AssetsController;
    this.multichainAssetsController =
      messengerClientsByName.MultichainAssetsController;
    this.multichainBalancesController =
      messengerClientsByName.MultichainBalancesController;
    this.multichainAssetsRatesController =
      messengerClientsByName.MultichainAssetsRatesController;
    this.multichainAccountService =
      messengerClientsByName.MultichainAccountService;
    this.tokenBalancesController =
      messengerClientsByName.TokenBalancesController;
    this.staticAssetsController = messengerClientsByName.StaticAssetsController;
    this.tokenListController = messengerClientsByName.TokenListController;
    this.tokenDetectionController =
      messengerClientsByName.TokenDetectionController;
    this.tokensController = messengerClientsByName.TokensController;
    this.tokenRatesController = messengerClientsByName.TokenRatesController;
    this.currencyRateController = messengerClientsByName.CurrencyRateController;
    this.multichainNetworkController =
      messengerClientsByName.MultichainNetworkController;
    this.accountTreeController = messengerClientsByName.AccountTreeController;
    this.networkOrderController = messengerClientsByName.NetworkOrderController;
    this.networkEnablementController =
      messengerClientsByName.NetworkEnablementController;
    this.ensController = messengerClientsByName.EnsController;
    this.nameController = messengerClientsByName.NameController;
    this.accountOrderController = messengerClientsByName.AccountOrderController;
    this.legacyBackgroundApiService =
      messengerClientsByName.LegacyBackgroundApiService;
    this.backup = new Backup({
      preferencesController: this.preferencesController,
      addressBookController: this.addressBookController,
      accountsController: this.accountsController,
      networkController: this.networkController,
    });

    // Record installation info if this is the first time the extension is running.
    // This captures the version and date when MetaMask was first installed.
    this.appMetadataController.maybeRecordFirstTimeInfo(version);

    this.provider =
      this.networkController.getProviderAndBlockTracker().provider;
    this.blockTracker =
      this.networkController.getProviderAndBlockTracker().blockTracker;

    this.controllerMessenger.subscribe('KeyringController:unlock', () =>
      this._onUnlock(),
    );

    this.controllerMessenger.subscribe('KeyringController:lock', () =>
      this._onLock(),
    );

    const petnamesBridgeMessenger = new Messenger({
      namespace: 'PetnamesBridge',
      parent: this.controllerMessenger,
    });
    this.controllerMessenger.delegate({
      messenger: petnamesBridgeMessenger,
      events: [
        'NameController:stateChange',
        'AddressBookController:stateChange',
      ],
    });

    new AddressBookPetnamesBridge({
      addressBookController: this.addressBookController,
      nameController: this.nameController,
      messenger: petnamesBridgeMessenger,
    }).init();

    setSentinelApiAuth(() => undefined);

    this.controllerMessenger.subscribe(
      'TransactionController:transactionStatusUpdated',
      ({ transactionMeta }) => {
        this._onFinishedTransaction(transactionMeta);
      },
    );

    this.controllerMessenger.subscribe(
      `OnboardingController:stateChange`,
      previousValueComparator(async (prevState, currState) => {
        const { completedOnboarding: prevCompletedOnboarding } = prevState;
        const { completedOnboarding: currCompletedOnboarding } = currState;
        if (!prevCompletedOnboarding && currCompletedOnboarding) {
          // Safely read the selected account and entropy id. In some test or
          // edge flows the selected account may not yet be available.
          const selected = this.accountsController.getSelectedAccount();
          const address = selected?.address;
          this.postOnboardingInitialization();
          this.triggerNetworkrequests();

          // execute once the token detection on the post-onboarding
          await this.tokenDetectionController.detectTokens({
            selectedAddress: address,
          });
        }
      }, this.onboardingController.state),
    );

    const getAccounts = ({ origin: innerOrigin }) => {
      if (innerOrigin === ORIGIN_METAMASK) {
        const selectedAddress =
          this.accountsController.getSelectedAccount().address;
        return selectedAddress ? [selectedAddress] : [];
      }
      return this.getPermittedAccounts(innerOrigin);
    };

    this.eip5792Middleware = createScaffoldMiddleware({
      wallet_getCapabilities: createAsyncMiddleware(async (req, res) =>
        walletGetCapabilities(req, res, {
          getAccounts,
          getPermittedAccountsForOrigin: async () => {
            return getAccounts({ origin: req.origin });
          },
          getCapabilities: getCapabilities.bind(
            null,
            {
              getDismissSmartAccountSuggestionEnabled: () =>
                this.preferencesController.state.preferences
                  .dismissSmartAccountSuggestionEnabled,
              isAtomicBatchSupported:
                this.txController.isAtomicBatchSupported.bind(
                  this.txController,
                ),
              isRelaySupported: async () => false,
              getSendBundleSupportedChains: async () => [],
              isAuxiliaryFundsSupported: () => false,
            },
            this.controllerMessenger,
          ),
        }),
      ),
      wallet_sendCalls: createAsyncMiddleware(async (req, res) => {
        const addTransactionExtraOptions =
          await getAddTransactionSendCallExtraOptions({
            req,
            networkController: this.networkController,
            keyringController: this.keyringController,
          });
        return await walletSendCalls(req, res, {
          getAccounts,
          getPermittedAccountsForOrigin: async () => {
            return getAccounts({ origin: req.origin });
          },
          processSendCalls: processSendCalls.bind(
            null,
            {
              addTransaction: async (txParams, options) =>
                this.txController.addTransaction(txParams, {
                  ...options,
                  ...addTransactionExtraOptions,
                }),
              addTransactionBatch: async (request) =>
                this.txController.addTransactionBatch({
                  ...request,
                  ...addTransactionExtraOptions,
                }),
              getDismissSmartAccountSuggestionEnabled: () =>
                this.preferencesController.state.preferences
                  .dismissSmartAccountSuggestionEnabled,
              getPermittedAccountsForOrigin: async () => {
                return getAccounts({ origin: req.origin });
              },
              isAtomicBatchSupported:
                this.txController.isAtomicBatchSupported.bind(
                  this.txController,
                ),
              validateSecurity: async () => undefined,
              isAuxiliaryFundsSupported: () => false,
            },
            this.controllerMessenger,
          ),
        });
      }),
      wallet_getCallsStatus: createAsyncMiddleware(async (req, res) =>
        walletGetCallsStatus(req, res, {
          getCallsStatus: getCallsStatus.bind(null, this.controllerMessenger),
        }),
      ),
    });

    this.metamaskMiddleware = createMetamaskMiddleware({
      static: {
        eth_syncing: false,
        web3_clientVersion: `1Do/v${version}`,
      },
      version,
      // account mgmt
      getAccounts: (requestOrigin) => getAccounts({ origin: requestOrigin }),
      // tx signing
      processTransaction: (transactionParams, dappRequest, requestContext) =>
        addDappTransaction(
          this.getAddTransactionRequest({
            transactionParams,
            dappRequest,
            requestContext,
          }),
        ),
      // msg signing
      processTypedMessage: (...args) =>
        addTypedMessage({
          signatureController: this.signatureController,
          signatureParams: args,
        }),
      processTypedMessageV3: (...args) =>
        addTypedMessage({
          signatureController: this.signatureController,
          signatureParams: args,
        }),
      processTypedMessageV4: (...args) =>
        addTypedMessage({
          signatureController: this.signatureController,
          signatureParams: args,
        }),
      processPersonalMessage: (...args) =>
        addPersonalMessage({
          signatureController: this.signatureController,
          signatureParams: args,
        }),

      processEncryptionPublicKey:
        this.encryptionPublicKeyController.newRequestEncryptionPublicKey.bind(
          this.encryptionPublicKeyController,
        ),

      processDecryptMessage:
        this.decryptMessageController.newRequestDecryptMessage.bind(
          this.decryptMessageController,
        ),
      getPendingNonce: this.getPendingNonce.bind(this),
      getPendingTransactionByHash: (hash) =>
        this.txController.state.transactions.find(
          (meta) =>
            meta.hash === hash && meta.status === TransactionStatus.submitted,
        ),
    });

    // ensure isClientOpenAndUnlocked is updated when memState updates
    this.on('update', (memState) => this._onStateUpdate(memState));

    /**
     * All controllers in Memstore but not in store. They are not persisted.
     * On chrome profile re-start, they will be re-initialized.
     */
    const resetOnRestartStore = {
      AccountTracker: this.accountTrackerController,
      TokenRatesController: this.tokenRatesController,
      DecryptMessageController: this.decryptMessageController,
      EncryptionPublicKeyController: this.encryptionPublicKeyController,
      SignatureController: this.signatureController,
      EnsController: this.ensController,
      ApprovalController: this.approvalController,
    };

    this.store.updateStructure({
      AccountsController: this.accountsController,
      AppStateController: this.appStateController,
      AppMetadataController: this.appMetadataController,
      KeyringController: this.keyringController,
      PreferencesController: this.preferencesController,
      AddressBookController: this.addressBookController,
      CurrencyController: this.currencyRateController,
      MultichainNetworkController: this.multichainNetworkController,
      NetworkController: this.networkController,
      AlertController: this.alertController,
      OnboardingController: this.onboardingController,
      PermissionController: this.permissionController,
      PermissionLogController: this.permissionLogController,
      SubjectMetadataController: this.subjectMetadataController,
      NetworkOrderController: this.networkOrderController,
      NetworkEnablementController: this.networkEnablementController,
      AccountOrderController: this.accountOrderController,
      GasFeeController: this.gasFeeController,
      TokenListController: this.tokenListController,
      TokensController: this.tokensController,
      TokenBalancesController: this.tokenBalancesController,
      StaticAssetsController: this.staticAssetsController,
      NftController: this.nftController,
      ...(this.assetsController
        ? { AssetsController: this.assetsController }
        : {}),
      SelectedNetworkController: this.selectedNetworkController,
      LoggingController: this.loggingController,
      NameController: this.nameController,
      ...resetOnRestartStore,
      ...controllerPersistedState,
    });

    this.memStore = new ComposableObservableStore({
      config: {
        AccountsController: this.accountsController,
        AppStateController: this.appStateController,
        AppMetadataController: this.appMetadataController,
        MultichainAssetsController: this.multichainAssetsController,
        MultichainBalancesController: this.multichainBalancesController,
        MultichainAssetsRatesController: this.multichainAssetsRatesController,
        TokenRatesController: this.tokenRatesController,
        MultichainNetworkController: this.multichainNetworkController,
        NetworkController: this.networkController,
        KeyringController: this.keyringController,
        PreferencesController: this.preferencesController,
        AddressBookController: this.addressBookController,
        CurrencyController: this.currencyRateController,
        AlertController: this.alertController,
        OnboardingController: this.onboardingController,
        PermissionController: this.permissionController,
        PermissionLogController: this.permissionLogController,
        SubjectMetadataController: this.subjectMetadataController,
        NetworkOrderController: this.networkOrderController,
        NetworkEnablementController: this.networkEnablementController,
        AccountOrderController: this.accountOrderController,
        GasFeeController: this.gasFeeController,
        TokenListController: this.tokenListController,
        TokensController: this.tokensController,
        TokenBalancesController: this.tokenBalancesController,
        StaticAssetsController: this.staticAssetsController,
        NftController: this.nftController,
        ...(this.assetsController
          ? { AssetsController: this.assetsController }
          : {}),
        SelectedNetworkController: this.selectedNetworkController,
        LoggingController: this.loggingController,
        NameController: this.nameController,
        ...resetOnRestartStore,
        ...controllerMemState,
      },
      controllerMessenger: this.controllerMessenger,
    });

    // if this is the first time, clear the state of by calling these methods
    const resetMethods = [
      this.decryptMessageController.resetState.bind(
        this.decryptMessageController,
      ),
      this.encryptionPublicKeyController.resetState.bind(
        this.encryptionPublicKeyController,
      ),
      this.signatureController.resetState.bind(this.signatureController),
      this.ensController.resetState.bind(this.ensController),
      this.approvalController.clearRequests.bind(this.approvalController),
      // WE SHOULD ADD TokenListController.resetState here too. But it's not implemented yet.
    ];

    if (isManifestV3) {
      if (isFirstMetaMaskControllerSetup === true) {
        this.resetStates(resetMethods);
        this.extension.storage.session.set({
          isFirstMetaMaskControllerSetup: false,
        });
      }
    } else {
      // it's always the first time in MV2
      this.resetStates(resetMethods);
    }

    // Automatic login via config password
    const password = process.env.PASSWORD;
    if (
      !this.isUnlocked() &&
      this.onboardingController.state.completedOnboarding &&
      password &&
      !process.env.IN_TEST
    ) {
      this._loginUser(password);
    } else {
      this._startUISync();
    }

    // Lazily update the store with the current extension environment
    this.extension.runtime.getPlatformInfo().then(({ os }) => {
      this.appStateController.setBrowserEnvironment(
        os,
        // This method is presently only supported by Firefox
        this.extension.runtime.getBrowserInfo === undefined
          ? 'chrome'
          : 'firefox',
      );
    });

    this.setupControllerEventSubscriptions();

    // For more information about these legacy streams, see here:
    // https://github.com/MetaMask/metamask-extension/issues/15491
    // TODO:LegacyProvider: Delete
    this.publicConfigStore = this.createPublicConfigStore();

    if (this.onboardingController.state.completedOnboarding) {
      this.postOnboardingInitialization();
    }
  }

  /**
   * Returns the current chainId (hex string) for a given domain/origin.
   *
   * @param {string} domain
   * @returns {string | undefined}
   */
  getCurrentChainIdForDomain(domain) {
    const networkClientId =
      this.selectedNetworkController.getNetworkClientIdForDomain(domain);
    const networkConfig =
      this.networkController.getNetworkConfigurationByNetworkClientId(
        networkClientId,
      );

    if (!networkConfig) {
      log.warn(
        `No network configuration found for clientId: ${networkClientId}`,
      );
      return undefined;
    }

    return networkConfig.chainId;
  }

  /**
   * Returns the network client ID for a given chain ID.
   * Used by EIP-7702 middleware hooks.
   *
   * @param {string} chainId - The chain ID to get the network client ID for
   * @returns {string | null} The network client ID or null if not found
   */
  getSelectedNetworkClientIdForChain(chainId) {
    const networkConfiguration =
      this.networkController.getNetworkConfigurationByChainId(chainId);
    if (!networkConfiguration) {
      return null;
    }

    const { rpcEndpoints, defaultRpcEndpointIndex } = networkConfiguration;
    if (
      !rpcEndpoints ||
      defaultRpcEndpointIndex === undefined ||
      defaultRpcEndpointIndex < 0 ||
      defaultRpcEndpointIndex >= rpcEndpoints.length
    ) {
      return null;
    }

    return rpcEndpoints[defaultRpcEndpointIndex].networkClientId;
  }

  postOnboardingInitialization() {
    // Legacy remote phishing detection is not initialized by 1Do.
  }

  /**
   * Gathers metadata (primarily connectivity status) about the globally selected
   * network as well as each enabled network and persists it to state.
   */
  async lookupSelectedNetworks() {
    const enabledNetworkClientIds = selectAllEnabledNetworkClientIds(
      this._getMetaMaskState(),
    );

    await Promise.allSettled([
      this.networkController.lookupNetwork(),
      ...enabledNetworkClientIds.map(async (networkClientId) => {
        return await this.networkController.lookupNetwork(networkClientId);
      }),
    ]);
  }

  triggerNetworkrequests() {
    this.tokenDetectionController.enable();
  }

  stopNetworkRequests() {
    this.txController.stopIncomingTransactionPolling();
    this.tokenDetectionController.disable();
  }

  resetStates(resetMethods) {
    resetMethods.forEach((resetMethod) => {
      try {
        resetMethod();
      } catch (err) {
        console.error(err);
      }
    });
  }

  /**
   * Sets up BaseController V2 event subscriptions. Currently, this includes
   * the subscriptions necessary to notify permission subjects of account
   * changes.
   *
   * Some of the subscriptions in this method are Messenger selector
   * event subscriptions. See the relevant documentation for
   * `@metamask/base-controller` for more information.
   *
   * Note that account-related notifications emitted when the extension
   * becomes unlocked are handled in MetaMaskController._onUnlock.
   */
  setupControllerEventSubscriptions() {
    let lastSelectedAddress;

    this.controllerMessenger.subscribe(
      'PreferencesController:stateChange',
      previousValueComparator(async (_, currState) => {
        const { currentLocale } = currState;

        await updateCurrentLocale(currentLocale);
      }, this.preferencesController.state),
    );

    this.controllerMessenger.subscribe(
      `${this.accountsController.name}:selectedAccountChange`,
      async (account) => {
        if (account.address && account.address !== lastSelectedAddress) {
          lastSelectedAddress = account.address;
          await this._onAccountChange(account.address);
        }
      },
    );

    // This handles account changes every time relevant permission state
    // changes, for any reason.
    this.controllerMessenger.subscribe(
      `${this.permissionController.name}:stateChange`,
      async (currentValue, previousValue) => {
        const changedAccounts = diffMap(currentValue, previousValue);

        for (const [origin, accounts] of changedAccounts.entries()) {
          this._notifyAccountsChange(origin, accounts);
        }
      },
      getPermittedAccountsByOrigin,
    );

    // This handles CAIP-25 authorization changes every time relevant permission state
    // changes, for any reason.
    // wallet_sessionChanged and eth_subscription setup/teardown
    this.controllerMessenger.subscribe(
      `${this.permissionController.name}:stateChange`,
      async (currentValue, previousValue) => {
        const changedAuthorizations = getChangedAuthorizations(
          currentValue,
          previousValue,
        );

        const removedAuthorizations = getRemovedAuthorizations(
          currentValue,
          previousValue,
        );

        // remove any existing notification subscriptions for removed authorizations
        for (const [origin, authorization] of removedAuthorizations.entries()) {
          const sessionScopes = getSessionScopes(authorization);
          // if the eth_subscription notification is in the scope and eth_subscribe is in the methods
          // then remove middleware and unsubscribe
          Object.entries(sessionScopes).forEach(([scope, scopeObject]) => {
            if (
              scopeObject.notifications.includes('eth_subscription') &&
              scopeObject.methods.includes('eth_subscribe')
            ) {
              this.removeMultichainApiEthSubscriptionMiddleware({
                scope,
                origin,
              });
            }
          });
        }

        // add new notification subscriptions for added/changed authorizations
        for (const [origin, authorization] of changedAuthorizations.entries()) {
          const sessionScopes = getSessionScopes(authorization);

          // if the eth_subscription notification is in the scope and eth_subscribe is in the methods
          // then get the subscriptionManager going for that scope
          Object.entries(sessionScopes).forEach(([scope, scopeObject]) => {
            if (
              scopeObject.notifications.includes('eth_subscription') &&
              scopeObject.methods.includes('eth_subscribe')
            ) {
              // for each tabId
              Object.values(this.connections[origin] ?? {}).forEach(
                ({ tabId }) => {
                  this.addMultichainApiEthSubscriptionMiddleware({
                    scope,
                    origin,
                    tabId,
                  });
                },
              );
            } else {
              this.removeMultichainApiEthSubscriptionMiddleware({
                scope,
                origin,
              });
            }
          });
          this._notifyAuthorizationChange(origin, authorization);
        }
      },
      getAuthorizedScopesByOrigin,
    );

    this.controllerMessenger.subscribe(
      `${this.accountTreeController.name}:selectedAccountGroupChange`,
      () => {
        const authorizationsByOrigin = getAuthorizedScopesByOrigin(
          this.permissionController.state,
        );

        // TODO: Remove this setTimeout once https://github.com/MetaMask/core/pull/8261 is released
        setTimeout(() => {
          for (const [
            origin,
            authorization,
          ] of authorizationsByOrigin.entries()) {
            this._notifyAuthorizationChange(origin, authorization);
          }
        }, 1000);
      },
    );

    this.controllerMessenger.subscribe(
      `${this.permissionController.name}:stateChange`,
      async (currentValue, previousValue) => {
        const changedChains = diffMap(currentValue, previousValue);

        // This operates under the assumption that there will be at maximum
        // one origin permittedChains value change per event handler call
        for (const [origin, chains] of changedChains.entries()) {
          const currentNetworkClientIdForOrigin =
            this.selectedNetworkController.getNetworkClientIdForDomain(origin);

          const networkConfig =
            this.networkController.getNetworkConfigurationByNetworkClientId(
              currentNetworkClientIdForOrigin,
            );

          // Guard clause: skip this iteration or handle the case if networkConfig is undefined.
          if (!networkConfig) {
            log.warn(
              `No network configuration found for clientId: ${currentNetworkClientIdForOrigin}`,
            );
            continue;
          }

          const { chainId: currentChainIdForOrigin } = networkConfig;

          if (chains.length > 0 && !chains.includes(currentChainIdForOrigin)) {
            const networkClientId =
              this.networkController.findNetworkClientIdByChainId(chains[0]);

            // setActiveNetwork should be called before setNetworkClientIdForDomain
            // to ensure that the isConnected value can be accurately inferred from
            // NetworkController.state.networksMetadata in return value of
            // `metamask_getProviderState` requests and `metamask_chainChanged` events.
            this.networkController.setActiveNetwork(networkClientId);

            this.selectedNetworkController.setNetworkClientIdForDomain(
              origin,
              networkClientId,
            );
          }
        }
      },
      getPermittedChainsByOrigin,
    );

    this.controllerMessenger.subscribe(
      'NetworkController:networkRemoved',
      ({ chainId }) => {
        const scopeString = toCaipChainId(
          'eip155',
          hexToBigInt(chainId).toString(10),
        );
        this.removeAllScopePermissions(scopeString);
      },
    );
  }

  /**
   * If it does not already exist, creates and inserts middleware to handle eth
   * subscriptions for a particular evm scope on a specific Multichain API
   * JSON-RPC pipeline by origin and tabId.
   *
   * @param {object} options - The options object.
   * @param {string} options.scope - The evm scope to handle eth susbcriptions for.
   * @param {string} options.origin - The origin to handle eth subscriptions for.
   * @param {string} options.tabId - The tabId to handle eth subscriptions for.
   */
  addMultichainApiEthSubscriptionMiddleware({ scope, origin, tabId }) {
    const subscriptionManager = this.multichainSubscriptionManager.subscribe({
      scope,
      origin,
      tabId,
    });
    this.multichainMiddlewareManager.addMiddleware({
      scope,
      origin,
      tabId,
      middleware: subscriptionManager.middleware,
    });
  }

  /**
   * If it does exist, removes all middleware that were handling eth
   * subscriptions for a particular evm scope for all Multichain API
   * JSON-RPC pipelines for an origin.
   *
   * @param {object} options - The options object.
   * @param {string} options.scope - The evm scope to handle eth susbcriptions for.
   * @param {string} options.origin - The origin to handle eth subscriptions for.
   */

  removeMultichainApiEthSubscriptionMiddleware({ scope, origin }) {
    this.multichainMiddlewareManager.removeMiddlewareByScopeAndOrigin(
      scope,
      origin,
    );
    this.multichainSubscriptionManager.unsubscribeByScopeAndOrigin(
      scope,
      origin,
    );
  }

  /**
   * TODO:LegacyProvider: Delete
   * Constructor helper: initialize a public config store.
   * This store is used to make some config info available to Dapps synchronously.
   */
  createPublicConfigStore() {
    // subset of state for metamask inpage provider
    const publicConfigStore = new ObservableStore();

    const selectPublicState = async ({ isUnlocked }) => {
      const { chainId, networkVersion, isConnected } =
        await this.getProviderNetworkState();

      return {
        isUnlocked,
        chainId,
        networkVersion: isConnected ? networkVersion : 'loading',
      };
    };

    const updatePublicConfigStore = async (memState) => {
      const networkStatus =
        memState.networksMetadata[memState.selectedNetworkClientId]?.status;
      if (networkStatus === NetworkStatus.Available) {
        publicConfigStore.putState(await selectPublicState(memState));
      }
    };

    // setup memStore subscription hooks
    this.on('update', updatePublicConfigStore);
    // Update the store asynchronously, out-of-band
    updatePublicConfigStore(this.getState());

    return publicConfigStore;
  }

  /**
   * Gets relevant state for the provider of an external origin.
   *
   * @param {string} origin - The origin to get the provider state for.
   * @param {object} [options] - Options.
   * @param {boolean} [options.isInitializingStreamProvider] - Whether this method is being used to initialize the StreamProvider (default: false).
   * @returns {Promise<{ isUnlocked: boolean, networkVersion: string, chainId: string, accounts: string[], extensionId: string | undefined }>} An object with relevant state properties.
   */
  async getProviderState(
    origin,
    { isInitializingStreamProvider = false } = {},
  ) {
    const providerNetworkState = await this.getProviderNetworkState({
      origin,
      isInitializingStreamProvider,
    });
    const metadata = {};
    if (isManifestV3) {
      const { chrome } = globalThis;
      metadata.extensionId = chrome?.runtime?.id;
    }
    return {
      /**
       * We default `isUnlocked` to `true` because even though we no longer emit events depending on this,
       * embedded dapp providers might listen directly to our streams, and therefore depend on it, so we leave it here.
       */
      isUnlocked: true,
      accounts: this.getPermittedAccounts(origin),
      ...metadata,
      ...providerNetworkState,
    };
  }

  /**
   * Retrieves network state information relevant for external providers.
   *
   * @param {object} [args] - The arguments to this function.
   * @param {string} [args.origin] - The origin identifier for which network state is requested (default: 'metamask').
   * @param {boolean} [args.isInitializingStreamProvider] - Whether this method is being used to initialize the StreamProvider (default: false).
   * @returns {object} An object containing important network state properties, including chainId and networkVersion.
   */
  async getProviderNetworkState({
    origin = METAMASK_DOMAIN,
    isInitializingStreamProvider = false,
  } = {}) {
    const networkClientId = this.controllerMessenger.call(
      'SelectedNetworkController:getNetworkClientIdForDomain',
      origin,
    );

    const networkClient = this.controllerMessenger.call(
      'NetworkController:getNetworkClientById',
      networkClientId,
    );

    const { chainId } = networkClient.configuration;

    const { completedOnboarding } = this.onboardingController.state;

    let networkVersion = this.deprecatedNetworkVersions[networkClientId];
    // We use `metamask_getProviderState` to set the initial state of the
    // StreamProvider. The StreamProvider allows the UI to make network requests
    // through the background connection, and it must be initialized before we
    // can show the UI. However, this creates a problem if the selected network
    // is slow or unresponsive, because then the network request will hang and
    // thus we will be unable to show the UI. To get around this, we prevent a
    // request from occurring during initialization
    // (`isInitializingStreamProvider` = true). `metamask_getProviderState` is
    // called each time the memState is updated, so eventually we _will_ make
    // this request (`isInitializingStreamProvider` = false), and if the network
    // recovers, the network version will be properly retrieved at that time.
    if (
      networkVersion === undefined &&
      completedOnboarding &&
      !isInitializingStreamProvider
    ) {
      try {
        const result = await networkClient.provider.request({
          method: 'net_version',
        });
        networkVersion = convertNetworkId(result);
      } catch (error) {
        console.error(error);
        networkVersion = null;
      }

      this.deprecatedNetworkVersions[networkClientId] = networkVersion;
    }

    const metadata =
      this.networkController.state.networksMetadata[networkClientId];

    return {
      chainId,
      networkVersion: networkVersion ?? 'loading',
      isConnected: metadata?.status === NetworkStatus.Available,
    };
  }

  //=============================================================================
  // EXPOSED TO THE UI SUBSYSTEM
  //=============================================================================

  /**
   * The metamask-state of the various controllers, made available to the UI
   *
   * @returns {MetaMaskReduxState["metamask"]} status
   */
  getState() {
    const { vault } = this.keyringController.state;
    const isInitialized = Boolean(vault);
    const flatState = this.memStore.getFlatState();

    return {
      isInitialized,
      ...sanitizeUIState(flatState),
    };
  }

  /**
   * Adds a network and sets it as the active network.
   *
   * @param {object} networkConfiguration - The network configuration to add.
   * @returns {Promise<object>} The added network configuration.
   */
  async _addNetworkAndSetActive(networkConfiguration) {
    const addedNetwork =
      await this.networkController.addNetwork(networkConfiguration);
    const { networkClientId } =
      addedNetwork?.rpcEndpoints?.[addedNetwork.defaultRpcEndpointIndex] ?? {};
    await this.networkController.setActiveNetwork(networkClientId);
    return addedNetwork;
  }

  /**
   * Returns an Object containing API Callback Functions.
   * These functions are the interface for the UI.
   * The API object can be transmitted over a stream via JSON-RPC.
   *
   * @returns {object} Object containing API functions.
   */
  getApi() {
    const {
      accountsController,
      addressBookController,
      alertController,
      appStateController,
      nftController,
      nftDetectionController,
      currencyRateController,
      tokenBalancesController,
      tokenDetectionController,
      ensController,
      tokenListController,
      gasFeeController,
      networkController,
      multichainNetworkController,
      onboardingController,
      permissionController,
      preferencesController,
      tokensController,
      txController,
      backup,
      approvalController,
      tokenRatesController,
      multichainAssetsRatesController,
      staticAssetsController,
      assetsController,
    } = this;

    return {
      // etc
      setCurrentCurrency: (currencyCode) => {
        currencyRateController.setCurrentCurrency(currencyCode);

        if (assetsController) {
          assetsController.setSelectedCurrency(currencyCode);
        }
      },
      setAvatarType: (avatarType) =>
        preferencesController.setPreference('avatarType', avatarType),
      setUsePhishDetect: preferencesController.setUsePhishDetect.bind(
        preferencesController,
      ),
      setUseMultiAccountBalanceChecker:
        preferencesController.setUseMultiAccountBalanceChecker.bind(
          preferencesController,
        ),
      setUseSafeChainsListValidation:
        preferencesController.setUseSafeChainsListValidation.bind(
          preferencesController,
        ),
      setUseTokenDetection: preferencesController.setUseTokenDetection.bind(
        preferencesController,
      ),
      setUseNftDetection: preferencesController.setUseNftDetection.bind(
        preferencesController,
      ),
      setUse4ByteResolution: preferencesController.setUse4ByteResolution.bind(
        preferencesController,
      ),
      setUseCurrencyRateCheck:
        preferencesController.setUseCurrencyRateCheck.bind(
          preferencesController,
        ),
      setOpenSeaEnabled: preferencesController.setOpenSeaEnabled.bind(
        preferencesController,
      ),
      getProviderConfig: () =>
        getProviderConfig({
          metamask: this.networkController.state,
        }),
      isPublicEndpointUrl: (endpointUrl) =>
        isPublicEndpointUrl(endpointUrl, this.opts.infuraProjectId),
      grantPermissionsIncremental:
        this.permissionController.grantPermissionsIncremental.bind(
          this.permissionController,
        ),
      grantPermissions: this.permissionController.grantPermissions.bind(
        this.permissionController,
      ),
      setUseExternalNameSources:
        preferencesController.setUseExternalNameSources.bind(
          preferencesController,
        ),
      setUseTransactionSimulations:
        preferencesController.setUseTransactionSimulations.bind(
          preferencesController,
        ),
      setIpfsGateway: preferencesController.setIpfsGateway.bind(
        preferencesController,
      ),
      setIsIpfsGatewayEnabled:
        preferencesController.setIsIpfsGatewayEnabled.bind(
          preferencesController,
        ),
      setUseAddressBarEnsResolution:
        preferencesController.setUseAddressBarEnsResolution.bind(
          preferencesController,
        ),
      setCurrentLocale: preferencesController.setCurrentLocale.bind(
        preferencesController,
      ),
      setServiceWorkerKeepAlivePreference:
        preferencesController.setServiceWorkerKeepAlivePreference.bind(
          preferencesController,
        ),
      markPasswordForgotten: this.markPasswordForgotten.bind(this),
      unMarkPasswordForgotten: this.unMarkPasswordForgotten.bind(this),
      getRequestAccountTabIds: this.getRequestAccountTabIds,
      getOpenMetamaskTabsIds: this.getOpenMetamaskTabsIds,
      markNotificationPopupAsAutomaticallyClosed: () =>
        this.notificationManager.markAsAutomaticallyClosed(),
      getCode: this.getCode.bind(this),
      verifyOneDoRuntimeDeployment:
        this.verifyOneDoRuntimeDeployment.bind(this),
      isAppEnabled: this.isAppEnabled.bind(this),

      // primary keyring management
      addNewAccount: this.addNewAccount.bind(this),
      getSeedPhrase: this.getSeedPhrase.bind(this),
      resetAccount: this.resetAccount.bind(this),
      removeAccount: this.removeAccount.bind(this),
      importAccountWithStrategy: this.importAccountWithStrategy.bind(this),
      syncPasswordAndUnlockWallet: this.syncPasswordAndUnlockWallet.bind(this),

      // hardware wallets
      connectHardware: this.connectHardware.bind(this),
      forgetDevice: this.forgetDevice.bind(this),
      checkHardwareStatus: this.checkHardwareStatus.bind(this),
      getHdPathForLedgerKeyring: this.getHdPathForLedgerKeyring.bind(this),
      unlockHardwareWalletAccount: this.unlockHardwareWalletAccount.bind(this),
      attemptLedgerTransportCreation:
        this.attemptLedgerTransportCreation.bind(this),
      getAppNameAndVersion: this.getAppNameAndVersion.bind(this),
      getLedgerPublicKey: this.getLedgerPublicKey.bind(this),
      getLedgerAppConfiguration: this.getLedgerAppConfiguration.bind(this),
      getTrezorFeatures: this.getTrezorFeatures.bind(this),

      // qr hardware devices
      completeQrCodeScan:
        appStateController.completeQrCodeScan.bind(appStateController),
      cancelQrCodeScan:
        appStateController.cancelQrCodeScan.bind(appStateController),

      // vault management
      submitPassword: this.submitPassword.bind(this),
      verifyPassword: this.verifyPassword.bind(this),

      // network management
      setActiveNetwork: async (id) => {
        // The multichain network controller will proxy the call to the network controller
        // in the case that the ID is an EVM network client ID.
        return await this.multichainNetworkController.setActiveNetwork(id);
      },
      findNetworkClientIdByChainId:
        this.networkController.findNetworkClientIdByChainId.bind(
          this.networkController,
        ),

      // active networks by accounts
      getNetworksWithTransactionActivityByAccounts:
        this.multichainNetworkController.getNetworksWithTransactionActivityByAccounts.bind(
          this.multichainNetworkController,
        ),
      // Avoids returning the promise so that initial call to switch network
      // doesn't block on the network lookup step
      setActiveNetworkConfigurationId: (networkConfigurationId) => {
        this.networkController.setActiveNetwork(networkConfigurationId);
      },
      setNetworkClientIdForDomain: (origin, networkClientId) => {
        return this.selectedNetworkController.setNetworkClientIdForDomain(
          origin,
          networkClientId,
        );
      },
      rollbackToPreviousProvider:
        networkController.rollbackToPreviousProvider.bind(networkController),
      addNetwork: this._addNetworkAndSetActive.bind(this),
      updateNetwork: this.networkController.updateNetwork.bind(
        this.networkController,
      ),
      removeNetwork: this.multichainNetworkController.removeNetwork.bind(
        this.multichainNetworkController,
      ),
      getCurrentNetworkEIP1559Compatibility:
        this.networkController.getEIP1559Compatibility.bind(
          this.networkController,
        ),
      getNetworkConfigurationByNetworkClientId:
        this.networkController.getNetworkConfigurationByNetworkClientId.bind(
          this.networkController,
        ),
      // PreferencesController
      setSelectedAddress: (address) => {
        const account = this.accountsController.getAccountByAddress(address);
        if (account) {
          this.accountsController.setSelectedAccount(account.id);
        } else {
          throw new Error(`No account found for address: ${address}`);
        }
      },
      toggleExternalServices: this.toggleExternalServices.bind(this),
      addToken: tokensController.addToken.bind(tokensController),
      updateTokenType: tokensController.updateTokenType.bind(tokensController),
      setFeatureFlag: preferencesController.setFeatureFlag.bind(
        preferencesController,
      ),
      setPreference: preferencesController.setPreference.bind(
        preferencesController,
      ),

      addKnownMethodData: preferencesController.addKnownMethodData.bind(
        preferencesController,
      ),
      setDismissSeedBackUpReminder:
        preferencesController.setDismissSeedBackUpReminder.bind(
          preferencesController,
        ),
      setOverrideContentSecurityPolicyHeader:
        preferencesController.setOverrideContentSecurityPolicyHeader.bind(
          preferencesController,
        ),
      setAdvancedGasFee: preferencesController.setAdvancedGasFee.bind(
        preferencesController,
      ),
      setTheme: preferencesController.setTheme.bind(preferencesController),
      dismissSidePanelMigrationToast:
        preferencesController.dismissSidePanelMigrationToast.bind(
          preferencesController,
        ),

      // AccountsController
      setSelectedInternalAccount: (id) => {
        const account = this.accountsController.getAccount(id);
        if (account) {
          this.accountsController.setSelectedAccount(id);
        }
      },

      setAccountName:
        accountsController.setAccountName.bind(accountsController),

      setAccountLabel: (address, label) => {
        const account = this.accountsController.getAccountByAddress(address);
        if (account === undefined) {
          throw new Error(`No account found for address: ${address}`);
        }
        this.accountsController.setAccountName(account.id, label);
      },

      // AccountTreeController
      setSelectedMultichainAccount: (accountGroupId) => {
        this.accountTreeController.setSelectedAccountGroup(accountGroupId);
      },
      setAccountGroupName: (accountGroupId, accountGroupName) => {
        this.accountTreeController.setAccountGroupName(
          accountGroupId,
          accountGroupName,
        );
      },
      setAccountGroupPinned:
        this.accountTreeController.setAccountGroupPinned.bind(
          this.accountTreeController,
        ),
      setAccountGroupHidden:
        this.accountTreeController.setAccountGroupHidden.bind(
          this.accountTreeController,
        ),
      // MultichainAccountService
      createNextMultichainAccountGroup: async (walletId) => {
        await this.multichainAccountService.createNextMultichainAccountGroup({
          entropySource: walletId,
        });
      },

      alignMultichainWallets: async () => {
        if (this.multichainAccountService) {
          await this.multichainAccountService.alignWallets();
        }
      },

      // AssetsContractController
      getTokenStandardAndDetails: this.getTokenStandardAndDetails.bind(this),
      getTokenSymbol: this.getTokenSymbol.bind(this),
      getTokenStandardAndDetailsByChain:
        this.getTokenStandardAndDetailsByChain.bind(this),
      getERC1155BalanceOf:
        this.assetsContractController.getERC1155BalanceOf.bind(
          this.assetsContractController,
        ),

      // NftController
      addNft: nftController.addNft.bind(nftController),

      addNftVerifyOwnership:
        nftController.addNftVerifyOwnership.bind(nftController),

      removeAndIgnoreNft: nftController.removeAndIgnoreNft.bind(nftController),

      removeNft: nftController.removeNft.bind(nftController),

      checkAndUpdateAllNftsOwnershipStatus:
        nftController.checkAndUpdateAllNftsOwnershipStatus.bind(nftController),

      checkAndUpdateSingleNftOwnershipStatus:
        nftController.checkAndUpdateSingleNftOwnershipStatus.bind(
          nftController,
        ),

      isNftOwner: nftController.isNftOwner.bind(nftController),

      // AddressController
      setAddressBook: addressBookController.set.bind(addressBookController),
      removeFromAddressBook: addressBookController.delete.bind(
        addressBookController,
      ),

      // AppStateController
      setLastActiveTime:
        appStateController.setLastActiveTime.bind(appStateController),
      setCurrentExtensionPopupId:
        appStateController.setCurrentExtensionPopupId.bind(appStateController),
      setBrowserEnvironment:
        appStateController.setBrowserEnvironment.bind(appStateController),
      setDefaultHomeActiveTabName:
        appStateController.setDefaultHomeActiveTabName.bind(appStateController),
      removeDeferredDeepLink:
        appStateController.removeDeferredDeepLink.bind(appStateController),
      setConnectedStatusPopoverHasBeenShown:
        appStateController.setConnectedStatusPopoverHasBeenShown.bind(
          appStateController,
        ),
      setRecoveryPhraseReminderHasBeenShown:
        appStateController.setRecoveryPhraseReminderHasBeenShown.bind(
          appStateController,
        ),
      setRecoveryPhraseReminderLastShown:
        appStateController.setRecoveryPhraseReminderLastShown.bind(
          appStateController,
        ),
      setTermsOfUseLastAgreed:
        appStateController.setTermsOfUseLastAgreed.bind(appStateController),
      setOnboardingDate:
        appStateController.setOnboardingDate.bind(appStateController),
      setLastViewedUserSurvey:
        appStateController.setLastViewedUserSurvey.bind(appStateController),
      setRampCardClosed:
        appStateController.setRampCardClosed.bind(appStateController),
      setNewPrivacyPolicyToastClickedOrClosed:
        appStateController.setNewPrivacyPolicyToastClickedOrClosed.bind(
          appStateController,
        ),
      setNewPrivacyPolicyToastShownDate:
        appStateController.setNewPrivacyPolicyToastShownDate.bind(
          appStateController,
        ),
      setOutdatedBrowserWarningLastShown:
        appStateController.setOutdatedBrowserWarningLastShown.bind(
          appStateController,
        ),
      setPendingExtensionVersion:
        appStateController.setPendingExtensionVersion.bind(appStateController),
      setUpdateModalLastDismissedAt:
        appStateController.setUpdateModalLastDismissedAt.bind(
          appStateController,
        ),
      setLastUpdatedAt:
        appStateController.setLastUpdatedAt.bind(appStateController),
      setShowTestnetMessageInDropdown:
        appStateController.setShowTestnetMessageInDropdown.bind(
          appStateController,
        ),
      setShowBetaHeader:
        appStateController.setShowBetaHeader.bind(appStateController),
      setShowPermissionsTour:
        appStateController.setShowPermissionsTour.bind(appStateController),
      setShowAccountBanner:
        appStateController.setShowAccountBanner.bind(appStateController),
      setProductTour:
        appStateController.setProductTour.bind(appStateController),
      setShowNetworkBanner:
        appStateController.setShowNetworkBanner.bind(appStateController),
      updateNftDropDownState:
        appStateController.updateNftDropDownState.bind(appStateController),
      getLastInteractedConfirmationInfo:
        appStateController.getLastInteractedConfirmationInfo.bind(
          appStateController,
        ),
      setLastInteractedConfirmationInfo:
        appStateController.setLastInteractedConfirmationInfo.bind(
          appStateController,
        ),
      updateSlides: appStateController.updateSlides.bind(appStateController),
      removeSlide: appStateController.removeSlide.bind(appStateController),
      updateNetworkConnectionBanner:
        appStateController.updateNetworkConnectionBanner.bind(
          appStateController,
        ),
      setPendingRedirectRoute:
        appStateController.setPendingRedirectRoute.bind(appStateController),
      setPna25Acknowledged:
        appStateController.setPna25Acknowledged.bind(appStateController),
      setAppActiveTab:
        appStateController.setAppActiveTab.bind(appStateController),

      // EnsController
      tryReverseResolveAddress:
        ensController.reverseResolveAddress.bind(ensController),

      changePassword: this.changePassword.bind(this),

      // KeyringController
      setLocked: this.setLocked.bind(this),
      createNewVaultAndKeychain: this.createNewVaultAndKeychain.bind(this),
      createNewVaultAndRestore: this.createNewVaultAndRestore.bind(this),
      importMnemonicToVault: this.importMnemonicToVault.bind(this),
      exportAccount: this.exportAccount.bind(this),

      // txController
      updateTransaction: txController.updateTransaction.bind(txController),
      approveTransactionsWithSameNonce:
        txController.approveTransactionsWithSameNonce.bind(txController),
      createCancelTransaction: this.createCancelTransaction.bind(this),
      createSpeedUpTransaction: this.createSpeedUpTransaction.bind(this),
      estimateGas: this.estimateGas.bind(this),
      estimateGasFee: txController.estimateGasFee.bind(txController),
      getNextNonce: this.getNextNonce.bind(this),
      addTransaction: (transactionParams, transactionOptions) =>
        addTransaction(
          this.getAddTransactionRequest({
            transactionParams,
            transactionOptions,
            waitForSubmit: false,
          }),
        ),
      addTransactionAndWaitForPublish: (
        transactionParams,
        transactionOptions,
      ) =>
        addTransaction(
          this.getAddTransactionRequest({
            transactionParams,
            transactionOptions,
            waitForSubmit: true,
          }),
        ),
      setTransactionActive:
        txController.setTransactionActive.bind(txController),
      // decryptMessageController
      decryptMessage: this.decryptMessageController.decryptMessage.bind(
        this.decryptMessageController,
      ),
      decryptMessageInline:
        this.decryptMessageController.decryptMessageInline.bind(
          this.decryptMessageController,
        ),
      cancelDecryptMessage:
        this.decryptMessageController.cancelDecryptMessage.bind(
          this.decryptMessageController,
        ),

      // EncryptionPublicKeyController
      encryptionPublicKey:
        this.encryptionPublicKeyController.encryptionPublicKey.bind(
          this.encryptionPublicKeyController,
        ),
      cancelEncryptionPublicKey:
        this.encryptionPublicKeyController.cancelEncryptionPublicKey.bind(
          this.encryptionPublicKeyController,
        ),

      // onboarding controller
      setSeedPhraseBackedUp:
        onboardingController.setSeedPhraseBackedUp.bind(onboardingController),
      completeOnboarding:
        onboardingController.completeOnboarding.bind(onboardingController),
      setFirstTimeFlowType:
        onboardingController.setFirstTimeFlowType.bind(onboardingController),

      // alert controller
      setAlertEnabledness:
        alertController.setAlertEnabledness.bind(alertController),
      setUnconnectedAccountAlertShown:
        alertController.setUnconnectedAccountAlertShown.bind(alertController),

      // permissions
      removePermissionsFor: this.removePermissionsFor,
      approvePermissionsRequest: this.acceptPermissionsRequest,
      rejectPermissionsRequest: this.rejectPermissionsRequest,
      ...getPermissionBackgroundApiMethods({
        permissionController,
        approvalController,
        accountsController,
        networkController,
        multichainNetworkController,
      }),

      updateNetworksList: this.updateNetworksList.bind(this),
      updateAccountsList: this.updateAccountsList.bind(this),
      setEnabledNetworks: this.setEnabledNetworks.bind(this),
      setEnabledAllPopularNetworks:
        this.setEnabledAllPopularNetworks.bind(this),
      updateHiddenAccountsList: this.updateHiddenAccountsList.bind(this),
      deleteInterface: () => undefined,
      updateInterfaceState: () => undefined,

      // ApprovalController
      rejectAllPendingApprovals: this.rejectAllPendingApprovals.bind(this),
      rejectPendingApproval: this.rejectPendingApproval,
      requestUserApproval:
        approvalController.addAndShowApprovalRequest.bind(approvalController),
      resolvePendingApproval: this.resolvePendingApproval,
      approveHardwareWalletTransaction:
        this.approveHardwareWalletTransaction.bind(this),

      // CurrencyRateController
      currencyRateStartPolling: currencyRateController.startPolling.bind(
        currencyRateController,
      ),
      currencyRateStopPollingByPollingToken:
        currencyRateController.stopPollingByPollingToken.bind(
          currencyRateController,
        ),
      multichainAssetsRatesStartPolling:
        multichainAssetsRatesController.startPolling.bind(
          multichainAssetsRatesController,
        ),
      multichainAssetsRatesStopPollingByPollingToken:
        multichainAssetsRatesController.stopPollingByPollingToken.bind(
          multichainAssetsRatesController,
        ),

      tokenRatesStartPolling:
        tokenRatesController.startPolling.bind(tokenRatesController),
      tokenRatesStopPollingByPollingToken:
        tokenRatesController.stopPollingByPollingToken.bind(
          tokenRatesController,
        ),

      tokenDetectionStartPolling: tokenDetectionController.startPolling.bind(
        tokenDetectionController,
      ),
      tokenDetectionStopPollingByPollingToken:
        tokenDetectionController.stopPollingByPollingToken.bind(
          tokenDetectionController,
        ),

      tokenListStartPolling:
        tokenListController.startPolling.bind(tokenListController),
      tokenListStopPollingByPollingToken:
        tokenListController.stopPollingByPollingToken.bind(tokenListController),

      tokenBalancesStartPolling: tokenBalancesController.startPolling.bind(
        tokenBalancesController,
      ),
      tokenBalancesStopPollingByPollingToken:
        tokenBalancesController.stopPollingByPollingToken.bind(
          tokenBalancesController,
        ),

      staticAssetsStartPolling: staticAssetsController.startPolling.bind(
        staticAssetsController,
      ),
      staticAssetsStopPollingByPollingToken:
        staticAssetsController.stopPollingByPollingToken.bind(
          staticAssetsController,
        ),
      updateBalances: tokenBalancesController.updateBalances.bind(
        tokenBalancesController,
      ),

      // GasFeeController
      gasFeeStartPolling: gasFeeController.startPolling.bind(gasFeeController),
      gasFeeStopPollingByPollingToken:
        gasFeeController.stopPollingByPollingToken.bind(gasFeeController),

      getGasFeeTimeEstimate:
        gasFeeController.getTimeEstimate.bind(gasFeeController),

      addPollingTokenToAppState:
        appStateController.addPollingToken.bind(appStateController),

      removePollingTokenFromAppState:
        appStateController.removePollingToken.bind(appStateController),

      updateThrottledOriginState:
        appStateController.updateThrottledOriginState.bind(appStateController),

      // Backup
      backupUserData: backup.backupUserData.bind(backup),
      restoreUserData: backup.restoreUserData.bind(backup),

      // TokenDetectionController
      detectTokens: tokenDetectionController.detectTokens.bind(
        tokenDetectionController,
      ),

      // MultichainAssetsRatesController
      fetchHistoricalPricesForAsset: (...args) =>
        this.multichainAssetsRatesController.fetchHistoricalPricesForAsset(
          ...args,
        ),

      // DetectCollectibleController
      detectNfts: nftDetectionController.detectNfts.bind(
        nftDetectionController,
      ),

      // Assets Controller - accounts passed from UI; options may include chainIds, assetTypes
      getAssets: (accounts, options) => {
        if (!this.assetsController) {
          return Promise.resolve();
        }
        return this.assetsController.getAssets(accounts, {
          ...options,
          forceUpdate: true,
        });
      },

      /** Token Detection V2 */
      addDetectedTokens:
        tokensController.addDetectedTokens.bind(tokensController),
      addImportedTokens: tokensController.addTokens.bind(tokensController),
      ignoreTokens: tokensController.ignoreTokens.bind(tokensController),
      getBalancesInSingleCall: (...args) =>
        this.assetsContractController.getBalancesInSingleCall(...args),

      // New Assets Controller
      hideAsset: (assetId) => this.assetsController.hideAsset(assetId),
      unhideAsset: (assetId) => this.assetsController.unhideAsset(assetId),
      addCustomAsset: (accountId, assetId, pendingMetadata) =>
        this.assetsController.addCustomAsset(
          accountId,
          assetId,
          pendingMetadata,
        ),
      removeCustomAsset: (accountId, assetId) =>
        this.assetsController.removeCustomAsset(accountId, assetId),
      // Testing
      throwTestError: this.throwTestError.bind(this),
      captureTestError: this.captureTestError.bind(this),

      // NameController
      updateProposedNames: this.nameController.updateProposedNames.bind(
        this.nameController,
      ),
      setName: this.nameController.setName.bind(this.nameController),

      // MultichainBalancesController
      multichainUpdateBalance: (accountId) =>
        this.multichainBalancesController.updateBalance(accountId),

      // Transaction Decode
      decodeTransactionData: (request) =>
        decodeTransactionData({
          ...request,
          provider: this.provider,
        }),
      // Other
      endTrace,
      isRelaySupported: async () => false,
      isSendBundleSupported: async () => false,
      openUpdateTabAndReload: () =>
        openUpdateTabAndReload(this.requestSafeReload.bind(this)),
      requestSafeReload: this.requestSafeReload.bind(this),
      lookupSelectedNetworks: this.lookupSelectedNetworks.bind(this),
      resetWallet: this.resetWallet.bind(this),
    };
  }

  rejectOriginPendingApprovals(origin) {
    const deleteInterface = () => undefined;

    rejectOriginApprovals({
      approvalController: this.approvalController,
      deleteInterface,
      origin,
    });
  }

  /**
   * Reset the wallet, restart the from the onboarding flow
   *
   * @param {boolean} restoreOnly - Whether to only restore the vault, without resetting the onboarding.
   * @returns void
   */
  async resetWallet(restoreOnly = false) {
    // clear contacts (address book)
    this.addressBookController.clear();

    // reset preferences to defaults
    this.preferencesController.resetState();

    if (!restoreOnly) {
      // reset onboarding state
      this.onboardingController.resetOnboarding();
      this.appStateController.setIsWalletResetInProgress(true);
    }
  }

  async exportAccount(address, password) {
    await this.verifyPassword(password);
    return this.keyringController.exportAccount(password, address);
  }

  async getTokenStandardAndDetails(address, userAddress, tokenId) {
    const currentChainId = this.#getGlobalChainId();

    const { tokensChainsCache } = this.tokenListController.state;
    const tokenList = tokensChainsCache?.[currentChainId]?.data || {};
    const allTokens = getTokensControllerAllTokens(this._getMetaMaskState());

    const tokens = allTokens?.[currentChainId]?.[userAddress] || [];

    const staticTokenListDetails =
      STATIC_MAINNET_TOKEN_LIST[address?.toLowerCase()] || {};
    const tokenListDetails = tokenList[address?.toLowerCase()] || {};
    const userDefinedTokenDetails =
      tokens.find(({ address: _address }) =>
        isEqualCaseInsensitive(_address, address),
      ) || {};

    const tokenDetails = {
      ...staticTokenListDetails,
      ...tokenListDetails,
      ...userDefinedTokenDetails,
    };

    // boolean to check if the token is an ERC20
    const tokenDetailsStandardIsERC20 =
      isEqualCaseInsensitive(tokenDetails.standard, ERC20) ||
      tokenDetails.erc20 === true;

    // boolean to check if the token is an NFT
    const noEvidenceThatTokenIsAnNFT =
      !tokenId &&
      !isEqualCaseInsensitive(tokenDetails.standard, ERC1155) &&
      !isEqualCaseInsensitive(tokenDetails.standard, ERC721) &&
      !tokenDetails.erc721;

    // boolean to check if the token is an ERC20 like
    const otherDetailsAreERC20Like =
      tokenDetails.decimals !== undefined && tokenDetails.symbol;

    // boolean to check if the token can be treated as an ERC20
    const tokenCanBeTreatedAsAnERC20 =
      tokenDetailsStandardIsERC20 ||
      (noEvidenceThatTokenIsAnNFT && otherDetailsAreERC20Like);

    let details;
    if (tokenCanBeTreatedAsAnERC20) {
      try {
        const balance = userAddress
          ? await fetchTokenBalance(address, userAddress, this.provider)
          : undefined;

        details = {
          address,
          balance,
          standard: ERC20,
          decimals: tokenDetails.decimals,
          symbol: tokenDetails.symbol,
        };
      } catch (e) {
        // If the `fetchTokenBalance` call failed, `details` remains undefined, and we
        // fall back to the below `assetsContractController.getTokenStandardAndDetails` call
        log.warn(`Failed to get token balance. Error: ${e}`);
      }
    }

    // `details`` will be undefined if `tokenCanBeTreatedAsAnERC20`` is false,
    // or if it is true but the `fetchTokenBalance`` call failed. In either case, we should
    // attempt to retrieve details from `assetsContractController.getTokenStandardAndDetails`
    if (details === undefined) {
      try {
        details =
          await this.assetsContractController.getTokenStandardAndDetails(
            address,
            userAddress,
            tokenId,
          );
      } catch (e) {
        log.warn(`Failed to get token standard and details. Error: ${e}`);
      }
    }

    if (details) {
      const tokenDetailsStandardIsERC1155 = isEqualCaseInsensitive(
        details.standard,
        ERC1155,
      );

      if (tokenDetailsStandardIsERC1155) {
        try {
          const balance = await fetchERC1155Balance(
            address,
            userAddress,
            tokenId,
            this.provider,
          );

          const balanceToUse = balance?._hex
            ? parseInt(balance._hex, 16).toString()
            : null;

          details = {
            ...details,
            balance: balanceToUse,
          };
        } catch (e) {
          // If the `fetchTokenBalance` call failed, `details` remains undefined, and we
          // fall back to the below `assetsContractController.getTokenStandardAndDetails` call
          log.warn('Failed to get token balance. Error:', e);
        }
      }
    }

    return {
      ...details,
      decimals: details?.decimals?.toString(10),
      balance: details?.balance?.toString(10),
    };
  }

  async getTokenStandardAndDetailsByChain(
    address,
    userAddress,
    tokenId,
    chainId,
  ) {
    const { tokensChainsCache } = this.tokenListController.state;
    const tokenList = tokensChainsCache?.[chainId]?.data || {};

    const allTokens = getTokensControllerAllTokens(this._getMetaMaskState());
    const selectedAccount = this.accountsController.getSelectedAccount();
    const tokens = allTokens?.[chainId]?.[selectedAccount.address] || [];

    let staticTokenListDetails = {};
    if (chainId === CHAIN_IDS.MAINNET) {
      staticTokenListDetails =
        STATIC_MAINNET_TOKEN_LIST[address?.toLowerCase()] || {};
    }

    const tokenListDetails = tokenList[address?.toLowerCase()] || {};
    const userDefinedTokenDetails =
      tokens.find(({ address: _address }) =>
        isEqualCaseInsensitive(_address, address),
      ) || {};
    const tokenDetails = {
      ...staticTokenListDetails,
      ...tokenListDetails,
      ...userDefinedTokenDetails,
    };

    const tokenDetailsStandardIsERC20 =
      isEqualCaseInsensitive(tokenDetails.standard, ERC20) ||
      tokenDetails.erc20 === true;

    const noEvidenceThatTokenIsAnNFT =
      !tokenId &&
      !isEqualCaseInsensitive(tokenDetails.standard, ERC1155) &&
      !isEqualCaseInsensitive(tokenDetails.standard, ERC721) &&
      !tokenDetails.erc721;

    const otherDetailsAreERC20Like =
      tokenDetails.decimals !== undefined && tokenDetails.symbol;

    // boolean to check if the token can be treated as an ERC20
    const tokenCanBeTreatedAsAnERC20 =
      tokenDetailsStandardIsERC20 ||
      (noEvidenceThatTokenIsAnNFT && otherDetailsAreERC20Like);

    let details;
    if (tokenCanBeTreatedAsAnERC20) {
      try {
        let balance = 0;
        if (this.#getGlobalChainId() === chainId) {
          balance = await fetchTokenBalance(
            address,
            userAddress,
            this.provider,
          );
        }

        details = {
          address,
          balance,
          standard: ERC20,
          decimals: tokenDetails.decimals,
          symbol: tokenDetails.symbol,
        };
      } catch (e) {
        // If the `fetchTokenBalance` call failed, `details` remains undefined, and we
        // fall back to the below `assetsContractController.getTokenStandardAndDetails` call
        log.warn(`Failed to get token balance. Error: ${e}`);
      }
    }

    // `details`` will be undefined if `tokenCanBeTreatedAsAnERC20`` is false,
    // or if it is true but the `fetchTokenBalance`` call failed. In either case, we should
    // attempt to retrieve details from `assetsContractController.getTokenStandardAndDetails`
    if (details === undefined) {
      try {
        const networkClientId =
          this.networkController?.state?.networkConfigurationsByChainId?.[
            chainId
          ]?.rpcEndpoints[
            this.networkController?.state?.networkConfigurationsByChainId?.[
              chainId
            ]?.defaultRpcEndpointIndex
          ]?.networkClientId;

        details =
          await this.assetsContractController.getTokenStandardAndDetails(
            address,
            userAddress,
            tokenId,
            networkClientId,
          );
      } catch (e) {
        log.warn(`Failed to get token standard and details. Error: ${e}`);
      }
    }

    if (details) {
      const tokenDetailsStandardIsERC1155 = isEqualCaseInsensitive(
        details.standard,
        ERC1155,
      );

      if (tokenDetailsStandardIsERC1155) {
        try {
          const balance = await fetchERC1155Balance(
            address,
            userAddress,
            tokenId,
            this.provider,
          );

          const balanceToUse = balance?._hex
            ? parseInt(balance._hex, 16).toString()
            : null;

          details = {
            ...details,
            balance: balanceToUse,
          };
        } catch (e) {
          // If the `fetchTokenBalance` call failed, `details` remains undefined, and we
          // fall back to the below `assetsContractController.getTokenStandardAndDetails` call
          log.warn('Failed to get token balance. Error:', e);
        }
      }
    }

    return {
      ...details,
      decimals: details?.decimals?.toString(10),
      balance: details?.balance?.toString(10),
    };
  }

  async getTokenSymbol(address) {
    try {
      const details =
        await this.assetsContractController.getTokenStandardAndDetails(address);
      return details?.symbol;
    } catch (e) {
      return null;
    }
  }

  /**
   * Unlock the vault with the submitted password.
   *
   * @param {string} password - The password.
   * @returns {void}
   */
  async syncPasswordAndUnlockWallet(password) {
    await this.submitPassword(password);
  }

  /**
   * Changes the password for the wallet.
   *
   * @param {string} newPassword - The new password.
   * @param {string} _oldPassword - The old password.
   */
  async changePassword(newPassword, _oldPassword) {
    await this.keyringController.changePassword(newPassword);
  }

  //=============================================================================
  // VAULT / KEYRING RELATED METHODS
  //=============================================================================

  /**
   * Creates a new Vault and create a new keychain.
   *
   * A vault, or KeyringController, is a controller that contains
   * many different account strategies, currently called Keyrings.
   * Creating it new means wiping all previous keyrings.
   *
   * A keychain, or keyring, controls many accounts with a single backup and signing strategy.
   * For example, a mnemonic phrase can generate many accounts, and is a keyring.
   *
   * @param {string} password
   * @returns {object} created keyring object
   */
  async createNewVaultAndKeychain(password) {
    const releaseLock = await this.createVaultMutex.acquire();
    const isWalletResetInProgress =
      this.appStateController.getIsWalletResetInProgress();
    try {
      if (isWalletResetInProgress) {
        // clear permissions
        this.permissionController.clearState();

        // Clear account tree state
        this.accountTreeController.clearState();

        // Currently, the account-order-controller is not in sync with
        // the accounts-controller. To properly persist the hidden state
        // of accounts, we should add a new flag to the account struct
        // to indicate if it is hidden or not.
        // TODO: Update @metamask/accounts-controller to support this.
        this.accountOrderController.updateHiddenAccountsList([]);

        this.txController.clearUnapprovedTransactions();
      }

      await this.multichainAccountService.createMultichainAccountWallet({
        type: 'create',
        password,
      });

      // set is resetting wallet in progress to false, after new vault and keychain are created
      this.appStateController.setIsWalletResetInProgress(false);

      const primaryKeyring = this.keyringController.state.keyrings[0];

      // Once we have our first HD keyring available, we re-create the internal list of
      // accounts (they should be up-to-date already, but we still run `updateAccounts` as
      // there are some account migration happening in that function).
      await this.accountsController.updateAccounts();
      // Then we can build the initial tree.
      this.accountTreeController.reinit();
      return primaryKeyring;
    } finally {
      releaseLock();
    }
  }

  /**
   * Imports a new mnemonic to the vault.
   *
   * @param {string} mnemonic - The mnemonic to import.
   * @param {object} options - The options for the import.
   * @param {boolean} options.shouldSelectAccount - whether to select the new account in the wallet
   * @returns {Promise<void>}
   */
  async importMnemonicToVault(
    mnemonic,
    options = {
      shouldSelectAccount: true,
    },
  ) {
    const { shouldSelectAccount } = options;
    const releaseLock = await this.createVaultMutex.acquire();
    try {
      const { entropySource: id } =
        await this.multichainAccountService.createMultichainAccountWallet({
          type: 'import',
          mnemonic: this._convertMnemonicToWordlistIndices(
            Buffer.from(mnemonic, 'utf8'),
          ),
        });

      const [newAccountAddress] = await this.keyringController.withKeyring(
        { id },
        async ({ keyring }) => keyring.getAccounts(),
      );

      if (shouldSelectAccount) {
        const account =
          this.accountsController.getAccountByAddress(newAccountAddress);
        this.accountsController.setSelectedAccount(account.id);
      }

      const syncAndDiscoverAccounts = async () => {
        // We want to trigger a full sync of the account tree after importing a new SRP
        // because `hasAccountTreeSyncingSyncedAtLeastOnce` is already true
        await this.accountTreeController.syncWithUserStorage();
      };

      // In order to avoid blocking the UI thread, we don't await for the sync and discover accounts to complete.
      // eslint-disable-next-line no-void
      void syncAndDiscoverAccounts();
    } finally {
      releaseLock();
    }
  }

  /**
   * Create a new Vault and restore an existent keyring.
   *
   * @param {string} password
   * @param {number[]} encodedSeedPhrase - The seed phrase, encoded as an array
   * of UTF-8 bytes.
   */
  async createNewVaultAndRestore(password, encodedSeedPhrase) {
    const releaseLock = await this.createVaultMutex.acquire();
    try {
      const { completedOnboarding } = this.onboardingController.state;

      const seedPhraseAsBuffer = Buffer.from(encodedSeedPhrase);

      // clear permissions
      this.permissionController.clearState();

      // Clear account tree state
      this.accountTreeController.clearState();

      // Currently, the account-order-controller is not in sync with
      // the accounts-controller. To properly persist the hidden state
      // of accounts, we should add a new flag to the account struct
      // to indicate if it is hidden or not.
      // TODO: Update @metamask/accounts-controller to support this.
      this.accountOrderController.updateHiddenAccountsList([]);

      this.txController.clearUnapprovedTransactions();

      if (completedOnboarding) {
        this.tokenDetectionController.enable();
      }

      // create new vault
      const seedPhraseAsUint8Array =
        this._convertMnemonicToWordlistIndices(seedPhraseAsBuffer);

      await this.multichainAccountService.createMultichainAccountWallet({
        type: 'restore',
        password,
        mnemonic: seedPhraseAsUint8Array,
      });

      // set is resetting wallet in progress to false, after new vault and keychain are created
      this.appStateController.setIsWalletResetInProgress(false);

      // We re-created the vault, meaning we only have 1 new HD keyring
      // now. We re-create the internal list of accounts (which is
      // not an expensive operation, since we should only have 1 HD
      // keyring that has one default account.
      // TODO: Remove this once the `accounts-controller` once only
      // depends only on keyrings `:stateChange`.
      await this.accountsController.updateAccounts();

      // Init multichain accounts after creating internal accounts.
      await this.multichainAccountService.init();

      // And we re-init the account tree controller too, to use the
      // newly created accounts.
      // TODO: Remove this once the `accounts-controller` once only
      // depends only on keyrings `:stateChange`.
      this.accountTreeController.reinit();
    } finally {
      releaseLock();
    }
  }

  /**
   * Imports accounts with balances to the keyring.
   */
  async _importAccountsWithBalances() {
    return undefined;
  }

  /**
   * Encodes a BIP-39 mnemonic as the indices of words in the English BIP-39 wordlist.
   *
   * @param {Buffer} mnemonic - The BIP-39 mnemonic.
   * @returns {Buffer} The Unicode code points for the seed phrase formed from the words in the wordlist.
   */
  _convertMnemonicToWordlistIndices(mnemonic) {
    const indices = mnemonic
      .toString()
      .split(' ')
      .map((word) => wordlist.indexOf(word));
    return new Uint8Array(new Uint16Array(indices).buffer);
  }

  /**
   * Converts a BIP-39 mnemonic stored as indices of words in the English wordlist to a buffer of Unicode code points.
   *
   * @param {Uint8Array} wordlistIndices - Indices to specific words in the BIP-39 English wordlist.
   * @returns {Buffer} The BIP-39 mnemonic formed from the words in the English wordlist, encoded as a list of Unicode code points.
   */
  _convertEnglishWordlistIndicesToCodepoints(wordlistIndices) {
    return Buffer.from(
      Array.from(new Uint16Array(wordlistIndices.buffer))
        .map((i) => wordlist[i])
        .join(' '),
    );
  }

  /**
   * Get an account balance from the AccountTrackerController or request it directly from the network.
   *
   * @param {string} address - The account address
   * @param {Provider} provider - The provider instance to use when asking the network
   */
  async getBalance(address, provider) {
    const accountsByChainId = getAccountTrackerControllerAccountsByChainId(
      this._getMetaMaskState(),
    );
    const accounts = accountsByChainId[this.#getGlobalChainId()];
    const cached = accounts?.[toChecksumHexAddress(address)];

    if (cached && cached.balance) {
      return cached.balance;
    }

    try {
      const balance = await provider.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      return balance || '0x0';
    } catch (error) {
      log.error(error);
      throw error;
    }
  }

  /**
   * Submits the user's password and attempts to unlock the vault.
   * Also synchronizes the preferencesController, to ensure its schema
   * is up to date with known accounts once the vault is decrypted.
   *
   * @param {string} password - The user's password
   */
  async submitPassword(password) {
    await this.submitPasswordOrEncryptionKey({ password });
  }

  /**
   * Submits the user's encryption key and attempts to unlock the vault.
   * Also synchronizes the preferencesController, to ensure its schema
   * is up to date with known accounts once the vault is decrypted.
   *
   * @param {string} encryptionKey - The user's encryption key
   */
  async submitEncryptionKey(encryptionKey) {
    await this.submitPasswordOrEncryptionKey({ encryptionKey });
  }

  /**
   * Attempts to unlock the vault using either the user's password or encryption
   * key. Also synchronizes the preferencesController, to ensure its schema is
   * up to date with known accounts once the vault is decrypted.
   *
   * @param {object} params - The function parameters.
   * @param {string} params.password - The user's password.
   * @param {string} params.encryptionKey - The user's encryption key.
   */
  async submitPasswordOrEncryptionKey({ password, encryptionKey }) {
    // Before attempting to unlock the keyrings, we need the offscreen to have loaded.
    await this.offscreenPromise;

    if (encryptionKey) {
      await this.keyringController.submitEncryptionKey(encryptionKey);
    } else {
      await this.keyringController.submitPassword(password);
    }

    try {
      await this.blockTracker.checkForLatestBlock();
    } catch (error) {
      log.error('Error while unlocking extension.', error);
    }

    await this.accountsController.updateAccounts();

    // Init multichain accounts after creating internal accounts.
    await this.multichainAccountService.init();

    // Force account-tree refresh after all accounts have been updated.
    this.accountTreeController.init();

    const resyncAndAlignAccounts = async () => {
      await this.multichainAccountService.resyncAccounts();

      // This allows to create missing accounts if new account providers have been added.
      await this.multichainAccountService.alignWallets();
    };

    // FIXME: We might wanna run discovery + alignment asynchronously here, like we do
    // for mobile.
    // NOTE: We run this asynchronously on purpose, see FIXME^.
    // eslint-disable-next-line no-void
    void resyncAndAlignAccounts();
  }

  async _loginUser(password) {
    try {
      // Automatic login via config password
      await this.submitPassword(password);
    } finally {
      this._startUISync();
    }
  }

  _startUISync() {
    // Message startUISync is used to start syncing state with UI
    // Sending this message after login is completed helps to ensure that incomplete state without
    // account details are not flushed to UI.
    this.emit('startUISync');
    this.startUISync = true;
    this.memStore.subscribe(this.sendUpdate.bind(this));
  }

  /**
   * Submits a user's encryption key to log the user in via login token
   */
  async submitEncryptionKeyFromSessionStorage() {
    try {
      const { loginToken, loginSalt } =
        await this.extension.storage.session.get(['loginToken', 'loginSalt']);
      if (loginToken && loginSalt) {
        const { vault } = this.keyringController.state;

        const jsonVault = JSON.parse(vault);

        if (jsonVault.salt !== loginSalt) {
          console.warn(
            'submitEncryptionKey: Stored salt and vault salt do not match',
          );
          await this.clearLoginArtifacts();
          return;
        }

        await this.keyringController.submitEncryptionKey(loginToken, loginSalt);
      }
    } catch (e) {
      // If somehow this login token doesn't work properly,
      // remove it and the user will get shown back to the unlock screen
      await this.clearLoginArtifacts();
      throw e;
    }
  }

  async clearLoginArtifacts() {
    await this.extension.storage.session.remove(['loginToken', 'loginSalt']);
  }

  /**
   * Submits a user's password to check its validity.
   *
   * @param {string} password - The user's password
   */
  async verifyPassword(password) {
    await this.keyringController.verifyPassword(password);
  }

  //
  // Hardware
  //

  async attemptLedgerTransportCreation() {
    return await this.#withKeyringForDevice(
      { name: HardwareDeviceNames.ledger },
      async (keyring) => await keyring.attemptMakeApp(),
    );
  }

  async getAppNameAndVersion() {
    return await this.#withKeyringForDevice(
      { name: HardwareDeviceNames.ledger },
      async (keyring) => await keyring.getAppNameAndVersion(),
    );
  }

  async getLedgerAppConfiguration() {
    return await this.#withKeyringForDevice(
      { name: HardwareDeviceNames.ledger },
      async (keyring) => await keyring.bridge.getAppConfiguration(),
    );
  }

  /**
   * Fetch account list from a hardware device.
   *
   * @param deviceName
   * @param page
   * @param hdPath
   * @returns [] accounts
   */
  async connectHardware(deviceName, page, hdPath) {
    return this.#withKeyringForDevice(
      { name: deviceName, hdPath },
      async (keyring) => {
        let accounts = [];
        switch (page) {
          case -1:
            accounts = await keyring.getPreviousPage();
            break;
          case 1:
            accounts = await keyring.getNextPage();
            break;
          default:
            accounts = await keyring.getFirstPage();
        }

        return accounts;
      },
    );
  }

  /**
   * Check if the device is unlocked
   *
   * @param deviceName
   * @param hdPath
   * @returns {Promise<boolean>}
   */
  async checkHardwareStatus(deviceName, hdPath) {
    return this.#withKeyringForDevice(
      { name: deviceName, hdPath },
      async (keyring) => {
        return keyring.isUnlocked();
      },
    );
  }

  /**
   * Get the hd path currently configured on a hardware keyring.
   *
   * @returns {Promise<string>}
   */
  async getHdPathForLedgerKeyring() {
    return this.#withKeyringForDevice(
      { name: HardwareDeviceNames.ledger },
      async (keyring) => {
        return await keyring.hdPath;
      },
    );
  }

  async getLedgerPublicKey(hdPath) {
    return await this.#withKeyringForDevice(
      { name: HardwareDeviceNames.ledger },
      async (keyring) => await keyring.bridge.getPublicKey({ hdPath }),
    );
  }

  async getTrezorFeatures() {
    return await this.#withKeyringForDevice(
      { name: HardwareDeviceNames.trezor },
      async (keyring) => {
        if (typeof keyring.bridge.getFeatures !== 'function') {
          throw new Error('Trezor bridge does not support getFeatures');
        }

        return await keyring.bridge.getFeatures();
      },
    );
  }

  /**
   * Get hardware type that will be sent for metrics logging.
   *
   * @param {string} address - Address to retrieve the keyring from
   * @returns {HardwareKeyringType} Keyring hardware type
   */
  async getHardwareTypeForMetric(address) {
    return await this.keyringController.withKeyring(
      { address },
      ({ keyring }) => KEYRING_DEVICE_PROPERTY_MAP[keyring.type],
    );
  }

  /**
   * Clear
   *
   * @param deviceName
   * @returns {Promise<boolean>}
   */
  async forgetDevice(deviceName) {
    return this.#withKeyringForDevice({ name: deviceName }, async (keyring) => {
      for (const address of await keyring.getAccounts()) {
        this._onAccountRemoved(address);
      }

      keyring.forgetDevice();

      return true;
    });
  }

  /**
   * Retrieves the keyring for the selected address and using the .type returns
   * a subtype for the account. Either 'hardware', 'imported', or 'MetaMask'.
   *
   * @param {string} address - Address to retrieve keyring for
   * @returns {'hardware' | 'imported' | 'MetaMask'}
   */
  async getAccountType(address) {
    const keyringType =
      await this.keyringController.getAccountKeyringType(address);
    switch (keyringType) {
      case KeyringType.trezor:
      case KeyringType.oneKey:
      case KeyringType.lattice:
      case KeyringType.qr:
      case KeyringType.ledger:
        return KEYRING_DEVICE_PROPERTY_MAP[keyringType];
      case KeyringType.imported:
        return 'imported';
      default:
        return 'MetaMask';
    }
  }

  /**
   * Retrieves the keyring for the selected address and using the .type
   * determines if a more specific name for the device is available. Returns
   * undefined for non hardware wallets.
   *
   * @param {string} address - Address to retrieve keyring for
   * @returns {'ledger' | 'lattice' | string | undefined}
   */
  async getDeviceModel(address) {
    return this.keyringController.withKeyring(
      { address },
      async ({ keyring }) => {
        switch (keyring.type) {
          case KeyringType.trezor:
          case KeyringType.oneKey:
            return keyring.getModel();
          case KeyringType.qr:
            return keyring.getName();
          case KeyringType.ledger:
            // TODO: get model after ledger keyring exposes method
            return HardwareDeviceNames.ledger;
          case KeyringType.lattice:
            // TODO: get model after lattice keyring exposes method
            return HardwareDeviceNames.lattice;
          default:
            return undefined;
        }
      },
    );
  }

  /**
   * get hardware account label
   *
   * @param name
   * @param index
   * @param hdPathDescription
   * @returns string label
   */
  getAccountLabel(name, index, hdPathDescription) {
    return `${name[0].toUpperCase()}${name.slice(1)} ${
      parseInt(index, 10) + 1
    } ${hdPathDescription || ''}`.trim();
  }

  /**
   * Imports an account from a Trezor or Ledger device.
   *
   * @param index
   * @param deviceName
   * @param hdPath
   * @param hdPathDescription
   * @returns {} keyState
   */
  async unlockHardwareWalletAccount(
    index,
    deviceName,
    hdPath,
    hdPathDescription,
  ) {
    const { address: unlockedAccount } = await this.#withKeyringForDevice(
      { name: deviceName, hdPath },
      async (keyring) => {
        keyring.setAccountToUnlock(index);
        const [address] = await keyring.addAccounts(1);
        return {
          address: normalize(address),
          label: this.getAccountLabel(
            deviceName === HardwareDeviceNames.qr
              ? keyring.getName()
              : deviceName,
            index,
            hdPathDescription,
          ),
        };
      },
    );

    const accounts = this.accountsController.listAccounts();

    const internalAccount =
      this.accountsController.getAccountByAddress(unlockedAccount);

    if (internalAccount) {
      this.accountsController.setSelectedAccount(internalAccount.id);
    } else {
      throw new Error(`No account found for address: ${unlockedAccount}`);
    }

    return { unlockedAccount, accounts };
  }

  //
  // Account Management
  //

  /**
   * Adds a new account to the keyring corresponding to the given `keyringId`,
   * or to the default (first) HD keyring if no `keyringId` is provided.
   *
   * @param {number} accountCount - The number of accounts to create
   * @param {string} _keyringId - The keyring identifier.
   * @returns {Promise<string>} The address of the newly-created account.
   */
  async addNewAccount(accountCount, _keyringId) {
    const oldAccounts = await this.keyringController.getAccounts();
    const keyringSelector = _keyringId
      ? { id: _keyringId }
      : { type: KeyringTypes.hd };

    const addedAccountAddress = await this.keyringController.withKeyring(
      keyringSelector,
      async ({ keyring }) => {
        if (keyring.type !== KeyringTypes.hd) {
          throw new Error('Cannot add account to non-HD keyring');
        }
        const accountsInKeyring = await keyring.getAccounts();

        // Only add an account if the accountCount matches the accounts in the keyring.
        if (accountCount && accountCount !== accountsInKeyring.length) {
          if (accountCount > accountsInKeyring.length) {
            throw new Error('Account out of sequence');
          }

          const existingAccount = accountsInKeyring[accountCount];

          if (!existingAccount) {
            throw new Error(`Can't find account at index ${accountCount}`);
          }

          return existingAccount;
        }

        const [newAddress] = await keyring.addAccounts(1);
        if (oldAccounts.includes(newAddress)) {
          await keyring.removeAccount(newAddress);
          throw new Error(`Cannot add duplicate ${newAddress} account`);
        }
        return newAddress;
      },
    );

    if (!oldAccounts.includes(addedAccountAddress)) {
      const internalAccount =
        this.accountsController.getAccountByAddress(addedAccountAddress);
      if (internalAccount) {
        this.accountsController.setSelectedAccount(internalAccount.id);
      } else {
        throw new Error(`No account found for address: ${addedAccountAddress}`);
      }
    }

    return addedAccountAddress;
  }

  /**
   * Verifies the validity of the current vault's seed phrase.
   *
   * Validity: seed phrase restores the accounts belonging to the current vault.
   *
   * Called when the first account is created and on unlocking the vault.
   *
   * @param {string} password
   * @param {string} _keyringId - This is the identifier for the hd keyring.
   * @returns {Promise<number[]>} The seed phrase to be confirmed by the user,
   * encoded as an array of UTF-8 bytes.
   */
  async getSeedPhrase(password, _keyringId) {
    return this._convertEnglishWordlistIndicesToCodepoints(
      await this.keyringController.exportSeedPhrase(password, _keyringId),
    );
  }

  /**
   * Clears the transaction history, to allow users to force-reset their nonces.
   * Mostly used in development environments, when networks are restarted with
   * the same network ID.
   *
   * @returns {Promise<string>} The current selected address.
   */
  async resetAccount() {
    const selectedAddress =
      this.accountsController.getSelectedAccount().address;

    const globalChainId = this.#getGlobalChainId();

    this.txController.wipeTransactions({
      address: selectedAddress,
      chainId: globalChainId,
    });

    this.networkController.resetConnection();

    return selectedAddress;
  }

  /**
   * Checks that all accounts referenced have a matching InternalAccount. Sends
   * an error to sentry for any accounts that were expected but are missing from the wallet.
   *
   * @param {InternalAccount[]} [internalAccounts] - The list of evm accounts the wallet knows about.
   * @param {Hex[]} [accounts] - The list of evm accounts addresses that should exist.
   */
  captureKeyringTypesWithMissingIdentities(
    internalAccounts = [],
    accounts = [],
  ) {
    const accountsMissingIdentities = accounts.filter(
      (address) =>
        !internalAccounts.some(
          (account) => account.address.toLowerCase() === address.toLowerCase(),
        ),
    );
    const keyringTypesWithMissingIdentities = accountsMissingIdentities.map(
      (address) => this.keyringController.getAccountKeyringType(address),
    );

    const internalAccountCount = internalAccounts.length;

    const accountsByChainId = getAccountTrackerControllerAccountsByChainId(
      this._getMetaMaskState(),
    );
    const accountsForCurrentChain = accountsByChainId[this.#getGlobalChainId()];

    const accountTrackerCount = Object.keys(
      accountsForCurrentChain || {},
    ).length;

    captureException(
      new Error(
        `Attempt to get permission specifications failed because their were ${accounts.length} accounts, but ${internalAccountCount} identities, and the ${keyringTypesWithMissingIdentities} keyrings included accounts with missing identities. Meanwhile, there are ${accountTrackerCount} accounts in the account tracker.`,
      ),
    );
  }

  /**
   * Sorts a list of evm account addresses by most recently selected by using
   * the lastSelected value for the matching InternalAccount object stored in state.
   *
   * @param {Hex[]} [addresses] - The list of evm accounts addresses to sort.
   * @returns {Hex[]} The sorted evm accounts addresses.
   */
  sortEvmAccountsByLastSelected(addresses) {
    const internalAccounts = this.accountsController.listAccounts();
    return this.sortAddressesWithInternalAccounts(addresses, internalAccounts);
  }

  /**
   * Sorts a list of multichain account addresses by most recently selected by using
   * the lastSelected value for the matching InternalAccount object stored in state.
   *
   * @param {string[]} [addresses] - The list of addresses (not full CAIP-10 Account IDs) to sort.
   * @returns {string[]} The sorted accounts addresses.
   */
  sortMultichainAccountsByLastSelected(addresses) {
    const getLastSelected = (address) => {
      const account = this.accountsController.getAccountByAddress(address);
      if (!account) {
        return undefined;
      }
      const context = this.accountTreeController.getAccountContext(account.id);
      if (!context) {
        return undefined;
      }
      // Get the group object to find the EOA account having lastSelected set
      const group = this.accountTreeController.getAccountGroupObject(
        context.groupId,
      );
      if (!group) {
        return undefined;
      }
      // Find the EVM EOA account in this group, as it's the only one with lastSelected
      for (const accountId of group.accounts) {
        const groupAccount = this.accountsController.getAccount(accountId);
        if (groupAccount && isEvmAccountType(groupAccount.type)) {
          return groupAccount.metadata.lastSelected;
        }
      }
      return undefined;
    };

    return addresses.sort(
      (a, b) => (getLastSelected(b) ?? 0) - (getLastSelected(a) ?? 0),
    );
  }

  /**
   * Sorts a list of addresses by most recently selected by using the lastSelected value for
   * the matching InternalAccount object from the list of internalAccounts provided.
   *
   * @param {string[]} [addresses] - The list of caip accounts addresses to sort.
   * @param {InternalAccount[]} [internalAccounts] - The list of InternalAccounts to determine lastSelected from.
   * @returns {string[]} The sorted accounts addresses.
   */
  sortAddressesWithInternalAccounts(addresses, internalAccounts) {
    return addresses.sort((firstAddress, secondAddress) => {
      const firstAccount = internalAccounts.find(
        (internalAccount) =>
          internalAccount.address.toLowerCase() === firstAddress.toLowerCase(),
      );

      const secondAccount = internalAccounts.find(
        (internalAccount) =>
          internalAccount.address.toLowerCase() === secondAddress.toLowerCase(),
      );

      if (!firstAccount) {
        this.captureKeyringTypesWithMissingIdentities(
          internalAccounts,
          addresses,
        );
        throw new Error(`Missing identity for address: "${firstAddress}".`);
      } else if (!secondAccount) {
        this.captureKeyringTypesWithMissingIdentities(
          internalAccounts,
          addresses,
        );
        throw new Error(`Missing identity for address: "${secondAddress}".`);
      } else if (
        firstAccount.metadata.lastSelected ===
        secondAccount.metadata.lastSelected
      ) {
        return 0;
      } else if (firstAccount.metadata.lastSelected === undefined) {
        return 1;
      } else if (secondAccount.metadata.lastSelected === undefined) {
        return -1;
      }

      return (
        secondAccount.metadata.lastSelected - firstAccount.metadata.lastSelected
      );
    });
  }

  /**
   * Gets the sorted permitted accounts for the specified origin. Returns an empty
   * array if no accounts are permitted.
   *
   * @param {string} origin - The origin whose exposed accounts to retrieve.
   * @returns {string[]} The origin's permitted accounts, or an empty
   * array.
   */
  getPermittedAccounts(origin) {
    let caveat;
    try {
      caveat = this.permissionController.getCaveat(
        origin,
        Caip25EndowmentPermissionName,
        Caip25CaveatType,
      );
    } catch (err) {
      if (err instanceof PermissionDoesNotExistError) {
        // suppress expected error in case that the origin
        // does not have the target permission yet
        return [];
      }
      throw err;
    }

    const ethAccounts = getEthAccounts(caveat.value);
    return this.sortEvmAccountsByLastSelected(ethAccounts);
  }

  /**
   * Handles DeFi referral approval flow for a partner.
   * Shows approval confirmation screen if needed and manages referral URL redirection.
   * This can be triggered by connection permission grants or existing connections.
   *
   * @param {import('../../../shared/constants/defi-referrals').DefiReferralPartnerConfig} partner - The partner configuration.
   * @param {number} tabId - The browser tab ID to update.
   * @param {ReferralTriggerType} triggerType - The trigger type.
   */
  async handleDefiReferral(partner, tabId, triggerType) {
    const isReferralEnabled = false;

    if (!isReferralEnabled) {
      return;
    }

    // Only continue if the partner has permitted accounts
    const permittedAccounts = this.getPermittedAccounts(partner.origin);
    if (permittedAccounts.length === 0) {
      return;
    }

    // Only continue if there is no pending approval
    const hasPendingApproval = this.approvalController.hasRequest({
      origin: partner.origin,
      type: partner.approvalType,
    });

    if (hasPendingApproval) {
      return;
    }

    // First account is the active permitted account for this partner
    const activePermittedAccount = permittedAccounts[0];

    const referralStatusByAccount =
      this.preferencesController.state.referrals[partner.id];
    const permittedAccountStatus =
      referralStatusByAccount[activePermittedAccount];
    const declinedAccounts = Object.keys(referralStatusByAccount).filter(
      (account) => referralStatusByAccount[account] === ReferralStatus.Declined,
    );

    // We should show approval screen if the account does not have a status
    const shouldShowApproval = permittedAccountStatus === undefined;

    // We should redirect to the referral url if the account is approved
    const shouldRedirect = permittedAccountStatus === ReferralStatus.Approved;

    if (shouldShowApproval) {
      try {
        const approvalResponse = await this.approvalController.add({
          origin: partner.origin,
          type: partner.approvalType,
          requestData: {
            selectedAddress: activePermittedAccount,
            partnerId: partner.id,
            partnerName: partner.name,
            learnMoreUrl: partner.learnMoreUrl,
          },
          shouldShowRequest: triggerType === ReferralTriggerType.NewConnection,
        });

        if (approvalResponse?.approved) {
          this._handleDefiReferralApprovedAccount(
            partner,
            activePermittedAccount,
            permittedAccounts,
            declinedAccounts,
          );
          await this._handleDefiReferralRedirect(
            partner,
            tabId,
            activePermittedAccount,
          );
        } else {
          this.preferencesController.addReferralDeclinedAccount(
            partner.id,
            activePermittedAccount,
          );
        }
      } catch (error) {
        // Do nothing if the user rejects the request
        if (error.code === errorCodes.provider.userRejectedRequest) {
          return;
        }
        throw error;
      }
    }

    if (shouldRedirect) {
      await this._handleDefiReferralRedirect(
        partner,
        tabId,
        activePermittedAccount,
      );
    }
  }

  /**
   * Handles redirection to the DeFi partner's referral page.
   *
   * @param {import('../../../shared/constants/defi-referrals').DefiReferralPartnerConfig} partner - The partner configuration.
   * @param {number} tabId - The browser tab ID to update.
   * @param {string} permittedAccount - The permitted account.
   */
  async _handleDefiReferralRedirect(partner, tabId, permittedAccount) {
    await this._updateDefiReferralUrl(partner, tabId);
    // Mark this account as having been shown the referral page
    this.preferencesController.addReferralPassedAccount(
      partner.id,
      permittedAccount,
    );
  }

  /**
   * Handles referral states for permitted accounts after user approval.
   *
   * @param {import('../../../shared/constants/defi-referrals').DefiReferralPartnerConfig} partner - The partner configuration.
   * @param {string} activePermittedAccount - The active permitted account.
   * @param {string[]} permittedAccounts - The permitted accounts.
   * @param {string[]} declinedAccounts - The previously declined permitted accounts.
   */
  _handleDefiReferralApprovedAccount(
    partner,
    activePermittedAccount,
    permittedAccounts,
    declinedAccounts,
  ) {
    if (declinedAccounts.length === 0) {
      // If there are no previously declined permitted accounts then
      // we approve all permitted accounts so that the user is not
      // shown the approval screen unnecessarily when switching
      this.preferencesController.setAccountsReferralApproved(
        partner.id,
        permittedAccounts,
      );
    } else {
      this.preferencesController.addReferralApprovedAccount(
        partner.id,
        activePermittedAccount,
      );
      // If there are any previously declined accounts then
      // we do not approve them, but instead remove them from the declined list
      // so they have the option to participate again in future
      permittedAccounts.forEach((account) => {
        if (declinedAccounts.includes(account)) {
          this.preferencesController.removeReferralDeclinedAccount(
            partner.id,
            account,
          );
        }
      });
    }
  }

  /**
   * Updates the browser tab URL to the DeFi partner's referral page.
   *
   * @param {import('../../../shared/constants/defi-referrals').DefiReferralPartnerConfig} partner - The partner configuration.
   * @param {number} tabId - The browser tab ID to update.
   */
  async _updateDefiReferralUrl(partner, tabId) {
    try {
      const { url } = await browser.tabs.get(tabId);
      const currentUrl = new URL(url || '');
      const referralUrl = new URL(partner.referralUrl);

      // Preserve (or update) existing params and add referral params
      const mergedParams = new URLSearchParams(currentUrl.search);
      for (const [key, value] of referralUrl.searchParams) {
        mergedParams.set(key, value);
      }

      // Apply merged params to the referral URL
      referralUrl.search = mergedParams.toString();
      await browser.tabs.update(tabId, { url: referralUrl.toString() });
    } catch (error) {
      log.error(
        `Failed to update URL to ${partner.name} referral page: `,
        error,
      );
    }
  }

  /**
   * Stops exposing the specified scope to all third parties.
   *
   * @param {string} scopeString - The scope to stop exposing
   * to third parties.
   */
  removeAllScopePermissions(scopeString) {
    this.permissionController.updatePermissionsByCaveat(
      Caip25CaveatType,
      (existingScopes) =>
        Caip25CaveatMutators[Caip25CaveatType].removeScope(
          existingScopes,
          scopeString,
        ),
    );
  }

  /**
   * Stops exposing the account with the specified address to all third parties.
   * Exposed accounts are stored in caveats of the eth_accounts permission. This
   * method uses `PermissionController.updatePermissionsByCaveat` to
   * remove the specified address from every eth_accounts permission. If a
   * permission only included this address, the permission is revoked entirely.
   *
   * @param {string} targetAccount - The address of the account to stop exposing
   * to third parties.
   */
  removeAllAccountPermissions(targetAccount) {
    this.permissionController.updatePermissionsByCaveat(
      Caip25CaveatType,
      (existingScopes) =>
        Caip25CaveatMutators[Caip25CaveatType].removeAccount(
          existingScopes,
          targetAccount,
        ),
    );
  }

  /**
   * Removes an account from state / storage.
   *
   * @param {string} address - A hex address
   */
  async removeAccount(address) {
    this._onAccountRemoved(address);
    await this.keyringController.removeAccount(address);

    return address;
  }

  /**
   * Imports an account with the specified import strategy.
   * These are defined in @metamask/keyring-controller
   * Each strategy represents a different way of serializing an Ethereum key pair.
   *
   * @param {'privateKey' | 'json'} strategy - A unique identifier for an account import strategy.
   * @param {any} args - The data required by that strategy to import an account.
   * @param {object} options - The options for the import.
   * @param {boolean} options.shouldSelectAccount - whether to select the new account in the wallet
   */
  async importAccountWithStrategy(
    strategy,
    args,
    options = {
      shouldSelectAccount: true,
    },
  ) {
    const { shouldSelectAccount } = options;

    const importedAccountAddress =
      await this.keyringController.importAccountWithStrategy(strategy, args);

    if (shouldSelectAccount) {
      const account = this.accountsController.getAccountByAddress(
        importedAccountAddress,
      );
      if (account) {
        this.accountsController.setSelectedAccount(account.id);
      } else {
        throw new Error(
          `No account found for address: ${importedAccountAddress}`,
        );
      }
    }
  }

  /**
   * Requests approval for permissions for the specified origin
   *
   * @param origin - The origin to request approval for.
   * @param permissions - The permissions to request approval for.
   * @param [options] - Optional. Additional properties to define on the requestData object
   */
  async requestPermissionApproval(origin, permissions, options = {}) {
    const id = nanoid();
    return this.approvalController.addAndShowApprovalRequest({
      id,
      origin,
      requestData: {
        metadata: {
          id,
          origin,
        },
        permissions,
        ...options,
      },
      type: MethodNames.RequestPermissions,
    });
  }

  /**
   * Prompts the user with permittedChains approval for given chainId.
   *
   * @param {string} origin - The origin to request approval for.
   * @param {Hex} chainId - The chainId to add incrementally.
   */
  async requestApprovalPermittedChainsPermission(origin, chainId) {
    const caveatValueWithChains = setPermittedEthChainIds(
      {
        requiredScopes: {},
        optionalScopes: {},
        sessionProperties: {},
        isMultichainOrigin: false,
      },
      [chainId],
    );

    await this.permissionController.requestPermissionsIncremental(
      { origin },
      {
        [Caip25EndowmentPermissionName]: {
          caveats: [
            {
              type: Caip25CaveatType,
              value: caveatValueWithChains,
            },
          ],
        },
      },
    );
  }

  // Identity Management (signature operations)

  getAddTransactionRequest({
    transactionParams,
    transactionOptions,
    dappRequest,
    requestContext,
    ...otherParams
  }) {
    const networkClientId =
      requestContext?.get('networkClientId') ??
      transactionOptions?.networkClientId;
    const { chainId } =
      this.networkController.getNetworkConfigurationByNetworkClientId(
        networkClientId,
      );
    return {
      internalAccounts: this.accountsController.listAccounts(),
      dappRequest,
      requestContext,
      networkClientId,
      selectedAccount: this.accountsController.getAccountByAddress(
        transactionParams.from,
      ),
      transactionController: this.txController,
      keyringController: this.keyringController,
      transactionOptions,
      transactionParams,
      chainId,
      ...otherParams,
    };
  }

  //=============================================================================
  // END (VAULT / KEYRING RELATED METHODS)
  //=============================================================================

  /**
   * Allows a user to attempt to cancel a previously submitted transaction
   * by creating a new transaction.
   *
   * @param {number} originalTxId - the id of the txMeta that you want to
   * attempt to cancel
   * @param {import(
   *  './controllers/transactions'
   * ).CustomGasSettings} [customGasSettings] - overrides to use for gas params
   * instead of allowing this method to generate them
   * @param options
   * @returns {object} MetaMask state
   */
  async createCancelTransaction(originalTxId, customGasSettings, options) {
    await this.txController.stopTransaction(
      originalTxId,
      customGasSettings,
      options,
    );
    const state = this.getState();
    return state;
  }

  /**
   * Allows a user to attempt to speed up a previously submitted transaction
   * by creating a new transaction.
   *
   * @param {number} originalTxId - the id of the txMeta that you want to
   * attempt to speed up
   * @param {import(
   *  './controllers/transactions'
   * ).CustomGasSettings} [customGasSettings] - overrides to use for gas params
   * instead of allowing this method to generate them
   * @param options
   * @returns {object} MetaMask state
   */
  async createSpeedUpTransaction(originalTxId, customGasSettings, options) {
    await this.txController.speedUpTransaction(
      originalTxId,
      customGasSettings,
      options,
    );
    const state = this.getState();
    return state;
  }

  async estimateGas(estimateGasParams) {
    return new Promise((resolve, reject) => {
      this.provider
        .request({
          method: 'eth_estimateGas',
          params: [estimateGasParams],
        })
        .then((result) => resolve(result.toString(16)))
        .catch((err) => reject(err));
    });
  }

  /**
   * When assets-unify-state is enabled, validates ERC-20 `wallet_watchAsset`
   * input that the unified path requires before the EIP-747 confirmation flow.
   * Does not persist; see {@link #persistUnifiedWatchAsset}.
   *
   * @param {object} asset - The asset descriptor from the dapp request.
   * @param {string} networkClientId - The network client the request targets.
   */
  #validateUnifiedWatchAssetRequest(asset, networkClientId) {
    if (!this.assetsController) {
      throw rpcErrors.internal({
        message: 'AssetsController is not available for wallet_watchAsset.',
      });
    }

    if (!networkClientId) {
      throw rpcErrors.invalidParams({
        message:
          'wallet_watchAsset requires a network context (networkClientId).',
      });
    }

    const { chainId } =
      this.networkController.getNetworkConfigurationByNetworkClientId(
        networkClientId,
      );

    if (!chainId) {
      throw rpcErrors.internal({
        message: 'Active network configuration is missing chainId.',
      });
    }

    // ERC-20 options from dapps do not include chainId; resolve CAIP asset id from the request network.
    const assetId = toAssetId(asset.address, chainId);
    if (!assetId) {
      throw rpcErrors.invalidParams({
        message:
          'Invalid token address or unsupported chain for wallet_watchAsset.',
      });
    }

    const decimals = Number.parseInt(String(asset.decimals), 10);
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
      throw rpcErrors.invalidParams({
        message: `Invalid ERC-20 decimals: ${String(asset.decimals)}.`,
      });
    }
  }

  /**
   * After the user approves EIP-747, persist the token on the unified
   * AssetsController. Must run only after `TokensController.watchAsset` succeeds
   * so a rejected confirmation does not leave orphaned unified state.
   *
   * @param {object} asset - The asset descriptor (possibly enriched by TokensController).
   * @param {string} networkClientId - The network client the request targets.
   */
  #persistUnifiedWatchAsset = async (asset, networkClientId) => {
    const { chainId } =
      this.networkController.getNetworkConfigurationByNetworkClientId(
        networkClientId,
      );

    const assetId = toAssetId(asset.address, chainId);
    if (!assetId) {
      throw rpcErrors.invalidParams({
        message:
          'Invalid token address or unsupported chain for wallet_watchAsset.',
      });
    }

    const decimals = Number.parseInt(String(asset.decimals), 10);
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
      throw rpcErrors.invalidParams({
        message: `Invalid ERC-20 decimals: ${String(asset.decimals)}.`,
      });
    }

    const accountId = this.accountsController.getSelectedAccount().id;
    const iconUrl = asset.image ?? asset.iconUrl;
    const pendingMetadata = {
      address: asset.address,
      symbol: asset.symbol,
      name: asset.name ?? asset.symbol,
      decimals,
      chainId,
      unlisted: false,
      ...(iconUrl ? { iconUrl } : {}),
    };

    await this.assetsController.addCustomAsset(
      accountId,
      assetId,
      pendingMetadata,
    );
  };

  handleWatchAssetRequest = async ({
    asset,
    type,
    origin,
    networkClientId,
  }) => {
    switch (type) {
      case ERC20: {
        const unifyWatchAsset = this.#isAssetsUnifyStateEnabled();
        if (unifyWatchAsset) {
          this.#validateUnifiedWatchAssetRequest(asset, networkClientId);
        }
        await this.tokensController.watchAsset({
          asset,
          type,
          networkClientId,
        });
        if (unifyWatchAsset) {
          await this.#persistUnifiedWatchAsset(asset, networkClientId);
        }
        return undefined;
      }
      case ERC721:
      case ERC1155:
        return this.nftController.watchNft(
          asset,
          type,
          origin,
          networkClientId,
        );
      default:
        throw new Error(`Asset type ${type} not supported`);
    }
  };

  /**
   * Returns the index of the HD keyring containing the selected account.
   *
   * @returns {number | undefined} The index of the HD keyring containing the selected account.
   */
  getHDEntropyIndex() {
    const selectedAccount = this.accountsController.getSelectedAccount();
    const hdKeyrings = this.keyringController.state.keyrings.filter(
      (keyring) => keyring.type === KeyringTypes.hd,
    );
    const index = hdKeyrings.findIndex((keyring) =>
      keyring.accounts.includes(selectedAccount.address),
    );

    return index === -1 ? undefined : index;
  }

  //=============================================================================
  // PASSWORD MANAGEMENT
  //=============================================================================

  /**
   * Allows a user to begin the seed phrase recovery process.
   */
  markPasswordForgotten() {
    this.preferencesController.setPasswordForgotten(true);
    this.sendUpdate();
  }

  /**
   * Allows a user to end the seed phrase recovery process.
   */
  unMarkPasswordForgotten() {
    this.preferencesController.setPasswordForgotten(false);
    this.sendUpdate();
  }

  //=============================================================================
  // SETUP
  //=============================================================================

  /**
   * A runtime.MessageSender object, as provided by the browser:
   *
   * @see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/MessageSender
   * @typedef {object} MessageSender
   * @property {string} - The URL of the page or frame hosting the script that sent the message.
   */

  /**
   * Used to create a multiplexed stream for connecting to an untrusted context
   * like a Dapp or other extension.
   *
   * @param options - Options bag.
   * @param {ReadableStream} options.connectionStream - The Duplex stream to connect to.
   * @param {MessageSender} options.sender - The sender of the messages on this stream.
   * @param {string} [options.subjectType] - The type of the sender, i.e. subject.
   */
  setupUntrustedCommunicationEip1193({
    connectionStream,
    sender,
    subjectType,
  }) {
    let inputSubjectType;
    if (subjectType) {
      inputSubjectType = subjectType;
    } else if (sender.id && sender.id !== this.extension.runtime.id) {
      inputSubjectType = SubjectType.Extension;
    } else {
      inputSubjectType = SubjectType.Website;
    }

    // setup multiplexing
    const mux = setupMultiplex(connectionStream);
    mux.ignoreStream(METAMASK_CAIP_MULTICHAIN_PROVIDER);

    // messages between inpage and background
    this.setupProviderConnectionEip1193(
      mux.createStream(METAMASK_EIP_1193_PROVIDER),
      sender,
      inputSubjectType,
    );

    // TODO:LegacyProvider: Delete
    if (sender.url) {
      // legacy streams
      this.setupPublicConfig(mux.createStream('publicConfig'));
    }
  }

  /**
   * Used to create a CAIP stream for connecting to an untrusted context.
   *
   * @param options - Options bag.
   * @param {ReadableStream} options.connectionStream - The Duplex stream to connect to.
   * @param {MessageSender} options.sender - The sender of the messages on this stream.
   * @param {string} [options.subjectType] - The type of the sender, i.e. subject.
   */
  setupUntrustedCommunicationCaip({ connectionStream, sender, subjectType }) {
    let inputSubjectType;
    if (subjectType) {
      inputSubjectType = subjectType;
    } else if (sender.id && sender.id !== this.extension.runtime.id) {
      inputSubjectType = SubjectType.Extension;
    } else {
      inputSubjectType = SubjectType.Website;
    }

    // messages between subject and background
    this.setupProviderConnectionCaip(
      connectionStream,
      sender,
      inputSubjectType,
    );
  }

  /**
   * Used to create a multiplexed stream for connecting to a trusted context,
   * like our own user interfaces, which have the provider APIs, but also
   * receive the exported API from this controller, which includes trusted
   * functions, like the ability to approve transactions or sign messages.
   *
   * @param {*} connectionStream - The duplex stream to connect to.
   * @param {MessageSender} sender - The sender of the messages on this stream
   */
  setupTrustedCommunication(connectionStream, sender) {
    // setup multiplexing
    const mux = setupMultiplex(connectionStream);
    // connect features
    const { initializePatchStore } = this.setupPatchStoreConnection(
      mux.createStream('patch-store'),
    );
    this.setupControllerConnection(mux.createStream('controller'), {
      initializePatchStore,
    });
    this.setupProviderConnectionEip1193(
      mux.createStream('provider'),
      sender,
      SubjectType.Internal,
    );
  }

  /**
   * Called when we detect a suspicious domain. Requests the browser redirects
   * to our anti-phishing page.
   *
   * @private
   * @param {*} connectionStream - The duplex stream to the per-page script,
   * for sending the reload attempt to.
   * @param {string} hostname - The hostname that triggered the suspicion.
   */
  sendPhishingWarning(connectionStream, hostname) {
    const mux = setupMultiplex(connectionStream);
    const phishingStream = mux.createStream('phishing');
    phishingStream.write({ hostname });
  }

  /**
   * Sets up the substream responsible for collecting and sending state patches
   * to a UI process.
   *
   * Whenever the state of a controller changes, we need to update the Redux
   * root store on the UI side. However, we want to control which part of Redux
   * is updated to prevent excessive rerenders.
   *
   * To do this, we use `PatchStore`, which wraps `memStore`, captures state
   * updates as a deduplicated set of JSON patch objects, and then releases them
   * to the UI process only when requested.
   *
   * For the UI side of this, see `ui/store/patch-store-substream-connection.ts`.
   *
   * @param {Substream} outStream - The substream that patch store messages are
   * sent through.
   * @returns {{ initializePatchStore: () => void }} Callbacks to call. The only
   * one is `initializePatchStore`.
   */
  setupPatchStoreConnection(outStream) {
    const patchStore = new PatchStore(this.memStore);
    let isUiReady = false;

    const handleUpdate = () => {
      if (!isStreamWritable(outStream)) {
        log.debug('Stream is closed, ignoring.');
        return;
      }

      if (!isUiReady) {
        log.debug(
          "'startSendingPatches' has not been called yet, not calling 'sendUpdate'.",
        );
        return;
      }

      const patches = patchStore.flushPendingPatches();

      outStream.write({
        jsonrpc: '2.0',
        method: PATCH_STORE_SUBSTREAM_METHODS.SendUpdate,
        params: [patches],
      });
    };

    const initializePatchStore = () => {
      patchStore.init();
    };

    const handleStartSendingPatches = () => {
      isUiReady = true;
      handleUpdate();
    };

    const handleGetStatePatches = (request) => {
      const patches = patchStore.flushPendingPatches();
      outStream.write({
        id: request.id,
        jsonrpc: '2.0',
        result: patches,
      });
    };

    const handleIncomingMessage = (message) => {
      if (!isStreamWritable(outStream)) {
        log.debug('Stream is closed, ignoring incoming message.');
        return;
      }

      if (
        !(
          (isJsonRpcRequest(message) && typeof message.id === 'number') ||
          isJsonRpcNotification(message)
        )
      ) {
        outStream.write({
          id:
            isObject(message) && hasProperty(message, 'id') ? message.id : null,
          jsonrpc: '2.0',
          error: rpcErrors.invalidRequest(),
        });
        return;
      }

      const { method } = message;

      if (method === PATCH_STORE_SUBSTREAM_METHODS.StartSendingPatches) {
        handleStartSendingPatches();
      } else if (method === PATCH_STORE_SUBSTREAM_METHODS.GetStatePatches) {
        handleGetStatePatches(message);
      } else if (message.id === undefined) {
        console.error(
          `Unrecognized patch-store substream notification method: ${method}`,
        );
      } else {
        outStream.write({
          id: message.id,
          jsonrpc: '2.0',
          error: rpcErrors.methodNotFound({
            message: `${method} not found`,
          }),
        });
      }
    };

    outStream.on('data', handleIncomingMessage);

    this.on('update', handleUpdate);

    onStreamClosed(outStream, () => {
      outStream.removeListener('data', handleIncomingMessage);
      this.removeListener('update', handleUpdate);
      patchStore.destroy();
    });

    return { initializePatchStore };
  }

  /**
   * A method for providing our API over a stream using JSON-RPC.
   *
   * @param {Substream} outStream - The stream to provide our API over.
   * @param {object} args - Additional arguments.
   * @param {() => void} args.initializePatchStore - Function to call after
   * retrieving state but before emitting the `startUISync` event, in order to
   * initialize the patch store.
   */
  setupControllerConnection(outStream, { initializePatchStore }) {
    const messengerSubscriptions = new MessengerSubscriptions(
      this.controllerMessenger,
      outStream,
    );

    const api = {
      ...this.getApi(),
      ...this.messengerClientApi,
      messengerSubscribe: messengerSubscriptions.subscribe.bind(
        messengerSubscriptions,
      ),
      messengerUnsubscribe: messengerSubscriptions.unsubscribe.bind(
        messengerSubscriptions,
      ),
      messengerCall: (method, params = []) =>
        this.controllerMessenger.call(method, ...params),
    };

    // report new active controller connection
    this.activeControllerConnections += 1;
    this.emit('controllerConnectionChanged', this.activeControllerConnections);

    // set up postStream transport
    outStream.on('data', createMetaRPCHandler(api, outStream));

    const startUISync = () => {
      if (!isStreamWritable(outStream)) {
        return;
      }

      const initialState = this.getState();
      // Start tracking patches immediately after retrieving initial state for
      // this UI connection (to include with the `startUISync` notification) to
      // ensure we don't miss any patches or include extra patches.
      initializePatchStore();

      outStream.write({
        jsonrpc: '2.0',
        method: START_UI_SYNC,
        params: [initialState],
      });
    };

    if (this.startUISync) {
      startUISync();
    } else {
      this.once('startUISync', startUISync);
    }

    onStreamClosed(outStream, () => {
      this.activeControllerConnections -= 1;
      this.emit(
        'controllerConnectionChanged',
        this.activeControllerConnections,
      );
      messengerSubscriptions.clear();
    });
  }

  /**
   * A method for serving our ethereum provider over a given stream.
   *
   * @param {*} outStream - The stream to provide over.
   * @param {MessageSender} sender - The sender of the messages on this stream
   * @param {SubjectType} subjectType - The type of the sender, i.e. subject.
   */
  setupProviderConnectionEip1193(outStream, sender, subjectType) {
    let origin;
    if (subjectType === SubjectType.Internal) {
      origin = ORIGIN_METAMASK;
    } else {
      origin = new URL(sender.url).origin;
    }

    if (sender.id && sender.id !== this.extension.runtime.id) {
      this.subjectMetadataController.addSubjectMetadata({
        origin,
        extensionId: sender.id,
        subjectType: SubjectType.Extension,
      });
    }

    let tabId;
    if (sender.tab && sender.tab.id) {
      tabId = sender.tab.id;
    }

    const { frameId } = sender;

    let mainFrameOrigin = origin;
    if (sender.tab && sender.tab.url) {
      // If sender origin is an iframe, then get the top-level frame's origin
      mainFrameOrigin = new URL(sender.tab.url).origin;
    }

    const engine = this.setupProviderEngineEip1193({
      origin,
      sender,
      subjectType,
      tabId,
      frameId,
      mainFrameOrigin,
    });

    const dupeReqFilterStream = createDupeReqFilterStream();

    // setup connection
    const providerStream = createEngineStream({ engine });

    const connectionId = this.addConnection(origin, {
      tabId,
      apiType: API_TYPE.EIP1193,
      engine,
    });

    pipeline(
      outStream,
      dupeReqFilterStream,
      providerStream,
      outStream,
      (err) => {
        // handle any middleware cleanup
        engine.destroy();
        connectionId && this.removeConnection(origin, connectionId);
        // For context and todos related to the error message match, see https://github.com/MetaMask/metamask-extension/issues/26337
        if (err && !err.message?.match('Premature close')) {
          log.error(err);
        }
      },
    );

    // Used to show wallet liveliness to the provider
    if (subjectType !== SubjectType.Internal) {
      this._notifyChainChangeForConnection({ engine }, origin);
    }
  }

  /**
   * A method for serving our CAIP provider over a given stream.
   *
   * @param {*} outStream - The stream to provide over.
   * @param {MessageSender} sender - The sender of the messages on this stream
   * @param {SubjectType} subjectType - The type of the sender, i.e. subject.
   */
  setupProviderConnectionCaip(outStream, sender, subjectType) {
    let origin;
    if (subjectType === SubjectType.Internal) {
      origin = ORIGIN_METAMASK;
    } else {
      origin = new URL(sender.url).origin;
    }

    if (sender.id && sender.id !== this.extension.runtime.id) {
      this.subjectMetadataController.addSubjectMetadata({
        origin,
        extensionId: sender.id,
        subjectType: SubjectType.Extension,
      });
    }

    let tabId;
    if (sender.tab && sender.tab.id) {
      tabId = sender.tab.id;
    }

    const { frameId } = sender;

    let mainFrameOrigin = origin;
    if (sender.tab && sender.tab.url) {
      mainFrameOrigin = new URL(sender.tab.url).origin;
    }

    const engine = this.setupProviderEngineCaip({
      origin,
      sender,
      subjectType,
      tabId,
      frameId,
      mainFrameOrigin,
    });

    const dupeReqFilterStream = createDupeReqFilterStream();

    // setup connection
    const providerStream = createEngineStream({ engine });

    const connectionId = this.addConnection(origin, {
      tabId,
      apiType: API_TYPE.CAIP_MULTICHAIN,
      engine,
    });

    pipeline(
      outStream,
      dupeReqFilterStream,
      providerStream,
      outStream,
      (err) => {
        // handle any middleware cleanup
        engine.destroy();
        connectionId && this.removeConnection(origin, connectionId);
        // For context and todos related to the error message match, see https://github.com/MetaMask/metamask-extension/issues/26337
        if (err && !err.message?.match('Premature close')) {
          log.error(err);
        }
      },
    );
  }

  /**
   * Creates middleware hooks that are shared between the Eip1193 and Multichain engines.
   *
   * @private
   * @param {string} origin - The connection's origin string.
   * @returns {object} The shared hooks.
   */
  setupCommonMiddlewareHooks(origin) {
    return {
      // Miscellaneous
      getProviderState: this.getProviderState.bind(this),
      handleWatchAssetRequest: this.handleWatchAssetRequest.bind(this),
      requestUserApproval:
        this.approvalController.addAndShowApprovalRequest.bind(
          this.approvalController,
        ),
      getCaveat: ({ target, caveatType }) => {
        try {
          return this.permissionController.getCaveat(
            origin,
            target,
            caveatType,
          );
        } catch (e) {
          if (e instanceof PermissionDoesNotExistError) {
            // suppress expected error in case that the origin
            // does not have the target permission yet
          } else {
            throw e;
          }
        }

        return undefined;
      },
      requestPermittedChainsPermissionIncrementalForOrigin: (options) =>
        requestPermittedChainsPermissionIncremental({
          ...options,
          origin,
          hooks: {
            requestPermissionsIncremental:
              this.permissionController.requestPermissionsIncremental.bind(
                this.permissionController,
              ),
            grantPermissionsIncremental:
              this.permissionController.grantPermissionsIncremental.bind(
                this.permissionController,
              ),
          },
        }),

      // Network configuration-related
      addNetwork: this._addNetworkAndSetActive.bind(this),
      updateNetwork: this.networkController.updateNetwork.bind(
        this.networkController,
      ),
      setActiveNetwork: async (networkClientId) => {
        // if the origin has the CAIP-25 permission
        // we set per dapp network selection state
        if (
          this.permissionController.hasPermission(
            origin,
            Caip25EndowmentPermissionName,
          )
        ) {
          this.selectedNetworkController.setNetworkClientIdForDomain(
            origin,
            networkClientId,
          );
        } else {
          await this.networkController.setActiveNetwork(networkClientId);
        }
      },
      getNetworkConfigurationByChainId:
        this.networkController.getNetworkConfigurationByChainId.bind(
          this.networkController,
        ),
      setTokenNetworkFilter: (chainId) => {
        const { tokenNetworkFilter } =
          this.preferencesController.getPreferences();
        if (chainId && Object.keys(tokenNetworkFilter).length === 1) {
          this.preferencesController.setPreference('tokenNetworkFilter', {
            [chainId]: true,
          });
        }
      },
      setEnabledNetworks: (chainId) => {
        this.networkEnablementController.enableNetwork(chainId);
      },
      getEnabledNetworks: (namespace) => {
        return (
          this.networkEnablementController.state.enabledNetworkMap[namespace] ||
          {}
        );
      },
      getCurrentChainIdForDomain: this.getCurrentChainIdForDomain.bind(this),

      rejectApprovalRequestsForOrigin: () =>
        this.rejectOriginPendingApprovals(origin),
    };
  }

  /**
   * A method for creating an ethereum provider that is safely restricted for the requesting subject.
   *
   * @param {object} options - Provider engine options
   * @param {string} options.origin - The origin of the sender
   * @param {MessageSender} options.sender - The sender object.
   * @param {string} options.subjectType - The type of the sender subject.
   * @param {tabId} [options.tabId] - The tab ID of the sender - if the sender is within a tab
   * @param {number} [options.frameId] - The frame ID of the sender (0 = top-level, >0 = iframe)
   * @param {mainFrameOrigin} [options.mainFrameOrigin] - The origin of the main frame if the sender is an iframe
   */
  setupProviderEngineEip1193({
    origin,
    subjectType,
    sender,
    tabId,
    frameId,
    mainFrameOrigin,
  }) {
    const engine = new JsonRpcEngine();

    // Append origin to each request
    engine.push(createOriginMiddleware({ origin }));

    // Append mainFrameOrigin to each request if present
    if (mainFrameOrigin) {
      engine.push(createMainFrameOriginMiddleware({ mainFrameOrigin }));
    }

    // Append selectedNetworkClientId to each request
    engine.push(createSelectedNetworkMiddleware(this.controllerMessenger));

    // If the origin is not in the selectedNetworkController's `domains` state
    // when the provider engine is created, the selectedNetworkController will
    // fetch the globally selected networkClient from the networkController and wrap
    // it in a proxy which can be switched to use its own state if/when the origin
    // is added to the `domains` state
    const proxyClient =
      this.selectedNetworkController.getProviderAndBlockTracker(origin);

    // We create the filter and subscription manager middleware now, but they will
    // be inserted into the engine later.
    const filterMiddleware = createFilterMiddleware(proxyClient);
    const subscriptionManager = createSubscriptionManager(proxyClient);
    subscriptionManager.events.on('notification', (message) =>
      engine.emit('notification', message),
    );

    // Append tabId to each request if it exists
    if (tabId) {
      engine.push(createTabIdMiddleware({ tabId }));
    }

    // Append frameId to each request if provided, including 0 for top-level frames
    if (typeof frameId === 'number') {
      engine.push(createFrameIdMiddleware({ frameId }));
    }

    engine.push(createLoggerMiddleware({ origin }));
    engine.push(this.permissionLogController.createMiddleware());

    engine.push(createTracingMiddleware());

    engine.push(
      createOriginThrottlingMiddleware({
        getThrottledOriginState:
          this.appStateController.getThrottledOriginState.bind(
            this.appStateController,
          ),
        updateThrottledOriginState:
          this.appStateController.updateThrottledOriginState.bind(
            this.appStateController,
          ),
      }),
    );

    engine.push(createUnsupportedMethodMiddleware());

    // Legacy RPC method that needs to be implemented _ahead of_ the permission
    // middleware.
    engine.push(
      createEthAccountsMethodMiddleware({
        getAccounts: this.getPermittedAccounts.bind(this, origin),
      }),
    );

    if (subjectType !== SubjectType.Internal) {
      engine.push(
        this.permissionController.createPermissionMiddleware({
          origin,
        }),
      );

      // Add Defi referral partner permission monitoring middleware
      engine.push(
        createDefiReferralMiddleware((partner, referralTabId, triggerType) =>
          this.handleDefiReferral(partner, referralTabId, triggerType),
        ),
      );
    }

    if (subjectType === SubjectType.Website) {
      engine.push(
        createOnboardingMiddleware({
          location: sender.url,
          registerOnboarding: this.onboardingController.registerOnboarding.bind(
            this.onboardingController,
          ),
        }),
      );
    }

    // Unrestricted/permissionless RPC method implementations.
    // They must nevertheless be placed _behind_ the permission middleware.
    engine.push(
      createEip1193MethodMiddleware({
        ...this.setupCommonMiddlewareHooks(origin),

        // Miscellaneous
        // Permission-related
        getAccounts: this.getPermittedAccounts.bind(this, origin),
        getCaip25PermissionFromLegacyPermissionsForOrigin: (
          requestedPermissions,
        ) => getCaip25PermissionFromLegacyPermissions(requestedPermissions),
        getPermissionsForOrigin: this.permissionController.getPermissions.bind(
          this.permissionController,
          origin,
        ),

        requestPermissionsForOrigin: (requestedPermissions) =>
          this.permissionController.requestPermissions(
            { origin },
            requestedPermissions,
            {
              metadata: {
                isEip1193Request: true,
              },
            },
          ),
        revokePermissionsForOrigin: (permissionKeys) => {
          try {
            this.permissionController.revokePermissions({
              [origin]: permissionKeys,
            });
          } catch (e) {
            // we dont want to handle errors here because
            // the revokePermissions api method should just
            // return `null` if the permissions were not
            // successfully revoked or if the permissions
            // for the origin do not exist
            console.log(e);
          }
        },

        updateCaveat: this.permissionController.updateCaveat.bind(
          this.permissionController,
          origin,
        ),
        hasApprovalRequestsForOrigin: () =>
          this.approvalController.hasRequest({ origin }),
      }),
    );

    engine.push(filterMiddleware);
    engine.push(subscriptionManager.middleware);

    engine.push(this.metamaskMiddleware);

    engine.push(this.eip5792Middleware);

    engine.push(providerAsMiddleware(proxyClient.provider));

    return engine;
  }

  /**
   * A method for creating a CAIP Multichain provider that is safely restricted for the requesting subject.
   *
   * @param {object} options - Provider engine options
   * @param {string} options.origin - The origin of the sender
   * @param {MessageSender} options.sender - The sender object.
   * @param {string} options.subjectType - The type of the sender subject.
   * @param {tabId} [options.tabId] - The tab ID of the sender - if the sender is within a tab
   * @param {number} [options.frameId] - The frame ID of the sender (0 = top-level, >0 = iframe)
   * @param {mainFrameOrigin} [options.mainFrameOrigin] - The origin of the main frame if the sender is an iframe
   */
  setupProviderEngineCaip({
    origin,
    sender,
    subjectType,
    tabId,
    frameId,
    mainFrameOrigin,
  }) {
    const engine = new JsonRpcEngine();

    // Append origin to each request
    engine.push(createOriginMiddleware({ origin }));

    // Append mainFrameOrigin to each request if present
    if (mainFrameOrigin) {
      engine.push(createMainFrameOriginMiddleware({ mainFrameOrigin }));
    }

    // Append tabId to each request if it exists
    if (tabId) {
      engine.push(createTabIdMiddleware({ tabId }));
    }

    // Append frameId to each request if provided, including 0 for top-level frames
    if (typeof frameId === 'number') {
      engine.push(createFrameIdMiddleware({ frameId }));
    }

    engine.push(createLoggerMiddleware({ origin }));

    engine.push((req, _res, next, end) => {
      if (
        ![
          MESSAGE_TYPE.WALLET_CREATE_SESSION,
          MESSAGE_TYPE.WALLET_INVOKE_METHOD,
          MESSAGE_TYPE.WALLET_GET_SESSION,
          MESSAGE_TYPE.WALLET_REVOKE_SESSION,
        ].includes(req.method)
      ) {
        return end(rpcErrors.methodNotFound({ data: { method: req.method } }));
      }
      return next();
    });

    engine.push(multichainMethodCallValidatorMiddleware);
    const middlewareMaker = makeMethodMiddlewareMaker([
      walletRevokeSession,
      walletGetSession,
      walletInvokeMethod,
      walletCreateSession,
    ]);

    engine.push(
      middlewareMaker({
        findNetworkClientIdByChainId:
          this.networkController.findNetworkClientIdByChainId.bind(
            this.networkController,
          ),
        listAccounts: this.accountsController.listAccounts.bind(
          this.accountsController,
        ),
        requestPermissionsForOrigin: (requestedPermissions, options = {}) =>
          this.permissionController.requestPermissions(
            { origin },
            requestedPermissions,
            options,
          ),
        getCaveatForOrigin: this.permissionController.getCaveat.bind(
          this.permissionController,
          origin,
        ),
        updateCaveat: this.permissionController.updateCaveat.bind(
          this.permissionController,
          origin,
        ),
        getSelectedNetworkClientId: () =>
          this.networkController.state.selectedNetworkClientId,
        revokePermissionForOrigin:
          this.permissionController.revokePermission.bind(
            this.permissionController,
            origin,
          ),
        getNonEvmSupportedMethods: () => [],
        isNonEvmScopeSupported: () => false,
        handleNonEvmRequestForOrigin: () => {
          throw new Error('Non-EVM requests are not supported');
        },
        getNonEvmAccountAddresses: () => [],
        trackSessionCreatedEvent: () => undefined,
        sortAccountIdsByLastSelected:
          this.sortAccountIdsByLastSelected.bind(this),
      }),
    );

    engine.push(
      createUnsupportedMethodMiddleware(
        new Set([
          ...UNSUPPORTED_RPC_METHODS,
          'eth_requestAccounts',
          'eth_accounts',
        ]),
      ),
    );

    if (subjectType === SubjectType.Website) {
      engine.push(
        createOnboardingMiddleware({
          location: sender.url,
          registerOnboarding: this.onboardingController.registerOnboarding.bind(
            this.onboardingController,
          ),
        }),
      );
    }

    engine.push(
      createMultichainMethodMiddleware(this.setupCommonMiddlewareHooks(origin)),
    );

    engine.push(this.metamaskMiddleware);

    engine.push(this.eip5792Middleware);

    try {
      const caip25Caveat = this.permissionController.getCaveat(
        origin,
        Caip25EndowmentPermissionName,
        Caip25CaveatType,
      );

      // add new notification subscriptions for changed authorizations
      const sessionScopes = getSessionScopes(caip25Caveat.value);

      // if the eth_subscription notification is in the scope and eth_subscribe is in the methods
      // then get the subscriptionManager going for that scope
      Object.entries(sessionScopes).forEach(([scope, scopeObject]) => {
        if (
          scopeObject.notifications.includes('eth_subscription') &&
          scopeObject.methods.includes('eth_subscribe')
        ) {
          this.addMultichainApiEthSubscriptionMiddleware({
            scope,
            origin,
            tabId,
          });
        }
      });
    } catch (err) {
      // noop
    }

    this.multichainSubscriptionManager.on(
      'notification',
      (targetOrigin, targetTabId, message) => {
        if (origin === targetOrigin && tabId === targetTabId) {
          engine.emit('notification', message);
        }
      },
    );

    engine.push(
      this.multichainMiddlewareManager.generateMultichainMiddlewareForOriginAndTabId(
        origin,
        tabId,
      ),
    );

    engine.push(async (req, res, _next, end) => {
      const { provider } = this.networkController.getNetworkClientById(
        req.networkClientId,
      );
      res.result = await provider.request(req);
      return end();
    });

    return engine;
  }

  /**
   * TODO:LegacyProvider: Delete
   * A method for providing our public config info over a stream.
   * This includes info we like to be synchronous if possible, like
   * the current selected account, and network ID.
   *
   * Since synchronous methods have been deprecated in web3,
   * this is a good candidate for deprecation.
   *
   * @param {*} outStream - The stream to provide public config over.
   */
  setupPublicConfig(outStream) {
    const configStream = storeAsStream(this.publicConfigStore);

    pipeline(configStream, outStream, (err) => {
      configStream.destroy();
      // For context and todos related to the error message match, see https://github.com/MetaMask/metamask-extension/issues/26337
      if (err && !err.message?.match('Premature close')) {
        log.error(err);
      }
    });
  }

  /**
   * Adds a reference to a connection by origin. Ignores the 'metamask' origin.
   * Caller must ensure that the returned id is stored such that the reference
   * can be deleted later.
   *
   * @param {string} origin - The connection's origin string.
   * @param {object} options - Data associated with the connection
   * @param {object} options.engine - The connection's JSON Rpc Engine
   * @param {number} options.tabId - The tabId for the connection
   * @param {API_TYPE} options.apiType - The API type for the connection
   * @returns {string} The connection's id (so that it can be deleted later)
   */
  addConnection(origin, { tabId, apiType, engine }) {
    if (origin === ORIGIN_METAMASK) {
      return null;
    }

    if (!this.connections[origin]) {
      this.connections[origin] = {};
    }

    const id = nanoid();
    this.connections[origin][id] = {
      tabId,
      apiType,
      engine,
    };

    return id;
  }

  /**
   * Deletes a reference to a connection, by origin and id.
   * Ignores unknown origins.
   *
   * @param {string} origin - The connection's origin string.
   * @param {string} id - The connection's id, as returned from addConnection.
   */
  removeConnection(origin, id) {
    const connections = this.connections[origin];
    if (!connections) {
      return;
    }

    delete connections[id];

    if (Object.keys(connections).length === 0) {
      delete this.connections[origin];
    }
  }

  /**
   * Causes the RPC engines associated with the connections to the given origin
   * to emit a notification event with the given payload.
   *
   * The caller is responsible for ensuring that only permitted notifications
   * are sent.
   *
   * Ignores unknown origins.
   *
   * @param {string} origin - The connection's origin string.
   * @param {unknown} payload - The event payload.
   * @param apiType
   */
  notifyConnections(origin, payload, apiType) {
    const connections = this.connections[origin];
    if (connections) {
      Object.values(connections).forEach((conn) => {
        if (apiType && conn.apiType !== apiType) {
          return;
        }
        if (conn.engine) {
          conn.engine.emit('notification', payload);
        }
      });
    }
  }

  /**
   * Causes the RPC engines associated with all connections to emit a
   * notification event with the given payload.
   *
   * If the "payload" parameter is a function, the payload for each connection
   * will be the return value of that function called with the connection's
   * origin.
   *
   * The caller is responsible for ensuring that only permitted notifications
   * are sent.
   *
   * @param {unknown} payload - The event payload, or payload getter function.
   * @param apiType
   */
  notifyAllConnections(payload, apiType) {
    const getPayload =
      typeof payload === 'function'
        ? (origin) => payload(origin)
        : () => payload;

    Object.keys(this.connections).forEach((origin) => {
      Object.values(this.connections[origin]).forEach(async (conn) => {
        if (apiType && conn.apiType !== apiType) {
          return;
        }
        try {
          this.notifyConnection(conn, await getPayload(origin));
        } catch (err) {
          console.error(err);
        }
      });
    });
  }

  /**
   * Causes the RPC engine for passed connection to emit a
   * notification event with the given payload.
   *
   * The caller is responsible for ensuring that only permitted notifications
   * are sent.
   *
   * @param {object} connection - Data associated with the connection
   * @param {object} connection.engine - The connection's JSON Rpc Engine
   * @param {unknown} payload - The event payload
   */
  notifyConnection(connection, payload) {
    try {
      if (connection.engine) {
        connection.engine.emit('notification', payload);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // handlers
  /**
   * Handle global application unlock.
   */
  _onUnlock() {
    this.unMarkPasswordForgotten();

    // In the current implementation, this handler is triggered by a
    // KeyringController event. Other controllers subscribe to the 'unlock'
    // event of the MetaMaskController itself.
    this.emit('unlock');
  }

  /**
   * Handle global application lock.
   */
  _onLock() {
    // In the current implementation, this handler is triggered by a
    // KeyringController event. Other controllers subscribe to the 'lock'
    // event of the MetaMaskController itself.
    this.emit('lock');
  }

  /**
   * Handle memory state updates.
   * - Ensure isClientOpenAndUnlocked is updated
   * - Notifies all connections with the new provider network state
   *   - The external providers handle diffing the state
   *
   * @param newState
   */
  _onStateUpdate(newState) {
    this.isClientOpenAndUnlocked = newState.isUnlocked && this._isClientOpen;
    this._notifyChainChange();
  }

  /**
   * Execute side effects of a removed account.
   *
   * @param {string} address - The address of the account to remove.
   */
  _onAccountRemoved(address) {
    // Remove all associated permissions
    this.removeAllAccountPermissions(address);
  }

  // misc

  /**
   * A method for emitting the full MetaMask state to all registered listeners.
   *
   * @private
   */
  privateSendUpdate() {
    this.emit('update', this.getState());
  }

  /**
   * @returns {boolean} Whether the extension is unlocked.
   */
  isUnlocked() {
    return this.keyringController.state.isUnlocked;
  }

  //=============================================================================
  // MISCELLANEOUS
  //=============================================================================

  /**
   * The chain list is fetched live at runtime, falling back to a cache.
   * This preseeds the cache at startup with a static list provided at build.
   */
  async initializeChainlist() {
    const cacheKey = `cachedFetch:${CHAIN_SPEC_URL}`;
    const { cachedResponse } = (await getStorageItem(cacheKey)) || {};
    if (cachedResponse) {
      // Also initialize the known domains when we have chain data cached
      await initializeRpcProviderDomains();
      return;
    }
    await setStorageItem(cacheKey, {
      cachedResponse: rawChainData(),
      // Cached value is immediately invalidated
      cachedTime: 0,
    });
    // Initialize domains after setting the chainlist cache
    await initializeRpcProviderDomains();
  }

  /**
   * Returns the nonce that will be associated with a transaction once approved
   *
   * @param {string} address - The hex string address for the transaction
   * @param networkClientId - The networkClientId to get the nonce lock with
   * @returns {Promise<number>}
   */
  async getPendingNonce(address, networkClientId) {
    const { nonceDetails, releaseLock } = await this.txController.getNonceLock(
      address,
      networkClientId,
    );

    const pendingNonce = nonceDetails.params.highestSuggested;

    releaseLock();
    return pendingNonce;
  }

  /**
   * Returns the next nonce according to the nonce-tracker
   *
   * @param {string} address - The hex string address for the transaction
   * @param networkClientId - The networkClientId to get the nonce lock with
   * @returns {Promise<number>}
   */
  async getNextNonce(address, networkClientId) {
    const nonceLock = await this.txController.getNonceLock(
      address,
      networkClientId,
    );
    nonceLock.releaseLock();
    return nonceLock.nextNonce;
  }

  /**
   * Throw an artificial error in a timeout handler for testing purposes.
   *
   * @param message - The error message.
   * @deprecated This is only meant to facilitate manual and E2E testing. We should not
   * use this for handling errors.
   */
  throwTestError(message) {
    setTimeout(() => {
      const error = new Error(message);
      error.name = 'TestError';
      throw error;
    });
  }

  /**
   * Capture an artificial error in a timeout handler for testing purposes.
   *
   * @param message - The error message.
   * @deprecated This is only meant to facilitate manual and E2E tests testing. We should not
   * use this for handling errors.
   */
  captureTestError(message) {
    setTimeout(() => {
      const error = new Error(message);
      error.name = 'TestError';
      captureException(error);
    });
  }

  toggleExternalServices(useExternal) {
    const nextValue = Boolean(useExternal);

    this.preferencesController.toggleExternalServices(nextValue);
    if (nextValue) {
      this.tokenDetectionController.enable();
    } else {
      this.tokenDetectionController.disable();
    }
  }

  //=============================================================================
  // CONFIG
  //=============================================================================

  /**
   * Sets the Ledger Live preference to use for Ledger hardware wallet support
   *
   * @param keyring
   * @deprecated This method is deprecated and will be removed in the future.
   * Only webhid connections are supported in chrome and u2f in firefox.
   */
  async setLedgerTransportPreference(keyring) {
    const transportType = window.navigator.hid
      ? LedgerTransportTypes.webhid
      : LedgerTransportTypes.u2f;

    if (keyring?.updateTransportMethod) {
      return keyring.updateTransportMethod(transportType).catch((e) => {
        throw e;
      });
    }

    return undefined;
  }

  // TODO: Replace isClientOpen methods with `controllerConnectionChanged` events.
  /* eslint-disable accessor-pairs */
  /**
   * A method for recording whether the MetaMask user interface is open or not.
   *
   * @param {boolean} open
   */
  set isClientOpen(open) {
    this._isClientOpen = open;

    this.controllerMessenger.call('ClientController:setUiOpen', open);

    const { isUnlocked } = this.controllerMessenger.call(
      'KeyringController:getState',
    );

    if (isUnlocked) {
      // noop
    }
  }
  /* eslint-enable accessor-pairs */

  /**
   * A method that is called by the background when all instances of metamask are closed.
   * Currently used to stop controller polling.
   */
  onClientClosed() {
    try {
      this.gasFeeController.stopAllPolling();
      this.currencyRateController.stopAllPolling();
      this.tokenRatesController.stopAllPolling();
      this.tokenDetectionController.stopAllPolling();
      this.tokenListController.stopAllPolling();
      this.tokenBalancesController.stopAllPolling();
      this.staticAssetsController.stopAllPolling();
      this.appStateController.clearPollingTokens();
      this.accountTrackerController.stopAllPolling();
      this.deFiPositionsController.stopAllPolling();
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * A method that is called by the background when a particular environment type is closed (fullscreen, popup, notification).
   * Currently used to stop polling controllers for only that environement type
   *
   * @param environmentType
   */
  onEnvironmentTypeClosed(environmentType) {
    const appStatePollingTokenType =
      POLLING_TOKEN_ENVIRONMENT_TYPES[environmentType];
    const pollingTokensToDisconnect =
      this.appStateController.state[appStatePollingTokenType];
    pollingTokensToDisconnect.forEach((pollingToken) => {
      // We don't know which controller the token is associated with, so try them all.
      // Consider storing the tokens per controller in state instead.
      this.gasFeeController.stopPollingByPollingToken(pollingToken);
      this.currencyRateController.stopPollingByPollingToken(pollingToken);
      this.tokenRatesController.stopPollingByPollingToken(pollingToken);
      this.tokenDetectionController.stopPollingByPollingToken(pollingToken);
      this.tokenListController.stopPollingByPollingToken(pollingToken);
      this.tokenBalancesController.stopPollingByPollingToken(pollingToken);
      this.staticAssetsController.stopPollingByPollingToken(pollingToken);
      this.accountTrackerController.stopPollingByPollingToken(pollingToken);
      this.appStateController.removePollingToken(
        pollingToken,
        appStatePollingTokenType,
      );
    });
  }

  /**
   * Locks MetaMask
   *
   * @param {object} _options - The options for setting the locked state.
   */
  async setLocked(_options = {}) {
    await this.keyringController.setLocked();
  }

  removePermissionsFor = (subjects) => {
    try {
      this.permissionController.revokePermissions(subjects);
    } catch (exp) {
      if (!(exp instanceof PermissionsRequestNotFoundError)) {
        throw exp;
      }
    }
  };

  updateCaveat = (origin, target, caveatType, caveatValue) => {
    try {
      this.controllerMessenger.call(
        'PermissionController:updateCaveat',
        origin,
        target,
        caveatType,
        caveatValue,
      );
    } catch (exp) {
      if (!(exp instanceof PermissionsRequestNotFoundError)) {
        throw exp;
      }
    }
  };

  updateNetworksList = (chainIds) => {
    try {
      this.networkOrderController.updateNetworksList(chainIds);
    } catch (err) {
      log.error(err.message);
      throw err;
    }
  };

  /**
   * Updates the pinned accounts list
   *
   * @deprecated This method is deprecated and will be removed in the future.
   * use AccountTreeController.setAccountGroupPinned instead
   * @param {AccountAddress[]} pinnedAccountList - The list of accounts to update in the state.
   */
  updateAccountsList = (pinnedAccountList) => {
    try {
      this.accountOrderController.updateAccountsList(pinnedAccountList);
    } catch (err) {
      log.error(err.message);
      throw err;
    }
  };

  setEnabledNetworks = async (chainId) => {
    try {
      this.networkEnablementController.enableNetwork(chainId);
    } catch (err) {
      log.error(err.message);
      throw err;
    }

    await this.lookupSelectedNetworks();
  };

  setEnabledAllPopularNetworks = async () => {
    try {
      this.networkEnablementController.enableAllPopularNetworks();
    } catch (err) {
      log.error(err.message);
      throw err;
    }

    await this.lookupSelectedNetworks();
  };

  /**
   * Updates the hidden accounts list
   *
   * @deprecated This method is deprecated and will be removed in the future.
   * use AccountTreeController.setAccountGroupHidden instead
   * @param {AccountAddress[]} hiddenAccountList - The list of accounts to update in the state.
   */
  updateHiddenAccountsList = (hiddenAccountList) => {
    try {
      this.accountOrderController.updateHiddenAccountsList(hiddenAccountList);
    } catch (err) {
      log.error(err.message);
      throw err;
    }
  };

  rejectPermissionsRequest = (requestId) => {
    try {
      this.permissionController.rejectPermissionsRequest(requestId);
    } catch (exp) {
      if (!(exp instanceof PermissionsRequestNotFoundError)) {
        throw exp;
      }
    }
  };

  acceptPermissionsRequest = (request) => {
    try {
      this.permissionController.acceptPermissionsRequest(request);
    } catch (exp) {
      if (!(exp instanceof PermissionsRequestNotFoundError)) {
        throw exp;
      }
    }
  };

  /**
   * Resolve a pending approval. For hardware wallet transactions and signatures,
   * this handles error parsing.
   *
   * @param {string} id - The approval ID
   * @param {unknown} value - The value to resolve with (for transactions, contains txMeta)
   * @param {object} options - Options for the approval
   * @param {string} [options.walletType] - The hardware wallet type (if hardware wallet)
   * @param {boolean} [options.waitForResult] - Whether to wait for the result
   */
  resolvePendingApproval = async (id, value, options = {}) => {
    // RPC params may serialize an omitted argument as `null`, so normalize first
    // before destructuring to avoid a runtime TypeError.
    const normalizedOptions = options ?? {};
    const { walletType, waitForResult } = normalizedOptions;
    const approvalOptions =
      typeof waitForResult === 'boolean' ? { waitForResult } : undefined;

    try {
      await this.approvalController.acceptRequest(id, value, approvalOptions);
    } catch (error) {
      // Ignore if approval was already handled
      if (error instanceof ApprovalRequestNotFoundError) {
        return;
      }

      if (walletType) {
        await this.#handleHardwareWalletError(error, walletType);
        return;
      }

      throw error;
    }
  };

  rejectPendingApproval = (id, error) => {
    try {
      this.approvalController.rejectRequest(
        id,
        new JsonRpcError(error.code, error.message, error.data),
      );
    } catch (exp) {
      if (!(exp instanceof ApprovalRequestNotFoundError)) {
        throw exp;
      }
    }
  };

  /**
   * Handle hardware wallet errors with retry support.
   * Parses the error, checks if it's retryable, and if so, attempts to recreate
   * the request (transaction or signature). Always throws an RPC error with
   * properly formatted data.
   *
   * @param {Error} error - The original error from the hardware wallet
   * @param {string} walletType - The hardware wallet type (e.g., 'Ledger', 'Trezor')
   * @throws {JsonRpcError} Always throws with hardware wallet error data
   */
  async #handleHardwareWalletError(error, walletType) {
    const hwError = toHardwareWalletError(error, walletType);
    const createRpcError = isUserRejectedHardwareWalletError(hwError)
      ? providerErrors.userRejectedRequest
      : rpcErrors.internal;
    // Throw a JsonRpcError with hardware wallet error data preserved
    // This ensures the error properties survive serialization across the RPC boundary
    throw createRpcError({
      message: hwError.message,
      data: {
        code: hwError.code,
        severity: hwError.severity,
        category: hwError.category,
        userMessage: hwError.userMessage,
        metadata: hwError.metadata,
      },
    });
  }

  /**
   * Approve a hardware wallet transaction with retry support.
   * This is a convenience wrapper around resolvePendingApproval for the
   * transaction confirmation flow, which passes txMeta in a specific format.
   *
   * @param {object} opts - Options for the transaction
   * @param {string} opts.txId - The transaction ID to approve
   * @param {object} opts.txMeta - The transaction metadata
   * @param {string} opts.actionId - The action ID for tracking
   * @param {string} opts.walletType - The hardware wallet type (e.g., 'Ledger', 'Trezor')
   * @throws {JsonRpcError} When hardware wallet error occurs (with recreatedTxId if recreation succeeded)
   */
  approveHardwareWalletTransaction = async ({
    txId,
    txMeta,
    actionId,
    walletType,
  }) => {
    await this.resolvePendingApproval(
      String(txId),
      { txMeta, actionId },
      { waitForResult: true, walletType },
    );
  };

  rejectAllPendingApprovals() {
    const deleteInterface = () => undefined;

    rejectAllApprovals({
      approvalController: this.approvalController,
      deleteInterface,
    });
  }

  async getCode(address, networkClientId) {
    const { provider } =
      this.networkController.getNetworkClientById(networkClientId);

    return await provider.request({
      method: 'eth_getCode',
      params: [address],
    });
  }

  async verifyOneDoRuntimeDeployment(networkClientId) {
    const { provider } =
      this.networkController.getNetworkClientById(networkClientId);

    return await verifyOneDoRuntimeDeployment(provider);
  }

  async isAppEnabled(address, app, networkClientId) {
    const { provider } =
      this.networkController.getNetworkClientById(networkClientId);
    const contractCall = new Interface([
      'function isAppEnabled(address app) view returns (bool)',
    ]);
    const data = contractCall.encodeFunctionData('isAppEnabled', [app]);
    const result = await provider.request({
      method: 'eth_call',
      params: [
        {
          to: address,
          data,
        },
        'latest',
      ],
    });
    const [enabled] = contractCall.decodeFunctionResult('isAppEnabled', result);
    return Boolean(enabled);
  }

  async _onAccountChange(newAddress) {
    const permittedAccountsMap = getPermittedAccountsByOrigin(
      this.permissionController.state,
    );

    for (const [origin, accounts] of permittedAccountsMap.entries()) {
      if (accounts.includes(newAddress)) {
        this._notifyAccountsChange(origin, accounts);
      }
    }
  }

  _notifyAccountsChange(origin, newAccounts) {
    this.notifyConnections(
      origin,
      {
        method: NOTIFICATION_NAMES.accountsChanged,
        // This should be the same as the return value of `eth_accounts`,
        // namely an array of the current / most recently selected Ethereum
        // account.
        params:
          newAccounts.length < 2
            ? // If the length is 1 or 0, the accounts are sorted by definition.
              newAccounts
            : // If the length is 2 or greater, we have to execute
              // `eth_accounts` vi this method.
              this.getPermittedAccounts(origin),
      },
      API_TYPE.EIP1193,
    );

    this.permissionLogController.updateAccountsHistory(origin, newAccounts);
  }

  async _notifyAuthorizationChange(origin, newAuthorization) {
    const sessionScopes = getSessionScopes(newAuthorization, {
      sortAccountIdsByLastSelected:
        this.sortAccountIdsByLastSelected.bind(this),
    });

    this.notifyConnections(
      origin,
      {
        method: MultichainApiNotifications.sessionChanged,
        params: {
          sessionScopes,
        },
      },
      API_TYPE.CAIP_MULTICHAIN,
    );
  }

  /**
   * Sorts CAIP account IDs by the associated account address lastSelected value.
   *
   * @param {string[]} accountIds - CAIP account IDs to sort.
   * @returns {string[]} Sorted CAIP account IDs.
   */
  sortAccountIdsByLastSelected(accountIds) {
    if (accountIds.length < 2) {
      return accountIds;
    }

    const addressByCaipAccountId = new Map(
      accountIds.map((caipAccountId) => {
        const { address } = parseCaipAccountId(caipAccountId);
        return [caipAccountId, address];
      }),
    );

    const addresses = [...new Set(addressByCaipAccountId.values())];
    const sortedAddresses =
      this.sortMultichainAccountsByLastSelected(addresses);
    const rankByAddress = new Map(
      sortedAddresses.map((address, index) => [address, index]),
    );

    return [...accountIds].sort(
      (firstAccountId, secondAccountId) =>
        rankByAddress.get(addressByCaipAccountId.get(firstAccountId)) -
        rankByAddress.get(addressByCaipAccountId.get(secondAccountId)),
    );
  }

  /**
   * Gets the selected account address from a caveat value for the given scopes.
   *
   * @param {object|undefined} caveatValue - The caveat value from permission state.
   * @param {string[]} scopes - Array of scope identifiers (e.g., SOLANA_CHAINS, TRON_CHAINS).
   * @returns {string|undefined} The selected account address, or undefined if none.
   * @private
   */
  _getSelectedMultichainAccountAddress(caveatValue, scopes) {
    if (!caveatValue) {
      return undefined;
    }
    const caipAccountIds = getPermittedAccountsForScopes(caveatValue, scopes);
    const addresses = uniq(
      caipAccountIds.map(
        (caipAccountId) => parseCaipAccountId(caipAccountId).address,
      ),
    );
    return this.sortMultichainAccountsByLastSelected(addresses)?.[0];
  }

  async _notifyMultichainAccountChange(origin, accountAddressArray, scope) {
    this.notifyConnections(
      origin,
      {
        method: MultichainApiNotifications.walletNotify,
        params: {
          scope,
          notification: {
            method: NOTIFICATION_NAMES.accountsChanged,
            params: accountAddressArray,
          },
        },
      },
      API_TYPE.CAIP_MULTICHAIN,
    );
  }

  async _notifyChainChange() {
    this.notifyAllConnections(
      async (origin) => ({
        method: NOTIFICATION_NAMES.chainChanged,
        params: await this.getProviderNetworkState({ origin }),
      }),
      API_TYPE.EIP1193,
    );
  }

  async _notifyChainChangeForConnection(connection, origin) {
    this.notifyConnection(connection, {
      method: NOTIFICATION_NAMES.chainChanged,
      params: await this.getProviderNetworkState({ origin }),
    });
  }

  /**
   * @deprecated
   * Controllers should subscribe to messenger events internally rather than relying on the client.
   * @param transactionMeta - Metadata for the transaction.
   */
  async _onFinishedTransaction(transactionMeta) {
    if (
      ![TransactionStatus.confirmed, TransactionStatus.failed].includes(
        transactionMeta.status,
      )
    ) {
      return;
    }
    const startTime = performance.now();

    const traceContext = trace({
      name: TraceName.OnFinishedTransaction,
      startTime: performance.timeOrigin,
    });

    trace({
      name: TraceName.OnFinishedTransaction,
      startTime: performance.timeOrigin,
      parentContext: traceContext,
      data: {
        transactionMeta,
      },
    });

    await this._createTransactionNotifcation(transactionMeta);
    await this._updateNFTOwnership(transactionMeta);
    await this.tokenBalancesController.updateBalances({
      chainIds: [transactionMeta.chainId],
    });
    endTrace({
      name: TraceName.OnFinishedTransaction,
      timestamp: performance.timeOrigin + startTime,
    });
  }

  async _createTransactionNotifcation(transactionMeta) {
    const { chainId } = transactionMeta;
    let rpcPrefs = {};

    if (chainId) {
      const networkConfiguration =
        this.networkController.state.networkConfigurationsByChainId?.[chainId];

      const blockExplorerUrl =
        networkConfiguration?.blockExplorerUrls?.[
          networkConfiguration?.defaultBlockExplorerUrlIndex
        ];

      rpcPrefs = { blockExplorerUrl };
    }

    try {
      await this.platform.showTransactionNotification(
        transactionMeta,
        rpcPrefs,
      );
    } catch (error) {
      log.error('Failed to create transaction notification', error);
    }
  }

  async _updateNFTOwnership(transactionMeta) {
    // if this is a transferFrom method generated from within the app it may be an NFT transfer transaction
    // in which case we will want to check and update ownership status of the transferred NFT.

    const { type, txParams, chainId, txReceipt } = transactionMeta;
    const selectedAddress =
      this.accountsController.getSelectedAccount().address;

    const { allNfts } = this.nftController.state;
    const txReceiptLogs = txReceipt?.logs;

    const isContractInteractionTx =
      type === TransactionType.contractInteraction && txReceiptLogs;
    const isTransferFromTx =
      (type === TransactionType.tokenMethodTransferFrom ||
        type === TransactionType.tokenMethodSafeTransferFrom) &&
      txParams !== undefined;

    if (!isContractInteractionTx && !isTransferFromTx) {
      return;
    }

    const networkClientId =
      this.networkController?.state?.networkConfigurationsByChainId?.[chainId]
        ?.rpcEndpoints[
        this.networkController?.state?.networkConfigurationsByChainId?.[chainId]
          ?.defaultRpcEndpointIndex
      ]?.networkClientId;

    if (isTransferFromTx) {
      const { data, to: contractAddress, from: userAddress } = txParams;
      const transactionData = parseStandardTokenTransactionData(data);
      // Sometimes the tokenId value is parsed as "_value" param. Not seeing this often any more, but still occasionally:
      // i.e. call approve() on BAYC contract - https://etherscan.io/token/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d#writeContract, and tokenId shows up as _value,
      // not sure why since it doesn't match the ERC721 ABI spec we use to parse these transactions - https://github.com/MetaMask/metamask-eth-abis/blob/d0474308a288f9252597b7c93a3a8deaad19e1b2/src/abis/abiERC721.ts#L62.
      const transactionDataTokenId =
        getTokenIdParam(transactionData) ?? getTokenValueParam(transactionData);

      // check if its a known NFT
      const knownNft = allNfts?.[userAddress]?.[chainId]?.find(
        ({ address, tokenId }) =>
          isEqualCaseInsensitive(address, contractAddress) &&
          tokenId === transactionDataTokenId,
      );

      // if it is we check and update ownership status.
      if (knownNft) {
        this.nftController.checkAndUpdateSingleNftOwnershipStatus(
          knownNft,
          networkClientId,
          // TODO add networkClientId once it is available in the transactionMeta
          // the chainId previously passed here didn't actually allow us to check for ownership on a non globally selected network
          // because the check would use the provider for the globally selected network, not the chainId passed here.
          { userAddress },
        );
      }
    } else {
      // Else if contract interaction we will parse the logs

      const allNftTransferLog = txReceiptLogs.map((txReceiptLog) => {
        const isERC1155NftTransfer =
          txReceiptLog.topics &&
          txReceiptLog.topics[0] === TRANSFER_SINFLE_LOG_TOPIC_HASH;
        const isERC721NftTransfer =
          txReceiptLog.topics &&
          txReceiptLog.topics[0] === TOKEN_TRANSFER_LOG_TOPIC_HASH;
        let isTransferToSelectedAddress;

        if (isERC1155NftTransfer) {
          isTransferToSelectedAddress =
            txReceiptLog.topics &&
            txReceiptLog.topics[3] &&
            txReceiptLog.topics[3].match(selectedAddress?.slice(2));
        }

        if (isERC721NftTransfer) {
          isTransferToSelectedAddress =
            txReceiptLog.topics &&
            txReceiptLog.topics[2] &&
            txReceiptLog.topics[2].match(selectedAddress?.slice(2));
        }

        return {
          isERC1155NftTransfer,
          isERC721NftTransfer,
          isTransferToSelectedAddress,
          ...txReceiptLog,
        };
      });
      if (allNftTransferLog.length !== 0) {
        const allNftParsedLog = [];
        allNftTransferLog.forEach((singleLog) => {
          if (
            singleLog.isTransferToSelectedAddress &&
            (singleLog.isERC1155NftTransfer || singleLog.isERC721NftTransfer)
          ) {
            let iface;
            if (singleLog.isERC1155NftTransfer) {
              iface = new Interface(abiERC1155);
            } else {
              iface = new Interface(abiERC721);
            }
            try {
              const parsedLog = iface.parseLog({
                data: singleLog.data,
                topics: singleLog.topics,
              });
              allNftParsedLog.push({
                contract: singleLog.address,
                ...parsedLog,
              });
            } catch (err) {
              // ignore
            }
          }
        });
        // Filter known nfts and new Nfts
        const knownNFTs = [];
        const newNFTs = [];
        allNftParsedLog.forEach((single) => {
          const tokenIdFromLog = getTokenIdParam(single);
          const existingNft = allNfts?.[selectedAddress]?.[chainId]?.find(
            ({ address, tokenId }) => {
              return (
                isEqualCaseInsensitive(address, single.contract) &&
                tokenId === tokenIdFromLog
              );
            },
          );
          if (existingNft) {
            knownNFTs.push(existingNft);
          } else {
            newNFTs.push({
              tokenId: tokenIdFromLog,
              ...single,
            });
          }
        });
        // For known nfts only refresh ownership
        const refreshOwnershipNFts = knownNFTs.map(async (singleNft) => {
          return this.nftController.checkAndUpdateSingleNftOwnershipStatus(
            singleNft,
            networkClientId,
            // TODO add networkClientId once it is available in the transactionMeta
            // the chainId previously passed here didn't actually allow us to check for ownership on a non globally selected network
            // because the check would use the provider for the globally selected network, not the chainId passed here.
            { selectedAddress },
          );
        });
        await Promise.allSettled(refreshOwnershipNFts);
        // For new nfts, add them to state
        const addNftPromises = newNFTs.map(async (singleNft) => {
          return this.nftController.addNft(
            singleNft.contract,
            singleNft.tokenId,
            networkClientId,
          );
        });
        await Promise.allSettled(addNftPromises);
      }
    }
  }

  _getMetaMaskState() {
    return {
      metamask: this.getState(),
    };
  }

  /**
   * Select a hardware wallet device and execute a
   * callback with the keyring for that device.
   *
   * Note that KeyringController state is not updated before
   * the end of the callback execution, and calls to KeyringController
   * methods within the callback can lead to deadlocks.
   *
   * @param {object} options - The options for the device
   * @param {string} options.name - The device name to select
   * @param {string} options.hdPath - An optional hd path to be set on the device
   * keyring
   * @param {*} callback - The callback to execute with the keyring
   * @returns {*} The result of the callback
   */
  async #withKeyringForDevice(options, callback) {
    const keyringOverrides = this.opts.overrides?.keyrings;
    let keyringType = null;
    switch (options.name) {
      case HardwareDeviceNames.trezor:
        keyringType = keyringOverrides?.trezor?.type || TrezorKeyring.type;
        break;
      case HardwareDeviceNames.oneKey:
        keyringType = keyringOverrides?.oneKey?.type || OneKeyKeyring?.type;
        break;
      case HardwareDeviceNames.ledger:
        keyringType = keyringOverrides?.ledger?.type || LedgerKeyring.type;
        break;
      case HardwareDeviceNames.qr:
        keyringType = QrKeyring.type;
        break;
      case HardwareDeviceNames.lattice:
        keyringType = keyringOverrides?.lattice?.type || LatticeKeyring.type;
        break;
      default:
        throw new Error(
          'MetamaskController:#withKeyringForDevice - Unknown device',
        );
    }

    return this.keyringController.withKeyring(
      { type: keyringType },
      async ({ keyring }) => {
        if (options.hdPath && keyring.setHdPath) {
          keyring.setHdPath(options.hdPath);
        }

        if (options.name === HardwareDeviceNames.lattice) {
          keyring.appName = 'MetaMask';
        }

        if (options.name === HardwareDeviceNames.ledger) {
          await this.setLedgerTransportPreference(keyring);
        }

        if (
          options.name === HardwareDeviceNames.trezor ||
          options.name === HardwareDeviceNames.oneKey
        ) {
          const model = keyring.getModel();
          this.appStateController.setTrezorModel(model);
        }

        keyring.network = getProviderConfig({
          metamask: this.networkController.state,
        }).type;

        return await callback(keyring);
      },
      {
        createIfMissing: true,
      },
    );
  }

  /**
   * @deprecated Avoid new references to the global network.
   * Will be removed once multi-chain support is fully implemented.
   * @returns {string} The chain ID of the currently selected network.
   */
  #getGlobalChainId() {
    const globalNetworkClientId = this.#getGlobalNetworkClientId();

    const globalNetworkClient = this.networkController.getNetworkClientById(
      globalNetworkClientId,
    );

    return globalNetworkClient.configuration.chainId;
  }

  /**
   * @deprecated Avoid new references to the global network.
   * Will be removed once multi-chain support is fully implemented.
   * @returns {string} The network client ID of the currently selected network client.
   */
  #getGlobalNetworkClientId() {
    return this.networkController.state.selectedNetworkClientId;
  }

  #createEnsureOnboardingCompleteCallback() {
    return createEnsureOnboardingCompleteCallback(this.controllerMessenger);
  }

  #initMessengerClients({ initFunctions, initState }) {
    const initRequest = {
      currentMigrationVersion: this.opts.currentMigrationVersion,
      encryptor: this.opts.encryptor,
      ensureOnboardingComplete: this.#createEnsureOnboardingCompleteCallback(),
      extension: this.extension,
      platform: this.platform,
      getFlatState: this.getState.bind(this),
      getPermittedAccounts: this.getPermittedAccounts.bind(this),
      getUIState: this.getState.bind(this),
      infuraProjectId: this.opts.infuraProjectId,
      initLangCode: this.opts.initLangCode,
      keyringOverrides: this.opts.overrides?.keyrings,
      offscreenPromise: this.offscreenPromise,
      persistedState: initState,
      removeAccount: this.removeAccount.bind(this),
      setupUntrustedCommunicationEip1193:
        this.setupUntrustedCommunicationEip1193.bind(this),
      setupUntrustedCommunicationCaip:
        this.setupUntrustedCommunicationCaip.bind(this),
      setLocked: this.setLocked.bind(this),
      showNotification: this.platform._showNotification,
      showUserConfirmation: this.opts.showUserConfirmation,
      getAccountType: this.getAccountType.bind(this),
      getDeviceModel: this.getDeviceModel.bind(this),
      getHardwareTypeForMetric: this.getHardwareTypeForMetric.bind(this),
      trace,
    };

    return initMessengerClients({
      baseControllerMessenger: this.controllerMessenger,
      initFunctions,
      initRequest,
    });
  }

  /**
   * Upgrades an account to support EIP-7702 delegation.
   * Uses shared EIP-7702 utility to avoid code duplication.
   *
   * @param {string} address - The account address to upgrade
   * @param {string} upgradeContractAddress - The contract address to delegate to
   * @param {number} chainId - The chain ID for the upgrade
   * @returns {Promise<{transactionHash: string, delegatedTo: string}>}
   */
  async upgradeAccount(address, upgradeContractAddress, chainId) {
    // Get the network client for the specified chain
    const networkClientId = this.networkController.findNetworkClientIdByChainId(
      toHex(chainId),
    );

    return createEIP7702UpgradeTransaction(
      {
        address,
        upgradeContractAddress,
        networkClientId,
      },
      async (transactionParams, options) => {
        const transactionMeta = await addTransaction(
          this.getAddTransactionRequest({
            transactionParams,
            transactionOptions: {
              ...options,
              origin: 'metamask',
              requireApproval: true,
            },
            waitForSubmit: true,
          }),
        );
        return transactionMeta;
      },
    );
  }

  /**
   * Checks if EIP-7702 is supported for an account on a specific chain.
   *
   * @param {object} request - The request object
   * @param {string} request.address - The account address
   * @param {string} request.chainId - The chain ID to check
   * @returns {Promise<{isSupported: boolean, upgradeContractAddress: string | null}>}
   */
  async isEip7702Supported(request) {
    const { address, chainId } = request;
    const normalizedAccount = address;

    const atomicBatchSupport = await this.txController.isAtomicBatchSupported({
      address: normalizedAccount,
      chainIds: [chainId],
    });

    const atomicBatchChainSupport = findAtomicBatchSupportForChain(
      atomicBatchSupport,
      chainId,
    );

    const { isSupported, upgradeContractAddress } = checkEip7702Support(
      atomicBatchChainSupport,
    );

    return {
      isSupported,
      upgradeContractAddress,
    };
  }

  #isAssetsUnifyStateEnabled() {
    return false;
  }
}
