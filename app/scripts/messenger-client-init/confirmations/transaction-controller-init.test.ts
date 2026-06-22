import { NetworkController } from '@metamask/network-controller';
// Mocha type definitions are conflicting with Jest
import { it as jestIt } from '@jest/globals';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import {
  TransactionMeta,
  TransactionType,
  TransactionController,
  TransactionControllerMessenger,
  TransactionControllerOptions,
  TransactionStatus,
  PublishBatchHookRequest,
  PublishBatchHookTransaction,
} from '@metamask/transaction-controller';
import {
  getTransactionControllerInitMessenger,
  getTransactionControllerMessenger,
  TransactionControllerInitMessenger,
} from '../messengers/transaction-controller-messenger';
import { getRootMessenger } from '../../lib/messenger';
import { buildControllerInitRequestMock, CHAIN_ID_MOCK } from '../test/utils';
import { MessengerClientInitRequest, MessengerClientName } from '../types';
import * as smartTransactionsModule from '../../lib/smart-transaction/smart-transactions';
import * as sentinelApiModule from '../../lib/transaction/sentinel-api';
import * as selectorsModule from '../../../../shared/lib/selectors';
import { NATIVE_TOKEN_ADDRESS } from '../../../../shared/constants/transaction';
import { Delegation7702PublishHook } from '../../lib/transaction/hooks/delegation-7702-publish';
import {
  TransactionControllerInit,
  publishBatchHook,
  publishHook,
} from './transaction-controller-init';

jest.mock('@metamask/transaction-controller');
jest.mock('../../lib/smart-transaction/smart-transactions');
jest.mock('../../lib/transaction/sentinel-api');
jest.mock('../../lib/transaction/hooks/delegation-7702-publish');
jest.mock('../../../../shared/lib/selectors');

/**
 * Build a mock NetworkController.
 *
 * @param partialMock - A partial mock object for the NetworkController, merged
 * with the default mock.
 * @returns A mock NetworkController.
 */
function buildControllerMock(
  partialMock?: Partial<NetworkController>,
): NetworkController {
  const defaultNetworkControllerMock = {
    getNetworkClientRegistry: jest.fn().mockReturnValue({}),
  };

  // @ts-expect-error Incomplete mock, just includes properties used by code-under-test.
  return {
    ...defaultNetworkControllerMock,
    ...partialMock,
  };
}

function buildInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<
    TransactionControllerMessenger,
    TransactionControllerInitMessenger
  >
> {
  const baseControllerMessenger = getRootMessenger();

  const requestMock = {
    ...buildControllerInitRequestMock(),
    controllerMessenger: getTransactionControllerMessenger(
      baseControllerMessenger,
    ),
    initMessenger: getTransactionControllerInitMessenger(
      baseControllerMessenger,
    ),
  };

  requestMock.getMessengerClient.mockReturnValue(buildControllerMock());

  return requestMock;
}

