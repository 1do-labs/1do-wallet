import { KnownCaipNamespace } from '@metamask/utils';
import { getCaipNamespaceFromAddress } from './accounts';

describe('multichain accounts', () => {
  describe('getCaipNamespaceFromAddress', () => {
    it('returns Eip155 for EVM addresses', () => {
      expect(
        getCaipNamespaceFromAddress(
          '0x6431726EEE67570BF6f0Cf892aE0a3988F03903F',
        ),
      ).toBe(KnownCaipNamespace.Eip155);
    });

    it('defaults to Eip155 for unsupported address formats', () => {
      expect(getCaipNamespaceFromAddress('unsupported-address')).toBe(
        KnownCaipNamespace.Eip155,
      );
    });
  });
});
