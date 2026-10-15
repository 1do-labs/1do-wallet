# 1do Wallet/Core Cross-Repository Checklist

## Change risk levels

- **L0**: documentation, copy, isolated styles, pure formatting. Run focused lint/checks.
- **L1**: isolated UI, Controller, SDK or pure utility behavior. Run focused tests and lint.
- **L2**: signatures, accounts, networks, ABI callers or shared runtime behavior. Run both repository checks and related tests.
- **L3**: contracts, deployments, migrations, production configuration or chain writes. Run full pre-release checks and require explicit authorization for writes.

涉及合约、ABI、部署地址、网络、签名协议或钱包运行时的改动，需要同时检查：

```text
/home/xiang/1do/1do-core
/home/xiang/1do/1do-wallet
```

## 合约接口或 ABI

- [ ] 修改 `1do-core/packages/contracts` 的 Solidity、接口、错误或事件。
- [ ] 更新 Foundry 测试和必要的 gas 检查。
- [ ] 运行 `npm run abi:extract`。
- [ ] 检查 `packages/abi` 的 diff。
- [ ] 搜索 SDK、Web、Wallet 的方法签名和参数顺序。
- [ ] 运行 `npm run verify:coordination` 及 Wallet 侧相关测试。

## 部署地址或新网络

- [ ] 更新 `1do-core/packages/deployments/<chain>.json` 和网络元数据。
- [ ] 检查 `apps/web/src/runtime/lib/config.ts` 的配置回退逻辑。
- [ ] 检查 Wallet 的 chain、RPC、账户委托和确认流程。
- [ ] 更新环境变量示例，不提交 `.env` 或 `.env.local`。
- [ ] 运行 `npm run sync:check`、`npm run clear-signing:check` 和相关构建。

## EIP-712、ERC-7702、ERC-8112/8114 或 runtime message

- [ ] 同时检查 Core SDK、Web、clear-signing manifest 和 Wallet 调用方。
- [ ] 确认 wallet RPC payload 显式包含 `EIP712Domain`。
- [ ] 确认本地 digest 使用与链上相同的 domain、types 和 message。
- [ ] 同步 Core `packages/sdk/src/sdk/wallet-native-transfer-vectors.json` 与 Wallet `ui/pages/confirmations/utils/wallet-native-transfer-vectors.json`；修改 ERC-8112/8114 时运行两边的向量测试。
- [ ] 添加错误边界、签名回归和跨仓库测试。

本地执行 `npm run wallet:core:check` 会比较两边的固定向量、Account ABI 和 7702 委托地址；缺少 Wallet checkout 时检查失败。Core CI 使用 `npm run core:artifacts:check` 验证 Core 自身产物，不能替代双仓库检查。

日常改动可先运行 `yarn change:check --plan` 查看按文件路径选出的检查，再运行 `yarn change:check`。提交钩子只运行 `--staged --quick`，完整协议检查仍需手动执行；CI 会输出变更影响计划，原有 CI 测试继续负责最终门禁。

## 发布

- [ ] 完成 dry-run、测试和 diff 检查。
- [ ] 确认 deterministic deployment、Registry 状态和验证顺序。
- [ ] 同步 ABI、deployment metadata、Wallet 配置、Web 配置和文档。
- [ ] 最后才执行链上写入或生产配置变更。
