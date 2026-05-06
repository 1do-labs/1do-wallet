import { PRODUCT_TYPES } from '@metamask/subscription-controller';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { keccak256 } from 'ethereum-cryptography/keccak';
import {
  type PublishBatchHookRequest,
  type PublishBatchHookTransaction,
  SavedGasFees,
  TransactionController,
  TransactionControllerMessenger,
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  type NetworkController,
  SmartTransactionsController,
  SmartTransactionStatuses,
} from '@metamask/smart-transactions-controller';
import {
  TransactionPayControllerMessenger,
  TransactionPayPublishHook,
} from '@metamask/transaction-pay-controller';
import { bytesToHex, Hex, hexToBytes } from '@metamask/utils';
import { trace } from '../../../../shared/lib/trace';
import { hasTransactionType } from '../../../../shared/lib/transactions.utils';
import { getIsSmartTransaction } from '../../../../shared/lib/selectors';
import { getShieldGatewayConfig } from '../../../../shared/lib/shield';
import { isEnforcedSimulationsEligible } from '../../../../shared/lib/transaction/enforced-simulations';
import { TransactionMetricsRequest } from '../../../../shared/types/metametrics';
import {
  getSmartTransactionCommonParams,
  SmartTransactionHookMessenger,
  submitBatchSmartTransactionHook,
  submitSmartTransactionHook,
} from '../../lib/smart-transaction/smart-transactions';
import { Delegation7702PublishHook } from '../../lib/transaction/hooks/delegation-7702-publish';
import { EnforceSimulationHook } from '../../lib/transaction/hooks/enforce-simulation-hook';
import {
  handlePostTransactionBalanceUpdate,
  handleTransactionAdded,
  handleTransactionApproved,
  handleTransactionConfirmed,
  handleTransactionDropped,
  handleTransactionFailed,
  handleTransactionRejected,
  handleTransactionSubmitted,
} from '../../lib/transaction/metrics';
import { isSendBundleSupported } from '../../lib/transaction/sentinel-api';
import { getTransactionById } from '../../lib/transaction/util';
import { accountSupports7702 } from '../../lib/account-supports-7702';
import { MessengerClientFlatState } from '../controller-list';
import { TransactionControllerInitMessenger } from '../messengers/transaction-controller-messenger';
import {
  MessengerClientInitFunction,
  MessengerClientInitRequest,
  MessengerClientInitResult,
} from '../types';

const DISABLED_AUTOMATIC_GAS_FEE_UPDATE_TYPES = [
  TransactionType.swap,
  TransactionType.swapApproval,
  TransactionType.bridge,
  TransactionType.bridgeApproval,
  TransactionType.relayDeposit,
  TransactionType.perpsRelayDeposit,
  TransactionType.predictRelayDeposit,
];

const TRANSACTION_SUBMISSION_METHOD_METRIC_NAME =
  'transaction_submission_method';

const TRANSACTION_SUBMISSION_METHOD = {
  SENTINEL_STX: 'sentinel_stx',
  SENTINEL_RELAY: 'sentinel_relay',
};

const SIGNED_TRANSACTION_RECOVERY_NOTE =
  'Recovered signed transaction after extension restart';

const RECOVERABLE_STARTUP_TRANSACTION_ERRORS = [
  'Transaction incomplete at startup',
  'Transaction incomplete at startup with all required transactions confirmed',
];

export const TransactionControllerInit: MessengerClientInitFunction<
  TransactionController,
  TransactionControllerMessenger,
  TransactionControllerInitMessenger
