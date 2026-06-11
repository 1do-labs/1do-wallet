import React from 'react';
import { waitFor } from '@testing-library/react';
import configureMockStore from 'redux-mock-store';
import { Interface } from '@ethersproject/abi';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';

import {
  getMockConfirmStateForTransaction,
  getMockTokenTransferConfirmState,
} from '../../../../../../../test/data/confirmations/helper';
import { renderWithConfirmContextProvider } from '../../../../../../../test/lib/confirmations/render-helpers';
import { CHAIN_IDS } from '../../../../../../../shared/constants/network';
import NativeTransferInfo from './native-transfer';

const accountRuntimeInterface = new Interface([
  'function enableApp(address app)',
]);

const DNS_STATE = {
  chainId: null,
  domainName: null,
  error: null,
  resolutions: null,
  stage: 'UNINITIALIZED',
  warning: null,
};

jest.mock('../../../simulation-details/useBalanceChanges', () => ({
  useBalanceChanges: jest.fn(() => ({ pending: false, value: [] })),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({ pathname: '/' }),
  useSearchParams: jest.fn().mockReturnValue([{ get: () => null }]),
}));

jest.mock(
  '../../../../../../components/app/alert-system/contexts/alertMetricsContext',
  () => ({
    useAlertMetrics: jest.fn(() => ({
      trackAlertMetrics: jest.fn(),
    })),
  }),
);

jest.mock('../../../../../../store/actions', () => ({
  ...jest.requireActual('../../../../../../store/actions'),
  getGasFeeTimeEstimate: jest.fn().mockResolvedValue({
    lowerTimeBound: 0,
    upperTimeBound: 60000,
  }),
}));

describe('NativeTransferInfo', () => {
  it('renders correctly', () => {
    const state = {
      ...getMockTokenTransferConfirmState({}),
      DNS: DNS_STATE,
    };
    const mockStore = configureMockStore([])(state);
    const { container } = renderWithConfirmContextProvider(
      <NativeTransferInfo />,
      mockStore,
    );

    expect(container).toMatchSnapshot();
  });

  it('renders 1Do clear signing for simpleSend enableApp calldata', async () => {
    const walletAddress = '0x1111111111111111111111111111111111111111';
    const transaction = {
      chainId: CHAIN_IDS.SEPOLIA,
      id: 'enable-dex-simple-send',
      networkClientId: 'sepolia',
      origin: 'http://localhost:3000',
      status: TransactionStatus.unapproved,
      time: Date.now(),
      type: TransactionType.simpleSend,
      txParams: {
        from: walletAddress,
        to: walletAddress,
        data: accountRuntimeInterface.encodeFunctionData('enableApp', [
          '0x3C7618FdAb069e8888E5587cA2766497B866afD5',
        ]),
        value: '0x0',
      },
    };
    const state = {
      ...getMockConfirmStateForTransaction(transaction),
      DNS: DNS_STATE,
    };
    const mockStore = configureMockStore([])(state);
    const { getByTestId, getByText } = renderWithConfirmContextProvider(
      <NativeTransferInfo />,
      mockStore,
    );

    await waitFor(() => {
      expect(getByTestId('onedo-clear-signing-section')).toBeInTheDocument();
      expect(getByText('Enable Dex')).toBeInTheDocument();
      expect(getByText('Enable app')).toBeInTheDocument();
    });
  });
});
