import { ApprovalType } from '@metamask/controller-utils';

import { createSelector } from 'reselect';
import { getPendingApprovals } from '../../../selectors/approvals';
import { createDeepEqualSelector } from '../../../../shared/lib/selectors/selector-creators';

const ConfirmationApprovalTypes = [
  ApprovalType.PersonalSign,
  ApprovalType.EthSignTypedData,
  ApprovalType.Transaction,
];
export const pendingConfirmationsSortedSelector = createSelector(
  getPendingApprovals,
  (approvals) =>
    approvals
      .filter(({ type }) =>
        ConfirmationApprovalTypes.includes(type as ApprovalType),
      )
      .sort((a1, a2) => a1.time - a2.time),
);

const firstPendingConfirmationSelector = createSelector(
  pendingConfirmationsSortedSelector,
  (pendingConfirmations) => pendingConfirmations[0],
);

export const oldestPendingConfirmationSelector = createDeepEqualSelector(
  firstPendingConfirmationSelector,
  (firstPendingConfirmation) => firstPendingConfirmation,
);
