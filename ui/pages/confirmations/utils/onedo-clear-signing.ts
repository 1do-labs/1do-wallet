import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { utils as ethersUtils } from 'ethers';
import type { TransactionMeta } from '@metamask/transaction-controller';

import { ONE_DO_7702_DELEGATE } from '../../../../shared/lib/eip7702-utils';
import type { SignatureRequestType } from '../types/confirm';

export { ONE_DO_7702_DELEGATE };

export type OneDoClearSigningRow = {
  label: string;
  value: string;
  valueType?: 'address' | 'nativeAmount' | 'tokenAmount';
  rawValue?: string;
  tokenAddress?: string;
};

export type OneDoClearSigningInfo = {
  title: string;
  subtitle: string;
  descriptorId: string;
  descriptorSha256: string;
  rows: OneDoClearSigningRow[];
  advancedRows?: OneDoClearSigningRow[];
  warning?: string;
};

type OneDoTransactionClearSigningOptions = {
  hasOneDoDelegationContext?: boolean;
  allowAccountRuntimeCalldata?: boolean;
  allowWalletNativeTransferCalldata?: boolean;
};

type TypedDataPayload = {
  domain?: Record<string, unknown>;
  primaryType?: string;
  message?: Record<string, unknown>;
};

type ExecuteWithSigContext = {
  target?: unknown;
  value?: unknown;
  data?: unknown;
};

type ExecuteWithSigTypedDataPayload = TypedDataPayload & {
  clearSigningContext?: {
    call?: ExecuteWithSigContext;
    signedCall?: ExecuteWithSigContext;
  };
};

type RequiredTypedDataField = {
  path: string;
  type?: 'address' | 'array' | 'bytes32';
};

type ClearSigningParseResult = {
  title: string;
  rows: OneDoClearSigningRow[];
  advancedRows?: OneDoClearSigningRow[];
  warning?: string;
};

type TrustedDescriptor = {
  id: string;
  sha256: string;
  source: 'onedo-registry-mirror';
  trust: 'pinned-cache';
};

const RUNTIME_APPS: Record<string, { id: string; name: string }> = {
  '0x199dffe30b8b5ab611d952289a2674c5e826dcb9': {
    id: 'dex',
    name: 'Dex',
  },
  '0x7c8f64a017d026c889efac3d72cdbb2fd2ea0daa': {
    id: 'nftmarket',
    name: 'NFT Market',
  },
  '0xad2e742a68e3c49c0aa0be40ee36dcf4a46fd4db': {
    id: 'flashloan',
    name: 'Flash Loan',
  },
  '0xae75723a8b942fcf4fb18e435bef649b4a5f51db': {
    id: 'will',
    name: 'Will',
  },
  '0x55dc56e517e5371313ba2932d712029d334df006': {
    id: 'sessionpay',
    name: 'Session Pay',
  },
};

const ACCOUNT_RUNTIME_INTERFACE = new Interface([
  'function enableApp(address app)',
  'function disableApp(address app)',
  'function executeBatch(tuple(address target,uint256 value,bytes data)[] calls)',
  'function executeRuntimeApp(address app, bytes data)',
  'function executeWithTokenPull(address target, bytes data, address asset, uint256 maxAmount)',
  'function executeWithNftPull(address target, bytes data, address asset, uint256 tokenId)',
  'function executeWithSig(tuple(address target,uint256 value,bytes data) call, uint256 deadline, bytes signature)',
]);

const WALLET_NATIVE_TRANSFER_INTERFACE = new Interface([
  'function tokenTransferWithSig(address asset, address to, uint256 value, uint256 deadline, bytes signature)',
  'function nftTransferWithSig(address asset, address to, uint256 tokenId, uint256 deadline, bytes signature)',
]);

const DEX_INTERFACE = new Interface([
  'function fillSignedTokenForTokenOrderAsBuyer(tuple(address tokenIn,address tokenOut,uint256 amountIn,uint256 amountOut,uint256 expiry,uint256 nonce) order, bytes makerSignature)',
  'function fillSignedNativeForTokenOrderAsBuyer(tuple(address erc20,uint256 nativeAmount,uint256 tokenAmount,uint256 expiry,uint256 nonce) order, bytes makerSignature)',
  'function fillSignedTokenForNativeOrderAsBuyer(tuple(address erc20,uint256 nativeAmount,uint256 tokenAmount,uint256 expiry,uint256 nonce) order, bytes makerSignature)',
  'function cancelSignedTokenForTokenOrder(tuple(address tokenIn,address tokenOut,uint256 amountIn,uint256 amountOut,uint256 expiry,uint256 nonce) order)',
  'function cancelSignedNativeForTokenOrder(tuple(address erc20,uint256 nativeAmount,uint256 tokenAmount,uint256 expiry,uint256 nonce) order)',
  'function cancelSignedTokenForNativeOrder(tuple(address erc20,uint256 nativeAmount,uint256 tokenAmount,uint256 expiry,uint256 nonce) order)',
]);

const NFTMARKET_INTERFACE = new Interface([
  'function fillSignedNftForTokenOrderAsBuyer(tuple(address nft,uint256 tokenId,address erc20,uint256 tokenAmount,uint256 expiry,uint256 nonce) order, bytes makerSignature)',
  'function fillSignedTokenForNftOrderAsBuyer(tuple(address nft,uint256 tokenId,address erc20,uint256 tokenAmount,uint256 expiry,uint256 nonce) order, bytes makerSignature)',
  'function fillSignedNftForNativeOrderAsBuyer(tuple(address nft,uint256 tokenId,uint256 nativeAmount,uint256 expiry,uint256 nonce) order, bytes makerSignature)',
  'function fillSignedNativeForNftOrderAsBuyer(tuple(address nft,uint256 tokenId,uint256 nativeAmount,uint256 expiry,uint256 nonce) order, bytes makerSignature)',
  'function fillSignedNftForNftOrderAsBuyer(tuple(address giveNft,uint256 giveTokenId,address wantNft,uint256 wantTokenId,uint256 expiry,uint256 nonce) order, bytes makerSignature)',
  'function cancelSignedNftForTokenOrder(tuple(address nft,uint256 tokenId,address erc20,uint256 tokenAmount,uint256 expiry,uint256 nonce) order)',
  'function cancelSignedTokenForNftOrder(tuple(address nft,uint256 tokenId,address erc20,uint256 tokenAmount,uint256 expiry,uint256 nonce) order)',
  'function cancelSignedNftForNativeOrder(tuple(address nft,uint256 tokenId,uint256 nativeAmount,uint256 expiry,uint256 nonce) order)',
  'function cancelSignedNativeForNftOrder(tuple(address nft,uint256 tokenId,uint256 nativeAmount,uint256 expiry,uint256 nonce) order)',
  'function cancelSignedNftForNftOrder(tuple(address giveNft,uint256 giveTokenId,address wantNft,uint256 wantTokenId,uint256 expiry,uint256 nonce) order)',
]);