> = (request) => {
  const {
    controllerMessenger,
    initMessenger,
    getFlatState,
    getPermittedAccounts,
    getTransactionMetricsRequest,
    persistedState,
  } = request;

  const {
    gasFeeController,
    keyringController,
    networkController,
    onboardingController,
    preferencesController,
    smartTransactionsController,
  } = getControllers(request);

  const recoveredPersistedTransactionState =
    getRecoverableTransactionControllerState(
      persistedState.TransactionController,
    );

  const messengerClient: TransactionController = new TransactionController({
    getCurrentNetworkEIP1559Compatibility: () =>
      // @ts-expect-error Controller type does not support undefined return value
      initMessenger.call('NetworkController:getEIP1559Compatibility'),
    getCurrentAccountEIP1559Compatibility: async () => true,
    // @ts-expect-error Mismatched types
    getExternalPendingTransactions: (address) =>
      getExternalPendingTransactions(smartTransactionsController(), address),
    getGasFeeEstimates: (...args) =>
      gasFeeController().fetchGasFeeEstimates(...args),
    getNetworkClientRegistry: (...args) =>
      networkController().getNetworkClientRegistry(...args),
    getNetworkState: () => networkController().state,
    // @ts-expect-error Controller type does not support undefined return value
    getPermittedAccounts,
    getSavedGasFees: (chainId) => {
      return preferencesController().state.advancedGasFee[
        chainId
      ] as unknown as SavedGasFees | undefined;
    },
    getSimulationConfig: async (url, opts) => {
      const getToken = () =>
        initMessenger.call('AuthenticationController:getBearerToken');
      const getShieldSubscription = () =>
        initMessenger.call(
          'SubscriptionController:getSubscriptionByProduct',
          PRODUCT_TYPES.SHIELD,
        );
      const origin = opts?.txMeta?.origin;
      return getShieldGatewayConfig(getToken, getShieldSubscription, url, {
        origin,
      });
    },
    incomingTransactions: {
      client: `extension-${process.env.METAMASK_VERSION?.replace(/\./gu, '-')}`,
      includeTokenTransfers: false,
      isEnabled: () =>
        preferencesController().state.useExternalServices &&
        onboardingController().state.completedOnboarding,
      updateTransactions: true,
    },
    isAutomaticGasFeeUpdateEnabled,
    isEIP7702GasFeeTokensEnabled: async (transactionMeta) => {
      if (
        !(await accountSupports7702(
          transactionMeta.txParams?.from,
          keyringController as Parameters<typeof accountSupports7702>[1],
        ))
      ) {
        return false;
      }

      const { chainId, isExternalSign } = transactionMeta;
      const uiState = getUIState(getFlatState());

      // @ts-expect-error Smart transaction selector types does not match controller state
      const isSmartTransactionEnabled = getIsSmartTransaction(uiState, chainId);

      const isSendBundleSupportedChain = await isSendBundleSupported(chainId);

      // EIP7702 gas fee tokens are enabled when:
      // - Smart transactions are NOT enabled, OR
      // - Send bundle is NOT supported, OR
      // - Gas fee token was provided when creating transaction
      return (
        !isSmartTransactionEnabled ||
        !isSendBundleSupportedChain ||
        Boolean(isExternalSign)
      );
    },
    isFirstTimeInteractionEnabled: () =>
      preferencesController().state.securityAlertsEnabled,
    isSimulationEnabled: () =>
      preferencesController().state.useTransactionSimulations,
    messenger: controllerMessenger,
    pendingTransactions: {
      isResubmitEnabled: () => false,
    },
    publicKeyEIP7702: process.env.EIP_7702_PUBLIC_KEY as Hex | undefined,
    testGasFeeFlows: Boolean(process.env.TEST_GAS_FEE_FLOWS === 'true'),
    // @ts-expect-error Controller uses string for names rather than enum
    trace,
    hooks: {
      // Note: `#afterAdd.updateTransaction` is actually called before adding the TransactionMeta to the state
      // Reference: https://github.com/MetaMask/core/blob/main/packages/transaction-controller/src/TransactionController.ts#L1335
      afterAdd: async (_params: { transactionMeta: TransactionMeta }) => {
        return {
          updateTransaction: async (transactionMeta: TransactionMeta) => {
            await initMessenger.call(
              'SubscriptionService:submitSubscriptionSponsorshipIntent',
              transactionMeta,
            );
          },
        };
      },
      beforePublish: () => undefined,
      beforeSign: new EnforceSimulationHook({
        messenger: initMessenger,
        isEligible: (transactionMeta) =>
          isEnforcedSimulationsEligible(
            transactionMeta,
            initMessenger.call('AppStateController:getState'),
          ),
      }).getBeforeSignHook(),
      beforeCheckPendingTransactions: () => undefined,
      // @ts-expect-error Controller type does not support undefined return value
      publish: (transactionMeta, signedTx) =>
        publishHook({
          flatState: getFlatState(),
          getTransactionMetricsRequest,
          initMessenger,
          keyringController,
          signedTx,
          smartTransactionsController: smartTransactionsController(),
          transactionController: messengerClient,
          transactionMeta,
        }),
      publishBatch: async (_request: PublishBatchHookRequest) => {
        const result = await publishBatchHook({
          transactionController: messengerClient,
          smartTransactionsController: smartTransactionsController(),
          hookControllerMessenger:
            initMessenger as SmartTransactionHookMessenger,
          flatState: getFlatState(),
          transactions: _request.transactions as PublishBatchHookTransaction[],
        });
        if (result) {
          for (const batchTx of _request.transactions) {
            if (batchTx.id) {
              try {
                getTransactionMetricsRequest().upsertTransactionUIMetricsFragment(
                  batchTx.id,
                  {
                    properties: {
                      [TRANSACTION_SUBMISSION_METHOD_METRIC_NAME]:
                        TRANSACTION_SUBMISSION_METHOD.SENTINEL_STX,
                    },
                  },
                );
              } catch (e) {
                console.error(
                  'Failed to record sentinel_stx metrics fragment for batch tx',
                  e,
                );
              }
            }
          }
        }
        return result;
      },
    },
    // @ts-expect-error Keyring controller expects TxData returned but TransactionController expects TypedTransaction
    sign: (...args) => keyringController().signTransaction(...args),
    state: recoveredPersistedTransactionState,
  });

  addTransactionControllerListeners(
    initMessenger,
    getTransactionMetricsRequest,
  );

  recoverSignedTransactions({
    initMessenger,
    networkController: networkController(),
    transactionController: messengerClient,
  }).catch((error) => {
    console.error('Failed to recover signed transactions', error);
  });

  const api = getApi(messengerClient);

  return { messengerClient, api, memStateKey: 'TxController' };
};

