import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CaipChainId, NonEmptyArray, Hex } from '@metamask/utils';
import {
  getAllScopesFromCaip25CaveatValue,
  getCaipAccountIdsFromCaip25CaveatValue,
} from '@metamask/chain-agnostic-permission';
import {
  AlignItems,
  BlockSize,
  Display,
  FlexDirection,
} from '../../../../helpers/constants/design-system';
import { useI18nContext } from '../../../../hooks/useI18nContext';
import { getAllNetworkConfigurationsByCaipChainId } from '../../../../../shared/lib/selectors/networks';
import {
  getAllPermittedChainsForSelectedTab,
  getConnectedSitesList,
  getPermissions,
  getPermissionSubjects,
  getShowPermittedNetworkToastOpen,
} from '../../../../selectors';
import {
  hidePermittedNetworkToast,
  removePermissionsFor,
  requestAccountsAndChainPermissionsWithId,
  setPermittedAccounts,
  setPermittedChains,
} from '../../../../store/actions';
import {
  AvatarFavicon,
  AvatarFaviconSize,
  Box,
  Button,
  ButtonPrimary,
  ButtonPrimarySize,
  ButtonSize,
  ButtonVariant,
  IconName,
} from '../../../component-library';
import { ToastContainer, Toast } from '../../../multichain/toast/toast';
import { NoConnectionContent } from '../../../multichain/pages/connections/components/no-connection';
import { Content, Footer, Page } from '../../../multichain/pages/page';
import { SubjectsType } from '../../../multichain/pages/connections/components/connections.types';
import { CONNECT_ROUTE } from '../../../../helpers/constants/routes';
import { DisconnectAllModal } from '../../../multichain/disconnect-all-modal/disconnect-all-modal';
import { PermissionsHeader } from '../../../multichain/permissions-header/permissions-header';
import { EvmNetworkConfigurationWithCaipChainId } from '../../../../selectors/selectors.types';
import { CAIP_FORMATTED_TEST_CHAINS } from '../../../../../shared/constants/network';
import { endTrace, trace, TraceName } from '../../../../../shared/lib/trace';
import { MultichainSiteCell } from '../../multichain-site-cell/multichain-site-cell';
import { useAccountGroupsForPermissions } from '../../../../hooks/useAccountGroupsForPermissions';
import { getCaip25CaveatValueFromPermissions } from '../../../../pages/permissions-connect/connect-page/utils';
import { getCaip25AccountIdsFromAccountGroupAndScope } from '../../../../../shared/lib/multichain/scope-utils';
import { MultichainEditAccountsPage } from '../multichain-edit-accounts-page/multichain-edit-accounts-page';

export enum MultichainReviewPermissionsPageMode {
  Summary = 'summary',
  EditAccounts = 'edit-accounts',
}

