import React, { useCallback, useContext, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  IconName,
  ButtonIcon,
  ModalBody,
  ModalContent,
  ModalHeader,
} from '../../component-library';
import { CreateEthAccount } from '../create-eth-account';
import { getHdKeyringOfSelectedAccountOrPrimaryKeyring } from '../../../selectors';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { SrpList } from '../multi-srp/srp-list';

const EVM_WALLET_TYPE = 'evm' as const;

type EditAccountAddAccountFormProps = {
  accountType: typeof EVM_WALLET_TYPE;
  onActionComplete: (completed: boolean) => Promise<void>;
  onBack: () => void;
  onClose: () => void;
};

export const EditAccountAddAccountForm: React.FC<
  EditAccountAddAccountFormProps
> = ({ accountType, onActionComplete, onBack, onClose }) => {
  const t = useI18nContext();
  const [showSrpSelection, setShowSrpSelection] = useState(false);

  // Here we are getting the keyring of the last selected account
  // if it is not an hd keyring, we will use the primary keyring
  const hdKeyring = useSelector(getHdKeyringOfSelectedAccountOrPrimaryKeyring);
  const [selectedKeyringId, setSelectedKeyringId] = useState<string>(
    hdKeyring.metadata.id,
  );

  const onSelectSrp = useCallback(() => {
    setShowSrpSelection((previous) => !previous);
  }, []);

  return (
    <ModalContent>
      <ModalHeader
        startAccessory={
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            onClick={onBack}
            ariaLabel={t('back')}
          />
        }
        endAccessory={
          <ButtonIcon
            iconName={IconName.Close}
            onClick={onClose}
            ariaLabel={t('close')}
          />
        }
      >
        {t('addAccount')}
      </ModalHeader>
      <ModalBody>
        <Box paddingLeft={4} paddingRight={4} paddingBottom={4}>
          {showSrpSelection && (
            <SrpList
              onActionComplete={(keyringId: string) => {
                setSelectedKeyringId(keyringId);
                setShowSrpSelection(false);
              }}
            />
          )}
          {!showSrpSelection && (
            <CreateEthAccount
              onActionComplete={onActionComplete}
              selectedKeyringId={selectedKeyringId}
              onSelectSrp={onSelectSrp}
              redirectToOverview={false}
            />
          )}
        </Box>
      </ModalBody>
    </ModalContent>
  );
};
