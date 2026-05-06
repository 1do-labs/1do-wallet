/**
 * Allowed values for default address scope in the EVM-only build.
 */
export type DefaultAddressScope = 'eip155';

/**
 * Default address scope: which chain namespace is used when showing a single
 * "default" address (e.g. in the account list hover or in Settings).
 */
export const DEFAULT_ADDRESS_OPTIONS: {
  value: DefaultAddressScope;
  messageKey: string;
}[] = [
  { value: 'eip155', messageKey: 'ethereumAndEvms' },
];

/**
 * Scope → i18n message key for the "Default: X" display label for default address.
 * For eip155 uses "Ethereum"; other scopes match the Settings keys.
 */
export const DEFAULT_ADDRESS_DISPLAY_KEY_BY_SCOPE = Object.fromEntries(
  DEFAULT_ADDRESS_OPTIONS.map((opt) => [
    opt.value,
    opt.value === 'eip155' ? 'networkNameEthereum' : opt.messageKey,
  ]),
) as Record<DefaultAddressScope, string>;
