import type { Hex } from '@metamask/utils';

export type OneDoRuntimeDeploymentManifest = {
  accountImplementation: {
    address: Hex;
    codeHash: Hex;
  };
  logicRegistry: {
    address: Hex;
    codeHash: Hex;
    implementationAddress: Hex;
    implementationCodeHash: Hex;
    implementationSlot: Hex;
  };
};

/**
 * Deterministic 1Do Core deployment identity.
 *
 * These addresses are intentionally chain-independent. Runtime availability is
 * established by verifying the contracts deployed at these addresses, not by
 * checking the current chain ID against a network allowlist.
 */
export const ONE_DO_RUNTIME_DEPLOYMENT_MANIFEST: OneDoRuntimeDeploymentManifest =
  {
    accountImplementation: {
      address: '0x90B7a4042238509789279546f4bB9886933Ae5a7',
      codeHash:
        '0x2abd14380f13c9b92ac215f2244535b41e56661d97fb6e7de50b5140f2a00b08',
    },
    logicRegistry: {
      address: '0xC0916B7B043650665Cc7329D29e0d73Bf1758816',
      codeHash:
        '0x1f2c51a88859d9c40ce571b00bd6cd668e248062225f4573ba078804fb18846c',
      implementationAddress: '0x7b5A50c70aA8a45e63Ea0971c719aA91f493bb40',
      implementationCodeHash:
        '0x0ea362dcce6740093e5394a0cefc8b227c303f72fc1c101237f87afca0813a74',
      implementationSlot:
        '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
    },
  };
