import { MiddlewareContext } from '@metamask/json-rpc-engine/v2';
import { EthAccountType } from '@metamask/keyring-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  TransactionController,
  TransactionMeta,
  TransactionParams,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  AddUserOperationOptions,
  UserOperationController,
} from '@metamask/user-operation-controller';
import type { Hex, JsonRpcRequest } from '@metamask/utils';
import { addHexPrefix } from 'ethereumjs-util';

import { KeyringController } from '@metamask/keyring-controller';
import log from 'loglevel';
import { endTrace, TraceName } from '../../../../shared/lib/trace';
import { getTransactionDataRecipient } from '../../../../shared/lib/transaction.utils';
import { accountSupports7702 } from '../account-supports-7702';
import {
  getTempoEvmTransactionArgs,
  getTempoTransactionBatchArgs,
  isTempoChain,
  isTempoTransactionType,
} from './tempo-tx-utils';

export type AddTransactionOptions = NonNullable<
  Parameters<TransactionController['addTransaction']>[1]
>;

type BaseAddTransactionRequest = {
  chainId: Hex;
  networkClientId: string;
  selectedAccount: InternalAccount;
  transactionParams: TransactionParams;
  transactionController: TransactionController;
  keyringController: KeyringController;
  userOperationController: UserOperationController;
  internalAccounts: InternalAccount[];
};

export type FinalAddTransactionRequest = BaseAddTransactionRequest & {
  transactionOptions: Partial<AddTransactionOptions>;
};

export type AddTransactionRequest = FinalAddTransactionRequest & {
  waitForSubmit: boolean;
};

export type AddDappTransactionRequest = BaseAddTransactionRequest & {
  dappRequest: JsonRpcRequest;
  requestContext: MiddlewareContext;
};

const TRANSFER_TYPES = [
  TransactionType.tokenMethodTransfer,
  TransactionType.tokenMethodTransferFrom,
  TransactionType.tokenMethodSafeTransferFrom,
];

type AddTransactionResult = Promise<{
  transactionMeta: TransactionMeta | undefined;
  waitForHash: () => Promise<string | undefined>;
}>;

export async function addDappTransaction(
  request: AddDappTransactionRequest,
): Promise<string> {
  const { dappRequest, requestContext } = request;
  const { id, method } = dappRequest;
  const actionId = String(id);

  // TODO: Find a home for and define the appropriate MiddlewareContext type
  const origin = requestContext.assertGet('origin') as string;
  const traceContext = requestContext.get('traceContext');

  const transactionOptions: Partial<AddTransactionOptions> = {
    actionId,
    requestId: String(id),
    method,
    origin,
    // This is the default behaviour but specified here for clarity
    requireApproval: true,
  };

  endTrace({ name: TraceName.Middleware, id: actionId });

  const addTransactionRequest: FinalAddTransactionRequest = {
    ...request,
    transactionOptions: {
      ...transactionOptions,
      traceContext,
    },
  };

  const { waitForHash } = await addTransactionOrUserOperation(
    addTransactionRequest,
  );

  const hash = (await waitForHash()) as string;

  endTrace({ name: TraceName.Transaction, id: actionId });

  return hash;
}

async function addTransactionOnTempo(
  request: FinalAddTransactionRequest,
): AddTransactionResult {
  const { chainId, keyringController } = request;
  const isEip7702SupportedByAccount = await accountSupports7702(
    request.transactionParams.from,
    keyringController as Parameters<typeof accountSupports7702>[1],
  );

  // Classic transaction, we simply set pathUSD as default
  // and add excludeNativeTokenForFee to signal to ignore native.
  if (!isTempoTransactionType(request.transactionParams)) {
    if (!isEip7702SupportedByAccount) {
      log.debug(
        'addTransactionOnTempo: Tempo chain but wallet does not support 7702. Falling back to legacy transactions',
      );
      return addTransactionWithController(request);
    }
    return addTransactionWithController(
      getTempoEvmTransactionArgs({ request, chainId }),
    );
    // Tempo transaction 0x76 + hardware wallet wont work for now.
  } else if (!isEip7702SupportedByAccount) {
    throw new Error('Wallet not supported for Tempo Transactions.');
  }
  // Checks and infer Tempo Transaction format for supported fields.
  const { transactionController } = request;

  const result = await transactionController.addTransactionBatch(
    getTempoTransactionBatchArgs({ request, chainId }),
  );
  const { batchId } = result;
  // We've got a batchId but we want to return a tx hash to the dApp
  const transactionMeta = getTransactionByBatchId(
    batchId,
    transactionController,
  );

  if (!transactionMeta) {
    log.debug(`Batch ${batchId}: No matching transaction found.`);
    throw new Error(
      `Tempo Transaction: Unable to determine if transaction was successful.`,
    );
  } else if (!transactionMeta.hash) {
    log.debug(`Batch ${batchId}: Hash missing from transaction object.`);
    throw new Error(
      `Tempo Transaction: Unable to determine if transaction was successful.`,
    );
  }

  return {
    transactionMeta,
    waitForHash: async () => transactionMeta.hash,
  };
}

