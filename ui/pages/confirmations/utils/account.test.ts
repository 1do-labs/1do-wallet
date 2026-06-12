import { InternalAccount } from '@metamask/keyring-internal-api';
import { isEVMAccountForSend } from './account';

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
        type: 'unknown:account',
        address: 'unknown-address',
        metadata: {},
        methods: [],
        options: {},
        scopes: ['unknown:scope'],
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
        scopes: ['unknown:scope', 'custom:scope'],
      } as unknown as InternalAccount;
      expect(isEVMAccountForSend(account)).toBe(false);
    });
  });
});
