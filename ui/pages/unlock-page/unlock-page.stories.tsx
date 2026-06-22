import React from 'react';
import UnlockPage from './unlock-page.component';

export default {
  title: 'Pages/UnlockPage',

  component: UnlockPage,
  argTypes: {
    isUnlocked: { control: 'boolean' },
    onRestore: { action: 'onRestore' },
    onSubmit: { action: 'onSubmit' },
    forceUpdateMetamaskState: { action: 'forceUpdateMetamaskState' },
    firstTimeFlowType: {
      control: 'select',
      options: ['create', 'import', 'restore'],
    },
    resetWallet: { action: 'resetWallet' },
    onboardingParentContext: { control: 'object' },
    isPopup: { control: 'boolean' },
    isWalletResetInProgress: { control: 'boolean' },
  },
};

export const DefaultStory = (args) => {
  const navigate = (path) => console.log('Navigate to:', path);
  const location = { pathname: '/unlock', search: '', state: null };
  return <UnlockPage {...args} navigate={navigate} location={location} />;
};

DefaultStory.storyName = 'Default';

DefaultStory.args = {
  forceUpdateMetamaskState: () => ({
    participateInMetaMetrics: true,
  }),
};

DefaultStory.storyName = 'Default';
