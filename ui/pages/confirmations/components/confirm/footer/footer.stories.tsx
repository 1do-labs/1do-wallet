import React from 'react';
import { Provider } from 'react-redux';

import { getMockPersonalSignConfirmState } from '../../../../../../test/data/confirmations/helper';
import configureStore from '../../../../../store/store';
import { HardwareWalletErrorProvider } from '../../../../../contexts/hardware-wallets';
import { ConfirmContextProvider } from '../../../context/confirm';

import Footer from './footer';

const store = configureStore(getMockPersonalSignConfirmState());

const Story = {
  title: 'Confirmations/Components/Confirm/Footer',
  component: Footer,
  decorators: [
    (story: any) => (
      <Provider store={store}>
        <HardwareWalletErrorProvider>
          <ConfirmContextProvider>
            {story()}
          </ConfirmContextProvider>
        </HardwareWalletErrorProvider>
      </Provider>
    ),
  ],
};

export default Story;

export const DefaultStory = () => <Footer />;

DefaultStory.storyName = 'Default';
