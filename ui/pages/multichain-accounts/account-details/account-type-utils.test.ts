import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  MOCK_ACCOUNT_EOA,
  MOCK_ACCOUNT_ERC4337,
  MOCK_ACCOUNT_HARDWARE,
  MOCK_ACCOUNT_INSTITUTIONAL,
  MOCK_ACCOUNT_PRIVATE_KEY,
} from '../../../../test/data/mock-accounts';
import {
  getAccountTypeCategory,
  isEVMAccount,
  isHardwareAccount,
  isPrivateKeyAccount,
  isInstitutionalEVMAccount,
} from './account-type-utils';

describe('Account Type Utils', () => {
  describe('getAccountTypeCategory', () => {
    it('should return "evm" for EOA accounts', () => {
      expect(getAccountTypeCategory(MOCK_ACCOUNT_EOA)).toBe('evm');
    });

    it('should return "evm" for ERC-4337 accounts', () => {
      expect(getAccountTypeCategory(MOCK_ACCOUNT_ERC4337)).toBe('evm');
    });

    it('should return "institutional" for institutional accounts', () => {
      expect(getAccountTypeCategory(MOCK_ACCOUNT_INSTITUTIONAL)).toBe(
        'institutional',
      );
    });

    it('should return "unknown" for null/undefined accounts', () => {
      expect(getAccountTypeCategory(null as unknown as InternalAccount)).toBe(
        'unknown',
      );
      expect(
        getAccountTypeCategory(undefined as unknown as InternalAccount),
      ).toBe('unknown');
    });
  });

  describe('isEVMAccount', () => {
    it('should return true for EOA accounts', () => {
      expect(isEVMAccount(MOCK_ACCOUNT_EOA)).toBe(true);
    });

    it('should return true for ERC-4337 accounts', () => {
      expect(isEVMAccount(MOCK_ACCOUNT_ERC4337)).toBe(true);
    });

    it('should return false for institutional accounts', () => {
      expect(isEVMAccount(MOCK_ACCOUNT_INSTITUTIONAL)).toBe(false);
    });
  });

  describe('isHardwareAccount', () => {
    it('should return true for hardware accounts', () => {
      expect(isHardwareAccount(MOCK_ACCOUNT_HARDWARE)).toBe(true);
    });

    it('should return false for EOA accounts', () => {
      expect(isHardwareAccount(MOCK_ACCOUNT_EOA)).toBe(false);
    });

    it('should return false for institutional accounts', () => {
      expect(isHardwareAccount(MOCK_ACCOUNT_INSTITUTIONAL)).toBe(false);
    });
  });

  describe('isPrivateKeyAccount', () => {
    it('should return true for private key accounts', () => {
      expect(isPrivateKeyAccount(MOCK_ACCOUNT_PRIVATE_KEY)).toBe(true);
    });

    it('should return false for EOA accounts', () => {
      expect(isPrivateKeyAccount(MOCK_ACCOUNT_EOA)).toBe(false);
    });

    it('should return false for institutional accounts', () => {
      expect(isPrivateKeyAccount(MOCK_ACCOUNT_INSTITUTIONAL)).toBe(false);
    });
  });

  describe('isInstitutionalEVMAccount', () => {
    it('should return true for institutional EVM accounts', () => {
      expect(isInstitutionalEVMAccount(MOCK_ACCOUNT_INSTITUTIONAL)).toBe(true);
    });

    it('should return false for regular EOA accounts', () => {
      expect(isInstitutionalEVMAccount(MOCK_ACCOUNT_EOA)).toBe(false);
    });

    it('should return false for regular ERC-4337 accounts', () => {
      expect(isInstitutionalEVMAccount(MOCK_ACCOUNT_ERC4337)).toBe(false);
    });
  });

});
