import React from 'react';
import configureMockStore from 'redux-mock-store';
import copyToClipboard from 'copy-to-clipboard';
import thunk from 'redux-thunk';
import { TransactionStatus } from '@metamask/transaction-controller';
import { act, fireEvent, waitFor } from '@testing-library/react';
import { GAS_LIMITS } from '../../../../shared/constants/gas';
import { COPY_OPTIONS } from '../../../../shared/constants/copy';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';
import mockState from '../../../../test/data/mock-state.json';
import mockSwapTxGroup from '../../../../test/data/swap/mock-legacy-swap-transaction-group.json';
import { enLocale as messages } from '../../../../test/lib/i18n-helpers';
import TransactionListItemDetails from '.';

jest.mock('../../../store/actions.ts', () => ({
  tryReverseResolveAddress: () => jest.fn(),
  gasFeeStartPollingByNetworkClientId: jest
    .fn()
    .mockResolvedValue('pollingToken'),
  gasFeeStopPollingByPollingToken: jest.fn(),
  getNetworkConfigurationByNetworkClientId: jest
    .fn()
    .mockResolvedValue({ chainId: '0x5' }),
}));

jest.mock('copy-to-clipboard');

const render = async (overrideProps) => {
  const rpcPrefs = {
    blockExplorerUrl: 'https://customblockexplorer.com/',
  };

  const blockExplorerLinkText = {
    firstPart: 'addBlockExplorer',
    secondPart: '',
  };

  const props = {
    onClose: jest.fn(),
    title: 'Test Transaction Details',
    recipientAddress: '0x0000000000000000000000000000000000000000',
    senderAddress: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
    tryReverseResolveAddress: jest.fn(),
    transactionStatus: () => <div />,
    blockExplorerLinkText,
    rpcPrefs,
    ...overrideProps,
  };

  const mockStore = configureMockStore([thunk])({
    ...mockState,
    DNS: {
      stage: 'INITIALIZED',
      resolutions: null,
      error: null,
      warning: null,
      chainId: '0x5',
      domainName: null,
    },
  });

  let result;

  await act(
    async () =>
      (result = renderWithProvider(
        <TransactionListItemDetails {...props} />,
        mockStore,
      )),
  );

  return result;
};

describe('TransactionListItemDetails Component', () => {
  const transactionHash =
    '0x06bb79b856f5eb67025e4c4ffff44bca26ae135d1c3e6bd9a4193f422dcecca2';
  const rawTx =
    '0xf86c0c8502540be40082520894ffe5bc4e8f1f969934d773fa67da095d2e491a97880de0b6b3a7640000802ca0e0b79a8e33b15460ea79b05a5fb16bc067a796592eeb4edc5007c88615c12595a01c834a25f1df07af5122996a40e99e554a40dc971a25041bc6e31638846c4f58';
  const transaction = {
    history: [],
    id: 1,
    status: TransactionStatus.confirmed,
    hash: transactionHash,
    txParams: {
      from: '0x1',
      gas: GAS_LIMITS.SIMPLE,
      gasPrice: '0x3b9aca00',
      nonce: '0xa4',
      to: '0x2',
      value: '0x2386f26fc10000',
    },
    metadata: {
      note: 'some note',
    },
  };

  const transactionGroup = {
    transactions: [transaction],
    primaryTransaction: transaction,
    initialTransaction: transaction,
    nonce: '0xa4',
    hasRetried: false,
    hasCancelled: false,
  };

  it('should render title with title prop', async () => {
    const { queryByText } = await render({
      transactionGroup,
    });

    await waitFor(() => {
      expect(queryByText('Test Transaction Details')).toBeInTheDocument();
    });
  });

  /**
   * Disabling the retry button until further notice
   *
   * @see {@link https://github.com/MetaMask/metamask-extension/issues/28615}
   */
  // eslint-disable-next-line jest/no-disabled-tests
  describe.skip('Retry button', () => {
    it('should render retry button with showRetry prop', async () => {
      const { queryByTestId } = await render({
        showRetry: true,
        transactionGroup,
      });

      expect(queryByTestId('rety-button')).toBeInTheDocument();
    });
  });

  describe('Cancel button', () => {
    it('should render cancel button with showCancel prop', async () => {
      const { queryByTestId } = await render({
        showCancel: true,
        transactionGroup,
      });

      expect(queryByTestId('cancel-button')).toBeInTheDocument();
    });
  });

  describe('Speedup button', () => {
    it('should render speedup button with showSpeedUp prop', async () => {
      const { queryByTestId } = await render({
        showSpeedUp: true,
        transactionGroup,
      });

      expect(queryByTestId('speedup-button')).toBeInTheDocument();
    });
  });

  describe('Copy transaction ID button', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('copies the transaction hash', async () => {
      const { getByText } = await render({
        transactionGroup,
      });

      fireEvent.click(getByText(messages.copyTransactionId.message));

      expect(copyToClipboard).toHaveBeenCalledWith(
        transactionHash,
        COPY_OPTIONS,
      );
    });

    it('derives and copies the transaction hash from rawTx when hash is missing', async () => {
      const pendingTransaction = {
        ...transaction,
        status: TransactionStatus.submitted,
        hash: undefined,
        rawTx,
      };
      const pendingTransactionGroup = {
        ...transactionGroup,
        transactions: [pendingTransaction],
        primaryTransaction: pendingTransaction,
        initialTransaction: pendingTransaction,
      };

      const { getByText } = await render({
        transactionGroup: pendingTransactionGroup,
      });

      fireEvent.click(getByText(messages.copyTransactionId.message));

      expect(copyToClipboard).toHaveBeenCalledWith(
        transactionHash,
        COPY_OPTIONS,
      );
    });
  });
});

describe('TransactionListItemDetails for swaps', () => {
  it('should render confirmed swap tx details', async () => {
    const { queryByText, queryByTestId, queryAllByTestId } = await render({
      transactionGroup: mockSwapTxGroup,
    });

    expect(
      queryByText(messages.viewOnBlockExplorer.message),
    ).toBeInTheDocument();
    // Sender shows account name ("Test Account") since it matches an internal account
    expect(queryByTestId('sender-to-recipient')).toHaveTextContent(
      'Test Account0x00000...00000',
    );
    const expectedRows = [
      'Nonce1',
      'Amount',
      'Gas limit (units)489075',
      'Gas used (units)357212',
      'Base fee (GWEI)0.00000002',
      'Priority fee (GWEI)30',
      'Total gas fee0.010716POL',
      'Max fee per gas0.00000003POL',
      'Total0.01071636POL',
    ];

    queryAllByTestId('transaction-breakdown-row').forEach((row, i) => {
      expect(row).toHaveTextContent(expectedRows[i]);
    });
  });
});
