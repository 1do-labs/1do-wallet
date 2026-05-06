import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { renderHookWithProvider } from '../../../test/lib/render-helpers-navigate';
import { CHAIN_IDS } from '../../../shared/constants/network';
import { createBridgeMockStore } from '../../../test/data/bridge/mock-bridge-store';
import { toAssetId } from '../../../shared/lib/asset-utils';
import { useTokenAlerts } from './useTokenAlerts';

const renderUseSolanaAlerts = (mockStoreState: object) =>
  renderHookWithProvider(() => useTokenAlerts(), mockStoreState);

const mockResponse = {
  type: 'warning',
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  feature_id: 'UNSTABLE_TOKEN_PRICE',
  description:
    'The price of this token in USD is highly volatile, indicating a high risk of losing significant value by interacting with it.',
  titleId: 'unstableTokenPriceTitle',
  descriptionId: 'unstableTokenPriceDescription',
};
jest.mock('../../../shared/lib/bridge-utils/security-alerts-api.util', () => ({
  ...jest.requireActual(
    '../../../shared/lib/bridge-utils/security-alerts-api.util',
  ),
  fetchTokenAlert: () => mockResponse,
}));

describe('useTokenAlerts', () => {
  it('should not set token alert for non-EVM target tokens', async () => {
    const mockStoreState = createBridgeMockStore({
      featureFlagOverrides: {
        bridgeConfig: {
          chainRanking: [
            {
              chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            },
            {
              chainId: formatChainIdToCaip(CHAIN_IDS.MAINNET),
            },
          ],
        },
      },
      bridgeSliceOverrides: {
        fromToken: {
          address: '0x3fa807b6f8d4c407e6e605368f4372d14658b38c',
          chainId: 'eip155:1',
          assetId: toAssetId(
            '0x3fa807b6f8d4c407e6e605368f4372d14658b38c',
            'eip155:1',
          ),
        },
        toToken: {
          address: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          assetId:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
        },
      },
    });

    const { result, waitForNextUpdate } = renderUseSolanaAlerts(mockStoreState);
    await waitForNextUpdate();

    expect(result.current.tokenAlert).toBeNull();
  });
});
