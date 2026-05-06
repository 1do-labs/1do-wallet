import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  MockAnyNamespace,
} from '@metamask/messenger';
import { NetworkEnablementController } from '@metamask/network-enablement-controller';
import { KnownCaipNamespace } from '@metamask/utils';
import { CHAIN_IDS } from '../../../../shared/constants/network';
import { MessengerClientInitRequest } from '../types';
import { buildControllerInitRequestMock } from '../test/utils';
import {
  getNetworkEnablementControllerInitMessenger,
  getNetworkEnablementControllerMessenger,
  NetworkEnablementControllerInitMessenger,
  NetworkEnablementControllerMessenger,
} from '../messengers/assets';
import { getRootMessenger } from '../../lib/messenger';
import { NetworkEnablementControllerInit } from './network-enablement-controller-init';

jest.mock('@metamask/network-enablement-controller');

function getInitRequestMock(
  baseMessenger = getRootMessenger<never, never>(),
): jest.Mocked<
  MessengerClientInitRequest<
    NetworkEnablementControllerMessenger,
    NetworkEnablementControllerInitMessenger
  >
> {
  const requestMock = {
    ...buildControllerInitRequestMock(),
    controllerMessenger: getNetworkEnablementControllerMessenger(baseMessenger),
    initMessenger: getNetworkEnablementControllerInitMessenger(baseMessenger),
  };

  // @ts-expect-error: Partial mock.
  requestMock.getMessengerClient.mockImplementation((controllerName) => {
    if (controllerName === 'MultichainNetworkController') {
      return {
        state: {
          multichainNetworkConfigurationsByChainId: {},
        },
      };
    }

    if (controllerName === 'NetworkController') {
      return {
        state: {
          networkConfigurationsByChainId: {
            [CHAIN_IDS.MAINNET]: {},
            [CHAIN_IDS.POLYGON]: {},
            [CHAIN_IDS.SEPOLIA]: {},
            [CHAIN_IDS.LOCALHOST]: {},
          },
        },
      };
    }

    throw new Error(`Unexpected messengerClient name: ${controllerName}`);
  });

  return requestMock;
}

describe('NetworkEnablementControllerInit', () => {
  it('initializes the controller', () => {
    const { messengerClient } =
      NetworkEnablementControllerInit(getInitRequestMock());
    expect(messengerClient).toBeInstanceOf(NetworkEnablementController);
  });
  it('initialises the controller with the correct networks for prod environment', () => {
    process.env.METAMASK_DEBUG = '';
    process.env.METAMASK_ENVIRONMENT = 'production';
    process.env.IN_TEST = '';

    NetworkEnablementControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(NetworkEnablementController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: {
        enabledNetworkMap: {
          [KnownCaipNamespace.Eip155]: {
            [CHAIN_IDS.MAINNET]: true,
            [CHAIN_IDS.POLYGON]: true,
            [CHAIN_IDS.SEPOLIA]: false,
            [CHAIN_IDS.LOCALHOST]: false,
          },
        },
        nativeAssetIdentifiers: {},
      },
    });
  });

  it('initialises the controller with the correct networks for IN_TEST environment', () => {
    process.env.IN_TEST = 'true';

    NetworkEnablementControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(NetworkEnablementController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: {
        enabledNetworkMap: {
          [KnownCaipNamespace.Eip155]: {
            [CHAIN_IDS.MAINNET]: false,
            [CHAIN_IDS.POLYGON]: false,
            [CHAIN_IDS.SEPOLIA]: false,
            [CHAIN_IDS.LOCALHOST]: true,
          },
        },
        nativeAssetIdentifiers: {},
      },
    });
  });

  it('initialises the controller with the correct networks for DEBUG environment', () => {
    process.env.METAMASK_DEBUG = 'true';
    process.env.METAMASK_ENVIRONMENT = 'production';
    process.env.IN_TEST = '';

    NetworkEnablementControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(NetworkEnablementController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: {
        enabledNetworkMap: {
          [KnownCaipNamespace.Eip155]: {
            [CHAIN_IDS.MAINNET]: false,
            [CHAIN_IDS.POLYGON]: false,
            [CHAIN_IDS.SEPOLIA]: true,
            [CHAIN_IDS.LOCALHOST]: false,
          },
        },
        nativeAssetIdentifiers: {},
      },
    });
  });

  it('initialises the controller with the correct networks for test environment', () => {
    process.env.METAMASK_DEBUG = '';
    process.env.METAMASK_ENVIRONMENT = 'test';
    process.env.IN_TEST = '';

    NetworkEnablementControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(NetworkEnablementController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: {
        enabledNetworkMap: {
          [KnownCaipNamespace.Eip155]: {
            [CHAIN_IDS.MAINNET]: false,
            [CHAIN_IDS.POLYGON]: false,
            [CHAIN_IDS.SEPOLIA]: true,
            [CHAIN_IDS.LOCALHOST]: false,
          },
        },
        nativeAssetIdentifiers: {},
      },
    });
  });
});
