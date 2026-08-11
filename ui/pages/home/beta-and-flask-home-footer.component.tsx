import React, { useContext } from 'react';
import { SUPPORT_LINK } from '../../helpers/constants/common';
import { isFlask } from '../../../shared/lib/build-types';
import { useI18nContext } from '../../hooks/useI18nContext';

export default function BetaAndFlaskHomeFooter() {
  const t = useI18nContext();

  return (
    <>
      <a
        target="_blank"
        rel="noopener noreferrer"
        href={SUPPORT_LINK}
        onClick={() => undefined}
      >
        {t('needHelpSubmitTicket')}
      </a>
      {isFlask() && (
        <>
          {' | '}
          <a
            href="https://community.metamask.io/c/developer-discussion/11"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('needHelpFeedback')}
          </a>
        </>
      )}
    </>
  );
}
