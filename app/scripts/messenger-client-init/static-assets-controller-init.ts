import { Hex } from '@metamask/utils';
import {
  DEFAULT_TOP_X,
  DEFAULT_CACHE_EXPIRATION_MS,
  StaticAssetsController,
} from '../controllers/static-assets-controller';
import { MessengerClientInitFunction } from './types';
import { StaticAssetsControllerMessenger } from './messengers';

export const StaticAssetsControllerInit: MessengerClientInitFunction<
  StaticAssetsController,
  StaticAssetsControllerMessenger
> = ({ controllerMessenger }) => {
  const messengerClient = new StaticAssetsController({
    messenger: controllerMessenger,
    getSupportedChains: (): Set<Hex> => {
      return new Set();
    },
    getCacheExpirationTime: (): number => {
      return DEFAULT_CACHE_EXPIRATION_MS;
    },
    getTopX: (): number => {
      return DEFAULT_TOP_X;
    },
  });
  return {
    messengerClient,
  };
};
