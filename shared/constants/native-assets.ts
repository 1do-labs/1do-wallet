import {
  ETH_TOKEN_IMAGE_URL,
  TEST_ETH_TOKEN_IMAGE_URL,
  BNB_TOKEN_IMAGE_URL,
  POL_TOKEN_IMAGE_URL,
  AVAX_TOKEN_IMAGE_URL,
  SEI_IMAGE_URL,
  MONAD_IMAGE_URL,
  HYPEREVM_IMAGE_URL,
  CURRENCY_SYMBOLS,
  CHAIN_IDS,
} from './network';

const DEFAULT_NATIVE_TOKEN_ADDRESS =
  '0x0000000000000000000000000000000000000000';

export type NativeTokenObject = {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  iconUrl: string;
};

export const ETH_NATIVE_TOKEN_OBJECT: NativeTokenObject = {
  symbol: CURRENCY_SYMBOLS.ETH,
  name: 'Ether',
  address: DEFAULT_NATIVE_TOKEN_ADDRESS,
  decimals: 18,
  iconUrl: ETH_TOKEN_IMAGE_URL,
};

const TEST_ETH_NATIVE_TOKEN_OBJECT: NativeTokenObject = {
  symbol: CURRENCY_SYMBOLS.TEST_ETH,
  name: 'Test Ether',
  address: DEFAULT_NATIVE_TOKEN_ADDRESS,
  decimals: 18,
  iconUrl: TEST_ETH_TOKEN_IMAGE_URL,
};

export const CHAIN_ID_DEFAULT_NATIVE_TOKEN_MAP = {
  [CHAIN_IDS.MAINNET]: ETH_NATIVE_TOKEN_OBJECT,
  '0x539': TEST_ETH_NATIVE_TOKEN_OBJECT,
  [CHAIN_IDS.BSC]: {
    symbol: CURRENCY_SYMBOLS.BNB,
    name: 'Binance Coin',
    address: DEFAULT_NATIVE_TOKEN_ADDRESS,
    decimals: 18,
    iconUrl: BNB_TOKEN_IMAGE_URL,
  },
  [CHAIN_IDS.POLYGON]: {
    symbol: CURRENCY_SYMBOLS.POL,
    name: 'Polygon',
    address: DEFAULT_NATIVE_TOKEN_ADDRESS,
    decimals: 18,
    iconUrl: POL_TOKEN_IMAGE_URL,
  },
  [CHAIN_IDS.GOERLI]: {
    symbol: CURRENCY_SYMBOLS.ETH,
    name: 'Ether',
    address: DEFAULT_NATIVE_TOKEN_ADDRESS,
    decimals: 18,
    iconUrl: TEST_ETH_TOKEN_IMAGE_URL,
  },
  [CHAIN_IDS.SEPOLIA]: {
    symbol: CURRENCY_SYMBOLS.ETH,
    name: 'Ether',
    address: DEFAULT_NATIVE_TOKEN_ADDRESS,
    decimals: 18,
    iconUrl: TEST_ETH_TOKEN_IMAGE_URL,
  },
  [CHAIN_IDS.AVALANCHE]: {
    symbol: CURRENCY_SYMBOLS.AVALANCHE,
    name: 'Avalanche',
    address: DEFAULT_NATIVE_TOKEN_ADDRESS,
    decimals: 18,
    iconUrl: AVAX_TOKEN_IMAGE_URL,
  },
  [CHAIN_IDS.OPTIMISM]: ETH_NATIVE_TOKEN_OBJECT,
  [CHAIN_IDS.ARBITRUM]: ETH_NATIVE_TOKEN_OBJECT,
  [CHAIN_IDS.ZKSYNC_ERA]: ETH_NATIVE_TOKEN_OBJECT,
  [CHAIN_IDS.LINEA_MAINNET]: ETH_NATIVE_TOKEN_OBJECT,
  [CHAIN_IDS.BASE]: ETH_NATIVE_TOKEN_OBJECT,
  [CHAIN_IDS.MEGAETH_MAINNET]: ETH_NATIVE_TOKEN_OBJECT,
  [CHAIN_IDS.SEI]: {
    symbol: CURRENCY_SYMBOLS.SEI,
    name: 'Sei',
    address: DEFAULT_NATIVE_TOKEN_ADDRESS,
    decimals: 18,
    iconUrl: SEI_IMAGE_URL,
  },
  [CHAIN_IDS.MONAD]: {
    symbol: CURRENCY_SYMBOLS.MONAD,
    name: 'Monad',
    address: DEFAULT_NATIVE_TOKEN_ADDRESS,
    decimals: 18,
    iconUrl: MONAD_IMAGE_URL,
  },
  [CHAIN_IDS.HYPE]: {
    symbol: CURRENCY_SYMBOLS.HYPE,
    name: 'Hyperliquid',
    address: DEFAULT_NATIVE_TOKEN_ADDRESS,
    decimals: 18,
    iconUrl: HYPEREVM_IMAGE_URL,
  },
} as const;
