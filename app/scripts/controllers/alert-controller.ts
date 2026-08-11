import {
  AccountsControllerGetSelectedAccountAction,
  AccountsControllerSelectedAccountChangeEvent,
} from '@metamask/accounts-controller';
import {
  BaseController,
  ControllerGetStateAction,
  ControllerStateChangeEvent,
  StateMetadata,
} from '@metamask/base-controller';
import type { Messenger } from '@metamask/messenger';
import { TOGGLEABLE_ALERT_TYPES } from '../../../shared/constants/alerts';
import type { AlertControllerMethodActions } from './alert-controller-method-action-types';

const controllerName = 'AlertController';

/**
 * Returns the state of the {@link AlertController}.
 */
export type AlertControllerGetStateAction = ControllerGetStateAction<
  typeof controllerName,
  AlertControllerState
>;

/**
 * Actions exposed by the {@link AlertController}.
 */
export type AlertControllerActions =
  | AlertControllerGetStateAction
  | AlertControllerMethodActions;

/**
 * Event emitted when the state of the {@link AlertController} changes.
 */
export type AlertControllerStateChangeEvent = ControllerStateChangeEvent<
  typeof controllerName,
  AlertControllerState
>;

/**
 * Events emitted by {@link AlertController}.
 */
export type AlertControllerEvents = AlertControllerStateChangeEvent;

/**
 * Actions that this controller is allowed to call.
 */
export type AllowedActions = AccountsControllerGetSelectedAccountAction;

/**
 * Events that this controller is allowed to subscribe.
 */
export type AllowedEvents = AccountsControllerSelectedAccountChangeEvent;

export type AlertControllerMessenger = Messenger<
  typeof controllerName,
  AlertControllerActions | AllowedActions,
  AlertControllerEvents | AllowedEvents
>;

/**
 * The alert controller state type
 *
 * @property alertEnabledness - A map of alerts IDs to booleans, where
 * `true` indicates that the alert is enabled and shown, and `false` the opposite.
 * @property unconnectedAccountAlertShownOrigins - A map of origin
 * strings to booleans indicating whether the "switch to connected" alert has
 * been shown (`true`) or otherwise (`false`).
 */
export type AlertControllerState = {
  alertEnabledness: Record<string, boolean>;
  unconnectedAccountAlertShownOrigins: Record<string, boolean>;
};

/**
 * The alert controller options
 *
 * @property state - The initial controller state
 * @property messenger - The controller messenger
 */
export type AlertControllerOptions = {
  state?: Partial<AlertControllerState>;
  messenger: AlertControllerMessenger;
};

/**
 * Function to get default state of the {@link AlertController}.
 */
export const getDefaultAlertControllerState = (): AlertControllerState => ({
  alertEnabledness: TOGGLEABLE_ALERT_TYPES.reduce(
    (alertEnabledness: Record<string, boolean>, alertType: string) => {
      alertEnabledness[alertType] = true;
      return alertEnabledness;
    },
    {},
  ),
  unconnectedAccountAlertShownOrigins: {},
});

/**
 * {@link AlertController}'s metadata.
 *
 * This allows us to choose if fields of the state should be persisted or not
 * using the `persist` flag; and if they can appear in diagnostic snapshots, using
 * the `anonymous` flag.
 */
const controllerMetadata: StateMetadata<AlertControllerState> = {
  alertEnabledness: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: true,
    usedInUi: true,
  },
  unconnectedAccountAlertShownOrigins: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
};

/**
 * Methods exposed by the {@link AlertController} messenger.
 */
const MESSENGER_EXPOSED_METHODS = [
  'setAlertEnabledness',
  'setUnconnectedAccountAlertShown',
] as const;

/**
 * Controller responsible for maintaining alert-related state.
 */
export class AlertController extends BaseController<
  typeof controllerName,
  AlertControllerState,
  AlertControllerMessenger
> {
  #selectedAddress: string;

  constructor(opts: AlertControllerOptions) {
    super({
      messenger: opts.messenger,
      metadata: controllerMetadata,
      name: controllerName,
      state: {
        ...getDefaultAlertControllerState(),
        ...opts.state,
      },
    });

    this.#selectedAddress = this.messenger.call(
      'AccountsController:getSelectedAccount',
    ).address;

    this.messenger.subscribe(
      'AccountsController:selectedAccountChange',
      (account: { address: string }) => {
        const currentState = this.state;
        if (
          currentState.unconnectedAccountAlertShownOrigins &&
          this.#selectedAddress !== account.address
        ) {
          this.#selectedAddress = account.address;
          this.update((state) => {
            state.unconnectedAccountAlertShownOrigins = {};
          });
        }
      },
    );

    this.messenger.registerMethodActionHandlers(
      this,
      MESSENGER_EXPOSED_METHODS,
    );
  }

  setAlertEnabledness(alertId: string, enabledness: boolean): void {
    this.update((state) => {
      state.alertEnabledness[alertId] = enabledness;
    });
  }

  /**
   * Sets the "switch to connected" alert as shown for the given origin
   *
   * @param origin - The origin the alert has been shown for
   */
  setUnconnectedAccountAlertShown(origin: string): void {
    this.update((state) => {
      state.unconnectedAccountAlertShownOrigins[origin] = true;
    });
  }
}
