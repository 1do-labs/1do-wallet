import React from 'react';
import { screen } from '@testing-library/react';
import configureStore from 'redux-mock-store';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';
import { enLocale as messages } from '../../../../test/lib/i18n-helpers';
import { DefaultAddress } from './default-address';

jest.mock('../../../store/actions', () => ({
  ...jest.requireActual('../../../store/actions'),
  setShowDefaultAddress: (value: boolean) => ({
    type: 'SET_SHOW_DEFAULT_ADDRESS',
    value,
  }),
}));

const mockStore = configureStore([]);

const createMockState = (overrides = {}) => ({
  metamask: {
    preferences: {
      showDefaultAddress: true,
      defaultAddressScope: 'eip155',
      ...overrides,
    },
  },
});

describe('DefaultAddress', () => {
  it('renders the show default address label', () => {
    const store = mockStore(createMockState());
    renderWithProvider(<DefaultAddress />, store);

    expect(
      screen.getByText(messages.showDefaultAddress.message),
    ).toBeInTheDocument();
  });

  it('renders the Change in Settings link', () => {
    const store = mockStore(createMockState());
    renderWithProvider(<DefaultAddress />, store);

    expect(screen.getByTestId('change-in-settings-link')).toBeInTheDocument();
    expect(
      screen.getByText(messages.changeInSettings.message),
    ).toBeInTheDocument();
  });

  it('renders the show default address toggle', () => {
    const store = mockStore(createMockState());
    renderWithProvider(<DefaultAddress />, store);

    expect(
      screen.getByTestId('show-default-address-toggle'),
    ).toBeInTheDocument();
  });
});
