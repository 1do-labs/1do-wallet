import { KeyringTypes } from '@metamask/keyring-controller';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { EthAccountType, EthScope } from '@metamask/keyring-api';
import {
  ETH_EOA_METHODS,
  ETH_4337_METHODS,
} from '../../shared/constants/eth-methods';

export const MOCK_ACCOUNT_EOA: InternalAccount = {
  id: '4974fc00-c0fb-4a18-8535-8407ec6d1952',
  address: '0xa0b86991c431e50c0dd0b653aa1e8c7b7c66f5e4b',
  options: {},
  methods: ETH_EOA_METHODS,
  scopes: [EthScope.Eoa],
  type: EthAccountType.Eoa,
  metadata: {
    name: 'Account 1',
    keyring: { type: KeyringTypes.hd },
    importTime: 1691565967600,
    lastSelected: 1691565967656,
  },
};

export const MOCK_ACCOUNT_PRIVATE_KEY: InternalAccount = {
  id: 'd6ad74fa-ca5e-4d2d-ad53-95ababbfe872',
  address: '0x2990079bcdee240329a520d2444386fc119da21a',
  options: {},
  methods: [
    'personal_sign',
    'eth_sign',
    'eth_signTransaction',
    'eth_signTypedData_v1',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
  ],
  scopes: [EthScope.Mainnet],
  type: EthAccountType.Eoa,
  metadata: {
    name: 'Account 58',
    importTime: 1750963640738,
    keyring: { type: KeyringTypes.simple },
    lastSelected: 1750963640759,
  },
};

export const MOCK_ACCOUNT_HARDWARE: InternalAccount = {
  id: 'a4a41a3d-13d9-4ef3-be2f-aa28f47879aa',
  address: '0x3a3fc52253e62cf4f3573814aa410736c9db5d0c',
  options: {},
  methods: [
    'personal_sign',
    'eth_sign',
    'eth_signTransaction',
    'eth_signTypedData_v1',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
  ],
  scopes: [EthScope.Mainnet],
  type: EthAccountType.Eoa,
  metadata: {
    name: 'Ledger 2',
    importTime: 1750963627141,
    keyring: { type: KeyringTypes.ledger },
    lastSelected: 1750963627172,
    nameLastUpdatedAt: 1750963627173,
  },
};

export const MOCK_ACCOUNT_INSTITUTIONAL: InternalAccount = {
  id: 'c0949edb-b843-4d20-be0b-80f2a8ef6552',
  options: {
    custodian: {
      environmentName: 'neptune-prod',
      displayName: 'Neptune',
      deferPublication: false,
      importOrigin: 'https://neptune-custody-ui.metamask-institutional.io',
    },
    accountName: 'Custody Account A',
  },
  address: '0xc073fd7d1522c4103e0d8e407fa763d3ac8417e6',
  methods: [
    'eth_signTransaction',
    'personal_sign',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
  ],
  type: 'eip155:eoa',
  scopes: ['eip155:0'],
  metadata: {
    name: 'Custody Account A',
    importTime: 1751048625733,
    keyring: { type: 'Custody Keyring' },
    lastSelected: 1751048625755,
  },
};

export const MOCK_ACCOUNT_ERC4337: InternalAccount = {
  id: '4d5921f2-2022-44ce-a84f-9f6a0f142a5c',
  address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
  options: {},
  methods: ETH_EOA_METHODS.concat(ETH_4337_METHODS),
  // Smart accounts might not be available on every EVM chains, but that's ok for mock purposes.
  scopes: [EthScope.Testnet],
  type: EthAccountType.Erc4337,
  metadata: {
    name: 'Account 2',
    keyring: { type: KeyringTypes.hd },
    importTime: 1691565967600,
    lastSelected: 1691565967656,
  },
};

export const MOCK_ACCOUNTS = {
  [MOCK_ACCOUNT_EOA.id]: MOCK_ACCOUNT_EOA,
  [MOCK_ACCOUNT_ERC4337.id]: MOCK_ACCOUNT_ERC4337,
  [MOCK_ACCOUNT_HARDWARE.id]: MOCK_ACCOUNT_HARDWARE,
  [MOCK_ACCOUNT_PRIVATE_KEY.id]: MOCK_ACCOUNT_PRIVATE_KEY,
};

export const MOCK_ACCOUNT_ID_BY_ADDRESS = {
  [MOCK_ACCOUNT_EOA.address]: MOCK_ACCOUNT_EOA.id,
  [MOCK_ACCOUNT_ERC4337.address]: MOCK_ACCOUNT_ERC4337.id,
  [MOCK_ACCOUNT_HARDWARE.address]: MOCK_ACCOUNT_HARDWARE.id,
  [MOCK_ACCOUNT_PRIVATE_KEY.address]: MOCK_ACCOUNT_PRIVATE_KEY.id,
};
