import { InternalAccount } from '@metamask/keyring-internal-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { createMockInternalAccount } from '../../../test/jest/mocks';
import mockDefaultState from '../../../test/data/mock-state.json';
import { getShouldShowSeedPhraseReminder } from './multi-srp';

const mockGetSelectedAccountTokensAcrossChains = jest.fn();
const mockGetCrossChainMetaMaskCachedBalances = jest.fn();
const mockGetMultichainAggregatedBalance = jest.fn().mockReturnValue(100);

jest.mock('../assets', () => ({
  ...jest.requireActual('../assets'),
  getMultichainAggregatedBalance: () => mockGetMultichainAggregatedBalance(),
}));

jest.mock('../selectors.js', () => ({
  ...jest.requireActual('../selectors.js'),
  getCrossChainMetaMaskCachedBalances: () =>
    mockGetCrossChainMetaMaskCachedBalances(),
  getSelectedAccountTokensAcrossChains: () =>
    mockGetSelectedAccountTokensAcrossChains(),
}));

const mockKeyringId = '01JPS8BCFZ61F7TK5ER6EXAENK';
const mockKeyringIdFromSecondSrp = '01JPS8EXTH409MX8QEG3WYSEW6';
const mockKeyringIdForPrivateKeyAccount = '01JPS8F2DDHXW24TC70Z6KQJ2W';
const mockHdAccount = createMockInternalAccount();
const mockHdAccountFromSecondSrp = createMockInternalAccount({
  address: '0xF329D1a8a569787e98ac50d5c394f4F5B1444446',
});
const mockPrivateKeyAccount = createMockInternalAccount({
  address: '0x25857581920e2A520c6507f2a2C2b53b2b75E1C9',
  keyringType: KeyringTypes.simple,
});

const generateMockState = ({
  account,
  seedPhraseBackedUp,
  dismissSeedBackUpReminder,
  nativeBalance = 100,
  tokenBalance = 100,
  nonEvmBalance = 100,
}: {
  account: InternalAccount;
  seedPhraseBackedUp: boolean;
  dismissSeedBackUpReminder: boolean;
  nativeBalance?: number;
  tokenBalance?: number;
  nonEvmBalance?: number;
}) => {
  const state = {
    ...mockDefaultState,
    metamask: {
      ...mockDefaultState.metamask,
      internalAccounts: {
        accounts: {
          [account.id]: account,
        },
        selectedAccount: account.id,
      },
      keyrings: [
        {
          type: KeyringTypes.hd,
          accounts: [mockHdAccount.address],
          metadata: {
            id: mockKeyringId,
            name: '',
          },
        },
        {
          type: KeyringTypes.hd,
          accounts: [mockHdAccountFromSecondSrp.address],
          metadata: {
            id: mockKeyringIdFromSecondSrp,
            name: '',
          },
        },
        {
          type: KeyringTypes.simple,
          accounts: [mockPrivateKeyAccount.address],
          metadata: {
            id: mockKeyringIdForPrivateKeyAccount,
            name: '',
          },
        },
        {
          type: KeyringTypes.hd,
          accounts: [],
          metadata: {
            id: 'unused-empty-hd-keyring',
            name: '',
          },
        },
      ].filter((keyring) => keyring.accounts.length > 0),
      seedPhraseBackedUp,
      dismissSeedBackUpReminder,
    },
  };

  mockGetSelectedAccountTokensAcrossChains.mockReturnValue({
    '0xaa36a7': [
      {
        address: account.address,
        balance: String(tokenBalance),
      },
    ],
  });
  mockGetCrossChainMetaMaskCachedBalances.mockReturnValue({
    '0xaa36a7': {
      [account.address]: String(nativeBalance),
    },
  });

  mockGetMultichainAggregatedBalance.mockReturnValue(nonEvmBalance);

  return state;
};

describe('Multi SRP Selectors', () => {
  describe('getShouldShowSeedPhraseReminder', () => {
    it('returns true for EVM account with token balance', () => {
      const mockState = generateMockState({
        account: mockHdAccount,
        seedPhraseBackedUp: false,
        dismissSeedBackUpReminder: false,
        nativeBalance: 0,
      });
      const result = getShouldShowSeedPhraseReminder(mockState, mockHdAccount);

      expect(result).toBe(true);
    });

    it('returns true for EVM account with cross chain balance', () => {
      const mockState = generateMockState({
        account: mockHdAccount,
        seedPhraseBackedUp: false,
        dismissSeedBackUpReminder: false,
        tokenBalance: 0,
      });
      const result = getShouldShowSeedPhraseReminder(mockState, mockHdAccount);

      expect(result).toBe(true);
    });

    it('returns false when seedPhraseBackedUp is true', () => {
      const mockState = generateMockState({
        account: mockHdAccount,
        seedPhraseBackedUp: true,
        dismissSeedBackUpReminder: false,
      });

      const result = getShouldShowSeedPhraseReminder(mockState, mockHdAccount);

      expect(result).toBe(false);
    });

    it('returns false when dismissSeedBackUpReminder is true', () => {
      const mockState = generateMockState({
        account: mockHdAccount,
        seedPhraseBackedUp: true,
        dismissSeedBackUpReminder: false,
      });

      const result = getShouldShowSeedPhraseReminder(mockState, mockHdAccount);

      expect(result).toBe(false);
    });

    it('returns false when account has no balance', () => {
      const mockState = generateMockState({
        account: mockHdAccount,
        seedPhraseBackedUp: false,
        dismissSeedBackUpReminder: false,
        nativeBalance: 0,
        tokenBalance: 0,
      });

      const result = getShouldShowSeedPhraseReminder(mockState, mockHdAccount);

      expect(result).toBe(false);
    });

    it('returns false when a secondary Srp account is selected', () => {
      const mockState = generateMockState({
        account: mockHdAccountFromSecondSrp,
        seedPhraseBackedUp: false,
        dismissSeedBackUpReminder: false,
      });

      const result = getShouldShowSeedPhraseReminder(
        mockState,
        mockHdAccountFromSecondSrp,
      );

      expect(result).toBe(false);
    });

    it('returns false when a private key account is selected', () => {
      const mockState = generateMockState({
        account: mockPrivateKeyAccount,
        seedPhraseBackedUp: false,
        dismissSeedBackUpReminder: false,
      });

      const result = getShouldShowSeedPhraseReminder(
        mockState,
        mockPrivateKeyAccount,
      );

      expect(result).toBe(false);
    });

  });
});
