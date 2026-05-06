import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  useNavigate,
  useLocation,
  useParams,
  Routes,
  Route,
} from 'react-router-dom';
import {
  SubjectType,
  PermissionsRequest as ControllerPermissionsRequest,
} from '@metamask/permission-controller';
import { isEvmAccountType, KeyringAccountType } from '@metamask/keyring-api';
import {
  Caip25EndowmentPermissionName,
  getCaipAccountIdsFromCaip25CaveatValue,
  getEthAccounts,
  getPermittedEthChainIds,
} from '@metamask/chain-agnostic-permission';
import { parseCaipAccountId } from '@metamask/utils';
import { toRelativeRoutePath } from '../routes/utils';
// TODO: Remove restricted import
// eslint-disable-next-line import-x/no-restricted-paths
import {
  isEthAddress,
  normalizeSafeAddress,
  // eslint-disable-next-line import-x/no-restricted-paths
} from '../../../app/scripts/lib/multichain/address';
import { MILLISECOND } from '../../../shared/constants/time';
import {
  DEFAULT_ROUTE,
  CONNECT_ROUTE,
  CONNECT_CONFIRM_PERMISSIONS_ROUTE,
} from '../../helpers/constants/routes';
import {
  getAccountsWithLabels,
  getLastConnectedInfo,
  getPermissionsRequests,
  getSelectedInternalAccount,
  getTargetSubjectMetadata,
} from '../../selectors';
import { getURLHostName } from '../../helpers/utils/util';
import {
  approvePermissionsRequest as approvePermissionsRequestAction,
  rejectPermissionsRequest as rejectPermissionsRequestAction,
  getRequestAccountTabIds as getRequestAccountTabIdsAction,
} from '../../store/actions';
import PermissionPageContainer from '../../components/app/permission-page-container';
import { MultichainAccountsConnectPage } from '../multichain-accounts/multichain-accounts-connect-page/multichain-accounts-connect-page';
import { useI18nContext } from '../../hooks/useI18nContext';
import { ConnectionTrustSignalGate } from './connection-trust-signal-gate';
import PermissionsRedirect from './redirect';
import {
  getCaip25CaveatValueFromPermissions,
  PermissionsRequest,
} from './connect-page/utils';

const APPROVE_TIMEOUT = MILLISECOND * 1200;

function getDefaultSelectedAccounts(
  currentAddress: string,
  permissions: PermissionsRequest,
) {
  const requestedCaip25CaveatValue =
    getCaip25CaveatValueFromPermissions(permissions);

  // First, try to get all CAIP account IDs from the permission request (chain-agnostic)
  const requestedCaipAccountIds = getCaipAccountIdsFromCaip25CaveatValue(
    requestedCaip25CaveatValue,
  );

  if (requestedCaipAccountIds.length > 0) {
    // Extract addresses from all CAIP account IDs (supports all chain types)
    const addresses = requestedCaipAccountIds
      .map((caipAccountId) => {
        try {
          return normalizeSafeAddress(
            parseCaipAccountId(caipAccountId).address,
          );
        } catch {
          return null;
        }
      })
      .filter((address): address is string => address !== null);

    if (addresses.length > 0) {
      return new Set(addresses);
    }
  }

  // Fallback: try EVM-specific accounts (for backward compatibility with eth_requestAccounts)
  const requestedEthAccounts = getEthAccounts(requestedCaip25CaveatValue);
  if (requestedEthAccounts.length > 0) {
    return new Set(
      requestedEthAccounts
        .map((address) => address.toLowerCase())
        .filter(isEthAddress),
    );
  }

  // Final fallback: use current address if it's an EVM address
  return new Set(isEthAddress(currentAddress) ? [currentAddress] : []);
}

function getRequestedChainIds(permissions: PermissionsRequest | undefined) {
  const requestedCaip25CaveatValue =
    getCaip25CaveatValueFromPermissions(permissions);
  return getPermittedEthChainIds(requestedCaip25CaveatValue);
}

