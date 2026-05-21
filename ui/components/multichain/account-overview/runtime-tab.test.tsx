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

    const { getByTestId, queryByTestId } = renderWithProvider(
      <RuntimeTab />,
      store,
    );

    expect(getByTestId('runtime-app-card-dex')).toBeInTheDocument();
    expect(getByTestId('runtime-app-card-nftmarket')).toBeInTheDocument();
    expect(getByTestId('runtime-app-card-flashloan')).toBeInTheDocument();
    expect(getByTestId('runtime-app-card-will')).toBeInTheDocument();
    expect(getByTestId('runtime-app-card-sessionpay')).toBeInTheDocument();
    expect(queryByTestId('runtime-app-card-pay')).not.toBeInTheDocument();
    expect(queryByTestId('runtime-app-card-gift')).not.toBeInTheDocument();
    expect(queryByTestId('runtime-app-card-redpacket')).not.toBeInTheDocument();
    expect(queryByTestId('runtime-app-card-store')).not.toBeInTheDocument();

    fireEvent.click(getByTestId('runtime-app-card-dex'));

    expect(global.platform.openTab).toHaveBeenCalledWith({
      url: 'https://app.1do.io/dex',
    });
  });
});
