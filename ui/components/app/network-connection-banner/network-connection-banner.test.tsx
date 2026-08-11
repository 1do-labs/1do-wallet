import React from 'react';
import { fireEvent } from '@testing-library/react';
import { renderWithProvider } from '../../../../test/lib/render-helpers-navigate';

import { useNetworkConnectionBanner } from '../../../hooks/useNetworkConnectionBanner';
import { setEditedNetwork } from '../../../store/actions';
import configureStore from '../../../store/store';
import { enLocale as messages } from '../../../../test/lib/i18n-helpers';
import { NetworkConnectionBanner } from './network-connection-banner';

jest.mock('../../../store/actions', () => ({
  updateNetworkConnectionBanner: jest.fn(() => ({
    type: 'UPDATE_NETWORK_CONNECTION_BANNER',
  })),
  setEditedNetwork: jest.fn(() => ({
    type: 'SET_EDITED_NETWORK',
  })),
}));

jest.mock('../../../hooks/useNetworkConnectionBanner', () => ({
  useNetworkConnectionBanner: jest.fn(),
}));

const mockUseNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockUseNavigate,
}));

jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => 'light',
}));

const mockUseNetworkConnectionBanner = jest.mocked(useNetworkConnectionBanner);
const mockSetEditedNetwork = jest.mocked(setEditedNetwork);