const SESSIONPAY_INTERFACE = new Interface([
  'function settle(tuple(address sessionKey,address payee,address token,uint256 spendLimit,uint256 sessionExpiresAt,bytes32 salt) grant, tuple(bytes32 sessionId,uint256 newTotalPaid) authorization, bytes selfSig, bytes sessionSig)',
  'function revokeSession(bytes32 sessionId)',
]);

const WILL_INTERFACE = new Interface([
  'function configureInactivity(uint256 inactiveDelay_, uint256 gracePeriod_)',
  'function ping()',
  'function setPaused(bool paused_)',
  'function resetWill()',
  'function executeWill(tuple(uint256 expiresAt,uint256 timeUnlock,uint256 executorFeeBps,uint8 triggerMode,uint256 willVersion,tuple(address addr,uint256 weight)[] beneficiaries) plan, bytes selfSig, address[] tokens)',
]);

export const ONEDO_CLEAR_SIGNING_TRUST_POLICY = {
  version: 'erc7730-v2',
  mode: 'trusted-registry-with-pinned-cache',
  dappSuppliedDescriptors: 'unsupported',
  trustedSource: 'onedo-registry-mirror',
} as const;

export const DESCRIPTORS: Record<string, TrustedDescriptor> = {
  accountRuntime: {
    id: 'account-runtime',
    sha256: 'aab7b3f722a6d8a9bed1100c228dea71c304efc0fdbdea6b15e8485301a51fff',
    source: 'onedo-registry-mirror',
    trust: 'pinned-cache',
  },
  sessionpay: {
    id: 'sessionpay',
    sha256: '995361a78b5dc328d96c782adb9506255edbc9ac03b531404220ae02081de60e',
    source: 'onedo-registry-mirror',
    trust: 'pinned-cache',
  },
  nftmarket: {
    id: 'nftmarket',
    sha256: '3c5ac013cd6161741eeeaf42b12c4d144839087f50382617f36d1d948ceb2011',
    source: 'onedo-registry-mirror',
    trust: 'pinned-cache',
  },
  will: {
    id: 'will',
    sha256: '18db022038da76663ba63707664ed71e185b5fad8855932bfbb370f2f7c46564',
    source: 'onedo-registry-mirror',
    trust: 'pinned-cache',
  },
  executeWithSig: {
    id: 'execute-with-sig',
    sha256: '2abeba646958ee6fcdc091c2a1e89103c425f20e8bd6f6ad35b7f198d3046470',
    source: 'onedo-registry-mirror',
    trust: 'pinned-cache',
  },
  dex: {
    id: 'dex',
    sha256: 'f79813148ff420600487ef9408b26533bb69a021d16e002637154c988fe179ba',
    source: 'onedo-registry-mirror',
    trust: 'pinned-cache',
  },
  runtimeMessage: {
    id: 'runtime-message',
    sha256: '11813d4df24580ced56a0f21b91edbaf79f1cab422d1cc6b7b8f810d2f980e2b',
    source: 'onedo-registry-mirror',
    trust: 'pinned-cache',
  },
  walletNativeTransfers: {
    id: 'wallet-native-transfers',
    sha256: '3fac1b55c499c9f20eec1d0a51c2c006902216d14e3e0f2866a7eaee9c8bd6f0',
    source: 'onedo-registry-mirror',
    trust: 'pinned-cache',
  },
} as const;

export const getTrustedOneDoClearSigningDescriptor = (descriptorId: string) =>
  Object.values(DESCRIPTORS).find(
    (descriptor) =>
      descriptor.id === descriptorId &&
      descriptor.source === ONEDO_CLEAR_SIGNING_TRUST_POLICY.trustedSource &&
      descriptor.trust === 'pinned-cache',
  );

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const WALLET_NATIVE_TOKEN_TRANSFER_DOMAIN_NAME = 'ERC8112 Token Transfer';
const WALLET_NATIVE_NFT_TRANSFER_DOMAIN_NAME = 'ERC8114 NFT Transfer';

const withDescriptor = (
  info: Omit<OneDoClearSigningInfo, 'descriptorId' | 'descriptorSha256'>,
  descriptor: TrustedDescriptor,
): OneDoClearSigningInfo => {
  const trustedDescriptor = getTrustedOneDoClearSigningDescriptor(
    descriptor.id,
  );

  if (!trustedDescriptor || trustedDescriptor.sha256 !== descriptor.sha256) {
    throw new Error(`Untrusted ERC-7730 descriptor: ${descriptor.id}`);
  }

  const advancedRows = info.advancedRows?.length
    ? info.advancedRows
    : undefined;

  return {
    ...info,
    descriptorId: trustedDescriptor.id,
    descriptorSha256: trustedDescriptor.sha256,
    advancedRows,
  };
};

const isSameAddress = (addressA?: string, addressB?: string) =>
  addressA?.toLowerCase() === addressB?.toLowerCase();

const isSameHex = (valueA?: unknown, valueB?: unknown) =>
  typeof valueA === 'string' &&
  typeof valueB === 'string' &&
  valueA.toLowerCase() === valueB.toLowerCase();

const isAddress = (value?: unknown): value is string =>
  typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/u.test(value);

const isBytes32 = (value?: unknown): value is string =>
  typeof value === 'string' && /^0x[a-fA-F0-9]{64}$/u.test(value);

const normalizeAddress = (value?: unknown) =>
  isAddress(value) ? value.toLowerCase() : undefined;

const isZeroAddress = (value?: unknown) =>
  isAddress(value) && isSameAddress(value, ZERO_ADDRESS);

const appNameForAddress = (address?: unknown) => {
  const normalized = normalizeAddress(address);
  if (!normalized) {
    return undefined;
  }

  return RUNTIME_APPS[normalized]?.name;
};

const formatValue = (value: unknown): string => {
  if (BigNumber.isBigNumber(value)) {
    return value.toString();
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(formatValue).join(', ');
  }

  if (value && typeof value === 'object') {
    return JSON.stringify(value);
  }

  if (value === undefined || value === null) {
    return '';
  }

  return String(value);
};

const formatUnixSeconds = (value: unknown) => {
  const stringValue = formatValue(value);
  if (!stringValue || stringValue === '0') {
    return 'No expiry';
  }

  const seconds = Number(stringValue);
  if (!Number.isFinite(seconds)) {
    return stringValue;
  }

  return new Date(seconds * 1000).toISOString();
};

const addressRow = (label: string, value: unknown): OneDoClearSigningRow => ({
  label,
  value: formatValue(value),
  valueType: isAddress(value) ? 'address' : undefined,
});

const row = (label: string, value: unknown): OneDoClearSigningRow => ({
  label,
  value: formatValue(value),
});

const rawAmount = (value: unknown) => `${formatValue(value)} raw units`;

const tokenAmountRow = (
  label: string,
  value: unknown,
  tokenAddress: unknown,
): OneDoClearSigningRow => ({
  label,
  value: rawAmount(value),
  valueType: isAddress(tokenAddress) ? 'tokenAmount' : undefined,
  rawValue: formatValue(value),
  tokenAddress: isAddress(tokenAddress) ? tokenAddress : undefined,
});

