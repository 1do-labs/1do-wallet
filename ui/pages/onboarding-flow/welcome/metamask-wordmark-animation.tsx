import React, { useEffect } from 'react';
import { Box } from '@metamask/design-system-react';
import classnames from 'clsx';

type MetamaskWordMarkAnimationProps = {
  setIsAnimationComplete: (isAnimationComplete: boolean) => void;
  isAnimationComplete?: boolean;
  skipTransition?: boolean;
};

// TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
// eslint-disable-next-line @typescript-eslint/naming-convention
export default function MetamaskWordMarkAnimation({
  setIsAnimationComplete,
  isAnimationComplete = false,
  skipTransition = false,
}: MetamaskWordMarkAnimationProps) {
  useEffect(() => {
    setIsAnimationComplete(true);
  }, [setIsAnimationComplete]);

  return (
    <Box
      className={classnames('riv-animation__wordmark-container', {
        'riv-animation__wordmark-container--complete':
          isAnimationComplete && !skipTransition,
        'riv-animation__wordmark-container--skip-transition': skipTransition,
      })}
    >
      <Box className="riv-animation__brand-lockup">
        <img
          className="riv-animation__brand-logo"
          src="./images/logo/1do-mark.svg"
          alt=""
        />
        <span className="riv-animation__wordmark-text">1Do</span>
      </Box>
    </Box>
  );
}
