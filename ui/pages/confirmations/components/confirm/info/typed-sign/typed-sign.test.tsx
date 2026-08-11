import React from 'react';
import { within } from '@testing-library/react';
import configureMockStore from 'redux-mock-store';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';

import {
  getMockConfirmStateForTransaction,
  getMockTypedSignConfirmState,
  getMockTypedSignConfirmStateForRequest,
} from '../../../../../../../test/data/confirmations/helper';
import {
  permitSignatureMsg,
  permitSignatureMsgWithNoDeadline,
  unapprovedTypedSignMsgV3,
  unapprovedTypedSignMsgV4,
} from '../../../../../../../test/data/confirmations/typed_sign';
import { renderWithConfirmContextProvider } from '../../../../../../../test/lib/confirmations/render-helpers';
import { enLocale as messages } from '../../../../../../../test/lib/i18n-helpers';
import { RowAlertKey } from '../../../../../../components/app/confirm/info/row/constants';
import { Severity } from '../../../../../../helpers/constants/design-system';
import TypedSignInfo from './typed-sign';

const DNS_STATE = {
  chainId: null,
  domainName: null,
  error: null,
  resolutions: null,
  stage: 'UNINITIALIZED',
  warning: null,
};

const createMockStore = (state: Record<string, unknown>) =>
  configureMockStore([])({
    ...state,
    DNS: DNS_STATE,
  });

jest.mock(
  '../../../../../../components/app/alert-system/contexts/alertMetricsContext',
  () => ({
    useAlertMetrics: jest.fn(() => ({
      trackAlertMetrics: jest.fn(),
    })),
  }),
);

jest.mock('../../../../../../store/actions', () => {
  return {
    getTokenStandardAndDetails: jest.fn().mockResolvedValue({ decimals: 2 }),
    updateEventFragment: jest.fn(),
  };
});

jest.mock('../../../../hooks/useGetTokenStandardAndDetails', () => ({
  useGetTokenStandardAndDetails: jest.fn(() => ({
    decimalsNumber: undefined,
    standard: undefined,
    symbol: undefined,
  })),
}));