const nativeAmountRow = (
  label: string,
  value: unknown,
): OneDoClearSigningRow => ({
  label,
  value: `${formatValue(value)} wei`,
  valueType: 'nativeAmount',
  rawValue: formatValue(value),
});

const isHexData = (value?: unknown): value is string =>
  typeof value === 'string' && /^0x(?:[a-fA-F0-9]{2})*$/u.test(value);

const hashRow = (label: string, value: unknown): OneDoClearSigningRow => ({
  label,
  value: isHexData(value) ? ethersUtils.keccak256(value) : formatValue(value),
});

const dateRow = (label: string, value: unknown): OneDoClearSigningRow => ({
  label,
  value: formatUnixSeconds(value),
});

const triggerModeLabel = (value: unknown) =>
  String(value) === '1' ? 'Inactivity' : 'Time unlock';

const withoutRows = (
  rows: OneDoClearSigningRow[] | undefined,
  labels: string[],
) => (rows ?? []).filter((item) => !labels.includes(item.label));

const parseTypedData = (data?: SignatureRequestType['msgParams']['data']) => {
  if (!data) {
    return undefined;
  }

  try {
    return (
      typeof data === 'string' ? JSON.parse(data) : data
    ) as ExecuteWithSigTypedDataPayload;
  } catch {
    return undefined;
  }
};

const withDomainRows = (
  typedData: TypedDataPayload,
  rows: OneDoClearSigningRow[],
) => {
  const verifyingContract = typedData.domain?.verifyingContract;
  if (!isAddress(verifyingContract)) {
    return rows;
  }

  return [addressRow('Wallet', verifyingContract), ...rows];
};

const hasRequiredFields = (
  message: Record<string, unknown>,
  fields: RequiredTypedDataField[],
) =>
  fields.every(({ path, type }) => {
    const value = message[path];

    if (type === 'address') {
      return isAddress(value);
    }

    if (type === 'array') {
      return Array.isArray(value);
    }

    if (type === 'bytes32') {
      return isBytes32(value);
    }

    return value !== undefined && value !== null && formatValue(value) !== '';
  });

const isWalletScopedTypedData = (
  typedData: TypedDataPayload,
  confirmation?: SignatureRequestType,
) => {
  const verifyingContract = typedData.domain?.verifyingContract;

  if (!isAddress(verifyingContract)) {
    return false;
  }

  const signer = confirmation?.msgParams?.from;
  return !isAddress(signer) || isSameAddress(verifyingContract, signer);
};

const getExecuteWithSigContext = (typedData: ExecuteWithSigTypedDataPayload) =>
  typedData.clearSigningContext?.call ??
  typedData.clearSigningContext?.signedCall;

const getExecuteWithSigContextRows = (
  typedData: ExecuteWithSigTypedDataPayload,
  message: Record<string, unknown>,
): {
  rows: OneDoClearSigningRow[];
  advancedRows?: OneDoClearSigningRow[];
  warning?: string;
} => {
  const call = getExecuteWithSigContext(typedData);
  if (!call || !isHexData(call.data)) {
    return {
      rows: [],
      warning:
        'Only the call data hash is available. The wallet cannot display the underlying transaction without verified call data.',
    };
  }

  if (
    isAddress(call.target) &&
    !isSameAddress(call.target, message.target as string)
  ) {
    return {
      rows: [],
      warning:
        'Provided call data context target does not match the signed target.',
    };
  }

  const callDataHash = ethersUtils.keccak256(call.data);
  if (!isSameHex(callDataHash, message.dataHash)) {
    return {
      rows: [],
      warning:
        'Provided call data context hash does not match the signed data hash.',
    };
  }

  if (
    call.value !== undefined &&
    formatValue(call.value) !== formatValue(message.value)
  ) {
    return {
      rows: [],
      warning:
        'Provided call data context value does not match the signed native value.',
    };
  }

  let runtimeRows:
    | {
        title: string;
        rows: OneDoClearSigningRow[];
        advancedRows?: OneDoClearSigningRow[];
        warning?: string;
      }
    | undefined;
  if (isAddress(message.wallet) && isAddress(message.target)) {
    runtimeRows = parseRuntimeExecutionRows(call.data, message.wallet);
  }

  return {
    rows: withoutRows(runtimeRows?.rows, ['Wallet']),
    advancedRows: runtimeRows?.advancedRows,
    warning: runtimeRows?.warning,
  };
};

const getDexRows = (
  primaryType: string,
  message: Record<string, unknown>,
): ClearSigningParseResult | undefined => {
  switch (primaryType) {
    case 'TokenForTokenOrder':
      if (
        !hasRequiredFields(message, [
          { path: 'tokenIn', type: 'address' },
          { path: 'tokenOut', type: 'address' },
          { path: 'amountIn' },
          { path: 'amountOut' },
          { path: 'expiry' },
          { path: 'nonce' },
        ])
      ) {
        return undefined;
      }

      return {
        title: 'Create Dex token order on 1Do',
        rows: [
          tokenAmountRow('Sell', message.amountIn, message.tokenIn),
          tokenAmountRow('Receive', message.amountOut, message.tokenOut),
          dateRow('Expiry', message.expiry),
        ],
        advancedRows: [
          addressRow('Sell token', message.tokenIn),
          addressRow('Receive token', message.tokenOut),
          row('Nonce', message.nonce),
        ],
      };
    case 'NativeForTokenOrder':
      if (
        !hasRequiredFields(message, [
          { path: 'nativeAmount' },
          { path: 'erc20', type: 'address' },
          { path: 'tokenAmount' },
          { path: 'expiry' },
          { path: 'nonce' },
        ])
      ) {
        return undefined;
      }

      return {
        title: 'Create Dex native order on 1Do',
        rows: [
          nativeAmountRow('Sell native', message.nativeAmount),
          tokenAmountRow('Receive', message.tokenAmount, message.erc20),
          dateRow('Expiry', message.expiry),
        ],
        advancedRows: [
          addressRow('Receive token', message.erc20),
          row('Nonce', message.nonce),
        ],
      };
    case 'TokenForNativeOrder':
      if (
        !hasRequiredFields(message, [
          { path: 'erc20', type: 'address' },
          { path: 'tokenAmount' },
          { path: 'nativeAmount' },
          { path: 'expiry' },
          { path: 'nonce' },
        ])
      ) {
        return undefined;
      }

      return {
        title: 'Create Dex token order on 1Do',
        rows: [
          tokenAmountRow('Sell', message.tokenAmount, message.erc20),
          nativeAmountRow('Receive native', message.nativeAmount),
          dateRow('Expiry', message.expiry),
        ],
        advancedRows: [
          addressRow('Sell token', message.erc20),
          row('Nonce', message.nonce),
        ],
      };
    default:
      return undefined;
  }
};

