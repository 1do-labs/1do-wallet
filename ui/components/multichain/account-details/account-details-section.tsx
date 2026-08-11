import React, { useContext } from 'react';
import { useSelector } from 'react-redux';

import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react';
import QrCodeView from '../../ui/qr-code-view';

import { getInternalAccountByAddress } from '../../../selectors';
import {
  isAbleToExportAccount,
  isAbleToRevealSrp,
} from '../../../helpers/utils/util';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { getHDEntropyIndex } from '../../../selectors/selectors';

export const AccountDetailsSection = ({
  address,
  onExportClick,
}: {
  address: string;
  onExportClick: (str: string) => void;
}) => {
  const t = useI18nContext();
  const hdEntropyIndex = useSelector(getHDEntropyIndex);

  const account = useSelector((state) =>
    getInternalAccountByAddress(state, address),
  );
  const exportPrivateKeyFeatureEnabled = isAbleToExportAccount(
    account?.metadata.keyring?.type,
  );
  const exportSrpFeatureEnabled = isAbleToRevealSrp(account);

  return (
    <>
      <QrCodeView Qr={{ data: address }} />
      {exportPrivateKeyFeatureEnabled ? (
        <Button
          data-testid="account-details-display-export-private-key"
          size={ButtonSize.Lg}
          variant={ButtonVariant.Secondary}
          isFullWidth
          className="mb-1"
          onClick={() => {
            onExportClick('PrivateKey');
          }}
        >
          {t('showPrivateKey')}
        </Button>
      ) : null}
      {exportSrpFeatureEnabled ? (
        <Button
          data-testid="account-details-display-export-srp"
          size={ButtonSize.Lg}
          variant={ButtonVariant.Secondary}
          isFullWidth
          onClick={() => {
            onExportClick('SRP');
          }}
        >
          {t('showSRP')}
        </Button>
      ) : null}
    </>
  );
};
