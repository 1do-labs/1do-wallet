import { GasFeeController } from '@metamask/gas-fee-controller';
import { MessengerClientInitRequest } from '../types';
import { buildControllerInitRequestMock } from '../test/utils';
import {
  getGasFeeControllerMessenger,
  GasFeeControllerMessenger,
  getGasFeeControllerInitMessenger,
  GasFeeControllerInitMessenger,
} from '../messengers';
import { getRootMessenger } from '../../lib/messenger';
import { GasFeeControllerInit } from './gas-fee-controller-init';

jest.mock('@metamask/gas-fee-controller');

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<
    GasFeeControllerMessenger,
    GasFeeControllerInitMessenger
  >
> {
  const baseMessenger = getRootMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(),
    controllerMessenger: getGasFeeControllerMessenger(baseMessenger),
    initMessenger: getGasFeeControllerInitMessenger(baseMessenger),
  };
  requestMock.initMessenger.call = jest.fn().mockReturnValue({
    useExternalServices: true,
  });

  return requestMock;
}

describe('GasFeeControllerInit', () => {
  it('initializes the controller', () => {
    const { messengerClient } = GasFeeControllerInit(getInitRequestMock());
    expect(messengerClient).toBeInstanceOf(GasFeeController);
  });

  it('passes the proper arguments to the controller', () => {
    const requestMock = getInitRequestMock();

    GasFeeControllerInit(requestMock);

    expect(GasFeeController).toHaveBeenCalledWith(
      expect.objectContaining({
        messenger: expect.any(Object),
        state: {
          nonRPCGasFeeApisDisabled: false,
        },
        interval: 10_000,
        clientId: 'extension',
        legacyAPIEndpoint: expect.any(String),
        EIP1559APIEndpoint: expect.any(String),
        getProvider: expect.any(Function),
        onNetworkDidChange: expect.any(Function),
        getCurrentNetworkEIP1559Compatibility: expect.any(Function),
        getCurrentAccountEIP1559Compatibility: expect.any(Function),
        getCurrentNetworkLegacyGasAPICompatibility: expect.any(Function),
        getChainId: expect.any(Function),
      }),
    );
  });

  it('disables non-RPC gas fee APIs when external services are disabled', () => {
    const requestMock = getInitRequestMock();
    requestMock.initMessenger.call = jest.fn().mockReturnValue({
      useExternalServices: false,
    });
    requestMock.persistedState.GasFeeController = {
      nonRPCGasFeeApisDisabled: false,
    };

    GasFeeControllerInit(requestMock);

    expect(GasFeeController).toHaveBeenCalledWith(
      expect.objectContaining({
        state: {
          nonRPCGasFeeApisDisabled: true,
        },
      }),
    );
  });

  it('checks EIP-1559 compatibility for the polling network client', async () => {
    const requestMock = getInitRequestMock();
    const initMessengerCallMock = jest.fn().mockImplementation((method) => {
      if (method === 'PreferencesController:getState') {
        return { useExternalServices: true };
      }
      return true;
    });
    requestMock.initMessenger.call = initMessengerCallMock;

    GasFeeControllerInit(requestMock);

    const getCurrentNetworkEIP1559Compatibility =
      jest.mocked(GasFeeController).mock.lastCall?.[0]
        .getCurrentNetworkEIP1559Compatibility;

    expect(await getCurrentNetworkEIP1559Compatibility?.('sepolia')).toBe(true);
    expect(initMessengerCallMock).toHaveBeenCalledWith(
      'NetworkController:getEIP1559Compatibility',
      'sepolia',
    );
  });
});
