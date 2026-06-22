import React from 'react';
import testData from '../../../../.storybook/test-data';
import CoinButtons from './coin-buttons';

const { accounts, selectedAccount } = testData.metamask.internalAccounts;

export default {
  title: 'Components/App/WalletOverview/CoinButtons',
  args: {
    account: accounts[selectedAccount],
    chainId: '1',
    trackingLocation: 'home',
    isSigningEnabled: true,
    isBuyableChain: true,
    classPrefix: 'coin',
  },
  component: CoinButtons,
  parameters: {
    docs: {
      description: {
        component: 'A component that displays coin buttons',
      },
    },
  },
};

const Template = (args) => <CoinButtons {...args} />;

export const Default = Template.bind({});
