/* eslint-disable @typescript-eslint/naming-convention */
import { MetaMetricsEventUiCustomization } from '../../../../../shared/constants/metametrics';
import type { TransactionMetricsBuilder } from './types';

export const getSecurityMetricsProperties: TransactionMetricsBuilder = ({
  transactionMeta,
  transactionMetricsRequest,
}) => {
  const uiCustomizations = [];

  if (transactionMeta.securityProviderResponse?.flagAsDangerous === 1) {
    uiCustomizations.push(MetaMetricsEventUiCustomization.FlaggedAsMalicious);
  } else if (transactionMeta.securityProviderResponse?.flagAsDangerous === 2) {
    uiCustomizations.push(
      MetaMetricsEventUiCustomization.FlaggedAsSafetyUnknown,
    );
  }

  if (transactionMeta.simulationFails) {
    uiCustomizations.push(MetaMetricsEventUiCustomization.GasEstimationFailed);
  }

  return {
    properties: {
      gas_estimation_failed: Boolean(transactionMeta.simulationFails),
      ui_customizations: uiCustomizations.length > 0 ? uiCustomizations : null,
    },
    sensitiveProperties: {},
  };
};
