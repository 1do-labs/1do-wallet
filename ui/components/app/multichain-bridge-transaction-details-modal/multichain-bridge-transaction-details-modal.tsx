import React, { useContext } from 'react';
import type { Transaction } from '@metamask/keyring-api';
import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import {
  formatChainIdToCaip,
  formatChainIdToHex,
} from '@metamask/bridge-controller';
import {
  Display,
  FlexDirection,
  AlignItems,
  JustifyContent,
  TextVariant,
  IconColor,
  FontWeight,
  TextColor,
  TextAlign,
  BorderColor,
} from '../../../helpers/constants/design-system';
import { useI18nContext } from '../../../hooks/useI18nContext';
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  Modal,
  Box,
  Text,
  ModalFooter,
  Button,
  IconName,
  ButtonVariant,
  Icon,
  IconSize,
  ButtonSize,
  ButtonLink,
  ButtonLinkSize,
  AvatarNetwork,
  AvatarNetworkSize,
} from '../../component-library';
import {
  MetaMetricsEventCategory,
  MetaMetricsEventName,
  MetaMetricsEventLinkType,
} from '../../../../shared/constants/metametrics';
import { MetaMetricsContext } from '../../../contexts/metametrics';
import { ConfirmInfoRowDivider as Divider } from '../confirm/info/row';
import { getURLHostName } from '../../../helpers/utils/util';
import {
  formatTimestamp,
  getTransactionUrl,
  shortenTransactionId,
} from '../multichain-transaction-details-modal/helpers';
import { CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP } from '../../../../shared/constants/network';
import { CHAINID_DEFAULT_BLOCK_EXPLORER_URL_MAP } from '../../../../shared/constants/common';
import { NETWORK_TO_SHORT_NETWORK_NAME_MAP } from '../../../../shared/constants/bridge';
import {
  isBridgeComplete,
  isBridgeFailed,
} from '../../../../shared/lib/bridge-status/utils';
import useBridgeChainInfo from '../../../hooks/bridge/useBridgeChainInfo';

type MultichainBridgeTransactionDetailsModalProps = {
  transaction: Transaction;
  bridgeHistoryItem: BridgeHistoryItem;
  onClose: () => void;
};

