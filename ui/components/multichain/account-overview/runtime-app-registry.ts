const APP_BASE_URL = 'https://app.1do.io';

export type RuntimeAppId =
  | 'settings'
  | 'redpacket'
  | 'gift'
  | 'pay'
  | 'dex'
  | 'nftmarket'
  | 'flashloan'
  | 'will'
  | 'sessionpay';

export type RuntimeAppSurface = 'wallet' | 'core';

export type RuntimeAppDefinition = {
  id: RuntimeAppId;
  label: string;
  path: string;
  surfaces: RuntimeAppSurface[];
};

const RUNTIME_APP_REGISTRY: RuntimeAppDefinition[] = [
  {
    id: 'settings',
    label: 'Settings',
    path: '',
    surfaces: ['wallet'],
  },
  {
    id: 'redpacket',
    label: 'Red Packet',
    path: 'redpacket',
    surfaces: ['wallet'],
  },
  {
    id: 'gift',
    label: 'Gift',
    path: 'gift',
    surfaces: ['wallet'],
  },
  {
    id: 'pay',
    label: 'Pay',
    path: 'pay',
    surfaces: ['wallet'],
  },
  {
    id: 'dex',
    label: 'Dex',
    path: 'dex',
    surfaces: ['wallet', 'core'],
  },
  {
    id: 'nftmarket',
    label: 'NFT Market',
    path: 'nftmarket',
    surfaces: ['wallet', 'core'],
  },
  {
    id: 'flashloan',
    label: 'Flash Loan',
    path: 'flashloan',
    surfaces: ['wallet', 'core'],
  },
  {
    id: 'will',
    label: 'Will',
    path: 'will',
    surfaces: ['wallet', 'core'],
  },
  {
    id: 'sessionpay',
    label: 'Session Pay',
    path: 'sessionpay',
    surfaces: ['wallet', 'core'],
  },
];

export const getRuntimeAppUrl = (app: RuntimeAppDefinition) => {
  return app.path ? `${APP_BASE_URL}/${app.path}` : APP_BASE_URL;
};

export const getRuntimeAppsForSurface = (surface: RuntimeAppSurface) =>
  RUNTIME_APP_REGISTRY.filter((app) => app.surfaces.includes(surface));
