import { CompletedRequest, MockttpServer } from 'mockttp';

type JsonRpcRequestPayload = {
  jsonrpc: string;
  method: string;
  params?: unknown[] | Record<string, unknown>;
  id?: number | string;
};

type RequestConfig = [
  method: string,
  options?: {
    methodResultVariant?: string;
    params?: unknown[] | Record<string, unknown>;
    result?: unknown;
    error?: unknown;
  },
];

const MOCK_BLOCK_NUMBER = '0x1';
const DEFAULT_VARIANT = 'default';

const mockJsonRpcResult = new Map<string, Map<string, unknown>>([
  ['eth_blockNumber', new Map([[DEFAULT_VARIANT, MOCK_BLOCK_NUMBER]])],
  ['eth_chainId', new Map([[DEFAULT_VARIANT, '0x1']])],
  ['eth_call', new Map([[DEFAULT_VARIANT, '0x4563918244F40000']])],
  [
    'eth_getBlockByNumber',
    new Map([
      [
        DEFAULT_VARIANT,
        {
          baseFeePerGas: '0x16c696eb7',
          difficulty: '0x0',
          gasLimit: '0x1c9c380',
          gasUsed: '0xa0056a',
          hash: '0x46be2982228b663026adae2bcedf1fcff63e244deeb1092a9bf498be54215d0c',
          number: MOCK_BLOCK_NUMBER,
          parentHash:
            '0x40bbc17240a659f2df8f3392a9d6d97f1ec60dd6407ee4553ddf40f32187a5cc',
          timestamp: '0x651e594f',
          transactions: [],
        },
      ],
    ]),
  ],
]);

export async function mockServerJsonRpc(
  mockServer: MockttpServer,
  listOfRequestConfigs: RequestConfig[],
) {
  for (const [method, options] of listOfRequestConfigs) {
    const {
      methodResultVariant,
      params,
      result: explicitResult,
      error,
    } = options ?? {};

    const result =
      explicitResult ??
      error ??
      mockJsonRpcResult
        .get(method)
        ?.get(methodResultVariant ?? DEFAULT_VARIANT);

    await mockServer
      .forPost(/infura/u)
      .always()
      .withJsonBodyIncluding(params ? { method, params } : { method })
      .thenCallback(async (req: CompletedRequest) => {
        const jsonBody = (await req.body.getJson()) as
          | JsonRpcRequestPayload
          | undefined;

        return {
          statusCode: 200,
          json: {
            jsonrpc: '2.0',
            id: jsonBody?.id,
            result,
          },
        };
      });
  }
}