const getNFTMarketRows = (
  primaryType: string,
  message: Record<string, unknown>,
): ClearSigningParseResult | undefined => {
  switch (primaryType) {
    case 'NftForTokenOrder':
      if (
        !hasRequiredFields(message, [
          { path: 'nft', type: 'address' },
          { path: 'tokenId' },
          { path: 'erc20', type: 'address' },
          { path: 'tokenAmount' },
          { path: 'expiry' },
          { path: 'nonce' },
        ])
      ) {
        return undefined;
      }

      return {
        title: 'Create NFT Market order on 1Do',
        rows: [
          addressRow('Sell NFT collection', message.nft),
          row('Sell token ID', message.tokenId),
          tokenAmountRow('Receive', message.tokenAmount, message.erc20),
          dateRow('Expiry', message.expiry),
        ],
        advancedRows: [
          addressRow('Receive token', message.erc20),
          row('Nonce', message.nonce),
        ],
      };
    case 'TokenForNftOrder':
      if (
        !hasRequiredFields(message, [
          { path: 'erc20', type: 'address' },
          { path: 'tokenAmount' },
          { path: 'nft', type: 'address' },
          { path: 'tokenId' },
          { path: 'expiry' },
          { path: 'nonce' },
        ])
      ) {
        return undefined;
      }

      return {
        title: 'Create NFT Market token order on 1Do',
        rows: [
          tokenAmountRow('Sell', message.tokenAmount, message.erc20),
          addressRow('Receive NFT collection', message.nft),
          row('Receive token ID', message.tokenId),
          dateRow('Expiry', message.expiry),
        ],
        advancedRows: [
          addressRow('Sell token', message.erc20),
          row('Nonce', message.nonce),
        ],
      };
    case 'NftForNativeOrder':
      if (
        !hasRequiredFields(message, [
          { path: 'nft', type: 'address' },
          { path: 'tokenId' },
          { path: 'nativeAmount' },
          { path: 'expiry' },
          { path: 'nonce' },
        ])
      ) {
        return undefined;
      }

      return {
        title: 'Create NFT Market order on 1Do',
        rows: [
          addressRow('Sell NFT collection', message.nft),
          row('Sell token ID', message.tokenId),
          nativeAmountRow('Receive native', message.nativeAmount),
          dateRow('Expiry', message.expiry),
        ],
      };
    case 'NativeForNftOrder':
      if (
        !hasRequiredFields(message, [
          { path: 'nativeAmount' },
          { path: 'nft', type: 'address' },
          { path: 'tokenId' },
          { path: 'expiry' },
          { path: 'nonce' },
        ])
      ) {
        return undefined;
      }

      return {
        title: 'Create NFT Market native order on 1Do',
        rows: [
          nativeAmountRow('Sell native', message.nativeAmount),
          addressRow('Receive NFT collection', message.nft),
          row('Receive token ID', message.tokenId),
          dateRow('Expiry', message.expiry),
        ],
      };
    case 'NftForNftOrder':
      if (
        !hasRequiredFields(message, [
          { path: 'giveNft', type: 'address' },
          { path: 'giveTokenId' },
          { path: 'wantNft', type: 'address' },
          { path: 'wantTokenId' },
          { path: 'expiry' },
          { path: 'nonce' },
        ])
      ) {
        return undefined;
      }

      return {
        title: 'Create NFT Market swap order on 1Do',
        rows: [
          addressRow('Sell NFT collection', message.giveNft),
          row('Sell token ID', message.giveTokenId),
          addressRow('Receive NFT collection', message.wantNft),
          row('Receive token ID', message.wantTokenId),
          dateRow('Expiry', message.expiry),
        ],
      };
    default:
      return undefined;
  }
};

const getWillBeneficiaries = (message: Record<string, unknown>) => {
  if (!Array.isArray(message.beneficiaries)) {
    return [];
  }

  return message.beneficiaries.flatMap((beneficiary, index) => {
    if (!beneficiary || typeof beneficiary !== 'object') {
      return [];
    }

    const entry = beneficiary as Record<string, unknown>;
    return [
      addressRow(`Beneficiary ${index + 1}`, entry.addr),
      row(`Beneficiary ${index + 1} weight`, entry.weight),
    ];
  });
};

const recipientRows = (
  label: string,
  recipient: unknown,
  zeroAddressLabel: string,
) => {
  if (isZeroAddress(recipient)) {
    return [
      row(label, zeroAddressLabel),
      addressRow(`${label} marker`, recipient),
    ];
  }

  return [addressRow(label, recipient)];
};

const recipientMainRow = (
  label: string,
  recipient: unknown,
  zeroAddressLabel: string,
) =>
  isZeroAddress(recipient)
    ? row(label, zeroAddressLabel)
    : addressRow(label, recipient);

const getWalletNativeTransferTypedDataRows = (
  primaryType: string,
  message: Record<string, unknown>,
): ClearSigningParseResult | undefined => {
  switch (primaryType) {
    case 'TokenTransferWithSig':
      if (
        !hasRequiredFields(message, [
          { path: 'wallet', type: 'address' },
          { path: 'asset', type: 'address' },
          { path: 'to', type: 'address' },
          { path: 'value' },
          { path: 'nonce' },
          { path: 'deadline' },
        ])
      ) {
        return undefined;
      }

      if (isZeroAddress(message.to)) {
        return {
          title: 'Create claimable token transfer',
          rows: [
            tokenAmountRow('Amount', message.value, message.asset),
            row('Claim rule', 'Anyone with the link can claim to self'),
            addressRow('From', message.wallet),
            dateRow('Expires', message.deadline),
          ],
          advancedRows: [
            addressRow('Asset', message.asset),
            addressRow('Recipient marker', message.to),
          ],
        };
      }

      return {
        title: 'Authorize token payment',
        rows: [
          tokenAmountRow('Pay', message.value, message.asset),
          addressRow('To', message.to),
          addressRow('From', message.wallet),
          dateRow('Expires', message.deadline),
        ],
        advancedRows: [addressRow('Asset', message.asset)],
      };
    case 'NFTTransferWithSig':
      if (
        !hasRequiredFields(message, [
          { path: 'wallet', type: 'address' },
          { path: 'asset', type: 'address' },
          { path: 'to', type: 'address' },
          { path: 'tokenId' },
          { path: 'nonce' },
          { path: 'deadline' },
        ])
      ) {
        return undefined;
      }

      if (isZeroAddress(message.to)) {
        return {
          title: 'Create claimable NFT gift',
          rows: [
            addressRow('NFT collection', message.asset),
            row('Token ID', message.tokenId),
            row('Claim rule', 'Anyone with the link can claim to self'),
            addressRow('From', message.wallet),
            dateRow('Expires', message.deadline),
          ],
          advancedRows: [addressRow('Recipient marker', message.to)],
        };
      }

      return {
        title: 'Authorize NFT transfer',
        rows: [
          addressRow('NFT collection', message.asset),
          row('Token ID', message.tokenId),
          addressRow('To', message.to),
          addressRow('From', message.wallet),
          dateRow('Expires', message.deadline),
        ],
      };
    default:
      return undefined;
  }
};

