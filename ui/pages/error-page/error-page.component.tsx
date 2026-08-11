import React from 'react';
import { useI18nContext } from '../../hooks/useI18nContext';
import {
  BannerAlert,
  Box,
  Icon,
  IconName,
  IconSize,
  Text,
  Button,
  ButtonVariant,
} from '../../components/component-library';
import {
  AlignItems,
  BackgroundColor,
  BlockSize,
  BorderRadius,
  Display,
  FlexDirection,
  IconColor,
  JustifyContent,
  TextColor,
  TextVariant,
} from '../../helpers/constants/design-system';

import { reloadExtensionFromUi } from '../../helpers/utils/reload-extension-from-ui';
import { openWindow } from '../../helpers/utils/window';
import { SUPPORT_LINK } from '../../../shared/lib/ui-utils';

type ErrorPageProps = {
  error: {
    message?: string;
    code?: string;
    name?: string;
    stack?: string;
  };
};

const ErrorPage: React.FC<ErrorPageProps> = ({ error }) => {
  const t = useI18nContext();

  return (
    <section className="error-page">
      <section className="error-page__inner-wrapper">
        <Box
          className="error-page__header"
          display={Display.Flex}
          flexDirection={FlexDirection.Column}
          alignItems={AlignItems.center}
        >
          <Icon
            name={IconName.Danger}
            size={IconSize.Xl}
            color={IconColor.warningDefault}
          />
          <Text
            color={TextColor.inherit}
            variant={TextVariant.headingMd}
            marginBottom={4}
            data-testid="error-page-title"
          >
            {t('errorPageTitle')}
          </Text>
        </Box>

        <div className="error-page__banner-wrapper">
          <BannerAlert
            childrenWrapperProps={{ color: TextColor.inherit }}
            marginBottom={4}
          >
            {t('errorPageInfo')}
          </BannerAlert>
        </div>

        <Text color={TextColor.inherit} variant={TextVariant.bodyMd}>
          {t('errorPageMessageTitle')}
        </Text>

        <Box
          borderRadius={BorderRadius.LG}
          marginBottom={2}
          marginTop={2}
          backgroundColor={BackgroundColor.errorMuted}
          display={Display.Flex}
          flexDirection={FlexDirection.Column}
          padding={2}
          className="error-page__error-message-wrapper"
        >
          {error.message ? (
            <Text
              variant={TextVariant.bodyXs}
              marginBottom={2}
              data-testid="error-page-error-message"
              color={TextColor.inherit}
            >
              {t('errorMessage', [error.message])}
            </Text>
          ) : null}
          {error.code ? (
            <Text
              variant={TextVariant.bodyXs}
              marginBottom={2}
              data-testid="error-page-error-code"
              color={TextColor.inherit}
            >
              {t('errorCode', [error.code])}
            </Text>
          ) : null}
          {error.name ? (
            <Text
              variant={TextVariant.bodyXs}
              marginBottom={2}
              data-testid="error-page-error-name"
              color={TextColor.inherit}
            >
              {t('errorName', [error.name])}
            </Text>
          ) : null}
          {error.stack ? (
            <>
              <Text
                color={TextColor.inherit}
                variant={TextVariant.bodyXs}
                marginBottom={2}
              >
                {t('errorStack')}
              </Text>
              <pre
                className="error-page__stack"
                data-testid="error-page-error-stack"
              >
                {error.stack}
              </pre>
            </>
          ) : null}
        </Box>

        <Box
          width={BlockSize.Full}
          display={Display.Flex}
          flexDirection={FlexDirection.Column}
          alignItems={AlignItems.center}
          justifyContent={JustifyContent.center}
          marginTop={4}
        >
          <Button
            marginBottom={2}
            variant={ButtonVariant.Secondary}
            block
            data-testid="error-page-contact-support-button"
            onClick={() => openWindow(SUPPORT_LINK as string)}
          >
            {t('errorPageContactSupport')}
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            block
            data-testid="error-page-try-again-button"
            onClick={async () => {
              await reloadExtensionFromUi();
            }}
          >
            {t('errorPageTryAgain')}
          </Button>
        </Box>
      </section>
    </section>
  );
};

export default ErrorPage;
