import { TransactionStatus } from '@metamask/transaction-controller';
import type { SignatureRequestType } from '../types/confirm';
import {
  ERC7730_UPSTREAM_REGISTRY_SNAPSHOT,
  getBuiltInRegistryErc7730TransactionClearSigning,
  getBuiltInRegistryErc7730TypedDataClearSigning,
  getErc7730CalldataDescriptorPath,
  getErc7730Eip712DescriptorCandidates,
} from './erc7730-registry';
import {
  ERC7730_REGISTRY_DATA_SNAPSHOT,
  ERC7730_REGISTRY_SUPPORT,
} from './erc7730-registry-data';

describe('ERC-7730 registry utilities', () => {
  it('pins the official upstream registry snapshot without enabling runtime trust', () => {
    expect(ERC7730_UPSTREAM_REGISTRY_SNAPSHOT).toMatchObject({
      id: 'ethereum-clear-signing-erc7730-registry',
      commit: 'ad2c14087393070f7608d5167c4e943b2d453214',
      trustedForRuntime: false,
      indexes: {
        calldata: {
          path: 'index.calldata.json',
          entries: 606,
        },
        eip712: {
          path: 'index.eip712.json',
          entries: 191,
        },
      },
    });
  });

  it('uses a pinned wallet mirror generated from the official registry snapshot', () => {
    expect(ERC7730_REGISTRY_DATA_SNAPSHOT).toMatchObject({
      commit: ERC7730_UPSTREAM_REGISTRY_SNAPSHOT.commit,
      source: 'official-registry-pinned-wallet-mirror',
      supportedDescriptorCount: 317,
      calldata: {
        indexSha256: ERC7730_UPSTREAM_REGISTRY_SNAPSHOT.indexes.calldata.sha256,
        supportedIndexKeyCount: 568,
        skipped: {
          missing: 0,
          unsupported: 38,
        },
      },
      eip712: {
        indexSha256: ERC7730_UPSTREAM_REGISTRY_SNAPSHOT.indexes.eip712.sha256,
        supportedIndexKeyCount: 185,
        skipped: {
          missing: 6,
          unsupported: 46,
        },
      },
    });
    expect(ERC7730_REGISTRY_SUPPORT.calldata.projects).toEqual(
      expect.arrayContaining(['1inch', 'aave', 'uniswap', 'tether']),
    );
    expect(ERC7730_REGISTRY_SUPPORT.eip712.projects).toEqual(
      expect.arrayContaining(['1inch', 'permit', 'safe', 'uniswap']),
    );
  });

  it('finds calldata descriptor paths by eip155 chain and target address', () => {
    const transaction = {
      chainId: '0xa',
      id: '1',
      networkClientId: 'optimism',
      status: TransactionStatus.unapproved,
      time: Date.now(),
      txParams: {
        from: '0x1111111111111111111111111111111111111111',
        to: '0x111111125421Ca6dc452d289314280a0f8842A65',
      },
    };

    const path = getErc7730CalldataDescriptorPath(
      transaction as unknown as Parameters<
        typeof getErc7730CalldataDescriptorPath
      >[0],
      {
        'eip155:10:0x111111125421ca6dc452d289314280a0f8842a65':
          'registry/1inch/calldata-AggregationRouterV6.json',
      },
    );

    expect(path).toBe('registry/1inch/calldata-AggregationRouterV6.json');
  });

  it('finds EIP-712 descriptor candidates by chain, verifying contract, and primary type', () => {
    const confirmation = {
      msgParams: {
        data: JSON.stringify({
          domain: {
            chainId: 10,
            verifyingContract: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
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
          message: {},
        }),
      },
    } as SignatureRequestType;

    const candidates = getErc7730Eip712DescriptorCandidates(confirmation, {
      'eip155:10:0x000000000022d473030f116ddee9f6b43ac78ba3': {
        PermitSingle: [
          {
            path: 'registry/uniswap/eip712-uniswap-permit2.json',
            encodeTypeHashes: [
              '0xf3841cd1ff0085026a6327b620b67997ce40f282c88a8e905a7a5626e310f3d0',
            ],
          },
        ],
      },
    });

    expect(candidates).toStrictEqual([
      {
        path: 'registry/uniswap/eip712-uniswap-permit2.json',
        encodeTypeHashes: [
          '0xf3841cd1ff0085026a6327b620b67997ce40f282c88a8e905a7a5626e310f3d0',
        ],
      },
    ]);
  });

  it('rejects EIP-712 descriptor candidates when the encode type hash does not match', () => {
    const confirmation = {
      msgParams: {
        data: JSON.stringify({
          domain: {
            chainId: 10,
            verifyingContract: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
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
          message: {},
        }),
      },
    } as SignatureRequestType;

    expect(
      getErc7730Eip712DescriptorCandidates(confirmation, {
        'eip155:10:0x000000000022d473030f116ddee9f6b43ac78ba3': {
          PermitSingle: [
            {
              path: 'registry/uniswap/eip712-uniswap-permit2.json',
              encodeTypeHashes: [`0x${'0'.repeat(64)}`],
            },
          ],
        },
      }),
    ).toStrictEqual([]);
  });

  it('renders built-in official-registry Permit2 clear signing', () => {
    const confirmation = {
      msgParams: {
        data: JSON.stringify({
          domain: {
            chainId: 10,
            verifyingContract: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
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
            spender: '0x2222222222222222222222222222222222222222',
            details: {
              token: '0x1111111111111111111111111111111111111111',
              amount: '1000000',
              expiration: '4102444800',
              nonce: '7',
            },
            sigDeadline: '4102444800',
          },
        }),
      },
    } as SignatureRequestType;

    expect(
      getBuiltInRegistryErc7730TypedDataClearSigning(confirmation),
    ).toMatchObject({
      title: 'Authorize spending of token',
      descriptorId: 'registry/uniswap/eip712-uniswap-permit2.json',
      descriptorSha256:
        'b682c14dbb122ef781d05583470dd1491578da7e68fa67b7a8a193d994c51aca',
      rows: expect.arrayContaining([
        expect.objectContaining({
          label: 'Spender',
          value: '0x2222222222222222222222222222222222222222',
        }),
        expect.objectContaining({
          label: 'Amount allowance',
          value: '1000000 raw units',
          tokenAddress: '0x1111111111111111111111111111111111111111',
        }),
      ]),
    });
  });

  it('renders built-in official-registry calldata clear signing for Aave supply', () => {
    const data =
      '0x617ba037000000000000000000000000111111111111111111111111111111111111111100000000000000000000000000000000000000000000000000000000000f424000000000000000000000000022222222222222222222222222222222222222220000000000000000000000000000000000000000000000000000000000000000';

    expect(
      getBuiltInRegistryErc7730TransactionClearSigning({
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
      }),
    ).toMatchObject({
      title: 'Supply',
      descriptorId: 'registry/aave/calldata-lpv3.json',
      rows: expect.arrayContaining([
        expect.objectContaining({
          label: 'Amount to supply',
          rawValue: '1000000',
          tokenAddress: '0x1111111111111111111111111111111111111111',
        }),
        expect.objectContaining({
          label: 'Collateral recipient',
          value: '0x2222222222222222222222222222222222222222',
        }),
      ]),
    });
  });
});
