import React from 'react';

type OneDoUnlockLogoProps = {
  isPopup: boolean;
};

export const OneDoUnlockLogo = ({ isPopup }: OneDoUnlockLogoProps) => {
  return (
    <img
      src="./images/logo/1do-mark.svg"
      alt=""
      className={`unlock-page__brand-logo ${isPopup ? 'unlock-page__brand-logo--popup' : ''}`}
      aria-hidden="true"
      data-testid="unlock-page-brand-logo"
    />
  );
};
