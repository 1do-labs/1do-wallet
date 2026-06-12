/* eslint-disable @typescript-eslint/naming-convention */
import type { TransactionMetricsBuilder } from './types';

export const getAccountMetricsProperties: TransactionMetricsBuilder = async ({
  transactionMetricsRequest,
}) => {
  let accountType;
  try {
    accountType = await transactionMetricsRequest.getAccountType(
      transactionMetricsRequest.getSelectedAddress(),
    );
  } catch (error) {
    accountType = 'error';
  }

  const selectedAddress = transactionMetricsRequest.getSelectedAddress();
  const hardwareType =
    await transactionMetricsRequest.getHardwareTypeForMetric(selectedAddress);

  return {
    properties: {
      account_type: accountType,
      device_model:
        await transactionMetricsRequest.getDeviceModel(selectedAddress),
      ...(hardwareType ? { account_hardware_type: hardwareType } : {}),
      hd_entropy_index: transactionMetricsRequest.getHDEntropyIndex(),
    },
    sensitiveProperties: {},
  };
};
