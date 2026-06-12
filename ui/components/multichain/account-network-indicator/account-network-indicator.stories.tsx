import React from 'react';
import { AccountNetworkIndicator } from './account-network-indicator';

const defaultStory = {
  title: 'Components/Multichain/AccountNetworkIndicator',
  component: AccountNetworkIndicator,
  argTypes: {
    scopes: {
      control: { type: 'array' },
      description: 'Array of network scopes in CAIP format',
      table: {
        type: { summary: 'string[]' },
        defaultValue: { summary: '["eip155:0"]' },
      },
    },
  },
  args: {
    scopes: ['eip155:0', 'eip155:137', 'eip155:56'],
  },
};

export default defaultStory;

export const DefaultStory = (args: { scopes: string[] }) => (
  <AccountNetworkIndicator {...args} />
);
DefaultStory.storyName = 'Default';
