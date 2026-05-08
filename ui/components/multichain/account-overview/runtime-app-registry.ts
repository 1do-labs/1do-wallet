const APP_BASE_URL = 'https://app.1do.io';
const STORE_BASE_URL = 'https://store.1do.io';

export type RuntimeAppId =
  | 'settings'
  | 'redpacket'
  | 'gift'
  | 'pay'
  | 'peerdex'
  | 'closesky'
  | 'flashman'
  | 'cryptowill'
  | 'blinkpay'
  | 'store';

export type RuntimeAppSurface = 'wallet' | 'core';

export type RuntimeAppDefinition = {
  id: RuntimeAppId;
  label: string;
  path: string;
  host: 'app' | 'store';
  surfaces: RuntimeAppSurface[];
  coreVariant?: 'default' | 'featured';
};

const RUNTIME_APP_REGISTRY: RuntimeAppDefinition[] = [
  {
    id: 'settings',
    label: 'Settings',
    path: '',
    host: 'app',
    surfaces: ['wallet'],
  },
  {
    id: 'redpacket',
    label: 'Red Packet',
    path: 'redpacket',
    host: 'app',
    surfaces: ['wallet', 'core'],
  },
  {
    id: 'gift',
    label: 'Gift',
    path: 'gift',
    host: 'app',
    surfaces: ['wallet', 'core'],
  },
  {
    id: 'pay',
    label: 'Pay',
    path: 'pay',
    host: 'app',
    surfaces: ['wallet', 'core'],
  },
  {
    id: 'peerdex',
    label: 'PeerDex',
    path: 'peerdex',
    host: 'app',
    surfaces: ['wallet', 'core'],
  },
  {
    id: 'closesky',
    label: 'Closesky',
    path: 'closesky',
    host: 'app',
    surfaces: ['wallet', 'core'],
  },
  {
    id: 'flashman',
    label: 'Flashman',
    path: 'flashman',
    host: 'app',
    surfaces: ['wallet', 'core'],
  },
  {
    id: 'cryptowill',
    label: 'CryptoWill',
    path: 'cryptowill',
    host: 'app',
    surfaces: ['wallet', 'core'],
  },
  {
    id: 'blinkpay',
    label: 'BlinkPay',
    path: 'blinkpay',
    host: 'app',
    surfaces: ['wallet', 'core'],
  },
  {
    id: 'store',
    label: 'Store',
    path: '',
    host: 'store',
    surfaces: ['wallet', 'core'],
    coreVariant: 'featured',
  },
];

export const getRuntimeAppUrl = (app: RuntimeAppDefinition) => {
  const baseUrl = app.host === 'store' ? STORE_BASE_URL : APP_BASE_URL;
  return app.path ? `${baseUrl}/${app.path}` : baseUrl;
};

export const getRuntimeAppsForSurface = (surface: RuntimeAppSurface) =>
  RUNTIME_APP_REGISTRY.filter((app) => app.surfaces.includes(surface));
