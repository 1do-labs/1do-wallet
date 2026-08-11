/**
 * Performance benchmark mock server configuration.
 *
 * All response payloads live in mock-responses.ts and JSON fixture files.
 */
import { Mockttp, MockedEndpoint } from 'mockttp';
import { POWER_USER_PRICES } from './price-data';
import chainsList from './chains-list.json';
import {
  jsonRpcResponse,
  buildSpotPricesResponse,
  buildHistoricalPricesResponse,
  buildCryptocomparePrice,
  FIAT_EXCHANGE_RATES,
  CRYPTO_EXCHANGE_RATES,
  SUPPORTED_VS_CURRENCIES,
  SUPPORTED_NETWORKS,
  CRYPTOCOMPARE_MULTI_PRICES,
  PHISHING_DETECTION,
  CLIENT_CONFIG_FLAGS,
  SUGGESTED_GAS_FEES,
  GAS_PRICES,
  ACCOUNTS_TRANSACTIONS,
  ACCOUNTS_BALANCES,
} from './mock-responses';

/**
 * Mock Priority System for Performance Tests
 *
 * mockttp evaluates mocks by priority (higher = checked first).
 * The catch-all in mock-e2e.js (forAnyRequest) returns empty 200 for unhandled URLs,
 * so specific mocks need higher priority to be evaluated first.
 */
export const MOCK_PRIORITIES = {
  STANDARD: 100,
  CHAIN_SPECIFIC: 200,
  CHAIN_SPECIFIC_CATCHALL: 199,
  TEST_OVERRIDE: 300,
  TEST_OVERRIDE_CATCHALL: 299,
  HIGH_PRIORITY: 500,
} as const;

export type MockPriorityLevel = keyof typeof MOCK_PRIORITIES;

/**
 * Wraps a static response with a simulated network delay.
 * Delay values approximate production network behavior.
 *
 * @param delayMs
 * @param response
 */
function delayedResponse<TResponse>(
  delayMs: number,
  response: TResponse,
): (req: { url: string }) => Promise<TResponse> {
  return async () => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return response;
  };
}

function delayedCallback<TResponse>(
  delayMs: number,
  callback: (req: { url: string }) => TResponse,
): (req: { url: string }) => Promise<TResponse> {
  return async (req) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return callback(req);
  };
}

/**
 * Hostname/URL patterns that must be intercepted in pass-through mode.
 * Standard mockttp rules don't reliably catch all proxied requests in MV3
 * (service worker can bypass --proxy-server), so the benchmarkPassThroughInterceptor
 * acts as a safety net inside the catch-all thenPassThrough({ beforeRequest }).
 */
const INTERCEPTED_PATTERNS: {
  match: (url: string, method: string) => boolean;
  response: Record<string, unknown>;
}[] = [
  {
    match: (url) => /^https:\/\/api\.segment\.io\/v1\//u.test(url),
    response: { statusCode: 200, json: {} },
  },
  {
    match: (url) => url.includes('chainid.network/chains.json'),
    response: { statusCode: 200, json: chainsList },
  },

  {
    match: (url) => url.includes('bitcoin-mainnet.infura.io'),
    response: { statusCode: 200, json: [] },
  },
  {
    match: (url) => url.includes('tron-mainnet.infura.io'),
    response: { statusCode: 200, json: {} },
  },

  {
    match: (url) =>
      url.includes('acl.execution.metamask.io') &&
      url.includes('registry.json'),
    response: { statusCode: 200, json: { registry: {} } },
  },
  {
    match: (url) =>
      url.includes('acl.execution.metamask.io') &&
      url.includes('signature.json'),
    response: { statusCode: 200, json: { signature: 'mock-signature' } },
  },
];

/**
 * Pass-through interceptor safety net. Evaluated inside the catch-all
 * thenPassThrough({ beforeRequest }) to intercept requests that bypass
 * standard mockttp rules in MV3 proxy mode.
 *
 * @param req - The incoming request with url and method.
 * @param req.url - The request URL.
 * @param req.method - The HTTP method.
 * @returns A mock response object if matched, or null to pass through.
 */
export function benchmarkPassThroughInterceptor(req: {
  url: string;
  method: string;
}): { response: Record<string, unknown> } | null {
  for (const pattern of INTERCEPTED_PATTERNS) {
    if (pattern.match(req.url, req.method)) {
      return { response: pattern.response };
    }
  }
  return null;
}

/**
 * Common mocks for pass-through mode.
 * Returns standard mockttp rules for analytics and other noisy endpoints.
 * All rules use .always() so they match every request (not just the first).
 *
 * @param server - The mockttp server instance.
 * @returns Array of mocked endpoint promises.
 */
