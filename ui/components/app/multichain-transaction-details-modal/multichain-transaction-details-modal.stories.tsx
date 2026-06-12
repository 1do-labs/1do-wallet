import { MultichainTransactionDetailsModal } from './multichain-transaction-details-modal';

export default {
  title: 'Components/App/MultichainTransactionDetailsModal',
  component: MultichainTransactionDetailsModal,
};

const mockTransaction = {
  type: 'send',
  status: 'confirmed',
  timestamp: new Date('Sep 30 2023 12:56').getTime(),
  id: 'b93ea2cb4eed0f9e13284ed8860bcfc45de2488bb6a8b0b2a843c4b2fbce40f3',
  chain: 'eip155:1',
  account: 'test-account-id',
  from: [
    {
      address: '0x1234567890123456789012345678901234567890',
      asset: {
        amount: '1.2',
        unit: 'ETH',
        fungible: true,
      },
    },
  ],
  to: [
    {
      address: '0x2345678901234567890123456789012345678901',
      asset: {
        amount: '1.2',
        unit: 'ETH',
        fungible: true,
      },
    },
  ],
  fees: [
    {
      type: 'priority',
      asset: {
        amount: '1.0001',
        unit: 'ETH',
        fungible: true,
      },
    },
  ],
};

export const Default = {
  args: {
    transaction: mockTransaction,
    onClose: () => console.log('Modal closed'),
    userAddress: '0x1234567890123456789012345678901234567890',
    networkConfig: {
      nickname: 'Ethereum',
      isEvmNetwork: true,
      chainId: 'eip155:1',
      decimals: 18,
      ticker: 'ETH',
      id: 'mainnet',
    },
  },
};
