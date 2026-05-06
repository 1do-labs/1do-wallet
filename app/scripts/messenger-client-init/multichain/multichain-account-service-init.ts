import { MultichainAccountService } from '@metamask/multichain-account-service';
import { MessengerClientInitFunction } from '../types';
import {
  MultichainAccountServiceMessenger,
  MultichainAccountServiceInitMessenger,
} from '../messengers/accounts';
import { previousValueComparator } from '../../lib/util';
import { trace } from '../../../../shared/lib/trace';

/**
 * Initialize the multichain account service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.initMessenger - The messenger to use for initialization.
 * @param request.ensureOnboardingComplete - Ensure onboarding is complete before initializing.
 * @returns The initialized service.
 */
export const MultichainAccountServiceInit: MessengerClientInitFunction<
  MultichainAccountService,
  MultichainAccountServiceMessenger,
  MultichainAccountServiceInitMessenger
> = ({ controllerMessenger, initMessenger, ensureOnboardingComplete }) => {
  const messengerClient = new MultichainAccountService({
    messenger: controllerMessenger,
    providerConfigs: {},
    config: {
      // @ts-expect-error Controller uses string for names rather than enum
      trace,
    },
    ensureOnboardingComplete,
  });

  const preferencesState = initMessenger.call('PreferencesController:getState');

  initMessenger.subscribe(
    'PreferencesController:stateChange',
    previousValueComparator((prevState, currState) => {
      const { useExternalServices: prevUseExternalServices } = prevState;
      const { useExternalServices: currUseExternalServices } = currState;
      if (prevUseExternalServices !== currUseExternalServices) {
        // Set basic functionality and trigger alignment when enabled
        // This single call handles both provider disable/enable and alignment.
        messengerClient
          .setBasicFunctionality(currUseExternalServices)
          .catch((error) => {
            console.error(
              'Failed to set basic functionality on MultichainAccountService:',
              error,
            );
          });
      }

      return true;
    }, preferencesState),
  );

  return {
    memStateKey: null,
    persistedStateKey: null,
    messengerClient,
  };
};
