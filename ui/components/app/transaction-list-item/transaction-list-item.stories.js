import React from 'react';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { MOCK_TRANSACTION_BY_TYPE } from '../../../../.storybook/initial-states/transactions';
import TransactionListItem from '.';

/**
 * @typedef {(import('../../selectors/transactions').TransactionGroup} TransactionGroup
 */

/**
 * @param {object} args
 * @returns {TransactionGroup}
 */
const getMockTransactionGroup = (args) => {
  const status = args['transactionGroup.primaryTransaction.status'];
  const submittedTime =
    args['transactionGroup.primaryTransaction.submittedTime'];
  const specificDataForTxParams =
    args['transactionGroup.primaryTransaction.txParams.data'];
  const basePrimaryTransaction = args['transactionGroup.primaryTransaction'];

  const tx = {
    ...basePrimaryTransaction, // Spread type, txParamsOriginal, and base txParams (like .from, .to, .value)
    status,
    submittedTime,
    txParams: {
      ...(basePrimaryTransaction.txParams || {}), // Start with txParams from basePrimaryTransaction
      data: specificDataForTxParams, // Override/set the data field
    },
  };

  return {
    hasCancelled: args['transactionGroup.hasCancelled'],
    hasRetried: args['transactionGroup.hasRetried'],
    nonce: '0x1',
    initialTransaction: tx,
    primaryTransaction: tx,
    transactions: [tx],
  };
};

/**
 * Transaction List Item Storybook Page
 *
 * Each page displays a different Transaction Type (TransactionType)
 * except TransactionType.cancel and TransactionType.retry as these two types
 * are never initialTransactions
 */
export default {
  title: 'Components/App/TransactionListItem',

  argTypes: {
    isEarliestNonce: { control: 'boolean' },
    'transactionGroup.hasCancelled': { control: 'boolean' },
    'transactionGroup.hasRetried': { control: 'boolean' },
    'transactionGroup.primaryTransaction.status': {
      options: Object.values(TransactionStatus)
        .filter((status) => {
          return status !== TransactionStatus.signed;
        })
        .sort(),
      control: { type: 'select' },
    },
    'transactionGroup.primaryTransaction.submittedTime': { control: 'number' },
    'transactionGroup.primaryTransaction': { control: 'object' },
    'transactionGroup.primaryTransaction.txParams': { control: 'object' },
    'transactionGroup.primaryTransaction.txParams.data': { control: 'text' },
  },
  args: {
    isEarliestNonce: true,
    'transactionGroup.hasCancelled': false,
    'transactionGroup.hasRetried': false,
    'transactionGroup.primaryTransaction.status': TransactionStatus.pending,
    'transactionGroup.primaryTransaction.submittedTime': 19999999999999,
    'transactionGroup.primaryTransaction.txParams.data':
      '0xa9059cbb000000000000000000000000b19ac54efa18cc3a14a5b821bfec73d284bf0c5e0000000000000000000000000000000000000000000000003782dace9d900000',
  },
};

const Template = (args) => {
  const transactionGroup = getMockTransactionGroup(args);
  return (
    <TransactionListItem
      transactionGroup={transactionGroup}
      isEarliestNonce={args.isEarliestNonce}
    />
  );
};

export const ContractInteraction = Template.bind({});
export const DeployContract = Template.bind({});
export const EthDecrypt = Template.bind({});
export const EthGetEncryptionPublicKey = Template.bind({});
export const Incoming = Template.bind({});
export const PersonalSign = Template.bind({});
export const Sign = Template.bind({});
export const SignTypeData = Template.bind({});
export const SimpleSend = Template.bind({});
export const Smart = Template.bind({});
export const TokenMethodApprove = Template.bind({});
export const TokenMethodSafeTransferFrom = Template.bind({});
export const TokenMethodTransfer = Template.bind({});
export const TokenMethodTransferFrom = Template.bind({});

ContractInteraction.storyName = 'contractInteraction';
ContractInteraction.args = {
  'transactionGroup.primaryTransaction': {
    ...MOCK_TRANSACTION_BY_TYPE[TransactionType.contractInteraction],
  },
};

DeployContract.storyName = 'contractDeployment';
DeployContract.args = {
  'transactionGroup.primaryTransaction': {
    ...MOCK_TRANSACTION_BY_TYPE[TransactionType.deployContract],
  },
};

EthDecrypt.storyName = 'eth_decrypt';
EthDecrypt.args = {
  'transactionGroup.primaryTransaction': {
    ...MOCK_TRANSACTION_BY_TYPE[TransactionType.ethDecrypt],
  },
};

EthGetEncryptionPublicKey.storyName = 'eth_getEncryptionPublicKey';
EthGetEncryptionPublicKey.args = {
  'transactionGroup.primaryTransaction': {
    ...MOCK_TRANSACTION_BY_TYPE[TransactionType.ethGetEncryptionPublicKey],
  },
};

Incoming.storyName = 'incoming';
Incoming.args = {
  'transactionGroup.primaryTransaction': {
    ...MOCK_TRANSACTION_BY_TYPE[TransactionType.incoming],
  },
};

PersonalSign.storyName = 'personal_sign';
PersonalSign.args = {
  'transactionGroup.primaryTransaction': {
    ...MOCK_TRANSACTION_BY_TYPE[TransactionType.personalSign],
  },
};

Sign.storyName = 'sign';
Sign.args = {
  'transactionGroup.primaryTransaction': {
    ...MOCK_TRANSACTION_BY_TYPE[TransactionType.sign],
  },
};

SignTypeData.storyName = 'eth_signTypedData';
SignTypeData.args = {
  'transactionGroup.primaryTransaction': {
    ...MOCK_TRANSACTION_BY_TYPE[TransactionType.signTypedData],
  },
};

SimpleSend.storyName = 'simpleSend';
SimpleSend.args = {
  'transactionGroup.primaryTransaction': {
    ...MOCK_TRANSACTION_BY_TYPE[TransactionType.simpleSend],
  },
};

Smart.storyName = 'smart';
Smart.args = {
  'transactionGroup.primaryTransaction': {
    ...MOCK_TRANSACTION_BY_TYPE[TransactionType.smart],
  },
};

TokenMethodApprove.storyName = 'approve';
TokenMethodApprove.args = {
  'transactionGroup.primaryTransaction': {
    ...MOCK_TRANSACTION_BY_TYPE[TransactionType.tokenMethodApprove],
  },
};

TokenMethodSafeTransferFrom.storyName = 'safetransferfrom';
TokenMethodSafeTransferFrom.args = {
  'transactionGroup.primaryTransaction': {
    ...MOCK_TRANSACTION_BY_TYPE[TransactionType.tokenMethodSafeTransferFrom],
  },
};

TokenMethodTransfer.storyName = 'transfer';
TokenMethodTransfer.args = {
  'transactionGroup.primaryTransaction': {
    ...MOCK_TRANSACTION_BY_TYPE[TransactionType.tokenMethodTransfer],
  },
};

TokenMethodTransferFrom.storyName = 'transferfrom';
TokenMethodTransferFrom.args = {
  'transactionGroup.primaryTransaction': {
    ...MOCK_TRANSACTION_BY_TYPE[TransactionType.tokenMethodTransferFrom],
  },
};
