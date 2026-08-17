import { Hex, createProjectLogger } from '@metamask/utils';
import type { Provider } from '@metamask/network-controller';
import {
  DecodedTransactionDataMethod,
  DecodedTransactionDataParam,
  DecodedTransactionDataResponse,
  DecodedTransactionDataSource,
} from '../../../../../shared/types/transaction-decode';
import { decodeUniswapRouterTransactionData } from './uniswap';
import { decodeTransactionDataWithSourcify } from './sourcify';
import { getContractProxyAddress } from './proxy';
import { decodeTransactionDataWithFourByte } from './four-byte';

const log = createProjectLogger('transaction-decode');

export async function decodeTransactionData({
  transactionData,
  contractAddress,
  chainId,
  provider,
  useVerifiedContractDecoding = true,
  use4ByteResolution = true,
}: {
  transactionData: Hex;
  contractAddress: Hex;
  chainId: Hex;
  provider: Provider;
  useVerifiedContractDecoding?: boolean;
  use4ByteResolution?: boolean;
}): Promise<DecodedTransactionDataResponse | undefined> {
  log('Decoding transaction data', {
    transactionData,
    contractAddress,
    chainId,
  });

  const uniswapData = decodeUniswapRouterTransactionData({
    transactionData,
    contractAddress,
    chainId,
  });

  if (uniswapData) {
    log('Decoded with Uniswap commands', uniswapData);

    return {
      data: normalizeDecodedMethods(uniswapData),
      source: DecodedTransactionDataSource.Uniswap,
    };
  }

  if (!useVerifiedContractDecoding && !use4ByteResolution) {
    return undefined;
  }

  const proxyAddress = useVerifiedContractDecoding
    ? await getContractProxyAddress(contractAddress, provider)
    : undefined;

  if (proxyAddress) {
    log('Retrieved proxy implementation address', proxyAddress);
  }

  const address = proxyAddress ?? contractAddress;

  const sourcifyData = useVerifiedContractDecoding
    ? decodeTransactionDataWithSourcify(transactionData, address, chainId)
    : Promise.resolve(undefined);

  const fourByteData = use4ByteResolution
    ? decodeTransactionDataWithFourByte(transactionData)
    : Promise.resolve(undefined);

  const [sourcifyResult, fourByteResult] = await Promise.allSettled([
    sourcifyData,
    fourByteData,
  ]);

  if (sourcifyResult.status === 'fulfilled' && sourcifyResult.value) {
    log('Decoded data with Sourcify', sourcifyResult.value);

    return {
      data: normalizeDecodedMethods([sourcifyResult.value]),
      source: DecodedTransactionDataSource.Sourcify,
    };
  }

  log('Failed to decode data with Sourcify', sourcifyResult);

  if (fourByteResult.status === 'fulfilled' && fourByteResult.value) {
    log('Decoded data with 4Byte', fourByteResult.value);

    return {
      data: normalizeDecodedMethods([fourByteResult.value]),
      source: DecodedTransactionDataSource.FourByte,
    };
  }

  log('Failed to decode data with 4Byte', fourByteResult);

  return undefined;
}

function normalizeDecodedMethods(
  methods: DecodedTransactionDataMethod[],
): DecodedTransactionDataMethod[] {
  return methods.map((method) => normalizeDecodedMethod(method));
}

function normalizeDecodedMethod(
  method: DecodedTransactionDataMethod,
): DecodedTransactionDataMethod {
  return {
    ...method,
    params: method.params.map((param) => normalizeDecodedParam(param)),
  };
}

function normalizeDecodedParam(
  param: DecodedTransactionDataParam,
): DecodedTransactionDataParam {
  return {
    ...param,
    value: normalizeDecodedParamValue(param.value),
    children: param.children?.map((child) => normalizeDecodedParam(child)),
  };
}

// TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31973
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeDecodedParamValue(value: any): any {
  const hexValue = value._hex;

  if (hexValue) {
    return BigInt(hexValue).toString();
  }

  return value;
}