export const MultichainReviewPermissions = () => {
  const t = useI18nContext();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const originParam = searchParams.get('origin');
  const securedOrigin = decodeURIComponent(originParam ?? '');
  const [showAccountToast, setShowAccountToast] = useState(false);
  const [showNetworkToast, setShowNetworkToast] = useState(false);
  const [showDisconnectAllModal, setShowDisconnectAllModal] = useState(false);
  const [pageMode, setPageMode] = useState<MultichainReviewPermissionsPageMode>(
    MultichainReviewPermissionsPageMode.Summary,
  );
  const activeTabOrigin: string = securedOrigin;

  const showPermittedNetworkToastOpen = useSelector(
    getShowPermittedNetworkToastOpen,
  );

  useEffect(() => {
    if (showPermittedNetworkToastOpen) {
      setShowNetworkToast(showPermittedNetworkToastOpen);
      dispatch(hidePermittedNetworkToast());
    }
  }, [showPermittedNetworkToastOpen, dispatch]);

  const requestAccountsAndChainPermissions = async () => {
    const requestId = await dispatch(
      requestAccountsAndChainPermissionsWithId(activeTabOrigin),
    );
    // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31893
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    navigate(`${CONNECT_ROUTE}/${requestId}`);
  };

  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31973
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subjectMetadata: { [key: string]: any } = useSelector(
    getConnectedSitesList,
  );
  const connectedSubjectsMetadata = subjectMetadata[activeTabOrigin];
  const subjects = useSelector(getPermissionSubjects);

  const disconnectAllPermissions = () => {
    const subject = (subjects as SubjectsType)[activeTabOrigin];

    if (subject) {
      const permissionMethodNames = Object.values(subject.permissions).map(
        ({ parentCapability }: { parentCapability: string }) =>
          parentCapability,
      ) as string[];
      if (permissionMethodNames.length > 0) {
        const permissionsRecord = {
          [activeTabOrigin]: permissionMethodNames as NonEmptyArray<string>,
        };

        dispatch(removePermissionsFor(permissionsRecord));
      }
    }
    dispatch(hidePermittedNetworkToast());
  };

  const handleDisconnectClick = () => {
    setShowDisconnectAllModal(true);
  };

  const networkConfigurationsByCaipChainId = useSelector(
    getAllNetworkConfigurationsByCaipChainId,
  );

  const [evmMainnetNetworks, evmTestNetworks] = useMemo(
    () =>
      Object.entries(networkConfigurationsByCaipChainId).reduce(
        ([mainnetNetworks, testnetNetworks], [chainId, network]) => {
          const caipChainId = chainId as CaipChainId;
          const isTestNetwork =
            CAIP_FORMATTED_TEST_CHAINS.includes(caipChainId);
          (isTestNetwork ? testnetNetworks : mainnetNetworks).push({
            ...network,
            caipChainId,
          });
          return [mainnetNetworks, testnetNetworks];
        },
        [
          [] as EvmNetworkConfigurationWithCaipChainId[],
          [] as EvmNetworkConfigurationWithCaipChainId[],
        ],
      ),
    [networkConfigurationsByCaipChainId],
  );

  const connectedChainIds = useSelector((state) =>
    getAllPermittedChainsForSelectedTab(state, activeTabOrigin),
  ) as CaipChainId[];

  const handleSelectChainIds = async (chainIds: string[]) => {
    if (chainIds.length === 0) {
      setShowDisconnectAllModal(true);
      return;
    }

    dispatch(setPermittedChains(activeTabOrigin, chainIds));

    setShowNetworkToast(true);
  };

  const existingPermissions = useSelector((state) =>
    getPermissions(state, activeTabOrigin),
  );

  const existingCaip25CaveatValue = useMemo(
    () =>
      existingPermissions
        ? getCaip25CaveatValueFromPermissions(existingPermissions)
        : null,
    [existingPermissions],
  );

  const existingCaip25AccountIds = useMemo(() => {
    return getCaipAccountIdsFromCaip25CaveatValue(
      existingCaip25CaveatValue ?? {
        requiredScopes: {},
        optionalScopes: {},
        sessionProperties: {},
        isMultichainOrigin: false,
      },
    );
  }, [existingCaip25CaveatValue]);

  const existingCaipChainIds = existingCaip25CaveatValue
    ? getAllScopesFromCaip25CaveatValue(existingCaip25CaveatValue)
    : [];

  const {
    supportedAccountGroups,
    connectedAccountGroups,
    existingConnectedCaipAccountIds,
  } = useAccountGroupsForPermissions(
    existingCaip25CaveatValue ?? {
      requiredScopes: {},
      optionalScopes: {},
      sessionProperties: {},
      isMultichainOrigin: false,
    },
    existingCaip25AccountIds,
    existingCaipChainIds,
    [],
  );

  const selectedAccountGroupIds = useMemo(
    () => connectedAccountGroups.map((group) => group.id),
    [connectedAccountGroups],
  );

  const setModeToEditAccounts = useCallback(() => {
    setPageMode(MultichainReviewPermissionsPageMode.EditAccounts);
  }, []);

  const handleAccountGroupIdsSelected = useCallback(
    (accountGroupIds: string[]) => {
      if (accountGroupIds.length === 0) {
        setPageMode(MultichainReviewPermissionsPageMode.Summary);
        setShowDisconnectAllModal(true);
        return;
      }

      const accountGroups = supportedAccountGroups.filter((group) =>
        accountGroupIds.includes(group.id),
      );

      const caipAccountIds = getCaip25AccountIdsFromAccountGroupAndScope(
        accountGroups,
        connectedChainIds,
      );

      setPageMode(MultichainReviewPermissionsPageMode.Summary);
      dispatch(setPermittedAccounts(activeTabOrigin, caipAccountIds));
    },
    [activeTabOrigin, connectedChainIds, dispatch, supportedAccountGroups],
  );

  return pageMode === MultichainReviewPermissionsPageMode.Summary ? (
    <Page
      data-testid="connections-page"
      className="main-container connections-page"
    >
      <>
        <PermissionsHeader
          securedOrigin={securedOrigin}
          connectedSubjectsMetadata={connectedSubjectsMetadata}
        />
        <Content padding={0}>
          {connectedAccountGroups.length > 0 ? (
            <MultichainSiteCell
              nonTestNetworks={evmMainnetNetworks}
              testNetworks={evmTestNetworks}
              supportedAccountGroups={supportedAccountGroups}
              showEditAccounts={setModeToEditAccounts}
              onSelectChainIds={handleSelectChainIds}
              selectedAccountGroupIds={selectedAccountGroupIds}
              selectedChainIds={connectedChainIds}
            />
          ) : null}

          {connectedAccountGroups.length === 0 ? <NoConnectionContent /> : null}

          {showDisconnectAllModal ? (
            <DisconnectAllModal
              onClose={() => setShowDisconnectAllModal(false)}
              onClick={() => {
                setShowDisconnectAllModal(false);
                trace({ name: TraceName.DisconnectAllModal });
                disconnectAllPermissions();
                endTrace({ name: TraceName.DisconnectAllModal });
              }}
            />
          ) : null}
        </Content>
        <Footer>
          <>
            {existingConnectedCaipAccountIds.length > 0 ? (
              <Box
                display={Display.Flex}
                flexDirection={FlexDirection.Column}
                width={BlockSize.Full}
                gap={2}
                alignItems={AlignItems.center}
              >
                {showAccountToast ? (
                  <ToastContainer>
                    <Toast
                      text={t('accountPermissionToast')}
                      onClose={() => setShowAccountToast(false)}
                      startAdornment={
                        <AvatarFavicon
                          name={connectedSubjectsMetadata?.name}
                          size={AvatarFaviconSize.Sm}
                          src={connectedSubjectsMetadata?.iconUrl}
                        />
                      }
                    />
                  </ToastContainer>
                ) : null}
                {showNetworkToast ? (
                  <ToastContainer>
                    <Toast
                      text={t('networkPermissionToast')}
                      onClose={() => setShowNetworkToast(false)}
                      startAdornment={
                        <AvatarFavicon
                          name={connectedSubjectsMetadata?.name}
                          size={AvatarFaviconSize.Sm}
                          src={connectedSubjectsMetadata?.iconUrl}
                        />
                      }
                    />
                  </ToastContainer>
                ) : null}
                <Button
                  size={ButtonSize.Lg}
                  block
                  variant={ButtonVariant.Secondary}
                  startIconName={IconName.Logout}
                  danger
                  onClick={handleDisconnectClick}
                  data-test-id="disconnect-all"
                >
                  {t('disconnect')}
                </Button>
              </Box>
            ) : (
              <>
                {connectedAccountGroups.length > 0 ? (
                  <ButtonPrimary
                    size={ButtonPrimarySize.Lg}
                    block
                    data-test-id="no-connections-button"
                    // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31879
                    // eslint-disable-next-line @typescript-eslint/no-misused-promises
                    onClick={requestAccountsAndChainPermissions}
                  >
                    {t('connectAccounts')}
                  </ButtonPrimary>
                ) : null}
              </>
            )}
          </>
        </Footer>
      </>
    </Page>
  ) : (
    <MultichainEditAccountsPage
      title={t('editAccounts')}
      confirmButtonText={t('update')}
      supportedAccountGroups={supportedAccountGroups}
      defaultSelectedAccountGroups={selectedAccountGroupIds}
      onSubmit={handleAccountGroupIdsSelected}
      onClose={() => setPageMode(MultichainReviewPermissionsPageMode.Summary)}
    />
  );
};
