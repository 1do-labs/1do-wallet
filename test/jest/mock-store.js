import { EthAccountType } from '@metamask/keyring-api';
import { AccountGroupType, AccountWalletType } from '@metamask/account-api';
import { CHAIN_IDS, CURRENCY_SYMBOLS } from '../../shared/constants/network';
import { KeyringType } from '../../shared/constants/keyring';
import { ETH_EOA_METHODS } from '../../shared/constants/eth-methods';
import { mockNetworkState } from '../stub/networks';

const createGetSmartTransactionFeesApiResponse = () => {
  return {
    tradeTxFees: {
      // Approval tx.
      cancelFees: [
        { maxFeePerGas: 2100001000, maxPriorityFeePerGas: 466503987 },
        { maxFeePerGas: 2310003200, maxPriorityFeePerGas: 513154852 },
        { maxFeePerGas: 2541005830, maxPriorityFeePerGas: 564470851 },
        { maxFeePerGas: 2795108954, maxPriorityFeePerGas: 620918500 },
        { maxFeePerGas: 3074622644, maxPriorityFeePerGas: 683010971 },
        { maxFeePerGas: 3382087983, maxPriorityFeePerGas: 751312751 },
        { maxFeePerGas: 3720300164, maxPriorityFeePerGas: 826444778 },
        { maxFeePerGas: 4092333900, maxPriorityFeePerGas: 909090082 },
        { maxFeePerGas: 4501571383, maxPriorityFeePerGas: 1000000000 },
        { maxFeePerGas: 4951733023, maxPriorityFeePerGas: 1100001000 },
        { maxFeePerGas: 5446911277, maxPriorityFeePerGas: 1210002200 },
        { maxFeePerGas: 5991607851, maxPriorityFeePerGas: 1331003630 },
        { maxFeePerGas: 6590774628, maxPriorityFeePerGas: 1464105324 },
        { maxFeePerGas: 7249858682, maxPriorityFeePerGas: 1610517320 },
        { maxFeePerGas: 7974851800, maxPriorityFeePerGas: 1771570663 },
        { maxFeePerGas: 8772344955, maxPriorityFeePerGas: 1948729500 },
        { maxFeePerGas: 9649588222, maxPriorityFeePerGas: 2143604399 },
        { maxFeePerGas: 10614556694, maxPriorityFeePerGas: 2357966983 },
        { maxFeePerGas: 11676022978, maxPriorityFeePerGas: 2593766039 },
      ],
      feeEstimate: 42000000000000,
      fees: [
        { maxFeePerGas: 2310003200, maxPriorityFeePerGas: 513154852 },
        { maxFeePerGas: 2541005830, maxPriorityFeePerGas: 564470850 },
        { maxFeePerGas: 2795108954, maxPriorityFeePerGas: 620918500 },
        { maxFeePerGas: 3074622644, maxPriorityFeePerGas: 683010970 },
        { maxFeePerGas: 3382087983, maxPriorityFeePerGas: 751312751 },
        { maxFeePerGas: 3720300163, maxPriorityFeePerGas: 826444777 },
        { maxFeePerGas: 4092333900, maxPriorityFeePerGas: 909090082 },
        { maxFeePerGas: 4501571382, maxPriorityFeePerGas: 999999999 },
        { maxFeePerGas: 4951733022, maxPriorityFeePerGas: 1100001000 },
        { maxFeePerGas: 5446911277, maxPriorityFeePerGas: 1210002200 },
        { maxFeePerGas: 5991607851, maxPriorityFeePerGas: 1331003630 },
        { maxFeePerGas: 6590774627, maxPriorityFeePerGas: 1464105324 },
        { maxFeePerGas: 7249858681, maxPriorityFeePerGas: 1610517320 },
        { maxFeePerGas: 7974851800, maxPriorityFeePerGas: 1771570662 },
        { maxFeePerGas: 8772344954, maxPriorityFeePerGas: 1948729500 },
        { maxFeePerGas: 9649588222, maxPriorityFeePerGas: 2143604398 },
        { maxFeePerGas: 10614556693, maxPriorityFeePerGas: 2357966982 },
        { maxFeePerGas: 11676022977, maxPriorityFeePerGas: 2593766039 },
        { maxFeePerGas: 12843636951, maxPriorityFeePerGas: 2853145236 },
      ],
      gasLimit: 21000,
      gasUsed: 21000,
    },
    approvalTxFees: {
      // Trade tx.
      cancelFees: [
        { maxFeePerGas: 2100001000, maxPriorityFeePerGas: 466503987 },
        { maxFeePerGas: 2310003200, maxPriorityFeePerGas: 513154852 },
        { maxFeePerGas: 2541005830, maxPriorityFeePerGas: 564470851 },
        { maxFeePerGas: 2795108954, maxPriorityFeePerGas: 620918500 },
        { maxFeePerGas: 3074622644, maxPriorityFeePerGas: 683010971 },
        { maxFeePerGas: 3382087983, maxPriorityFeePerGas: 751312751 },
        { maxFeePerGas: 3720300164, maxPriorityFeePerGas: 826444778 },
        { maxFeePerGas: 4092333900, maxPriorityFeePerGas: 909090082 },
        { maxFeePerGas: 4501571383, maxPriorityFeePerGas: 1000000000 },
        { maxFeePerGas: 4951733023, maxPriorityFeePerGas: 1100001000 },
        { maxFeePerGas: 5446911277, maxPriorityFeePerGas: 1210002200 },
        { maxFeePerGas: 5991607851, maxPriorityFeePerGas: 1331003630 },
        { maxFeePerGas: 6590774628, maxPriorityFeePerGas: 1464105324 },
        { maxFeePerGas: 7249858682, maxPriorityFeePerGas: 1610517320 },
        { maxFeePerGas: 7974851800, maxPriorityFeePerGas: 1771570663 },
        { maxFeePerGas: 8772344955, maxPriorityFeePerGas: 1948729500 },
        { maxFeePerGas: 9649588222, maxPriorityFeePerGas: 2143604399 },
        { maxFeePerGas: 10614556694, maxPriorityFeePerGas: 2357966983 },
        { maxFeePerGas: 11676022978, maxPriorityFeePerGas: 2593766039 },
      ],
      feeEstimate: 42000000000000,
      fees: [
        { maxFeePerGas: 2310003200, maxPriorityFeePerGas: 513154852 },
        { maxFeePerGas: 2541005830, maxPriorityFeePerGas: 564470850 },
        { maxFeePerGas: 2795108954, maxPriorityFeePerGas: 620918500 },
        { maxFeePerGas: 3074622644, maxPriorityFeePerGas: 683010970 },
        { maxFeePerGas: 3382087983, maxPriorityFeePerGas: 751312751 },
        { maxFeePerGas: 3720300163, maxPriorityFeePerGas: 826444777 },
        { maxFeePerGas: 4092333900, maxPriorityFeePerGas: 909090082 },
        { maxFeePerGas: 4501571382, maxPriorityFeePerGas: 999999999 },
        { maxFeePerGas: 4951733022, maxPriorityFeePerGas: 1100001000 },
        { maxFeePerGas: 5446911277, maxPriorityFeePerGas: 1210002200 },
        { maxFeePerGas: 5991607851, maxPriorityFeePerGas: 1331003630 },
        { maxFeePerGas: 6590774627, maxPriorityFeePerGas: 1464105324 },
        { maxFeePerGas: 7249858681, maxPriorityFeePerGas: 1610517320 },
        { maxFeePerGas: 7974851800, maxPriorityFeePerGas: 1771570662 },
        { maxFeePerGas: 8772344954, maxPriorityFeePerGas: 1948729500 },
        { maxFeePerGas: 9649588222, maxPriorityFeePerGas: 2143604398 },
        { maxFeePerGas: 10614556693, maxPriorityFeePerGas: 2357966982 },
        { maxFeePerGas: 11676022977, maxPriorityFeePerGas: 2593766039 },
        { maxFeePerGas: 12843636951, maxPriorityFeePerGas: 2853145236 },
      ],
      gasLimit: 21000,
      gasUsed: 21000,
    },
  };
};

