import { createSelector } from 'reselect';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  isCaipChainId,
  KnownCaipNamespace,
  parseCaipChainId,
} from '@metamask/utils';
import { getCurrentChainId } from '../../../shared/lib/selectors/networks';
import { getUseExternalServices } from '../../selectors';
import RampAPI from '../../helpers/ramps/rampApi/rampAPI';
import { hexToDecimal } from '../../../shared/lib/conversion.utils';
import {
  getMultichainIsBitcoin,
  getMultichainIsSolana,
} from '../../selectors/multichain';
import { defaultBuyableChains } from './constants';
import { AggregatorNetwork } from './types';

const isEvmAggregatorChain = (chainId: AggregatorNetwork['chainId']) => {
  if (typeof chainId === 'number') {
    return true;
  }

  if (typeof chainId === 'string' && chainId.startsWith('0x')) {
    return true;
  }

  if (!isCaipChainId(chainId)) {
    return false;
  }

  return parseCaipChainId(chainId).namespace === KnownCaipNamespace.Eip155;
};

const filterEvmBuyableChains = (networks?: AggregatorNetwork[]) =>
  (networks ?? []).filter((network) => isEvmAggregatorChain(network?.chainId));

export const fetchBuyableChains = createAsyncThunk(
  'ramps/fetchBuyableChains',
  async (_, { getState }) => {
    const state = getState();
    // @ts-expect-error: TS doesn't know about the root state interface yet
    const { isFetched } = state.ramps;
    const allowExternalRequests = getUseExternalServices(state);
    if (!allowExternalRequests) {
      return defaultBuyableChains;
    }
    if (!isFetched) {
      return filterEvmBuyableChains(await RampAPI.getNetworks());
    }
    // @ts-expect-error: TS doesn't know about the root state interface yet
    return filterEvmBuyableChains(state.ramps.buyableChains);
  },
);

const rampsSlice = createSlice({
  name: 'ramps',
  initialState: {
    buyableChains: defaultBuyableChains,
    isFetched: false,
  },
  reducers: {
    setBuyableChains: (state, action) => {
      if (
        Array.isArray(action.payload) &&
        action.payload.length > 0 &&
        action.payload.every((network) => network?.chainId)
      ) {
        state.buyableChains = filterEvmBuyableChains(action.payload);
        state.isFetched = true;
      } else {
        state.buyableChains = defaultBuyableChains;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBuyableChains.fulfilled, (state, action) => {
        const networks = action.payload;
        if (networks && networks.length > 0) {
          state.buyableChains = filterEvmBuyableChains(networks);
        } else {
          state.buyableChains = defaultBuyableChains;
        }
        state.isFetched = true;
      })
      .addCase(fetchBuyableChains.rejected, (state) => {
        state.buyableChains = defaultBuyableChains;
        state.isFetched = true;
      });
  },
});

const { reducer } = rampsSlice;

// Can be typed to RootState if/when the interface is defined

// TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31973
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getBuyableChains = (state: any) =>
  state.ramps?.buyableChains ?? defaultBuyableChains;

export const getIsBitcoinBuyable = createSelector(
  [],
  () => false,
);

export const getIsSolanaBuyable = createSelector(
  [],
  () => false,
);

export const getIsNativeTokenBuyable = createSelector(
  [
    getCurrentChainId,
    getBuyableChains,
    getIsBitcoinBuyable,
    getMultichainIsBitcoin,
    getIsSolanaBuyable,
    getMultichainIsSolana,
  ],
  (
    currentChainId,
    buyableChains,
    isBtcBuyable,
    isBtc,
    isSolanaBuyable,
    isSolana,
  ) => {
    try {
      if (isBtc) {
        return isBtcBuyable;
      }
      if (isSolana) {
        return isSolanaBuyable;
      }

      return buyableChains
        .filter(Boolean)
        .some(
          (network: AggregatorNetwork) =>
            String(network.chainId) === hexToDecimal(currentChainId),
        );
    } catch (e) {
      return false;
    }
  },
);

export default reducer;
