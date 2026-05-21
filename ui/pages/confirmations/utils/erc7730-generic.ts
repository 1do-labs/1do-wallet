import { BigNumber, utils as ethersUtils } from 'ethers';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { SignatureRequestType } from '../types/confirm';
import type {
  OneDoClearSigningInfo,
  OneDoClearSigningRow,
} from './onedo-clear-signing';

type Erc7730Field = {
  $ref?: string;
  fields?: Erc7730Field[];
  format?:
    | 'addressName'
    | 'amount'
    | 'date'
    | 'enum'
    | 'raw'
    | 'tokenAmount'
    | 'unit';
  label?: string;
  params?: {
    $ref?: string;
    base?: string;
    decimals?: number;
    encoding?: string;
    message?: string;
    nativeCurrencyAddress?: string[];
    prefix?: boolean;
    senderAddress?: string;
    sources?: string[];
    threshold?: string;
    tokenPath?: string;
    types?: string[];
  };
  path?: string;
  value?: unknown;
  visible?: 'always' | 'never';
};

type Erc7730Format = {
  $id?: string;
  fields?: Erc7730Field[];
  intent?: string;
};

export type Erc7730Descriptor = {
  display?: {
    definitions?: Record<string, Erc7730Field>;
    formats?: Record<string, Erc7730Format>;
  };
  metadata?: Record<string, unknown>;
};

type TypedDataPayload = {
  domain?: {
    verifyingContract?: unknown;
  };
  message?: Record<string, unknown>;
  primaryType?: string;
};

type DescriptorMeta = {
  descriptorId: string;
  descriptorSha256: string;
};

type ClearSigningContext = {
  descriptor: Erc7730Descriptor;
  envelope: Record<string, unknown>;
};

const parseTypedData = (data?: SignatureRequestType['msgParams']['data']) => {
  if (!data) {
    return undefined;
  }

  try {
    return (
      typeof data === 'string' ? JSON.parse(data) : data
    ) as TypedDataPayload;
  } catch {
    return undefined;
  }
};

const formatValue = (value: unknown): string => {
  if (value === undefined || value === null) {
    return '';
  }

  if (BigNumber.isBigNumber(value)) {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(formatValue).join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

const normalizePath = (path?: string) => {
  if (!path) {
    return undefined;
  }

  if (path.startsWith('$.')) {
    return { root: '$', path: path.slice(2) };
  }

  if (path.startsWith('@.')) {
    return { root: '@', path: path.slice(2) };
  }

  if (path.startsWith('#.')) {
    return { root: '#', path: path.slice(2) };
  }

  return { root: '#', path };
};

const toHexData = (value: unknown) => {
  if (typeof value === 'string' && /^0x[a-fA-F0-9]*$/u.test(value)) {
    return value;
  }

  if (BigNumber.isBigNumber(value)) {
    return ethersUtils.hexZeroPad(value.toHexString(), 32);
  }

  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return ethersUtils.hexZeroPad(ethersUtils.hexlify(value), 32);
  }

  return undefined;
};

const resolveSliceBound = (
  value: string | undefined,
  defaultValue: number,
  byteLength: number,
) => {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  const parsedValue = Number.parseInt(value, 10);
  return parsedValue < 0 ? byteLength + parsedValue : parsedValue;
};

const sliceHexData = (value: unknown, selector: string) => {
  const match = selector.match(/^\[(-?\d*):(-?\d*)\]$/u);
  const hexData = toHexData(value);
  if (!match || !hexData) {
    return undefined;
  }

  const data = hexData.slice(2);
  const byteLength = data.length / 2;
  const start = resolveSliceBound(match[1], 0, byteLength);
  const end = resolveSliceBound(match[2], byteLength, byteLength);

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < start ||
    end > byteLength
  ) {
    return undefined;
  }

  return `0x${data.slice(start * 2, end * 2)}`;
};

