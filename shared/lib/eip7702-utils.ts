import {
  TransactionEnvelopeType,
  TransactionType,
  TransactionParams,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

export const EIP_7702_REVOKE_ADDRESS =
  '0x0000000000000000000000000000000000000000';

export const ONE_DO_7702_DELEGATE =
  '0x90B7a4042238509789279546f4bB9886933Ae5a7' as Hex;

export const getOneDo7702Delegate = (chainId?: string) =>
  chainId && /^0x[0-9a-f]+$/iu.test(chainId) ? ONE_DO_7702_DELEGATE : undefined;

export const isOneDo7702SupportedChain = (chainId?: string) =>
  Boolean(getOneDo7702Delegate(chainId));

export const EIP_7702_DELEGATION_PREFIX = '0xef0100';

export const isOneDo7702UpgradeAuthorization = (
  authorizationAddress?: string,
) => authorizationAddress?.toLowerCase() === ONE_DO_7702_DELEGATE.toLowerCase();

export const getEip7702DelegationAddress = (code?: string | null) => {
  if (
    typeof code !== 'string' ||
    !new RegExp(`^${EIP_7702_DELEGATION_PREFIX}[a-fA-F0-9]{40}$`, 'u').test(
      code,
    )
  ) {
    return undefined;
  }

  return `0x${code.slice(EIP_7702_DELEGATION_PREFIX.length)}` as Hex;
};

export const isOneDo7702DelegationCode = (code?: string | null) =>
  isOneDo7702UpgradeAuthorization(getEip7702DelegationAddress(code));

export type EIP7702TransactionParams = {
  address: Hex;
  upgradeContractAddress?: Hex;
  networkClientId: string;
};

export type EIP7702TransactionResult = {
  transactionHash: string;
  delegatedTo?: string;
  transactionId?: string;
};

/**
 * Creates an EIP-7702 upgrade transaction.
 *
 * @param params - The transaction parameters
 * @param addTransactionAndWaitForPublish - Function to add transaction and wait for publish
 * @returns Promise with transaction result
 */
export async function createEIP7702UpgradeTransaction(
  params: EIP7702TransactionParams,
  addTransactionAndWaitForPublish: (
    transactionParams: TransactionParams,
    options: {
      networkClientId: string;
      requireApproval?: boolean;
      type?: TransactionType;
    },
  ) => Promise<TransactionMeta>,
): Promise<EIP7702TransactionResult> {
  const { address, upgradeContractAddress, networkClientId } = params;

  if (!upgradeContractAddress) {
    throw new Error('Upgrade contract address is required');
  }

  const transactionParams: TransactionParams = {
    authorizationList: [
      {
        address: upgradeContractAddress,
      },
    ],
    from: address,
    to: address,
    type: TransactionEnvelopeType.setCode,
  };

  const transactionMeta = await addTransactionAndWaitForPublish(
    transactionParams,
    {
      networkClientId,
      requireApproval: true,
      type: TransactionType.batch,
    },
  );

  if (!transactionMeta.hash) {
    throw new Error('Transaction hash is missing from transaction metadata');
  }

  if (!transactionMeta.id) {
    throw new Error('Transaction ID is missing from transaction metadata');
  }

  return {
    transactionHash: transactionMeta.hash,
    delegatedTo: upgradeContractAddress,
    transactionId: transactionMeta.id,
  };
}

/**
 * Creates an EIP-7702 downgrade transaction.
 *
 * @param params - The transaction parameters
 * @param addTransactionAndWaitForPublish - Function to add transaction and wait for publish
 * @returns Promise with transaction result
 */
export async function createEIP7702DowngradeTransaction(
  params: EIP7702TransactionParams,
  addTransactionAndWaitForPublish: (
    transactionParams: TransactionParams,
    options: {
      networkClientId: string;
      requireApproval?: boolean;
      type?: TransactionType;
    },
  ) => Promise<TransactionMeta>,
): Promise<EIP7702TransactionResult> {
  const { address, networkClientId } = params;

  const transactionParams: TransactionParams = {
    authorizationList: [
      {
        address: EIP_7702_REVOKE_ADDRESS,
      },
    ],
    from: address,
    to: address,
    type: TransactionEnvelopeType.setCode,
  };

  const transactionMeta = await addTransactionAndWaitForPublish(
    transactionParams,
    {
      networkClientId,
      requireApproval: true,
      type: TransactionType.revokeDelegation,
    },
  );

  if (!transactionMeta.hash) {
    throw new Error('Transaction hash is missing from transaction metadata');
  }

  if (!transactionMeta.id) {
    throw new Error('Transaction ID is missing from transaction metadata');
  }

  return {
    transactionHash: transactionMeta.hash,
    transactionId: transactionMeta.id,
  };
}

/**
 * Checks if an account is upgraded by checking if it has code.
 *
 * @param address - The account address to check
 * @param networkClientId - The network client ID
 * @param getCode - Function to get account code
 * @returns Promise with boolean indicating if account is upgraded
 */
export async function isAccountUpgraded(
  address: Hex,
  networkClientId: string,
  getCode: (address: Hex, networkClientId: string) => Promise<string | null>,
): Promise<boolean> {
  const code = await getCode(address, networkClientId);
  return Boolean(code && code.length > 2);
}

/**
 * Gets the current EIP-7702 delegation address for an account.
 *
 * @param address - The account address to check
 * @param networkClientId - The network client ID
 * @param getCode - Function to get account code
 * @returns Promise with the delegated address, if the account has EIP-7702 delegation code
 */
export async function getAccountDelegationAddress(
  address: Hex,
  networkClientId: string,
  getCode: (address: Hex, networkClientId: string) => Promise<string | null>,
): Promise<Hex | undefined> {
  const code = await getCode(address, networkClientId);
  return getEip7702DelegationAddress(code);
}
