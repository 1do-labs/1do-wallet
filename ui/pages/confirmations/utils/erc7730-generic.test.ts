import { TransactionStatus } from '@metamask/transaction-controller';
import { utils as ethersUtils } from 'ethers';
import type { SignatureRequestType } from '../types/confirm';
import {
  getGenericErc7730TransactionClearSigning,
  getGenericErc7730TypedDataClearSigning,
  hashErc7730Descriptor,
  type Erc7730Descriptor,
} from './erc7730-generic';
import {
  getRegistryErc7730TypedDataClearSigning,
  type Erc7730Eip712Index,
} from './erc7730-registry';

const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';
const TOKEN_ADDRESS = '0x1111111111111111111111111111111111111111';
const SPENDER_ADDRESS = '0x2222222222222222222222222222222222222222';

const permit2Descriptor = {
  display: {
    formats: {
      'PermitSingle(PermitDetails details,address spender,uint256 sigDeadline)PermitDetails(address token,uint160 amount,uint48 expiration,uint48 nonce)':
        {
          intent: 'Authorize spending of token',
          fields: [
            {
              path: 'spender',
              label: 'Spender',
              format: 'raw',
              visible: 'always',
            },
            {
              path: 'details.amount',
              label: 'Amount allowance',
              format: 'tokenAmount',
              params: {
                tokenPath: 'details.token',
              },
              visible: 'always',
            },
            {
              path: 'details.expiration',
              label: 'Approval expires',
              format: 'date',
              params: {
                encoding: 'timestamp',
              },
            },
            {
              label: 'Sig Deadline',
              path: 'sigDeadline',
              visible: 'never',
            },
          ],
        },
    },
  },
};

const erc2612PermitDescriptor = {
  display: {
    formats: {
      'Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)':
        {
          intent: 'Authorize spending of tokens',
          fields: [
            {
              path: 'spender',
              label: 'Spender',
              format: 'raw',
              visible: 'always',
            },
            {
              path: 'value',
              label: 'Max spending amount',
              format: 'tokenAmount',
              params: {
                tokenPath: '@.to',
              },
              visible: 'always',
            },
            {
              path: 'deadline',
              label: 'Valid until',
              format: 'date',
              params: {
                encoding: 'timestamp',
              },
            },
            {
              label: 'Owner',
              path: 'owner',
              visible: 'never',
            },
            {
              label: 'Nonce',
              path: 'nonce',
              visible: 'never',
            },
          ],
        },
    },
  },
};

const aaveSupplyDescriptor = {
  metadata: {
    owner: 'Aave DAO',
  },
  display: {
    formats: {
      'supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)':
        {
          intent: 'Supply',
          fields: [
            {
              path: 'amount',
              format: 'tokenAmount',
              label: 'Amount to supply',
              params: {
                tokenPath: 'asset',
              },
              visible: 'always',
            },
            {
              path: 'onBehalfOf',
              format: 'addressName',
              label: 'Collateral recipient',
              visible: 'always',
            },
            {
              label: 'Referral Code',
              path: 'referralCode',
              visible: 'never',
            },
          ],
        },
    },
  },
};

const permit2TypedData = {
  msgParams: {
    data: JSON.stringify({
      domain: {
        chainId: 10,
        verifyingContract: PERMIT2_ADDRESS,
      },
      types: {
        EIP712Domain: [
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' },
        ],
        PermitDetails: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint160' },
          { name: 'expiration', type: 'uint48' },
          { name: 'nonce', type: 'uint48' },
        ],
        PermitSingle: [
          { name: 'details', type: 'PermitDetails' },
          { name: 'spender', type: 'address' },
          { name: 'sigDeadline', type: 'uint256' },
        ],
      },
      primaryType: 'PermitSingle',
      message: {
        details: {
          token: TOKEN_ADDRESS,
          amount: '1000000',
          expiration: '4102444800',
          nonce: '7',
        },
        spender: SPENDER_ADDRESS,
        sigDeadline: '4102444800',
      },
    }),
  },
} as SignatureRequestType;

