import { AccountGroupType } from '@metamask/account-api';
import { EthScope } from '@metamask/keyring-api';
import type { CaipChainId } from '@metamask/utils';
// eslint-disable-next-line import-x/no-restricted-paths
import type { AccountGroupWithInternalAccounts } from '../../../ui/selectors/multichain-accounts/account-tree.types';
import {
  anyScopesMatch,
  getCaip25AccountIdsFromAccountGroupAndScope,
  hasChainIdSupport,
  hasNamespaceSupport,
  scopeMatches,
  toEvmCaipAccountId,
} from './scope-utils';

const EVM_ADDRESS = '0x1234567890123456789012345678901234567890';
const POLYGON_ADDRESS = '0x2345678901234567890123456789012345678901';

const createAccount = (address: string, scopes: `${string}:${string}`[]) => ({
  id: address,
  address,
  metadata: {
    name: 'Account',
    keyring: { type: 'HD Key Tree' },
    importTime: 0,
  },
  options: {},
  methods: [],
  scopes,
  type: 'eip155:eoa' as const,
});

const accountGroups: AccountGroupWithInternalAccounts[] = [
  {
    id: 'entropy:wallet/0',
    type: AccountGroupType.MultichainAccount,
    metadata: {
      name: 'Group',
      pinned: false,
      hidden: false,
      entropy: { groupIndex: 0 },
      lastSelected: 0,
    },
    walletName: 'Wallet',
    walletId: 'entropy:wallet',
    accounts: [
      createAccount(EVM_ADDRESS, [EthScope.Eoa]),
      createAccount(POLYGON_ADDRESS, ['eip155:137']),
    ],
  },
];

describe('scope-utils', () => {
  describe('anyScopesMatch', () => {
    it('matches exact EVM scopes', () => {
      expect(anyScopesMatch(['eip155:1'], 'eip155:1')).toBe(true);
      expect(anyScopesMatch(['eip155:1'], 'eip155:137')).toBe(false);
    });

    it('treats eip155:0 as the EVM wildcard', () => {
      expect(anyScopesMatch([EthScope.Eoa], 'eip155:1')).toBe(true);
      expect(anyScopesMatch(['eip155:1'], EthScope.Eoa)).toBe(true);
      expect(anyScopesMatch(['unknown:1'], EthScope.Eoa)).toBe(false);
    });

    it('returns false for empty or invalid scopes', () => {
      expect(anyScopesMatch([], 'eip155:1')).toBe(false);
      expect(anyScopesMatch(['eip155:1'], 'invalid')).toBe(false);
    });
  });

  describe('scopeMatches', () => {
    it('delegates single-scope matching to anyScopesMatch', () => {
      expect(scopeMatches(EthScope.Eoa, 'eip155:1')).toBe(true);
      expect(scopeMatches('eip155:1', 'eip155:137')).toBe(false);
    });
  });

  describe('hasChainIdSupport', () => {
    it('returns true when any requested EVM chain is supported', () => {
      expect(
        hasChainIdSupport([EthScope.Eoa], ['eip155:137' as CaipChainId]),
      ).toBe(true);
      expect(
        hasChainIdSupport(['eip155:1'], ['eip155:137' as CaipChainId]),
      ).toBe(false);
    });
  });

  describe('hasNamespaceSupport', () => {
    it('returns true for the EVM namespace only when an EVM scope exists', () => {
      expect(hasNamespaceSupport([EthScope.Eoa], new Set(['eip155']))).toBe(
        true,
      );
      expect(hasNamespaceSupport(['unknown:1'], new Set(['eip155']))).toBe(
        false,
      );
    });
  });

  describe('getCaip25AccountIdsFromAccountGroupAndScope', () => {
    it('returns CAIP-25 account IDs for matching EVM scopes', () => {
      expect(
        getCaip25AccountIdsFromAccountGroupAndScope(accountGroups, [
          'eip155:1' as CaipChainId,
          'eip155:137' as CaipChainId,
        ]),
      ).toStrictEqual([
        `eip155:1:${EVM_ADDRESS}`,
        `eip155:137:${EVM_ADDRESS}`,
        `eip155:137:${POLYGON_ADDRESS}`,
      ]);
    });
  });

  describe('toEvmCaipAccountId', () => {
    it('formats an EVM CAIP account ID', () => {
      expect(toEvmCaipAccountId('eip155:1', EVM_ADDRESS)).toBe(
        `eip155:1:${EVM_ADDRESS}`,
      );
    });
  });
});