function getApi(
  messengerClient: TransactionController,
): MessengerClientInitResult<TransactionController>['api'] {
  return {
    abortTransactionSigning:
      messengerClient.abortTransactionSigning.bind(messengerClient),
    getLayer1GasFee: messengerClient.getLayer1GasFee.bind(messengerClient),
    getTransactions: messengerClient.getTransactions.bind(messengerClient),
    isAtomicBatchSupported:
      messengerClient.isAtomicBatchSupported.bind(messengerClient),
    startIncomingTransactionPolling:
      messengerClient.startIncomingTransactionPolling.bind(messengerClient),
    stopIncomingTransactionPolling:
      messengerClient.stopIncomingTransactionPolling.bind(messengerClient),
    updateAtomicBatchData:
      messengerClient.updateAtomicBatchData.bind(messengerClient),
    updateBatchTransactions:
      messengerClient.updateBatchTransactions.bind(messengerClient),
    updateEditableParams:
      messengerClient.updateEditableParams.bind(messengerClient),
    updatePreviousGasParams:
      messengerClient.updatePreviousGasParams.bind(messengerClient),
    updateSelectedGasFeeToken:
      messengerClient.updateSelectedGasFeeToken.bind(messengerClient),
    updateTransactionGasFees:
      messengerClient.updateTransactionGasFees.bind(messengerClient),
  };
}

function getControllers(
  request: MessengerClientInitRequest<
    TransactionControllerMessenger,
    TransactionControllerInitMessenger
  >,
) {
  return {
    gasFeeController: () => request.getMessengerClient('GasFeeController'),
    keyringController: () => request.getMessengerClient('KeyringController'),
    networkController: () => request.getMessengerClient('NetworkController'),
    onboardingController: () =>
      request.getMessengerClient('OnboardingController'),
    preferencesController: () =>
      request.getMessengerClient('PreferencesController'),
    smartTransactionsController: () =>
      request.getMessengerClient('SmartTransactionsController'),
  };
}

