import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box,
  ButtonLink,
  ButtonLinkSize,
  ButtonSecondary,
  ButtonSecondarySize,
  IconName,
  IconSize,
  Modal,
  ModalOverlay,
  Text,
} from '../../component-library';
import { ModalContent } from '../../component-library/modal-content/deprecated';
import { ModalHeader } from '../../component-library/modal-header';

import {
  AlignItems,
  Display,
  FlexDirection,
  TextColor,
  TextVariant,
} from '../../../helpers/constants/design-system';
import { useI18nContext } from '../../../hooks/useI18nContext';
import {
  getHdKeyringOfSelectedAccountOrPrimaryKeyring,
  getHDEntropyIndex,
} from '../../../selectors';
import {
  CONNECT_HARDWARE_ROUTE,
  IMPORT_SRP_ROUTE,
} from '../../../helpers/constants/routes';
// TODO: Remove restricted import
// eslint-disable-next-line import-x/no-restricted-paths
import { getEnvironmentType } from '../../../../app/scripts/lib/util';
import { ENVIRONMENT_TYPE_POPUP } from '../../../../shared/constants/app';
import { endTrace, TraceName } from '../../../../shared/lib/trace';
import { CreateEthAccount } from '../create-eth-account';
import { ImportAccount } from '../import-account';
import { SrpList } from '../multi-srp/srp-list';

// TODO: Should we use an enum for this instead?
export const ACTION_MODES = {
  // Displays the search box and account list
  LIST: '',
  // Displays the Add, Import, Hardware accounts
  MENU: 'menu',
  // Displays the add account form controls
  ADD: 'add',
  // Displays the import account form controls
  IMPORT: 'import',
  CREATE_SRP: 'create-srp',
  IMPORT_SRP: 'import-srp',
  SELECT_SRP: 'select-srp',
} as const;

export type ActionMode = (typeof ACTION_MODES)[keyof typeof ACTION_MODES];

/**
 * Gets the title for a given action mode.
 *
 * @param t - Function to translate text.
 * @param actionMode - An action mode.
 * @returns The title for this action mode.
 */
export const getActionTitle = (
  t: (text: string, args?: string[]) => string,
  actionMode: ActionMode,
) => {
  switch (actionMode) {
    case ACTION_MODES.ADD:
      return t('addAccountFromNetwork', [t('networkNameEthereum')]);
    case ACTION_MODES.MENU:
      return t('addAccount');
    case ACTION_MODES.IMPORT:
      return t('importPrivateKey');
    case ACTION_MODES.CREATE_SRP:
      return t('createSecretRecoveryPhrase');
    case ACTION_MODES.IMPORT_SRP:
      return t('importSecretRecoveryPhrase');
    case ACTION_MODES.SELECT_SRP:
      return t('selectSecretRecoveryPhrase');
    default:
      return t('accounts');
  }
};

type AccountMenuProps = {
  onClose: () => void;
  showAccountCreation?: boolean;
  children?: React.ReactNode;
};

