import type { TransactionMeta } from '@metamask/transaction-controller';
import { utils as ethersUtils } from 'ethers';
import type { SignatureRequestType } from '../types/confirm';
import {
  getGenericErc7730TransactionClearSigning,
  getGenericErc7730TypedDataClearSigning,
  hashErc7730Descriptor,
  type Erc7730Descriptor,
} from './erc7730-generic';
import {
  ERC7730_CALLDATA_INDEX,
  ERC7730_DESCRIPTOR_STORE,
  ERC7730_EIP712_INDEX,
} from './erc7730-registry-data';
import type { OneDoClearSigningInfo } from './onedo-clear-signing';

export const ERC7730_UPSTREAM_REGISTRY_SNAPSHOT = {
  id: 'ethereum-clear-signing-erc7730-registry',
  url: 'https://github.com/ethereum/clear-signing-erc7730-registry',
  commit: 'ad2c14087393070f7608d5167c4e943b2d453214',
  commitDate: '2026-05-18T09:50:20Z',
  trustedForRuntime: false,
  indexes: {
    calldata: {
      path: 'index.calldata.json',
      sha256:
        'f17abfb288b8366812eca3bf784a96808bb028b1e056680c0267c4e093710902',
      entries: 606,
    },
    eip712: {
      path: 'index.eip712.json',
      sha256:
        '7b6bbaf7d38f25bc09e31001360ca1deb4a970e4fd5f7b580673e7f0062e2700',
      entries: 191,
    },
  },
} as const;

export type Erc7730CalldataIndex = Record<string, string>;

export type Erc7730Eip712Index = Record<
  string,
  Record<
    string,
    {
      path: string;
      encodeTypeHashes?: string[];
    }[]
  >
>;

export type Erc7730DescriptorStore = Record<
  string,
  {
    descriptor: Erc7730Descriptor;
    json: string;
    sha256: string;
  }
>;

const normalizeAddress = (address?: unknown) =>
  typeof address === 'string' && /^0x[a-fA-F0-9]{40}$/u.test(address)
    ? address.toLowerCase()
    : undefined;

const normalizeChainId = (chainId?: unknown) => {
  if (typeof chainId === 'number' && Number.isInteger(chainId)) {
    return String(chainId);
  }

  if (typeof chainId !== 'string') {
    return undefined;
  }

  if (/^0x[a-fA-F0-9]+$/u.test(chainId)) {
    return String(Number.parseInt(chainId, 16));
  }

  return /^\d+$/u.test(chainId) ? chainId : undefined;
};

const registryKey = (chainId?: unknown, address?: unknown) => {
  const normalizedChainId = normalizeChainId(chainId);
  const normalizedAddress = normalizeAddress(address);

  if (!normalizedChainId || !normalizedAddress) {
    return undefined;
  }

  return `eip155:${normalizedChainId}:${normalizedAddress}`;
};

const parseTypedData = (data?: SignatureRequestType['msgParams']['data']) => {
  if (!data) {
    return undefined;
  }

  try {
    return (typeof data === 'string' ? JSON.parse(data) : data) as {
      domain?: Record<string, unknown>;
      primaryType?: string;
    };
  } catch {
    return undefined;
  }
};

const getTypedDataEncodeTypeHash = (
  typedData: ReturnType<typeof parseTypedData>,
): string | undefined => {
  const primaryType = typedData?.primaryType;
  const types = (typedData as { types?: Record<string, unknown> } | undefined)
    ?.types;

  if (!primaryType || !types || typeof types !== 'object') {
    return undefined;
  }

  const { EIP712Domain: _eip712Domain, ...messageTypes } = types;

  try {
    const encoder = ethersUtils._TypedDataEncoder.from(messageTypes);
    return ethersUtils.id(encoder.encodeType(primaryType));
  } catch {
    return undefined;
  }
};

