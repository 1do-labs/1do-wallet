import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { type Transaction, TransactionStatus } from '@metamask/keyring-api';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';
import { MetaMetricsContext } from '../../../contexts/metametrics';
import mockState from '../../../../test/data/mock-state.json';
import configureStore from '../../../store/store';
import { enLocale as messages } from '../../../../test/lib/i18n-helpers';
import { CHAIN_IDS } from '../../../../shared/constants/network';
import { MultichainTransactionDetailsModal } from './multichain-transaction-details-modal';
import {
  getAddressUrl,
  getTransactionUrl,
  shortenTransactionId,
} from './helpers';

jest.mock('../../../hooks/useI18nContext', () => ({
  useI18nContext: jest.fn(),
}));

const mockTrackEvent = jest.fn();

const mockMetaMetricsContext = {
  trackEvent: mockTrackEvent,
  bufferedTrace: jest.fn(),
  bufferedEndTrace: jest.fn(),
  onboardingParentContext: { current: null },
};

const mockTransaction: Transaction = {
  type: 'send',
  status: TransactionStatus.Confirmed,
  timestamp: new Date('2023-09-30T12:56:00').getTime(),
  id: '0xb93ea2cb4eed0f9e13284ed8860bcfc45de2488bb6a8b0b2a843c4b2fbce40f3',
  chain: CHAIN_IDS.SEPOLIA,
  account: 'cf8dace4-9439-4bd4-b3a8-88c821c8fcb3',
  events: [],
  from: [
    {
      address: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
      asset: {
        fungible: true,
        type: 'native',
        amount: '1.2',
        unit: 'ETH',
      },
    },
  ],
  to: [
    {
      address: '0x1234567890abcdef1234567890abcdef12345678',
      asset: {
        fungible: true,
        type: 'native',
        amount: '1.1',
        unit: 'ETH',
      },
    },
  ],
  fees: [
    {
      type: 'base',
      asset: {
        fungible: true,
        type: 'native',
        amount: '0.00042',
        unit: 'ETH',
      },
    },
  ],
};

const mockProps = {
  transaction: mockTransaction,
  onClose: jest.fn(),
};

describe('MultichainTransactionDetailsModal', () => {
  const useI18nContextMock = useI18nContext as jest.Mock;

  beforeEach(() => {
    useI18nContextMock.mockReturnValue((key: string) => key);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (
    props: {
      transaction: Transaction;
      onClose: jest.Mock;
    } = mockProps,
  ) => {
    const store = configureStore(mockState);
    return renderWithProvider(
      <MetaMetricsContext.Provider value={mockMetaMetricsContext}>
        <MultichainTransactionDetailsModal {...props} />
      </MetaMetricsContext.Provider>,
      store,
    );
  };

  it('renders the modal with transaction details', () => {
    renderComponent();

    expect(screen.getByText(messages.send.message)).toBeInTheDocument();
    expect(screen.getByText(messages.confirmed.message)).toBeInTheDocument();
    expect(screen.getByTestId('transaction-amount')).toHaveTextContent(
      '1.1 ETH',
    );
  });

  it('displays the correct transaction status with appropriate color', () => {
    renderComponent();
    const statusElement = screen.getByText(messages.confirmed.message);
    expect(statusElement).toHaveClass('mm-box--color-success-default');
  });

  it('shows transaction ID in shortened format', () => {
    renderComponent();
    expect(
      screen.getByText(shortenTransactionId(mockTransaction.id)),
    ).toBeInTheDocument();
  });

  it('displays network fee when present', () => {
    renderComponent();

    const feeElement = screen.getByTestId('transaction-base-fee');

    expect(feeElement.textContent).toContain('0.00042');
    expect(feeElement.textContent).toContain('ETH');
  });

  it('calls onClose when close button is clicked', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /close/iu }));
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('renders the view details button and tracks click', () => {
    renderComponent();
    fireEvent.click(screen.getByText('viewDetails'));
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  // @ts-expect-error Jest typing for it.each status tuple inference is loose here.
  it.each([
    [TransactionStatus.Confirmed, 'Confirmed'],
    [TransactionStatus.Unconfirmed, 'Pending'],
    [TransactionStatus.Failed, 'Failed'],
    [TransactionStatus.Submitted, 'Submitted'],
  ])(
    'handles different transaction status: %s',
    (status: TransactionStatus, expectedLabel: string) => {
      renderComponent({
        ...mockProps,
        transaction: {
          ...mockTransaction,
          status,
        },
      });

      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    },
  );

  it('returns correct EVM transaction URL', () => {
    const txId =
      '0x447755f24ab40f469309f357cfdd9e375e9569b2cf68aaeba2ebcc232eac9568';

    expect(getTransactionUrl(txId, CHAIN_IDS.SEPOLIA)).toBe(
      `https://sepolia.etherscan.io/tx/${txId}`,
    );
  });

  it('returns correct EVM address URL', () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';

    expect(getAddressUrl(address, CHAIN_IDS.SEPOLIA)).toBe(
      `https://sepolia.etherscan.io/address/${address}`,
    );
  });

  it('renders the correct from address link for an EVM send transaction', () => {
    renderComponent();

    const fromLabel = screen.getByText('from');
    expect(fromLabel).toBeInTheDocument();

    const fromLink = screen.getAllByRole('link').find((link) =>
      link.getAttribute('href')?.includes('/address/0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc'),
    );
    expect(fromLink).toHaveAttribute(
      'href',
      getAddressUrl(
        '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
        CHAIN_IDS.SEPOLIA,
      ),
    );
  });
});
