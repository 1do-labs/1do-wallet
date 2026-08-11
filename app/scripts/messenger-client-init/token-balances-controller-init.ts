import { TokenBalancesController } from '@metamask/assets-controllers';
import type { PreferencesControllerState } from '../controllers/preferences-controller';
import { MessengerClientInitFunction } from './types';
import {
  TokenBalancesControllerMessenger,
  TokenBalancesControllerInitMessenger,
} from './messengers';

export const TokenBalancesControllerInit: MessengerClientInitFunction<
  TokenBalancesController,
  TokenBalancesControllerMessenger,
  TokenBalancesControllerInitMessenger
> = ({ controllerMessenger, initMessenger, persistedState }) => {
  // Extension uses a custom PreferencesController that has custom state
  const getRetypedPrefState = () =>
    initMessenger.call(
      'PreferencesController:getState',
    ) as unknown as PreferencesControllerState;
  const { useMultiAccountBalanceChecker } = getRetypedPrefState();

  const messengerClient = new TokenBalancesController({
    messenger: controllerMessenger,
    state: persistedState.TokenBalancesController,
    queryMultipleAccounts: Boolean(useMultiAccountBalanceChecker),
    interval: 30_000,
    allowExternalServices: () =>
      Boolean(getRetypedPrefState().useExternalServices),
    accountsApiChainIds: () => [],
    platform: 'extension',
    isOnboarded: () => {
      const { completedOnboarding } = initMessenger.call(
        'OnboardingController:getState',
      );
      return completedOnboarding;
    },
  });

  return {
    messengerClient,
  };
};
