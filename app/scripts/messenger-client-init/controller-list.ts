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
import { TransactionController } from '@metamask/transaction-controller';
import { AccountsController } from '@metamask/accounts-controller';
import {
  AccountTrackerController,
  AssetsContractController,
  CurrencyRateController,
  MultichainAssetsController,
  MultichainAssetsRatesController,
  MultichainBalancesController,
  NftController,
  NftDetectionController,
  TokenBalancesController,
  TokenDetectionController,
  TokenListController,
  TokenRatesController,
  TokensController,
} from '@metamask/assets-controllers';
import { AssetsController } from '@metamask/assets-controller';
import { MultichainNetworkController } from '@metamask/multichain-network-controller';

import { AccountTreeController } from '@metamask/account-tree-controller';
import { EnsController } from '@metamask/ens-controller';
import { NameController } from '@metamask/name-controller';
import { SelectedNetworkController } from '@metamask/selected-network-controller';
import { ApprovalController } from '@metamask/approval-controller';
import { NetworkEnablementController } from '@metamask/network-enablement-controller';
import { PermissionLogController } from '@metamask/permission-log-controller';
import { LoggingController } from '@metamask/logging-controller';
import { StorageService } from '@metamask/storage-service';
import { AddressBookController } from '@metamask/address-book-controller';
import {
  DecryptMessageManager,
  EncryptionPublicKeyManager,
} from '@metamask/message-manager';
import { SignatureController } from '@metamask/signature-controller';
import { ClientController } from '@metamask/client-controller';
import { ConnectivityController } from '@metamask/connectivity-controller';
import {
  GeolocationApiService,
  GeolocationController,
} from '@metamask/geolocation-controller';
import { OnboardingController } from '../controllers/onboarding';
import { PreferencesController } from '../controllers/preferences-controller';
import { NetworkOrderController } from '../controllers/network-order';
import { AppStateController } from '../controllers/app-state-controller';
import { AccountOrderController } from '../controllers/account-order';
import { AlertController } from '../controllers/alert-controller';
import { AppMetadataController } from '../controllers/app-metadata';
import { DecryptMessageController } from '../controllers/decrypt-message';
import { EncryptionPublicKeyController } from '../controllers/encryption-public-key';
import { StaticAssetsController } from '../controllers/static-assets-controller';
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
  | AppMetadataController
  | ApprovalController
  | AppStateController
  | AssetsController
  | CurrencyRateController
  | DecryptMessageController
  | DecryptMessageManager
  | EncryptionPublicKeyController
  | EncryptionPublicKeyManager
  | EnsController
  | StorageService
  | GasFeeController
  | GeolocationApiService
  | GeolocationController
  | KeyringController
  | LegacyBackgroundApiService
  | LoggingController
  | MultichainAssetsController
  | MultichainAssetsRatesController
  | MultichainBalancesController
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
  | PreferencesController
  | SelectedNetworkController
  | SignatureController
  | SubjectMetadataController
  | TokenBalancesController
  | TokenDetectionController
  | TokenListController
  | TokensController
  | TransactionController
  | TokenRatesController
  | NftController
  | NftDetectionController
  | AssetsContractController
  | AccountTreeController
  | MultichainAccountService
  | NetworkEnablementController
  | ClientController
  | StaticAssetsController
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
  AppMetadataController['state'] &
  ApprovalController['state'] &
  AppStateController['state'] &
  AssetsController['state'] &
  ClientController['state'] &
  CurrencyRateController['state'] &
  EnsController['state'] &
  GasFeeController['state'] &
  GeolocationController['state'] &
  KeyringController['state'] &
  LoggingController['state'] &
  MultichainAssetsController['state'] &
  MultichainAssetsRatesController['state'] &
  MultichainBalancesController['state'] &
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
  PreferencesController['state'] &
  SelectedNetworkController['state'] &
  SignatureController['state'] &
  TokenBalancesController['state'] &
  TokenDetectionController['state'] &
  TokenListController['state'] &
  TokensController['state'] &
  StaticAssetsController['state'] &
  TransactionController['state'] &
  TokenRatesController['state'] &
  NftController['state'] &
  NftDetectionController['state'] &
  NetworkEnablementController['state'] &
  AccountTrackerController['state'];
