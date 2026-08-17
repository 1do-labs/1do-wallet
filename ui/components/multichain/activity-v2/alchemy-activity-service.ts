import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { NATIVE_TOKEN_ADDRESS } from '../../../../shared/constants/transaction';
import type { TransactionViewModel } from '../../../../shared/lib/multichain/types';

const PAGE_SIZE = '0x32';
const TRANSFER_CATEGORIES = [
  'external',
  'erc20',
  'erc721',
  'erc1155',
  'specialnft',
];

export type ActivityNetwork = {
  chainId: Hex;
  nativeCurrency: string;
  rpcUrl: string;
};

export type ActivityPageCursor = Record<Hex, { from?: string; to?: string }>;

export type AlchemyActivityPage = {
  data: TransactionViewModel[];
  nextPageCursor?: ActivityPageCursor;
};

type JsonRpcResponse<Result> = {
  id: number;
  jsonrpc: '2.0';
  result?: Result;
  error?: { code: number; message: string };
};

type AssetTransfer = {
  blockNum: Hex;
  hash: Hex;
  from: Hex;
  to?: Hex;
  value?: number | null;
  asset?: string | null;
  category: string;
  tokenId?: Hex;
  erc1155Metadata?: { tokenId: Hex; value: Hex }[];
  rawContract: {
    value?: Hex | null;
    address?: Hex | null;
    decimal?: Hex | null;
  };
  metadata?: { blockTimestamp?: string };
};

type AssetTransfersResult = {
  transfers: AssetTransfer[];
  pageKey?: string;
};

type RpcTransaction = {
  blockNumber: Hex;
  from: Hex;
  gas: Hex;
  gasPrice?: Hex;
  hash: Hex;
  input: Hex;
  nonce: Hex;
  to?: Hex | null;
  value: Hex;
};

type RpcReceipt = {
  gasUsed: Hex;
  logs: unknown[];
  status: Hex;
};

type RpcBlock = {
  timestamp: Hex;
};

type EnrichedTransfer = {
  transfer: AssetTransfer;
  transaction: RpcTransaction;
  receipt: RpcReceipt;
  timestamp: number;
};

/**
 * Loads indexed EVM activity from the configured Alchemy RPC endpoints.
 * @param options0
 * @param options0.address
 * @param options0.networks
 * @param options0.pageCursor
 */
export async function fetchAlchemyActivityPage({
  address,
  networks,
  pageCursor,
}: {
  address: Hex;
  networks: ActivityNetwork[];
  pageCursor?: ActivityPageCursor;
}): Promise<AlchemyActivityPage> {
  const pages = await Promise.allSettled(
    networks.map((network) =>
      fetchNetworkActivity(address, network, pageCursor?.[network.chainId]),
    ),
  );
  const data: TransactionViewModel[] = [];
  const nextPageCursor: ActivityPageCursor = {};

  for (const page of pages) {
    if (page.status !== 'fulfilled') {
      continue;
    }
    data.push(...page.value.data);
    if (page.value.nextCursor) {
      nextPageCursor[page.value.chainId] = page.value.nextCursor;
    }
  }

  data.sort((a, b) => (b.time ?? 0) - (a.time ?? 0));
  return {
    data,
    ...(Object.keys(nextPageCursor).length > 0 ? { nextPageCursor } : {}),
  };
}

async function fetchNetworkActivity(
  address: Hex,
  network: ActivityNetwork,
  cursor?: { from?: string; to?: string },
): Promise<{
  chainId: Hex;
  data: TransactionViewModel[];
  nextCursor?: { from?: string; to?: string };
}> {
  const [outgoing, incoming] = await rpcBatch<AssetTransfersResult>(
    network.rpcUrl,
    [
      createTransferRequest({ fromAddress: address, pageKey: cursor?.from }),
      createTransferRequest({ toAddress: address, pageKey: cursor?.to }),
    ],
  );
  const transfers = deduplicateTransfers([
    ...(outgoing?.transfers ?? []),
    ...(incoming?.transfers ?? []),
  ]);
  const enriched = await enrichTransfers(network.rpcUrl, transfers);
  return {
    chainId: network.chainId,
    data: mergeViewModels(
      enriched.map((entry) => toTransactionViewModel(address, network, entry)),
    ),
    ...((outgoing?.pageKey || incoming?.pageKey) && {
      nextCursor: {
        ...(outgoing?.pageKey ? { from: outgoing.pageKey } : {}),
        ...(incoming?.pageKey ? { to: incoming.pageKey } : {}),
      },
    }),
  };
}

