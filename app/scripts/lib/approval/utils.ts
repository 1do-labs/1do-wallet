import {
  ApprovalController,
  ApprovalRequest,
} from '@metamask/approval-controller';
import { providerErrors } from '@metamask/rpc-errors';
import { createProjectLogger, Json } from '@metamask/utils';

const log = createProjectLogger('approval-utils');

export function rejectAllApprovals({
  approvalController,
  deleteInterface,
}: {
  approvalController: ApprovalController;
  deleteInterface?: (id: string) => void;
}) {
  const approvalRequestsById = approvalController.state.pendingApprovals;
  const approvalRequests = Object.values(approvalRequestsById);

  for (const approvalRequest of approvalRequests) {
    rejectApproval({
      approvalController,
      approvalRequest,
      deleteInterface,
    });
  }
}

export function rejectOriginApprovals({
  approvalController,
  deleteInterface,
  origin,
}: {
  approvalController: ApprovalController;
  deleteInterface?: (id: string) => void;
  origin: string;
}) {
  const approvalRequestsById = approvalController.state.pendingApprovals;
  const approvalRequests = Object.values(approvalRequestsById);

  const originApprovalRequests = approvalRequests.filter(
    (approvalRequest) => approvalRequest.origin === origin,
  );

  for (const approvalRequest of originApprovalRequests) {
    rejectApproval({
      approvalController,
      approvalRequest,
      deleteInterface,
    });
  }
}

function rejectApproval({
  approvalController,
  approvalRequest,
  deleteInterface,
}: {
  approvalController: ApprovalController;
  approvalRequest: ApprovalRequest<Record<string, Json>>;
  deleteInterface?: (id: string) => void;
}) {
  const { id, type, origin } = approvalRequest;

  switch (type) {
    default:
      log('Rejecting pending approval', { id, origin, type });
      approvalController.rejectRequest(
        id,
        providerErrors.userRejectedRequest({
          data: {
            cause: 'rejectAllApprovals',
          },
        }),
      );
      break;
  }
}
