import React from 'react';

type OneDoUnlockLogoProps = {
  isPopup: boolean;
};

export const OneDoUnlockLogo = ({ isPopup }: OneDoUnlockLogoProps) => {
  return (
    <svg
      viewBox="0 0 40 40"
      width={isPopup ? 56 : 72}
      height={isPopup ? 56 : 72}
      className={`unlock-page__brand-logo ${isPopup ? 'unlock-page__brand-logo--popup' : ''}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      data-testid="unlock-page-brand-logo"
    >
      <defs>
        <linearGradient
          id="unlock-page-brand-logo-gradient"
          x1="0"
          y1="0"
          x2="40"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </linearGradient>
        <mask id="unlock-page-brand-logo-mask">
          <rect x="0" y="0" width="40" height="40" rx="8" ry="8" fill="white" />
          <ellipse cx="13" cy="13" rx="6" ry="6" fill="black">
            <animate
              attributeName="ry"
              values="6;6;0.5;6;6"
              keyTimes="0;0.9;0.92;0.96;1"
              dur="4s"
              repeatCount="indefinite"
            />
          </ellipse>
        </mask>
      </defs>
      <rect
        x="0"
        y="0"
        width="40"
        height="40"
        rx="8"
        ry="8"
        fill="black"
        mask="url(#unlock-page-brand-logo-mask)"
        stroke="url(#unlock-page-brand-logo-gradient)"
        strokeWidth="4"
      />
    </svg>
  );
};