describe('Transaction Controller Init', () => {
  const transactionControllerClassMock = jest.mocked(TransactionController);

  /**
   * Extract a constructor option passed to the controller.
   *
   * @param option - The option to extract.
   * @param dependencyProperties - Any properties required on the controller dependencies.
   * @returns The extracted option.
   */
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  function testConstructorOption<T extends keyof TransactionControllerOptions>(
    option: T,
    dependencyProperties: Record<string, unknown> = {},
  ): TransactionControllerOptions[T] {
    const requestMock = buildInitRequestMock();

    requestMock.getMessengerClient.mockReturnValue(
      buildControllerMock(dependencyProperties),
    );

    TransactionControllerInit(requestMock);

    return transactionControllerClassMock.mock.calls[0][0][option];
  }

  beforeEach(() => {
    jest.resetAllMocks();

    jest
      .mocked(smartTransactionsModule.getSmartTransactionCommonParams)
      .mockReturnValue({
        isSmartTransaction: false,
        featureFlags: {
          extensionReturnTxHashAsap: false,
          extensionReturnTxHashAsapBatch: false,
          extensionSkipTransactionStatusPage: false,
          mobileActive: false,
          extensionActive: false,
        },
        isHardwareWalletAccount: false,
      });

    jest
      .mocked(sentinelApiModule.isSendBundleSupported)
      .mockResolvedValue(false);

    const delegation7702HookMock: jest.MockedFn<PublishHook> = jest.fn();
    delegation7702HookMock.mockResolvedValue({ transactionHash: undefined });
    jest.mocked(Delegation7702PublishHook).mockImplementation(
      () =>
        ({
          getHook: () => delegation7702HookMock,
        }) as unknown as Delegation7702PublishHook,
    );
  });

  it('returns controller instance', () => {
    const requestMock = buildInitRequestMock();
    expect(
      TransactionControllerInit(requestMock).messengerClient,
    ).toBeInstanceOf(TransactionController);
  });

  it('retrieves saved gas fees from preferences', () => {
    const getSavedGasFees = testConstructorOption('getSavedGasFees', {
      state: {
        advancedGasFee: {
          [CHAIN_ID_MOCK]: {
            maxBaseFee: '0x1',
            priorityFee: '0x2',
          },
        },
      },
    });

    expect(getSavedGasFees?.(CHAIN_ID_MOCK)).toStrictEqual({
      maxBaseFee: '0x1',
      priorityFee: '0x2',
    });
  });

  it('checks EIP-1559 compatibility for the transaction network client', async () => {
    const requestMock = buildInitRequestMock();
    const initMessengerCallMock = jest.fn().mockReturnValue(true);
    requestMock.initMessenger.call = initMessengerCallMock;

    TransactionControllerInit(requestMock);

    const { getCurrentNetworkEIP1559Compatibility } =
      transactionControllerClassMock.mock.calls[0][0];

    expect(await getCurrentNetworkEIP1559Compatibility?.('sepolia')).toBe(true);
    expect(initMessengerCallMock).toHaveBeenCalledWith(
      'NetworkController:getEIP1559Compatibility',
      'sepolia',
    );
  });

  describe('determines incoming transactions is enabled', () => {
    it('when useExternalServices is enabled in preferences and onboarding complete', () => {
      const incomingTransactionsIsEnabled = testConstructorOption(
        'incomingTransactions',
        {
          state: {
            completedOnboarding: true,
            useExternalServices: true,
          },
        },
      )?.isEnabled;

      expect(incomingTransactionsIsEnabled?.()).toBe(true);
    });

    it('unless enabled in preferences but onboarding incomplete', () => {
      const incomingTransactionsIsEnabled = testConstructorOption(
        'incomingTransactions',
        {
          state: {
            completedOnboarding: false,
            useExternalServices: true,
          },
        },
      )?.isEnabled;

      expect(incomingTransactionsIsEnabled?.()).toBe(false);
    });

    it('unless disabled in preferences and onboarding complete', () => {
      const incomingTransactionsIsEnabled = testConstructorOption(
        'incomingTransactions',
        {
          state: {
            completedOnboarding: true,
            useExternalServices: false,
          },
        },
      )?.isEnabled;

      expect(incomingTransactionsIsEnabled?.()).toBe(false);
    });
  });

  it('disables first time interaction tracking', () => {
    const isFirstTimeInteractionEnabled = testConstructorOption(
      'isFirstTimeInteractionEnabled',
      { state: {} },
    );

    expect(isFirstTimeInteractionEnabled?.()).toBe(false);
  });

  it('determines if simulation enabled using preference', () => {
    const isSimulationEnabled = testConstructorOption('isSimulationEnabled', {
      state: {
        useTransactionSimulations: true,
      },
    });

    expect(isSimulationEnabled?.()).toBe(true);
  });

  it('allows transactions to publish by default', async () => {
    const hooks = testConstructorOption('hooks');

    expect(await hooks?.beforePublish?.({} as TransactionMeta)).toBe(true);
  });

  it('always disables pending transaction resubmit', () => {
    const pendingTransactions = testConstructorOption('pendingTransactions');

    expect(pendingTransactions?.isResubmitEnabled?.()).toBe(false);
  });

  describe('isAutomaticGasFeeUpdateEnabled', () => {
    function buildTransactionMeta(
      overrides: Partial<TransactionMeta> = {},
    ): TransactionMeta {
      return {
        id: '1',
        type: TransactionType.contractInteraction,
        chainId: CHAIN_ID_MOCK,
        networkClientId: 'test-network',
        status: TransactionStatus.unapproved,
        time: Date.now(),
        txParams: {
          from: '0x0000000000000000000000000000000000000000',
        },
        ...overrides,
      };
    }

    jestIt.each([
      ['relayDeposit', TransactionType.relayDeposit, false],
      ['predictRelayDeposit', TransactionType.predictRelayDeposit, false],
      ['contractInteraction', TransactionType.contractInteraction, true],
    ])('returns %s for %s transactions', (_label, type, expected) => {
      const isAutomaticGasFeeUpdateEnabled = testConstructorOption(
        'isAutomaticGasFeeUpdateEnabled',
      );

      expect(
        isAutomaticGasFeeUpdateEnabled?.(buildTransactionMeta({ type })),
      ).toBe(expected);
    });

    it('returns false for transactions with nested relayDeposit type', () => {
      const isAutomaticGasFeeUpdateEnabled = testConstructorOption(
        'isAutomaticGasFeeUpdateEnabled',
      );

      expect(
        isAutomaticGasFeeUpdateEnabled?.(
          buildTransactionMeta({
            type: TransactionType.contractInteraction,
            nestedTransactions: [{ type: TransactionType.relayDeposit }],
          }),
        ),
      ).toBe(false);
    });

    it('returns false for tokenMethodApprove with ORIGIN_METAMASK', () => {
      const isAutomaticGasFeeUpdateEnabled = testConstructorOption(
        'isAutomaticGasFeeUpdateEnabled',
      );

      expect(
        isAutomaticGasFeeUpdateEnabled?.(
          buildTransactionMeta({
            type: TransactionType.tokenMethodApprove,
            origin: ORIGIN_METAMASK,
          }),
        ),
      ).toBe(false);
    });

    it('returns true for tokenMethodApprove with non-MetaMask origin', () => {
      const isAutomaticGasFeeUpdateEnabled = testConstructorOption(
        'isAutomaticGasFeeUpdateEnabled',
      );

      expect(
        isAutomaticGasFeeUpdateEnabled?.(
          buildTransactionMeta({
            type: TransactionType.tokenMethodApprove,
            origin: 'https://external-dapp.com',
          }),
        ),
      ).toBe(true);
    });
  });

  describe('isEIP7702GasFeeTokensEnabled', () => {
    const getIsSmartTransactionMock = jest.mocked(
      selectorsModule.getIsSmartTransaction,
    );

    const isSendBundleSupportedMock = jest.mocked(
      sentinelApiModule.isSendBundleSupported,
    );

    const mockTransactionMeta = {
      id: '1',
      status: TransactionStatus.unapproved,
      chainId: CHAIN_ID_MOCK,
      networkClientId: 'test-network',
      time: Date.now(),
      txParams: {
        from: '0x0000000000000000000000000000000000000000',
      },
    } as TransactionMeta;

    it('returns false when MetaMask gasless is disabled', async () => {
      getIsSmartTransactionMock.mockReturnValue(false);
      isSendBundleSupportedMock.mockResolvedValue(false);

      const optionFn = testConstructorOption('isEIP7702GasFeeTokensEnabled');

      expect(await optionFn?.(mockTransactionMeta)).toBe(false);
    });

    it('returns false when smart transactions enabled and send bundle supported', async () => {
      getIsSmartTransactionMock.mockReturnValue(true);
      isSendBundleSupportedMock.mockResolvedValue(true);

      const optionFn = testConstructorOption('isEIP7702GasFeeTokensEnabled');

      expect(await optionFn?.(mockTransactionMeta)).toBe(false);
    });

    it('returns false when smart transactions disabled and send bundle supported', async () => {
      getIsSmartTransactionMock.mockReturnValue(false);
      isSendBundleSupportedMock.mockResolvedValue(true);

      const optionFn = testConstructorOption('isEIP7702GasFeeTokensEnabled');

      expect(await optionFn?.(mockTransactionMeta)).toBe(false);
    });

    it('returns false when smart transactions enabled and send bundle not supported', async () => {
      getIsSmartTransactionMock.mockReturnValue(true);
      isSendBundleSupportedMock.mockResolvedValue(false);

      const optionFn = testConstructorOption('isEIP7702GasFeeTokensEnabled');

      expect(await optionFn?.(mockTransactionMeta)).toBe(false);
    });

    it('returns false when isExternalSign is true', async () => {
      getIsSmartTransactionMock.mockReturnValue(true);
      isSendBundleSupportedMock.mockResolvedValue(true);

      const optionFn = testConstructorOption('isEIP7702GasFeeTokensEnabled');

      expect(
        await optionFn?.({
          ...mockTransactionMeta,
          isExternalSign: true,
        }),
      ).toBe(false);
    });
  });

  describe('publish hook', () => {
    const NON_NATIVE_GAS_FEE_TOKEN =
      '0x1234567890123456789012345678901234567890';

    const mockTransactionMeta: TransactionMeta = {
      id: '123',
      chainId: CHAIN_ID_MOCK,
      status: TransactionStatus.approved,
      time: Date.now(),
      txParams: {
        from: '0x0000000000000000000000000000000000000000',
      },
      networkClientId: 'test-network',
    };

    it('uses default submission when MetaMask gasless is disabled', async () => {
      const hooks = testConstructorOption('hooks');

      const result = await hooks?.publish?.(mockTransactionMeta);

      expect(result).toStrictEqual({ transactionHash: undefined });
    });

    it('skips Delegation7702PublishHook for hardware wallet accounts', async () => {
      const requestMock = buildInitRequestMock();
      requestMock.getMessengerClient.mockImplementation(((
        name: MessengerClientName,
      ) => {
        if (name === 'KeyringController') {
          return {
            getKeyringForAccount: jest.fn().mockResolvedValue({
              type: 'Ledger Hardware',
            }),
          };
        }
        return buildControllerMock();
      }) as unknown as MessengerClientInitRequest<
        TransactionControllerMessenger,
        TransactionControllerInitMessenger
      >['getMessengerClient']);

      TransactionControllerInit(requestMock);

      const { hooks } = transactionControllerClassMock.mock.calls[0][0];

      await hooks?.publish?.(mockTransactionMeta);

      expect(jest.mocked(Delegation7702PublishHook)).not.toHaveBeenCalled();
    });

    it('skips Delegation7702PublishHook for HD keyring accounts with a non-native gas fee token when MetaMask gasless is disabled', async () => {
      const requestMock = buildInitRequestMock();
      requestMock.getMessengerClient.mockImplementation(((
        name: MessengerClientName,
      ) => {
        if (name === 'KeyringController') {
          return {
            getKeyringForAccount: jest.fn().mockResolvedValue({
              type: 'HD Key Tree',
            }),
          };
        }
        return buildControllerMock();
      }) as unknown as MessengerClientInitRequest<
        TransactionControllerMessenger,
        TransactionControllerInitMessenger
      >['getMessengerClient']);

      TransactionControllerInit(requestMock);

      const { hooks } = transactionControllerClassMock.mock.calls[0][0];

      await hooks?.publish?.({
        ...mockTransactionMeta,
        selectedGasFeeToken: NON_NATIVE_GAS_FEE_TOKEN,
      } as TransactionMeta);

      expect(jest.mocked(Delegation7702PublishHook)).not.toHaveBeenCalled();
    });

    it('skips Delegation7702PublishHook for HD keyring accounts using ordinary native gas', async () => {
      const requestMock = buildInitRequestMock();
      requestMock.getMessengerClient.mockImplementation(((
        name: MessengerClientName,
      ) => {
        if (name === 'KeyringController') {
          return {
            getKeyringForAccount: jest.fn().mockResolvedValue({
              type: 'HD Key Tree',
            }),
          };
        }
        return buildControllerMock();
      }) as unknown as MessengerClientInitRequest<
        TransactionControllerMessenger,
        TransactionControllerInitMessenger
      >['getMessengerClient']);

      TransactionControllerInit(requestMock);

      const { hooks } = transactionControllerClassMock.mock.calls[0][0];

      await hooks?.publish?.({
        ...mockTransactionMeta,
        isExternalSign: true,
        selectedGasFeeToken: NATIVE_TOKEN_ADDRESS,
      } as TransactionMeta);

      expect(jest.mocked(Delegation7702PublishHook)).not.toHaveBeenCalled();
    });

    it('uses default submission for 7702-capable ordinary transactions even when smart transactions are enabled', async () => {
      jest
        .mocked(smartTransactionsModule.getSmartTransactionCommonParams)
        .mockReturnValue({
          isSmartTransaction: true,
          featureFlags: {
            extensionReturnTxHashAsap: false,
            extensionReturnTxHashAsapBatch: false,
            extensionSkipTransactionStatusPage: false,
            mobileActive: false,
            extensionActive: false,
          },
          isHardwareWalletAccount: false,
        });
      jest
        .mocked(sentinelApiModule.isSendBundleSupported)
        .mockResolvedValue(true);

      const requestMock = buildInitRequestMock();
      requestMock.getMessengerClient.mockImplementation(((
        name: MessengerClientName,
      ) => {
        if (name === 'KeyringController') {
          return {
            getKeyringForAccount: jest.fn().mockResolvedValue({
              type: 'HD Key Tree',
            }),
          };
        }
        return buildControllerMock();
      }) as unknown as MessengerClientInitRequest<
        TransactionControllerMessenger,
        TransactionControllerInitMessenger
      >['getMessengerClient']);

      TransactionControllerInit(requestMock);

      const { hooks } = transactionControllerClassMock.mock.calls[0][0];

      await hooks?.publish?.(mockTransactionMeta);

      expect(jest.mocked(Delegation7702PublishHook)).not.toHaveBeenCalled();
      expect(
        jest.mocked(smartTransactionsModule.submitSmartTransactionHook),
      ).not.toHaveBeenCalled();
    });

    it('skips Delegation7702PublishHook for upgrade-only 7702 transactions', async () => {
      const requestMock = buildInitRequestMock();
      requestMock.getMessengerClient.mockImplementation(((
        name: MessengerClientName,
      ) => {
        if (name === 'KeyringController') {
          return {
            getKeyringForAccount: jest.fn().mockResolvedValue({
              type: 'HD Key Tree',
            }),
          };
        }
        return buildControllerMock();
      }) as unknown as MessengerClientInitRequest<
        TransactionControllerMessenger,
        TransactionControllerInitMessenger
      >['getMessengerClient']);

      TransactionControllerInit(requestMock);

      const { hooks } = transactionControllerClassMock.mock.calls[0][0];

      await hooks?.publish?.({
        ...mockTransactionMeta,
        txParams: {
          ...mockTransactionMeta.txParams,
          authorizationList: [
            { address: '0x1234567890123456789012345678901234567890' },
          ],
          data: '0x',
        },
      } as TransactionMeta);

      expect(jest.mocked(Delegation7702PublishHook)).not.toHaveBeenCalled();
    });

    it('skips sentinel_relay submission when MetaMask gasless is disabled', async () => {
      const delegation7702HookFn: jest.MockedFn<PublishHook> = jest.fn();
      delegation7702HookFn.mockResolvedValue({ transactionHash: '0xdelHash' });
      jest.mocked(Delegation7702PublishHook).mockImplementation(
        () =>
          ({
            getHook: () => delegation7702HookFn,
          }) as unknown as Delegation7702PublishHook,
      );

      const upsertFragmentMock = jest.fn();

      type PHArgs = Parameters<typeof publishHook>[0];
      const result = await publishHook({
        flatState: {} as PHArgs['flatState'],
        getTransactionMetricsRequest: () =>
          ({
            upsertTransactionUIMetricsFragment: upsertFragmentMock,
          }) as unknown as ReturnType<PHArgs['getTransactionMetricsRequest']>,
        initMessenger: {
          call: jest.fn(),
        } as unknown as TransactionControllerInitMessenger,
        keyringController: {
          getKeyringForAccount: jest
            .fn()
            .mockResolvedValue({ type: 'HD Key Tree' }),
        },
        signedTx: '0xsigned',
        smartTransactionsController:
          {} as PHArgs['smartTransactionsController'],
        transactionController: {
          isAtomicBatchSupported: jest.fn(),
        } as unknown as PHArgs['transactionController'],
        transactionMeta: {
          ...mockTransactionMeta,
          selectedGasFeeToken: NON_NATIVE_GAS_FEE_TOKEN,
        } as TransactionMeta,
      });

      expect(result).toStrictEqual({ transactionHash: undefined });
      expect(upsertFragmentMock).not.toHaveBeenCalled();
      expect(jest.mocked(Delegation7702PublishHook)).not.toHaveBeenCalled();
    });

    it('skips sentinel_stx submission when MetaMask gasless is disabled', async () => {
      jest
        .mocked(smartTransactionsModule.getSmartTransactionCommonParams)
        .mockReturnValue({
          isSmartTransaction: true,
          featureFlags: {
            extensionReturnTxHashAsap: false,
            extensionReturnTxHashAsapBatch: false,
            extensionSkipTransactionStatusPage: false,
            mobileActive: false,
            extensionActive: false,
          },
          isHardwareWalletAccount: false,
        });

      jest
        .mocked(smartTransactionsModule.submitSmartTransactionHook)
        .mockResolvedValue({ transactionHash: '0xstxHash' });

      const upsertFragmentMock = jest.fn();

      type PHArgs = Parameters<typeof publishHook>[0];
      const result = await publishHook({
        flatState: {} as PHArgs['flatState'],
        getTransactionMetricsRequest: () =>
          ({
            upsertTransactionUIMetricsFragment: upsertFragmentMock,
          }) as unknown as ReturnType<PHArgs['getTransactionMetricsRequest']>,
        initMessenger: {
          call: jest.fn(),
        } as unknown as TransactionControllerInitMessenger,
        keyringController: {
          getKeyringForAccount: jest
            .fn()
            .mockResolvedValue({ type: 'Ledger Hardware' }),
        },
        signedTx: '0xsigned',
        smartTransactionsController:
          {} as PHArgs['smartTransactionsController'],
        transactionController: {} as PHArgs['transactionController'],
        transactionMeta: {
          ...mockTransactionMeta,
          isGasFeeSponsored: true,
        },
      });

      expect(result).toStrictEqual({ transactionHash: undefined });
      expect(upsertFragmentMock).not.toHaveBeenCalled();
      expect(
        jest.mocked(smartTransactionsModule.submitSmartTransactionHook),
      ).not.toHaveBeenCalled();
    });

    it('uses default submission for ordinary native gas transactions even when smart transactions are enabled', async () => {
      jest
        .mocked(smartTransactionsModule.getSmartTransactionCommonParams)
        .mockReturnValue({
          isSmartTransaction: true,
          featureFlags: {
            extensionReturnTxHashAsap: false,
            extensionReturnTxHashAsapBatch: false,
            extensionSkipTransactionStatusPage: false,
            mobileActive: false,
            extensionActive: true,
          },
          isHardwareWalletAccount: false,
        });

      jest
        .mocked(sentinelApiModule.isSendBundleSupported)
        .mockResolvedValue(true);

      type PHArgs = Parameters<typeof publishHook>[0];
      const result = await publishHook({
        flatState: {} as PHArgs['flatState'],
        getTransactionMetricsRequest: () =>
          ({
            upsertTransactionUIMetricsFragment: jest.fn(),
          }) as unknown as ReturnType<PHArgs['getTransactionMetricsRequest']>,
        initMessenger: {
          call: jest.fn(),
        } as unknown as TransactionControllerInitMessenger,
        keyringController: {
          getKeyringForAccount: jest
            .fn()
            .mockResolvedValue({ type: 'Ledger Hardware' }),
        },
        signedTx: '0xsigned',
        smartTransactionsController:
          {} as PHArgs['smartTransactionsController'],
        transactionController: {} as PHArgs['transactionController'],
        transactionMeta: {
          ...mockTransactionMeta,
          selectedGasFeeToken: undefined,
          isGasFeeIncluded: false,
          isGasFeeSponsored: false,
        } as TransactionMeta,
      });

      expect(result).toStrictEqual({ transactionHash: undefined });
      expect(
        jest.mocked(smartTransactionsModule.submitSmartTransactionHook),
      ).not.toHaveBeenCalled();
    });

    it('uses default submission for upgrade-only 7702 transactions without special publish hooks', async () => {
      jest
        .mocked(smartTransactionsModule.getSmartTransactionCommonParams)
        .mockReturnValue({
          isSmartTransaction: true,
          featureFlags: {
            extensionReturnTxHashAsap: false,
            extensionReturnTxHashAsapBatch: false,
            extensionSkipTransactionStatusPage: false,
            mobileActive: false,
            extensionActive: false,
          },
          isHardwareWalletAccount: false,
        });

      type PHArgs = Parameters<typeof publishHook>[0];
      const result = await publishHook({
        flatState: {} as PHArgs['flatState'],
        getTransactionMetricsRequest: () =>
          ({
            upsertTransactionUIMetricsFragment: jest.fn(),
          }) as unknown as ReturnType<PHArgs['getTransactionMetricsRequest']>,
        initMessenger: {
          call: jest.fn(),
        } as unknown as TransactionControllerInitMessenger,
        keyringController: {
          getKeyringForAccount: jest
            .fn()
            .mockResolvedValue({ type: 'HD Key Tree' }),
        },
        signedTx: '0xsigned',
        smartTransactionsController:
          {} as PHArgs['smartTransactionsController'],
        transactionController: {
          isAtomicBatchSupported: jest.fn(),
        } as unknown as PHArgs['transactionController'],
        transactionMeta: {
          ...mockTransactionMeta,
          txParams: {
            ...mockTransactionMeta.txParams,
            authorizationList: [
              { address: '0x1234567890123456789012345678901234567890' },
            ],
            data: '0x',
          },
          selectedGasFeeToken: undefined,
          gasFeeTokens: [],
          isGasFeeIncluded: false,
          isGasFeeSponsored: false,
        } as TransactionMeta,
      });

      expect(result).toStrictEqual({ transactionHash: undefined });
      expect(payHookMock).not.toHaveBeenCalled();
      expect(jest.mocked(Delegation7702PublishHook)).not.toHaveBeenCalled();
      expect(
        jest.mocked(smartTransactionsModule.submitSmartTransactionHook),
      ).not.toHaveBeenCalled();
    });

    it('uses default submission for 1Do app access updates even if marked as sponsored', async () => {
      type PHArgs = Parameters<typeof publishHook>[0];
      const result = await publishHook({
        flatState: {} as PHArgs['flatState'],
        getTransactionMetricsRequest: () =>
          ({
            upsertTransactionUIMetricsFragment: jest.fn(),
          }) as unknown as ReturnType<PHArgs['getTransactionMetricsRequest']>,
        initMessenger: {
          call: jest.fn(),
        } as unknown as TransactionControllerInitMessenger,
        keyringController: {
          getKeyringForAccount: jest
            .fn()
            .mockResolvedValue({ type: 'HD Key Tree' }),
        },
        signedTx: '0xsigned',
        smartTransactionsController:
          {} as PHArgs['smartTransactionsController'],
        transactionController: {
          isAtomicBatchSupported: jest.fn(),
        } as unknown as PHArgs['transactionController'],
        transactionMeta: {
          ...mockTransactionMeta,
          isGasFeeSponsored: true,
          txParams: {
            from: '0x0000000000000000000000000000000000000000',
            to: '0x0000000000000000000000000000000000000000',
            data: '0x787f863d0000000000000000000000003c7618fdab069e8888e5587ca2766497b866afd5',
          },
        } as TransactionMeta,
      });

      expect(result).toStrictEqual({ transactionHash: undefined });
      expect(jest.mocked(Delegation7702PublishHook)).not.toHaveBeenCalled();
      expect(
        jest.mocked(smartTransactionsModule.submitSmartTransactionHook),
      ).not.toHaveBeenCalled();
    });

    it('uses default submission if sentinel_relay would throw metrics while MetaMask gasless is disabled', async () => {
      const delegation7702HookFn: jest.MockedFn<PublishHook> = jest.fn();
      delegation7702HookFn.mockResolvedValue({ transactionHash: '0xdelHash' });
      jest.mocked(Delegation7702PublishHook).mockImplementation(
        () =>
          ({
            getHook: () => delegation7702HookFn,
          }) as unknown as Delegation7702PublishHook,
      );

      type PHArgs = Parameters<typeof publishHook>[0];
      const result = await publishHook({
        flatState: {} as PHArgs['flatState'],
        getTransactionMetricsRequest: () =>
          ({
            upsertTransactionUIMetricsFragment: jest
              .fn()
              .mockImplementation(() => {
                throw new Error('metrics error');
              }),
          }) as unknown as ReturnType<PHArgs['getTransactionMetricsRequest']>,
        initMessenger: {
          call: jest.fn(),
        } as unknown as TransactionControllerInitMessenger,
        keyringController: {
          getKeyringForAccount: jest
            .fn()
            .mockResolvedValue({ type: 'HD Key Tree' }),
        },
        signedTx: '0xsigned',
        smartTransactionsController:
          {} as PHArgs['smartTransactionsController'],
        transactionController: {
          isAtomicBatchSupported: jest.fn(),
        } as unknown as PHArgs['transactionController'],
        transactionMeta: {
          ...mockTransactionMeta,
          selectedGasFeeToken: NON_NATIVE_GAS_FEE_TOKEN,
        } as TransactionMeta,
      });

      expect(result).toStrictEqual({ transactionHash: undefined });
      expect(jest.mocked(Delegation7702PublishHook)).not.toHaveBeenCalled();
    });

    it('uses default submission if sentinel_stx would throw metrics while MetaMask gasless is disabled', async () => {
      jest
        .mocked(smartTransactionsModule.getSmartTransactionCommonParams)
        .mockReturnValue({
          isSmartTransaction: true,
          featureFlags: {
            extensionReturnTxHashAsap: false,
            extensionReturnTxHashAsapBatch: false,
            extensionSkipTransactionStatusPage: false,
            mobileActive: false,
            extensionActive: false,
          },
          isHardwareWalletAccount: false,
        });

      jest
        .mocked(smartTransactionsModule.submitSmartTransactionHook)
        .mockResolvedValue({ transactionHash: '0xstxHash' });

      type PHArgs = Parameters<typeof publishHook>[0];
      const result = await publishHook({
        flatState: {} as PHArgs['flatState'],
        getTransactionMetricsRequest: () =>
          ({
            upsertTransactionUIMetricsFragment: jest
              .fn()
              .mockImplementation(() => {
                throw new Error('metrics error');
              }),
          }) as unknown as ReturnType<PHArgs['getTransactionMetricsRequest']>,
        initMessenger: {
          call: jest.fn(),
        } as unknown as TransactionControllerInitMessenger,
        keyringController: {
          getKeyringForAccount: jest
            .fn()
            .mockResolvedValue({ type: 'Ledger Hardware' }),
        },
        signedTx: '0xsigned',
        smartTransactionsController:
          {} as PHArgs['smartTransactionsController'],
        transactionController: {} as PHArgs['transactionController'],
        transactionMeta: {
          ...mockTransactionMeta,
          isGasFeeSponsored: true,
        },
      });

      expect(result).toStrictEqual({ transactionHash: undefined });
      expect(
        jest.mocked(smartTransactionsModule.submitSmartTransactionHook),
      ).not.toHaveBeenCalled();
    });
  });

  describe('publishBatch hook', () => {
    const mockTransactionMeta: TransactionMeta = {
      id: 'batch-tx-last',
      chainId: CHAIN_ID_MOCK,
      status: TransactionStatus.approved,
      time: Date.now(),
      txParams: {
        from: '0x0000000000000000000000000000000000000000',
      },
      networkClientId: 'test-network',
    };

    it('returns undefined for upgrade-only 7702 batch transactions', async () => {
      jest
        .mocked(smartTransactionsModule.getSmartTransactionCommonParams)
        .mockReturnValue({
          isSmartTransaction: true,
          featureFlags: {
            extensionReturnTxHashAsap: false,
            extensionReturnTxHashAsapBatch: false,
            extensionSkipTransactionStatusPage: false,
            mobileActive: false,
            extensionActive: false,
          },
          isHardwareWalletAccount: false,
        });

      const transactionMeta = {
        ...mockTransactionMeta,
        txParams: {
          from: '0x0000000000000000000000000000000000000000',
          authorizationList: [
            { address: '0x1234567890123456789012345678901234567890' },
          ],
          data: '0x',
        },
        selectedGasFeeToken: undefined,
        gasFeeTokens: [],
        isGasFeeIncluded: false,
        isGasFeeSponsored: false,
      } as unknown as TransactionMeta;

      const transactionControllerMock = {
        state: {
          transactions: [transactionMeta],
        },
      } as unknown as TransactionController;

      const result = await publishBatchHook({
        transactionController: transactionControllerMock,
        smartTransactionsController: {} as never,
        hookControllerMessenger: {} as never,
        flatState: {} as never,
        transactions: [
          {
            id: transactionMeta.id,
            signedTx: '0xsigned',
          } as PublishBatchHookTransaction,
        ],
      });

      expect(result).toBeUndefined();
      expect(
        jest.mocked(smartTransactionsModule.submitBatchSmartTransactionHook),
      ).not.toHaveBeenCalled();
    });

    it('does not publish batch via sentinel_stx when MetaMask gasless is disabled', async () => {
      jest
        .mocked(smartTransactionsModule.getSmartTransactionCommonParams)
        .mockReturnValue({
          isSmartTransaction: true,
          featureFlags: {
            extensionReturnTxHashAsap: false,
            extensionReturnTxHashAsapBatch: false,
            extensionSkipTransactionStatusPage: false,
            mobileActive: false,
            extensionActive: false,
          },
          isHardwareWalletAccount: false,
        });

      jest
        .mocked(smartTransactionsModule.submitBatchSmartTransactionHook)
        .mockResolvedValue({ results: [] });

      const upsertFragmentMock = jest.fn();
      const requestMock = buildInitRequestMock();
      requestMock.getTransactionMetricsRequest.mockReturnValue({
        upsertTransactionUIMetricsFragment: upsertFragmentMock,
      } as unknown as ReturnType<
        typeof requestMock.getTransactionMetricsRequest
      >);

      TransactionControllerInit(requestMock);

      const { hooks } = transactionControllerClassMock.mock.calls[0][0];
      const controllerInstance =
        transactionControllerClassMock.mock.instances[0];
      // @ts-expect-error Partial mock state
      controllerInstance.state = {
        transactions: [mockTransactionMeta],
      };

      const result = await hooks?.publishBatch?.({
        transactions: [
          { id: 'batch-tx-1' } as unknown as PublishBatchHookTransaction,
          { id: 'batch-tx-last' } as unknown as PublishBatchHookTransaction,
        ],
      } as unknown as PublishBatchHookRequest);

      expect(result).toBeUndefined();
      expect(upsertFragmentMock).not.toHaveBeenCalled();
      expect(
        jest.mocked(smartTransactionsModule.submitBatchSmartTransactionHook),
      ).not.toHaveBeenCalled();
    });

    it('skips upsertTransactionUIMetricsFragment for batch txs without an id when MetaMask gasless is disabled', async () => {
      jest
        .mocked(smartTransactionsModule.getSmartTransactionCommonParams)
        .mockReturnValue({
          isSmartTransaction: true,
          featureFlags: {
            extensionReturnTxHashAsap: false,
            extensionReturnTxHashAsapBatch: false,
            extensionSkipTransactionStatusPage: false,
            mobileActive: false,
            extensionActive: false,
          },
          isHardwareWalletAccount: false,
        });

      jest
        .mocked(smartTransactionsModule.submitBatchSmartTransactionHook)
        .mockResolvedValue({ results: [] });

      const upsertFragmentMock = jest.fn();
      const requestMock = buildInitRequestMock();
      requestMock.getTransactionMetricsRequest.mockReturnValue({
        upsertTransactionUIMetricsFragment: upsertFragmentMock,
      } as unknown as ReturnType<
        typeof requestMock.getTransactionMetricsRequest
      >);

      TransactionControllerInit(requestMock);

      const { hooks } = transactionControllerClassMock.mock.calls[0][0];
      const controllerInstance =
        transactionControllerClassMock.mock.instances[0];
      // @ts-expect-error Partial mock state
      controllerInstance.state = {
        transactions: [mockTransactionMeta],
      };

      const result = await hooks?.publishBatch?.({
        transactions: [
          {} as unknown as PublishBatchHookTransaction,
          { id: 'batch-tx-last' } as unknown as PublishBatchHookTransaction,
        ],
      } as unknown as PublishBatchHookRequest);

      expect(result).toBeUndefined();
      expect(upsertFragmentMock).not.toHaveBeenCalled();
      expect(
        jest.mocked(smartTransactionsModule.submitBatchSmartTransactionHook),
      ).not.toHaveBeenCalled();
    });

    it('does not call upsertTransactionUIMetricsFragment when publishBatchHook returns undefined', async () => {
      jest
        .mocked(smartTransactionsModule.getSmartTransactionCommonParams)
        .mockReturnValue({
          isSmartTransaction: false,
          featureFlags: {
            extensionReturnTxHashAsap: false,
            extensionReturnTxHashAsapBatch: false,
            extensionSkipTransactionStatusPage: false,
            mobileActive: false,
            extensionActive: false,
          },
          isHardwareWalletAccount: false,
        });

      const upsertFragmentMock = jest.fn();
      const requestMock = buildInitRequestMock();
      requestMock.getTransactionMetricsRequest.mockReturnValue({
        upsertTransactionUIMetricsFragment: upsertFragmentMock,
      } as unknown as ReturnType<
        typeof requestMock.getTransactionMetricsRequest
      >);

      TransactionControllerInit(requestMock);

      const { hooks } = transactionControllerClassMock.mock.calls[0][0];
      const controllerInstance =
        transactionControllerClassMock.mock.instances[0];
      // @ts-expect-error Partial mock state
      controllerInstance.state = {
        transactions: [mockTransactionMeta],
      };

      await hooks?.publishBatch?.({
        transactions: [
          { id: 'batch-tx-last' } as unknown as PublishBatchHookTransaction,
        ],
      } as unknown as PublishBatchHookRequest);

      expect(upsertFragmentMock).not.toHaveBeenCalled();
    });

    it('returns the result even if getTransactionMetricsRequest throws', async () => {
      jest
        .mocked(smartTransactionsModule.getSmartTransactionCommonParams)
        .mockReturnValue({
          isSmartTransaction: true,
          featureFlags: {
            extensionReturnTxHashAsap: false,
            extensionReturnTxHashAsapBatch: false,
            extensionSkipTransactionStatusPage: false,
            mobileActive: false,
            extensionActive: false,
          },
          isHardwareWalletAccount: false,
        });

      const expectedResult = { results: [] };
      jest
        .mocked(smartTransactionsModule.submitBatchSmartTransactionHook)
        .mockResolvedValue(expectedResult);

      const requestMock = buildInitRequestMock();
      // getTransactionMetricsRequest is called once eagerly during init
      // (addTransactionControllerListeners); let that succeed, then throw on
      // the hook invocation to cover the try-catch guard.
      requestMock.getTransactionMetricsRequest
        .mockReturnValueOnce(
          {} as unknown as ReturnType<
            typeof requestMock.getTransactionMetricsRequest
          >,
        )
        .mockImplementation(() => {
          throw new Error('metrics request error');
        });

      TransactionControllerInit(requestMock);

      const { hooks } = transactionControllerClassMock.mock.calls[0][0];
      const controllerInstance =
        transactionControllerClassMock.mock.instances[0];
      // @ts-expect-error Partial mock state
      controllerInstance.state = {
        transactions: [mockTransactionMeta],
      };

      const result = await hooks?.publishBatch?.({
        transactions: [
          { id: 'batch-tx-last' } as unknown as PublishBatchHookTransaction,
        ],
      } as unknown as PublishBatchHookRequest);

      expect(result).toStrictEqual(expectedResult);
    });

    it('returns the result even if upsertTransactionUIMetricsFragment throws', async () => {
      jest
        .mocked(smartTransactionsModule.getSmartTransactionCommonParams)
        .mockReturnValue({
          isSmartTransaction: true,
          featureFlags: {
            extensionReturnTxHashAsap: false,
            extensionReturnTxHashAsapBatch: false,
            extensionSkipTransactionStatusPage: false,
            mobileActive: false,
            extensionActive: false,
          },
          isHardwareWalletAccount: false,
        });

      const expectedResult = { results: [] };
      jest
        .mocked(smartTransactionsModule.submitBatchSmartTransactionHook)
        .mockResolvedValue(expectedResult);

      const requestMock = buildInitRequestMock();
      requestMock.getTransactionMetricsRequest.mockReturnValue({
        upsertTransactionUIMetricsFragment: jest.fn().mockImplementation(() => {
          throw new Error('metrics error');
        }),
      } as unknown as ReturnType<
        typeof requestMock.getTransactionMetricsRequest
      >);

      TransactionControllerInit(requestMock);

      const { hooks } = transactionControllerClassMock.mock.calls[0][0];
      const controllerInstance =
        transactionControllerClassMock.mock.instances[0];
      // @ts-expect-error Partial mock state
      controllerInstance.state = {
        transactions: [mockTransactionMeta],
      };

      const result = await hooks?.publishBatch?.({
        transactions: [
          { id: 'batch-tx-last' } as unknown as PublishBatchHookTransaction,
        ],
      } as unknown as PublishBatchHookRequest);

      expect(result).toStrictEqual(expectedResult);
    });
  });
});
