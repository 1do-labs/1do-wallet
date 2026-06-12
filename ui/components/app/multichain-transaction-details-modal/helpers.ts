import { DateTime } from 'luxon';
import { formatChainIdToHex } from '@metamask/bridge-controller';
import { CHAINID_DEFAULT_BLOCK_EXPLORER_URL_MAP } from '../../../../shared/constants/common';
import {
  formatDateWithYearContext,
  shortenAddress,
} from '../../../helpers/utils/util';

/**
 * Creates a transaction URL for an EVM block explorer.
 *
 * @param txId - Transaction ID
 * @param chainId - Network chain ID
 * @returns Full URL to transaction in block explorer, or empty string if no explorer URL
 */
export const getTransactionUrl = (txId: string, chainId: string): string => {
  try {
    const baseUrl =
      CHAINID_DEFAULT_BLOCK_EXPLORER_URL_MAP[formatChainIdToHex(chainId)];
    if (!baseUrl) {
      return '';
    }
    return `${baseUrl}tx/${txId}`;
  } catch {
    return '';
  }
};

/**
 * Creates an address URL for an EVM block explorer.
 *
 * @param address - Wallet address
 * @param chainId - Network chain ID
 * @returns Full URL to address in block explorer, or empty string if no explorer URL
 */
export const getAddressUrl = (address: string, chainId: string): string => {
  try {
    const baseUrl =
      CHAINID_DEFAULT_BLOCK_EXPLORER_URL_MAP[formatChainIdToHex(chainId)];
    if (!baseUrl) {
      return '';
    }
    return `${baseUrl}address/${address}`;
  } catch {
    return '';
  }
};

/**
 * Formats a timestamp into a localized date and time string
 * Example outputs: "Mar 15, 2024, 14:30" or "Dec 25, 2023, 09:45"
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date and time string, or empty string if timestamp is null
 */
export const formatTimestamp = (timestamp: number | null) => {
  if (!timestamp) {
    return '';
  }

  // Some sources use second-based timestamps while JS Dates use milliseconds.
  const timestampMs = timestamp < 1e12 ? timestamp * 1000 : timestamp;

  const dateTime = DateTime.fromMillis(timestampMs);
  const date = formatDateWithYearContext(timestampMs, 'MMM d, y', 'MMM d');
  const time = dateTime.toFormat('HH:mm');

  return `${date}, ${time}`;
};

/**
 * Formats a shorten version of a transaction ID.
 *
 * @param txId - Transaction ID.
 * @returns Formatted transaction ID.
 */
export function shortenTransactionId(txId: string) {
  // For transactions we use a similar output for now, but shortenTransactionId will be added later.
  return shortenAddress(txId);
}
