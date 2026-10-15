---
name: eip712-7702-change
description: Change ERC-7702, ERC-8112/8114 or EIP-712 signing flows across 1do repositories.
---

# EIP-712 and ERC-7702 change

1. Locate the canonical Core SDK/types and the Wallet signing/confirmation caller.
2. Check domain name, version, chainId, verifyingContract, nonce and primary type.
3. Keep `EIP712Domain` explicit in wallet RPC payloads; omit it only when required by local ethers digest helpers.
4. Update clear-signing manifests, ABI references and both repository tests.
5. Verify provider-first chain reads and current account delegation behavior.
6. Run SDK tests, relevant Wallet unit tests, `npm run clear-signing:check` and `npm run wallet:core:check`.

Do not change signing fields or domain values without calling out compatibility and replay implications.
