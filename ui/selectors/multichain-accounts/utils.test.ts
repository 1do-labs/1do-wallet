import { AccountGroupId } from '@metamask/account-api';
import { getSanitizedChainId, extractWalletIdFromGroupId } from './utils';

describe('Account tree selectors utils', () => {
  describe('getSanitizedChainId', () => {
    it('should return the chain ID if it is not an EIP-155 chain ID', () => {
      expect(getSanitizedChainId('unknown:mainnet')).toBe('unknown:mainnet');
    });

    it('should return the chain ID if it is an EIP-155 chain ID', () => {
      expect(getSanitizedChainId('eip155:1')).toBe('eip155:0');
    });
  });

  describe('extractWalletIdFromGroupId', () => {
    describe('entropy wallet IDs', () => {
      it('extracts wallet ID from entropy format', () => {
        const accountGroupId =
          'entropy:01K1100EDPEV57BY4136X5CBEJ/1' as AccountGroupId;
        const result = extractWalletIdFromGroupId(accountGroupId);
        expect(result).toBe('entropy:01K1100EDPEV57BY4136X5CBEJ');
      });
    });

    describe('keyring wallet IDs', () => {
      it('extracts wallet ID from keyring format', () => {
        const accountGroupId = 'keyring:Ledger Hardware/1' as AccountGroupId;
        const result = extractWalletIdFromGroupId(accountGroupId);
        expect(result).toBe('keyring:Ledger Hardware');
      });
    });

    describe('invalid input handling', () => {
      it('throws an error when accountGroupId is null', () => {
        expect(() =>
          extractWalletIdFromGroupId(null as unknown as AccountGroupId),
        ).toThrow('Account group ID is required');
      });

      it('throws an error when accountGroupId is undefined', () => {
        expect(() =>
          extractWalletIdFromGroupId(undefined as unknown as AccountGroupId),
        ).toThrow('Account group ID is required');
      });

      it('throws an error when accountGroupId is an empty string', () => {
        expect(() => extractWalletIdFromGroupId('' as AccountGroupId)).toThrow(
          'Account group ID is required',
        );
      });
    });
  });
});