export const createSmartTransactionsMockStore = ({
  metamaskStateOverrides = {},
} = {}) => {
  const state = {
    confirmTransaction: {
      txData: {},
    },
    metamask: {
      accountTree: {
        wallets: {
          'entropy:01JKAF3DSGM3AB87EM9N0K41AJ': {
            id: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ',
            type: AccountWalletType.Entropy,
            status: 'ready',
            groups: {
              'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/0': {
                id: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/0',
                type: AccountGroupType.MultichainAccount,
                accounts: [
                  'cf8dace4-9439-4bd4-b3a8-88c821c8fcb3',
                  '07c2cfec-36c9-46c4-8115-3836d3ac9047',
                  '15e69915-2a1a-4019-93b3-916e11fd432f',
                  '784225f4-d30b-4e77-a900-c8bbce735b88',
                ],
                metadata: {
                  name: 'Test Account Group',
                  entropy: {
                    groupIndex: 0,
                  },
                  pinned: false,
                  hidden: false,
                  lastSelected: 0,
                },
              },
              'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/1': {
                id: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/1',
                type: AccountGroupType.MultichainAccount,
                accounts: ['36eb02e0-7925-47f0-859f-076608f09b69'],
                metadata: {
                  name: 'Snap Account Group',
                  entropy: {
                    groupIndex: 1,
                  },
                  pinned: false,
                  hidden: false,
                  lastSelected: 0,
                },
              },
            },
            metadata: {
              name: 'Test Wallet',
              entropy: {
                id: '01JKAF3DSGM3AB87EM9N0K41AJ',
              },
            },
          },
        },
      },
      selectedAccountGroup: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/0',
      remoteFeatureFlags: {
        smartTransactionsNetworks: {
          default: {
            extensionActive: false,
          },
          [CHAIN_IDS.MAINNET]: {
            extensionActive: true,
          },
          [CHAIN_IDS.BSC]: {
            extensionActive: true,
          },
        },
      },
      preferences: {
        showFiatInTestnets: true,
        smartTransactionsOptInStatus: true,
        tokenNetworkFilter: {},
        showMultiRpcModal: false,
      },
      enabledNetworkMap: {
        eip155: {
          [CHAIN_IDS.MAINNET]: true,
          [CHAIN_IDS.OPTIMISM]: true,
          [CHAIN_IDS.LINEA_MAINNET]: true,
        },
      },
      isEvmSelected: true,
      transactions: [
        {
          id: 6571648590592143,
          time: 1667403993369,
          status: 'confirmed',
          originalGasEstimate: '0x7548',
          userEditedGasLimit: false,
          chainId: CHAIN_IDS.MAINNET,
          loadingDefaults: false,
          dappSuggestedGasFees: null,
          sendFlowHistory: null,
          txParams: {
            from: '0x806627172af48bd5b0765d3449a7def80d6576ff',
            to: '0x881d40237659c251811cec9c364ef91dc08d300c',
            nonce: '0x30',
            value: '0x5af3107a4000',
            gas: '0x7548',
            maxFeePerGas: '0x19286f704d',
            maxPriorityFeePerGas: '0x77359400',
          },
          origin: 'metamask',
          actionId: 1667403993358.877,
          type: 'contractInteraction',
          userFeeLevel: 'medium',
          defaultGasEstimates: {
            estimateType: 'medium',
            gas: '0x7548',
            maxFeePerGas: '0x19286f704d',
            maxPriorityFeePerGas: '0x77359400',
          },
          estimatedBaseFee: 'e865e455a',
          hash: '0x8216e3696e7deb7ca794703015f17d5114a09362ae98f6a1611203e4c9509243',
          submittedTime: 1667403996143,
          firstRetryBlockNumber: '0x7838fe',
          baseFeePerGas: '0xe0ef7d207',
          blockTimestamp: '636290e8',
          postTxBalance: '19a61aaaf06e4bd1',
        },
      ],
      useCurrencyRateCheck: true,
      currentCurrency: 'usd',
      currencyRates: {
        ETH: {
          conversionRate: 2524.25,
        },
        usd: {
          conversionRate: 1,
        },
      },
      marketData: {
        '0x1': {
          '0x514910771AF9Ca656af840dff83E8264EcF986CA': {
            price: 3029.1,
            currency: 'usd',
          },
          '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984': {
            price: 5805.775,
            currency: 'usd',
          },
          '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
            price: 2,
            contractPercentChange1d: 0.004,
            priceChange1d: 0.00004,
          },
          '0x1111111111111111111111111111111111111111': {
            price: 0.1,
            contractPercentChange1d: 0.01,
            priceChange1d: 0.001,
          },
        },
        [CHAIN_IDS.LINEA_MAINNET]: {
          '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984': {
            price: 5805.775,
            currency: 'usd',
          },
        },
      },
      internalAccounts: {
        accounts: {
          'cf8dace4-9439-4bd4-b3a8-88c821c8fcb3': {
            address: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
            id: 'cf8dace4-9439-4bd4-b3a8-88c821c8fcb3',
            metadata: {
              name: 'Test Account',
              keyring: {
                type: 'HD Key Tree',
              },
            },
            options: {},
            methods: ETH_EOA_METHODS,
            type: EthAccountType.Eoa,
            scopes: ['eip155:0', 'eip155:1'],
          },
          '07c2cfec-36c9-46c4-8115-3836d3ac9047': {
            address: '0xc5b8dbac4c1d3f152cdeb400e2313f309c410acb',
            id: '07c2cfec-36c9-46c4-8115-3836d3ac9047',
            metadata: {
              name: 'Test Account 2',
              keyring: {
                type: 'HD Key Tree',
              },
            },
            options: {},
            methods: ETH_EOA_METHODS,
            type: EthAccountType.Eoa,
            scopes: ['eip155:0', 'eip155:1'],
          },
          '15e69915-2a1a-4019-93b3-916e11fd432f': {
            address: '0x2f8d4a878cfa04a6e60d46362f5644deab66572d',
            id: '15e69915-2a1a-4019-93b3-916e11fd432f',
            metadata: {
              name: 'Ledger Hardware 2',
              keyring: {
                type: 'Ledger Hardware',
              },
            },
            options: {},
            methods: ETH_EOA_METHODS,
            type: EthAccountType.Eoa,
            scopes: ['eip155:0', 'eip155:1'],
          },
          '784225f4-d30b-4e77-a900-c8bbce735b88': {
            address: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
            id: '784225f4-d30b-4e77-a900-c8bbce735b88',
            metadata: {
              name: 'Test Account 3',
              keyring: {
                type: 'HD Key Tree',
              },
            },
            options: {},
            methods: ETH_EOA_METHODS,
            type: EthAccountType.Eoa,
            scopes: ['eip155:0', 'eip155:1'],
          },
          '36eb02e0-7925-47f0-859f-076608f09b69': {
            address: '0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe6',
            id: '36eb02e0-7925-47f0-859f-076608f09b69',
            metadata: {
              name: 'Snap Account 1',
              keyring: {
                type: 'Snap Keyring',
              },
              snap: {
                id: 'snap-id',
                name: 'snap name',
              },
            },
            options: {},
            methods: ETH_EOA_METHODS,
            type: EthAccountType.Eoa,
            scopes: ['eip155:0', 'eip155:1'],
          },
        },
        selectedAccount: 'cf8dace4-9439-4bd4-b3a8-88c821c8fcb3',
      },
      accountIdByAddress: {
        '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc':
          'cf8dace4-9439-4bd4-b3a8-88c821c8fcb3',
        '0xc5b8dbac4c1d3f152cdeb400e2313f309c410acb':
          '07c2cfec-36c9-46c4-8115-3836d3ac9047',
        '0x2f8d4a878cfa04a6e60d46362f5644deab66572d':
          '15e69915-2a1a-4019-93b3-916e11fd432f',
        '0x95222290dd7278aa3ddd389cc1e1d165cc4bafe6':
          '36eb02e0-7925-47f0-859f-076608f09b69',
      },
      accountsByChainId: {
        [CHAIN_IDS.MAINNET]: {
          '0x0DCD5D886577d5081B0c52e242Ef29E70Be3E7bc': {
            balance: '0x2386f26fc10000',
          },
          '0xEC1Adf982415D2Ef5ec55899b9Bfb8BC0f29251B': {
            balance: '0x0',
          },
        },
        [CHAIN_IDS.LINEA_MAINNET]: {
          '0x0DCD5D886577d5081B0c52e242Ef29E70Be3E7bc': {
            balance: '0xde0bfcbf5d6a000',
          },
        },
        [CHAIN_IDS.OPTIMISM]: {
          '0x0DCD5D886577d5081B0c52e242Ef29E70Be3E7bc': {
            balance: '0xde0bfcbf5d6a000',
          },
        },
      },
      currentLocale: 'en',
      keyrings: [
        {
          type: KeyringType.hdKeyTree,
          accounts: [
            '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
            'c5b8dbac4c1d3f152cdeb400e2313f309c410acb',
            '2f8d4a878cfa04a6e60d46362f5644deab66572d',
          ],
          metadata: {
            id: '01JKAF3DSGM3AB87EM9N0K41AJ',
            name: '',
          },
        },
        {
          type: KeyringType.imported,
          accounts: ['0xd85a4b6a394794842887b8284293d69163007bbb'],
          metadata: {
            id: '01JKAF3KP7VPAG0YXEDTDRB6ZV',
            name: '',
          },
        },
      ],
      ...mockNetworkState({
        chainId: CHAIN_IDS.MAINNET,
        ticker: CURRENCY_SYMBOLS.ETH,
        rpcUrl: 'https://mainnet.infura.io/v3/',
        blockExplorerUrl: 'https://etherscan.io',
        id: 'mainnet',
      }),
      selectedNetworkClientId: 'mainnet',
      tokens: [
        {
          erc20: true,
          symbol: 'BAT',
          decimals: 18,
          address: '0x0D8775F648430679A709E98d2b0Cb6250d2887EF',
        },
        {
          erc20: true,
          symbol: 'USDT',
          decimals: 6,
          address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        },
      ],
      allTokens: {
        [CHAIN_IDS.MAINNET]: {
          '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc': [
            {
              address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
              symbol: 'LINK',
              decimals: 18,
            },
            {
              address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
              symbol: 'UNI',
              decimals: 6,
            },
          ],
        },
        [CHAIN_IDS.LINEA_MAINNET]: {
          '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc': [
            {
              address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
              symbol: 'UNI',
              decimals: 18,
            },
          ],
        },
      },
      tokenBalances: {
        '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc': {
          [CHAIN_IDS.MAINNET]: {
            '0x514910771AF9Ca656af840dff83E8264EcF986CA': '0xde0b6b3a7640000',
            '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984': '0x730',
          },
          [CHAIN_IDS.LINEA_MAINNET]: {
            '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984': '0x0',
          },
        },
      },
      smartTransactionsFeatureFlagsState: {
        smartTransactionsFeatureFlags: {
          ethereum: {
            extensionActive: true,
            mobileActive: false,
            smartTransactions: {
              expectedDeadline: 45,
              maxDeadline: 150,
              extensionReturnTxHashAsap: false,
            },
          },
          bsc: {
            extensionActive: true,
            mobileActive: false,
            smartTransactions: {},
          },
          smartTransactions: {
            mobileActive: true,
            extensionActive: true,
          },
        },
        quotes: {
          TEST_AGG_1: {
            trade: {
              from: '0xe18035bf8712672935fdb4e5e431b1a0183d2dfc',
              value: '0x0',
              gas: '0x61a80', // 4e5
              to: '0x881D40237659C251811CEC9c364ef91dC08D300C',
            },
            sourceAmount: '10000000000000000000', // 10e18
            destinationAmount: '20000000000000000000', // 20e18
            error: null,
            sourceToken: '0x6b175474e89094c44da98b954eedeac495271d0f',
            destinationToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            approvalNeeded: null,
            maxGas: 600000,
            averageGas: 120000,
            estimatedRefund: 80000,
            fetchTime: 607,
            aggregator: 'TEST_AGG_1',
            aggType: 'AGG',
            slippage: 2,
            sourceTokenInfo: {
              address: '0x6b175474e89094c44da98b954eedeac495271d0f',
              symbol: 'DAI',
              decimals: 18,
              iconUrl: 'https://foo.bar/logo.png',
            },
            destinationTokenInfo: {
              address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
              symbol: 'USDC',
              decimals: 18,
            },
            fee: 1,
          },

          TEST_AGG_BEST: {
            trade: {
              from: '0xe18035bf8712672935fdb4e5e431b1a0183d2dfc',
              value: '0x0',
              gas: '0x61a80',
              to: '0x881D40237659C251811CEC9c364ef91dC08D300C',
            },
            sourceAmount: '10000000000000000000',
            destinationAmount: '25000000000000000000', // 25e18
            error: null,
            sourceToken: '0x6b175474e89094c44da98b954eedeac495271d0f',
            destinationToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            approvalNeeded: null,
            maxGas: 1100000,
            averageGas: 411000,
            estimatedRefund: 343090,
            fetchTime: 1003,
            aggregator: 'TEST_AGG_BEST',
            aggType: 'AGG',
            slippage: 2,
            sourceTokenInfo: {
              address: '0x6b175474e89094c44da98b954eedeac495271d0f',
              symbol: 'DAI',
              decimals: 18,
              iconUrl: 'https://foo.bar/logo.png',
            },
            destinationTokenInfo: {
              address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
              symbol: 'USDC',
              decimals: 18,
            },
            fee: 1,
            isGasIncludedTrade: false,
            approvalTxFees: {
              feeEstimate: 42000000000000,
              fees: [
                { maxFeePerGas: 2310003200, maxPriorityFeePerGas: 513154852 },
              ],
              gasLimit: 21000,
              gasUsed: 21000,
            },
            tradeTxFees: {
              feeEstimate: 42000000000000,
              fees: [
                { maxFeePerGas: 2310003200, maxPriorityFeePerGas: 513154852 },
              ],
              gasLimit: 21000,
              gasUsed: 21000,
            },
          },
          TEST_AGG_2: {
            trade: {
              from: '0xe18035bf8712672935fdb4e5e431b1a0183d2dfc',
              value: '0x0',
              gas: '0x61a80',
              to: '0x881D40237659C251811CEC9c364ef91dC08D300C',
            },
            sourceAmount: '10000000000000000000',
            destinationAmount: '22000000000000000000', // 22e18
            error: null,
            sourceToken: '0x6b175474e89094c44da98b954eedeac495271d0f',
            destinationToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            approvalNeeded: null,
            maxGas: 368000,
            averageGas: 197000,
            estimatedRefund: 18205,
            fetchTime: 1354,
            aggregator: 'TEST_AGG_2',
            aggType: 'AGG',
            isBestQuote: true,
            slippage: 2,
            sourceTokenInfo: {
              address: '0x6b175474e89094c44da98b954eedeac495271d0f',
              symbol: 'DAI',
              decimals: 18,
              iconUrl: 'https://foo.bar/logo.png',
            },
            destinationTokenInfo: {
              address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
              symbol: 'USDC',
              decimals: 18,
            },
            fee: 1,
            isGasIncludedTrade: false,
            approvalTxFees: {
              feeEstimate: 42000000000000,
              fees: [
                { maxFeePerGas: 2310003200, maxPriorityFeePerGas: 513154852 },
              ],
              gasLimit: 21000,
              gasUsed: 21000,
            },
            tradeTxFees: {
              feeEstimate: 42000000000000,
              fees: [
                {
                  maxFeePerGas: 2310003200,
                  maxPriorityFeePerGas: 513154852,
                  tokenFees: [
                    {
                      token: {
                        address: '0x6b175474e89094c44da98b954eedeac495271d0f',
                        symbol: 'DAI',
                        decimals: 18,
                      },
                      balanceNeededToken: '0x426dc933c2e5a',
                    },
                  ],
                },
              ],
              gasLimit: 21000,
              gasUsed: 21000,
            },
          },
        },
        fetchParams: {
          metaData: {
            sourceTokenInfo: {
              symbol: 'ETH',
            },
            destinationTokenInfo: {
              symbol: 'USDC',
            },
          },
        },
        tradeTxId: null,
        approveTxId: null,
        quotesLastFetched: 1519211809934,
        swapsQuoteRefreshTime: 60000,
        swapsQuotePrefetchingRefreshTime: 60000,
        swapsStxBatchStatusRefreshTime: 5000,
        swapsStxGetTransactionsRefreshTime: 5000,
        swapsStxMaxFeeMultiplier: 1.5,
        swapsStxStatusDeadline: 150000,
        customMaxGas: '',
        customGasPrice: null,
        selectedAggId: 'TEST_AGG_2',
        customApproveTxData: '',
        errorKey: '',
        topAggId: 'TEST_AGG_BEST',
        routeState: '',
        smartTransactionsFeatureIsLive: false,
      },
      useTokenDetection: true,
      tokenList: {
        '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': {
          address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
          symbol: 'UNI',
          decimals: 18,
          name: 'Uniswap',
          iconUrl: '',
          aggregators: [
            'airswapLight',
            'bancor',
            'cmc',
            'coinGecko',
            'kleros',
            'oneInch',
            'paraswap',
            'pmm',
            'totle',
            'zapper',
            'zerion',
            'zeroEx',
          ],
          occurrences: 12,
        },
        '0x514910771af9ca656af840dff83e8264ecf986ca': {
          address: '0x514910771af9ca656af840dff83e8264ecf986ca',
          symbol: 'LINK',
          decimals: 18,
          name: 'Chainlink',
          iconUrl: '',
          aggregators: [
            'airswapLight',
            'bancor',
            'cmc',
            'coinGecko',
            'kleros',
            'oneInch',
            'paraswap',
            'pmm',
            'totle',
            'zapper',
            'zerion',
            'zeroEx',
          ],
          occurrences: 12,
        },
        '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2': {
          address: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2',
          symbol: 'SUSHI',
          decimals: 18,
          name: 'SushiSwap',
          iconUrl: '',
          aggregators: [
            'bancor',
            'cmc',
            'coinGecko',
            'kleros',
            'oneInch',
            'paraswap',
            'pmm',
            'totle',
            'zapper',
            'zerion',
            'zeroEx',
          ],
          occurrences: 11,
        },
      },
      smartTransactionsState: {
        userOptIn: true,
        userOptInV2: true,
        liveness: true,
        livenessByChainId: {
          [CHAIN_IDS.MAINNET]: true,
          [CHAIN_IDS.BSC]: true,
          [CHAIN_IDS.SEPOLIA]: true,
          [CHAIN_IDS.LINEA_MAINNET]: true,
        },
        fees: createGetSmartTransactionFeesApiResponse(),
        smartTransactions: {
          [CHAIN_IDS.MAINNET]: [
            {
              uuid: 'uuid2',
              status: 'success',
              cancellable: false,
              statusMetadata: {
                cancellationFeeWei: 36777567771000,
                cancellationReason: 'not_cancelled',
                deadlineRatio: 0.6400288486480713,
                minedHash:
                  '0x55ad39634ee10d417b6e190cfd3736098957e958879cffe78f1f00f4fd2654d6',
                minedTx: 'success',
              },
              chainId: CHAIN_IDS.MAINNET,
            },
            {
              uuid: 'uuid2',
              status: 'pending',
              cancellable: true,
              statusMetadata: {
                cancellationFeeWei: 36777567771000,
                cancellationReason: 'not_cancelled',
                deadlineRatio: 0.6400288486480713,
                minedHash:
                  '0x55ad39634ee10d417b6e190cfd3736098957e958879cffe78f1f00f4fd2654d6',
                minedTx: 'success',
              },
              chainId: CHAIN_IDS.MAINNET,
            },
          ],
        },
      },
      balances: {},
    },
    appState: {
      modal: {
        open: true,
        modalState: {
          name: 'test',
          props: {
            initialGasLimit: 100,
            minimumGasLimit: 5,
          },
        },
      },
      gasLoadingAnimationIsShowing: false,
    },
  };

  return {
    ...state,
    metamask: {
      ...state.metamask,
      ...metamaskStateOverrides,
    },
  };
};
