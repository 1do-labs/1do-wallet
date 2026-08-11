import React, { ReactElement } from 'react';
import { AlertActionHandlerProvider } from '../../../../../components/app/alert-system/contexts/alertActionHandler';
import useConfirmationAlertActions from '../../../hooks/useConfirmationAlertActions';
import useSetConfirmationAlerts from '../../../hooks/useSetConfirmationAlerts';

const ConfirmAlerts = ({ children }: { children: ReactElement }) => {
  const processAction = useConfirmationAlertActions();
  useSetConfirmationAlerts();

  return (
    <AlertActionHandlerProvider onProcessAction={processAction}>
      {children}
    </AlertActionHandlerProvider>
  );
};

export default ConfirmAlerts;
