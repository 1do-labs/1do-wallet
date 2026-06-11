import type { TransactionMeta } from '@metamask/transaction-controller';

import { isValidHexAddress } from './hexstring-utils';

const ENABLE_APP_SELECTOR = '0x787f863d';
const DISABLE_APP_SELECTOR = '0xdb0fd53b';
const ADDRESS_WORD_LENGTH = 64;
const HEX_WORD_PATTERN = /^[0-9a-f]{64}$/iu;

export function isOneDoRuntimeAccessUpdateCalldata(data?: string) {
  if (!data) {
    return false;
  }

  const normalizedData = data.toLowerCase();
  const selector = normalizedData.slice(0, 10);
  if (selector !== ENABLE_APP_SELECTOR && selector !== DISABLE_APP_SELECTOR) {
    return false;
  }

  const encodedApp = normalizedData.slice(10);
  if (
    encodedApp.length !== ADDRESS_WORD_LENGTH ||
    !HEX_WORD_PATTERN.test(encodedApp)
  ) {
    return false;
  }

  return isValidHexAddress(`0x${encodedApp.slice(24)}`);
}

export function isOneDoRuntimeAccessUpdateTransaction(
  transaction?: TransactionMeta,
) {
  const { from, to, data } = transaction?.txParams ?? {};

  return Boolean(
    from &&
      to &&
      isValidHexAddress(from) &&
      isValidHexAddress(to) &&
      isOneDoRuntimeAccessUpdateCalldata(data),
  );
}