export const getOneDoTypedDataClearSigning = (
  confirmation?: SignatureRequestType,
): OneDoClearSigningInfo | undefined => {
  const typedData = parseTypedData(confirmation?.msgParams?.data);
  const domain = typedData?.domain;
  const message = typedData?.message;
  const primaryType = typedData?.primaryType;

  if (
    !domain ||
    !message ||
    !primaryType ||
    !isWalletScopedTypedData(typedData, confirmation)
  ) {
    return undefined;
  }

  if (
    domain.version === '1' &&
    (domain.name === WALLET_NATIVE_TOKEN_TRANSFER_DOMAIN_NAME ||
      domain.name === WALLET_NATIVE_NFT_TRANSFER_DOMAIN_NAME)
  ) {
    if (
      !isSameAddress(
        message.wallet as string,
        domain.verifyingContract as string,
      )
    ) {
      return undefined;
    }

    const transferRows = getWalletNativeTransferTypedDataRows(
      primaryType,
      message,
    );
    if (!transferRows) {
      return undefined;
    }

    return withDescriptor(
      {
        title: transferRows.title,
        subtitle: 'ERC-7730 clear signing',
        rows: transferRows.rows,
        advancedRows: transferRows.advancedRows,
      },
      DESCRIPTORS.walletNativeTransfers,
    );
  }

  if (
    domain.name === '1do ExecuteWithSig' &&
    domain.version === '1' &&
    primaryType === 'ExecuteWithSig'
  ) {
    if (
      !hasRequiredFields(message, [
        { path: 'wallet', type: 'address' },
        { path: 'target', type: 'address' },
        { path: 'value' },
        { path: 'dataHash', type: 'bytes32' },
        { path: 'nonce' },
        { path: 'deadline' },
      ])
    ) {
      return undefined;
    }

    const context = getExecuteWithSigContextRows(typedData, message);

    return withDescriptor(
      {
        title: '1Do gasless signed execution',
        subtitle: 'ERC-7730 clear signing',
        rows: [
          addressRow('Wallet', message.wallet),
          addressRow('Target', message.target),
          row('Native value', message.value),
          dateRow('Deadline', message.deadline),
          ...context.rows,
        ],
        advancedRows: context.advancedRows,
        warning: context.warning,
      },
      DESCRIPTORS.executeWithSig,
    );
  }

  if (domain.name === 'Dex Order on 1Do' && domain.version === '1') {
    const order = getDexRows(primaryType, message);
    if (!order) {
      return undefined;
    }

    return withDescriptor(
      {
        title: order.title,
        subtitle: 'ERC-7730 clear signing',
        rows: withDomainRows(typedData, order.rows),
        advancedRows: order.advancedRows,
      },
      DESCRIPTORS.dex,
    );
  }

  if (domain.name === 'NFT Market Order on 1Do' && domain.version === '1') {
    const order = getNFTMarketRows(primaryType, message);
    if (!order) {
      return undefined;
    }

    return withDescriptor(
      {
        title: order.title,
        subtitle: 'ERC-7730 clear signing',
        rows: withDomainRows(typedData, order.rows),
        advancedRows: order.advancedRows,
      },
      DESCRIPTORS.nftmarket,
    );
  }

  if (domain.name === 'Session Pay on 1Do' && domain.version === '1') {
    if (primaryType === 'SessionGrant') {
      if (
        !hasRequiredFields(message, [
          { path: 'sessionKey', type: 'address' },
          { path: 'payee', type: 'address' },
          { path: 'token', type: 'address' },
          { path: 'spendLimit' },
          { path: 'sessionExpiresAt' },
          { path: 'salt', type: 'bytes32' },
        ])
      ) {
        return undefined;
      }

      return withDescriptor(
        {
          title: 'Grant Session Pay session on 1Do',
          subtitle: 'ERC-7730 clear signing',
          rows: withDomainRows(typedData, [
            addressRow('Session key', message.sessionKey),
            addressRow('Payee', message.payee),
            tokenAmountRow('Spend limit', message.spendLimit, message.token),
            dateRow('Session expires', message.sessionExpiresAt),
          ]),
          advancedRows: [addressRow('Payment token', message.token)],
        },
        DESCRIPTORS.sessionpay,
      );
    }

    if (primaryType === 'SettlementAuthorization') {
      if (
        !hasRequiredFields(message, [
          { path: 'sessionId', type: 'bytes32' },
          { path: 'newTotalPaid' },
        ])
      ) {
        return undefined;
      }

      return withDescriptor(
        {
          title: 'Authorize Session Pay settlement on 1Do',
          subtitle: 'ERC-7730 clear signing',
          rows: withDomainRows(typedData, [
            row('New cumulative paid', message.newTotalPaid),
          ]),
          advancedRows: [row('Session ID', message.sessionId)],
        },
        DESCRIPTORS.sessionpay,
      );
    }
  }

  if (
    domain.name === 'Will Plan on 1Do' &&
    domain.version === '1' &&
    primaryType === 'WillPlan'
  ) {
    if (
      !hasRequiredFields(message, [
        { path: 'expiresAt' },
        { path: 'timeUnlock' },
        { path: 'executorFeeBps' },
        { path: 'triggerMode' },
        { path: 'willVersion' },
        { path: 'beneficiaries', type: 'array' },
      ])
    ) {
      return undefined;
    }

    return withDescriptor(
      {
        title: 'Sign Will plan on 1Do',
        subtitle: 'ERC-7730 clear signing',
        rows: withDomainRows(typedData, [
          dateRow('Plan expires', message.expiresAt),
          dateRow('Time unlock', message.timeUnlock),
          row('Executor fee bps', message.executorFeeBps),
          row('Trigger mode', triggerModeLabel(message.triggerMode)),
          ...getWillBeneficiaries(message),
        ]),
      },
      DESCRIPTORS.will,
    );
  }

  if (
    domain.name === '1do 7702 Runtime' &&
    domain.version === '1' &&
    primaryType === 'OnedoRuntimeMessage'
  ) {
    if (!hasRequiredFields(message, [{ path: 'hash', type: 'bytes32' }])) {
      return undefined;
    }

    return withDescriptor(
      {
        title: '1Do runtime message',
        subtitle: 'EIP-712 wrapper',
        rows: withDomainRows(typedData, [row('Message hash', message.hash)]),
        warning:
          'This is a replay-safe wrapper. The wallet can verify the 1Do domain and display the inner message hash, but not the inner message fields.',
      },
      DESCRIPTORS.runtimeMessage,
    );
  }

  return undefined;
};

type RuntimeAccessUpdate = {
  action: 'Enable' | 'Disable';
  app: string;
  appAddress: string;
};

