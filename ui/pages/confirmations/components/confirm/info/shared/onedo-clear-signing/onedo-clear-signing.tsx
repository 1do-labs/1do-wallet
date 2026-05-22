import React from 'react';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';

import { TokenStandard } from '../../../../../../../../shared/constants/transaction';
import { calcTokenAmount } from '../../../../../../../../shared/lib/transactions-controller-utils';
import {
  ConfirmInfoRow,
  ConfirmInfoRowAddress,
  ConfirmInfoRowDivider,
  ConfirmInfoRowText,
  ConfirmInfoRowVariant,
} from '../../../../../../../components/app/confirm/info/row';
import { ConfirmInfoExpandableRow } from '../../../../../../../components/app/confirm/info/row/expandable-row';
import { ConfirmInfoSection } from '../../../../../../../components/app/confirm/info/row/section';
import { useAsyncResult } from '../../../../../../../hooks/useAsync';
import {
  selectDefaultRpcEndpointByChainId,
  selectNetworkConfigurationByChainId,
} from '../../../../../../../selectors';
import { getCode } from '../../../../../../../store/actions';
import { isOneDo7702DelegationCode } from '../../../../../../../../shared/lib/eip7702-utils';
import { useGetTokenStandardAndDetails } from '../../../../../hooks/useGetTokenStandardAndDetails';
import { formatAmount } from '../../../../simulation-details/formatAmount';
import { useConfirmContext } from '../../../../../context/confirm';
import {
  getOneDoTransactionClearSigning,
  isOneDoWalletNativeTransferTransactionCandidate,
  type OneDoClearSigningInfo,
  type OneDoClearSigningRow,
} from '../../../../../utils/onedo-clear-signing';
import { getBuiltInRegistryErc7730TransactionClearSigning } from '../../../../../utils/erc7730-registry';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const SEPOLIA_1DO_TOKEN_DETAILS: Record<
  string,
  { decimals: number; symbol: string }
> = {
  '0x9d4b951592c31dc042efdc4e1f8ae00718b96fe1': {
    decimals: 6,
    symbol: 'tUSDC',
  },
  '0xdd7468f993c52fcf43cef80c9a4e042de4920f2d': {
    decimals: 6,
    symbol: 'tUSDT',
  },
  '0x74bf0ac1f1774f3e33042fea0a73fa9814f4ea7': {
    decimals: 18,
    symbol: '1DO',
  },
  '0x7b79995e5f793a07bc00c21412e50ecae098e7f9': {
    decimals: 18,
    symbol: 'WETH',
  },
};

const getFallbackTokenDetails = (tokenAddress?: string) =>
  tokenAddress
    ? SEPOLIA_1DO_TOKEN_DETAILS[tokenAddress.toLowerCase()]
    : undefined;

const isZeroAddress = (tokenAddress?: string) =>
  tokenAddress?.toLowerCase() === ZERO_ADDRESS;

const OneDoClearSigningRowValue = ({
  chainId,
  item,
}: {
  chainId?: string;
  item: OneDoClearSigningRow;
}) => {
  const tokenDetails = useGetTokenStandardAndDetails(
    item.valueType === 'tokenAmount' ? item.tokenAddress : undefined,
    chainId,
  );
  const networkConfiguration = useSelector((state) =>
    selectNetworkConfigurationByChainId(state, chainId),
  );
  const fallbackTokenDetails = getFallbackTokenDetails(item.tokenAddress);

  if (item.valueType === 'address') {
    return <ConfirmInfoRowAddress address={item.value} chainId={chainId} />;
  }

  if (item.valueType === 'nativeAmount' && item.rawValue) {
    const nativeAmount = calcTokenAmount(item.rawValue, 18);
    const text = `${formatAmount('en-US', nativeAmount)} ${
      networkConfiguration?.nativeCurrency ?? 'ETH'
    }`;

    return <ConfirmInfoRowText text={text} />;
  }

  if (item.valueType === 'tokenAmount' && item.rawValue) {
    if (isZeroAddress(item.tokenAddress)) {
      const nativeAmount = calcTokenAmount(item.rawValue, 18);
      const text = `${formatAmount('en-US', nativeAmount)} ${
        networkConfiguration?.nativeCurrency ?? 'ETH'
      }`;

      return <ConfirmInfoRowText text={text} />;
    }

    const decimals =
      tokenDetails.standard === TokenStandard.ERC20
        ? tokenDetails.decimalsNumber
        : fallbackTokenDetails?.decimals;
    const symbol =
      tokenDetails.standard === TokenStandard.ERC20
        ? tokenDetails.symbol
        : fallbackTokenDetails?.symbol;

    if (decimals === undefined) {
      return <ConfirmInfoRowText text={item.value} />;
    }

    const tokenAmount = calcTokenAmount(item.rawValue, decimals);
    const text = `${formatAmount('en-US', tokenAmount)}${
      symbol ? ` ${symbol}` : ''
    }`;

    return <ConfirmInfoRowText text={text} />;
  }

  return <ConfirmInfoRowText text={item.value} />;
};

