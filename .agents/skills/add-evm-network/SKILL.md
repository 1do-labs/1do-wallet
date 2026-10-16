---
name: add-evm-network
description: Coordinate Wallet support for a new EVM network whose source of truth is 1do Core.
---

# Add an EVM network to Wallet

Use with Core add-evm-network for a full 1do network. Read both AGENTS.md files and the cross-repository checklist first.

1. Read network metadata and real deployment addresses from /home/xiang/1do/1do-core; never invent chain IDs, explorers, or contract addresses. All EVM RPCs use the local Alchemy environment configuration; keep API keys out of source and deployment metadata.
2. Decide whether custom-network support already covers the chain. Only add built-in Wallet constants and Controller initialization when product scope requires a built-in network.
3. If built-in, update the smallest applicable set among shared/constants/network.ts, shared/constants/native-assets.ts, shared/constants/common.ts, and app/scripts/messenger-client-init/network-controller-init.ts.
4. Verify current-provider behavior, network switching, native currency, explorer links, 7702 eligibility, and transaction confirmation behavior.
5. Add colocated unit tests and an E2E test for switching and a representative transaction when the network is built in.
6. Run yarn change:check, yarn lint:changed:fix, yarn lint:tsc, yarn circular-deps:check, Core npm run wallet:core:check, and relevant E2E tests.

Do not deploy or send transactions from this skill without explicit user authorization. Report whether support is metadata-only, built-in Wallet support, or fully deployed 1do support.
