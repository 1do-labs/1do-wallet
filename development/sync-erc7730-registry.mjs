#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SNAPSHOT = {
  commit: 'ad2c14087393070f7608d5167c4e943b2d453214',
  commitDate: '2026-05-18T09:50:20Z',
  calldataIndexSha256:
    'f17abfb288b8366812eca3bf784a96808bb028b1e056680c0267c4e093710902',
  eip712IndexSha256:
    '7b6bbaf7d38f25bc09e31001360ca1deb4a970e4fd5f7b580673e7f0062e2700',
};

const REGISTRY_ROOT =
  process.argv[2] ??
  process.env.ERC7730_REGISTRY_ROOT ??
  '/tmp/clear-signing-erc7730-registry-ad2c140';
const OUTPUT = path.resolve(
  'ui/pages/confirmations/utils/erc7730-registry-data.ts',
);

const SUPPORTED_FIELD_FORMATS = new Set([
  'addressName',
  'amount',
  'date',
  'enum',
  'raw',
  'tokenAmount',
  'unit',
]);
const SUPPORTED_PARAM_KEYS = new Set([
  '$ref',
  'base',
  'decimals',
  'encoding',
  'message',
  'nativeCurrencyAddress',
  'prefix',
  'senderAddress',
  'sources',
  'threshold',
  'tokenPath',
  'types',
]);
const SUPPORTED_PATH =
  /^(([$@#]\.)?[A-Za-z0-9_$]+(\.(\[\]|-?\d+|\[-?\d*:-?\d*\]|[A-Za-z0-9_$]+))*|@\.to|@\.from|@\.value)$/u;

const readJson = (relativePath) => {
  const absolutePath = path.join(REGISTRY_ROOT, relativePath);
  if (!existsSync(absolutePath)) {
    return undefined;
  }

  return JSON.parse(readFileSync(absolutePath, 'utf8'));
};

const stableStringify = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
};

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const mergeDescriptor = (base, override) => {
  if (Array.isArray(base) || Array.isArray(override)) {
    return override === undefined ? base : override;
  }

  if (
    base &&
    typeof base === 'object' &&
    override &&
    typeof override === 'object'
  ) {
    return Object.keys(override).reduce(
      (merged, key) => ({
        ...merged,
        [key]: mergeDescriptor(merged[key], override[key]),
      }),
      { ...base },
    );
  }

  return override === undefined ? base : override;
};

const resolveIncludePath = (descriptorPath, includePath) =>
  path
    .normalize(path.join(path.dirname(descriptorPath), includePath))
    .replaceAll('\\', '/');

const loadDescriptor = (descriptorPath, seen = new Set()) => {
  if (seen.has(descriptorPath)) {
    throw new Error(`ERC-7730 include cycle at ${descriptorPath}`);
  }

  const descriptor = readJson(descriptorPath);
  if (!descriptor) {
    return undefined;
  }

  seen.add(descriptorPath);

  const includes = descriptor.includes
    ? Array.isArray(descriptor.includes)
      ? descriptor.includes
      : [descriptor.includes]
    : [];
  const includedDescriptor = includes.reduce((merged, includePath) => {
    const resolvedPath = resolveIncludePath(descriptorPath, includePath);
    const included = loadDescriptor(resolvedPath, seen);

    return included ? mergeDescriptor(merged, included) : merged;
  }, {});

  const ownDescriptor = { ...descriptor };
  delete ownDescriptor.includes;

  return mergeDescriptor(includedDescriptor, ownDescriptor);
};

const getPathValue = (source, valuePath) => {
  if (!valuePath) {
    return undefined;
  }

  return valuePath.split('.').reduce((current, segment) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return current[segment];
  }, source);
};

const resolveField = (descriptor, field) => {
  if (!field?.$ref) {
    return field;
  }

  if (!field.$ref.startsWith('$.')) {
    return undefined;
  }

  const referencedField = getPathValue(descriptor, field.$ref.slice(2));
  if (
    !referencedField ||
    typeof referencedField !== 'object' ||
    Array.isArray(referencedField)
  ) {
    return undefined;
  }

  return {
    ...referencedField,
    ...field,
    params: {
      ...referencedField.params,
      ...field.params,
    },
    $ref: undefined,
  };
};

const isSupportedField = (descriptor, field) => {
  if (!field || typeof field !== 'object') {
    return false;
  }

  if ('value' in field) {
    return false;
  }

  const resolvedField = resolveField(descriptor, field);
  if (!resolvedField) {
    return false;
  }

  if (
    resolvedField.format &&
    !SUPPORTED_FIELD_FORMATS.has(resolvedField.format)
  ) {
    return false;
  }

  if (
    resolvedField.params &&
    Object.keys(resolvedField.params).some(
      (key) => !SUPPORTED_PARAM_KEYS.has(key),
    )
  ) {
    return false;
  }

  if (resolvedField.path && !SUPPORTED_PATH.test(resolvedField.path)) {
    return false;
  }

  if (resolvedField.fields) {
    return (
      Array.isArray(resolvedField.fields) &&
      resolvedField.fields.every((nestedField) =>
        isSupportedField(descriptor, nestedField),
      )
    );
  }

  return Boolean(
    resolvedField.label &&
      (resolvedField.path ||
        resolvedField.format ||
        resolvedField.visible === 'never'),
  );
};

const isSupportedDescriptor = (descriptor) => {
  const formats = descriptor?.display?.formats;
  if (!formats || typeof formats !== 'object') {
    return false;
  }

  return Object.values(formats).some(
    (format) =>
      format?.intent &&
      Array.isArray(format.fields) &&
      format.fields.length > 0 &&
      format.fields.every((field) => isSupportedField(descriptor, field)),
  );
};

const assertIndexSha256 = (indexPath, expectedSha256) => {
  const indexJson = readFileSync(path.join(REGISTRY_ROOT, indexPath), 'utf8');
  const actualIndexSha256 = sha256(indexJson);
  if (actualIndexSha256 !== expectedSha256) {
    throw new Error(
      `Unexpected ${indexPath} sha256 ${actualIndexSha256}; expected ${expectedSha256}`,
    );
  }
};

const addDescriptor = (descriptorStore, descriptorPath, descriptor) => {
  const normalizedJson = stableStringify(descriptor);
  descriptorStore[descriptorPath] ??= {
    descriptor,
    json: normalizedJson,
    sha256: sha256(normalizedJson),
  };
};

const descriptorStore = {};
const skipped = {
  calldata: { missing: 0, unsupported: 0 },
  eip712: { missing: 0, unsupported: 0 },
};

const eip712Index = readJson('index.eip712.json');
if (!eip712Index) {
  throw new Error(`Cannot read index.eip712.json from ${REGISTRY_ROOT}`);
}
assertIndexSha256('index.eip712.json', SNAPSHOT.eip712IndexSha256);

const filteredEip712Index = {};
for (const [registryKey, byPrimaryType] of Object.entries(eip712Index)) {
  for (const [primaryType, candidates] of Object.entries(byPrimaryType)) {
    for (const candidate of candidates) {
      const descriptor = loadDescriptor(candidate.path);

      if (!descriptor) {
        skipped.eip712.missing += 1;
        continue;
      }

      if (!isSupportedDescriptor(descriptor)) {
        skipped.eip712.unsupported += 1;
        continue;
      }

      filteredEip712Index[registryKey] ??= {};
      filteredEip712Index[registryKey][primaryType] ??= [];
      filteredEip712Index[registryKey][primaryType].push(candidate);

      addDescriptor(descriptorStore, candidate.path, descriptor);
    }
  }
}

const calldataIndex = readJson('index.calldata.json');
if (!calldataIndex) {
  throw new Error(`Cannot read index.calldata.json from ${REGISTRY_ROOT}`);
}
assertIndexSha256('index.calldata.json', SNAPSHOT.calldataIndexSha256);

const filteredCalldataIndex = {};
for (const [registryKey, descriptorPath] of Object.entries(calldataIndex)) {
  const descriptor = loadDescriptor(descriptorPath);

  if (!descriptor) {
    skipped.calldata.missing += 1;
    continue;
  }

  if (!isSupportedDescriptor(descriptor)) {
    skipped.calldata.unsupported += 1;
    continue;
  }

  filteredCalldataIndex[registryKey] = descriptorPath;
  addDescriptor(descriptorStore, descriptorPath, descriptor);
}

const projectFromPath = (descriptorPath) => descriptorPath.split('/')[1];

const projectCountsFromEip712Index = (index) => {
  const counts = {};
  for (const byPrimaryType of Object.values(index)) {
    for (const candidates of Object.values(byPrimaryType)) {
      for (const candidate of candidates) {
        const project = projectFromPath(candidate.path);
        counts[project] = (counts[project] ?? 0) + 1;
      }
    }
  }
  return Object.fromEntries(Object.entries(counts).sort());
};

const projectCountsFromCalldataIndex = (index) => {
  const counts = {};
  for (const descriptorPath of Object.values(index)) {
    const project = projectFromPath(descriptorPath);
    counts[project] = (counts[project] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort());
};

const eip712ProjectCounts = projectCountsFromEip712Index(filteredEip712Index);
const calldataProjectCounts = projectCountsFromCalldataIndex(
  filteredCalldataIndex,
);

const source = `/* eslint-disable @typescript-eslint/naming-convention */
import type {
  Erc7730CalldataIndex,
  Erc7730DescriptorStore,
  Erc7730Eip712Index,
} from './erc7730-registry';

export const ERC7730_REGISTRY_DATA_SNAPSHOT = ${JSON.stringify(
  {
    upstream: 'https://github.com/ethereum/clear-signing-erc7730-registry',
    commit: SNAPSHOT.commit,
    commitDate: SNAPSHOT.commitDate,
    source: 'official-registry-pinned-wallet-mirror',
    calldata: {
      indexSha256: SNAPSHOT.calldataIndexSha256,
      supportedIndexKeyCount: Object.keys(filteredCalldataIndex).length,
      skipped: skipped.calldata,
    },
    eip712: {
      indexSha256: SNAPSHOT.eip712IndexSha256,
      supportedIndexKeyCount: Object.keys(filteredEip712Index).length,
      skipped: skipped.eip712,
    },
    supportedDescriptorCount: Object.keys(descriptorStore).length,
  },
  null,
  2,
)} as const;

export const ERC7730_REGISTRY_SUPPORT = ${JSON.stringify(
  {
    calldata: {
      projects: Object.keys(calldataProjectCounts),
      byProject: calldataProjectCounts,
    },
    eip712: {
      projects: Object.keys(eip712ProjectCounts),
      byProject: eip712ProjectCounts,
    },
  },
  null,
  2,
)} as const;

export const ERC7730_CALLDATA_INDEX: Erc7730CalldataIndex = ${JSON.stringify(
  filteredCalldataIndex,
  null,
  2,
)};

export const ERC7730_EIP712_INDEX: Erc7730Eip712Index = ${JSON.stringify(
  filteredEip712Index,
  null,
  2,
)};

export const ERC7730_DESCRIPTOR_STORE: Erc7730DescriptorStore = ${JSON.stringify(
  descriptorStore,
  null,
  2,
)};
`;

writeFileSync(OUTPUT, source);
console.log(
  `ERC-7730 registry data written: ${Object.keys(descriptorStore).length} descriptors, ${Object.keys(filteredEip712Index).length} EIP-712 keys, ${Object.keys(filteredCalldataIndex).length} calldata keys`,
);
console.log(
  `Skipped EIP-712 candidates: ${skipped.eip712.missing} missing, ${skipped.eip712.unsupported} unsupported`,
);
console.log(
  `Skipped calldata entries: ${skipped.calldata.missing} missing, ${skipped.calldata.unsupported} unsupported`,
);