export function getCommonMocks(server: Mockttp): Promise<MockedEndpoint>[] {
  return [
    server
      .forGet('https://chainid.network/chains.json')
      .always()
      .thenCallback(() => {
        return { statusCode: 200, json: chainsList };
      }),
    server
      .forAnyRequest()
      .forHost('bitcoin-mainnet.infura.io')
      .always()
      .thenCallback(() => {
        return { statusCode: 200, json: [] };
      }),
    server
      .forAnyRequest()
      .forHost('tron-mainnet.infura.io')
      .always()
      .thenCallback(() => {
        return { statusCode: 200, json: {} };
      }),
    server
      .forGet('https://acl.execution.metamask.io/latest/registry.json')
      .always()
      .thenCallback(() => {
        return { statusCode: 200, json: { registry: {} } };
      }),
    server
      .forGet('https://acl.execution.metamask.io/latest/signature.json')
      .always()
      .thenCallback(() => {
        return { statusCode: 200, json: { signature: 'mock-signature' } };
      }),
  ];
}

export async function mockBenchmarkEndpoints(
  server: Mockttp,
): Promise<MockedEndpoint[]> {
  const endpoints: MockedEndpoint[] = [];

  endpoints.push(
    await server
      .forPost(/segment\.io/u)
      .asPriority(150)
      .always()
      .thenCallback(delayedResponse(100, { statusCode: 200 })),
  );

  endpoints.push(
    await server
      .forGet(/token\.api\.cx\.metamask\.io\/tokens/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(250, { statusCode: 200, json: [] })),
  );

  endpoints.push(
    await server
      .forGet(/defiadapters\.api\.cx\.metamask\.io\/positions/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(50, { statusCode: 200, json: [] })),
  );

  endpoints.push(
    await server
      .forGet(/accounts\.api\.cx\.metamask\.io\/v1\/users\/.*\/surveys/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(50, { statusCode: 200, json: [] })),
  );

  endpoints.push(
    await server
      .forGet(/chainid\.network\/chains\.json/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(
        delayedResponse(500, { statusCode: 200, json: chainsList }),
      ),
  );

  endpoints.push(
    await server
      .forGet(/phishing-detection\.api\.cx\.metamask\.io/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(300, PHISHING_DETECTION)),
  );

  endpoints.push(
    await server
      .forGet(/client-side-detection\.api\.cx\.metamask\.io/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(250, { statusCode: 200, json: [] })),
  );

  endpoints.push(
    await server
      .forPut(/user-storage\.api\.cx\.metamask\.io/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(500, { statusCode: 204, json: null })),
  );

  endpoints.push(
    await server
      .forPost(/^https:\/\/mainnet\.infura\.io/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(800, jsonRpcResponse('0x0'))),
  );

  endpoints.push(
    await server
      .forPost(/polygon-mainnet\.infura\.io/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(500, jsonRpcResponse('0x0'))),
  );

  endpoints.push(
    await server
      .forPost(/bsc-mainnet\.infura\.io/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(650, jsonRpcResponse('0x0'))),
  );

  endpoints.push(
    await server
      .forPost(/optimism-mainnet\.infura\.io/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(475, jsonRpcResponse('0x0'))),
  );

  endpoints.push(
    await server
      .forPost(/arbitrum-mainnet\.infura\.io/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(650, jsonRpcResponse('0x0'))),
  );

  endpoints.push(
    await server
      .forPost(/base-mainnet\.infura\.io/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(400, jsonRpcResponse('0x0'))),
  );

  endpoints.push(
    await server
      .forPost(/linea-mainnet\.infura\.io/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(350, jsonRpcResponse('0x0'))),
  );

  endpoints.push(
    await server
      .forPost(/avalanche-mainnet\.infura\.io/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(550, jsonRpcResponse('0x0'))),
  );

  endpoints.push(
    await server
      .forPost(/sepolia\.infura\.io/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(500, jsonRpcResponse('0x0'))),
  );

  endpoints.push(
    await server
      .forPost(/linea-sepolia\.infura\.io/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(500, jsonRpcResponse('0x0'))),
  );

  endpoints.push(
    await server
      .forPost(/https:\/\/celo-mainnet\.infura\.io\/v3\/.*/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(750, jsonRpcResponse('0x0'))),
  );

  endpoints.push(
    await server
      .forPost('https://rpc.gnosischain.com/')
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(300, jsonRpcResponse('0x0'))),
  );

  endpoints.push(
    await server
      .forPost(/mainnet\.era\.zksync\.io/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(375, jsonRpcResponse('0x0'))),
  );

  endpoints.push(
    await server
      .forPost(/carrot\.megaeth\.com/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(100, jsonRpcResponse('0x0'))),
  );

  endpoints.push(
    await server
      .forPost(/testnet-rpc\.monad\.xyz/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(100, jsonRpcResponse('0x0'))),
  );

  endpoints.push(
    await server
      .forAnyRequest()
      .forHost('accounts.google.com')
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(100, { statusCode: 200, json: [] })),
  );

  endpoints.push(
    await server
      .forGet(/metamask\.github\.io\/ledger-iframe-bridge/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(
        delayedResponse(100, {
          statusCode: 200,
          headers: { 'Content-Type': 'text/html' },
          body: '<!DOCTYPE html><html><body></body></html>',
        }),
      ),
  );

  endpoints.push(
    await server
      .forGet(/tx-sentinel.*\.disabled\.1do\.local/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(
        delayedResponse(100, { statusCode: 200, json: { networks: [] } }),
      ),
  );

  endpoints.push(
    await server
      .forAnyRequest()
      .forHost('trigger.api.cx.metamask.io')
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(100, { statusCode: 200, json: [] })),
  );

  endpoints.push(
    await server
      .forAnyRequest()
      .forHost('notification.api.cx.metamask.io')
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(
        delayedResponse(100, { statusCode: 200, json: { notifications: [] } }),
      ),
  );

  endpoints.push(
    await server
      .forGet(/cdn\.contentful\.com/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(
        delayedResponse(100, { statusCode: 200, json: { items: [] } }),
      ),
  );

  endpoints.push(
    await server
      .forGet(/static\.cx\.metamask\.io/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(
        delayedResponse(200, {
          statusCode: 200,
          headers: { 'Content-Type': 'image/png' },
          body: Buffer.from([]),
        }),
      ),
  );

  endpoints.push(
    await server
      .forGet('https://acl.execution.metamask.io/latest/registry.json')
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(
        delayedResponse(500, { statusCode: 200, json: { registry: {} } }),
      ),
  );

  endpoints.push(
    await server
      .forGet('https://acl.execution.metamask.io/latest/signature.json')
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(
        delayedResponse(500, {
          statusCode: 200,
          json: { signature: 'mock-signature' },
        }),
      ),
  );

  endpoints.push(
    await server
      .forGet(/portfolio\.metamask\.io/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(
        delayedResponse(800, {
          statusCode: 200,
          body: '<!DOCTYPE html><html><body>Portfolio</body></html>',
        }),
      ),
  );

  endpoints.push(
    await server
      .forGet(/price\.api\.cx\.metamask\.io\/v\d+\/supportedVsCurrencies/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(500, SUPPORTED_VS_CURRENCIES)),
  );

  endpoints.push(
    await server
      .forGet(/price\.api\.cx\.metamask\.io\/v\d+\/supportedNetworks/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(500, SUPPORTED_NETWORKS)),
  );

  endpoints.push(
    await server
      .forGet(
        /https:\/\/price\.api\.cx\.metamask\.io\/v[1-9]\/exchange-rates\/fiat/u,
      )
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(100, FIAT_EXCHANGE_RATES)),
  );

  endpoints.push(
    await server
      .forGet(
        /https:\/\/price\.api\.cx\.metamask\.io\/v[1-9]\/exchange-rates(?:$|\?)/u,
      )
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(100, CRYPTO_EXCHANGE_RATES)),
  );

  endpoints.push(
    await server
      .forGet(/price\.api\.cx\.metamask\.io\/v\d+\/spot-prices/u)
      .asPriority(101)
      .always()
      .thenCallback(
        delayedCallback(200, (req) =>
          buildSpotPricesResponse(req.url, POWER_USER_PRICES),
        ),
      ),
  );

  endpoints.push(
    await server
      .forGet(
        /https:\/\/price\.api\.cx\.metamask\.io\/v[1-9]\/chains\/.*\/historical-prices/u,
      )
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(600, buildHistoricalPricesResponse())),
  );

  endpoints.push(
    await server
      .forGet(
        /https:\/\/price\.api\.cx\.metamask\.io\/v[1-9]\/networks\/.*\/historical-prices/u,
      )
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(600, buildHistoricalPricesResponse())),
  );

  endpoints.push(
    await server
      .forGet(/^https:\/\/min-api\.cryptocompare\.com\/data\/pricemulti/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(500, CRYPTOCOMPARE_MULTI_PRICES)),
  );

  endpoints.push(
    await server
      .forGet(/^https:\/\/min-api\.cryptocompare\.com\/data\/price(?!multi)/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(
        delayedCallback(500, (req) => buildCryptocomparePrice(req.url)),
      ),
  );

  endpoints.push(
    await server
      .forGet(
        /accounts\.api\.cx\.metamask\.io\/v1\/accounts\/.*\/transactions/u,
      )
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(500, ACCOUNTS_TRANSACTIONS)),
  );

  endpoints.push(
    await server
      .forGet(/accounts\.api\.cx\.metamask\.io\/v1\/accounts\/.*\/balances/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(550, ACCOUNTS_BALANCES)),
  );

  endpoints.push(
    await server
      .forGet(/client-config\.api\.cx\.metamask\.io\/v1\/flags/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(350, CLIENT_CONFIG_FLAGS)),
  );

  endpoints.push(
    await server
      .forGet(/gas\.api\.cx\.metamask\.io\/networks\/\d+\/suggestedGasFees/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(500, SUGGESTED_GAS_FEES)),
  );

  endpoints.push(
    await server
      .forGet(/gas\.api\.cx\.metamask\.io\/networks\/\d+\/gasPrices/u)
      .asPriority(MOCK_PRIORITIES.TEST_OVERRIDE)
      .always()
      .thenCallback(delayedResponse(600, GAS_PRICES)),
  );

  return endpoints;
}
