import React, { ReactNode, useCallback } from 'react';
import type { TransactionMeta } from '@metamask/transaction-controller';
import { Box, Text } from '../../../../../components/component-library';
import {
  Display,
  FlexDirection,
  AlignItems,
  JustifyContent,
  TextAlign,
  TextColor,
  TextVariant,
} from '../../../../../helpers/constants/design-system';
import {
  CustomAmount,
  CustomAmountSkeleton,
} from '../../transactions/custom-amount/custom-amount';
import {
  PercentageButtons,
  PercentageButtonsSkeleton,
} from '../../percentage-buttons';
import { useTransactionCustomAmount } from '../../../hooks/transactions/useTransactionCustomAmount';
import { useTransactionCustomAmountAlerts } from '../../../hooks/transactions/useTransactionCustomAmountAlerts';
import { useConfirmContext } from '../../../context/confirm';

/* eslint-disable @typescript-eslint/naming-convention */

export type CustomAmountInfoProps = {
  children?: ReactNode;
  currency?: string;
  hasMax?: boolean;
  overrideBottomContent?: ReactNode;
  overrideCenterContent?: (amountHuman: string) => ReactNode;
};

export const CustomAmountInfo: React.FC<CustomAmountInfoProps> = React.memo(
  ({
    children,
    currency,
    hasMax,
    overrideBottomContent,
    overrideCenterContent,
  }) => {
    const { currentConfirmation } = useConfirmContext<TransactionMeta>();

    const { disableUpdate } = useTransactionCustomAmountAlerts();

    const {
      amountFiat,
      amountHuman,
      updatePendingAmount,
      updatePendingAmountPercentage,
    } = useTransactionCustomAmount({ currency, disableUpdate });

    const handleAmountChange = useCallback(
      (value: string) => {
        updatePendingAmount(value);
      },
      [updatePendingAmount],
    );

    const handlePercentageClick = useCallback(
      (percentage: number) => {
        updatePendingAmountPercentage(percentage);
      },
      [updatePendingAmountPercentage],
    );

    if (!currentConfirmation) {
      return <CustomAmountInfoSkeleton />;
    }

    return (
      <Box
        display={Display.Flex}
        flexDirection={FlexDirection.Column}
        style={{ flex: 1 }}
        data-testid="custom-amount-info"
      >
        <CenterContainer
          amountFiat={amountFiat}
          amountHuman={amountHuman}
          currency={currency}
          hasMax={hasMax}
          onAmountChange={handleAmountChange}
          onPercentageClick={handlePercentageClick}
          overrideCenterContent={overrideCenterContent}
        >
          {children}
        </CenterContainer>
        {overrideBottomContent ?? <BottomContainer />}
      </Box>
    );
  },
);

export function CustomAmountInfoSkeleton() {
  return (
    <Box
      display={Display.Flex}
      flexDirection={FlexDirection.Column}
      style={{ flex: 1 }}
      data-testid="custom-amount-info-skeleton"
    >
      <CenterContainerSkeleton />
    </Box>
  );
}

type CenterContainerProps = {
  amountFiat: string;
  amountHuman: string;
  children?: ReactNode;
  currency?: string;
  hasMax?: boolean;
  onAmountChange: (value: string) => void;
  onPercentageClick: (percentage: number) => void;
  overrideCenterContent?: (amountHuman: string) => ReactNode;
};

function CenterContainer({
  amountFiat,
  amountHuman,
  children,
  currency,
  hasMax,
  onAmountChange,
  onPercentageClick,
  overrideCenterContent,
}: CenterContainerProps) {
  return (
    <Box
      display={Display.Flex}
      flexDirection={FlexDirection.Column}
      alignItems={AlignItems.center}
      justifyContent={JustifyContent.center}
      gap={4}
      style={{ flex: 1 }}
    >
      <CustomAmount
        amountFiat={amountFiat}
        currency={currency}
        onChange={onAmountChange}
      />

      {overrideCenterContent ? (
        overrideCenterContent(amountHuman)
      ) : (
        <Box
          display={Display.Flex}
          flexDirection={FlexDirection.Column}
          alignItems={AlignItems.center}
          gap={3}
        >
          {children}
        </Box>
      )}

      {hasMax && <PercentageButtons onPercentageClick={onPercentageClick} />}

      <AlertMessage />
    </Box>
  );
}

function CenterContainerSkeleton() {
  return (
    <Box
      display={Display.Flex}
      flexDirection={FlexDirection.Column}
      alignItems={AlignItems.center}
      justifyContent={JustifyContent.center}
      gap={4}
      style={{ flex: 1 }}
    >
      <CustomAmountSkeleton />
      <Box
        display={Display.Flex}
        flexDirection={FlexDirection.Column}
        alignItems={AlignItems.center}
        gap={2}
      ></Box>
      <PercentageButtonsSkeleton />
    </Box>
  );
}

function BottomContainer() {
  const { hideResults } = useTransactionCustomAmountAlerts();

  if (hideResults) {
    return null;
  }

  return null;
}

function AlertMessage() {
  const { alertMessage } = useTransactionCustomAmountAlerts();

  if (!alertMessage) {
    return null;
  }

  return (
    <Text
      variant={TextVariant.bodySm}
      color={TextColor.errorDefault}
      textAlign={TextAlign.Center}
    >
      {alertMessage}
    </Text>
  );
}