function getExternalPendingTransactions(
  smartTransactionsController: SmartTransactionsController,
  address: string,
) {
  return smartTransactionsController.getTransactions({
    addressFrom: address,
    status: SmartTransactionStatuses.PENDING,
  });
}

function addTransactionControllerListeners(
  initMessenger: TransactionControllerInitMessenger,
  getTransactionMetricsRequest: () => TransactionMetricsRequest,
) {
  const transactionMetricsRequest = getTransactionMetricsRequest();

  initMessenger.subscribe(
    'TransactionController:postTransactionBalanceUpdated',
    // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31879
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    handlePostTransactionBalanceUpdate.bind(null, transactionMetricsRequest),
  );

  initMessenger.subscribe(
    'TransactionController:unapprovedTransactionAdded',
    // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31879
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    (transactionMeta) =>
      handleTransactionAdded(transactionMetricsRequest, { transactionMeta }),
  );

  initMessenger.subscribe(
    'TransactionController:transactionApproved',
    // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31879
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    handleTransactionApproved.bind(null, transactionMetricsRequest),
  );

  initMessenger.subscribe(
    'TransactionController:transactionDropped',
    // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31879
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    handleTransactionDropped.bind(null, transactionMetricsRequest),
  );

  initMessenger.subscribe(
    'TransactionController:transactionConfirmed',
    // @ts-expect-error Error is string in metrics code but TransactionError in TransactionMeta type from controller
    // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31879
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    handleTransactionConfirmed.bind(null, transactionMetricsRequest),
  );

  initMessenger.subscribe(
    'TransactionController:transactionFailed',
    // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31879
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    handleTransactionFailed.bind(null, transactionMetricsRequest),
  );

  initMessenger.subscribe(
    'TransactionController:transactionRejected',
    // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31879
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    handleTransactionRejected.bind(null, transactionMetricsRequest),
  );

  initMessenger.subscribe(
    'TransactionController:transactionSubmitted',
    // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31879
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    handleTransactionSubmitted.bind(null, transactionMetricsRequest),
  );
}

function getUIState(flatState: MessengerClientFlatState) {
  return { metamask: flatState };
}

export async function recoverSignedTransactions({
  initMessenger,
  networkController,
  transactionController,
}: {
  initMessenger: TransactionControllerInitMessenger;
  networkController: NetworkController;
  transactionController: TransactionController;
}) {
  const signedTransactions =
    transactionController.state?.transactions?.filter((transaction) =>
      isRecoverableIncompleteTransaction(transaction),
    ) ?? [];

  await Promise.allSettled(
    signedTransactions.map(async (transactionMeta) => {
      const recoveredHash = await recoverSignedTransactionHash({
        networkController,
        transactionMeta,
      });

      if (!recoveredHash) {
        return;
      }

      const recoveredTransactionMeta = {
        ...transactionMeta,
        hash: recoveredHash,
        status: TransactionStatus.submitted,
        submittedTime: Date.now(),
      };

      transactionController.updateTransaction(
        recoveredTransactionMeta,
        SIGNED_TRANSACTION_RECOVERY_NOTE,
      );

      initMessenger.publish('TransactionController:transactionSubmitted', {
        transactionMeta: recoveredTransactionMeta,
      });
    }),
  );
}

export function getRecoverableTransactionControllerState(
  transactionControllerState: TransactionController['state'] | undefined,
) {
  if (!transactionControllerState?.transactions?.length) {
    return transactionControllerState;
  }

  const recoveredAt = Date.now();
  let hasRecoveredTransactions = false;

  const transactions = transactionControllerState.transactions.map(
    (transactionMeta) => {
      if (!isRecoverableIncompleteTransaction(transactionMeta)) {
        return transactionMeta;
      }

      hasRecoveredTransactions = true;

      return {
        ...transactionMeta,
        error: undefined,
        status: TransactionStatus.submitted,
        submittedTime: transactionMeta.submittedTime ?? recoveredAt,
      };
    },
  );

  if (!hasRecoveredTransactions) {
    return transactionControllerState;
  }

  return {
    ...transactionControllerState,
    transactions,
  };
}

