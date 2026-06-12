import PropTypes from 'prop-types';
import React from 'react';
import { useSelector } from 'react-redux';
import Popover from '../../components/ui/popover';
import ConnectedAccountsList from '../../components/app/connected-accounts-list';
import ConnectedAccountsPermissions from '../../components/app/connected-accounts-permissions';
import { getURLHost } from '../../helpers/utils/util';
import { useI18nContext } from '../../hooks/useI18nContext';
import { Box, Text } from '../../components/component-library';
import { TextColor, TextVariant } from '../../helpers/constants/design-system';
import { getInternalAccounts } from '../../selectors';

export default function ConnectedAccounts({
  accountToConnect = null,
  activeTabOrigin,
  isActiveTabExtension,
  connectAccount,
  connectedAccounts,
  navigate,
  mostRecentOverviewPage,
  permissions = undefined,
  selectedAddress,
  removePermittedAccount,
  setSelectedAccount,
}) {
  const t = useI18nContext();
  const internalAccounts = useSelector(getInternalAccounts);

  const connectedAccountsDescription =
    connectedAccounts.length > 0
      ? t('connectedAccountsDescriptionPlural', [connectedAccounts.length])
      : t('connectedAccountsDescriptionSingular');

  const subtitle =
    connectedAccounts.length > 0
      ? connectedAccountsDescription
      : t('connectedAccountsEmptyDescription');

  return (
    <Popover
      title={
        isActiveTabExtension
          ? t('currentExtension')
          : getURLHost(activeTabOrigin)
      }
      headerProps={{
        paddingLeft: 4,
        paddingRight: 4,
      }}
      subtitle={subtitle}
      onClose={() => navigate(mostRecentOverviewPage)}
      footerClassName="connected-accounts__footer"
      ConnectedAccountsPermissions={{}}
      footer={
        connectedAccounts.length > 0 && (
          <ConnectedAccountsPermissions permissions={permissions} />
        )
      }
    >
      <Box>
        {connectedAccounts.length > 0 ? (
          <Box marginLeft={4}>
            <Text
              variant={TextVariant.bodyMdMedium}
              color={TextColor.textAlternative}
            >
              {t('accountsConnected')}&nbsp;({connectedAccounts.length})
            </Text>
          </Box>
        ) : null}

        <ConnectedAccountsList
          accountToConnect={accountToConnect}
          connectAccount={connectAccount}
          connectedAccounts={connectedAccounts}
          selectedAddress={selectedAddress}
          removePermittedAccount={removePermittedAccount}
          setSelectedAddress={(address) => {
            const { id: accountId } = internalAccounts.find(
              (internalAccount) => internalAccount.address === address,
            );
            setSelectedAccount(accountId);
          }}
          shouldRenderListOptions
        />
      </Box>
    </Popover>
  );
}

ConnectedAccounts.propTypes = {
  accountToConnect: PropTypes.object,
  activeTabOrigin: PropTypes.string.isRequired,
  connectAccount: PropTypes.func.isRequired,
  connectedAccounts: PropTypes.array.isRequired,
  mostRecentOverviewPage: PropTypes.string.isRequired,
  permissions: PropTypes.array,
  isActiveTabExtension: PropTypes.bool.isRequired,
  selectedAddress: PropTypes.string.isRequired,
  removePermittedAccount: PropTypes.func.isRequired,
  setSelectedAccount: PropTypes.func.isRequired,
  navigate: PropTypes.func.isRequired,
};
