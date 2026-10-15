---
name: cross-repo-wallet-core-change
description: Coordinate changes that affect 1do Wallet and 1do Core together.
---

# Cross-repository Wallet/Core change

1. Read both repository `AGENTS.md` files and `docs/cross-repo-change-checklist.md`.
2. Inspect the Core source of truth: contracts, ABI, deployments, SDK and Web callers.
3. Inspect Wallet callers, confirmation flows, configuration and tests.
4. Make the smallest compatible change in both repositories.
5. Run Core `npm run wallet:core:check` and the tests closest to the change.
6. For protocol changes, run `npm run verify:coordination` in Core and the related Wallet test.
7. Report both repository diffs and any deployment or generated-file impact.

Never deploy or perform chain writes as part of this skill without explicit authorization.