const getPathValueFromRoot = (source: unknown, path: string): unknown => {
  const segments = path.split('.');
  let current = source;

  for (const segment of segments) {
    if (segment === '[]') {
      return current;
    }

    if (/^\[-?\d*:-?\d*\]$/u.test(segment)) {
      current = sliceHexData(current, segment);
      continue;
    }

    if (!current || typeof current !== 'object' || !(segment in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
};

const getPathValue = (
  source: unknown,
  path: string | undefined,
  context: ClearSigningContext,
): unknown => {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) {
    return undefined;
  }

  if (normalizedPath.root === '$') {
    return getPathValueFromRoot(context.descriptor, normalizedPath.path);
  }

  if (normalizedPath.root === '@') {
    return getPathValueFromRoot(context.envelope, normalizedPath.path);
  }

  return getPathValueFromRoot(source, normalizedPath.path);
};

const SUPPORTED_FIELD_FORMATS = new Set([
  'addressName',
  'amount',
  'date',
  'enum',
  'raw',
  'tokenAmount',
  'unit',
]);

const isSupportedField = (field: Erc7730Field): boolean => {
  if (field.format && !SUPPORTED_FIELD_FORMATS.has(field.format)) {
    return false;
  }

  return field.fields?.every(isSupportedField) ?? true;
};

const dateValue = (value: unknown) => {
  const seconds = Number(formatValue(value));
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return formatValue(value);
  }

  return new Date(seconds * 1000).toISOString();
};

const resolveReference = (
  descriptor: Erc7730Descriptor,
  ref?: string,
): Erc7730Field | undefined => {
  const value = getPathValueFromRoot(descriptor, ref?.slice(2) ?? '');
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Erc7730Field)
    : undefined;
};

const mergeField = (
  base: Erc7730Field | undefined,
  override: Erc7730Field,
): Erc7730Field => ({
  ...base,
  ...override,
  params: {
    ...base?.params,
    ...override.params,
  },
  $ref: undefined,
});

const resolveField = (
  field: Erc7730Field,
  descriptor: Erc7730Descriptor,
): Erc7730Field | undefined => {
  if (!field.$ref) {
    return field;
  }

  if (!field.$ref.startsWith('$.')) {
    return undefined;
  }

  const referencedField = resolveReference(descriptor, field.$ref);
  return referencedField ? mergeField(referencedField, field) : undefined;
};

const tokenAmountRow = (
  label: string,
  value: unknown,
  tokenAddress: unknown,
): OneDoClearSigningRow => ({
  label,
  value: `${formatValue(value)} raw units`,
  valueType:
    typeof tokenAddress === 'string' &&
    /^0x[a-fA-F0-9]{40}$/u.test(tokenAddress)
      ? 'tokenAmount'
      : undefined,
  rawValue: formatValue(value),
  tokenAddress: typeof tokenAddress === 'string' ? tokenAddress : undefined,
});

const formatFieldRow = (
  field: Erc7730Field,
  value: unknown,
  source: unknown,
  context: ClearSigningContext,
): OneDoClearSigningRow | undefined => {
  const { label } = field;
  if (!label || field.visible === 'never') {
    return undefined;
  }

  if (field.format === 'tokenAmount') {
    return tokenAmountRow(
      label,
      value,
      getPathValue(source, field.params?.tokenPath, context),
    );
  }

  if (field.format === 'date') {
    return {
      label,
      value: dateValue(value),
    };
  }

  if (field.format === 'enum' && field.params?.$ref?.startsWith('$.')) {
    const enumValues = getPathValueFromRoot(
      context.descriptor,
      field.params.$ref.slice(2),
    );
    const formattedValue = formatValue(value);
    const mappedValue =
      enumValues &&
      typeof enumValues === 'object' &&
      formattedValue in enumValues
        ? (enumValues as Record<string, unknown>)[formattedValue]
        : undefined;

    return {
      label,
      value: mappedValue ? formatValue(mappedValue) : formattedValue,
    };
  }

  if (field.format === 'amount') {
    return {
      label,
      value: `${formatValue(value)} wei`,
    };
  }

  if (field.format === 'unit') {
    return {
      label,
      value: formatValue(value),
    };
  }

  return {
    label,
    value: formatValue(value),
    valueType:
      (field.format === 'addressName' || field.format === 'raw') &&
      typeof value === 'string' &&
      /^0x[a-fA-F0-9]{40}$/u.test(value)
        ? 'address'
        : undefined,
  };
};

const expandField = (
  field: Erc7730Field,
  source: unknown,
  context: ClearSigningContext,
): OneDoClearSigningRow[] => {
  const resolvedField = resolveField(field, context.descriptor);
  if (!resolvedField || resolvedField.visible === 'never') {
    return [];
  }

  if (resolvedField.fields?.length) {
    const nestedSource = getPathValue(source, resolvedField.path, context);
    const values = Array.isArray(nestedSource) ? nestedSource : [nestedSource];

    return values.flatMap(
      (item, itemIndex) =>
        resolvedField.fields?.flatMap((nestedField) =>
          expandField(
            {
              ...nestedField,
              label:
                values.length > 1 && nestedField.label
                  ? `${nestedField.label} ${itemIndex + 1}`
                  : nestedField.label,
            },
            item,
            context,
          ),
        ) ?? [],
    );
  }

  const value =
    resolvedField.value === undefined
      ? getPathValue(source, resolvedField.path, context)
      : resolvedField.value;
  const row = formatFieldRow(resolvedField, value, source, context);
  return row ? [row] : [];
};

