import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Provider } from 'react-redux';
import {
  HashRouter,
  RouterProvider,
  createHashRouter,
  useRouteError,
} from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { captureException } from '../../shared/lib/local-error-log';
import { I18nProvider, LegacyI18nProvider } from '../contexts/i18n';
import { AssetPollingProvider } from '../contexts/assetPolling';
import RiveWasmProvider from '../contexts/rive-wasm';
import { queryClient } from '../contexts/query-client';
import { HardwareWalletErrorProvider } from '../contexts/hardware-wallets';
import ErrorPageBase from './error-page/error-page.component';

import Routes, { routeConfig } from './routes';

function AppProviders() {
  return (
    <I18nProvider>
      <LegacyI18nProvider>
        <QueryClientProvider client={queryClient}>
          <AssetPollingProvider>
            <HardwareWalletErrorProvider>
              <RiveWasmProvider>
                <Routes />
              </RiveWasmProvider>
            </HardwareWalletErrorProvider>
          </AssetPollingProvider>
        </QueryClientProvider>
      </LegacyI18nProvider>
    </I18nProvider>
  );
}

function ErrorPage({ error }) {
  return (
    <I18nProvider>
      <LegacyI18nProvider>
        <ErrorPageBase error={error} />
      </LegacyI18nProvider>
    </I18nProvider>
  );
}

ErrorPage.propTypes = {
  error: PropTypes.object,
};

function RouteErrorBoundary() {
  const error = useRouteError();
  return <ErrorPage error={error} />;
}

const router = createHashRouter([
  {
    element: <AppProviders />,
    errorElement: <RouteErrorBoundary />,
    children: routeConfig,
  },
]);

class Index extends PureComponent {
  state = {};

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    captureException(error);
  }

  render() {
    const { error } = this.state;
    const { store } = this.props;

    if (error) {
      return (
        <Provider store={store}>
          <HashRouter>
            <ErrorPage error={error} />
          </HashRouter>
        </Provider>
      );
    }

    return (
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    );
  }
}

Index.propTypes = {
  store: PropTypes.object,
};

export default Index;
