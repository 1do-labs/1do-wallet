// ESLint complains that we are mixing imports and runtime code, which we are,
// but we need to initialize React Devtools before importing React (which
// happens in the UI code).
/* eslint-disable import-x/first */

// This import sets up safe intrinsics required for LavaDome to function securely.
// It must be run before any less trusted code so that no such code can undermine it.
import '@lavamoat/lavadome-react';

// Initialize state hooks before UI startup.
import './lib/setup-initial-state-hooks';
import '../../development/wdyr';

// Import these before network constants are evaluated.
import '../../shared/constants/alchemy-api-key';

import * as reactDevtoolsCore from 'react-devtools-core';

if (reactDevtoolsCore && process.env.METAMASK_REACT_REDUX_DEVTOOLS) {
  const { initialize, connectToDevTools } = reactDevtoolsCore;
  initialize();
  connectToDevTools();
}

import browser from 'webextension-polyfill';

import { StreamProvider } from '@metamask/providers';
import { createIdRemapMiddleware } from '@metamask/json-rpc-engine';
import log from 'loglevel';
import { ExtensionPortStream } from 'extension-port-stream';
import {
  launchMetamaskUi,
  CriticalStartupErrorHandler,
  connectToBackground,
  connectToBackgroundViaPatchStoreSubstream,
  displayCriticalErrorMessage,
  CriticalErrorTranslationKey,
  // TODO: Remove restricted import
  // eslint-disable-next-line import-x/no-restricted-paths
} from '../../ui';
import {
  ENVIRONMENT_TYPE_FULLSCREEN,
  ENVIRONMENT_TYPE_POPUP,
  ENVIRONMENT_TYPE_SIDEPANEL,
} from '../../shared/constants/app';
import { checkForLastErrorAndLog } from '../../shared/lib/browser-runtime.utils';
import { endTrace, trace, TraceName } from '../../shared/lib/trace';
import ExtensionPlatform from './platforms/extension';
import { setupMultiplex } from './lib/stream-utils';
import { getEnvironmentType } from './lib/util';
import metaRPCClientFactory from './lib/metaRPCClientFactory';

/**
 * @type {HTMLElement}
 */
const container = document.getElementById('app-content');

/**
 * @typedef {import("@metamask/object-multiplex/dist/Substream").Substream} Substream
 */

start().catch(log.error);

async function start() {
  const startTime = performance.now();

  const traceContext = trace({
    name: TraceName.UIStartup,
    startTime: performance.timeOrigin,
  });

  trace({
    name: TraceName.LoadScripts,
    startTime: performance.timeOrigin,
    parentContext: traceContext,
  });

  endTrace({
    name: TraceName.LoadScripts,
    timestamp: performance.timeOrigin + startTime,
  });

  // create platform global
  global.platform = new ExtensionPlatform();

  // identify window type (popup, notification)
  const windowType = getEnvironmentType();

  // setup stream to background
  const extensionPort = browser.runtime.connect({ name: windowType });

  // Set up error handlers as early as possible to ensure we are ready to
  // handle any errors that occur at any time
  const criticalErrorHandler = new CriticalStartupErrorHandler(
    extensionPort,
    container,
  );
  criticalErrorHandler.install();

  const connectionStream = new ExtensionPortStream(extensionPort);
  const subStreams = connectSubstreams(connectionStream);
  const backgroundConnection = metaRPCClientFactory(subStreams.controller);
  connectToBackground(backgroundConnection, handleStartUISync);
  connectToBackgroundViaPatchStoreSubstream(subStreams.patch);

  async function handleStartUISync(initialState) {
    endTrace({ name: TraceName.BackgroundConnect });
    criticalErrorHandler.startUiSyncReceived();

    // this means we've received a message from the background, and so
    // background startup has succeed, so we don't need to listen for error
    // messages anymore
    criticalErrorHandler.uninstall();

    // Only after startUiSync has started can we set up the provider connection
    // The provider connection *must* be set up before the UI is initialized, as
    // it sets a global variable, `ethereumProvider`, that the UI relies on.
    await setupProviderConnection(subStreams.provider);

    const activeTab = await queryCurrentActiveTab(windowType);

    await initializeUiWithTab(
      activeTab,
      subStreams.patch,
      windowType,
      traceContext,
      initialState,
    );
  }

  trace({
    name: TraceName.BackgroundConnect,
    parentContext: traceContext,
  });
}

async function initializeUiWithTab(
  activeTab,
  patchSubstream,
  windowType,
  traceContext,
  initialState,
) {
  try {
    const store = await launchMetamaskUi({
      activeTab,
      container,
      patchSubstream,
      traceContext,
      initialState,
    });

    endTrace({ name: TraceName.UIStartup });

    if (process.env.IN_TEST) {
      window.document?.documentElement?.classList.add('controller-loaded');
    }

    const state = store.getState();
    const { metamask: { completedOnboarding } = {} } = state;

    if (!completedOnboarding && windowType !== ENVIRONMENT_TYPE_FULLSCREEN) {
      global.platform.openExtensionInBrowser();
    }
  } catch (error) {
    await displayCriticalErrorMessage(
      container,
      CriticalErrorTranslationKey.TroubleStarting,
      error,
    );
  }
}

async function queryCurrentActiveTab(windowType) {
  // Shims the activeTab for E2E test runs only if the
  // "activeTabOrigin" querystring key=value is set
  if (process.env.IN_TEST) {
    const searchParams = new URLSearchParams(window.location.search);
    const mockUrl = searchParams.get('activeTabOrigin');
    if (mockUrl) {
      const { origin, protocol } = new URL(mockUrl);
      const returnUrl = {
        id: 'mock-site',
        title: 'Mock Site',
        url: mockUrl,
        origin,
        protocol,
      };
      return returnUrl;
    }
  }

  // Only popup queries the active tab
  // Sidepanel uses appActiveTab from tab listeners instead
  if (
    windowType !== ENVIRONMENT_TYPE_POPUP &&
    windowType !== ENVIRONMENT_TYPE_SIDEPANEL
  ) {
    return {};
  }

  const tabs = await browser.tabs
    .query({ active: true, currentWindow: true })
    .catch((e) => {
      checkForLastErrorAndLog() || log.error(e);
    });

  const [activeTab] = tabs;
  const { id, title, url } = activeTab;
  const { origin, protocol } = url ? new URL(url) : {};

  if (!origin || origin === 'null') {
    return {};
  }

  return { id, title, origin, protocol, url };
}

/**
 * Establishes a connections between the PortStream (background) and various UI
 * streams.
 *
 * @param {ExtensionPortStream} connectionStream - PortStream instance establishing a background connection
 * @returns The multiplexed streams
 */
function connectSubstreams(connectionStream) {
  const mx = setupMultiplex(connectionStream);

  const controllerSubstream = mx.createStream('controller');
  const providerSubstream = mx.createStream('provider');
  const patchSubstream = mx.createStream('patch-store');
  mx.ignoreStream('background-liveness');
  mx.ignoreStream('app-init-liveness');

  return {
    controller: controllerSubstream,
    provider: providerSubstream,
    patch: patchSubstream,
  };
}

/**
 * Establishes a streamed connection to a Web3 provider
 *
 * @param {Substream} connectionStream - PortStream instance establishing a background connection
 */
async function setupProviderConnection(connectionStream) {
  const providerStream = new StreamProvider(connectionStream, {
    rpcMiddleware: [createIdRemapMiddleware()],
  });
  connectionStream.on('error', console.error.bind(console));
  providerStream.on('error', console.error.bind(console));

  await providerStream.initialize();
  global.ethereumProvider = providerStream;
}
