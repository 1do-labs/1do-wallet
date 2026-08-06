import { TransactionStatus } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import {
  getOneDoSmartAccountIsActive,
  getPendingOneDoUpgradeTransaction,
  ONE_DO_7702_DELEGATE,
} from './useOneDoSmartAccountStatus';

const MOCK_ADDRESS = '0x0123456789012345678901234567890123456789' as Hex;
const MOCK_CHAIN_ID = '0xaa36a7' as Hex;

const mockIsAtomicBatchSupported = jest.fn();
jest.mock('../../store/controller-actions/transaction-controller', () => ({
  isAtomicBatchSupported: (...args: unknown[]) =>
    mockIsAtomicBatchSupported(...args),
}));

describe('getOneDoSmartAccountIsActive', () => {
  beforeEach(() => {
    mockIsAtomicBatchSupported.mockResolvedValue([
      {
        chainId: MOCK_CHAIN_ID,
        delegationAddress: undefined,
      },
    ]);
  });

  it('returns true when the chain is delegated to 1Do', async () => {
    mockIsAtomicBatchSupported.mockResolvedValue([
      {
        chainId: MOCK_CHAIN_ID,
        delegationAddress: ONE_DO_7702_DELEGATE,
      },
    ]);

    const isActive = await getOneDoSmartAccountIsActive({
      address: MOCK_ADDRESS,
      chainId: MOCK_CHAIN_ID,
      getDelegationAddress: jest.fn().mockResolvedValue(undefined),
    });

    expect(isActive).toBe(true);
  });

  it('uses the account code fallback when it delegates to 1Do', async () => {
    const isActive = await getOneDoSmartAccountIsActive({
      address: MOCK_ADDRESS,
      chainId: MOCK_CHAIN_ID,
      getDelegationAddress: jest.fn().mockResolvedValue(ONE_DO_7702_DELEGATE),
    });

    expect(isActive).toBe(true);
  });

  it('returns false when account code delegates to a different runtime', async () => {
    const isActive = await getOneDoSmartAccountIsActive({
      address: MOCK_ADDRESS,
      chainId: MOCK_CHAIN_ID,
      getDelegationAddress: jest
        .fn()
        .mockResolvedValue('0x6e9e00000000000000000000000000000000eef0'),
    });

    expect(isActive).toBe(false);
  });

  it('returns false when the Core deployment is not trusted', async () => {
    const isActive = await getOneDoSmartAccountIsActive({
      address: MOCK_ADDRESS,
      chainId: MOCK_CHAIN_ID,
      getDelegationAddress: jest.fn().mockResolvedValue(ONE_DO_7702_DELEGATE),
      getRuntimeDeploymentStatus: jest
        .fn()
        .mockResolvedValue({ status: 'untrusted' }),
    });

    expect(isActive).toBe(false);
  });
});

describe('getPendingOneDoUpgradeTransaction', () => {
  it('returns the newest pending 1Do upgrade transaction for the address and chain', () => {
    const newestTransaction = {
      id: 'newest',
      chainId: MOCK_CHAIN_ID,
      status: TransactionStatus.submitted,
      time: 2,
      txParams: {
        from: MOCK_ADDRESS,
        authorizationList: [{ address: ONE_DO_7702_DELEGATE }],
      },
    };

    expect(
      getPendingOneDoUpgradeTransaction({
        transactions: [
          {
            id: 'oldest',
            chainId: MOCK_CHAIN_ID,
            status: TransactionStatus.unapproved,
            time: 1,
            txParams: {
              from: MOCK_ADDRESS,
              authorizationList: [{ address: ONE_DO_7702_DELEGATE }],
            },
          },
          {
            id: 'other-delegate',
            chainId: MOCK_CHAIN_ID,
            status: TransactionStatus.submitted,
            time: 3,
            txParams: {
              from: MOCK_ADDRESS,
              authorizationList: [
                { address: '0x1111111111111111111111111111111111111111' },
              ],
            },
          },
          newestTransaction,
        ] as never,
        address: MOCK_ADDRESS,
        chainId: MOCK_CHAIN_ID,
      })?.id,
    ).toBe(newestTransaction.id);
  });
});