export const OneDoClearSigningSection = ({
  chainId,
  hideAdvancedDetails,
  info,
}: {
  chainId?: string;
  hideAdvancedDetails?: boolean;
  info?: OneDoClearSigningInfo;
}) => {
  if (!info) {
    return null;
  }

  const renderRows = (rows: OneDoClearSigningInfo['rows']) =>
    rows.map((item, index) => (
      <ConfirmInfoRow key={`${item.label}-${index}`} label={item.label}>
        <OneDoClearSigningRowValue chainId={chainId} item={item} />
      </ConfirmInfoRow>
    ));

  return (
    <ConfirmInfoSection data-testid="onedo-clear-signing-section">
      <ConfirmInfoRow label="1Do clear signing">
        <ConfirmInfoRowText text={info.title} />
      </ConfirmInfoRow>
      {info.warning && (
        <ConfirmInfoRow label="Notice" variant={ConfirmInfoRowVariant.Warning}>
          <ConfirmInfoRowText text={info.warning} />
        </ConfirmInfoRow>
      )}
      <ConfirmInfoRowDivider />
      {renderRows(info.rows)}
      {!hideAdvancedDetails && info.advancedRows?.length ? (
        <>
          <ConfirmInfoRowDivider />
          <ConfirmInfoExpandableRow
            label="Advanced details"
            content={renderRows(info.advancedRows)}
          />
        </>
      ) : null}
    </ConfirmInfoSection>
  );
};

const OneDoWalletNativeTransferClearSigningSection = ({
  currentConfirmation,
}: {
  currentConfirmation?: TransactionMeta;
}) => {
  const isWalletNativeTransferCandidate =
    isOneDoWalletNativeTransferTransactionCandidate(currentConfirmation);
  const targetAddress = currentConfirmation?.txParams?.to as Hex | undefined;
  const defaultRpcEndpoint = useSelector((state) =>
    selectDefaultRpcEndpointByChainId(state, currentConfirmation?.chainId),
  );
  const networkClientId = defaultRpcEndpoint?.networkClientId;
  const { value: targetCode } = useAsyncResult(async () => {
    if (
      !isWalletNativeTransferCandidate ||
      !targetAddress ||
      !networkClientId
    ) {
      return undefined;
    }

    return getCode(targetAddress, networkClientId);
  }, [isWalletNativeTransferCandidate, targetAddress, networkClientId]);

  const oneDoClearSigningInfo = getOneDoTransactionClearSigning(
    currentConfirmation,
    {
      allowWalletNativeTransferCalldata: isOneDo7702DelegationCode(targetCode),
    },
  );

  return (
    <OneDoClearSigningSection
      chainId={currentConfirmation?.chainId}
      info={oneDoClearSigningInfo}
    />
  );
};

export const OneDoTransactionClearSigningSection = () => {
  const { currentConfirmation } = useConfirmContext<TransactionMeta>();
  const oneDoClearSigningInfo = getOneDoTransactionClearSigning(
    currentConfirmation,
    {
      allowAccountRuntimeCalldata: true,
    },
  );
  const registryClearSigningInfo =
    oneDoClearSigningInfo ??
    getBuiltInRegistryErc7730TransactionClearSigning(currentConfirmation);

  if (registryClearSigningInfo) {
    return (
      <OneDoClearSigningSection
        chainId={currentConfirmation?.chainId}
        info={registryClearSigningInfo}
      />
    );
  }

  if (!isOneDoWalletNativeTransferTransactionCandidate(currentConfirmation)) {
    return null;
  }

  return (
    <OneDoWalletNativeTransferClearSigningSection
      currentConfirmation={currentConfirmation}
    />
  );
};
