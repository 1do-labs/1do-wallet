export const CaveatTypes = Object.freeze({
  restrictReturnedAccounts: 'restrictReturnedAccounts' as const,
  restrictNetworkSwitching: 'restrictNetworkSwitching' as const,
});

export const EndowmentTypes = Object.freeze({
  permittedChains: 'endowment:permitted-chains',
});

export const RestrictedEthMethods = Object.freeze({
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  eth_accounts: 'eth_accounts',
});

export const RestrictedMethods = Object.freeze({
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  eth_accounts: 'eth_accounts',
} as const);

// ConnectionPermission is pseudo permission used to make possible
// displaying pre-approved connections in the UI seamlessly, alongside other permissions.
export const ConnectionPermission = Object.freeze({
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  connection_permission: 'connection_permission',
});

// Specify minimum number of permissions to be shown, when abstraction is applied
export const MinPermissionAbstractionDisplayCount = 3;

// Specify number of permissions used as threshold for permission abstraction logic to be applied
export const PermissionsAbstractionThreshold = 3;

export const PermissionWeight = Object.freeze({
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  eth_accounts: 3,
  permittedChains: 3,
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  connection_permission: 3,
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  unknown_permission: 3,
});
