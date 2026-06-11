import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react';
import classnames from 'clsx';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { reloadExtensionFromUi } from '../../../helpers/utils/reload-extension-from-ui';

type ApiErrorHandlerProps = {
  className?: string;
  error: Error;
  message?: string;
};

const ApiErrorHandler = ({
  className = '',
  error,
  message,
}: ApiErrorHandlerProps) => {
  const t = useI18nContext();

  return (
    <Box
      className={classnames(
        'flex flex-col items-center text-center gap-4 max-w-xs',
        className,
      )}
    >
      <Icon
        className="w-12 h-12"
        name={IconName.Error}
        color={IconColor.IconAlternative}
      />
      <Text variant={TextVariant.BodyMd}>
        {message ?? error?.message ?? t('unknownError')}
      </Text>
      <Button
        className="w-full"
        size={ButtonSize.Lg}
        variant={ButtonVariant.Primary}
        // this reloads the entire extension
        onClick={async () => {
          await reloadExtensionFromUi();
        }}
      >
        {t('tryAgain')}
      </Button>
    </Box>
  );
};

export default ApiErrorHandler;
