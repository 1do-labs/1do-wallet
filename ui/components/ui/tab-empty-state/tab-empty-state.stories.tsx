import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TabEmptyState } from './tab-empty-state';
import { Icon, IconName, IconSize } from '../../component-library';

const meta: Meta<typeof TabEmptyState> = {
  title: 'Components/UI/TabEmptyState',
  component: TabEmptyState,
  argTypes: {
    icon: { control: 'object' },
    description: { control: 'text' },
    actionButtonText: { control: 'text' },
    className: { control: 'text' },
  },
  args: {
    icon: <Icon name={IconName.Wallet} size={IconSize.Xl} />,
    description: 'No items to display yet.',
    actionButtonText: 'Add item',
  },
};

export default meta;
type Story = StoryObj<typeof TabEmptyState>;

export const Default: Story = {};
