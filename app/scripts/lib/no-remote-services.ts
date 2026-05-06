import { ObservableStore } from '@metamask/obs-store';

const noop = () => undefined;
const noopAsync = async () => undefined;
const noopFalseAsync = async () => false;
const noopNullAsync = async () => null;
const noopArrayAsync = async () => [];
const noopObjectAsync = async () => ({});

type NoRemoteInitRequest = {
  controllerMessenger: {
    registerMethodActionHandlers: (
      client: Record<string, unknown>,
      methods: readonly string[],
    ) => void;
  };
  persistedState: Record<string, Record<string, unknown> | undefined>;
};

type NoRemoteServiceInitRequest = {
  controllerMessenger: NoRemoteInitRequest['controllerMessenger'];
};

function createNamedStore<TState extends Record<string, unknown>>(
  name: string,
  state: TState,
) {
  return Object.assign(new ObservableStore(state), { name });
}

function createStateController<TState extends Record<string, unknown>>(
  name: string,
  state: TState,
) {
  const store = createNamedStore(name, state);

  return Object.assign(store, {
    getState: () => store.state,
  });
}

export function createNoRemoteNotificationsController() {
  return Object.assign(
    createNamedStore('NotificationServicesController', {
      isNotificationServicesEnabled: false,
      isFeatureAnnouncementsEnabled: false,
      metamaskNotificationsList: [],
    }),
    {
      init: noop,
      checkAccountsPresence: noopAsync,
      createOnChainTriggers: noopArrayAsync,
      deleteNotificationsById: noopAsync,
      disableAccounts: noopAsync,
      disableNotificationServices: noopAsync,
      enableAccounts: noopAsync,
      enableMetamaskNotifications: noopAsync,
      fetchAndUpdateMetamaskNotifications: noopArrayAsync,
      getNotificationsByType: noopArrayAsync,
      markMetamaskNotificationsAsRead: noopAsync,
      setFeatureAnnouncementsEnabled: noopAsync,
    },
  );
}

export function createNoRemotePushController() {
  return Object.assign(
    createNamedStore('NotificationServicesPushController', {
      isPushEnabled: false,
    }),
    {
      enablePushNotifications: noopAsync,
      disablePushNotifications: noopAsync,
    },
  );
}

export function createNoRemoteOAuthService() {
  return {
    name: 'OAuthService',
    state: {},
    getState: () => ({}),
    startOAuthLogin: noopAsync,
    setMarketingConsent: noopAsync,
    getMarketingConsent: noopFalseAsync,
  };
}

export function createNoRemoteSeedlessOnboardingController() {
  return Object.assign(
    createNamedStore('SeedlessOnboardingController', {
      vaultBackupStatus: null,
      socialBackupsMetadata: {},
    }),
    {
      addNewSecretData: noopAsync,
      authenticate: noopAsync,
      changePassword: noopAsync,
      checkIsPasswordOutdated: noopFalseAsync,
      clearState: noop,
      createToprfKeyAndBackupSeedPhrase: noopNullAsync,
      fetchAllSecretData: noopArrayAsync,
      getIsUserAuthenticated: noopFalseAsync,
      getSecretDataBackupState: noopObjectAsync,
      loadKeyringEncryptionKey: noopNullAsync,
      preloadToprfNodeDetails: noopAsync,
      setLocked: noopAsync,
      storeKeyringEncryptionKey: noopAsync,
      submitPassword: noopAsync,
      syncLatestGlobalPassword: noopAsync,
      updateBackupMetadataState: noop,
    },
  );
}

