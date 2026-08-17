import { getRootMessenger } from '../lib/messenger';
import { AlchemyTokenDetectionController } from '../controllers/alchemy-token-detection-controller';
import { MessengerClientInitRequest } from './types';
import { buildControllerInitRequestMock } from './test/utils';
import {
  getTokenDetectionControllerInitMessenger,
  getTokenDetectionControllerMessenger,
  TokenDetectionControllerInitMessenger,
  TokenDetectionControllerMessenger,
} from './messengers';
import { TokenDetectionControllerInit } from './token-detection-controller-init';

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<
    TokenDetectionControllerMessenger,
    TokenDetectionControllerInitMessenger
  >
> {
  const baseMessenger = getRootMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(),
    controllerMessenger: getTokenDetectionControllerMessenger(baseMessenger),
    initMessenger: getTokenDetectionControllerInitMessenger(baseMessenger),
  };

  return requestMock;
}

describe('TokenDetectionControllerInit', () => {
  it('initializes the controller', () => {
    const { messengerClient } =
      TokenDetectionControllerInit(getInitRequestMock());
    expect(messengerClient).toBeInstanceOf(AlchemyTokenDetectionController);
  });

  it('does not persist remote token-detection state', () => {
    const { messengerClient } =
      TokenDetectionControllerInit(getInitRequestMock());

    expect(messengerClient.state).toStrictEqual({});
  });

  it('exposes the polling API expected by the background API', () => {
    const { messengerClient } =
      TokenDetectionControllerInit(getInitRequestMock());

    expect(() =>
      messengerClient.startPolling.bind(messengerClient),
    ).not.toThrow();
    expect(() =>
      messengerClient.stopPollingByPollingToken.bind(messengerClient),
    ).not.toThrow();
  });
});