describe('TypedSignInfo', () => {
  it('renders origin for typed sign data request', () => {
    const state = getMockTypedSignConfirmState();
    const mockStore = createMockStore(state);
    const { container } = renderWithConfirmContextProvider(
      <TypedSignInfo />,
      mockStore,
    );
    expect(container).toMatchSnapshot();
  });

  it('does not render if required data is not present in the transaction', () => {
    const state = getMockConfirmStateForTransaction({
      id: '0050d5b0-c023-11ee-a0cb-3390a510a0ab',
      status: TransactionStatus.unapproved,
      time: new Date().getTime(),
      type: TransactionType.contractInteraction,
      chainId: '0x5',
    });

    const mockStore = createMockStore(state);
    const { container } = renderWithConfirmContextProvider(
      <TypedSignInfo />,
      mockStore,
    );
    expect(container).toMatchSnapshot();
  });

  it('should render message for typed sign v3 request', () => {
    const state = getMockTypedSignConfirmStateForRequest(
      unapprovedTypedSignMsgV3,
    );
    const mockStore = createMockStore(state);
    const { container } = renderWithConfirmContextProvider(
      <TypedSignInfo />,
      mockStore,
    );
    expect(container).toMatchSnapshot();
  });

  it('should render message for typed sign v4 request', () => {
    const state = getMockTypedSignConfirmState();
    const mockStore = createMockStore(state);
    const { container } = renderWithConfirmContextProvider(
      <TypedSignInfo />,
      mockStore,
    );
    expect(container).toMatchSnapshot();
  });

  it('display simulation details for permit signature if flag useTransactionSimulations is set', () => {
    const state = getMockTypedSignConfirmStateForRequest(permitSignatureMsg, {
      metamask: {
        useTransactionSimulations: true,
      },
    });
    const mockStore = createMockStore(state);
    const { getByText } = renderWithConfirmContextProvider(
      <TypedSignInfo />,
      mockStore,
    );
    expect(getByText(messages.estimatedChanges.message)).toBeDefined();
  });

  it('correctly renders permit sign type', () => {
    const state = getMockTypedSignConfirmStateForRequest(permitSignatureMsg, {
      metamask: {
        useTransactionSimulations: true,
      },
    });
    const mockStore = createMockStore(state);
    const { container } = renderWithConfirmContextProvider(
      <TypedSignInfo />,
      mockStore,
    );
    expect(container).toMatchSnapshot();
  });

  it('correctly renders permit sign type with no deadline', () => {
    const state = getMockTypedSignConfirmStateForRequest(
      permitSignatureMsgWithNoDeadline,
      {
        metamask: {
          useTransactionSimulations: true,
        },
      },
    );
    const mockStore = createMockStore(state);
    const { container } = renderWithConfirmContextProvider(
      <TypedSignInfo />,
      mockStore,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders built-in ERC-7730 registry clear signing for Permit2 typed data', () => {
    const permit2Signature = {
      ...unapprovedTypedSignMsgV4,
      id: 'permit2-registry-clear-signing',
      chainId: '0xa',
      msgParams: {
        ...unapprovedTypedSignMsgV4.msgParams,
        origin: 'https://app.uniswap.org',
        data: JSON.stringify({
          domain: {
            chainId: 10,
            verifyingContract: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
          },
          types: {
            EIP712Domain: [
              { name: 'chainId', type: 'uint256' },
              { name: 'verifyingContract', type: 'address' },
            ],
            PermitDetails: [
              { name: 'token', type: 'address' },
              { name: 'amount', type: 'uint160' },
              { name: 'expiration', type: 'uint48' },
              { name: 'nonce', type: 'uint48' },
            ],
            PermitSingle: [
              { name: 'details', type: 'PermitDetails' },
              { name: 'spender', type: 'address' },
              { name: 'sigDeadline', type: 'uint256' },
            ],
          },
          primaryType: 'PermitSingle',
          message: {
            spender: '0x2222222222222222222222222222222222222222',
            details: {
              token: '0x1111111111111111111111111111111111111111',
              amount: '1000000',
              expiration: '4102444800',
              nonce: '7',
            },
            sigDeadline: '4102444800',
          },
        }),
      },
    };
    const state = getMockTypedSignConfirmStateForRequest(
      permit2Signature as unknown as Parameters<
        typeof getMockTypedSignConfirmStateForRequest
      >[0],
    );
    const mockStore = createMockStore(state);
    const { getByTestId } = renderWithConfirmContextProvider(
      <TypedSignInfo />,
      mockStore,
    );
    const clearSigningSection = within(
      getByTestId('onedo-clear-signing-section'),
    );

    expect(
      clearSigningSection.getByText('Authorize spending of token'),
    ).toBeInTheDocument();
    expect(clearSigningSection.getByText('Spender')).toBeInTheDocument();
    expect(
      clearSigningSection.getByText('Amount allowance'),
    ).toBeInTheDocument();
    expect(
      clearSigningSection.getByText('1000000 raw units'),
    ).toBeInTheDocument();
  });

  it('formats 1Do token clear signing amounts with known token metadata', () => {
    const dexSignature = {
      ...unapprovedTypedSignMsgV4,
      id: 'dex-clear-signing',
      chainId: '0xaa36a7',
      msgParams: {
        ...unapprovedTypedSignMsgV4.msgParams,
        from: '0x1111111111111111111111111111111111111111',
        origin: 'http://localhost:3001',
        data: JSON.stringify({
          domain: {
            name: 'Dex Order on 1Do',
            version: '1',
            chainId: 11155111,
            verifyingContract: '0x1111111111111111111111111111111111111111',
          },
          primaryType: 'TokenForTokenOrder',
          message: {
            tokenIn: '0x9d4b951592c31dc042efdc4e1f8ae00718b96fe1',
            tokenOut: '0xdd7468f993c52fcf43cef80c9a4e042de4920f2d',
            amountIn: '1000000',
            amountOut: '1000000',
            expiry: '0',
            nonce: '7',
          },
        }),
      },
    };
    const state = getMockTypedSignConfirmStateForRequest(dexSignature);
    const mockStore = createMockStore(state);
    const { getByTestId, queryByText } = renderWithConfirmContextProvider(
      <TypedSignInfo />,
      mockStore,
    );
    const clearSigningSection = within(
      getByTestId('onedo-clear-signing-section'),
    );

    expect(
      clearSigningSection.getByText('Create Dex token order on 1Do'),
    ).toBeInTheDocument();
    expect(clearSigningSection.getByText('1 tUSDC')).toBeInTheDocument();
    expect(clearSigningSection.getByText('1 tUSDT')).toBeInTheDocument();
    expect(queryByText('Advanced details')).not.toBeInTheDocument();
    expect(queryByText('1000000 raw units')).not.toBeInTheDocument();
  });

  it('formats 1Do native claimable transfer clear signing amounts', () => {
    const claimableNativeSignature = {
      ...unapprovedTypedSignMsgV4,
      id: 'claimable-native-clear-signing',
      chainId: '0xaa36a7',
      msgParams: {
        ...unapprovedTypedSignMsgV4.msgParams,
        from: '0x1111111111111111111111111111111111111111',
        origin: 'http://localhost:3001',
        data: JSON.stringify({
          domain: {
            name: 'ERC8112 Token Transfer',
            version: '1',
            chainId: 11155111,
            verifyingContract: '0x1111111111111111111111111111111111111111',
          },
          primaryType: 'TokenTransferWithSig',
          message: {
            wallet: '0x1111111111111111111111111111111111111111',
            asset: '0x0000000000000000000000000000000000000000',
            to: '0x0000000000000000000000000000000000000000',
            value: '200000000000000',
            nonce: '2',
            deadline: '4102444800',
          },
        }),
      },
    };
    const state = getMockTypedSignConfirmStateForRequest(
      claimableNativeSignature,
    );
    const mockStore = createMockStore(state);
    const { getByTestId, queryByText } = renderWithConfirmContextProvider(
      <TypedSignInfo />,
      mockStore,
    );
    const clearSigningSection = within(
      getByTestId('onedo-clear-signing-section'),
    );

    expect(
      clearSigningSection.getByText('Create claimable token transfer'),
    ).toBeInTheDocument();
    expect(clearSigningSection.getByText('0.0002 ETH')).toBeInTheDocument();
    expect(queryByText('200000000000000 raw units')).not.toBeInTheDocument();
  });

  it('displays "requestFromInfo" tooltip for typed sign requests', async () => {
    const mockState = getMockTypedSignConfirmStateForRequest({
      ...unapprovedTypedSignMsgV4,
      id: '123',
      type: TransactionType.signTypedData,
      chainId: '0x5',
    });
    const mockStore = createMockStore(mockState);
    const { queryByText } = renderWithConfirmContextProvider(
      <TypedSignInfo />,
      mockStore,
    );

    const requestFromLabel = queryByText(messages.requestFrom.message);

    await requestFromLabel?.dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true }),
    );
    expect(queryByText(messages.requestFromInfo.message)).toBeDefined();
  });

  it('display network info if there is an alert on that field', () => {
    const state = {
      ...getMockTypedSignConfirmStateForRequest(unapprovedTypedSignMsgV4),
      confirmAlerts: {
        alerts: {
          [unapprovedTypedSignMsgV4.id]: [
            {
              key: 'networkSwitchInfo',
              field: RowAlertKey.Network,
              severity: Severity.Info,
              message: 'dummy message',
              reason: 'dummy reason',
            },
          ],
        },
        confirmed: {},
      },
    };
    const mockStore = createMockStore(state);
    const { getByText } = renderWithConfirmContextProvider(
      <TypedSignInfo />,
      mockStore,
    );
    expect(getByText(messages.network.message)).toBeInTheDocument();
    expect(getByText(messages.networkNameGoerli.message)).toBeInTheDocument();
  });
});
