import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
  caip25CaveatBuilder,
} from '@metamask/chain-agnostic-permission';
import {
  getCaveatSpecifications,
  getPermissionSpecifications,
  unrestrictedMethods,
} from './specifications';

// Note: This causes Date.now() to return the number 1.
jest.useFakeTimers().setSystemTime(1);

describe('PermissionController specifications', () => {
  describe('caveat specifications', () => {
    it('getCaveatSpecifications returns the expected specifications object', () => {
      const caveatSpecifications = getCaveatSpecifications(
        {} as Parameters<typeof caip25CaveatBuilder>[0],
      );
      expect(Object.keys(caveatSpecifications)).toHaveLength(1);
      expect(caveatSpecifications[Caip25CaveatType].type).toStrictEqual(
        Caip25CaveatType,
      );
    });
  });

  describe('permission specifications', () => {
    it('getPermissionSpecifications returns the expected specifications object', () => {
      const permissionSpecifications = getPermissionSpecifications();
      expect(Object.keys(permissionSpecifications)).toHaveLength(1);
      expect(
        permissionSpecifications[Caip25EndowmentPermissionName].targetName,
      ).toStrictEqual('endowment:caip25');
    });
  });

  describe('unrestricted methods', () => {
    it('defines the unrestricted methods', () => {
      expect(Array.isArray(unrestrictedMethods)).toBe(true);
      expect(Object.isFrozen(unrestrictedMethods)).toBe(true);
    });
  });
});
