import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  isBitcoinAccountForSend,
  isEVMAccountForSend,
  isSolanaAccountForSend,
  isTronAccountForSend,
} from './account';

describe('Account Send Utils', () => {
  describe('isEVMAccountForSend', () => {
    it('returns false when account is null', () => {
      expect(isEVMAccountForSend(null as unknown as InternalAccount)).toBe(
        false,
      );
    });

    it('returns false when account is undefined', () => {
      expect(isEVMAccountForSend(undefined as unknown as InternalAccount)).toBe(
        false,
      );
    });

    it('returns true when account type starts with eip155:', () => {
      const account = {
        id: 'test-id',
        type: 'eip155:ethereum',
        address: '0x123',
        metadata: {},
        methods: [],
        options: {},
      } as unknown as InternalAccount;
      expect(isEVMAccountForSend(account)).toBe(true);
    });

    it('returns true when account has eip155 scope', () => {
      const account = {
        id: 'test-id',
        type: 'other:type',
        address: '0x123',
        metadata: {},
        methods: [],
        options: {},
        scopes: ['eip155:1', 'other:scope'],
      } as unknown as InternalAccount;
      expect(isEVMAccountForSend(account)).toBe(true);
    });

    it('returns false when account type does not start with eip155 and has no eip155 scopes', () => {
      const account = {
        id: 'test-id',
        type: 'solana:mainnet',
        address: 'solana-address',
        metadata: {},
        methods: [],
        options: {},
        scopes: ['solana:mainnet'],
      } as unknown as InternalAccount;
      expect(isEVMAccountForSend(account)).toBe(false);
    });

    it('returns false when account has no type or scopes', () => {
      const account = {
        id: 'test-id',
        type: '',
        address: '0x123',
        metadata: {},
        methods: [],
        options: {},
      } as unknown as InternalAccount;
      expect(isEVMAccountForSend(account)).toBe(false);
    });

    it('returns false when account has scopes but none start with eip155', () => {
      const account = {
        id: 'test-id',
        type: 'other:type',
        address: '0x123',
        metadata: {},
        methods: [],
        options: {},
        scopes: ['solana:mainnet', 'bitcoin:mainnet'],
      } as unknown as InternalAccount;
      expect(isEVMAccountForSend(account)).toBe(false);
    });
  });

  describe('isSolanaAccountForSend', () => {
    it('returns false when account is null', () => {
      expect(isSolanaAccountForSend(null as unknown as InternalAccount)).toBe(
        false,
      );
    });

    it('returns false when account is undefined', () => {
      expect(
        isSolanaAccountForSend(undefined as unknown as InternalAccount),
      ).toBe(false);
    });

    it('returns false when account type does not start with solana and has no solana scopes', () => {
      const account = {
        id: 'test-id',
        type: 'eip155:ethereum',
        address: '0x123',
        metadata: {},
        methods: [],
        options: {},
        scopes: ['eip155:1'],
      } as unknown as InternalAccount;
      expect(isSolanaAccountForSend(account)).toBe(false);
    });

    it('returns false when account has no type or scopes', () => {
      const account = {
        id: 'test-id',
        type: '',
        address: 'test-address',
        metadata: {},
        methods: [],
        options: {},
      } as unknown as InternalAccount;
      expect(isSolanaAccountForSend(account)).toBe(false);
    });

    it('returns false when account has scopes but none start with solana', () => {
      const account = {
        id: 'test-id',
        type: 'other:type',
        address: 'test-address',
        metadata: {},
        methods: [],
        options: {},
        scopes: ['eip155:1', 'bitcoin:mainnet'],
      } as unknown as InternalAccount;
      expect(isSolanaAccountForSend(account)).toBe(false);
    });
  });

  describe('isBitcoinAccountForSend', () => {
    it('returns false when account is null', () => {
      expect(isBitcoinAccountForSend(null as unknown as InternalAccount)).toBe(
        false,
      );
    });

    it('returns false when account is undefined', () => {
      expect(
        isBitcoinAccountForSend(undefined as unknown as InternalAccount),
      ).toBe(false);
    });

    it('returns false when account type does not start with bip122 and has no bip122 scopes', () => {
      const account = {
        id: 'test-id',
        type: 'eip155:ethereum',
        address: '0x123',
        metadata: {},
        methods: [],
        options: {},
        scopes: ['eip155:1'],
      } as unknown as InternalAccount;
      expect(isBitcoinAccountForSend(account)).toBe(false);
    });

    it('returns false when account has no type or scopes', () => {
      const account = {
        id: 'test-id',
        type: '',
        address: 'test-address',
        metadata: {},
        methods: [],
        options: {},
      } as unknown as InternalAccount;
      expect(isBitcoinAccountForSend(account)).toBe(false);
    });

    it('returns false when account has scopes but none start with bip122', () => {
      const account = {
        id: 'test-id',
        type: 'other:type',
        address: 'test-address',
        metadata: {},
        methods: [],
        options: {},
        scopes: ['eip155:1', 'solana:mainnet'],
      } as unknown as InternalAccount;
      expect(isBitcoinAccountForSend(account)).toBe(false);
    });
  });

  describe('isTronAccountForSend', () => {
    it('returns false when account is null', () => {
      expect(isTronAccountForSend(null as unknown as InternalAccount)).toBe(
        false,
      );
    });

    it('returns false when account is undefined', () => {
      expect(isTronAccountForSend(undefined as unknown as InternalAccount)).toBe(
        false,
      );
    });

    it('returns false for EVM accounts', () => {
      const account = {
        id: 'test-id',
        type: 'eip155:ethereum',
        address: '0x123',
        metadata: {},
        methods: [],
        options: {},
        scopes: ['eip155:1'],
      } as unknown as InternalAccount;
      expect(isTronAccountForSend(account)).toBe(false);
    });
  });
});
