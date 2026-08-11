export enum AlertTypes {
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  unconnectedAccount = 'unconnectedAccount',
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
  // eslint-disable-next-line @typescript-eslint/naming-convention
  invalidCustomNetwork = 'invalidCustomNetwork',
}

/**
 * Alerts that can be enabled or disabled by the user.
 */
export const TOGGLEABLE_ALERT_TYPES = [AlertTypes.unconnectedAccount];