export async function addTransaction(
  request: AddTransactionRequest,
): Promise<TransactionMeta> {
  const { transactionMeta, waitForHash } =
    await addTransactionOrUserOperation(request);

  if (!request.waitForSubmit) {
    waitForHash().catch(() => {
      // Not concerned with result.
    });

    return transactionMeta as TransactionMeta;
  }

  const transactionHash = await waitForHash();

  const finalTransactionMeta = getTransactionByHash(
    transactionHash as string,
    request.transactionController,
  );

  return finalTransactionMeta as TransactionMeta;
}

async function addTransactionOrUserOperation(
  request: FinalAddTransactionRequest,
) {
  const { selectedAccount } = request;
  const isTempoChainId = isTempoChain(request.chainId);
  if (isTempoChainId) {
    return addTransactionOnTempo(request);
  }

  const isSmartContractAccount =
    selectedAccount.type === EthAccountType.Erc4337;

  if (isSmartContractAccount) {
    return addUserOperationWithController(request);
  }

  return addTransactionWithController(request);
}

async function addTransactionWithController(
  request: FinalAddTransactionRequest,
) {
  const {
    transactionController,
    transactionOptions,
    transactionParams,
    networkClientId,
  } = request;

  const { result, transactionMeta } =
    await transactionController.addTransaction(transactionParams, {
      ...transactionOptions,
      networkClientId,
    });

  return {
    transactionMeta,
    waitForHash: () => result,
  };
}

async function addUserOperationWithController(
  request: FinalAddTransactionRequest,
) {
  const {
    networkClientId,
    transactionController,
    transactionOptions,
    transactionParams,
    userOperationController,
  } = request;

  const { maxFeePerGas, maxPriorityFeePerGas } = transactionParams;

  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31973
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { origin, requireApproval, type } = transactionOptions as any;

  const normalisedTransaction: TransactionParams = {
    ...transactionParams,
    maxFeePerGas: addHexPrefix(maxFeePerGas as string),
    maxPriorityFeePerGas: addHexPrefix(maxPriorityFeePerGas as string),
  };

  const swaps = transactionOptions?.swaps?.meta;

  if (swaps?.type) {
    delete swaps.type;
  }

  const options: AddUserOperationOptions = {
    networkClientId,
    origin,
    requireApproval,
    swaps,
    type,
  };

  const result = await userOperationController.addUserOperationFromTransaction(
    normalisedTransaction,
    options,
  );

  userOperationController.startPollingByNetworkClientId(networkClientId);

  const transactionMeta = getTransactionById(result.id, transactionController);

  return {
    transactionMeta,
    waitForHash: result.transactionHash,
  };
}

export function getTransactionById(
  transactionId: string,
  transactionController: TransactionController,
) {
  return transactionController.state.transactions.find(
    (tx) => tx.id === transactionId,
  );
}

function getTransactionByHash(
  transactionHash: string,
  transactionController: TransactionController,
) {
  return transactionController.state.transactions.find(
    (tx) => tx.hash === transactionHash,
  );
}

function getTransactionByBatchId(
  batchId: string,
  transactionController: TransactionController,
) {
  return transactionController.state.transactions.find(
    (tx) => tx.batchId === batchId,
  );
}

export function stripSingleLeadingZero(hex: string): string {
  if (!hex.startsWith('0x0') || hex.length <= 3) {
    return hex;
  }
  return `0x${hex.slice(3)}`;
}

function normalizeAddress(address?: string): string | undefined {
  return address?.toLowerCase();
}

function isInternalAccount(
  internalAccounts: { address: string }[],
  address?: string,
): boolean {
  const normalized = normalizeAddress(address);
  if (!normalized) {
    return false;
  }

  const internalSet = new Set(
    internalAccounts.map((acc) => normalizeAddress(acc.address)),
  );

  return internalSet.has(normalized);
}
