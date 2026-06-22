import BigNumber from 'bignumber.js';
import { Numeric } from './Numeric';

export const TOKEN_TRANSFER_LOG_TOPIC_HASH =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export const TRANSACTION_NO_CONTRACT_ERROR_KEY = 'transactionErrorNoContract';

export const TRANSFER_SINFLE_LOG_TOPIC_HASH =
  '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62';

export const TEN_SECONDS_IN_MILLISECONDS = 10_000;

export function calcGasTotal(
  gasLimit: string | number = '0',
  gasPrice: string | number = '0',
): string {
  return new Numeric(gasLimit, 16).times(new Numeric(gasPrice, 16)).toString();
}

/**
 * Given a number and specified precision, returns that number in base 10 with a maximum of precision
 * significant digits, but without any trailing zeros after the decimal point To be used when wishing
 * to display only as much digits to the user as necessary
 *
 * @param n - The number to format
 * @param precision - The maximum number of significant digits in the return value
 * @returns The number in decimal form, with <= precision significant digits and no decimal trailing zeros
 */
export function toPrecisionWithoutTrailingZeros(
  n: string | number | BigNumber,
  precision: number,
): string {
  return new BigNumber(n as string | number)
    .toPrecision(precision)
    .replace(/(\.[0-9]*[1-9])0*|(\.0*)/u, '$1');
}

/**
 * @param value - The token amount value
 * @param decimals - The number of decimals for the token
 * @returns The token amount as a BigNumber
 */
export function calcTokenAmount(
  value: string | number | BigNumber,
  decimals: number | undefined,
): BigNumber {
  const divisor = new BigNumber(10).pow(decimals ?? 0);
  return new BigNumber(String(value)).div(divisor);
}

export const TRANSACTION_ENVELOPE_TYPE_NAMES = {
  FEE_MARKET: 'fee-market',
  LEGACY: 'legacy',
};
