const fs = require('fs');
const { escapeRegExp } = require('lodash');

const {
  ACCOUNTS_PROD_API_BASE_URL,
} = require('../../shared/constants/accounts');
const {
  GAS_API_BASE_URL,
  TOKEN_API_BASE_URL,
} = require('../../shared/constants/gas');
const { TX_SENTINEL_URL } = require('../../shared/constants/transaction');
const { DEFAULT_FIXTURE_ACCOUNT_LOWERCASE } = require('./constants');
const {
  ACCOUNT_ACTIVITY_WS_PORT,
} = require('./websocket/account-activity-mocks');

const { ALLOWLISTED_URLS } = require('./mock-e2e-allowlist');
const {
  getProductionRemoteFlagApiResponse,
} = require('./feature-flags/feature-flag-registry');

const ACCOUNTS_API_TOKENS_PATH =
  'test/e2e/mock-response-data/accounts-api-tokens.json';
const CHAIN_ID_NETWORKS_PATH =
  'test/e2e/mock-response-data/chain-id-network-chains.json';
const CLIENT_SIDE_DETECTION_BLOCKLIST_PATH =
  'test/e2e/mock-response-data/client-side-detection-blocklist.json';
const TEST_DAPP_STYLES_1_PATH =
  'test/e2e/mock-response-data/test-dapp-styles-1.txt';
const TEST_DAPP_STYLES_2_PATH =
  'test/e2e/mock-response-data/test-dapp-styles-2.txt';
const TOKEN_BLOCKLIST_PATH = 'test/e2e/mock-response-data/token-blocklist.json';

const blocklistedHosts = [
  'arbitrum-mainnet.infura.io',
  'avalanche-mainnet.infura.io',
  'bsc-dataseed.binance.org',
  'bsc-mainnet.infura.io',
  'carrot.megaeth.com',
  'linea-mainnet.infura.io',
  'linea-sepolia.infura.io',
  'mainnet.infura.io',
  'optimism-mainnet.infura.io',
  'polygon-mainnet.infura.io',
  'sei-mainnet.infura.io',
  'sepolia.infura.io',
  'testnet-rpc.monad.xyz',
];
const {
  mockEmptyStalelistAndHotlist,
} = require('./tests/phishing-controller/mocks');

const emptyHtmlPage = () => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>E2E Test Page</title>
    <link rel="icon" href="data:image/png;base64,iVBORw0KGgo=">
  </head>
  <body data-testid="empty-page-body">
    Empty page by MetaMask
  </body>
