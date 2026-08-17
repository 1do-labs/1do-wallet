import { fetchAlchemyActivityPage } from './alchemy-activity-service';

const ACCOUNT = '0x1111111111111111111111111111111111111111';
const RECIPIENT = '0x2222222222222222222222222222222222222222';
const TOKEN = '0x3333333333333333333333333333333333333333';
const HASH = `0x${'a'.repeat(64)}`;
const fetchMock = jest.fn();

describe('fetchAlchemyActivityPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock;
  });

  it('loads, enriches, and paginates Alchemy transfers', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse([
          rpcResult(1, {
            transfers: [createTransfer()],
            pageKey: 'outgoing-page-2',
          }),
          rpcResult(2, { transfers: [] }),
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          rpcResult(1, createTransaction()),
          rpcResult(2, {
            gasUsed: '0x5208',
            logs: [],
            status: '0x1',
          }),
        ]),
      );

    const result = await fetchAlchemyActivityPage({
      address: ACCOUNT,
      networks: [
        {
          chainId: '0x1',
          nativeCurrency: 'ETH',
          rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/test-key',
        },
      ],
    });

    expect(result.nextPageCursor).toStrictEqual({
      '0x1': { from: 'outgoing-page-2' },
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        chainId: '0x1',
        hash: HASH,
        nonce: 2,
        transactionCategory: 'TRANSFER',
        transactionType: 'ERC_20_TRANSFER',
      }),
    );
    expect(result.data[0].amounts?.from).toEqual(
      expect.objectContaining({ amount: -1_000_000n }),
    );
  });

  it('continues with working networks when another RPC is unavailable', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('Unsupported method'))
      .mockResolvedValueOnce(
        jsonResponse([
          rpcResult(1, { transfers: [createTransfer()] }),
          rpcResult(2, { transfers: [] }),
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          rpcResult(1, createTransaction()),
          rpcResult(2, {
            gasUsed: '0x5208',
            logs: [],
            status: '0x1',
          }),
        ]),
      );

    const result = await fetchAlchemyActivityPage({
      address: ACCOUNT,
      networks: [
        {
          chainId: '0x2105',
          nativeCurrency: 'ETH',
          rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/test-key',
        },
        {
          chainId: '0x1',
          nativeCurrency: 'ETH',
          rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/test-key',
        },
      ],
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].chainId).toBe('0x1');
  });
});

function createTransfer() {
  return {
    blockNum: '0x10',
    hash: HASH,
    from: ACCOUNT,
    to: RECIPIENT,
    value: 1,
    asset: 'USDC',
    category: 'erc20',
    rawContract: {
      value: '0xf4240',
      address: TOKEN,
      decimal: '0x6',
    },
    metadata: { blockTimestamp: '2026-08-11T00:00:00.000Z' },
  };
}

function createTransaction() {
  return {
    blockNumber: '0x10',
    from: ACCOUNT,
    gas: '0x10000',
    gasPrice: '0x1',
    hash: HASH,
    input: '0xa9059cbb',
    nonce: '0x2',
    to: TOKEN,
    value: '0x0',
  };
}

function rpcResult(id: number, result: unknown) {
  return { id, jsonrpc: '2.0', result };
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}