const candidateMatchesTypedData = (
  candidate: { encodeTypeHashes?: string[] },
  typedData: ReturnType<typeof parseTypedData>,
) => {
  if (!candidate.encodeTypeHashes?.length) {
    return true;
  }

  const encodeTypeHash = getTypedDataEncodeTypeHash(typedData);
  return encodeTypeHash
    ? candidate.encodeTypeHashes.some(
        (candidateHash) =>
          candidateHash.toLowerCase() === encodeTypeHash.toLowerCase(),
      )
    : false;
};

export function getErc7730CalldataDescriptorPath(
  transaction: TransactionMeta | undefined,
  index: Erc7730CalldataIndex,
) {
  const key = registryKey(transaction?.chainId, transaction?.txParams?.to);

  return key ? index[key] : undefined;
}

export function getErc7730Eip712DescriptorCandidates(
  confirmation: SignatureRequestType | undefined,
  index: Erc7730Eip712Index,
) {
  const typedData = parseTypedData(confirmation?.msgParams?.data);
  const key = registryKey(
    typedData?.domain?.chainId,
    typedData?.domain?.verifyingContract,
  );
  const primaryType = typedData?.primaryType;

  if (!key || typeof primaryType !== 'string') {
    return [];
  }

  return (index[key]?.[primaryType] ?? []).filter((candidate) =>
    candidateMatchesTypedData(candidate, typedData),
  );
}

export function getRegistryErc7730TypedDataClearSigning({
  confirmation,
  descriptorStore,
  index,
}: {
  confirmation: SignatureRequestType | undefined;
  descriptorStore: Erc7730DescriptorStore;
  index: Erc7730Eip712Index;
}): OneDoClearSigningInfo | undefined {
  const candidates = getErc7730Eip712DescriptorCandidates(confirmation, index);

  for (const candidate of candidates) {
    const descriptorEntry = descriptorStore[candidate.path];
    if (!descriptorEntry) {
      continue;
    }

    if (
      descriptorEntry.sha256 !== hashErc7730Descriptor(descriptorEntry.json)
    ) {
      continue;
    }

    const info = getGenericErc7730TypedDataClearSigning(
      confirmation,
      descriptorEntry.descriptor,
      {
        descriptorId: candidate.path,
        descriptorSha256: descriptorEntry.sha256,
      },
    );

    if (info) {
      return info;
    }
  }

  return undefined;
}

export function getRegistryErc7730TransactionClearSigning({
  descriptorStore,
  index,
  transaction,
}: {
  descriptorStore: Erc7730DescriptorStore;
  index: Erc7730CalldataIndex;
  transaction: TransactionMeta | undefined;
}): OneDoClearSigningInfo | undefined {
  const descriptorPath = getErc7730CalldataDescriptorPath(transaction, index);
  if (!descriptorPath) {
    return undefined;
  }

  const descriptorEntry = descriptorStore[descriptorPath];
  if (!descriptorEntry) {
    return undefined;
  }

  if (descriptorEntry.sha256 !== hashErc7730Descriptor(descriptorEntry.json)) {
    return undefined;
  }

  return getGenericErc7730TransactionClearSigning(
    transaction,
    descriptorEntry.descriptor,
    {
      descriptorId: descriptorPath,
      descriptorSha256: descriptorEntry.sha256,
    },
  );
}

export function getBuiltInRegistryErc7730TypedDataClearSigning(
  confirmation: SignatureRequestType | undefined,
): OneDoClearSigningInfo | undefined {
  return getRegistryErc7730TypedDataClearSigning({
    confirmation,
    descriptorStore: ERC7730_DESCRIPTOR_STORE,
    index: ERC7730_EIP712_INDEX,
  });
}

export function getBuiltInRegistryErc7730TransactionClearSigning(
  transaction: TransactionMeta | undefined,
): OneDoClearSigningInfo | undefined {
  return getRegistryErc7730TransactionClearSigning({
    descriptorStore: ERC7730_DESCRIPTOR_STORE,
    index: ERC7730_CALLDATA_INDEX,
    transaction,
  });
}