export const AccountMenu = ({
  onClose,
  showAccountCreation = true,
  children,
}: AccountMenuProps) => {
  const t = useI18nContext();
  const hdEntropyIndex = useSelector(getHDEntropyIndex);
  useEffect(() => {
    endTrace({ name: TraceName.AccountList });
  }, []);
  const navigate = useNavigate();

  // sync SRPs list when menu opens
  const [actionMode, setActionMode] = useState<ActionMode>(ACTION_MODES.LIST);
  const [previousActionMode, setPreviousActionMode] = useState<ActionMode>(
    ACTION_MODES.LIST,
  );

  // Here we are getting the keyring of the last selected account
  // if it is not an hd keyring, we will use the primary keyring
  const hdKeyring = useSelector(getHdKeyringOfSelectedAccountOrPrimaryKeyring);
  const [selectedKeyringId, setSelectedKeyringId] = useState(
    hdKeyring.metadata.id,
  );

  const title = getActionTitle(t as (text: string) => string, actionMode);

  // eslint-disable-next-line no-empty-function
  let onBack;
  if (actionMode !== ACTION_MODES.LIST) {
    if (actionMode === ACTION_MODES.MENU) {
      onBack = () => setActionMode(ACTION_MODES.LIST);
    } else if (actionMode === ACTION_MODES.SELECT_SRP) {
      onBack = () => setActionMode(previousActionMode);
    } else {
      onBack = () => setActionMode(ACTION_MODES.MENU);
    }
  }

  const onActionComplete = useCallback(
    async (confirmed: boolean) => {
      if (confirmed) {
        onClose();
      } else {
        setActionMode(ACTION_MODES.LIST);
      }
    },
    [onClose, setActionMode],
  );

  const onSelectSrp = useCallback(() => {
    setPreviousActionMode(actionMode);
    setActionMode(ACTION_MODES.SELECT_SRP);
  }, [setActionMode, actionMode]);
  return (
    <Modal isOpen onClose={onClose}>
      <ModalOverlay />
      <ModalContent
        className="multichain-account-menu-popover"
        modalDialogProps={{
          className: 'multichain-account-menu-popover__dialog',
          padding: 0,
          display: Display.Flex,
          flexDirection: FlexDirection.Column,
        }}
      >
        <ModalHeader padding={4} onClose={onClose} onBack={onBack}>
          {title}
        </ModalHeader>
        {actionMode === ACTION_MODES.ADD ? (
          <Box paddingLeft={4} paddingRight={4} paddingBottom={4}>
            <CreateEthAccount
              onActionComplete={onActionComplete}
              selectedKeyringId={selectedKeyringId}
              onSelectSrp={onSelectSrp}
            />
          </Box>
        ) : null}
        {actionMode === ACTION_MODES.IMPORT ? (
          <Box
            paddingLeft={4}
            paddingRight={4}
            paddingBottom={4}
            paddingTop={0}
          >
            <ImportAccount onActionComplete={onActionComplete} />
          </Box>
        ) : null}
        {actionMode === ACTION_MODES.SELECT_SRP && (
          <SrpList
            onActionComplete={(keyringId: string) => {
              setSelectedKeyringId(keyringId);
              setActionMode(previousActionMode);
            }}
          />
        )}

        {/* Add / Import / Hardware Menu */}
        {actionMode === ACTION_MODES.MENU ? (
          <Box padding={4}>
            <Text
              variant={TextVariant.bodySmMedium}
              marginBottom={2}
              color={TextColor.textAlternative}
            >
              {t('createNewAccountHeader')}
            </Text>
            <Box>
              <ButtonLink
                size={ButtonLinkSize.Sm}
                startIconName={IconName.Add}
                startIconProps={{ size: IconSize.Md }}
                onClick={() => {
                  setActionMode(ACTION_MODES.ADD);
                }}
                data-testid="multichain-account-menu-popover-add-account"
              >
                {t('addNewEthereumAccountLabel')}
              </ButtonLink>
            </Box>
            <Text
              variant={TextVariant.bodySmMedium}
              marginTop={4}
              marginBottom={2}
              color={TextColor.textAlternative}
            >
              {t('importWalletOrAccountHeader')}
            </Text>
            {
              <Box marginTop={4}>
                <ButtonLink
                  size={ButtonLinkSize.Sm}
                  startIconName={IconName.Wallet}
                  startIconProps={{ size: IconSize.Md }}
                  onClick={() => {
                    navigate(IMPORT_SRP_ROUTE);
                    onClose();
                  }}
                  data-testid="multichain-account-menu-popover-import-srp"
                >
                  {t('secretRecoveryPhrase')}
                </ButtonLink>
              </Box>
            }

            <Box marginTop={4}>
              <ButtonLink
                size={ButtonLinkSize.Sm}
                startIconName={IconName.Key}
                startIconProps={{ size: IconSize.Md }}
                data-testid="multichain-account-menu-popover-add-imported-account"
                onClick={() => {
                  setActionMode(ACTION_MODES.IMPORT);
                }}
              >
                {t('importPrivateKey')}
              </ButtonLink>
            </Box>
            <Text
              variant={TextVariant.bodySmMedium}
              marginTop={4}
              marginBottom={2}
              color={TextColor.textAlternative}
            >
              {t('connectAnAccountHeader')}
            </Text>
            <Box marginTop={4}>
              <ButtonLink
                size={ButtonLinkSize.Sm}
                startIconName={IconName.Hardware}
                startIconProps={{ size: IconSize.Md }}
                onClick={() => {
                  onClose();
                  if (getEnvironmentType() === ENVIRONMENT_TYPE_POPUP) {
                    global.platform.openExtensionInBrowser?.(
                      CONNECT_HARDWARE_ROUTE,
                    );
                  } else {
                    navigate(CONNECT_HARDWARE_ROUTE);
                  }
                }}
              >
                {t('addHardwareWalletLabel')}
              </ButtonLink>
            </Box>
          </Box>
        ) : null}
        {actionMode === ACTION_MODES.LIST ? (
          <>
            {/* Menu content */}
            {children}
            {/* Add / Import / Hardware button */}
            {showAccountCreation ? (
              <Box
                paddingTop={2}
                paddingBottom={4}
                paddingLeft={4}
                paddingRight={4}
                alignItems={AlignItems.center}
                display={Display.Flex}
              >
                <ButtonSecondary
                  size={ButtonSecondarySize.Lg}
                  block
                  onClick={() => setActionMode(ACTION_MODES.MENU)}
                  data-testid="multichain-account-menu-popover-action-button"
                >
                  {t('addAccountOrWallet')}
                </ButtonSecondary>
              </Box>
            ) : null}
          </>
        ) : null}
      </ModalContent>
    </Modal>
  );
};