describe('generic ERC-7730 clear signing parser', () => {
  it('renders a safe subset of an official-registry EIP-712 descriptor', () => {
    const descriptorJson = JSON.stringify(permit2Descriptor);
    const descriptorSha256 = hashErc7730Descriptor(descriptorJson);

    expect(
      getGenericErc7730TypedDataClearSigning(
        permit2TypedData,
        permit2Descriptor as unknown as Erc7730Descriptor,
        {
          descriptorId: 'registry/uniswap/eip712-uniswap-permit2.json',
          descriptorSha256,
        },
      ),
    ).toMatchObject({
      title: 'Authorize spending of token',
      subtitle: 'ERC-7730 registry clear signing',
      descriptorId: 'registry/uniswap/eip712-uniswap-permit2.json',
      descriptorSha256,
      rows: [
        {
          label: 'Spender',
          value: SPENDER_ADDRESS,
          valueType: 'address',
        },
        {
          label: 'Amount allowance',
          value: '1000000 raw units',
          valueType: 'tokenAmount',
          rawValue: '1000000',
          tokenAddress: TOKEN_ADDRESS,
        },
        {
          label: 'Approval expires',
          value: '2100-01-01T00:00:00.000Z',
        },
      ],
    });
  });

  it('resolves an EIP-712 descriptor through a pinned registry index and descriptor store', () => {
    const path = 'registry/uniswap/eip712-uniswap-permit2.json';
    const descriptorJson = JSON.stringify(permit2Descriptor);
    const sha256 = hashErc7730Descriptor(descriptorJson);
    const index: Erc7730Eip712Index = {
      'eip155:10:0x000000000022d473030f116ddee9f6b43ac78ba3': {
        PermitSingle: [
          {
            path,
          },
        ],
      },
    };

    expect(
      getRegistryErc7730TypedDataClearSigning({
        confirmation: permit2TypedData,
        index,
        descriptorStore: {
          [path]: {
            descriptor: permit2Descriptor as unknown as Erc7730Descriptor,
            json: descriptorJson,
            sha256,
          },
        },
      }),
    ).toMatchObject({
      title: 'Authorize spending of token',
      descriptorId: path,
      descriptorSha256: sha256,
    });
  });

  it('uses the EIP-712 verifying contract for token paths that reference @.to', () => {
    const descriptorJson = JSON.stringify(erc2612PermitDescriptor);
    const descriptorSha256 = hashErc7730Descriptor(descriptorJson);

    expect(
      getGenericErc7730TypedDataClearSigning(
        {
          msgParams: {
            data: JSON.stringify({
              domain: {
                chainId: 10,
                verifyingContract: TOKEN_ADDRESS,
              },
              primaryType: 'Permit',
              message: {
                owner: '0x3333333333333333333333333333333333333333',
                spender: SPENDER_ADDRESS,
                value: '2500000',
                nonce: '2',
                deadline: '4102444800',
              },
            }),
          },
        } as SignatureRequestType,
        erc2612PermitDescriptor as unknown as Erc7730Descriptor,
        {
          descriptorId: 'registry/permit/eip712-permit-optimism-usdc.json',
          descriptorSha256,
        },
      ),
    ).toMatchObject({
      title: 'Authorize spending of tokens',
      rows: expect.arrayContaining([
        expect.objectContaining({
          label: 'Max spending amount',
          rawValue: '2500000',
          tokenAddress: TOKEN_ADDRESS,
        }),
      ]),
    });
  });

  it('renders a safe subset of an official-registry calldata descriptor', () => {
    const data = new ethersUtils.Interface([
      'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
    ]).encodeFunctionData('supply', [
      TOKEN_ADDRESS,
      '1000000',
      SPENDER_ADDRESS,
      0,
    ]);
    const descriptorJson = JSON.stringify(aaveSupplyDescriptor);
    const descriptorSha256 = hashErc7730Descriptor(descriptorJson);

    expect(
      getGenericErc7730TransactionClearSigning(
        {
          chainId: '0x1',
          id: 'aave-supply',
          networkClientId: 'mainnet',
          status: TransactionStatus.unapproved,
          time: Date.now(),
          txParams: {
            data,
            from: '0x3333333333333333333333333333333333333333',
            to: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
          },
        },
        aaveSupplyDescriptor as unknown as Erc7730Descriptor,
        {
          descriptorId: 'registry/aave/calldata-lpv3.json',
          descriptorSha256,
        },
      ),
    ).toMatchObject({
      title: 'Supply',
      descriptorId: 'registry/aave/calldata-lpv3.json',
      rows: expect.arrayContaining([
        expect.objectContaining({
          label: 'Amount to supply',
          rawValue: '1000000',
          tokenAddress: TOKEN_ADDRESS,
        }),
        expect.objectContaining({
          label: 'Collateral recipient',
          value: SPENDER_ADDRESS,
          valueType: 'address',
        }),
      ]),
    });
  });

  it('does not render unsupported descriptor field formats', () => {
    expect(
      getGenericErc7730TypedDataClearSigning(
        permit2TypedData,
        {
          display: {
            formats: {
              'PermitSingle(PermitDetails details,address spender,uint256 sigDeadline)':
                {
                  intent: 'Unsupported field format',
                  fields: [
                    {
                      path: 'spender',
                      label: 'Spender',
                      format: 'calldata' as never,
                    },
                  ],
                },
            },
          },
        },
        {
          descriptorId: 'registry/example.json',
          descriptorSha256: '0'.repeat(64),
        },
      ),
    ).toBeUndefined();
  });

  it('rejects registry descriptors whose pinned hash does not match the descriptor JSON', () => {
    const path = 'registry/uniswap/eip712-uniswap-permit2.json';

    expect(
      getRegistryErc7730TypedDataClearSigning({
        confirmation: permit2TypedData,
        index: {
          'eip155:10:0x000000000022d473030f116ddee9f6b43ac78ba3': {
            PermitSingle: [{ path }],
          },
        },
        descriptorStore: {
          [path]: {
            descriptor: permit2Descriptor as unknown as Erc7730Descriptor,
            json: JSON.stringify(permit2Descriptor),
            sha256: '0'.repeat(64),
          },
        },
      }),
    ).toBeUndefined();
  });
});
