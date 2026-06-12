import { AccountWalletId, AccountWalletType } from '@metamask/account-api';
import { stripWalletTypePrefixFromWalletId } from './utils';

describe('Multichain accounts hook utils', () => {
  describe('stripWalletTypePrefixFromWalletId', () => {
    it('should handle wallet IDs with multiple colons', () => {
      const walletId: AccountWalletId = 'keyring:Ledger Hardware:Main';
      const result = stripWalletTypePrefixFromWalletId(walletId);

      expect(result).toBe('Ledger Hardware:Main');
    });

    it('should return the original string if no type prefix is present', () => {
      const walletId = '01K1FTF5X0KT76Q2XCPVZ75QE3' as AccountWalletId;
      const result = stripWalletTypePrefixFromWalletId(walletId);

      expect(result).toBe('01K1FTF5X0KT76Q2XCPVZ75QE3');
    });

    it('should return an empty string if the input is an empty string', () => {
      const walletId = '' as AccountWalletId;
      const result = stripWalletTypePrefixFromWalletId(walletId);

      expect(result).toBe('');
    });

    it('should handle wallet ID with colon at the beginning', () => {
      const walletId = ':01K1FTF5X0KT76Q2XCPVZ75QE3' as AccountWalletId;
      const result = stripWalletTypePrefixFromWalletId(walletId);

      expect(result).toBe('01K1FTF5X0KT76Q2XCPVZ75QE3');
    });

    it('should work with all known AccountWalletType values', () => {
      const entropyWalletId: AccountWalletId = `${AccountWalletType.Entropy}:01K1FTF5X0KT76Q2XCPVZ75QE3`;
      const keyringWalletId: AccountWalletId = `${AccountWalletType.Keyring}:Ledger Hardware`;

      expect(stripWalletTypePrefixFromWalletId(entropyWalletId)).toBe(
        '01K1FTF5X0KT76Q2XCPVZ75QE3',
      );
      expect(stripWalletTypePrefixFromWalletId(keyringWalletId)).toBe(
        'Ledger Hardware',
      );
    });
  });
});