export function createNoRemoteRewardsController() {
  return Object.assign(
    createNamedStore('RewardsController', {
      rewardsActiveAccount: null,
      rewardsAccounts: {},
      rewardsSubscriptions: {},
      rewardsSeasons: {},
      rewardsSeasonStatuses: {},
      rewardsSubscriptionTokens: {},
      rewardsPointsEstimateHistory: {},
    }),
    {
      estimatePoints: noopNullAsync,
      getCandidateSubscriptionId: noopNullAsync,
      getGeoRewardsMetadata: noopNullAsync,
      getHasAccountOptedIn: noopFalseAsync,
      getOptInStatus: noopNullAsync,
      getSeasonMetadata: noopNullAsync,
      getSeasonStatus: noopNullAsync,
      isOptInSupported: noopFalseAsync,
      linkAccountsToSubscriptionCandidate: noopAsync,
      optIn: noopAsync,
      validateReferralCode: noopNullAsync,
    },
  );
}

export function createNoRemoteRewardsDataService() {
  return {
    name: 'RewardsDataService',
    state: {},
    getState: () => ({}),
  };
}

export function NoRemoteRewardsControllerInit(request: NoRemoteInitRequest) {
  const { controllerMessenger, persistedState } = request;
  const messengerClient = Object.assign(
    createNoRemoteRewardsController(),
    persistedState.RewardsController
      ? { state: persistedState.RewardsController }
      : {},
  );

  controllerMessenger.registerMethodActionHandlers(messengerClient, [
    'estimatePoints',
    'getCandidateSubscriptionId',
    'getGeoRewardsMetadata',
    'getHasAccountOptedIn',
    'getOptInStatus',
    'getSeasonMetadata',
    'getSeasonStatus',
    'isOptInSupported',
    'linkAccountsToSubscriptionCandidate',
    'optIn',
    'validateReferralCode',
  ]);

  return { messengerClient };
}

export function NoRemoteRewardsDataServiceInit() {
  return {
    messengerClient: createNoRemoteRewardsDataService(),
  };
}

export function NoRemoteSubscriptionControllerInit(
  request: NoRemoteInitRequest,
) {
  const { controllerMessenger, persistedState } = request;
  const messengerClient = createStateController('SubscriptionController', {
    trialedProducts: [],
    subscriptions: [],
    ...(persistedState.SubscriptionController ?? {}),
  });

  Object.assign(messengerClient, {
    assignUserToCohort: noopAsync,
    cacheLastSelectedPaymentMethod: noop,
    cancelSubscription: noopAsync,
    clearLastSelectedPaymentMethod: noop,
    clearState: () => {
      messengerClient.updateState({
        trialedProducts: [],
        subscriptions: [],
      });
    },
    getBillingPortalUrl: noopObjectAsync,
    getCryptoApproveTransactionParams: noopObjectAsync,
    getPricing: noopObjectAsync,
    getSubscriptionByProduct: () => undefined,
    getSubscriptions: async () => [],
    getSubscriptionsEligibilities: async () => [],
    getTokenApproveAmount: () => '0',
    getTokenMinimumBalanceAmount: () => '0',
    linkRewards: noopAsync,
    startPolling: () => '',
    startShieldSubscriptionWithCard: noopObjectAsync,
    startSubscriptionWithCrypto: noopObjectAsync,
    submitShieldSubscriptionCryptoApproval: noopAsync,
    submitSponsorshipIntents: noopFalseAsync,
    submitUserEvent: noopAsync,
    triggerAccessTokenRefresh: noop,
    unCancelSubscription: noopAsync,
    updatePaymentMethod: async () => [],
  });

  controllerMessenger.registerMethodActionHandlers(messengerClient, [
    'assignUserToCohort',
    'cacheLastSelectedPaymentMethod',
    'cancelSubscription',
    'clearLastSelectedPaymentMethod',
    'getBillingPortalUrl',
    'getCryptoApproveTransactionParams',
    'getPricing',
    'getSubscriptionByProduct',
    'getSubscriptions',
    'getSubscriptionsEligibilities',
    'linkRewards',
    'startShieldSubscriptionWithCard',
    'startSubscriptionWithCrypto',
    'submitShieldSubscriptionCryptoApproval',
    'submitSponsorshipIntents',
    'submitUserEvent',
    'unCancelSubscription',
    'updatePaymentMethod',
  ]);

  return { messengerClient };
}