describe('NetworkConnectionBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when the status of the banner is "degraded"', () => {
    it('renders the banner with a "Still connecting" message, including a "Update RPC" link if the network is not a default RPC endpoint', () => {
      mockUseNetworkConnectionBanner.mockReturnValue({
        status: 'degraded',
        networkName: 'Ethereum Mainnet',
        networkClientId: 'mainnet',
        chainId: '0x1',
        isDefaultRpcEndpoint: false,
        switchToDefaultRpc: jest.fn(),
      });
      const store = configureStore({});

      const { getByText } = renderWithProvider(
        <NetworkConnectionBanner />,
        store,
      );

      expect(
        getByText(
          messages.stillConnectingTo.message.replace('$1', 'Ethereum Mainnet'),
        ),
      ).toBeInTheDocument();
      expect(getByText(messages.updateRpc.message)).toBeInTheDocument();
    });

    it('renders the banner with a "Still connecting" message, excluding a "Update RPC" link if the network is a default RPC endpoint', () => {
      mockUseNetworkConnectionBanner.mockReturnValue({
        status: 'degraded',
        networkName: 'Ethereum Mainnet',
        networkClientId: 'mainnet',
        chainId: '0x1',
        isDefaultRpcEndpoint: true,
        switchToDefaultRpc: jest.fn(),
      });
      const store = configureStore({});

      const { getByText, queryByText } = renderWithProvider(
        <NetworkConnectionBanner />,
        store,
      );

      expect(
        getByText(
          messages.stillConnectingTo.message.replace('$1', 'Ethereum Mainnet'),
        ),
      ).toBeInTheDocument();
      expect(queryByText(messages.updateRpc.message)).not.toBeInTheDocument();
    });

    describe('when the "Update RPC" link is clicked', () => {
      it('navigates to the edit form for the degraded network', () => {
        mockUseNetworkConnectionBanner.mockReturnValue({
          status: 'degraded',
          networkName: 'Ethereum Mainnet',
          networkClientId: 'mainnet',
          chainId: '0x1',
          isDefaultRpcEndpoint: false,
          switchToDefaultRpc: jest.fn(),
        });
        const store = configureStore({});

        const { getByText } = renderWithProvider(
          <NetworkConnectionBanner />,
          store,
        );
        fireEvent.click(getByText(messages.updateRpc.message));

        expect(mockSetEditedNetwork).toHaveBeenCalledWith({
          chainId: '0x1',
          trackRpcUpdateFromBanner: true,
        });
        expect(mockUseNavigate).toHaveBeenCalledWith('/settings/networks');
      });
    });
  });

  describe('when the status of the banner is "unavailable"', () => {
    it('renders the banner with a "Unable to connect" message, including a "Update RPC" link if the network is not a default RPC endpoint', () => {
      mockUseNetworkConnectionBanner.mockReturnValue({
        status: 'unavailable',
        networkName: 'Ethereum Mainnet',
        networkClientId: 'mainnet',
        chainId: '0x1',
        isDefaultRpcEndpoint: false,
        switchToDefaultRpc: jest.fn(),
      });
      const store = configureStore({});

      const { getByText } = renderWithProvider(
        <NetworkConnectionBanner />,
        store,
      );

      expect(
        getByText(
          messages.unableToConnectTo.message.replace('$1', 'Ethereum Mainnet'),
        ),
      ).toBeInTheDocument();
      expect(
        getByText('Check network connectivity', { exact: false }),
      ).toBeInTheDocument();
      expect(
        getByText('update RPC', { selector: 'button' }),
      ).toBeInTheDocument();
    });

    it('renders the banner with a "Unable to connect" message, excluding a "Update RPC" link if the network is a default RPC endpoint', () => {
      mockUseNetworkConnectionBanner.mockReturnValue({
        status: 'unavailable',
        networkName: 'Ethereum Mainnet',
        networkClientId: 'mainnet',
        chainId: '0x1',
        isDefaultRpcEndpoint: true,
        switchToDefaultRpc: jest.fn(),
      });
      const store = configureStore({});

      const { getByText, queryByText } = renderWithProvider(
        <NetworkConnectionBanner />,
        store,
      );

      expect(
        getByText(
          messages.unableToConnectTo.message.replace('$1', 'Ethereum Mainnet'),
        ),
      ).toBeInTheDocument();
      expect(
        getByText('Check network connectivity', { exact: false }),
      ).toBeInTheDocument();
      expect(
        queryByText('update RPC', { selector: 'button' }),
      ).not.toBeInTheDocument();
    });

    describe('when the "Update RPC" link is clicked', () => {
      it('navigates to the edit form for the unavailable network', () => {
        mockUseNetworkConnectionBanner.mockReturnValue({
          status: 'unavailable',
          networkName: 'Ethereum Mainnet',
          networkClientId: 'mainnet',
          chainId: '0x1',
          isDefaultRpcEndpoint: false,
          switchToDefaultRpc: jest.fn(),
        });
        const store = configureStore({});

        const { getByText } = renderWithProvider(
          <NetworkConnectionBanner />,
          store,
        );
        fireEvent.click(getByText('update RPC'));

        expect(mockSetEditedNetwork).toHaveBeenCalledWith({
          chainId: '0x1',
          trackRpcUpdateFromBanner: true,
        });
        expect(mockUseNavigate).toHaveBeenCalledWith('/settings/networks');
      });
    });
  });

  describe('when the status of the banner is "unknown"', () => {
    it('does not render the banner', () => {
      mockUseNetworkConnectionBanner.mockReturnValue({
        status: 'unknown',
        switchToDefaultRpc: jest.fn(),
      });
      const store = configureStore({});

      const { container } = renderWithProvider(
        <NetworkConnectionBanner />,
        store,
      );

      expect(container.firstChild).not.toBeInTheDocument();
    });
  });

  describe('when the status of the banner is "available"', () => {
    it('does not render the banner', () => {
      mockUseNetworkConnectionBanner.mockReturnValue({
        status: 'available',
        switchToDefaultRpc: jest.fn(),
      });
      const store = configureStore({});

      const { container } = renderWithProvider(
        <NetworkConnectionBanner />,
        store,
      );

      expect(container.firstChild).not.toBeInTheDocument();
    });
  });

  describe('when a custom network has a default RPC endpoint available', () => {
    it('renders "Switch to 1do default RPC" button instead of "Update RPC" for degraded status', () => {
      const switchToDefaultRpcMock = jest.fn();
      mockUseNetworkConnectionBanner.mockReturnValue({
        status: 'degraded',
        networkName: 'Arbitrum One',
        networkClientId: 'custom-arbitrum',
        chainId: '0xa4b1',
        isDefaultRpcEndpoint: false,
        defaultRpcEndpointIndex: 1,
        switchToDefaultRpc: switchToDefaultRpcMock,
      });
      const store = configureStore({});

      const { getByText, queryByText } = renderWithProvider(
        <NetworkConnectionBanner />,
        store,
      );

      expect(
        getByText(messages.switchToMetaMaskDefaultRpc.message),
      ).toBeInTheDocument();
      expect(queryByText(messages.updateRpc.message)).not.toBeInTheDocument();
    });

    it('renders "switch to 1do default RPC" button instead of "update RPC" for unavailable status', () => {
      const switchToDefaultRpcMock = jest.fn();
      mockUseNetworkConnectionBanner.mockReturnValue({
        status: 'unavailable',
        networkName: 'Arbitrum One',
        networkClientId: 'custom-arbitrum',
        chainId: '0xa4b1',
        isDefaultRpcEndpoint: false,
        defaultRpcEndpointIndex: 1,
        switchToDefaultRpc: switchToDefaultRpcMock,
      });
      const store = configureStore({});

      const { getByText, queryByText } = renderWithProvider(
        <NetworkConnectionBanner />,
        store,
      );

      expect(
        getByText('switch to 1do default RPC', { selector: 'button' }),
      ).toBeInTheDocument();
      expect(
        queryByText('update RPC', { selector: 'button' }),
      ).not.toBeInTheDocument();
    });

    it('calls switchToDefaultRpc when "Switch to 1do default RPC" button is clicked (degraded)', () => {
      const switchToDefaultRpcMock = jest.fn();
      mockUseNetworkConnectionBanner.mockReturnValue({
        status: 'degraded',
        networkName: 'Arbitrum One',
        networkClientId: 'custom-arbitrum',
        chainId: '0xa4b1',
        isDefaultRpcEndpoint: false,
        defaultRpcEndpointIndex: 1,
        switchToDefaultRpc: switchToDefaultRpcMock,
      });
      const store = configureStore({});

      const { getByText } = renderWithProvider(
        <NetworkConnectionBanner />,
        store,
      );
      fireEvent.click(getByText(messages.switchToMetaMaskDefaultRpc.message));

      expect(switchToDefaultRpcMock).toHaveBeenCalled();
    });

    it('calls switchToDefaultRpc when "switch to 1do default RPC" button is clicked (unavailable)', () => {
      const switchToDefaultRpcMock = jest.fn();
      mockUseNetworkConnectionBanner.mockReturnValue({
        status: 'unavailable',
        networkName: 'Arbitrum One',
        networkClientId: 'custom-arbitrum',
        chainId: '0xa4b1',
        isDefaultRpcEndpoint: false,
        defaultRpcEndpointIndex: 1,
        switchToDefaultRpc: switchToDefaultRpcMock,
      });
      const store = configureStore({});

      const { getByText } = renderWithProvider(
        <NetworkConnectionBanner />,
        store,
      );
      fireEvent.click(
        getByText('switch to 1do default RPC', { selector: 'button' }),
      );

      expect(switchToDefaultRpcMock).toHaveBeenCalled();
    });
  });
});
