export const GAS_API_BASE_URL = 'http://127.0.0.1:9';
export const GAS_CLIENT_ID = '1do';

export const CUSTOM_GAS_ESTIMATE = 'custom';

export const GasEstimateTypes = {
  feeMarket: 'fee-market',
  legacy: 'legacy',
  ethGasPrice: 'eth_gasPrice',
  none: 'none',
} as const;

export type GasEstimateTypes =
  (typeof GasEstimateTypes)[keyof typeof GasEstimateTypes];

export const GasRecommendations = {
  low: 'low',
  medium: 'medium',
  high: 'high',
} as const;

export type GasRecommendations =
  (typeof GasRecommendations)[keyof typeof GasRecommendations];

export const EditGasModes = {
  cancel: 'cancel',
  speedUp: 'speed-up',
  modifyInPlace: 'modify-in-place',
} as const;

export type EditGasModes = (typeof EditGasModes)[keyof typeof EditGasModes];

export const PriorityLevels = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  custom: 'custom',
  dAppSuggested: 'dappSuggested',
  dappSuggestedHigh: 'dappSuggestedHigh',
  tenPercentIncreased: 'tenPercentIncreased',
} as const;

export type PriorityLevels =
  (typeof PriorityLevels)[keyof typeof PriorityLevels];

export const NetworkCongestionThresholds = {
  notBusy: 0,
  stable: 0.33,
  busy: 0.9,
} as const;

export type TxGasFees = {
  gasLimit: string;
  gasPrice: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  estimateUsed: string;
  estimateSuggested: string;
  defaultGasEstimates: string;
  gas: string;
  originalGasEstimate: string;
  userEditedGasLimit: string;
  userFeeLevel: string;
};