export function NoRemoteSubscriptionServiceInit(
  request: NoRemoteServiceInitRequest,
) {
  const { controllerMessenger } = request;
  const messengerClient = {
    name: 'SubscriptionService',
    state: null,
    handlePostTransaction: noopAsync,
    linkRewardToExistingSubscription: noopAsync,
    startSubscriptionWithCard: noopArrayAsync,
    submitSubscriptionSponsorshipIntent: noopAsync,
    updateSubscriptionCardPaymentMethod: noopArrayAsync,
    updateSubscriptionCryptoPaymentMethod: noopArrayAsync,
  };

  controllerMessenger.registerMethodActionHandlers(messengerClient, [
    'handlePostTransaction',
    'linkRewardToExistingSubscription',
    'startSubscriptionWithCard',
    'submitSubscriptionSponsorshipIntent',
    'updateSubscriptionCardPaymentMethod',
    'updateSubscriptionCryptoPaymentMethod',
  ]);

  return {
    messengerClient,
    memStateKey: null,
    persistedStateKey: null,
  };
}

export function NoRemoteShieldControllerInit(request: NoRemoteInitRequest) {
  const { controllerMessenger, persistedState } = request;
  const messengerClient = createStateController('ShieldController', {
    coverageResults: {},
    orderedTransactionHistory: [],
    ...(persistedState.ShieldController ?? {}),
  });

  Object.assign(messengerClient, {
    checkCoverage: noopObjectAsync,
    checkSignatureCoverage: noopObjectAsync,
    clearState: () => {
      messengerClient.updateState({
        coverageResults: {},
        orderedTransactionHistory: [],
      });
    },
    start: noop,
    stop: noop,
  });

  controllerMessenger.registerMethodActionHandlers(messengerClient, [
    'checkCoverage',
  ]);

  return { messengerClient };
}

export function NoRemoteClaimsControllerInit(request: NoRemoteInitRequest) {
  const { controllerMessenger, persistedState } = request;
  const messengerClient = createStateController('ClaimsController', {
    claimsConfigurations: {
      validSubmissionWindowDays: 0,
      supportedNetworks: [],
    },
    claims: [],
    drafts: [],
    ...(persistedState.ClaimsController ?? {}),
  });

  Object.assign(messengerClient, {
    clearState: () => {
      messengerClient.updateState({
        claimsConfigurations: {
          validSubmissionWindowDays: 0,
          supportedNetworks: [],
        },
        claims: [],
        drafts: [],
      });
    },
    deleteAllClaimDrafts: noop,
    deleteClaimDraft: noop,
    fetchClaimsConfigurations: async () =>
      messengerClient.state.claimsConfigurations,
    generateClaimSignature: async () => '',
    getClaimDrafts: () => [],
    getClaims: async () => [],
    getSubmitClaimConfig: noopObjectAsync,
    saveOrUpdateClaimDraft: (draft = {}) => draft,
  });

  controllerMessenger.registerMethodActionHandlers(messengerClient, [
    'deleteAllClaimDrafts',
    'deleteClaimDraft',
    'fetchClaimsConfigurations',
    'getClaims',
  ]);

  return { messengerClient };
}

export function NoRemoteClaimsServiceInit(request: NoRemoteServiceInitRequest) {
  const { controllerMessenger } = request;
  const messengerClient = {
    name: 'ClaimsService',
    state: null,
    fetchClaimsConfigurations: async () => ({
      validSubmissionWindowDays: 0,
      networks: [],
    }),
    generateMessageForClaimSignature: async () => ({ message: '' }),
    getClaimById: noopObjectAsync,
    getClaims: noopArrayAsync,
    getClaimsApiUrl: () => '',
    getRequestHeaders: noopObjectAsync,
  };

  controllerMessenger.registerMethodActionHandlers(messengerClient, [
    'fetchClaimsConfigurations',
    'generateMessageForClaimSignature',
    'getClaimById',
    'getClaims',
    'getClaimsApiUrl',
    'getRequestHeaders',
  ]);

  return {
    messengerClient,
    memStateKey: null,
    persistedStateKey: null,
  };
}