const MultichainBridgeTransactionDetailsModal = ({
  transaction,
  bridgeHistoryItem,
  onClose,
}: MultichainBridgeTransactionDetailsModalProps) => {
  const t = useI18nContext();
  const { trackEvent } = useContext(MetaMetricsContext);

  const { quote, status } = bridgeHistoryItem;

  // --- Extract data directly from transaction ---
  const { id, timestamp, from } = transaction;
  const assetData = from?.[0]?.asset;
  const baseFeeAsset = transaction.fees?.find(
    (fee) => fee.type === 'base',
  )?.asset;
  // --- End direct extraction ---

  // Determine display status text and color based on finalDisplayStatusKey
  let displayStatus = t('bridgeStatusInProgress');
  let statusColor = TextColor.primaryDefault;

  if (isBridgeComplete(bridgeHistoryItem)) {
    displayStatus = t('bridgeStatusComplete');
    statusColor = TextColor.successDefault;
  } else if (isBridgeFailed(transaction, bridgeHistoryItem)) {
    displayStatus = t('bridgeStatusFailed');
    statusColor = TextColor.errorDefault;
  }

  const getChainExplorerUrl = (txHash: string, chainId?: string): string => {
    if (!txHash || !chainId) {
      return '';
    }

    try {
      const formattedChainId = chainId.startsWith('0x')
        ? chainId
        : formatChainIdToHex(formatChainIdToCaip(chainId));
      const explorerBaseUrl =
        CHAINID_DEFAULT_BLOCK_EXPLORER_URL_MAP[formattedChainId];
      return explorerBaseUrl
        ? `${explorerBaseUrl}tx/${txHash}`
        : `https://etherscan.io/tx/${txHash}`;
    } catch (error) {
      console.error('Error generating block explorer URL:', error);
      return '';
    }
  };

  const formatDestTokenAmount = (
    amount: string | undefined,
    decimals: number | undefined = 18,
  ): string => {
    if (!amount) {
      return '0';
    }
    try {
      const amountBN = BigInt(amount);
      const divisor = BigInt(10) ** BigInt(decimals);
      const integerPart = amountBN / divisor;
      const remainder = amountBN % divisor;
      const remainderStr = remainder.toString().padStart(decimals, '0');
      const decimalPlaces = 4;
      const formattedDecimal = remainderStr
        .substring(0, decimalPlaces)
        .replace(/0+$/u, '');
      return formattedDecimal.length > 0
        ? `${integerPart}.${formattedDecimal}`
        : `${integerPart}`;
    } catch (e) {
      console.error('Error formatting destination token amount:', e);
      return amount.toString();
    }
  };

  const { srcNetwork, destNetwork } = useBridgeChainInfo({
    nonEvmTransaction: transaction,
  });

  const sourceNetworkNickname = srcNetwork?.name;
  const sourceNetworkImage =
    srcNetwork?.isEvm && srcNetwork.chainId
      ? CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP[
          formatChainIdToHex(srcNetwork.chainId)
        ]
      : undefined;

  return (
    <Modal
      onClose={onClose}
      data-testid="multichain-bridge-transaction-details-modal"
      isOpen
      isClosedOnOutsideClick
      isClosedOnEscapeKey
    >
      <ModalOverlay />
      <ModalContent
        className="multichain-bridge-transaction-details-modal"
        modalDialogProps={{
          display: Display.Flex,
          flexDirection: FlexDirection.Column,
          padding: 4,
        }}
      >
        <ModalHeader onClose={onClose} padding={0}>
          <Text variant={TextVariant.headingMd} textAlign={TextAlign.Center}>
            {t('bridgeDetailsTitle')}
          </Text>
          <Text
            variant={TextVariant.bodyMd}
            color={TextColor.textAlternative}
            textAlign={TextAlign.Center}
          >
            {formatTimestamp(timestamp)}
          </Text>
        </ModalHeader>
        <Box paddingBottom={4}>
          <Divider />
        </Box>
        {/* Scrollable Content Section */}
        <Box
          className="multichain-bridge-transaction-details-modal__content"
          style={{ overflow: 'auto', flex: '1' }}
        >
          {/* Status Section */}
          <Box>
            <Box
              display={Display.Flex}
              flexDirection={FlexDirection.Column}
              gap={4}
            >
              <Box
                display={Display.Flex}
                justifyContent={JustifyContent.spaceBetween}
              >
                <Text
                  variant={TextVariant.bodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {t('status')}
                </Text>
                <Text variant={TextVariant.bodyMd} color={statusColor}>
                  {displayStatus}
                </Text>
              </Box>

              {/* Transaction ID */}
              <Box
                display={Display.Flex}
                justifyContent={JustifyContent.spaceBetween}
              >
                <Text
                  variant={TextVariant.bodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {t('transactionIdLabel')}
                </Text>
                <Box
                  display={Display.Flex}
                  alignItems={AlignItems.center}
                  gap={1}
                >
                  <ButtonLink
                    size={ButtonLinkSize.Inherit}
                    textProps={{
                      variant: TextVariant.bodyMd,
                      alignItems: AlignItems.flexStart,
                    }}
                    as="a"
                    externalLink
                    href={getTransactionUrl(
                      id,
                      srcNetwork?.chainId ?? transaction.chain,
                    )}
                  >
                    {shortenTransactionId(id)}
                    <Icon
                      marginLeft={2}
                      name={IconName.Export}
                      size={IconSize.Sm}
                      color={IconColor.primaryDefault}
                    />
                  </ButtonLink>
                </Box>
              </Box>

              {/* If destination transaction exists, show it */}
              {status.destChain?.txHash && (
                <Box
                  display={Display.Flex}
                  justifyContent={JustifyContent.spaceBetween}
                >
                  <Text
                    variant={TextVariant.bodyMd}
                    fontWeight={FontWeight.Medium}
                  >
                    {t('destinationTransactionIdLabel')}
                  </Text>
                  <Box
                    display={Display.Flex}
                    alignItems={AlignItems.center}
                    gap={1}
                  >
                    <ButtonLink
                      size={ButtonLinkSize.Inherit}
                      textProps={{
                        variant: TextVariant.bodyMd,
                        alignItems: AlignItems.flexStart,
                      }}
                      as="a"
                      externalLink
                      href={getChainExplorerUrl(
                        status.destChain.txHash,
                        status.destChain.chainId?.toString() ?? '',
                      )}
                    >
                      {shortenTransactionId(status.destChain.txHash)}
                      <Icon
                        marginLeft={2}
                        name={IconName.Export}
                        size={IconSize.Sm}
                        color={IconColor.primaryDefault}
                      />
                    </ButtonLink>
                  </Box>
                </Box>
              )}
            </Box>

            <Box paddingTop={4} paddingBottom={4}>
              <Divider />
            </Box>

            {/* Bridging Section */}
            <Box marginBottom={4}>
              <Text
                variant={TextVariant.bodyMd}
                fontWeight={FontWeight.Medium}
                marginBottom={2}
              >
                {t('bridging')}
              </Text>

              {/* From section with source chain details */}
              <Box
                display={Display.Flex}
                justifyContent={JustifyContent.spaceBetween}
                alignItems={AlignItems.center}
                marginBottom={2}
              >
                <Text
                  variant={TextVariant.bodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {t('from')}
                </Text>
                <Box
                  display={Display.Flex}
                  gap={2}
                  alignItems={AlignItems.center}
                >
                  <AvatarNetwork
                    size={AvatarNetworkSize.Sm}
                    className="multichain-bridge-transaction-details-modal__network-badge"
                    name={sourceNetworkNickname ?? ''}
                    src={sourceNetworkImage ?? ''}
                    borderColor={BorderColor.backgroundDefault}
                  />
                  <Text variant={TextVariant.bodyMd}>
                    {sourceNetworkNickname}
                  </Text>
                </Box>
              </Box>

              {/* To section with destination chain details */}
              <Box
                display={Display.Flex}
                justifyContent={JustifyContent.spaceBetween}
                alignItems={AlignItems.center}
              >
                <Text
                  variant={TextVariant.bodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {t('to')}
                </Text>
                <Box
                  display={Display.Flex}
                  gap={2}
                  alignItems={AlignItems.center}
                >
                  <AvatarNetwork
                    size={AvatarNetworkSize.Sm}
                    className="multichain-bridge-transaction-details-modal__network-badge"
                    name={
                      destNetwork?.chainId
                        ? (NETWORK_TO_SHORT_NETWORK_NAME_MAP[
                            destNetwork?.chainId
                          ] ?? '')
                        : ''
                    }
                    src={
                      destNetwork?.isEvm && destNetwork.chainId
                        ? CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP[
                            formatChainIdToHex(destNetwork.chainId)
                          ] || ''
                        : ''
                    }
                    borderColor={BorderColor.backgroundDefault}
                  />
                  <Text variant={TextVariant.bodyMd}>
                    {destNetwork?.chainId
                      ? NETWORK_TO_SHORT_NETWORK_NAME_MAP[destNetwork.chainId]
                      : ''}
                  </Text>
                </Box>
              </Box>
            </Box>

            <Box
              display={Display.Flex}
              flexDirection={FlexDirection.Column}
              gap={4}
            >
              {/* Source Amount */}
              <Box
                display={Display.Flex}
                justifyContent={JustifyContent.spaceBetween}
              >
                <Text
                  variant={TextVariant.bodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {t('youSent')}
                </Text>
                <Box
                  display={Display.Flex}
                  flexDirection={FlexDirection.Column}
                  alignItems={AlignItems.flexEnd}
                >
                  <Text
                    variant={TextVariant.bodyMd}
                    data-testid="transaction-source-amount"
                  >
                    {(() => {
                      if (assetData?.fungible) {
                        const displayAmount = assetData.amount?.startsWith('-')
                          ? assetData.amount.substring(1)
                          : assetData.amount;
                        return `${displayAmount} ${assetData.unit}`;
                      }

                      // Fallback to quote data when transaction.from is empty (e.g., BTC transactions)
                      if (quote?.srcTokenAmount && quote?.srcAsset?.symbol) {
                        const formattedAmount = formatDestTokenAmount(
                          quote.srcTokenAmount,
                          quote.srcAsset.decimals,
                        );
                        return `${formattedAmount} ${quote.srcAsset.symbol}`;
                      }

                      return '';
                    })()}
                  </Text>
                </Box>
              </Box>

              {/* Destination Amount - Show only when truly complete */}
              {isBridgeComplete(bridgeHistoryItem) &&
                (status.destChain?.amount ?? quote.destTokenAmount) &&
                quote.destAsset.symbol && (
                  <Box
                    display={Display.Flex}
                    justifyContent={JustifyContent.spaceBetween}
                  >
                    <Text
                      variant={TextVariant.bodyMd}
                      fontWeight={FontWeight.Medium}
                    >
                      {t('youReceived')}
                    </Text>
                    <Box
                      display={Display.Flex}
                      flexDirection={FlexDirection.Column}
                      alignItems={AlignItems.flexEnd}
                    >
                      <Text
                        variant={TextVariant.bodyMd}
                        data-testid="transaction-dest-amount"
                      >
                        {formatDestTokenAmount(
                          status.destChain?.amount ?? quote.destTokenAmount,
                          quote.destAsset.decimals,
                        )}{' '}
                        {quote.destAsset.symbol}
                      </Text>
                    </Box>
                  </Box>
                )}

              {/* Gas Fee */}
              {baseFeeAsset && baseFeeAsset.fungible && (
                <Box
                  display={Display.Flex}
                  justifyContent={JustifyContent.spaceBetween}
                >
                  <Text
                    variant={TextVariant.bodyMd}
                    fontWeight={FontWeight.Medium}
                  >
                    {t('transactionTotalGasFee')}
                  </Text>
                  <Box
                    display={Display.Flex}
                    flexDirection={FlexDirection.Column}
                    alignItems={AlignItems.flexEnd}
                  >
                    <Text
                      variant={TextVariant.bodyMd}
                      data-testid="transaction-gas-fee"
                    >
                      {baseFeeAsset.amount} {baseFeeAsset.unit}
                    </Text>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>

          <Box paddingTop={4}>
            <Divider />
          </Box>
        </Box>
        {/* Close scrollable content */}
        <ModalFooter>
          <Button
            block
            size={ButtonSize.Md}
            variant={ButtonVariant.Link}
            onClick={() => {
              global.platform.openTab({
                url: getChainExplorerUrl(id, srcNetwork?.chainId),
              });

              trackEvent({
                event: MetaMetricsEventName.ExternalLinkClicked,
                category: MetaMetricsEventCategory.Navigation,
                properties: {
                  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  link_type: MetaMetricsEventLinkType.AccountTracker,
                  location: 'Transaction Details',
                  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  url_domain: getURLHostName(
                    getChainExplorerUrl(id, srcNetwork?.chainId),
                  ),
                },
              });
            }}
            endIconName={IconName.Export}
          >
            {t('viewOnBlockExplorer')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default MultichainBridgeTransactionDetailsModal;
