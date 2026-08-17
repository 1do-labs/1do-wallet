import type { PreferencesControllerState } from '../controllers/preferences-controller';
import { AlchemyTokenDetectionController } from '../controllers/alchemy-token-detection-controller';
import { MessengerClientInitFunction } from './types';
import {
  TokenDetectionControllerMessenger,
  TokenDetectionControllerInitMessenger,
} from './messengers';

export const TokenDetectionControllerInit: MessengerClientInitFunction<
  AlchemyTokenDetectionController,
  TokenDetectionControllerMessenger,
  TokenDetectionControllerInitMessenger
> = ({ controllerMessenger, initMessenger }) => {
  // Extension uses a custom PreferencesController that has custom state
  const getRetypedPrefState = () =>
    initMessenger.call(
      'PreferencesController:getState',
    ) as unknown as PreferencesControllerState;

  const messengerClient = new AlchemyTokenDetectionController({
    messenger: controllerMessenger,
    disabled: false,
    useTokenDetection: () => Boolean(getRetypedPrefState().useTokenDetection),
  });

  return {
    memStateKey: null,
    persistedStateKey: null,
    messengerClient,
  };
};
