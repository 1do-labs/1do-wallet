import { bytesToHex, type Hex } from '@metamask/utils';
import { keccak256 } from 'ethereum-cryptography/keccak';

import type { OneDoRuntimeDeploymentManifest } from './deployment-manifest';
import {
  type RuntimeDeploymentProvider,
  verifyOneDoRuntimeDeployment,
} from './verify-deployment';

const ACCOUNT_ADDRESS = '0x1111111111111111111111111111111111111111';
const REGISTRY_ADDRESS = '0x2222222222222222222222222222222222222222';
const IMPLEMENTATION_ADDRESS = '0x3333333333333333333333333333333333333333';
const IMPLEMENTATION_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const ACCOUNT_CODE = '0x6001600055';
const REGISTRY_PROXY_CODE = '0x6002600055';
const IMPLEMENTATION_CODE = '0x6003600055';

const manifest: OneDoRuntimeDeploymentManifest = {
  accountImplementation: {
    address: ACCOUNT_ADDRESS,
    codeHash: hashCode(ACCOUNT_CODE),
  },
  logicRegistry: {
    address: REGISTRY_ADDRESS,
    codeHash: hashCode(REGISTRY_PROXY_CODE),
    implementationAddress: IMPLEMENTATION_ADDRESS,
    implementationCodeHash: hashCode(IMPLEMENTATION_CODE),
    implementationSlot: IMPLEMENTATION_SLOT,
  },
};

describe('verifyOneDoRuntimeDeployment', () => {
  it('returns trusted when every deployment identity check passes', async () => {
    const provider = createProvider();

    expect(
      await verifyOneDoRuntimeDeployment(provider, manifest),
    ).toStrictEqual({ status: 'trusted' });
  });

  it('returns not_deployed when both deterministic addresses have no code', async () => {
    const provider = createProvider({
      [ACCOUNT_ADDRESS]: '0x',
      [REGISTRY_ADDRESS]: '0x',
    });

    expect(
      await verifyOneDoRuntimeDeployment(provider, manifest),
    ).toStrictEqual({ status: 'not_deployed' });
  });

  it('rejects a partial deployment', async () => {
    const provider = createProvider({ [ACCOUNT_ADDRESS]: '0x' });

    expect(
      await verifyOneDoRuntimeDeployment(provider, manifest),
    ).toStrictEqual({ status: 'untrusted', reason: 'partial_deployment' });
  });

  it('rejects unexpected account implementation code', async () => {
    const provider = createProvider({ [ACCOUNT_ADDRESS]: '0x6004' });

    expect(
      await verifyOneDoRuntimeDeployment(provider, manifest),
    ).toStrictEqual({ status: 'untrusted', reason: 'account_code_mismatch' });
  });

  it('rejects unexpected registry proxy code', async () => {
    const provider = createProvider({ [REGISTRY_ADDRESS]: '0x6004' });

    expect(
      await verifyOneDoRuntimeDeployment(provider, manifest),
    ).toStrictEqual({
      status: 'untrusted',
      reason: 'registry_proxy_code_mismatch',
    });
  });

  it('rejects an unexpected registry implementation address', async () => {
    const provider = createProvider(
      {},
      '0x4444444444444444444444444444444444444444',
    );

    expect(
      await verifyOneDoRuntimeDeployment(provider, manifest),
    ).toStrictEqual({
      status: 'untrusted',
      reason: 'registry_implementation_mismatch',
    });
  });

  it('rejects unexpected registry implementation code', async () => {
    const provider = createProvider({ [IMPLEMENTATION_ADDRESS]: '0x6004' });

    expect(
      await verifyOneDoRuntimeDeployment(provider, manifest),
    ).toStrictEqual({
      status: 'untrusted',
      reason: 'registry_implementation_code_mismatch',
    });
  });

  it('returns unavailable when the RPC request fails', async () => {
    const provider: RuntimeDeploymentProvider = {
      request: jest.fn().mockRejectedValue(new Error('RPC unavailable')),
    };

    expect(
      await verifyOneDoRuntimeDeployment(provider, manifest),
    ).toStrictEqual({ status: 'unavailable', error: 'RPC unavailable' });
  });
});

function createProvider(
  codeOverrides: Record<string, Hex> = {},
  implementationAddress: Hex = IMPLEMENTATION_ADDRESS,
): RuntimeDeploymentProvider {
  const codeByAddress: Record<string, Hex> = {
    [ACCOUNT_ADDRESS]: ACCOUNT_CODE,
    [REGISTRY_ADDRESS]: REGISTRY_PROXY_CODE,
    [IMPLEMENTATION_ADDRESS]: IMPLEMENTATION_CODE,
    ...codeOverrides,
  };

  return {
    request: jest.fn().mockImplementation(({ method, params }) => {
      if (method === 'eth_getCode') {
        return Promise.resolve(codeByAddress[params[0] as string] ?? '0x');
      }

      return Promise.resolve(
        `0x${implementationAddress.slice(2).padStart(64, '0')}`,
      );
    }),
  };
}

function hashCode(code: Hex): Hex {
  const bytes = Buffer.from(code.slice(2), 'hex');
  return bytesToHex(keccak256(bytes));
}