</html>`;

/**
 * The browser makes requests to domains within its own namespace for
 * functionality specific to the browser. For example when running E2E tests in
 * firefox the act of adding the extension from the firefox settins triggers
 * a series of requests to various mozilla.net or mozilla.com domains. These
 * are not requests that the extension itself makes.
 */
const browserAPIRequestDomains =
  /^.*\.(googleapis\.com|google\.com|mozilla\.net|mozilla\.com|mozilla\.org|gvt1\.com)$/iu;

/**
 * Some third-party providers might use random URLs that we don't want to track
 * in the privacy report "in clear". We identify those private hosts with a
 * `pattern` regexp and replace the original host by a more generic one (`host`).
 * For example, "my-secret-host.provider.com" could be denoted as "*.provider.com" in
 * the privacy report. This would prevent disclosing the "my-secret-host" subdomain
 * in this case.
 */
const privateHostMatchers = [
  // { pattern: RegExp, host: string }
  { pattern: /^.*\.btc.*\.quiknode\.pro$/iu, host: '*.btc*.quiknode.pro' },
  {
    pattern: /^.*-solana.*-.*\.mainnet\.rpcpool\.com/iu,
    host: '*solana*.mainnet.rpcpool.com',
  },
];

/**
 * @typedef {import('mockttp').Mockttp} Mockttp
 * @typedef {import('mockttp').MockedEndpoint} MockedEndpoint
 */

/**
 * @typedef {object} SetupMockReturn
 * @property {MockedEndpoint} mockedEndpoint - If a testSpecificMock was provided, returns the mockedEndpoint
 * @property {() => string[]} getPrivacyReport - A function to get the current privacy report.
 */

/**
 * Setup E2E network mocks.
 *
 * @param {Mockttp} server - The mock server used for network mocks.
 * @param {(server: Mockttp) => Promise<MockedEndpoint[]>} testSpecificMock - A function for setting up test-specific network mocks
 * @param {object} options - Network mock options.
 * @param {string} options.chainId - The chain ID used by the default configured network.
 * @param {string} options.ethConversionInUsd - The USD conversion rate for ETH.
 * @returns {Promise<SetupMockReturn>}
 */
async function setupMocking(
  server,
  testSpecificMock,
  { chainId, ethConversionInUsd = 1700 },
) {
  let numNetworkReqs = 0;
  const privacyReport = new Set();
  await server.forAnyRequest().thenPassThrough({
    beforeRequest: ({ headers: { host }, url }) => {
      if (!host || !url) {
        return {
          response: {
            statusCode: 200,
          },
        };
      }
      if (blocklistedHosts.includes(host)) {
        return {
          url: 'http://localhost:8545',
        };
      } else if (ALLOWLISTED_URLS.includes(url)) {
        // If the URL or the host is in the allowlist, we pass the request as it is, to the live server.
        return {};
      }
      return {
        // If the URL or the host is not in the allowlist nor blocklisted, we return a 200.
        response: {
          statusCode: 200,
        },
      };
    },
  });

  function getNetworkReport() {
    return { numNetworkReqs };
  }

  function clearNetworkReport() {
    numNetworkReqs = 0;
  }

  const mockedEndpoint = await testSpecificMock(server);
  // Mocks below this line can be overridden by test-specific mocks

  // remote feature flags — production-accurate defaults from the registry
  // FF will apply to all environments: rc, prod and dev
  await server
    .forGet('https://client-config.api.cx.metamask.io/v1/flags')
    .withQuery({
      client: 'extension',
      distribution: 'main',
    })
    .thenCallback(() => {
      return {
        ok: true,
        statusCode: 200,
        json: getProductionRemoteFlagApiResponse(),
      };
    });

  // Account link
  const accountLinkRegex =
    /^https:\/\/etherscan.io\/address\/0x[a-fA-F0-9]{40}$/u;
  await server.forGet(accountLinkRegex).thenCallback(() => {
    return {
      statusCode: 200,
      body: emptyHtmlPage(),
    };
  });

  // Token tracker link
  const tokenTrackerRegex =
    /^https:\/\/etherscan.io\/token\/0x[a-fA-F0-9]{40}$/u;
  await server.forGet(tokenTrackerRegex).thenCallback(() => {
    return {
      statusCode: 200,
      body: emptyHtmlPage(),
    };
  });

  // Explorer link
  const explorerLinkRegex = /^https:\/\/etherscan.io\/tx\/0x[a-fA-F0-9]{64}$/u;
  await server.forGet(explorerLinkRegex).thenCallback(() => {
    return {
      statusCode: 200,
      body: emptyHtmlPage(),
    };
  });

  await server
    .forPost(
      'https://arbitrum-mainnet.infura.io/v3/00000000000000000000000000000000',
    )
    .withJsonBodyIncluding({
      method: 'eth_chainId',
    })
    .thenCallback(() => {
      return {
        statusCode: 200,
        json: {
          jsonrpc: '2.0',
          id: '1675864782845',
          result: '0xa4b1',
        },
      };
    });

  await server.forPost('https://api.segment.io/v1/batch').thenCallback(() => {
    return {
      statusCode: 200,
    };
  });

  await server
    .forPost('https://sentry.io/api/0000000/envelope/')
    .thenCallback(() => {
      return {
        statusCode: 200,
        json: {},
      };
    });

  await server
    .forPost('https://sentry.io/api/0000000/store/')
    .thenCallback(() => {
      return {
        statusCode: 200,
        json: {},
      };
    });

  // SENTRY_DSN_PERFORMANCE
  await server
    .forPost('https://sentry.io/api/4510302346608640/envelope/')
    .thenPassThrough({
      beforeRequest: (req) => {
        console.log(
          'Request going to Sentry metamask-performance ============',
          req.url,
          false,
        );
        return {};
      },
    });

  await server
    .forGet('https://www.4byte.directory/api/v1/signatures/')
    .thenCallback(() => {
      return {
        statusCode: 200,
        json: {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              created_at: null,
              text_signature: 'deposit()',
              hex_signature: null,
              bytes_signature: null,
            },
          ],
        },
      };
    });

  const targetChainId = chainId === 1337 ? 1 : chainId;
  await server
    .forGet(`${GAS_API_BASE_URL}/networks/${targetChainId}/gasPrices`)
    .thenCallback(() => {
      return {
        statusCode: 200,
        json: {
          SafeGasPrice: '1',
          ProposeGasPrice: '2',
          FastGasPrice: '3',
        },
      };
    });

  await server
    .forGet(`${GAS_API_BASE_URL}/networks/${chainId}/suggestedGasFees`)
    .thenCallback(() => {
      return {
        statusCode: 200,
        json: {
          low: {
            suggestedMaxPriorityFeePerGas: '1',
            suggestedMaxFeePerGas: '20.44436136',
            minWaitTimeEstimate: 15000,
            maxWaitTimeEstimate: 30000,
          },
          medium: {
            suggestedMaxPriorityFeePerGas: '1.5',
            suggestedMaxFeePerGas: '25.80554517',
            minWaitTimeEstimate: 15000,
            maxWaitTimeEstimate: 45000,
          },
          high: {
            suggestedMaxPriorityFeePerGas: '2',
            suggestedMaxFeePerGas: '27.277766977',
            minWaitTimeEstimate: 15000,
            maxWaitTimeEstimate: 60000,
          },
          estimatedBaseFee: '19.444436136',
          networkCongestion: 0.14685,
          latestPriorityFeeRange: ['0.378818859', '6.555563864'],
          historicalPriorityFeeRange: ['0.1', '248.262969261'],
          historicalBaseFeeRange: ['14.146999781', '28.825256275'],
          priorityFeeTrend: 'down',
          baseFeeTrend: 'up',
        },
      };
    });

  // This endpoint returns metadata for "transaction simulation" supported networks.
  await server.forGet(`${TX_SENTINEL_URL}/networks`).thenJson(200, {
    1: {
      name: 'Mainnet',
      group: 'ethereum',
      chainID: 1,
      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      network: 'ethereum-mainnet',
      explorer: 'https://etherscan.io',
      confirmations: true,
      smartTransactions: true,
      hidden: false,
    },
  });
  await server.forGet(`${TX_SENTINEL_URL}/network`).thenJson(200, {
    name: 'Mainnet',
    group: 'ethereum',
    chainID: 1,
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    network: 'ethereum-mainnet',
    explorer: 'https://etherscan.io',
    confirmations: true,
    smartTransactions: true,
    hidden: false,
  });

  // Surveys
  await server
    .forGet(
      new RegExp(
        `${escapeRegExp(ACCOUNTS_PROD_API_BASE_URL)}/v1/users/[^/]+/surveys`,
        'u',
      ),
    )
    .thenCallback(() => {
      return {
        statusCode: 200,
        json: {
          userId: '0x123',
          surveys: {},
        },
      };
    });

  await server
    .forGet(`https://token.api.cx.metamask.io/tokens/${chainId}`)
    .thenCallback(() => {
      return {
        statusCode: 200,
        json: [
          {
            address: '0x0d8775f648430679a709e98d2b0cb6250d2887ef',
            symbol: 'BAT',
            decimals: 18,
            name: 'Basic Attention Token',
            iconUrl:
              'https://assets.coingecko.com/coins/images/677/thumb/basic-attention-token.png?1547034427',
            aggregators: [
              'aave',
              'bancor',
              'coinGecko',
              'oneInch',
              'paraswap',
              'pmm',
              'zapper',
              'zerion',
              'zeroEx',
            ],
            occurrences: 9,
          },
          {
            address: '0x6b175474e89094c44da98b954eedeac495271d0f',
            symbol: 'DAI',
            decimals: 18,
            name: 'Dai Stablecoin',
            iconUrl:
              'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/dai.svg',
            type: 'erc20',
            aggregators: [
              'metamask',
              'aave',
              'bancor',
              'cmc',
              'cryptocom',
              'coinGecko',
              'oneInch',
              'pmm',
              'sushiswap',
              'zerion',
              'lifi',
              'socket',
              'squid',
              'openswap',
              'sonarwatch',
              'uniswapLabs',
              'coinmarketcap',
            ],
            occurrences: 17,
            erc20Permit: true,
            fees: { '0xb0da5965d43369968574d399dbe6374683773a65': 0 },
            storage: { balance: 2 },
          },
        ],
      };
    });

  const TOKEN_BLOCKLIST = fs.readFileSync(TOKEN_BLOCKLIST_PATH);
  await server
    .forGet(`${TOKEN_API_BASE_URL}/blocklist`)
    .withQuery({ chainId: '1', region: 'global' })
    .thenCallback(() => {
      return {
        statusCode: 200,
        json: JSON.parse(TOKEN_BLOCKLIST),
      };
    });

  await server
    .forGet(`https://token.api.cx.metamask.io/token/${chainId}`)
    .thenCallback(() => {
      return {
        statusCode: 200,
        json: {},
      };
    });

  // It disables loading of token icons, e.g. this URL: https://static.cx.metamask.io/api/v1/tokenIcons/1337/0x0000000000000000000000000000000000000000.png
  const tokenIconRegex = new RegExp(
    `^https:\\/\\/static\\.cx\\.metamask\\.io\\/api\\/vi\\/tokenIcons\\/${chainId}\\/.*\\.png`,
    'u',
  );
  await server.forGet(tokenIconRegex).thenCallback(() => {
    return {
      statusCode: 200,
    };
  });

  // Price API: Spot prices for native token (ETH)
  // Uses zero address (0x0000000000000000000000000000000000000000) to represent native token
  // API format: v3/spot-prices?assetIds={assetIds}&vsCurrency=usd&includeMarketData=true
  await server
    .forGet(`https://price.api.cx.metamask.io/v3/spot-prices`)
    .withQuery({
      assetIds: 'eip155:1/slip44:60',
      vsCurrency: 'usd',
      includeMarketData: 'true',
    })
    .thenCallback(() => {
      return {
        statusCode: 200,
        json: {
          'eip155:1/slip44:60': {
            id: 'ethereum',
            price: ethConversionInUsd,
            marketCap: 382623505141,
            pricePercentChange1d: 0,
          },
        },
      };
    });

  await mockEmptyStalelistAndHotlist(server);

  await server
    .forPost('https://customnetwork.test/api/customRPC')
    .thenCallback(() => {
      return {
        statusCode: 200,
        json: {
          jsonrpc: '2.0',
          id: '1675864782845',
          result: '0x122',
        },
      };
    });

  await mockLensNameProvider(server);
  await mockTokenNameProvider(server, chainId);

  // IPFS endpoint for NFT metadata
  await server
    .forGet(
      'https://bafybeidxfmwycgzcp4v2togflpqh2gnibuexjy4m4qqwxp7nh3jx5zlh4y.ipfs.dweb.link/1.json',
    )
    .thenCallback(() => {
      return {
        statusCode: 200,
      };
    });

  await server.forGet(/^https:\/\/sourcify.dev\/(.*)/u).thenCallback(() => {
    return {
      statusCode: 404,
    };
  });

  // Chains Metadata
  const CHAIN_ID_NETWORKS = fs.readFileSync(CHAIN_ID_NETWORKS_PATH);
  await server
    .forGet('https://chainid.network/chains.json')
    .thenCallback(() => {
      return {
        statusCode: 200,
        json: JSON.parse(CHAIN_ID_NETWORKS),
      };
    });

  // Accounts API: supported networks
  await server
    .forGet('https://accounts.disabled.1do.local/v1/supportedNetworks')
    .thenCallback(() => {
      return {
        statusCode: 200,
        json: {
          fullSupport: [1, 137, 56, 59144, 8453, 10, 42161, 534352],
          partialSupport: {
            balances: [42220, 43114],
          },
        },
      };
    });

  // Accounts API: tokens
  const ACCOUNTS_API_TOKENS = fs.readFileSync(ACCOUNTS_API_TOKENS_PATH);
  await server
    .forGet('https://account.disabled.1do.local/networks')
    .thenCallback(() => {
      return {
        statusCode: 200,
        json: JSON.parse(ACCOUNTS_API_TOKENS),
      };
    });

  // Accounts API: transactions
  await server
    .forGet('https://accounts.disabled.1do.local/v4/multiaccount/transactions')
    .always()
    .thenCallback(() => {
      return {
        statusCode: 200,
        json: {
          data: [],
          pageInfo: { hasNextPage: false, count: 0 },
        },
      };
    });

  // Client Side Detection: Request Blocklist
  const CLIENT_SIDE_DETECTION_BLOCKLIST = fs.readFileSync(
    CLIENT_SIDE_DETECTION_BLOCKLIST_PATH,
  );
  await server
    .forGet(
      'https://client-side-detection.api.cx.metamask.io/v1/request-blocklist',
    )
    .thenCallback(() => {
      return {
        statusCode: 200,
        json: JSON.parse(CLIENT_SIDE_DETECTION_BLOCKLIST),
      };
    });

  // Nft API: tokens
  await server
    .forGet(
      `https://nft.api.cx.metamask.io/users/${DEFAULT_FIXTURE_ACCOUNT_LOWERCASE}/tokens`,
    )
    .thenCallback(() => {
      return {
        statusCode: 200,
        json: {
          tokens: [],
          continuation: null,
        },
      };
    });

  /**
   * Backend WebSocket (AccountActivity, etc.)
   * Forward gateway WebSocket connections to local mock server
   */
  await server
    .forAnyWebSocket()
    .matching((req) =>
      /^wss:\/\/gateway\.api\.cx\.metamask\.io\//u.test(req.url),
    )
    .thenForwardTo(`ws://localhost:${ACCOUNT_ACTIVITY_WS_PORT}`);

  // Test Dapp Styles
  const TEST_DAPP_STYLES_1 = fs.readFileSync(TEST_DAPP_STYLES_1_PATH);
  const TEST_DAPP_STYLES_2 = fs.readFileSync(TEST_DAPP_STYLES_2_PATH);
  await server
    .forGet(
      'https://cdnjs.cloudflare.com/ajax/libs/mdbootstrap/4.14.1/css/mdb.min.css',
    )
    .thenCallback(() => {
      return {
        statusCode: 200,
        body: TEST_DAPP_STYLES_1,
      };
    });

  await server
    .forGet(
      'https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.4.1/css/bootstrap.min.css',
    )
    .thenCallback(() => {
      return {
        statusCode: 200,
        body: TEST_DAPP_STYLES_2,
      };
    });

  // Token Icons
  await server
    .forGet('https://static.cx.metamask.io/api/v1/tokenIcons')
    .thenCallback(() => {
      return {
        statusCode: 200,
      };
    });

  // Dynamic Banner Content
  await server
    .forGet(/^https:\/\/(cdn|preview)\.contentful\.com\/.*$/u)
    .withQuery({
      content_type: 'promotionalBanner',
    })
    .thenCallback(() => {
      return {
        statusCode: 200,
        json: {
          items: [],
          includes: { Asset: [] },
        },
      };
    });

  /**
   * Returns an array of alphanumerically sorted hostnames that were requested
   * during the current test suite.
   *
   * @returns {string[]} privacy report for the current test suite.
   */
  function getPrivacyReport() {
    return [...privacyReport].sort();
  }

  /**
   * Excludes hosts from the privacyReport if they are refered to by the MetaMask Portfolio
   * in a different tab. This is because the Portfolio is a separate application
   *
   * @param request
   */
  const portfolioRequestsMatcher = (request) =>
    request.headers.referer === 'https://app.metamask.io/';

  /**
   * Tests a request against private domains and returns a set of generic hostnames that
   * match.
   *
   * @param request
   * @returns A set of matched results.
   */
  const matchPrivateHosts = (request) => {
    const privateHosts = new Set();

    for (const { pattern, host: privateHost } of privateHostMatchers) {
      if (request.headers.host.match(pattern)) {
        privateHosts.add(privateHost);
      }
    }

    return privateHosts;
  };

  /**
   * Listen for requests and add the hostname to the privacy report if it did
   * not previously exist. This is used to track which hosts are requested
   * during the current test suite and used to ask for extra scrutiny when new
   * hosts are added to the privacy-snapshot.json file. We intentionally do not
   * add hosts to the report that are requested as part of the browsers normal
   * operation. See the browserAPIRequestDomains regex above.
   */
  server.on('request-initiated', (request) => {
    numNetworkReqs += 1;

    const privateHosts = matchPrivateHosts(request);
    if (privateHosts.size) {
      for (const privateHost of privateHosts) {
        privacyReport.add(privateHost);
      }
      // At this point, we know the request at least one private doamin, so we just stops here to avoid
      // using the request any further.
      return;
    }

    if (
      request.headers.host.match(browserAPIRequestDomains) === null &&
      !portfolioRequestsMatcher(request)
    ) {
      privacyReport.add(request.headers.host);
    }
  });

  return {
    mockedEndpoint,
    getPrivacyReport,
    getNetworkReport,
    clearNetworkReport,
  };
}

async function mockLensNameProvider(server) {
  const handlesByAddress = {
    '0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826': 'test.lens',
    '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb': 'test2.lens',
    '0xcccccccccccccccccccccccccccccccccccccccc': 'test3.lens',
    '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb': 'test4.lens',
  };

  await server.forPost('https://api.lens.dev').thenCallback(async (request) => {
    const json = await request.body?.getJson();
    const address = json?.variables?.address;
    const handle = handlesByAddress[address];

    return {
      statusCode: 200,
      json: {
        data: {
          profiles: {
            items: [
              {
                handle,
              },
            ],
          },
        },
      },
    };
  });
}

async function mockTokenNameProvider(server) {
  const namesByAddress = {
    '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef': 'Test Token',
    '0xb0bdabea57b0bdabea57b0bdabea57b0bdabea57': 'Test Token 2',
  };

  for (const address of Object.keys(namesByAddress)) {
    const name = namesByAddress[address];

    await server
      .forGet(/https:\/\/token\.api\.cx\.metamask\.io\/token\/.*/gu)
      .withQuery({ address })
      .thenCallback(() => {
        return {
          statusCode: 200,
          json: {
            name,
          },
        };
      });
  }
}

module.exports = { setupMocking, emptyHtmlPage };