const parseRuntimeAccessUpdate = (
  data?: string,
): RuntimeAccessUpdate | undefined => {
  if (!data) {
    return undefined;
  }

  try {
    const parsed = ACCOUNT_RUNTIME_INTERFACE.parseTransaction({ data });
    if (parsed.name !== 'enableApp' && parsed.name !== 'disableApp') {
      return undefined;
    }

    const appAddress = parsed.args.app as string;
    const appName = appNameForAddress(appAddress);
    if (!appName) {
      return undefined;
    }

    return {
      action: parsed.name === 'enableApp' ? 'Enable' : 'Disable',
      app: appName,
      appAddress,
    };
  } catch {
    return undefined;
  }
};

const getDexCallRows = (data: string) => {
  try {
    const parsed = DEX_INTERFACE.parseTransaction({ data });
    const order = parsed.args.order as Record<string, unknown>;
    const isFill = parsed.name.startsWith('fillSigned');
    const prefix = isFill ? 'Fill Dex order' : 'Cancel Dex order';

    if (
      parsed.name.includes('TokenForToken') &&
      hasRequiredFields(order, [
        { path: 'tokenIn', type: 'address' },
        { path: 'tokenOut', type: 'address' },
        { path: 'amountIn' },
        { path: 'amountOut' },
        { path: 'expiry' },
        { path: 'nonce' },
      ])
    ) {
      return {
        action: `${prefix}: token for token`,
        rows: [
          tokenAmountRow(
            isFill ? 'Maker sells' : 'Sell',
            order.amountIn,
            order.tokenIn,
          ),
          tokenAmountRow(
            isFill ? 'Buyer pays' : 'Receive',
            order.amountOut,
            order.tokenOut,
          ),
          dateRow('Expiry', order.expiry),
        ],
        advancedRows: [
          addressRow(
            isFill ? 'Maker sells token' : 'Sell token',
            order.tokenIn,
          ),
          addressRow(
            isFill ? 'Buyer pays token' : 'Receive token',
            order.tokenOut,
          ),
          row('Nonce', order.nonce),
        ],
      };
    }

    if (
      parsed.name.includes('NativeForToken') &&
      hasRequiredFields(order, [
        { path: 'erc20', type: 'address' },
        { path: 'nativeAmount' },
        { path: 'tokenAmount' },
        { path: 'expiry' },
        { path: 'nonce' },
      ])
    ) {
      return {
        action: `${prefix}: native for token`,
        rows: [
          nativeAmountRow(
            isFill ? 'Maker sends native' : 'Sell native',
            order.nativeAmount,
          ),
          tokenAmountRow(
            isFill ? 'Buyer pays' : 'Receive',
            order.tokenAmount,
            order.erc20,
          ),
          dateRow('Expiry', order.expiry),
        ],
        advancedRows: [
          addressRow(
            isFill ? 'Buyer pays token' : 'Receive token',
            order.erc20,
          ),
          row('Nonce', order.nonce),
        ],
      };
    }

    if (
      parsed.name.includes('TokenForNative') &&
      hasRequiredFields(order, [
        { path: 'erc20', type: 'address' },
        { path: 'nativeAmount' },
        { path: 'tokenAmount' },
        { path: 'expiry' },
        { path: 'nonce' },
      ])
    ) {
      return {
        action: `${prefix}: token for native`,
        rows: [
          tokenAmountRow(
            isFill ? 'Maker sells' : 'Sell',
            order.tokenAmount,
            order.erc20,
          ),
          nativeAmountRow(
            isFill ? 'Buyer pays native' : 'Receive native',
            order.nativeAmount,
          ),
          dateRow('Expiry', order.expiry),
        ],
        advancedRows: [
          addressRow(isFill ? 'Maker sells token' : 'Sell token', order.erc20),
          row('Nonce', order.nonce),
        ],
      };
    }
  } catch {
    return undefined;
  }

  return undefined;
};

const getNFTMarketCallRows = (data: string) => {
  try {
    const parsed = NFTMARKET_INTERFACE.parseTransaction({ data });
    const order = parsed.args.order as Record<string, unknown>;
    const isFill = parsed.name.startsWith('fillSigned');
    const prefix = isFill ? 'Fill NFT Market order' : 'Cancel NFT Market order';

    if (
      parsed.name.includes('NftForToken') &&
      hasRequiredFields(order, [
        { path: 'nft', type: 'address' },
        { path: 'tokenId' },
        { path: 'erc20', type: 'address' },
        { path: 'tokenAmount' },
        { path: 'expiry' },
        { path: 'nonce' },
      ])
    ) {
      return {
        action: `${prefix}: NFT for token`,
        rows: [
          addressRow(
            isFill ? 'Maker sells NFT collection' : 'Sell NFT collection',
            order.nft,
          ),
          row(isFill ? 'Maker sells token ID' : 'Sell token ID', order.tokenId),
          tokenAmountRow(
            isFill ? 'Buyer pays' : 'Receive',
            order.tokenAmount,
            order.erc20,
          ),
          dateRow('Expiry', order.expiry),
        ],
        advancedRows: [
          addressRow(
            isFill ? 'Buyer pays token' : 'Receive token',
            order.erc20,
          ),
          row('Nonce', order.nonce),
        ],
      };
    }

    if (
      parsed.name.includes('TokenForNft') &&
      hasRequiredFields(order, [
        { path: 'nft', type: 'address' },
        { path: 'tokenId' },
        { path: 'erc20', type: 'address' },
        { path: 'tokenAmount' },
        { path: 'expiry' },
        { path: 'nonce' },
      ])
    ) {
      return {
        action: `${prefix}: token for NFT`,
        rows: [
          tokenAmountRow(
            isFill ? 'Maker sells' : 'Sell',
            order.tokenAmount,
            order.erc20,
          ),
          addressRow(
            isFill ? 'Buyer pays NFT collection' : 'Receive NFT collection',
            order.nft,
          ),
          row(
            isFill ? 'Buyer pays token ID' : 'Receive token ID',
            order.tokenId,
          ),
          dateRow('Expiry', order.expiry),
        ],
        advancedRows: [
          addressRow(isFill ? 'Maker sells token' : 'Sell token', order.erc20),
          row('Nonce', order.nonce),
        ],
      };
    }

    if (
      (parsed.name.includes('NftForNative') ||
        parsed.name.includes('NativeForNft')) &&
      hasRequiredFields(order, [
        { path: 'nft', type: 'address' },
        { path: 'tokenId' },
        { path: 'nativeAmount' },
        { path: 'expiry' },
        { path: 'nonce' },
      ])
    ) {
      const nftForNative = parsed.name.includes('NftForNative');
      let collectionLabel = 'Receive NFT collection';
      let tokenIdLabel = 'Receive token ID';
      let nativeAmountLabel = 'Sell native amount';

      if (nftForNative) {
        collectionLabel = isFill
          ? 'Maker sells NFT collection'
          : 'Sell NFT collection';
        tokenIdLabel = isFill ? 'Maker sells token ID' : 'Sell token ID';
        nativeAmountLabel = isFill ? 'Buyer pays native' : 'Receive native';
      } else if (isFill) {
        collectionLabel = 'Buyer pays NFT collection';
        tokenIdLabel = 'Buyer pays token ID';
        nativeAmountLabel = 'Maker sends native';
      }

      return {
        action: `${prefix}: ${nftForNative ? 'NFT for native' : 'native for NFT'}`,
        rows: [
          addressRow(collectionLabel, order.nft),
          row(tokenIdLabel, order.tokenId),
          nativeAmountRow(nativeAmountLabel, order.nativeAmount),
          dateRow('Expiry', order.expiry),
        ],
        advancedRows: [row('Nonce', order.nonce)],
      };
    }

    if (
      parsed.name.includes('NftForNft') &&
      hasRequiredFields(order, [
        { path: 'giveNft', type: 'address' },
        { path: 'giveTokenId' },
        { path: 'wantNft', type: 'address' },
        { path: 'wantTokenId' },
        { path: 'expiry' },
        { path: 'nonce' },
      ])
    ) {
      return {
        action: `${prefix}: NFT for NFT`,
        rows: [
          addressRow(
            isFill ? 'Maker sells NFT collection' : 'Sell NFT collection',
            order.giveNft,
          ),
          row(
            isFill ? 'Maker sells token ID' : 'Sell token ID',
            order.giveTokenId,
          ),
          addressRow(
            isFill ? 'Buyer pays NFT collection' : 'Receive NFT collection',
            order.wantNft,
          ),
          row(
            isFill ? 'Buyer pays token ID' : 'Receive token ID',
            order.wantTokenId,
          ),
          dateRow('Expiry', order.expiry),
        ],
      };
    }
  } catch {
    return undefined;
  }

  return undefined;
};

