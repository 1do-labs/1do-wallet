import React from 'react';
import { fireEvent } from '@testing-library/react';
import configureStore from '../../../store/store';
import mockState from '../../../../test/data/mock-state.json';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';
import { RuntimeTools } from './runtime-tools';

let mockRuntimeActive = false;

jest.mock('../app-header/smart-account-header-button', () => {
  const ReactModule = jest.requireActual('react');
  return {
    SmartAccountHeaderButton: ({
      onStatusChange,
    }: {
      onStatusChange: (status: {
        isActive: boolean;
        isChecking: boolean;
      }) => void;
    }) => {
      ReactModule.useEffect(() => {
        onStatusChange({
          isActive: mockRuntimeActive,
          isChecking: false,
        });
      }, [onStatusChange]);
      return mockRuntimeActive ? null : (
        <button type="button" data-testid="smart-account-header-button">
          Set up
        </button>
      );
    },
  };
});

describe('RuntimeTools', () => {
  beforeEach(() => {
    mockRuntimeActive = false;
  });

  it('shows only the Runtime setup entry before activation', () => {
    // @ts-expect-error mocking platform
    global.platform = { openTab: jest.fn() };
    const store = configureStore({ metamask: mockState.metamask });
    const { getByTestId, queryByTestId } = renderWithProvider(
      <RuntimeTools />,
      store,
    );

    expect(getByTestId('smart-account-header-button')).toBeInTheDocument();
    expect(getByTestId('runtime-tools')).toHaveTextContent('Set up');
    expect(queryByTestId('runtime-tools-toggle')).not.toBeInTheDocument();
    expect(queryByTestId('runtime-tool-redpacket')).not.toBeInTheDocument();
  });

  it('shows four apps after activation and expands to all apps', () => {
    mockRuntimeActive = true;
    // @ts-expect-error mocking platform
    global.platform = { openTab: jest.fn() };
    const store = configureStore({ metamask: mockState.metamask });
    const { getByTestId, queryByTestId } = renderWithProvider(
      <RuntimeTools />,
      store,
    );

    expect(
      queryByTestId('smart-account-header-button'),
    ).not.toBeInTheDocument();
    expect(getByTestId('runtime-tool-redpacket')).toBeInTheDocument();
    expect(getByTestId('runtime-tool-gift')).toBeInTheDocument();
    expect(getByTestId('runtime-tool-pay')).toBeInTheDocument();
    expect(getByTestId('runtime-tool-dex')).toBeInTheDocument();
    expect(queryByTestId('runtime-tool-nftmarket')).not.toBeInTheDocument();

    fireEvent.click(getByTestId('runtime-tools-toggle'));

    expect(getByTestId('runtime-tool-nftmarket')).toBeInTheDocument();
    expect(getByTestId('runtime-tool-sessionpay')).toBeInTheDocument();

    fireEvent.click(getByTestId('runtime-tool-dex'));
    expect(global.platform.openTab).toHaveBeenCalledWith({
      url: 'https://app.1do.io/dex',
    });
  });
});
