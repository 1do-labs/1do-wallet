import { Hex } from '@metamask/utils';

// eslint-disable-next-line @typescript-eslint/naming-convention
export type EXPERIENCES_TYPE = never;

/**
 * A map of first-party contract names to their addresses on various chains.
 */
export const FIRST_PARTY_CONTRACT_NAMES: Partial<
  Record<EXPERIENCES_TYPE, Record<Hex, Hex>>
> = {};
