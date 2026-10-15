# 1do Wallet Codebase Map

## Runtime paths

- `app/scripts/`: extension background runtime, controllers, messengers and keyrings.
- `app/scripts/controllers/`: persistent business state and controller actions.
- `ui/`: extension pages, Redux state, confirmations and React components.
- `shared/`: code shared by background and UI.
- `app/scripts/metamask-controller*`: composition root and controller wiring.

## Verification paths

- Unit tests: colocated `*.test.ts`, `*.test.tsx` and legacy `*.test.js`.
- E2E: `test/e2e/` and its directory rules.
- Build: `development/build/` and `development/webpack/`.
- Security policies: `lavamoat/`.

## Cross-repository paths

- Contract and ABI source: `/home/xiang/1do/1do-core/packages/contracts` and `packages/abi`.
- Deployment source: `/home/xiang/1do/1do-core/packages/deployments`.
- SDK/Web protocol callers: `/home/xiang/1do/1do-core/packages/sdk` and `apps/web`.
- Cross-repository checklist: `docs/cross-repo-change-checklist.md`.
