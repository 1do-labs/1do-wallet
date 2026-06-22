/**
 * Hook to determine if gasless transactions are supported for the current confirmation context.
 *
 * @returns An object containing:
 * - `isSupported`: always `false`; 1do does not use gasless relay.
 * - `isSmartTransaction`: always `false`.
 * - `pending`: always `false`.
 */
export function useIsGaslessSupported() {
  return {
    isSupported: false,
    isSmartTransaction: false,
    pending: false,
  };
}
