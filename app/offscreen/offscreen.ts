import { isObject } from '@metamask/utils';
import {
  OFFSCREEN_LEDGER_INIT_TIMEOUT,
  OffscreenCommunicationEvents,
  OffscreenCommunicationTarget,
} from '../../shared/constants/offscreen-communication';
import initLedger from './hardware-wallets/ledger';
import initTrezor from './hardware-wallets/trezor';
import initLattice from './hardware-wallets/lattice';
import initConnectivityDetection from './connectivity';

/**
 * Initialize the ledger, trezor, and lattice keyring connections, and the
 * connectivity handlers used by the offscreen document.
 */
async function init(): Promise<void> {
  initTrezor();
  initLattice();

  try {
    const ledgerInitTimeout = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Ledger initialization timed out'));
      }, OFFSCREEN_LEDGER_INIT_TIMEOUT);
    });
    await Promise.race([initLedger(), ledgerInitTimeout]);
  } catch (error) {
    console.error('Ledger initialization failed:', error);
  }
}

init().then(() => {
  if (process.env.IN_TEST) {
    chrome.runtime.onMessage.addListener((message) => {
      if (
        message &&
        isObject(message) &&
        message.event ===
          OffscreenCommunicationEvents.metamaskBackgroundReady &&
        message.target === OffscreenCommunicationTarget.extension
      ) {
        window.document?.documentElement?.classList?.add('controller-loaded');
      }
    });
  }

  chrome.runtime.sendMessage({
    target: OffscreenCommunicationTarget.extensionMain,
    isBooted: true,

    // This message is being sent from the Offscreen Document to the Service Worker.
    // The Service Worker has no way to query `navigator.webdriver`, so we send it here.
    webdriverPresent: navigator.webdriver === true,
  });

  initConnectivityDetection();
});
