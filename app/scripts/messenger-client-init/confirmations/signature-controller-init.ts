import { SignatureController } from '@metamask/signature-controller';
import { MessengerClientInitFunction } from '../types';
import {
  SignatureControllerInitMessenger,
  SignatureControllerMessenger,
} from '../messengers';
import { trace } from '../../../../shared/lib/trace';

/**
 * Initialize the signature controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.initMessenger
 * @returns The initialized controller.
 */
export const SignatureControllerInit: MessengerClientInitFunction<
  SignatureController,
  SignatureControllerMessenger,
  SignatureControllerInitMessenger
> = ({ controllerMessenger, initMessenger }) => {
  const messengerClient = new SignatureController({
    messenger: controllerMessenger,
    isDecodeSignatureRequestEnabled: () => {
      const state = initMessenger.call('PreferencesController:getState');
      return state.useTransactionSimulations;
    },

    // @ts-expect-error: Types of `TraceRequest` are not the same.
    trace,
  });

  return {
    persistedStateKey: null,
    memStateKey: null,
    messengerClient,
  };
};
