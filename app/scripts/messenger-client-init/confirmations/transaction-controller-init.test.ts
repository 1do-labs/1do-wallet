import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import {
  TransactionController,
  type TransactionControllerMessenger,
  type TransactionControllerOptions,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { getRootMessenger } from '../../lib/messenger';
import {
  getTransactionControllerInitMessenger,
  getTransactionControllerMessenger,
  type TransactionControllerInitMessenger,
} from '../messengers/transaction-controller-messenger';
import { buildControllerInitRequestMock, CHAIN_ID_MOCK } from '../test/utils';
import type { MessengerClientInitRequest } from '../types';
import { TransactionControllerInit } from './transaction-controller-init';

jest.mock('@metamask/transaction-controller');

function buildDependencyMock(overrides: Record<string, unknown> = {}) {
  return {
    fetchGasFeeEstimates: jest.fn(),
    getNetworkClientRegistry: jest.fn().mockReturnValue({}),
    signTransaction: jest.fn(),
    state: {
      advancedGasFee: {},
      completedOnboarding: true,
      networkConfigurationsByChainId: {},
      useExternalServices: true,
      useTransactionSimulations: true,
    },
    ...overrides,
  };
}

function buildInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<
    TransactionControllerMessenger,
    TransactionControllerInitMessenger
  >
> {
  const rootMessenger = getRootMessenger();
  const request = {
    ...buildControllerInitRequestMock(),
    controllerMessenger: getTransactionControllerMessenger(rootMessenger),
    initMessenger: getTransactionControllerInitMessenger(rootMessenger),
  };

  request.getMessengerClient.mockReturnValue(buildDependencyMock() as never);
  return request;
}

function getConstructorOptions(
  request = buildInitRequestMock(),
): TransactionControllerOptions {
  TransactionControllerInit(request);
  return jest.mocked(TransactionController).mock.calls[0][0];
}

describe('TransactionControllerInit', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('creates the transaction controller', () => {
    const result = TransactionControllerInit(buildInitRequestMock());

    expect(result.messengerClient).toBeInstanceOf(TransactionController);
    expect(result.memStateKey).toBe('TxController');
  });

  it('reads saved gas fees from preferences', () => {
    const request = buildInitRequestMock();
    request.getMessengerClient.mockReturnValue(
      buildDependencyMock({
        state: {
          advancedGasFee: {
            [CHAIN_ID_MOCK]: {
              maxBaseFee: '0x1',
              priorityFee: '0x2',
            },
          },
          completedOnboarding: true,
          networkConfigurationsByChainId: {},
          useExternalServices: true,
          useTransactionSimulations: true,
        },
      }) as never,
    );

    const options = getConstructorOptions(request);

    expect(options.getSavedGasFees?.(CHAIN_ID_MOCK)).toStrictEqual({
      maxBaseFee: '0x1',
      priorityFee: '0x2',
    });
  });

  it('checks EIP-1559 support for the transaction network client', async () => {
    const request = buildInitRequestMock();
    request.initMessenger.call = jest.fn().mockResolvedValue(true) as never;
    const options = getConstructorOptions(request);
    const getCompatibility =
      options.getCurrentNetworkEIP1559Compatibility as unknown as (
        networkClientId: string,
      ) => Promise<boolean>;

    await expect(getCompatibility('sepolia')).resolves.toBe(true);
    expect(request.initMessenger.call).toHaveBeenCalledWith(
      'NetworkController:getEIP1559Compatibility',
      'sepolia',
    );
  });

  it('uses the remote-service and onboarding preferences for incoming activity', () => {
    const options = getConstructorOptions();

    expect(options.incomingTransactions?.isEnabled?.()).toBe(true);
  });

  it('uses the simulation preference', () => {
    const options = getConstructorOptions();

    expect(options.isSimulationEnabled?.()).toBe(true);
  });

  it('routes transaction simulations through the selected Alchemy RPC', async () => {
    const request = buildInitRequestMock();
    request.getMessengerClient.mockReturnValue(
      buildDependencyMock({
        state: {
          advancedGasFee: {},
          completedOnboarding: true,
          networkConfigurationsByChainId: {
            [CHAIN_ID_MOCK]: {
              defaultRpcEndpointIndex: 0,
              rpcEndpoints: [
                { url: 'https://eth-sepolia.g.alchemy.com/v2/key' },
              ],
            },
          },
          useExternalServices: true,
          useTransactionSimulations: true,
        },
      }) as never,
    );
    const options = getConstructorOptions(request);

    await expect(
      options.getSimulationConfig?.('https://unused.example', {
        txMeta: { chainId: CHAIN_ID_MOCK },
      } as never),
    ).resolves.toStrictEqual({
      authorization: undefined,
      newUrl: 'https://eth-sepolia.g.alchemy.com/v2/key',
    });
  });

  it('disables automatic gas updates for internal approval transactions', () => {
    const options = getConstructorOptions();
    const transaction = {
      id: 'transaction-id',
      origin: ORIGIN_METAMASK,
      status: TransactionStatus.unapproved,
      time: 0,
      type: TransactionType.tokenMethodApprove,
      chainId: CHAIN_ID_MOCK,
      networkClientId: 'network-client-id',
      txParams: { from: '0x1' },
    } as Parameters<
      NonNullable<
        TransactionControllerOptions['isAutomaticGasFeeUpdateEnabled']
      >
    >[0];

    expect(options.isAutomaticGasFeeUpdateEnabled?.(transaction)).toBe(false);
  });

  it('uses the controller default publishing path', () => {
    const options = getConstructorOptions();

    expect(options.hooks.publish).toBeUndefined();
    expect(options.hooks.publishBatch).toBeUndefined();
  });
});