// eslint-disable-next-line @typescript-eslint/naming-convention
function PermissionsConnect() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const params = useParams();

  const permissionsRequestId = params.id;

  // Selectors
  const permissionsRequests = useSelector(getPermissionsRequests);
  const { address: currentAddress } = useSelector(getSelectedInternalAccount);

  const permissionsRequest = permissionsRequests.find(
    (req: Record<string, unknown>) =>
      (req.metadata as Record<string, unknown>)?.id === permissionsRequestId,
  ) as Record<string, unknown> | undefined;

  const { metadata = {}, diff = {} } = permissionsRequest || {};
  const { origin: originFromRequest } = (metadata || {}) as Record<
    string,
    string
  >;

  const isRequestApprovalPermittedChains = Boolean(
    (diff as Record<string, unknown>)?.permissionDiffMap,
  );
  const permissions = permissionsRequest?.permissions as
    | Record<string, unknown>
    | undefined;
  const isRequestingAccounts = Boolean(
    permissions?.[Caip25EndowmentPermissionName] &&
      !isRequestApprovalPermittedChains,
  );

  const targetSubjectMetadataFromSelector = useSelector((state) =>
    getTargetSubjectMetadata(state, originFromRequest),
  );

  const targetSubjectMetadataProp = useMemo(
    () =>
      targetSubjectMetadataFromSelector ?? {
        name: getURLHostName(originFromRequest) || originFromRequest,
        origin: originFromRequest,
        iconUrl: null,
        extensionId: null,
        subjectType: SubjectType.Unknown,
      },
    [targetSubjectMetadataFromSelector, originFromRequest],
  );

  // We only consider EVM accounts for the legacy permission review flow.
  // Multichain accounts are handled separately via the MultichainEditAccountsPageWrapper.
  const accountsWithLabels = useSelector(getAccountsWithLabels).filter(
    (account: { type: string }) =>
      isEvmAccountType(account.type as KeyringAccountType),
  );

  const lastConnectedInfoRaw = useSelector(getLastConnectedInfo);

  const lastConnectedInfo = useMemo(
    () => lastConnectedInfoRaw || {},
    [lastConnectedInfoRaw],
  );

  const connectPath = `${CONNECT_ROUTE}/${permissionsRequestId}`;
  const confirmPermissionPath = `${connectPath}${CONNECT_CONFIRM_PERMISSIONS_ROUTE}`;
  // Local state
  const [redirecting, setRedirecting] = useState(false);
  const [selectedAccountAddresses, setSelectedAccountAddresses] = useState(() =>
    getDefaultSelectedAccounts(
      currentAddress,
      permissions as PermissionsRequest,
    ),
  );
  const [permissionsApproved, setPermissionsApproved] = useState<
    boolean | null
  >(null);
  const [origin] = useState<string>(originFromRequest);
  const [targetSubjectMetadata, setTargetSubjectMetadata] = useState(
    targetSubjectMetadataProp || {},
  );

  const prevPermissionsRequestRef = useRef<typeof permissionsRequest | null>(
    null,
  );
  const prevTargetSubjectMetadataRef = useRef<
    typeof targetSubjectMetadataProp | null
  >(null);
  const prevLastConnectedInfoRef = useRef<typeof lastConnectedInfo | null>(
    null,
  );

  // Define redirect function before it's used in effects
  const redirect = useCallback(
    (approved: boolean) => {
      setRedirecting(true);
      setPermissionsApproved(approved);

      if (approved) {
        setTimeout(() => navigate(DEFAULT_ROUTE), APPROVE_TIMEOUT);
        return;
      }
      navigate(DEFAULT_ROUTE);
    },
    [navigate],
  );

  // Handle initial navigation on mount
  useEffect(() => {
    dispatch(getRequestAccountTabIdsAction());

    if (!permissionsRequest) {
      navigate(DEFAULT_ROUTE, { replace: true });
      return;
    }

    if (pathname === connectPath && !isRequestingAccounts) {
      navigate(confirmPermissionPath, { replace: true });
    }
  }, [dispatch, pathname, permissionsRequest, navigate, connectPath, isRequestingAccounts, confirmPermissionPath]);

  // Cache targetSubjectMetadata when it changes
  useEffect(() => {
    if (
      targetSubjectMetadataProp?.origin &&
      prevTargetSubjectMetadataRef.current?.origin !==
        targetSubjectMetadataProp?.origin
    ) {
      setTargetSubjectMetadata(targetSubjectMetadataProp);
    }
    prevTargetSubjectMetadataRef.current = targetSubjectMetadataProp;
  }, [targetSubjectMetadataProp]);

  // Handle redirect on permissions approval/rejection
  useEffect(() => {
    if (
      !permissionsRequest &&
      prevPermissionsRequestRef.current &&
      !redirecting
    ) {
      const lastConnectedForOrigin = lastConnectedInfo[origin] as
        | { lastApproved?: number; accounts?: Record<string, number> }
        | undefined;
      const prevLastConnectedForOrigin = prevLastConnectedInfoRef.current?.[
        origin
      ] as
        | { lastApproved?: number; accounts?: Record<string, number> }
        | undefined;

      const accountsLastApprovedTime =
        lastConnectedForOrigin?.lastApproved || 0;
      const initialAccountsLastApprovedTime =
        prevLastConnectedForOrigin?.lastApproved || 0;

      const approved =
        accountsLastApprovedTime > initialAccountsLastApprovedTime;
      redirect(approved);
    }
    prevPermissionsRequestRef.current = permissionsRequest;
    prevLastConnectedInfoRef.current = lastConnectedInfo;
  }, [permissionsRequest, lastConnectedInfo, redirecting, origin, redirect]);

  const cancelPermissionsRequest = useCallback(
    async (requestId: string) => {
      if (requestId) {
        await dispatch(rejectPermissionsRequestAction(requestId));
        redirect(false);
      }
    },
    [dispatch, redirect],
  );

  const approveConnection = useCallback(
    (request: Record<string, unknown>) => {
      // Cast through unknown to satisfy both local and controller types
      dispatch(
        approvePermissionsRequestAction(
          request as unknown as ControllerPermissionsRequest,
        ),
      );
      redirect(true);
    },
    [dispatch, redirect],
  );

  const renderConnectPage = useCallback(() => {
    const connectPageProps = {
      rejectPermissionsRequest: (requestId: string) =>
        cancelPermissionsRequest(requestId),
      request: permissionsRequest || {},
      permissionsRequestId: permissionsRequestId || '',
      approveConnection,
      targetSubjectMetadata,
    };

    return <MultichainAccountsConnectPage {...connectPageProps} />;
  }, [
    cancelPermissionsRequest,
    permissionsRequest,
    permissionsRequestId,
    approveConnection,
    targetSubjectMetadata,
  ]);

  const cancelFromTrustSignalGate = useCallback(
    () => cancelPermissionsRequest(permissionsRequestId || ''),
    [cancelPermissionsRequest, permissionsRequestId],
  );

  return (
    <ConnectionTrustSignalGate
      origin={origin}
      onCancel={cancelFromTrustSignalGate}
    >
      <div className="permissions-connect">
        {redirecting && permissionsApproved ? (
          <PermissionsRedirect subjectMetadata={targetSubjectMetadata} />
        ) : (
          <Routes>
            <Route
              path="/"
              element={renderConnectPage()}
            />
            <Route
              path={toRelativeRoutePath(CONNECT_CONFIRM_PERMISSIONS_ROUTE)}
              element={
                <PermissionPageContainer
                  request={permissionsRequest || {}}
                  approvePermissionsRequest={(request: unknown) => {
                    dispatch(
                      approvePermissionsRequestAction(
                        request as unknown as ControllerPermissionsRequest,
                      ),
                    );
                    redirect(true);
                  }}
                  rejectPermissionsRequest={(requestId: string) =>
                    cancelPermissionsRequest(requestId)
                  }
                  selectedAccounts={accountsWithLabels.filter(
                    (account: { address: string }) =>
                      selectedAccountAddresses.has(account.address),
                  )}
                  requestedChainIds={getRequestedChainIds(
                    permissions as PermissionsRequest | undefined,
                  )}
                  selectedCaipAccountIds={null}
                  selectedCaipChainIds={[]}
                  targetSubjectMetadata={targetSubjectMetadata}
                  navigate={navigate}
                  connectPath={connectPath}
                />
              }
            />
          </Routes>
        )}
      </div>
    </ConnectionTrustSignalGate>
  );
}

export default PermissionsConnect;