function createTransferRequest({
  fromAddress,
  toAddress,
  pageKey,
}: {
  fromAddress?: Hex;
  toAddress?: Hex;
  pageKey?: string;
}) {
  return {
    method: 'alchemy_getAssetTransfers',
    params: [
      {
        fromBlock: '0x0',
        toBlock: 'latest',
        category: TRANSFER_CATEGORIES,
        excludeZeroValue: false,
        withMetadata: true,
        maxCount: PAGE_SIZE,
        order: 'desc',
        ...(fromAddress ? { fromAddress } : {}),
        ...(toAddress ? { toAddress } : {}),
        ...(pageKey ? { pageKey } : {}),
      },
    ],
  };
}

async function enrichTransfers(
  rpcUrl: string,
  transfers: AssetTransfer[],
): Promise<EnrichedTransfer[]> {
  if (transfers.length === 0) {
    return [];
  }
  const details = await rpcBatch<RpcTransaction | RpcReceipt>(
    rpcUrl,
    transfers.flatMap(({ hash }) => [
      { method: 'eth_getTransactionByHash', params: [hash] },
      { method: 'eth_getTransactionReceipt', params: [hash] },
    ]),
  );
  const missingBlockNumbers = new Set<Hex>();
  transfers.forEach((transfer) => {
    if (!transfer.metadata?.blockTimestamp) {
      missingBlockNumbers.add(transfer.blockNum);
    }
  });
  const blockNumbers = [...missingBlockNumbers];
  const blocks = await rpcBatch<RpcBlock>(
    rpcUrl,
    blockNumbers.map((blockNumber) => ({
      method: 'eth_getBlockByNumber',
      params: [blockNumber, false],
    })),
  );
  const blockTimestampByNumber = new Map(
    blockNumbers.map((blockNumber, index) => [
      blockNumber,
      blocks[index] ? Number.parseInt(blocks[index].timestamp, 16) * 1000 : 0,
    ]),
  );

  return transfers.flatMap((transfer, index) => {
    const transaction = details[index * 2] as RpcTransaction | undefined;
    const receipt = details[index * 2 + 1] as RpcReceipt | undefined;
    if (!transaction || !receipt) {
      return [];
    }
    const metadataTimestamp = transfer.metadata?.blockTimestamp
      ? Date.parse(transfer.metadata.blockTimestamp)
      : undefined;
    return [
      {
        transfer,
        transaction,
        receipt,
        timestamp:
          metadataTimestamp ??
          blockTimestampByNumber.get(transfer.blockNum) ??
          0,
      },
    ];
  });
}

function toTransactionViewModel(
  accountAddress: Hex,
  network: ActivityNetwork,
  { transfer, transaction, receipt, timestamp }: EnrichedTransfer,
): TransactionViewModel {
  const isIncoming =
    transfer.to?.toLowerCase() === accountAddress.toLowerCase();
  const tokenAddress =
    transfer.rawContract.address?.toLowerCase() ?? NATIVE_TOKEN_ADDRESS;
  let decimals = 0;
  if (transfer.rawContract.decimal) {
    decimals = Number.parseInt(transfer.rawContract.decimal, 16);
  } else if (transfer.category === 'external') {
    decimals = 18;
  }
  let rawAmount = 0n;
  if (transfer.rawContract.value) {
    rawAmount = BigInt(transfer.rawContract.value);
  } else if (transfer.value !== null && transfer.value !== undefined) {
    rawAmount = BigInt(Math.round(transfer.value * 10 ** decimals));
  }
  const token = {
    address: tokenAddress,
    symbol: transfer.asset ?? network.nativeCurrency,
    decimals,
    chainId: network.chainId,
  };
  const amount = isIncoming ? rawAmount : -rawAmount;
  const transactionType = getTransactionType(transfer.category);
  const status =
    receipt.status === '0x0'
      ? TransactionStatus.failed
      : TransactionStatus.confirmed;
  const txParams: TransactionMeta['txParams'] = {
    chainId: network.chainId,
    data: transaction.input,
    from: transaction.from,
    gas: transaction.gas,
    gasPrice: transaction.gasPrice,
    gasUsed: receipt.gasUsed,
    nonce: transaction.nonce,
    to: transaction.to ?? undefined,
    value: transaction.value,
  };

  return {
    blockNumber: transaction.blockNumber,
    chainId: network.chainId,
    hash: transaction.hash,
    id: `${network.chainId}-${transaction.hash}`,
    isTransfer: transfer.category !== 'external',
    networkClientId: '',
    nonce: Number.parseInt(transaction.nonce, 16),
    status,
    time: timestamp,
    toSmartContract: transaction.input !== '0x',
    txParams,
    type: isIncoming ? TransactionType.incoming : TransactionType.simpleSend,
    verifiedOnBlockchain: true,
    amounts: isIncoming
      ? { to: { token, amount } }
      : { from: { token, amount } },
    transactionCategory: 'TRANSFER',
    transactionProtocol: getTransactionProtocol(transfer.category),
    transactionType,
    valueTransfers: [
      {
        amount: rawAmount.toString(),
        contractAddress:
          tokenAddress === NATIVE_TOKEN_ADDRESS ? undefined : tokenAddress,
        decimal: decimals,
        from: transfer.from,
        symbol: token.symbol,
        to: transfer.to,
        transferType: getTransferType(transfer.category),
      },
    ] as TransactionViewModel['valueTransfers'],
  };
}

