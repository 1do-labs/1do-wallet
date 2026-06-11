import React from 'react';
import configureMockStore from 'redux-mock-store';
import { QuoteResponse } from '@metamask/bridge-controller';

import { CHAIN_IDS, GasFeeToken } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { getMockConfirmStateForTransaction } from '../../../../../../../../test/data/confirmations/helper';
import { renderWithConfirmContextProvider } from '../../../../../../../../test/lib/confirmations/render-helpers';
import { GAS_FEE_TOKEN_MOCK } from '../../../../../../../../test/data/confirmations/gas';
import { genUnapprovedContractInteractionConfirmation } from '../../../../../../../../test/data/confirmations/contract-interaction';
import { upgradeAccountConfirmationOnly } from '../../../../../../../../test/data/confirmations/batch-transaction';
import { enLocale as messages } from '../../../../../../../../test/lib/i18n-helpers';
import { useEstimationFailed } from '../../../../../hooks/gas/useEstimationFailed';
import { useIsGaslessSupported } from '../../../../../hooks/gas/useIsGaslessSupported';
import { EditGasFeesRow } from './edit-gas-fees-row';

jest.mock('../../../../../hooks/gas/useEstimationFailed');
jest.mock('../../../../../hooks/gas/useIsGaslessSupported');

jest.mock('../../../../simulation-details/useBalanceChanges', () => ({
  useBalanceChanges: jest.fn(() => ({ pending: false, value: [] })),
}));

jest.mock(
  '../../../../../../../components/app/alert-system/contexts/alertMetricsContext',
  () => ({
    useAlertMetrics: jest.fn(() => ({
      trackAlertMetrics: jest.fn(),
    })),
  }),
);

const mockUseEstimationFailed = jest.mocked(useEstimationFailed);
const mockUseIsGaslessSupported = jest.mocked(useIsGaslessSupported);

function render({
  chainId = CHAIN_IDS.GOERLI,
  gasFeeTokens,
  selectedGasFeeToken,
  fiatFee = '$1',
  nativeFee = '0.001 ETH',
  estimationFailed = false,
  isGaslessSupported = false,
}: {
  chainId?: Hex;
  gasFeeTokens?: GasFeeToken[];
  selectedGasFeeToken?: Hex;
  fiatFee?: string;
  nativeFee?: string;
  estimationFailed?: boolean;
  isGaslessSupported?: boolean;
} = {}) {
  mockUseEstimationFailed.mockReturnValue(estimationFailed);
  mockUseIsGaslessSupported.mockReturnValue({
    isSupported: isGaslessSupported,
    isSmartTransaction: false,
    pending: false,
  });

  const state = getMockConfirmStateForTransaction(
    genUnapprovedContractInteractionConfirmation({
      chainId,
      gasFeeTokens,
      selectedGasFeeToken,
      isGasFeeSponsored: isGaslessSupported,
    }),
  );

  const mockStore = configureMockStore()(state);

  return renderWithConfirmContextProvider(
    <EditGasFeesRow
      fiatFee={fiatFee}
      nativeFee={nativeFee}
      fiatFeeWith18SignificantDigits="0.001234"
    />,
    mockStore,
  );
}

function renderWithConfirmation({
  confirmation,
  fiatFee = '$1',
  nativeFee = '0.001 ETH',
  estimationFailed = false,
  isGaslessSupported = false,
}: {
  confirmation: Parameters<typeof getMockConfirmStateForTransaction>[0];
  fiatFee?: string;
  nativeFee?: string;
  estimationFailed?: boolean;
  isGaslessSupported?: boolean;
}) {
  mockUseEstimationFailed.mockReturnValue(estimationFailed);
  mockUseIsGaslessSupported.mockReturnValue({
    isSupported: isGaslessSupported,
    isSmartTransaction: false,
    pending: false,
  });

  const state = getMockConfirmStateForTransaction(confirmation);
  const mockStore = configureMockStore()(state);

  return renderWithConfirmContextProvider(
    <EditGasFeesRow
      fiatFee={fiatFee}
      nativeFee={nativeFee}
      fiatFeeWith18SignificantDigits="0.001234"
    />,
    mockStore,
  );
}

describe('<EditGasFeesRow />', () => {
  it('renders component', () => {
    const { container } = render();
    expect(container).toMatchSnapshot();
  });

  it('renders metamask fee and falls back to transaction fiat fee when selected gas fee token fiat is empty', () => {
    const gasFeeTokenWithoutFiat = {
      ...GAS_FEE_TOKEN_MOCK,
      amountFiat: '',
    };

    const { getByTestId } = render({
      chainId: CHAIN_IDS.MAINNET,
      gasFeeTokens: [gasFeeTokenWithoutFiat],
      selectedGasFeeToken: gasFeeTokenWithoutFiat.tokenAddress,
    });

    expect(getByTestId('gas-fee-token-fee')).toBeInTheDocument();
    expect(getByTestId('native-currency')).toHaveTextContent('$1');
  });

  it('renders edit gas fee button', () => {
    const { getByTestId } = render({
      gasFeeTokens: undefined,
      selectedGasFeeToken: undefined,
    });

    expect(getByTestId('edit-gas-fee-icon')).toBeInTheDocument();
  });

  describe('estimationFailed', () => {
    it('renders "Unavailable" when estimation failed', () => {
      const { getByText, queryByTestId } = render({
        estimationFailed: true,
      });

      expect(getByText(messages.unavailable.message)).toBeInTheDocument();
      expect(queryByTestId('native-currency')).toBeNull();
      expect(queryByTestId('first-gas-field')).toBeNull();
    });

    it('does not render "Unavailable" when estimation has not failed', () => {
      const { queryByText } = render({
        estimationFailed: false,
      });

      expect(queryByText(messages.unavailable.message)).toBeNull();
    });

    it('does not render "Unavailable" when gas fee is sponsored even if estimation failed', () => {
      const { queryByText, getByTestId } = render({
        estimationFailed: true,
        isGaslessSupported: true,
      });

      expect(queryByText(messages.unavailable.message)).toBeNull();
      expect(getByTestId('paid-by-meta-mask')).toBeInTheDocument();
    });

    it('does not render sponsored gas label for upgrade-only 7702 transactions', () => {
      const { queryByTestId, getByTestId } = renderWithConfirmation({
        confirmation: {
          ...upgradeAccountConfirmationOnly,
          isGasFeeSponsored: true,
        },
        isGaslessSupported: true,
      });

      expect(queryByTestId('paid-by-meta-mask')).toBeNull();
      expect(getByTestId('native-currency')).toHaveTextContent('0.001 ETH');
    });

    it('does not render sponsored gas label for 1Do app access updates', () => {
      const { queryByTestId, getByTestId } = renderWithConfirmation({
        confirmation: genUnapprovedContractInteractionConfirmation({
          isGasFeeSponsored: true,
          txParams: {
            from: '0x0000000000000000000000000000000000000000',
            to: '0x0000000000000000000000000000000000000000',
            data: '0x787f863d0000000000000000000000003c7618fdab069e8888e5587ca2766497b866afd5',
          },
        }),
        isGaslessSupported: true,
      });

      expect(queryByTestId('paid-by-meta-mask')).toBeNull();
      expect(getByTestId('native-currency')).toHaveTextContent('0.001 ETH');
    });
  });
});
