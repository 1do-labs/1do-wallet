import {
  getProductionRemoteFlagApiResponse,
  getProductionRemoteFlagDefaults,
} from './feature-flag-registry';
import { compareProductionFlagsToRegistry } from './sync-production-flags';

describe('compareProductionFlagsToRegistry', () => {
  it('detects new flags in production not in registry', () => {
    const registryMap = { enableMultichainAccounts: true };
    const prodResponse = [
      { enableMultichainAccounts: true },
      { brandNewFlag: { enabled: true } },
    ];
    const result = compareProductionFlagsToRegistry(prodResponse, registryMap);

    expect(result.newInProduction).toContainEqual({
      name: 'brandNewFlag',
      value: { enabled: true },
    });
    expect(result.hasDrift).toBe(true);
  });

  it('detects value mismatches between registry and production', () => {
    const registryMap = { enableMultichainAccounts: true, sendRedesign: false };
    const prodResponse = [
      { enableMultichainAccounts: false },
      { sendRedesign: false },
    ];
    const result = compareProductionFlagsToRegistry(prodResponse, registryMap);

    const multichainMismatch = result.valueMismatches.find(
      (m) => m.name === 'enableMultichainAccounts',
    );
    expect(multichainMismatch).toBeDefined();
    expect(multichainMismatch?.productionValue).toBe(false);
    expect(multichainMismatch?.registryValue).toBe(true);
    expect(result.hasDrift).toBe(true);
  });

  it('detects flags in registry no longer in production', () => {
    const registryMap = { someRemovedFlag: true };
    const prodResponse: Record<string, unknown>[] = [];
    const result = compareProductionFlagsToRegistry(prodResponse, registryMap);

    expect(result.removedFromProduction).toContainEqual({
      name: 'someRemovedFlag',
      registryValue: true,
    });
    expect(result.hasDrift).toBe(true);
  });

  it('returns hasDrift false when production matches registry', () => {
    const registryMap = getProductionRemoteFlagDefaults() as Record<
      string,
      unknown
    >;
    const prodResponse = getProductionRemoteFlagApiResponse() as Record<
      string,
      unknown
    >[];

    const result = compareProductionFlagsToRegistry(prodResponse, registryMap);

    expect(result.newInProduction).toHaveLength(0);
    expect(result.removedFromProduction).toHaveLength(0);
    expect(result.valueMismatches).toHaveLength(0);
    expect(result.inProdMismatches).toHaveLength(0);
    expect(result.hasDrift).toBe(false);
  });

  it('detects inProd mismatch when flag exists with inProd false but is in production', () => {
    const registryMap = {}; // Filtered registry excludes inProd: false
    const prodResponse = [{ staleInProdFlag: true }];
    const fullRegistryOverride = { staleInProdFlag: { inProd: false } };

    const result = compareProductionFlagsToRegistry(
      prodResponse,
      registryMap,
      fullRegistryOverride,
    );

    expect(result.inProdMismatches).toContainEqual({
      name: 'staleInProdFlag',
      productionValue: true,
    });
    expect(result.newInProduction).toHaveLength(0);
    expect(result.hasDrift).toBe(true);
  });

  it('skips excluded flags (e.g. extensionUpdatePromptMinimumVersion)', () => {
    const registryMap = { extensionUpdatePromptMinimumVersion: '1.0.0' };
    const prodResponse = [{ extensionUpdatePromptMinimumVersion: '13.21.0' }];
    const result = compareProductionFlagsToRegistry(prodResponse, registryMap);

    expect(result.valueMismatches).toHaveLength(0);
    expect(result.newInProduction).toHaveLength(0);
    expect(result.removedFromProduction).toHaveLength(0);
    expect(result.inProdMismatches).toHaveLength(0);
    expect(result.hasDrift).toBe(false);
  });

  it('parses production API format (array of single-key objects)', () => {
    const registryMap = {};
    const prodResponse = [
      { flagA: true },
      { flagB: { nested: 'value' } },
      { flagC: [1, 2, 3] },
    ];
    const result = compareProductionFlagsToRegistry(prodResponse, registryMap);

    expect(result.newInProduction).toContainEqual({
      name: 'flagA',
      value: true,
    });
    expect(result.newInProduction).toContainEqual({
      name: 'flagB',
      value: { nested: 'value' },
    });
    expect(result.newInProduction).toContainEqual({
      name: 'flagC',
      value: [1, 2, 3],
    });
  });
});
