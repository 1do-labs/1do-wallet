import { TokenRatesController } from '@metamask/assets-controllers';
import { AlchemyTokenPricesService } from '../../lib/alchemy-token-prices-service';
import { MessengerClientInitFunction } from '../types';
import {
  TokenRatesControllerMessenger,
  TokenRatesControllerInitMessenger,
} from '../messengers/assets';
import { previousValueComparator } from '../../lib/util';

/**
 * Initialize the Token Rates controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state of the extension.
 * @returns The initialized controller.
 */
export const TokenRatesControllerInit: MessengerClientInitFunction<
  TokenRatesController,
  TokenRatesControllerMessenger,
  TokenRatesControllerInitMessenger
> = (request) => {
  const { controllerMessenger, initMessenger, persistedState } = request;
  const preferencesState = initMessenger.call('PreferencesController:getState');

  const messengerClient = new TokenRatesController({
    messenger: controllerMessenger,
    state: persistedState.TokenRatesController,
    tokenPricesService: new AlchemyTokenPricesService(),
    disabled: !preferencesState.useCurrencyRateCheck,
  });

  initMessenger.subscribe(
    'PreferencesController:stateChange',
    previousValueComparator((prevState, currState) => {
      const { useCurrencyRateCheck: prevUseCurrencyRateCheck } = prevState;
      const { useCurrencyRateCheck: currUseCurrencyRateCheck } = currState;
      if (currUseCurrencyRateCheck && !prevUseCurrencyRateCheck) {
        messengerClient.enable();
      } else if (!currUseCurrencyRateCheck && prevUseCurrencyRateCheck) {
        messengerClient.disable();
      }

      return true;
    }, preferencesState),
  );

  return {
    messengerClient,
  };
};
