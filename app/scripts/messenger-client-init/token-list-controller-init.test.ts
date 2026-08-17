import {
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerGetStateAction,
} from '@metamask/network-controller';
import {
  Messenger,
  ActionConstraint,
  MOCK_ANY_NAMESPACE,
  MockAnyNamespace,
} from '@metamask/messenger';
import { PreferencesControllerGetStateAction } from '../controllers/preferences-controller';
import { AlchemyTokenListController } from '../controllers/alchemy-token-list-controller';
import { MessengerClientInitRequest } from './types';
import { buildControllerInitRequestMock } from './test/utils';
import {
  getTokenListControllerInitMessenger,
  getTokenListControllerMessenger,
  TokenListControllerInitMessenger,
  TokenListControllerMessenger,
} from './messengers';
import { TokenListControllerInit } from './token-list-controller-init';

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<
    TokenListControllerMessenger,
    TokenListControllerInitMessenger
  >
> {
  const baseMessenger = new Messenger<
    MockAnyNamespace,
    | NetworkControllerGetStateAction
    | NetworkControllerGetNetworkClientByIdAction
    | PreferencesControllerGetStateAction
    | ActionConstraint,
    never
  >({
    namespace: MOCK_ANY_NAMESPACE,
  });

  baseMessenger.registerActionHandler('NetworkController:getState', () => ({
    selectedNetworkClientId: 'mainnet',
    networkConfigurationsByChainId: {},
    networksMetadata: {},
  }));

  baseMessenger.registerActionHandler(
    'NetworkController:getNetworkClientById',
    // @ts-expect-error: Partial mock.
    (id: string) => {
      if (id === 'mainnet') {
        return {
          configuration: { chainId: '0x1' },
        };
      }

      throw new Error('Unknown network client ID');
    },
  );

  baseMessenger.registerActionHandler('PreferencesController:getState', () => ({
    useTokenDetection: true,
    useExternalServices: true,
    // @ts-expect-error: Partial mock.
    preferences: {},
    useTransactionSimulations: false,
  }));

  const requestMock = {
    ...buildControllerInitRequestMock(),
    controllerMessenger: getTokenListControllerMessenger(baseMessenger),
    initMessenger: getTokenListControllerInitMessenger(baseMessenger),
  };

  return requestMock;
}

describe('TokenListControllerInit', () => {
  it('initializes the controller', () => {
    const { messengerClient } = TokenListControllerInit(getInitRequestMock());
    expect(messengerClient).toBeInstanceOf(AlchemyTokenListController);
  });

  it('hydrates the persisted token-list state', () => {
    const request = getInitRequestMock();
    request.persistedState.TokenListController = {
      tokensChainsCache: {},
    };

    const { messengerClient } = TokenListControllerInit(request);

    expect(messengerClient.state).toStrictEqual({ tokensChainsCache: {} });
  });
});