const getRuntimeAppCallRows = (appAddress: string, data: string) => {
  const appName = appNameForAddress(appAddress);

  if (appName === 'Dex') {
    return getDexCallRows(data);
  }

  if (appName === 'NFT Market') {
    return getNFTMarketCallRows(data);
  }

  if (appName === 'Session Pay') {
    try {
      const parsed = SESSIONPAY_INTERFACE.parseTransaction({ data });
      if (parsed.name === 'settle') {
        return {
          action: 'Settle Session Pay session',
          rows: [
            tokenAmountRow(
              'New cumulative paid',
              parsed.args.authorization.newTotalPaid,
              parsed.args.grant.token,
            ),
            addressRow('Payee', parsed.args.grant.payee),
            tokenAmountRow(
              'Spend limit',
              parsed.args.grant.spendLimit,
              parsed.args.grant.token,
            ),
          ],
          advancedRows: [
            addressRow('Payment token', parsed.args.grant.token),
            row('Session ID', parsed.args.authorization.sessionId),
          ],
        };
      }
      if (parsed.name === 'revokeSession') {
        return {
          action: 'Revoke Session Pay session',
          rows: [row('Session ID', parsed.args.sessionId)],
        };
      }
    } catch {
      return undefined;
    }
  }

  if (appName === 'Will') {
    try {
      const parsed = WILL_INTERFACE.parseTransaction({ data });
      if (parsed.name === 'executeWill') {
        return {
          action: 'Execute Will plan',
          rows: [
            row('Token count', parsed.args.tokens.length),
            dateRow('Plan expires', parsed.args.plan.expiresAt),
            dateRow('Time unlock', parsed.args.plan.timeUnlock),
            row('Trigger mode', triggerModeLabel(parsed.args.plan.triggerMode)),
          ],
        };
      }
      return {
        action: `Will ${parsed.name}`,
        rows: parsed.args.length
          ? parsed.args.map((value: unknown, index: number) =>
              row(`Argument ${index + 1}`, value),
            )
          : [],
      };
    } catch {
      return undefined;
    }
  }

  return undefined;
};

function parseRuntimeExecutionRows(
  data: string,
  walletAddress: string,
):
  | {
      title: string;
      rows: OneDoClearSigningRow[];
      advancedRows?: OneDoClearSigningRow[];
      warning?: string;
    }
  | undefined {
  try {
    const parsed = ACCOUNT_RUNTIME_INTERFACE.parseTransaction({ data });

    if (parsed.name === 'executeRuntimeApp') {
      const appAddress = parsed.args.app as string;
      const appData = parsed.args.data as string;
      const appCall = getRuntimeAppCallRows(appAddress, appData);
      const runtimeTitle =
        appCall?.action ??
        `Execute ${appNameForAddress(appAddress) ?? '1Do runtime app'}`;

      return {
        title: runtimeTitle,
        rows: [
          addressRow('Wallet', walletAddress),
          row(
            'Runtime app',
            appNameForAddress(appAddress) ?? 'Unknown 1Do app',
          ),
          ...(appCall?.rows ?? []),
        ],
        advancedRows: [
          addressRow('App logic', appAddress),
          hashRow('App calldata hash', appData),
          ...(appCall?.advancedRows ?? []),
        ],
        warning: appCall
          ? undefined
          : 'The wallet can identify the runtime app and calldata hash, but not the inner app action.',
      };
    }

    if (parsed.name === 'executeWithTokenPull') {
      const target = parsed.args.target as string;
      const targetData = parsed.args.data as string;
      const nested = parseRuntimeExecutionRows(targetData, target);

      return {
        title: nested?.title ?? 'Execute 1Do call with token pull',
        rows: [
          addressRow('Buyer wallet', walletAddress),
          addressRow('Target wallet', target),
          tokenAmountRow(
            'Max token pull',
            parsed.args.maxAmount,
            parsed.args.asset,
          ),
          ...withoutRows(nested?.rows, ['Wallet']),
        ],
        advancedRows: [
          addressRow('Pull asset', parsed.args.asset),
          hashRow('Target calldata hash', targetData),
          ...(nested?.advancedRows ?? []),
        ],
        warning: nested?.warning,
      };
    }

    if (parsed.name === 'executeWithNftPull') {
      const target = parsed.args.target as string;
      const targetData = parsed.args.data as string;
      const nested = parseRuntimeExecutionRows(targetData, target);

      return {
        title: nested?.title ?? 'Execute 1Do call with NFT pull',
        rows: [
          addressRow('Buyer wallet', walletAddress),
          addressRow('Target wallet', target),
          addressRow('NFT collection', parsed.args.asset),
          row('Token ID', parsed.args.tokenId),
          ...withoutRows(nested?.rows, ['Wallet']),
        ],
        advancedRows: [
          hashRow('Target calldata hash', targetData),
          ...(nested?.advancedRows ?? []),
        ],
        warning: nested?.warning,
      };
    }

    if (parsed.name === 'executeWithSig') {
      const call = parsed.args.call as {
        target: string;
        value: BigNumber;
        data: string;
      };
      const nested = parseRuntimeExecutionRows(call.data, walletAddress);

      return {
        title: nested?.title ?? 'Execute signed 1Do call',
        rows: [
          addressRow('Wallet', walletAddress),
          addressRow('Target', call.target),
          row('Native value', call.value),
          dateRow('Deadline', parsed.args.deadline),
          ...withoutRows(nested?.rows, ['Wallet']),
        ],
        advancedRows: [
          hashRow('Call data hash', call.data),
          ...(nested?.advancedRows ?? []),
        ],
        warning: nested?.warning,
      };
    }
  } catch {
    return undefined;
  }

  return undefined;
}

