import { ChainId, getNativeAssetForChainId } from '@metamask/bridge-controller';
import { act } from '@testing-library/react';
import { Store } from 'redux';
import {
  createBridgeMockStore,
  MOCK_EVM_ACCOUNT,
  MOCK_LEDGER_ACCOUNT,
} from '../../../../test/data/bridge/mock-bridge-store';
import { renderHookWithProvider } from '../../../../test/lib/render-helpers-navigate';
import {
  getFromAccount,
  getFromChain,
  getToAccounts,
  getToChain,
  type BridgeAppState,
} from '../../../ducks/bridge/selectors';
import { toBridgeToken } from '../../../ducks/bridge/utils';
import { useDestinationAccount } from './useDestinationAccount';

const renderUseDestinationAccount = (mockStoreOverrides = {}) => {
  const result = renderHookWithProvider(
    () => useDestinationAccount(),
    createBridgeMockStore(mockStoreOverrides),
  );
  return {
    ...result,
    store: result.store as unknown as Store<BridgeAppState>,
  };
};

describe('useDestinationAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns source account when there is no selected toChain', () => {
    const { result, store } = renderUseDestinationAccount({
      bridgeSliceOverrides: { toToken: null },
    });
    expect(result.current.selectedDestinationAccount).toStrictEqual({
      ...getFromAccount(store?.getState()),
      isExternal: false,
      displayName: 'Account 1',
      walletName: 'Wallet 1',
    });
    expect(result.current.isDestinationAccountPickerOpen).toBe(false);
  });

  it('returns the default internal destination account when a different EVM chain is selected as the toChain', () => {
    const { result } = renderUseDestinationAccount({
      featureFlagOverrides: {
        bridgeConfig: {
          chainRanking: [{ chainId: 'eip155:1' }, { chainId: 'eip155:59144' }],
        },
      },
      bridgeSliceOverrides: {
        toToken: toBridgeToken(getNativeAssetForChainId(ChainId.LINEA)),
      },
      metamaskStateOverrides: {
        internalAccounts: {
          selectedAccount: MOCK_EVM_ACCOUNT.id,
        },
        selectedAccountGroup: 'entropy:01K2FF18CTTXJYD34R78X4N1N1/0',
      },
    });

    expect(result.current.selectedDestinationAccount).toStrictEqual({
      ...MOCK_EVM_ACCOUNT,
      isExternal: false,
      displayName: 'Account 1',
      walletName: 'Wallet 1',
    });
    expect(result.current.isDestinationAccountPickerOpen).toBe(false);
  });

  it('opens the picker when there is no matching destination account', () => {
    const { result } = renderUseDestinationAccount({
      featureFlagOverrides: {
        bridgeConfig: {
          chainRanking: [{ chainId: 'eip155:1' }, { chainId: 'eip155:59144' }],
        },
      },
      bridgeSliceOverrides: {
        toToken: toBridgeToken(getNativeAssetForChainId(ChainId.LINEA)),
      },
      metamaskStateOverrides: {
        internalAccounts: {
          selectedAccount: MOCK_EVM_ACCOUNT.id,
        },
        selectedAccountGroup: 'entropy:missing/0',
      },
    });
    expect(result.current.selectedDestinationAccount).toBeNull();
    expect(result.current.isDestinationAccountPickerOpen).toBe(true);
  });

  it('returns source account when the toChain is in the same namespace as the fromChain', async () => {
    const { result, store } = renderUseDestinationAccount({
      featureFlagOverrides: {
        bridgeConfig: {
          chainRanking: [{ chainId: 'eip155:1' }, { chainId: 'eip155:59144' }],
        },
      },
      bridgeSliceOverrides: {
        toToken: toBridgeToken(getNativeAssetForChainId(ChainId.LINEA)),
      },
      metamaskStateOverrides: {
        internalAccounts: {
          selectedAccount: MOCK_EVM_ACCOUNT.id,
        },
        selectedAccountGroup: 'entropy:01K2FF18CTTXJYD34R78X4N1N1/0',
      },
    });
    expect(getFromChain(store?.getState())?.chainId).toBe('eip155:1');
    expect(getToChain(store?.getState())?.chainId).toBe('eip155:59144');
    expect(result.current.selectedDestinationAccount).toStrictEqual({
      ...getFromAccount(store?.getState()),
      isExternal: false,
      displayName: 'Account 1',
      walletName: 'Wallet 1',
    });
    expect(result.current.isDestinationAccountPickerOpen).toBe(false);
  });

  it('updates the destination account when an internal account is selected by the user', () => {
    const { result, store } = renderUseDestinationAccount({
      bridgeSliceOverrides: { toToken: null },
    });
    expect(result.current.selectedDestinationAccount).toStrictEqual({
      ...getFromAccount(store?.getState()),
      isExternal: false,
      displayName: 'Account 1',
      walletName: 'Wallet 1',
    });
    const newDestinationAccount = getToAccounts(store?.getState())[1];
    act(() => {
      result.current.setSelectedDestinationAccount(newDestinationAccount);
    });
    expect(result.current.selectedDestinationAccount).toStrictEqual({
      ...newDestinationAccount,
      isExternal: false,
      displayName: 'Account 1',
      walletName: 'Wallet 1',
    });
    expect(getFromAccount(store?.getState())?.id).toStrictEqual(
      newDestinationAccount?.id,
    );
    expect(result.current.isDestinationAccountPickerOpen).toBe(false);
  });

  it('updates the destination account when an external account is selected by the user', () => {
    const { result, store } = renderUseDestinationAccount({
      bridgeSliceOverrides: { toToken: null },
    });
    expect(result.current.selectedDestinationAccount).toStrictEqual({
      ...getFromAccount(store?.getState()),
      isExternal: false,
      displayName: 'Account 1',
      walletName: 'Wallet 1',
    });
    const newDestinationAccount = {
      address: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
      displayName: 'account.eth',
      isExternal: true,
      type: 'any:account',
    };
    act(() => {
      result.current.setSelectedDestinationAccount(newDestinationAccount);
    });
    expect(result.current.selectedDestinationAccount).toStrictEqual({
      ...newDestinationAccount,
      isExternal: true,
      displayName: 'account.eth',
    });
    expect(result.current.isDestinationAccountPickerOpen).toBe(false);
  });

  it('returns the source account when a HW wallet is selected by the user', () => {
    const { result, store } = renderUseDestinationAccount({
      bridgeSliceOverrides: { toToken: null },
      metamaskStateOverrides: {
        internalAccounts: {
          selectedAccount: MOCK_LEDGER_ACCOUNT.id,
        },
        selectedAccountGroup:
          'keyring:Ledger Hardware/0xb3864b298f4fddbbbd2fa5cf1a2a2748932b3b82',
      },
    });
    expect(result.current.selectedDestinationAccount).toStrictEqual({
      ...getFromAccount(store?.getState()),
      isExternal: false,
      displayName: 'Ledger Account 1',
      walletName: 'Ledger',
    });
    expect(result.current.isDestinationAccountPickerOpen).toBe(false);
  });

  it('returns the selected HW account when the user overrides the EVM destination account', () => {
    const { result } = renderUseDestinationAccount({
      featureFlagOverrides: {
        bridgeConfig: {
          chainRanking: [{ chainId: 'eip155:1' }, { chainId: 'eip155:59144' }],
        },
      },
      bridgeSliceOverrides: {
        toToken: toBridgeToken(getNativeAssetForChainId(ChainId.LINEA)),
      },
      metamaskStateOverrides: {
        internalAccounts: {
          selectedAccount: MOCK_EVM_ACCOUNT.id,
        },
        selectedAccountGroup: 'entropy:01K2FF18CTTXJYD34R78X4N1N1/0',
      },
    });
    expect(result.current.selectedDestinationAccount).toStrictEqual({
      ...MOCK_EVM_ACCOUNT,
      isExternal: false,
      displayName: 'Account 1',
      walletName: 'Wallet 1',
    });
    expect(result.current.isDestinationAccountPickerOpen).toBe(false);
    act(() => {
      result.current.setSelectedDestinationAccount({
        ...MOCK_LEDGER_ACCOUNT,
        isExternal: false,
        displayName: 'Ledger Account 1',
        walletName: 'Wallet 3',
      });
    });
    expect(result.current.selectedDestinationAccount).toStrictEqual({
      ...MOCK_LEDGER_ACCOUNT,
      isExternal: false,
      displayName: 'Ledger Account 1',
      walletName: 'Wallet 3',
    });
    expect(result.current.isDestinationAccountPickerOpen).toBe(false);
  });
});
