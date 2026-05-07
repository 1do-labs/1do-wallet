import React from 'react';
import { fireEvent } from '@testing-library/react';
import configureStore from '../../../store/store';
import mockState from '../../../../test/data/mock-state.json';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';
import { RuntimeTab } from './runtime-tab';

describe('RuntimeTab', () => {
  it('opens 1do runtime app links in a new tab', () => {
    // @ts-expect-error mocking platform
    global.platform = { openTab: jest.fn() };

    const store = configureStore({
      metamask: mockState.metamask,
    });

    const { getByTestId } = renderWithProvider(<RuntimeTab />, store);

    fireEvent.click(getByTestId('runtime-app-card-pay'));

    expect(global.platform.openTab).toHaveBeenCalledWith({
      url: 'https://app.1do.io/pay',
    });
  });
});