function getTransactionType(category: string): string {
  if (category === 'erc20') {
    return 'ERC_20_TRANSFER';
  }
  if (category === 'erc721') {
    return 'ERC_721_TRANSFER';
  }
  if (category === 'erc1155') {
    return 'ERC_1155_TRANSFER';
  }
  return 'STANDARD';
}

function getTransactionProtocol(category: string): string {
  if (category === 'erc721') {
    return 'ERC_721';
  }
  if (category === 'erc1155') {
    return 'ERC_1155';
  }
  if (category === 'erc20') {
    return 'ERC_20';
  }
  return '';
}

function getTransferType(category: string): string {
  if (category === 'erc721' || category === 'specialnft') {
    return 'erc721';
  }
  if (category === 'erc1155') {
    return 'erc1155';
  }
  if (category === 'erc20') {
    return 'erc20';
  }
  return 'normal';
}

function deduplicateTransfers(transfers: AssetTransfer[]): AssetTransfer[] {
  const seen = new Set<string>();
  return transfers.filter((transfer) => {
    const key = [
      transfer.hash.toLowerCase(),
      transfer.category,
      transfer.from.toLowerCase(),
      transfer.to?.toLowerCase() ?? '',
      transfer.rawContract.address?.toLowerCase() ?? '',
      transfer.rawContract.value ?? '',
      transfer.tokenId ?? '',
    ].join(':');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function mergeViewModels(
  transactions: TransactionViewModel[],
): TransactionViewModel[] {
  const byHash = new Map<string, TransactionViewModel>();
  for (const transaction of transactions) {
    const key = transaction.hash?.toLowerCase() ?? transaction.id;
    const existing = byHash.get(key);
    if (!existing) {
      byHash.set(key, transaction);
      continue;
    }
    byHash.set(key, {
      ...existing,
      amounts: {
        from: existing.amounts?.from ?? transaction.amounts?.from,
        to: existing.amounts?.to ?? transaction.amounts?.to,
      },
      valueTransfers: [
        ...(existing.valueTransfers ?? []),
        ...(transaction.valueTransfers ?? []),
      ],
    });
  }
  return [...byHash.values()];
}

async function rpcBatch<Result>(
  rpcUrl: string,
  requests: { method: string; params: unknown[] }[],
): Promise<(Result | undefined)[]> {
  if (requests.length === 0) {
    return [];
  }
  const body = requests.map((request, index) => ({
    id: index + 1,
    jsonrpc: '2.0' as const,
    ...request,
  }));
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Activity RPC request failed (${response.status})`);
  }
  const result = (await response.json()) as JsonRpcResponse<Result>[];
  if (!Array.isArray(result)) {
    throw new Error('Activity RPC returned an invalid batch response');
  }
  const byId = new Map(result.map((entry) => [entry.id, entry]));
  return body.map(({ id }) => {
    const entry = byId.get(id);
    if (entry?.error) {
      throw new Error(entry.error.message);
    }
    return entry?.result;
  });
}
