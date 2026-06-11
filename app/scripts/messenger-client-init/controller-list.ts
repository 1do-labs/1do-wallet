import { MultichainAccountService } from '@metamask/multichain-account-service';
import { GasFeeController } from '@metamask/gas-fee-controller';
import { KeyringController } from '@metamask/keyring-controller';
import { NetworkController } from '@metamask/network-controller';
import {
  CaveatSpecificationConstraint,
  PermissionController,
  PermissionSpecificationConstraint,
  SubjectMetadataController,
} from '@metamask/permission-controller';
import { PPOMController } from '@metamask/ppom-validator';
import { SmartTransactionsController } from '@metamask/smart-transactions-controller';
import { TransactionController } from '@metamask/transaction-controller';
import { TransactionPayController } from '@metamask/transaction-pay-controller';
import { AccountsController } from '@metamask/accounts-controller';
import {
  AccountTrackerController,
  AssetsContractController,
  CurrencyRateController,
  DeFiPositionsController,
  MultichainAssetsController,
  MultichainAssetsRatesController,
  MultichainBalancesController,
  NftController,
  NftDetectionController,
  RatesController,
  TokenBalancesController,
  TokenDetectionController,
  TokenListController,
  TokenRatesController,
  TokensController,
} from '@metamask/assets-controllers';
import { AssetsController } from '@metamask/assets-controller';
import { MultichainNetworkController } from '@metamask/multichain-network-controller';
import { MultichainTransactionsController } from '@metamask/multichain-transactions-controller';
import {
  CronjobController,
  ExecutionService,
  WebSocketService,
} from '@metamask/snaps-controllers';
import {
  RateLimitController,
  RateLimitedApiMap,
} from '@metamask/rate-limit-controller';
import { DelegationController } from '@metamask/delegation-controller';

import { RemoteFeatureFlagController } from '@metamask/remote-feature-flag-controller';
import { AccountTreeController } from '@metamask/account-tree-controller';
import { EnsController } from '@metamask/ens-controller';
import { NameController } from '@metamask/name-controller';
import { SelectedNetworkController } from '@metamask/selected-network-controller';
import { ApprovalController } from '@metamask/approval-controller';
import { NetworkEnablementController } from '@metamask/network-enablement-controller';
import { PermissionLogController } from '@metamask/permission-log-controller';
import { AnnouncementController } from '@metamask/announcement-controller';
import { PhishingController } from '@metamask/phishing-controller';
import { LoggingController } from '@metamask/logging-controller';
import { StorageService } from '@metamask/storage-service';
import { AddressBookController } from '@metamask/address-book-controller';
import {
  DecryptMessageManager,
  EncryptionPublicKeyManager,
} from '@metamask/message-manager';
import { SignatureController } from '@metamask/signature-controller';
import { UserOperationController } from '@metamask/user-operation-controller';
import { ClientController } from '@metamask/client-controller';
import { ConnectivityController } from '@metamask/connectivity-controller';
import { ProfileMetricsController } from '@metamask/profile-metrics-controller';
import {
  GeolocationApiService,
  GeolocationController,
} from '@metamask/geolocation-controller';
import { OnboardingController } from '../controllers/onboarding';
import { PreferencesController } from '../controllers/preferences-controller';
import { NetworkOrderController } from '../controllers/network-order';
import { MetaMetricsController } from '../controllers/metametrics-controller';
import { AppStateController } from '../controllers/app-state-controller';
import { AccountOrderController } from '../controllers/account-order';
import { AlertController } from '../controllers/alert-controller';
import { MetaMetricsDataDeletionController } from '../controllers/metametrics-data-deletion/metametrics-data-deletion';
import { AppMetadataController } from '../controllers/app-metadata';
import { DecryptMessageController } from '../controllers/decrypt-message';
import { EncryptionPublicKeyController } from '../controllers/encryption-public-key';
import { StaticAssetsController } from '../controllers/static-assets-controller';
import { DataDeletionService } from '../services/data-deletion-service';
import { LegacyBackgroundApiService } from '../services/legacy-background-api-service';

/**
 * Union of all messenger clients (controllers and services) supporting or required by modular initialization.
 */
