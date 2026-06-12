import { CaipNamespace, KnownCaipNamespace } from '@metamask/utils';

/**
 * Returns the associated chain's type for the given address.
 *
 * @param _address - The address to check.
 * @returns The chain's type for that address.
 */
export function getCaipNamespaceFromAddress(_address: string): CaipNamespace {
  return KnownCaipNamespace.Eip155;
}
