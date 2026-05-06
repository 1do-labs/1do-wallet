import { BtcAccountType } from '@metamask/keyring-api';

export const MULTICHAIN_ACCOUNT_TYPE_TO_SNAP_ID = {};

export const MULTICHAIN_ACCOUNT_TYPE_TO_NAME = {
  [BtcAccountType.P2pkh]: 'Legacy',
  [BtcAccountType.P2sh]: 'SegWit',
  [BtcAccountType.P2wpkh]: 'Native SegWit',
  [BtcAccountType.P2tr]: 'Taproot',
};
