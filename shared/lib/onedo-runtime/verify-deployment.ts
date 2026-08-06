import { keccak256 } from 'ethereum-cryptography/keccak';
import { bytesToHex, hexToBytes, type Hex, type Json } from '@metamask/utils';

import {
  ONE_DO_RUNTIME_DEPLOYMENT_MANIFEST,
  type OneDoRuntimeDeploymentManifest,
} from './deployment-manifest';

type RuntimeDeploymentRequest = {
  method: 'eth_getCode' | 'eth_getStorageAt';
  params: Json[];
};

export type RuntimeDeploymentProvider = {
  request(request: RuntimeDeploymentRequest): Promise<unknown>;
};

export type RuntimeDeploymentStatus =
  | { status: 'not_deployed' }
  | { status: 'trusted' }
  | {
      status: 'untrusted';
      reason:
        | 'partial_deployment'
        | 'account_code_mismatch'
        | 'registry_proxy_code_mismatch'
        | 'registry_implementation_mismatch'
        | 'registry_implementation_code_mismatch';
    }
  | { status: 'unavailable'; error: string };

const EMPTY_CODE = '0x';

export async function verifyOneDoRuntimeDeployment(
  provider: RuntimeDeploymentProvider,
  manifest: OneDoRuntimeDeploymentManifest = ONE_DO_RUNTIME_DEPLOYMENT_MANIFEST,
): Promise<RuntimeDeploymentStatus> {
  try {
    const [accountCode, registryProxyCode] = await Promise.all([
      getCode(provider, manifest.accountImplementation.address),
      getCode(provider, manifest.logicRegistry.address),
    ]);

    if (accountCode === EMPTY_CODE && registryProxyCode === EMPTY_CODE) {
      return { status: 'not_deployed' };
    }

    if (accountCode === EMPTY_CODE || registryProxyCode === EMPTY_CODE) {
      return { status: 'untrusted', reason: 'partial_deployment' };
    }

    if (
      hashCode(accountCode) !==
      normalizeHex(manifest.accountImplementation.codeHash)
    ) {
      return { status: 'untrusted', reason: 'account_code_mismatch' };
    }

    if (
      hashCode(registryProxyCode) !==
      normalizeHex(manifest.logicRegistry.codeHash)
    ) {
      return { status: 'untrusted', reason: 'registry_proxy_code_mismatch' };
    }

    const implementationAddress = await getImplementationAddress(
      provider,
      manifest.logicRegistry.address,
      manifest.logicRegistry.implementationSlot,
    );

    if (
      implementationAddress !==
      normalizeHex(manifest.logicRegistry.implementationAddress)
    ) {
      return {
        status: 'untrusted',
        reason: 'registry_implementation_mismatch',
      };
    }

    const implementationCode = await getCode(
      provider,
      manifest.logicRegistry.implementationAddress,
    );

    if (
      implementationCode === EMPTY_CODE ||
      hashCode(implementationCode) !==
        normalizeHex(manifest.logicRegistry.implementationCodeHash)
    ) {
      return {
        status: 'untrusted',
        reason: 'registry_implementation_code_mismatch',
      };
    }

    return { status: 'trusted' };
  } catch (error) {
    return {
      status: 'unavailable',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function getCode(
  provider: RuntimeDeploymentProvider,
  address: Hex,
): Promise<Hex> {
  const result = await provider.request({
    method: 'eth_getCode',
    params: [address, 'latest'],
  });

  if (!isHex(result)) {
    throw new Error('Runtime deployment returned invalid contract code');
  }

  return normalizeHex(result);
}

async function getImplementationAddress(
  provider: RuntimeDeploymentProvider,
  proxyAddress: Hex,
  implementationSlot: Hex,
): Promise<Hex> {
  const result = await provider.request({
    method: 'eth_getStorageAt',
    params: [proxyAddress, implementationSlot, 'latest'],
  });

  if (!isHex(result) || result.length !== 66) {
    throw new Error(
      'Runtime deployment returned an invalid implementation slot',
    );
  }

  return `0x${result.slice(-40)}`.toLowerCase() as Hex;
}

function hashCode(code: Hex): Hex {
  return bytesToHex(keccak256(hexToBytes(code))).toLowerCase() as Hex;
}

function normalizeHex(value: Hex): Hex {
  return value.toLowerCase() as Hex;
}

function isHex(value: unknown): value is Hex {
  return typeof value === 'string' && /^0x(?:[0-9a-f]{2})*$/iu.test(value);
}
