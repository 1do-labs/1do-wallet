import { Interface } from '@ethersproject/abi';
import { utils as ethersUtils } from 'ethers';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';

import type { SignatureRequestType } from '../types/confirm';
import {
  DESCRIPTORS,
  getTrustedOneDoClearSigningDescriptor,
  getOneDoTransactionClearSigning,
  getOneDoTypedDataClearSigning,
  ONE_DO_7702_DELEGATE,
  ONEDO_CLEAR_SIGNING_TRUST_POLICY,
} from './onedo-clear-signing';

const WALLET_ADDRESS = '0x1111111111111111111111111111111111111111';
const MAKER_WALLET_ADDRESS = '0x2222222222222222222222222222222222222222';
const DEX_ADDRESS = '0x3C7618FdAb069e8888E5587cA2766497B866afD5';
const NFTMARKET_ADDRESS = '0x7942Ea25F57409450edffc8019bC996cf70f40DF';
const SESSIONPAY_ADDRESS = '0x982589B354bc749d385836913a599F703DD63aB8';
const PEERDEX_ADDRESS = '0x94d92d6D93dFAf325084458763c87e25335906Bd';
const CLOSESKY_ADDRESS = '0xcDc3CB85fA46626C5d427042cbd7e6fad0287C3d';
const FLASHMAN_ADDRESS = '0x8333BCCDBcb3ab7739CB29Bf3E435503EdD0D5a9';
const CRYPTOWILL_ADDRESS = '0xC84E1126b558B8b33Fd453713dC684ed94db9F39';
const BLINKPAY_ADDRESS = '0xAD60E9c0ba61EAa9cEd65d23E4eb184358a6511c';
const TOKEN_IN_ADDRESS = '0x3333333333333333333333333333333333333333';
const TOKEN_OUT_ADDRESS = '0x4444444444444444444444444444444444444444';
const NFT_ADDRESS = '0x5555555555555555555555555555555555555555';
const FLASH_RECEIVER_ADDRESS = '0x7777777777777777777777777777777777777777';
const CLAIMANT_ADDRESS = '0x6666666666666666666666666666666666666666';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const MAKER_SIGNATURE = `0x${'11'.repeat(65)}`;
const TRANSFER_SIGNATURE = `0x${'22'.repeat(65)}`;

const accountRuntimeInterface = new Interface([
  'function enableApp(address app)',
  'function disableApp(address app)',
  'function executeBatch(tuple(address target,uint256 value,bytes data)[] calls)',
  'function executeRuntimeApp(address app, bytes data)',
  'function executeWithTokenPull(address target, bytes data, address asset, uint256 maxAmount)',
  'function executeWithNftPull(address target, bytes data, address asset, uint256 tokenId)',
]);

const walletNativeTransferInterface = new Interface([
  'function tokenTransferWithSig(address asset, address to, uint256 value, uint256 deadline, bytes signature)',
  'function nftTransferWithSig(address asset, address to, uint256 tokenId, uint256 deadline, bytes signature)',
]);

const dexInterface = new Interface([
  'function fillSignedTokenForTokenOrderAsBuyer(tuple(address tokenIn,address tokenOut,uint256 amountIn,uint256 amountOut,uint256 expiry,uint256 nonce) order, bytes makerSignature)',
]);

const nftMarketInterface = new Interface([
  'function fillSignedTokenForNftOrderAsBuyer(tuple(address nft,uint256 tokenId,address erc20,uint256 tokenAmount,uint256 expiry,uint256 nonce) order, bytes makerSignature)',
]);

const peerDexInterface = new Interface([
  'function fillSignedOrderAsBuyer(tuple(address tokenIn,address tokenOut,uint256 amountIn,uint256 amountOut,uint256 expiry,uint256 nonce) order, bytes makerSignature)',
  'function cancelSignedOrder(tuple(address tokenIn,address tokenOut,uint256 amountIn,uint256 amountOut,uint256 expiry,uint256 nonce) order)',
]);

const closeskyInterface = new Interface([
  'function fillSignedOrderAsBuyer(tuple(tuple(address makerWallet,tuple(uint8 assetType,address token,uint256 tokenId,uint256 amount) give,tuple(uint8 assetType,address token,uint256 tokenId,uint256 amount) want,uint256 expiry,uint256 nonce) order) params, bytes makerSignature)',
]);

const blinkPayInterface = new Interface([
  'function settle(tuple(address sessionKey,address payee,address token,uint256 spendLimit,uint48 sessionExpiry,bytes32 salt) grant, tuple(bytes32 sessionId,uint256 newCumulative,uint48 intentExpiry) intent, bytes selfSig, bytes sessionSig)',
]);

const cryptoWillInterface = new Interface([
  'function executeWill(tuple(bytes32 planId,uint256 chainId,uint256 expiresAt,uint256 timeUnlock,uint256 executorFeeBps,bool requiresTrustee,bytes32 docHash,tuple(address token,uint8 mode,uint256 cap,tuple(address addr,uint256 weight)[] dist)[] erc20,tuple(address token,uint256[] tokenIds,address beneficiary)[] nft) plan, address[] wildcardTokens, bytes sigOwner, address trustee, bytes sigTrustee)',
  'function claimFor(address beneficiary, address token)',
]);

const flashmanInterface = new Interface([
  'function flashLoan(address receiver, address token, uint256 amount, bytes data)',
]);

