import React, { useCallback } from 'react';
import {
  Box,
  Button,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  BoxBackgroundColor,
  ButtonVariant,
  ButtonSize,
  twMerge,
} from '@metamask/design-system-react';
import { useI18nContext } from '../../../hooks/useI18nContext';

export type BalanceEmptyStateProps = {
  /**
   * Test ID for component testing
   */
  testID?: string;
  /**
   * Additional className to apply to the component
   */
  className?: string;
  /**
   * Callback function to handle receive crypto action
   */
  onClickReceive?: () => void;
};

export const BalanceEmptyState: React.FC<BalanceEmptyStateProps> = ({
  onClickReceive,
  ...props
}) => {
  const t = useI18nContext();
  const handleReceive = useCallback(() => {
    onClickReceive?.();
  }, [onClickReceive]);

  return (
    <Box
      flexDirection={BoxFlexDirection.Column}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      padding={6}
      backgroundColor={BoxBackgroundColor.BackgroundSection}
      gap={5}
      {...props}
      className={twMerge('rounded-lg', props.className)}
    >
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onClick={handleReceive}
      >
        {t('receive')}
      </Button>
    </Box>
  );
};
