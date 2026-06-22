import { Hex } from '@metamask/utils';
import {
  EXPERIENCES_TYPE,
  FIRST_PARTY_CONTRACT_NAMES,
} from './first-party-contracts';

export const TX_SIG_LEN = 130;
export const EXPERIENCES_TO_VERIFY: EXPERIENCES_TYPE[] = [];
export const TRUSTED_SIGNERS: Partial<Record<EXPERIENCES_TYPE, Hex>> = {};

// look up the corresponding experience provided an address on a chain id
export const getExperience = (
  address: Hex,
  chainId: Hex,
): EXPERIENCES_TYPE | undefined =>
  (
    Object.entries(FIRST_PARTY_CONTRACT_NAMES) as [
      EXPERIENCES_TYPE,
      Record<Hex, Hex> | undefined,
    ][]
  ).find(
    ([, chainMap]) =>
      (chainMap?.[chainId]?.toLowerCase() as Hex) ===
      (address.toLowerCase() as Hex),
  )?.[0];
