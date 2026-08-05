import React from 'react';
import { Box } from '@metamask/design-system-react';

/**
 * Displays the 1Do wallet-ready mark with a lightweight CSS animation.
 */
export default function WalletReadyAnimation() {
  return (
    <Box
      className="wallet-ready-animation"
      data-testid="wallet-ready-animation"
      aria-hidden="true"
    >
      <Box className="wallet-ready-animation__halo" />
      <Box className="wallet-ready-animation__ring" />
      <img
        className="wallet-ready-animation__mark"
        src="./images/logo/1do-mark.svg"
        alt=""
      />
    </Box>
  );
}