export type MessengerClient =
  | AccountOrderController
  | AccountTrackerController
  | AccountsController
  | AddressBookController
  | AlertController
  | AnnouncementController
  | AppMetadataController
  | ApprovalController
  | AppStateController
  | AssetsController
  | CronjobController
  | CurrencyRateController
  | DataDeletionService
  | DecryptMessageController
  | DecryptMessageManager
  | DelegationController
  | DeFiPositionsController
  | EncryptionPublicKeyController
  | EncryptionPublicKeyManager
  | EnsController
  | StorageService
  | ExecutionService
  | GasFeeController
  | GeolocationApiService
  | GeolocationController
  | KeyringController
  | LegacyBackgroundApiService
  | LoggingController
  | MetaMetricsController
  | MetaMetricsDataDeletionController
  | MultichainAssetsController
  | MultichainAssetsRatesController
  | MultichainBalancesController
  | MultichainTransactionsController
  | MultichainNetworkController
  | NameController
  | NetworkController
  | NetworkOrderController
  | OnboardingController
  | PermissionController<
      PermissionSpecificationConstraint,
      CaveatSpecificationConstraint
    >
  | PermissionLogController
  | PhishingController
  | PPOMController
  | PreferencesController
  | RateLimitController<RateLimitedApiMap>
  | RatesController
  | RemoteFeatureFlagController
  | SelectedNetworkController
  | SignatureController
  | SmartTransactionsController
  | SubjectMetadataController
  | TokenBalancesController
  | TokenDetectionController
  | TokenListController
  | TokensController
  | TransactionController
  | TransactionPayController
  | UserOperationController
  | TokenRatesController
  | NftController
  | NftDetectionController
  | AssetsContractController
  | AccountTreeController
  | WebSocketService
  | MultichainAccountService
  | NetworkEnablementController
  | ClientController
  | StaticAssetsController
  | ProfileMetricsController
  | ConnectivityController;

/**
 * Flat state object for all messenger clients supporting or required by modular initialization.
 * e.g. `{ transactions: [] }`.
 */
export type MessengerClientFlatState = AccountOrderController['state'] &
  AccountsController['state'] &
  AlertController['state'] &
  AccountTreeController['state'] &
  AddressBookController['state'] &
  AnnouncementController['state'] &
  AppMetadataController['state'] &
  ApprovalController['state'] &
  AppStateController['state'] &
  AssetsController['state'] &
  ClientController['state'] &
  CronjobController['state'] &
  CurrencyRateController['state'] &
  DeFiPositionsController['state'] &
  DelegationController['state'] &
  EnsController['state'] &
  GasFeeController['state'] &
  GeolocationController['state'] &
  KeyringController['state'] &
  LoggingController['state'] &
  MetaMetricsController['state'] &
  MetaMetricsDataDeletionController['state'] &
  MultichainAssetsController['state'] &
  MultichainAssetsRatesController['state'] &
  MultichainBalancesController['state'] &
  MultichainTransactionsController['state'] &
  MultichainNetworkController['state'] &
  NameController['state'] &
  NetworkController['state'] &
  NetworkOrderController['state'] &
  OnboardingController['state'] &
  PermissionController<
    PermissionSpecificationConstraint,
    CaveatSpecificationConstraint
  >['state'] &
  PermissionLogController['state'] &
  PhishingController['state'] &
  PPOMController['state'] &
  PreferencesController['state'] &
  RatesController['state'] &
  RemoteFeatureFlagController['state'] &
  SelectedNetworkController['state'] &
  SignatureController['state'] &
  SmartTransactionsController['state'] &
  TokenBalancesController['state'] &
  TokenDetectionController['state'] &
  TokenListController['state'] &
  TokensController['state'] &
  StaticAssetsController['state'] &
  TransactionController['state'] &
  TransactionPayController['state'] &
  UserOperationController['state'] &
  TokenRatesController['state'] &
  NftController['state'] &
  NftDetectionController['state'] &
  NetworkEnablementController['state'] &
  AccountTrackerController['state'] &
  ProfileMetricsController['state'];
