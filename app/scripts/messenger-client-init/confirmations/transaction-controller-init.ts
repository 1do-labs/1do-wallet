import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import {
  SavedGasFees,
  TransactionController,
  TransactionControllerMessenger,
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { trace } from '../../../../shared/lib/trace';
import { hasTransactionType } from '../../../../shared/lib/transactions.utils';
import { TransactionControllerInitMessenger } from '../messengers/transaction-controller-messenger';
import {
  MessengerClientInitFunction,
  MessengerClientInitRequest,
  MessengerClientInitResult,
} from '../types';

const DISABLED_AUTOMATIC_GAS_FEE_UPDATE_TYPES = [
  TransactionType.relayDeposit,
  TransactionType.predictRelayDeposit,
];

export const TransactionControllerInit: MessengerClientInitFunction<
  TransactionController,
  TransactionControllerMessenger,
  TransactionControllerInitMessenger
> = (request) => {
  const {
    controllerMessenger,
    initMessenger,
    getPermittedAccounts,
    persistedState,
  } = request;

  const {
    gasFeeController,
    keyringController,
    networkController,
    onboardingController,
    preferencesController,
  } = getControllers(request);

  const messengerClient: TransactionController = new TransactionController({
    // The package declaration omits the networkClientId argument even though
    // the controller passes it at runtime.
    getCurrentNetworkEIP1559Compatibility: ((networkClientId: string) =>
      initMessenger
        .call('NetworkController:getEIP1559Compatibility', networkClientId)
        .then(Boolean)) as () => Promise<boolean>,
    getCurrentAccountEIP1559Compatibility: async () => true,
    getExternalPendingTransactions: () => [],
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
    getSimulationConfig: async (_url, options) => {
      const chainId = options?.txMeta?.chainId;
      const network = chainId
        ? networkController().state.networkConfigurationsByChainId[chainId]
        : undefined;
      const rpcEndpoint =
        network?.rpcEndpoints?.[network.defaultRpcEndpointIndex];
      return {
        newUrl: rpcEndpoint?.url,
        authorization: undefined,
      };
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
    isEIP7702GasFeeTokensEnabled: async () => false,
    isFirstTimeInteractionEnabled: () => false,
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
      beforePublish: async () => true,
    },
    // @ts-expect-error Keyring controller expects TxData returned but TransactionController expects TypedTransaction
    sign: (...args) => keyringController().signTransaction(...args),
    state: persistedState.TransactionController,
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
  };
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