async function recoverSignedTransactionHash({
  networkController,
  transactionMeta,
}: {
  networkController: NetworkController;
  transactionMeta: TransactionMeta;
}): Promise<string | undefined> {
  if (!transactionMeta.rawTx || !transactionMeta.networkClientId) {
    return undefined;
  }

  const { provider } = networkController.getNetworkClientById(
    transactionMeta.networkClientId,
  );
  const expectedHash = getRawTransactionHash(transactionMeta.rawTx);

  if (expectedHash) {
    const existingTransaction = await provider.request({
      method: 'eth_getTransactionByHash',
      params: [expectedHash],
    });

    if (existingTransaction) {
      return expectedHash;
    }
  }

  try {
    return (await provider.request({
      method: 'eth_sendRawTransaction',
      params: [transactionMeta.rawTx],
    })) as string;
  } catch (error) {
    if (!expectedHash || !isRecoverableSignedTransactionError(error)) {
      return undefined;
    }

    const existingTransaction = await provider.request({
      method: 'eth_getTransactionByHash',
      params: [expectedHash],
    });

    return existingTransaction ? expectedHash : undefined;
  }
}

function getRawTransactionHash(rawTransaction: string): string | undefined {
  try {
    return bytesToHex(keccak256(hexToBytes(rawTransaction)));
  } catch {
    return undefined;
  }
}

function isRecoverableSignedTransactionError(error: unknown): boolean {
  const message = String(
    (error as { data?: { message?: string }; message?: string })?.data
      ?.message ??
      (error as { message?: string })?.message ??
      error,
  ).toLowerCase();

  return [
    'already known',
    'already imported',
    'nonce too low',
    'replacement transaction underpriced',
  ].some((match) => message.includes(match));
}

function isRecoverableIncompleteTransaction(transaction: TransactionMeta) {
  if (!transaction.rawTx || transaction.hash || !transaction.networkClientId) {
    return false;
  }

  return (
    transaction.status === TransactionStatus.signed ||
    transaction.status === TransactionStatus.submitted ||
    (transaction.status === TransactionStatus.failed &&
      isStartupIncompleteTransactionError(transaction.error))
  );
}

function isStartupIncompleteTransactionError(error: TransactionMeta['error']) {
  const message = error?.message;

  return (
    typeof message === 'string' &&
    RECOVERABLE_STARTUP_TRANSACTION_ERRORS.includes(message)
  );
}