describe('1Do clear signing utilities', () => {
  it('uses a trusted registry mirror with pinned descriptor cache', () => {
    expect(ONEDO_CLEAR_SIGNING_TRUST_POLICY).toMatchObject({
      version: 'erc7730-v2',
      mode: 'trusted-registry-with-pinned-cache',
      dappSuppliedDescriptors: 'unsupported',
      trustedSource: 'onedo-registry-mirror',
    });

    for (const descriptor of Object.values(DESCRIPTORS)) {
      expect(descriptor).toMatchObject({
        source: 'onedo-registry-mirror',
        trust: 'pinned-cache',
      });
      expect(getTrustedOneDoClearSigningDescriptor(descriptor.id)).toBe(
        descriptor,
      );
    }

    expect(
      getTrustedOneDoClearSigningDescriptor('third-party-unreviewed-app'),
    ).toBeUndefined();
  });

  it('recognizes Dex typed data', () => {
    const confirmation = {
      msgParams: {
        from: WALLET_ADDRESS,
        data: JSON.stringify({
          domain: {
            name: 'Dex Order on 1Do',
            version: '1',
            chainId: 11155111,
            verifyingContract: WALLET_ADDRESS,
          },
          primaryType: 'TokenForTokenOrder',
          message: {
            tokenIn: '0x2222222222222222222222222222222222222222',
            tokenOut: '0x3333333333333333333333333333333333333333',
            amountIn: '1000',
            amountOut: '2000',
            expiry: '4102444800',
            nonce: '7',
          },
        }),
      },
    } as SignatureRequestType;

    expect(getOneDoTypedDataClearSigning(confirmation)).toMatchObject({
      descriptorId: 'dex',
      descriptorSha256:
        '337c990ea7de1b5add5c0a726717f44561679254c5f9968aeb23e733b33726e2',
      title: 'Create Dex token order on 1Do',
      rows: expect.arrayContaining([
        expect.objectContaining({
          label: 'Sell',
          value: '1000 raw units',
          valueType: 'tokenAmount',
        }),
        expect.objectContaining({
          label: 'Receive',
          value: '2000 raw units',
          valueType: 'tokenAmount',
        }),
      ]),
      advancedRows: expect.arrayContaining([
        expect.objectContaining({ label: 'Sell token' }),
        expect.objectContaining({ label: 'Receive token' }),
        expect.objectContaining({ label: 'Nonce', value: '7' }),
      ]),
    });
  });

  it('recognizes Session Pay session grants', () => {
    const confirmation = {
      msgParams: {
        from: WALLET_ADDRESS,
        data: JSON.stringify({
          domain: {
            name: 'Session Pay on 1Do',
            version: '1',
            chainId: 11155111,
            verifyingContract: WALLET_ADDRESS,
          },
          primaryType: 'SessionGrant',
          message: {
            sessionKey: '0x2222222222222222222222222222222222222222',
            payee: '0x3333333333333333333333333333333333333333',
            token: '0x4444444444444444444444444444444444444444',
            spendLimit: '1000000',
            sessionExpiresAt: '4102444800',
            salt: '0x0000000000000000000000000000000000000000000000000000000000000001',
          },
        }),
      },
    } as SignatureRequestType;

    expect(getOneDoTypedDataClearSigning(confirmation)).toMatchObject({
      descriptorId: 'sessionpay',
      descriptorSha256:
        '04c0e6318a1f543ad9205ba3f624cd4e79cce7cca10ef432ad059e46d82e835a',
      title: 'Grant Session Pay session on 1Do',
      rows: expect.arrayContaining([
        expect.objectContaining({ label: 'Session key' }),
        expect.objectContaining({
          label: 'Spend limit',
          value: '1000000 raw units',
          valueType: 'tokenAmount',
        }),
      ]),
    });
  });

  it('recognizes wallet-native token transfer typed data', () => {
    const confirmation = {
      msgParams: {
        from: WALLET_ADDRESS,
        data: JSON.stringify({
          domain: {
            name: 'ERC8112 Token Transfer',
            version: '1',
            chainId: 11155111,
            verifyingContract: WALLET_ADDRESS,
          },
          primaryType: 'TokenTransferWithSig',
          message: {
            wallet: WALLET_ADDRESS,
            asset: TOKEN_OUT_ADDRESS,
            to: TOKEN_IN_ADDRESS,
            value: '1000000',
            nonce: '2',
            deadline: '4102444800',
          },
        }),
      },
    } as SignatureRequestType;

    expect(getOneDoTypedDataClearSigning(confirmation)).toMatchObject({
      descriptorId: 'wallet-native-transfers',
      descriptorSha256:
        '3fac1b55c499c9f20eec1d0a51c2c006902216d14e3e0f2866a7eaee9c8bd6f0',
      title: 'Authorize token payment',
      rows: expect.arrayContaining([
        expect.objectContaining({
          label: 'Pay',
          value: '1000000 raw units',
          valueType: 'tokenAmount',
          rawValue: '1000000',
          tokenAddress: TOKEN_OUT_ADDRESS,
        }),
        expect.objectContaining({
          label: 'To',
          value: TOKEN_IN_ADDRESS,
        }),
        expect.objectContaining({ label: 'From', value: WALLET_ADDRESS }),
      ]),
      advancedRows: expect.arrayContaining([
        expect.objectContaining({ label: 'Asset', value: TOKEN_OUT_ADDRESS }),
      ]),
    });
  });

  it('recognizes wallet-native NFT transfer typed data with any-caller claim recipient', () => {
    const confirmation = {
      msgParams: {
        from: WALLET_ADDRESS,
        data: JSON.stringify({
          domain: {
            name: 'ERC8114 NFT Transfer',
            version: '1',
            chainId: 11155111,
            verifyingContract: WALLET_ADDRESS,
          },
          primaryType: 'NFTTransferWithSig',
          message: {
            wallet: WALLET_ADDRESS,
            asset: NFT_ADDRESS,
            to: ZERO_ADDRESS,
            tokenId: '42',
            nonce: '3',
            deadline: '4102444800',
          },
        }),
      },
    } as SignatureRequestType;

    expect(getOneDoTypedDataClearSigning(confirmation)).toMatchObject({
      descriptorId: 'wallet-native-transfers',
      title: 'Create claimable NFT gift',
      rows: expect.arrayContaining([
        expect.objectContaining({
          label: 'Claim rule',
          value: 'Anyone with the link can claim to self',
        }),
        expect.objectContaining({ label: 'Token ID', value: '42' }),
      ]),
      advancedRows: expect.arrayContaining([
        expect.objectContaining({
          label: 'Recipient marker',
          value: ZERO_ADDRESS,
        }),
      ]),
    });
  });

  it('does not recognize wallet-native transfer typed data when the message wallet does not match the signing domain', () => {
    const confirmation = {
      msgParams: {
        from: WALLET_ADDRESS,
        data: JSON.stringify({
          domain: {
            name: 'ERC8112 Token Transfer',
            version: '1',
            chainId: 11155111,
            verifyingContract: WALLET_ADDRESS,
          },
          primaryType: 'TokenTransferWithSig',
          message: {
            wallet: MAKER_WALLET_ADDRESS,
            asset: TOKEN_OUT_ADDRESS,
            to: TOKEN_IN_ADDRESS,
            value: '1000000',
            nonce: '2',
            deadline: '4102444800',
          },
        }),
      },
    } as SignatureRequestType;

    expect(getOneDoTypedDataClearSigning(confirmation)).toBeUndefined();
  });

  it('recognizes direct enableApp transactions only with 1Do delegation context', () => {
    const data = accountRuntimeInterface.encodeFunctionData('enableApp', [
      SESSIONPAY_ADDRESS,
    ]);

    const info = getOneDoTransactionClearSigning({
      chainId: '0xaa36a7',
      delegationAddress: ONE_DO_7702_DELEGATE,
      id: '1',
      networkClientId: 'sepolia',
      status: TransactionStatus.unapproved,
      time: Date.now(),
      type: TransactionType.contractInteraction,
      txParams: {
        from: WALLET_ADDRESS,
        to: WALLET_ADDRESS,
        data,
      },
    });

    expect(info).toMatchObject({
      descriptorId: 'account-runtime',
      descriptorSha256:
        'b01b5f1cc8261d085cb2856054a1750bd8b323c7c1e4a4e68e1e98f2e94cfa21',
      title: 'Enable Session Pay',
      rows: expect.arrayContaining([
        expect.objectContaining({ label: 'Action', value: 'Enable app' }),
        expect.objectContaining({ label: 'App', value: 'Session Pay' }),
      ]),
      advancedRows: expect.arrayContaining([
        expect.objectContaining({
          label: 'App logic',
          value: SESSIONPAY_ADDRESS,
        }),
      ]),
    });
  });

  it('recognizes nested disableApp transactions inside executeBatch', () => {
    const disableData = accountRuntimeInterface.encodeFunctionData(
      'disableApp',
      [DEX_ADDRESS],
    );
    const data = accountRuntimeInterface.encodeFunctionData('executeBatch', [
      [
        {
          target: WALLET_ADDRESS,
          value: 0,
          data: disableData,
        },
      ],
    ]);

    const info = getOneDoTransactionClearSigning({
      chainId: '0xaa36a7',
      delegationAddress: ONE_DO_7702_DELEGATE,
      id: '2',
      networkClientId: 'sepolia',
      status: TransactionStatus.unapproved,
      time: Date.now(),
      type: TransactionType.contractInteraction,
      txParams: {
        from: WALLET_ADDRESS,
        to: WALLET_ADDRESS,
        data,
      },
    });

    expect(info).toMatchObject({
      descriptorId: 'account-runtime',
      descriptorSha256:
        'b01b5f1cc8261d085cb2856054a1750bd8b323c7c1e4a4e68e1e98f2e94cfa21',
      title: 'Disable Dex',
      rows: expect.arrayContaining([
        expect.objectContaining({
          label: 'Action 1',
          value: 'Disable Dex',
        }),
      ]),
    });
  });

  it('does not recognize transactions without 1Do delegation context', () => {
    const data = accountRuntimeInterface.encodeFunctionData('enableApp', [
      SESSIONPAY_ADDRESS,
    ]);

    expect(
      getOneDoTransactionClearSigning({
        chainId: '0xaa36a7',
        id: '3',
        networkClientId: 'sepolia',
        status: TransactionStatus.unapproved,
        time: Date.now(),
        type: TransactionType.contractInteraction,
        txParams: {
          from: WALLET_ADDRESS,
          to: WALLET_ADDRESS,
          data,
        },
      }),
    ).toBeUndefined();
  });

  it('recognizes account runtime calldata when the transaction is classified as a native transfer', () => {
    const data = accountRuntimeInterface.encodeFunctionData('enableApp', [
      SESSIONPAY_ADDRESS,
    ]);

    const info = getOneDoTransactionClearSigning(
      {
        chainId: '0xaa36a7',
        id: 'simple-send-runtime-call',
        networkClientId: 'sepolia',
        origin: 'http://localhost:3001',
        status: TransactionStatus.unapproved,
        time: Date.now(),
        type: TransactionType.simpleSend,
        txParams: {
          from: WALLET_ADDRESS,
          to: WALLET_ADDRESS,
          data,
          value: '0x0',
        },
      },
      { allowAccountRuntimeCalldata: true },
    );

    expect(info).toMatchObject({
      descriptorId: 'account-runtime',
      subtitle: 'ERC-7730 clear signing',
      title: 'Enable Session Pay',
      rows: expect.arrayContaining([
        expect.objectContaining({ label: 'Action', value: 'Enable app' }),
        expect.objectContaining({ label: 'App', value: 'Session Pay' }),
      ]),
      advancedRows: expect.arrayContaining([
        expect.objectContaining({
          label: 'App logic',
          value: SESSIONPAY_ADDRESS,
        }),
      ]),
    });
  });

  it('recognizes direct enableApp calldata sent to the 1Do delegate target', () => {
    const data = accountRuntimeInterface.encodeFunctionData('enableApp', [
      SESSIONPAY_ADDRESS,
    ]);

    const info = getOneDoTransactionClearSigning(
      {
        chainId: '0xaa36a7',
        id: 'delegate-runtime-call',
        networkClientId: 'sepolia',
        origin: 'http://localhost:3001',
        status: TransactionStatus.unapproved,
        time: Date.now(),
        type: TransactionType.contractInteraction,
        txParams: {
          from: WALLET_ADDRESS,
          to: ONE_DO_7702_DELEGATE,
          data,
          value: '0x0',
        },
      },
      { allowAccountRuntimeCalldata: true },
    );

    expect(info).toMatchObject({
      descriptorId: 'account-runtime',
      title: 'Enable Session Pay',
      rows: expect.arrayContaining([
        expect.objectContaining({ label: 'Wallet', value: WALLET_ADDRESS }),
        expect.objectContaining({ label: 'Action', value: 'Enable app' }),
        expect.objectContaining({ label: 'App', value: 'Session Pay' }),
      ]),
    });
  });

  it('recognizes submitted wallet-native token transfer transactions', () => {
    const data = walletNativeTransferInterface.encodeFunctionData(
      'tokenTransferWithSig',
      [
        TOKEN_OUT_ADDRESS,
        ZERO_ADDRESS,
        1000000,
        4102444800,
        TRANSFER_SIGNATURE,
      ],
    );

    const info = getOneDoTransactionClearSigning(
      {
        chainId: '0xaa36a7',
        id: 'claim-token-transfer',
        networkClientId: 'sepolia',
        origin: 'http://localhost:3001',
        status: TransactionStatus.unapproved,
        time: Date.now(),
        type: TransactionType.contractInteraction,
        txParams: {
          from: CLAIMANT_ADDRESS,
          to: WALLET_ADDRESS,
          data,
        },
      },
      { allowWalletNativeTransferCalldata: true },
    );

    expect(info).toMatchObject({
      descriptorId: 'wallet-native-transfers',
      descriptorSha256:
        '3fac1b55c499c9f20eec1d0a51c2c006902216d14e3e0f2866a7eaee9c8bd6f0',
      title: 'Claim token transfer',
      rows: expect.arrayContaining([
        expect.objectContaining({
          label: 'Claim',
          value: '1000000 raw units',
          valueType: 'tokenAmount',
          rawValue: '1000000',
          tokenAddress: TOKEN_OUT_ADDRESS,
        }),
        expect.objectContaining({
          label: 'From wallet',
          value: WALLET_ADDRESS,
        }),
        expect.objectContaining({
          label: 'To',
          value: 'Transaction sender',
        }),
        expect.objectContaining({
          label: 'Transaction sender',
          value: CLAIMANT_ADDRESS,
        }),
      ]),
      advancedRows: expect.arrayContaining([
        expect.objectContaining({ label: 'Asset', value: TOKEN_OUT_ADDRESS }),
        expect.objectContaining({
          label: 'Recipient marker',
          value: ZERO_ADDRESS,
        }),
      ]),
    });
  });

  it('recognizes submitted wallet-native NFT transfer transactions', () => {
    const data = walletNativeTransferInterface.encodeFunctionData(
      'nftTransferWithSig',
      [NFT_ADDRESS, CLAIMANT_ADDRESS, 42, 4102444800, TRANSFER_SIGNATURE],
    );

    const info = getOneDoTransactionClearSigning(
      {
        chainId: '0xaa36a7',
        id: 'claim-nft-transfer',
        networkClientId: 'sepolia',
        origin: 'http://localhost:3001',
        status: TransactionStatus.unapproved,
        time: Date.now(),
        type: TransactionType.contractInteraction,
        txParams: {
          from: CLAIMANT_ADDRESS,
          to: WALLET_ADDRESS,
          data,
        },
      },
      { allowWalletNativeTransferCalldata: true },
    );

    expect(info).toMatchObject({
      descriptorId: 'wallet-native-transfers',
      title: 'Submit NFT transfer',
      rows: expect.arrayContaining([
        expect.objectContaining({
          label: 'From wallet',
          value: WALLET_ADDRESS,
        }),
        expect.objectContaining({
          label: 'NFT collection',
          value: NFT_ADDRESS,
        }),
        expect.objectContaining({
          label: 'To',
          value: CLAIMANT_ADDRESS,
        }),
        expect.objectContaining({ label: 'Token ID', value: '42' }),
      ]),
    });
  });

  it('does not recognize runtime access transactions sent away from the wallet', () => {
    const data = accountRuntimeInterface.encodeFunctionData('enableApp', [
      SESSIONPAY_ADDRESS,
    ]);

    expect(
      getOneDoTransactionClearSigning({
        chainId: '0xaa36a7',
        delegationAddress: ONE_DO_7702_DELEGATE,
        id: '4',
        networkClientId: 'sepolia',
        status: TransactionStatus.unapproved,
        time: Date.now(),
        type: TransactionType.contractInteraction,
        txParams: {
          from: WALLET_ADDRESS,
          to: '0x2222222222222222222222222222222222222222',
          data,
        },
      }),
    ).toBeUndefined();
  });

  it('recognizes direct executeRuntimeApp Dex fill transactions', () => {
    const appData = dexInterface.encodeFunctionData(
      'fillSignedTokenForTokenOrderAsBuyer',
      [
        {
          tokenIn: TOKEN_IN_ADDRESS,
          tokenOut: TOKEN_OUT_ADDRESS,
          amountIn: 1000,
          amountOut: 2000,
          expiry: 4102444800,
          nonce: 7,
        },
        MAKER_SIGNATURE,
      ],
    );
    const data = accountRuntimeInterface.encodeFunctionData(
      'executeRuntimeApp',
      [DEX_ADDRESS, appData],
    );

    const info = getOneDoTransactionClearSigning({
      chainId: '0xaa36a7',
      delegationAddress: ONE_DO_7702_DELEGATE,
      id: '5',
      networkClientId: 'sepolia',
      status: TransactionStatus.unapproved,
      time: Date.now(),
      type: TransactionType.contractInteraction,
      txParams: {
        from: WALLET_ADDRESS,
        to: WALLET_ADDRESS,
        data,
      },
    });

    expect(info).toMatchObject({
      descriptorId: 'account-runtime',
      descriptorSha256:
        'b01b5f1cc8261d085cb2856054a1750bd8b323c7c1e4a4e68e1e98f2e94cfa21',
      title: 'Fill Dex order',
      rows: expect.arrayContaining([
        expect.objectContaining({
          label: 'Wallet',
          value: WALLET_ADDRESS,
        }),
        expect.objectContaining({
          label: 'You receive',
          value: '1000 raw units',
          valueType: 'tokenAmount',
        }),
        expect.objectContaining({
          label: 'You pay',
          value: '2000 raw units',
          valueType: 'tokenAmount',
        }),
      ]),
      advancedRows: expect.arrayContaining([
        expect.objectContaining({ label: 'App', value: 'Dex' }),
        expect.objectContaining({
          label: 'Maker sells token',
          value: TOKEN_IN_ADDRESS,
        }),
      ]),
    });
  });

  it('recognizes executeWithTokenPull wrapping maker executeRuntimeApp', () => {
    const appData = dexInterface.encodeFunctionData(
      'fillSignedTokenForTokenOrderAsBuyer',
      [
        {
          tokenIn: TOKEN_IN_ADDRESS,
          tokenOut: TOKEN_OUT_ADDRESS,
          amountIn: 1000,
          amountOut: 2000,
          expiry: 4102444800,
          nonce: 7,
        },
        MAKER_SIGNATURE,
      ],
    );
    const makerRuntimeData = accountRuntimeInterface.encodeFunctionData(
      'executeRuntimeApp',
      [DEX_ADDRESS, appData],
    );
    const data = accountRuntimeInterface.encodeFunctionData(
      'executeWithTokenPull',
      [MAKER_WALLET_ADDRESS, makerRuntimeData, TOKEN_OUT_ADDRESS, 2000],
    );

    const info = getOneDoTransactionClearSigning({
      chainId: '0xaa36a7',
      delegationAddress: ONE_DO_7702_DELEGATE,
      id: '6',
      networkClientId: 'sepolia',
      status: TransactionStatus.unapproved,
      time: Date.now(),
      type: TransactionType.contractInteraction,
      txParams: {
        from: WALLET_ADDRESS,
        to: WALLET_ADDRESS,
        data,
      },
    });

    expect(info).toMatchObject({
      title: 'Fill Dex order',
      rows: expect.arrayContaining([
        expect.objectContaining({
          label: 'Wallet',
          value: WALLET_ADDRESS,
        }),
        expect.objectContaining({
          label: 'Seller',
          value: MAKER_WALLET_ADDRESS,
        }),
        expect.objectContaining({
          label: 'You receive',
          value: '1000 raw units',
          valueType: 'tokenAmount',
        }),
        expect.objectContaining({
          label: 'You pay',
          value: '2000 raw units',
          valueType: 'tokenAmount',
        }),
      ]),
      advancedRows: expect.arrayContaining([
        expect.objectContaining({
          label: 'Max token pull',
          value: '2000 raw units',
        }),
        expect.objectContaining({
          label: 'Pull asset',
          value: TOKEN_OUT_ADDRESS,
        }),
      ]),
    });
  });

  it('recognizes executeWithNftPull wrapping maker executeRuntimeApp', () => {
    const appData = nftMarketInterface.encodeFunctionData(
      'fillSignedTokenForNftOrderAsBuyer',
      [
        {
          nft: NFT_ADDRESS,
          tokenId: 42,
          erc20: TOKEN_OUT_ADDRESS,
          tokenAmount: 3000,
          expiry: 4102444800,
          nonce: 8,
        },
        MAKER_SIGNATURE,
      ],
    );
    const makerRuntimeData = accountRuntimeInterface.encodeFunctionData(
      'executeRuntimeApp',
      [NFTMARKET_ADDRESS, appData],
    );
    const data = accountRuntimeInterface.encodeFunctionData(
      'executeWithNftPull',
      [MAKER_WALLET_ADDRESS, makerRuntimeData, NFT_ADDRESS, 42],
    );

    const info = getOneDoTransactionClearSigning({
      chainId: '0xaa36a7',
      delegationAddress: ONE_DO_7702_DELEGATE,
      id: '7',
      networkClientId: 'sepolia',
      status: TransactionStatus.unapproved,
      time: Date.now(),
      type: TransactionType.contractInteraction,
      txParams: {
        from: WALLET_ADDRESS,
        to: WALLET_ADDRESS,
        data,
      },
    });

    expect(info).toMatchObject({
      title: 'Fill NFT Market order',
      rows: expect.arrayContaining([
        expect.objectContaining({
          label: 'Wallet',
          value: WALLET_ADDRESS,
        }),
        expect.objectContaining({
          label: 'Seller',
          value: MAKER_WALLET_ADDRESS,
        }),
        expect.objectContaining({
          label: 'You receive',
          value: '3000 raw units',
          valueType: 'tokenAmount',
        }),
        expect.objectContaining({
          label: 'You pay NFT collection',
          value: NFT_ADDRESS,
        }),
        expect.objectContaining({ label: 'You pay token ID', value: '42' }),
      ]),
    });
  });

  it('recognizes PeerDex fill transactions', () => {
    const appData = peerDexInterface.encodeFunctionData(
      'fillSignedOrderAsBuyer',
      [
        {
          tokenIn: TOKEN_IN_ADDRESS,
          tokenOut: TOKEN_OUT_ADDRESS,
          amountIn: 1000,
          amountOut: 2000,
          expiry: 4102444800,
          nonce: 11,
        },
        MAKER_SIGNATURE,
      ],
    );
    const data = accountRuntimeInterface.encodeFunctionData(
      'executeRuntimeApp',
      [PEERDEX_ADDRESS, appData],
    );

    const info = getOneDoTransactionClearSigning({
      chainId: '0xaa36a7',
      delegationAddress: ONE_DO_7702_DELEGATE,
      id: 'peerdex-fill',
      networkClientId: 'sepolia',
      status: TransactionStatus.unapproved,
      time: Date.now(),
      type: TransactionType.contractInteraction,
      txParams: {
        from: WALLET_ADDRESS,
        to: WALLET_ADDRESS,
        data,
      },
    });

    expect(info).toMatchObject({
      title: 'Fill PeerDex order',
      rows: expect.arrayContaining([
        expect.objectContaining({
          label: 'Wallet',
          value: WALLET_ADDRESS,
        }),
        expect.objectContaining({
          label: 'You receive',
          value: '1000 raw units',
          valueType: 'tokenAmount',
        }),
        expect.objectContaining({
          label: 'You pay',
          value: '2000 raw units',
          valueType: 'tokenAmount',
        }),
      ]),
      advancedRows: expect.arrayContaining([
        expect.objectContaining({ label: 'App', value: 'PeerDex' }),
        expect.objectContaining({ label: 'Nonce', value: '11' }),
      ]),
    });
  });

  it('recognizes PeerDex cancel transactions', () => {
    const appData = peerDexInterface.encodeFunctionData('cancelSignedOrder', [
      {
        tokenIn: TOKEN_IN_ADDRESS,
        tokenOut: TOKEN_OUT_ADDRESS,
        amountIn: 1000,
        amountOut: 2000,
        expiry: 4102444800,
        nonce: 12,
      },
    ]);
    const data = accountRuntimeInterface.encodeFunctionData(
      'executeRuntimeApp',
      [PEERDEX_ADDRESS, appData],
    );

    const info = getOneDoTransactionClearSigning({
      chainId: '0xaa36a7',
      delegationAddress: ONE_DO_7702_DELEGATE,
      id: 'peerdex-cancel',
      networkClientId: 'sepolia',
      status: TransactionStatus.unapproved,
      time: Date.now(),
      type: TransactionType.contractInteraction,
      txParams: {
        from: WALLET_ADDRESS,
        to: WALLET_ADDRESS,
        data,
      },
    });

    expect(info).toMatchObject({
      title: 'Cancel PeerDex order',
      rows: expect.arrayContaining([
        expect.objectContaining({ label: 'Sell', value: '1000 raw units' }),
        expect.objectContaining({ label: 'Receive', value: '2000 raw units' }),
      ]),
    });
  });

  it('recognizes Closesky fill transactions', () => {
    const appData = closeskyInterface.encodeFunctionData(
      'fillSignedOrderAsBuyer',
      [
        {
          order: {
            makerWallet: MAKER_WALLET_ADDRESS,
            give: {
              assetType: 1,
              token: NFT_ADDRESS,
              tokenId: 42,
              amount: 1,
            },
            want: {
              assetType: 0,
              token: TOKEN_OUT_ADDRESS,
              tokenId: 0,
              amount: 3000,
            },
            expiry: 4102444800,
            nonce: 13,
          },
        },
        MAKER_SIGNATURE,
      ],
    );
    const data = accountRuntimeInterface.encodeFunctionData(
      'executeRuntimeApp',
      [CLOSESKY_ADDRESS, appData],
    );

    const info = getOneDoTransactionClearSigning({
      chainId: '0xaa36a7',
      delegationAddress: ONE_DO_7702_DELEGATE,
      id: 'closesky-fill',
      networkClientId: 'sepolia',
      status: TransactionStatus.unapproved,
      time: Date.now(),
      type: TransactionType.contractInteraction,
      txParams: {
        from: WALLET_ADDRESS,
        to: WALLET_ADDRESS,
        data,
      },
    });

    expect(info).toMatchObject({
      title: 'Fill Closesky order',
      rows: expect.arrayContaining([
        expect.objectContaining({
          label: 'Wallet',
          value: WALLET_ADDRESS,
        }),
        expect.objectContaining({
          label: 'You receive NFT collection',
          value: NFT_ADDRESS,
        }),
        expect.objectContaining({ label: 'You receive token ID', value: '42' }),
        expect.objectContaining({
          label: 'You pay',
          value: '3000 raw units',
          valueType: 'tokenAmount',
        }),
      ]),
      advancedRows: expect.arrayContaining([
        expect.objectContaining({ label: 'App', value: 'Closesky' }),
        expect.objectContaining({
          label: 'Maker wallet',
          value: MAKER_WALLET_ADDRESS,
        }),
      ]),
    });
  });

  it('recognizes Blink Pay settlement transactions', () => {
    const sessionId =
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const salt =
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const appData = blinkPayInterface.encodeFunctionData('settle', [
      {
        sessionKey: FLASH_RECEIVER_ADDRESS,
        payee: CLAIMANT_ADDRESS,
        token: TOKEN_OUT_ADDRESS,
        spendLimit: 5000,
        sessionExpiry: 4102444800,
        salt,
      },
      {
        sessionId,
        newCumulative: 2000,
        intentExpiry: 4102444700,
      },
      MAKER_SIGNATURE,
      TRANSFER_SIGNATURE,
    ]);
    const data = accountRuntimeInterface.encodeFunctionData(
      'executeRuntimeApp',
      [BLINKPAY_ADDRESS, appData],
    );

    const info = getOneDoTransactionClearSigning({
      chainId: '0xaa36a7',
      delegationAddress: ONE_DO_7702_DELEGATE,
      id: 'blinkpay-settle',
      networkClientId: 'sepolia',
      status: TransactionStatus.unapproved,
      time: Date.now(),
      type: TransactionType.contractInteraction,
      txParams: {
        from: WALLET_ADDRESS,
        to: WALLET_ADDRESS,
        data,
      },
    });

    expect(info).toMatchObject({
      title: 'Settle Blink Pay session',
      rows: expect.arrayContaining([
        expect.objectContaining({
          label: 'New cumulative paid',
          value: '2000 raw units',
        }),
        expect.objectContaining({ label: 'Payee', value: CLAIMANT_ADDRESS }),
      ]),
      advancedRows: expect.arrayContaining([
        expect.objectContaining({ label: 'App', value: 'Blink Pay' }),
        expect.objectContaining({ label: 'Session ID', value: sessionId }),
      ]),
    });
  });

  it('recognizes CryptoWill execute transactions', () => {
    const planId =
      '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';
    const docHash =
      '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd';
    const appData = cryptoWillInterface.encodeFunctionData('executeWill', [
      {
        planId,
        chainId: 11155111,
        expiresAt: 4102444800,
        timeUnlock: 4102444700,
        executorFeeBps: 50,
        requiresTrustee: true,
        docHash,
        erc20: [
          {
            token: TOKEN_IN_ADDRESS,
            mode: 0,
            cap: 0,
            dist: [{ addr: CLAIMANT_ADDRESS, weight: 100 }],
          },
        ],
        nft: [
          {
            token: NFT_ADDRESS,
            tokenIds: [42],
            beneficiary: CLAIMANT_ADDRESS,
          },
        ],
      },
      [TOKEN_OUT_ADDRESS],
      MAKER_SIGNATURE,
      FLASH_RECEIVER_ADDRESS,
      TRANSFER_SIGNATURE,
    ]);
    const data = accountRuntimeInterface.encodeFunctionData(
      'executeRuntimeApp',
      [CRYPTOWILL_ADDRESS, appData],
    );

    const info = getOneDoTransactionClearSigning({
      chainId: '0xaa36a7',
      delegationAddress: ONE_DO_7702_DELEGATE,
      id: 'cryptowill-execute',
      networkClientId: 'sepolia',
      status: TransactionStatus.unapproved,
      time: Date.now(),
      type: TransactionType.contractInteraction,
      txParams: {
        from: WALLET_ADDRESS,
        to: WALLET_ADDRESS,
        data,
      },
    });

    expect(info).toMatchObject({
      title: 'Execute CryptoWill plan',
      rows: expect.arrayContaining([
        expect.objectContaining({ label: 'Plan ID', value: planId }),
        expect.objectContaining({
          label: 'ERC20 distribution count',
          value: '1',
        }),
        expect.objectContaining({
          label: 'NFT distribution count',
          value: '1',
        }),
      ]),
      advancedRows: expect.arrayContaining([
        expect.objectContaining({ label: 'App', value: 'CryptoWill' }),
        expect.objectContaining({ label: 'Document hash', value: docHash }),
      ]),
    });
  });

  it('recognizes Flashman flash loan transactions', () => {
    const appData = flashmanInterface.encodeFunctionData('flashLoan', [
      FLASH_RECEIVER_ADDRESS,
      TOKEN_IN_ADDRESS,
      1000000,
      '0x1234',
    ]);
    const data = accountRuntimeInterface.encodeFunctionData(
      'executeRuntimeApp',
      [FLASHMAN_ADDRESS, appData],
    );

    const info = getOneDoTransactionClearSigning({
      chainId: '0xaa36a7',
      delegationAddress: ONE_DO_7702_DELEGATE,
      id: 'flashman-loan',
      networkClientId: 'sepolia',
      status: TransactionStatus.unapproved,
      time: Date.now(),
      type: TransactionType.contractInteraction,
      txParams: {
        from: WALLET_ADDRESS,
        to: WALLET_ADDRESS,
        data,
      },
    });

    expect(info).toMatchObject({
      title: 'Execute Flashman flash loan',
      rows: expect.arrayContaining([
        expect.objectContaining({
          label: 'Receiver',
          value: FLASH_RECEIVER_ADDRESS,
        }),
        expect.objectContaining({
          label: 'Loan amount',
          value: '1000000 raw units',
        }),
        expect.objectContaining({ label: 'Fee rate', value: '0.05%' }),
      ]),
      advancedRows: expect.arrayContaining([
        expect.objectContaining({ label: 'App', value: 'Flashman' }),
        expect.objectContaining({
          label: 'Loan token',
          value: TOKEN_IN_ADDRESS,
        }),
      ]),
    });
  });

  it('recognizes the 1Do runtime hash wrapper as hash-only clear signing', () => {
    const confirmation = {
      msgParams: {
        from: WALLET_ADDRESS,
        data: JSON.stringify({
          domain: {
            name: '1do 7702 Runtime',
            version: '1',
            chainId: 11155111,
            verifyingContract: WALLET_ADDRESS,
          },
          primaryType: 'OnedoRuntimeMessage',
          message: {
            hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          },
        }),
      },
    } as SignatureRequestType;

    expect(getOneDoTypedDataClearSigning(confirmation)).toMatchObject({
      descriptorId: 'runtime-message',
      descriptorSha256:
        '11813d4df24580ced56a0f21b91edbaf79f1cab422d1cc6b7b8f810d2f980e2b',
      title: '1Do runtime message',
      warning: expect.stringContaining('hash'),
    });
  });

  it('recognizes ExecuteWithSig typed data with verified call data context', () => {
    const appData = dexInterface.encodeFunctionData(
      'fillSignedTokenForTokenOrderAsBuyer',
      [
        {
          tokenIn: TOKEN_IN_ADDRESS,
          tokenOut: TOKEN_OUT_ADDRESS,
          amountIn: 1000,
          amountOut: 2000,
          expiry: 4102444800,
          nonce: 7,
        },
        MAKER_SIGNATURE,
      ],
    );
    const callData = accountRuntimeInterface.encodeFunctionData(
      'executeRuntimeApp',
      [DEX_ADDRESS, appData],
    );

    const confirmation = {
      msgParams: {
        from: WALLET_ADDRESS,
        data: JSON.stringify({
          domain: {
            name: '1do ExecuteWithSig',
            version: '1',
            chainId: 11155111,
            verifyingContract: WALLET_ADDRESS,
          },
          primaryType: 'ExecuteWithSig',
          message: {
            wallet: WALLET_ADDRESS,
            target: WALLET_ADDRESS,
            value: '0',
            dataHash: ethersUtils.keccak256(callData),
            nonce: '9',
            deadline: '4102444800',
          },
          clearSigningContext: {
            call: {
              target: WALLET_ADDRESS,
              value: '0',
              data: callData,
            },
          },
        }),
      },
    } as SignatureRequestType;

    expect(getOneDoTypedDataClearSigning(confirmation)).toMatchObject({
      descriptorId: 'execute-with-sig',
      descriptorSha256:
        '2abeba646958ee6fcdc091c2a1e89103c425f20e8bd6f6ad35b7f198d3046470',
      title: '1Do gasless signed execution',
      rows: expect.arrayContaining([
        expect.objectContaining({
          label: 'You receive',
          value: '1000 raw units',
          valueType: 'tokenAmount',
        }),
      ]),
      advancedRows: expect.arrayContaining([
        expect.objectContaining({ label: 'App', value: 'Dex' }),
      ]),
    });
  });

  it('does not recognize 1Do typed data when the wallet scope does not match', () => {
    const confirmation = {
      msgParams: {
        from: WALLET_ADDRESS,
        data: JSON.stringify({
          domain: {
            name: 'Dex Order on 1Do',
            version: '1',
            chainId: 11155111,
            verifyingContract: '0x2222222222222222222222222222222222222222',
          },
          primaryType: 'TokenForTokenOrder',
          message: {
            tokenIn: '0x2222222222222222222222222222222222222222',
            tokenOut: '0x3333333333333333333333333333333333333333',
            amountIn: '1000',
            amountOut: '2000',
            expiry: '4102444800',
            nonce: '7',
          },
        }),
      },
    } as SignatureRequestType;

    expect(getOneDoTypedDataClearSigning(confirmation)).toBeUndefined();
  });

  it('does not recognize incomplete 1Do typed data', () => {
    const confirmation = {
      msgParams: {
        from: WALLET_ADDRESS,
        data: JSON.stringify({
          domain: {
            name: 'Session Pay on 1Do',
            version: '1',
            chainId: 11155111,
            verifyingContract: WALLET_ADDRESS,
          },
          primaryType: 'SessionGrant',
          message: {
            sessionKey: '0x2222222222222222222222222222222222222222',
            payee: '0x3333333333333333333333333333333333333333',
            token: '0x4444444444444444444444444444444444444444',
            spendLimit: '1000000',
            sessionExpiresAt: '4102444800',
          },
        }),
      },
    } as SignatureRequestType;

    expect(getOneDoTypedDataClearSigning(confirmation)).toBeUndefined();
  });
});
