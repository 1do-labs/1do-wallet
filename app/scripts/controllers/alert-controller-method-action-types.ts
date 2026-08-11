/**
 * This file is auto generated.
 * Do not edit manually.
 */

import type { AlertController } from './alert-controller';

export type AlertControllerSetAlertEnablednessAction = {
  type: `AlertController:setAlertEnabledness`;
  handler: AlertController['setAlertEnabledness'];
};

/**
 * Sets the "switch to connected" alert as shown for the given origin
 *
 * @param origin - The origin the alert has been shown for
 */
export type AlertControllerSetUnconnectedAccountAlertShownAction = {
  type: `AlertController:setUnconnectedAccountAlertShown`;
  handler: AlertController['setUnconnectedAccountAlertShown'];
};

/**
 * Union of all AlertController action types.
 */
export type AlertControllerMethodActions =
  | AlertControllerSetAlertEnablednessAction
  | AlertControllerSetUnconnectedAccountAlertShownAction;