export async function publishHook({
  flatState,
  getTransactionMetricsRequest,
  initMessenger,
  keyringController,
  signedTx,
  smartTransactionsController,
  transactionController,
  transactionMeta,
}: {
  flatState: MessengerClientFlatState;
  getTransactionMetricsRequest: () => TransactionMetricsRequest;
  initMessenger: TransactionControllerInitMessenger;
  keyringController: Parameters<typeof accountSupports7702>[1];
  signedTx: string;
  smartTransactionsController: SmartTransactionsController;
  transactionController: TransactionController;
  transactionMeta: TransactionMeta;
}) {
  const { isSmartTransaction, featureFlags } = getSmartTransactionCommonParams(
    flatState,
    transactionMeta.chainId,
  );
  const sendBundleSupport = await isSendBundleSupported(
    transactionMeta.chainId,
  );

  const payResult = await new TransactionPayPublishHook({
    isSmartTransaction: () => isSmartTransaction,
    messenger: initMessenger as unknown as TransactionPayControllerMessenger,
  }).getHook()(transactionMeta, signedTx as Hex);

  if (payResult?.transactionHash) {
    return payResult;
  }

  const { isExternalSign } = transactionMeta;
  const isUpgradeOnly7702Transaction = Boolean(
    transactionMeta.txParams?.authorizationList?.length &&
      (!transactionMeta.txParams?.data ||
        transactionMeta.txParams.data === '0x') &&
      transactionMeta.selectedGasFeeToken === undefined &&
      !transactionMeta.gasFeeTokens?.length &&
      !transactionMeta.isGasFeeIncluded &&
      !transactionMeta.isGasFeeSponsored,
  );

  const keyringSupports7702 = await accountSupports7702(
    transactionMeta.txParams?.from,
    keyringController,
  );

  if (keyringSupports7702 && !isUpgradeOnly7702Transaction) {
    const hook = new Delegation7702PublishHook({
      isAtomicBatchSupported: transactionController.isAtomicBatchSupported.bind(
        transactionController,
      ),
      messenger: initMessenger,
    }).getHook();

    const result = await hook(transactionMeta, signedTx);
    if (result?.transactionHash) {
      try {
        getTransactionMetricsRequest().upsertTransactionUIMetricsFragment(
          transactionMeta.id,
          {
            properties: {
              [TRANSACTION_SUBMISSION_METHOD_METRIC_NAME]:
                TRANSACTION_SUBMISSION_METHOD.SENTINEL_RELAY,
            },
          },
        );
      } catch (e) {
        console.error('Failed to record sentinel_relay metrics fragment', e);
      }
      return result;
    }
    // else, fall back to regular regular transaction submission
  }

  if (
    !keyringSupports7702 &&
    !isUpgradeOnly7702Transaction &&
    isSmartTransaction &&
    (sendBundleSupport || transactionMeta.selectedGasFeeToken === undefined)
  ) {
    const result = await submitSmartTransactionHook({
      transactionMeta,
      signedTransactionInHex: signedTx as Hex,
      transactionController,
      smartTransactionsController,
      controllerMessenger: initMessenger,
      isSmartTransaction,
      featureFlags,
    });

    if (result?.transactionHash) {
      try {
        getTransactionMetricsRequest().upsertTransactionUIMetricsFragment(
          transactionMeta.id,
          {
            properties: {
              [TRANSACTION_SUBMISSION_METHOD_METRIC_NAME]:
                TRANSACTION_SUBMISSION_METHOD.SENTINEL_STX,
            },
          },
        );
      } catch (e) {
        console.error('Failed to record sentinel_stx metrics fragment', e);
      }
      return result;
    }
    // else, fall back to regular regular transaction submission
  }

  // Default: fall back to regular transaction submission
  return { transactionHash: undefined };
}

export function publishBatchHook({
  transactionController,
  smartTransactionsController,
  hookControllerMessenger,
  flatState,
  transactions,
}: {
  transactionController: TransactionController;
  smartTransactionsController: SmartTransactionsController;
  hookControllerMessenger: SmartTransactionHookMessenger;
  flatState: MessengerClientFlatState;
  transactions: PublishBatchHookTransaction[];
}) {
  // Get transactionMeta based on the last transaction ID
  const lastTransaction = transactions[transactions.length - 1];
  const transactionMeta = getTransactionById(
    lastTransaction.id ?? '',
    transactionController,
  );

  // If we couldn't find the transaction, we should handle that gracefully
  if (!transactionMeta) {
    throw new Error(
      `publishBatchSmartTransactionHook: Could not find transaction with id ${lastTransaction.id}`,
    );
  }

  const { isSmartTransaction, featureFlags } = getSmartTransactionCommonParams(
    flatState,
    transactionMeta.chainId,
  );

  const isUpgradeOnly7702Transaction = Boolean(
    transactionMeta.txParams?.authorizationList?.length &&
      (!transactionMeta.txParams?.data ||
        transactionMeta.txParams.data === '0x') &&
      transactionMeta.selectedGasFeeToken === undefined &&
      !transactionMeta.gasFeeTokens?.length &&
      !transactionMeta.isGasFeeIncluded &&
      !transactionMeta.isGasFeeSponsored,
  );

  if (isUpgradeOnly7702Transaction) {
    return undefined;
  }

  if (!isSmartTransaction) {
    return undefined;
  }

  return submitBatchSmartTransactionHook({
    transactions,
    transactionController,
    smartTransactionsController,
    controllerMessenger: hookControllerMessenger,
    isSmartTransaction,
    featureFlags,
    transactionMeta,
  });
}

function isAutomaticGasFeeUpdateEnabled(transaction: TransactionMeta) {
  if (
    transaction.origin === ORIGIN_METAMASK &&
    transaction.type === TransactionType.tokenMethodApprove
  ) {
    return false;
  }

  return !hasTransactionType(
    transaction,
    DISABLED_AUTOMATIC_GAS_FEE_UPDATE_TYPES,
  );
}