const findFormat = (descriptor: Erc7730Descriptor, primaryType: string) => {
  const formats = descriptor.display?.formats ?? {};
  return Object.entries(formats).find(([signature]) =>
    signature.startsWith(`${primaryType}(`),
  )?.[1];
};

export function getGenericErc7730TypedDataClearSigning(
  confirmation: SignatureRequestType | undefined,
  descriptor: Erc7730Descriptor,
  meta: DescriptorMeta,
): OneDoClearSigningInfo | undefined {
  const typedData = parseTypedData(confirmation?.msgParams?.data);
  const primaryType = typedData?.primaryType;
  const message = typedData?.message;

  if (!primaryType || !message) {
    return undefined;
  }

  const format = findFormat(descriptor, primaryType);
  if (
    !format?.fields?.length ||
    !format.intent ||
    !format.fields.every(isSupportedField)
  ) {
    return undefined;
  }

  const rows = format.fields.flatMap((field) =>
    expandField(field, message, {
      descriptor,
      envelope: {
        to: typedData.domain?.verifyingContract,
      },
    }),
  );
  if (!rows.length) {
    return undefined;
  }

  return {
    title: format.intent,
    subtitle: 'ERC-7730 registry clear signing',
    descriptorId: meta.descriptorId,
    descriptorSha256: meta.descriptorSha256,
    rows,
    advancedRows: [
      {
        label: 'EIP-712 type',
        value: primaryType,
      },
      {
        label: 'Descriptor hash',
        value: `sha256:${meta.descriptorSha256}`,
      },
    ],
  };
}

const getTransactionData = (transaction: TransactionMeta | undefined) => {
  const data = transaction?.txParams?.data;
  return typeof data === 'string' && data.length >= 10 ? data : undefined;
};

const functionFragmentFromSignature = (signature: string) => {
  try {
    const iface = new ethersUtils.Interface([`function ${signature}`]);
    const [fragment] = Object.values(iface.functions);
    return fragment ? { fragment, iface } : undefined;
  } catch {
    return undefined;
  }
};

const normalizeDecodedArgs = (
  args: ethersUtils.Result,
  inputs: readonly ethersUtils.ParamType[],
) =>
  inputs.reduce<Record<string, unknown>>((result, input, index) => {
    if (input.name) {
      result[input.name] = args[index];
    }

    result[index] = args[index];
    return result;
  }, {});

export function getGenericErc7730TransactionClearSigning(
  transaction: TransactionMeta | undefined,
  descriptor: Erc7730Descriptor,
  meta: DescriptorMeta,
): OneDoClearSigningInfo | undefined {
  const data = getTransactionData(transaction);
  const formats = descriptor.display?.formats ?? {};

  if (!data) {
    return undefined;
  }

  for (const [signature, format] of Object.entries(formats)) {
    if (
      !format?.fields?.length ||
      !format.intent ||
      !format.fields.every(isSupportedField)
    ) {
      continue;
    }

    const functionFragment = functionFragmentFromSignature(signature);
    if (!functionFragment) {
      continue;
    }

    const { fragment, iface } = functionFragment;
    if (iface.getSighash(fragment).toLowerCase() !== data.slice(0, 10)) {
      continue;
    }

    try {
      const parsed = iface.parseTransaction({ data });
      const decodedArgs = normalizeDecodedArgs(parsed.args, fragment.inputs);
      const context = {
        descriptor,
        envelope: {
          from: transaction?.txParams?.from,
          to: transaction?.txParams?.to,
          value: transaction?.txParams?.value ?? '0x0',
        },
      };
      const rows = format.fields.flatMap((field) =>
        expandField(field, decodedArgs, context),
      );

      if (!rows.length) {
        return undefined;
      }

      return {
        title: format.intent,
        subtitle: 'ERC-7730 registry clear signing',
        descriptorId: meta.descriptorId,
        descriptorSha256: meta.descriptorSha256,
        rows,
        advancedRows: [
          {
            label: 'Function',
            value: signature,
          },
          {
            label: 'Descriptor hash',
            value: `sha256:${meta.descriptorSha256}`,
          },
        ],
      };
    } catch {
      continue;
    }
  }

  return undefined;
}

export function hashErc7730Descriptor(descriptorJson: string) {
  return ethersUtils.sha256(ethersUtils.toUtf8Bytes(descriptorJson)).slice(2);
}
