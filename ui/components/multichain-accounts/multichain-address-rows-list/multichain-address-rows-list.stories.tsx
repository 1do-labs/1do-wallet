import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { InternalAccount } from '@metamask/keyring-internal-api';
import mockState from '../../../../test/data/mock-state.json';
import {
  MOCK_ACCOUNT_EOA,
} from '../../../../test/data/mock-accounts';
import { MultichainAddressRowsList } from './multichain-address-rows-list';

const mockStore = configureStore([]);

const accounts: Record<string, InternalAccount> = {
  ethereum: { ...MOCK_ACCOUNT_EOA, scopes: ['eip155:*'] },
  polygon: {
    ...MOCK_ACCOUNT_EOA,
    id: '2',
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
    scopes: ['eip155:137'],
  },
  arbitrum: {
    ...MOCK_ACCOUNT_EOA,
    id: '3',
    address: '0x1111111111111111111111111111111111111111',
    scopes: ['eip155:42161'],
  },
};

const createMockState = () => ({
  ...mockState,
  metamask: {
    ...mockState.metamask,
    remoteFeatureFlags: {
      ...mockState.metamask.remoteFeatureFlags,
      solanaAccounts: { enabled: false, minimumVersion: '13.6.0' },
    },
    // Override the EVM network configurations to have proper names
    networkConfigurationsByChainId: {
      '0x1': {
        ...mockState.metamask.networkConfigurationsByChainId['0x1'],
        name: 'Ethereum Mainnet',
      },
      '0x89': {
        chainId: '0x89',
        name: 'Polygon Mainnet',
        nativeCurrency: 'MATIC',
        rpcEndpoints: [
          {
            networkClientId: 'polygon',
            type: 'custom',
            url: 'https://polygon-rpc.com',
          },
        ],
        defaultRpcEndpointIndex: 0,
        blockExplorerUrls: ['https://polygonscan.com'],
        defaultBlockExplorerUrlIndex: 0,
      },
      '0xa4b1': {
        chainId: '0xa4b1',
        name: 'Arbitrum One',
        nativeCurrency: 'ETH',
        rpcEndpoints: [
          {
            networkClientId: 'arbitrum',
            type: 'custom',
            url: 'https://arb1.arbitrum.io/rpc',
          },
        ],
        defaultRpcEndpointIndex: 0,
        blockExplorerUrls: ['https://arbiscan.io'],
        defaultBlockExplorerUrlIndex: 0,
      },
      ...Object.fromEntries(
        Object.entries(
          mockState.metamask.networkConfigurationsByChainId,
        ).filter(([chainId]) => !['0x1'].includes(chainId)),
      ),
    },
    internalAccounts: {
      selectedAccount: accounts.ethereum.id,
      accounts: Object.fromEntries(
        Object.values(accounts).map((acc) => [acc.id, acc]),
      ),
    },
  },
});

const meta: Meta<typeof MultichainAddressRowsList> = {
  title: 'Components/MultichainAccounts/MultichainAddressRowsList',
  component: MultichainAddressRowsList,
  decorators: [
    (Story) => (
      <Provider store={mockStore(createMockState())}>
        <div style={{ width: '400px', padding: '16px' }}>
          <Story />
        </div>
      </Provider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MultichainAddressRowsList>;

export const MultipleDifferentAccounts: Story = {
  args: {
    accounts: [accounts.ethereum, accounts.polygon, accounts.arbitrum],
  },
};

export const SingleEthereumAccount: Story = {
  args: { accounts: [accounts.ethereum] },
};

export const SpecificNetworkAccount: Story = {
  args: { accounts: [accounts.polygon] },
};

export const ArbitrumOnly: Story = {
  args: { accounts: [accounts.arbitrum] },
};

export const EmptyState: Story = {
  args: { accounts: [] },
};