const hasOneDoDelegationContext = (transaction?: TransactionMeta) =>
  isSameAddress(transaction?.delegationAddress, ONE_DO_7702_DELEGATE) ||
  transaction?.txParams?.authorizationList?.some(({ address }) =>
    isSameAddress(address, ONE_DO_7702_DELEGATE),
  );

const parseWalletNativeTransferExecution = (
  data: string,
  sourceWalletAddress: string,
  transactionSender: string,
):
  | {
      title: string;
      rows: OneDoClearSigningRow[];
      advancedRows?: OneDoClearSigningRow[];
      warning?: string;
    }
  | undefined => {
  try {
    const parsed = WALLET_NATIVE_TRANSFER_INTERFACE.parseTransaction({ data });

    if (parsed.name === 'tokenTransferWithSig') {
      const recipient = parsed.args.to as string;
      const claimable = isZeroAddress(recipient);

      return {
        title: claimable ? 'Claim token transfer' : 'Submit token transfer',
        rows: [
          tokenAmountRow(
            claimable ? 'Claim' : 'Transfer',
            parsed.args.value,
            parsed.args.asset,
          ),
          addressRow('From wallet', sourceWalletAddress),
          recipientMainRow('To', recipient, 'Transaction sender'),
          ...(claimable
            ? [addressRow('Transaction sender', transactionSender)]
            : []),
          dateRow('Expires', parsed.args.deadline),
        ],
        advancedRows: [
          addressRow('Asset', parsed.args.asset),
          ...(claimable ? [addressRow('Recipient marker', recipient)] : []),
        ],
      };
    }

    if (parsed.name === 'nftTransferWithSig') {
      const recipient = parsed.args.to as string;
      const claimable = isZeroAddress(recipient);

      return {
        title: claimable ? 'Claim NFT gift' : 'Submit NFT transfer',
        rows: [
          addressRow('NFT collection', parsed.args.asset),
          row('Token ID', parsed.args.tokenId),
          addressRow('From wallet', sourceWalletAddress),
          recipientMainRow('To', recipient, 'Transaction sender'),
          ...(claimable
            ? [addressRow('Transaction sender', transactionSender)]
            : []),
          dateRow('Expires', parsed.args.deadline),
        ],
        advancedRows: [
          ...(claimable ? [addressRow('Recipient marker', recipient)] : []),
        ],
      };
    }
  } catch {
    return undefined;
  }

  return undefined;
};

export const isOneDoWalletNativeTransferTransactionCandidate = (
  transaction?: TransactionMeta,
) => {
  const data = transaction?.txParams?.data;
  if (
    !data ||
    !isAddress(transaction?.txParams?.from) ||
    !isAddress(transaction?.txParams?.to)
  ) {
    return false;
  }

  try {
    const parsed = WALLET_NATIVE_TRANSFER_INTERFACE.parseTransaction({ data });
    return (
      parsed.name === 'tokenTransferWithSig' ||
      parsed.name === 'nftTransferWithSig'
    );
  } catch {
    return false;
  }
};

export const getOneDoTransactionClearSigning = (
  transaction?: TransactionMeta,
  options: OneDoTransactionClearSigningOptions = {},
): OneDoClearSigningInfo | undefined => {
  if (!transaction?.txParams?.data) {
    return undefined;
  }

  const transactionSender = transaction.txParams.from;
  if (!isAddress(transactionSender) || !isAddress(transaction.txParams.to)) {
    return undefined;
  }

  const targetAddress = transaction.txParams.to;

  if (options.allowWalletNativeTransferCalldata) {
    const walletNativeTransfer = parseWalletNativeTransferExecution(
      transaction.txParams.data,
      targetAddress,
      transactionSender,
    );
    if (walletNativeTransfer) {
      return withDescriptor(
        {
          title: walletNativeTransfer.title,
          subtitle: 'ERC-7730 clear signing',
          rows: walletNativeTransfer.rows,
          advancedRows: walletNativeTransfer.advancedRows,
          warning: walletNativeTransfer.warning,
        },
        DESCRIPTORS.walletNativeTransfers,
      );
    }
  }

  const walletAddress = transactionSender;
  if (!isSameAddress(targetAddress, walletAddress)) {
    return undefined;
  }

  if (
    !options.allowAccountRuntimeCalldata &&
    !options.hasOneDoDelegationContext &&
    !hasOneDoDelegationContext(transaction)
  ) {
    return undefined;
  }

  const rootUpdate = parseRuntimeAccessUpdate(transaction.txParams.data);
  if (rootUpdate) {
    return withDescriptor(
      {
        title: `${rootUpdate.action} ${rootUpdate.app}`,
        subtitle: 'ERC-7730 clear signing',
        rows: [
          addressRow('Wallet', walletAddress),
          row('Action', `${rootUpdate.action} app`),
          row('App', rootUpdate.app),
        ],
        advancedRows: [addressRow('App logic', rootUpdate.appAddress)],
      },
      DESCRIPTORS.accountRuntime,
    );
  }

  const runtimeExecution = parseRuntimeExecutionRows(
    transaction.txParams.data,
    walletAddress,
  );
  if (runtimeExecution) {
    return withDescriptor(
      {
        title: runtimeExecution.title,
        subtitle: 'ERC-7730 clear signing',
        rows: runtimeExecution.rows,
        advancedRows: runtimeExecution.advancedRows,
        warning: runtimeExecution.warning,
      },
      DESCRIPTORS.accountRuntime,
    );
  }

  try {
    const parsed = ACCOUNT_RUNTIME_INTERFACE.parseTransaction({
      data: transaction.txParams.data,
    });
    if (parsed.name !== 'executeBatch') {
      return undefined;
    }

    const calls = parsed.args.calls as {
      target: string;
      value: BigNumber;
      data: string;
    }[];
    const updates = calls.flatMap((call) => {
      if (
        !isSameAddress(call.target, walletAddress) ||
        !call.value.eq(0) ||
        !call.data ||
        call.data.toLowerCase() === '0x'
      ) {
        return [];
      }

      const update = parseRuntimeAccessUpdate(call.data);
      return update ? [update] : [];
    });

    if (!updates.length) {
      return undefined;
    }

    return withDescriptor(
      {
        title:
          updates.length === 1
            ? `${updates[0].action} ${updates[0].app}`
            : 'Update 1Do app access',
        subtitle: 'ERC-7730 clear signing',
        rows: [
          addressRow('Wallet', walletAddress),
          ...updates.flatMap((update, index) => [
            row(`Action ${index + 1}`, `${update.action} ${update.app}`),
          ]),
        ],
        advancedRows: updates.map((update, index) =>
          addressRow(`App logic ${index + 1}`, update.appAddress),
        ),
      },
      DESCRIPTORS.accountRuntime,
    );
  } catch {
    return undefined;
  }
};
