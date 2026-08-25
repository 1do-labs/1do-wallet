# 1Do EIP-7702 Runtime 钱包改造说明

本文记录 1Do 从 MetaMask 深度分叉改造成 EIP-7702 Runtime 管理钱包的产品、架构和发布边界。它是当前代码实现的设计基线，也可作为 Chrome Web Store `Yellow Nickel` 拒审申诉的技术说明材料。

## 1. 产品定位

1Do 的主要用途是管理经过验证的 EIP-7702 Runtime，以及 Runtime 上的链上 App 权限。通用 EVM 钱包能力继续保留，但降为辅助能力。

产品单一用途描述：

> Manage verified EIP-7702 account runtimes and their on-chain app permissions, with supporting EVM wallet functions.

与原始 MetaMask 产品的核心差异是：Runtime 状态、激活、替换、停用、App 权限和 Clear Signing 是首页与主要流程的中心，而不是通用钱包、Swap、Bridge、Portfolio 或营销服务。

## 2. 钱包基础能力边界

保留：

- 多个 EVM 账户和多套助记词；
- 私钥导入和现有硬件钱包；
- EVM 网络、账户余额、Token、NFT、Activity；
- 收款、转账、签名、交易确认和 DApp 连接；
- ENS 标准正向/反向解析、联系人和本地账户昵称；
- 自定义 EVM 网络与本地 `eth-chainlist` 元数据交叉校验；
- DeBank Discover（仅用户主动打开，不携带 referral/affiliate 参数）。

删除：

- Bitcoin、Solana、Tron 等非 EVM 账户、网络和流程；
- Swap、Bridge、Buy、Sell；
- Portfolio Staking、Rewards、mUSD、Card、Shield；
- Snaps、Flask、Beta、Experimental 公开构建；
- Firefox/MV2，首个公开版本只发布 Chromium MV3；
- MetaMetrics、Segment、营销数据和远程 Sentry 报告；
- Blockaid、PPOM、Security Alerts、Trust Signals 等旧安全服务残余；
- Gator Permissions、Remote Mode、Daily Allowance、ERC-4337 UserOperation、Bundler、Paymaster 和 Gasless；
- User Storage、Profile Sync、Authentication、云同步和历史迁移体系。

## 3. Runtime 模型

Runtime 状态分为：

```text
eoa         普通 EOA，未激活 1Do Runtime
onedo_7702  已委托到官方 1Do Runtime
other_7702  已委托到其他 Runtime
```

账户地址本身就是 Runtime 地址，不创建第二个“智能账户地址”。首页结构为：

```text
账户 + 网络
总余额
Send / Receive
Runtime 状态卡片
Tokens / NFTs / Activity
```

### 3.1 Wallet Native 能力

这些能力属于 Runtime 本身，不通过外部 App 解释：

- Red Packet、Gift、Pay；
- ERC-1271、ERC-8112、ERC-8114；
- `executeBatch`、`executeWithSig`；
- `executeWithTokenPull`、`executeWithNftPull`。

### 3.2 可启用 App

Runtime App 包括 Dex、NFT Market、Flash Loan、Will、Session Pay。App 是否可运行由两层状态共同决定：

```text
wallet.isAppEnabled(app) && registry.isAppAllowed(app)
```

普通 DApp 不能隐式激活 Runtime 或修改 delegate。官方 Web App 的激活请求仍然进入钱包确认和 Clear Signing 流程。

## 4. Core 合约与可信部署验证

Runtime Core 的确定性地址来自 `/home/xiang/1do/1do-core`：

```text
AccountImplementation          0x90B7a4042238509789279546f4bB9886933Ae5a7
LogicRegistry                  0xC0916B7B043650665Cc7329D29e0d73Bf1758816
LogicRegistryImplementation    0x7b5A50c70aA8a45e63Ea0971c719aA91f493bb40
```

地址跨链一致。不能通过 Sepolia/Base Sepolia 链 ID 白名单判断是否支持，因为未来可能部署到任意 EVM 正式网络。

钱包新增：

- `shared/lib/onedo-runtime/deployment-manifest.ts`：保存确定性地址、预期 bytecode hash 和 EIP-1967 implementation slot；
- `shared/lib/onedo-runtime/verify-deployment.ts`：通过当前网络 RPC 验证部署身份；
- `verifyOneDoRuntimeDeployment` 后台 API：供 UI 和激活流程复用。

验证规则：

| 链上结果                                        | 钱包状态       | 行为                         |
| ----------------------------------------------- | -------------- | ---------------------------- |
| AccountImplementation 与 LogicRegistry 均无代码 | `not_deployed` | Runtime 不可用               |
| 只有部分地址有代码                              | `untrusted`    | 禁止激活                     |
| 地址代码 hash 不匹配                            | `untrusted`    | 禁止激活                     |
| Registry implementation slot 不匹配             | `untrusted`    | 禁止激活                     |
| Registry implementation 代码 hash 不匹配        | `untrusted`    | 禁止激活                     |
| RPC 请求失败或返回格式错误                      | `unavailable`  | 显示无法验证，不当作未部署   |
| 全部身份检查通过                                | `trusted`      | 允许 Runtime 激活和 App 管理 |

这样可以避免把“任意地址有代码”误判成官方 1Do Runtime，也避免将测试网逻辑硬编码进产品。

## 5. 激活与 Runtime 状态

EIP-7702 激活仍使用同一账户地址，通过 `setCode` authorization list 委托到 `AccountImplementation`。激活前必须满足：

1. 当前账户是支持 EIP-7702 的 EVM keyring 账户；
2. 当前网络是有效 EVM 网络；
3. Core 部署验证结果为 `trusted`；
4. 用户完成交易确认和 Clear Signing。

已激活状态也会重新检查 Core 部署信任状态。部署变为 `untrusted` 或 `unavailable` 时，不继续把账户显示为可用的 1Do Runtime。

## 6. Provider 与 RPC

### 6.1 Provider 身份

保留 EIP-1193 `window.ethereum` 和 EIP-6963，但身份改为：

```text
name: 1Do
rdns: io.onedo.wallet
isOneDo: true
isMetaMask: false
```

关闭旧 `window.web3` shim，不再伪装成 MetaMask Provider。

### 6.2 保留的标准接口

保留账户权限、`personal_sign`、EIP-712 typed data v1/v3/v4、交易发送、链切换、添加网络、watchAsset，以及常用 EVM 读取、Filter 和订阅接口。

EIP-5792 保留：

```text
wallet_getCapabilities
wallet_sendCalls
wallet_getCallsStatus
```

只有可信 `onedo_7702` Runtime 声明原子批量能力；EOA、`other_7702`、未部署或不可信网络不会拆分成多笔交易伪造支持。

### 6.3 删除的接口

- 通用 DApp `wallet_upgradeAccount`；
- 通用 DApp `wallet_getAccountUpgradeStatus`；
- `eth_sign`；
- `eth_getEncryptionPublicKey`、`eth_decrypt`；
- Session、Execution Permissions 和旧 MetaMask Web3 shim 兼容接口。

## 7. 交易、模拟和资产数据

### 7.1 远程模拟

暂时保留 Tx Sentinel，但抽象为 `SimulationProvider`：

- 只模拟未签名交易，不广播用户交易；
- 与 Runtime Clear Signing 同屏展示资产变化；
- 用户可关闭可选远程服务；
- 不可用时明确显示 `Simulation Unavailable`。

Alchemy `alchemy_simulateAssetChanges` 已验证存在网络差异：Ethereum Mainnet 可用，但 Sepolia 报 `bigInt is not defined`，Base/Mainnet 与 Base Sepolia 的 JS Tracer 不可用，因此当前不能直接替代 Tx Sentinel。

### 7.2 资产与 Activity

- Token/NFT 自动发现使用 Alchemy；
- 余额仍通过当前网络 RPC 校验；
- Activity 使用 `alchemy_getAssetTransfers`，并通过标准 RPC 补交易、Receipt、Block 和 Logs；
- 以 `chainId + transactionHash` 合并索引数据与本地交易；
- 自动发现和索引服务可分别关闭；
- 关闭索引后只显示本地交易。

### 7.3 价格与 Gas

- 价格使用 Alchemy Prices API；
- 本地余额乘单价计算总值；
- 无价格时显示 `Price unavailable`，测试 Token 不赋真实法币价值；
- Gas 使用 `eth_estimateGas`、`eth_feeHistory`、`eth_maxPriorityFeePerGas`、`eth_gasPrice`；
- 本地计算 Slow/Market/Fast、拥堵趋势和预计区块范围；
- 不声称精确确认时间；
- 7702 估算失败时使用 Simulation gasUsed 加缓冲作为后备。

## 8. 合约解码与 ENS/IPFS

合约解码优先级：

1. Runtime Core Manifest 和内置接口；
2. Sourcify；
3. 4byte 仅作为最后兜底，并明确标记 `Unverified`。

无可信 ABI 时显示：

```text
Unverified Contract Call
selector
raw calldata
```

4byte 结果绝不用于 Runtime Clear Signing。Uniswap calldata 特判保留，但钱包内置 Swap 已删除。

地址栏导航保留 ENS contenthash：

```text
.eth → ENS contenthash → IPFS/IPNS Gateway
```

只监听 `*.eth` 的 `main_frame`，解析失败显示本地错误页。NFT IPFS 媒体是独立链路，可单独关闭或配置 Gateway；Onion、ZeroNet、Skynet、Swarm 跳转删除。

## 9. Manifest、构建与发布

当前公开版本：`2.0.1`。

构建边界：

- 只构建 Chromium MV3；
- 默认平台为 Chrome，兼容 Edge/Brave 等 Chromium 浏览器；
- 删除 MV2 manifest、Beta/Flask/Experimental 资产和对应 LavaMoat policy；
- 删除旧版本并行构建脚本；
- Manifest 保留 `webRequest`，删除 `activeTab`、`scripting`、`externally_connectable`；
- 继续保留 Provider、自定义 RPC、硬件钱包 offscreen、sidePanel 和 ENS/IPFS 地址栏导航所需权限。
- 所有硬件钱包厂商链接均为不带跟踪参数的官方直达链接；产品不使用联属链接、推荐码或返佣 Cookie。
- 删除上游遗留的 DeFi 推荐跳转、推荐码、同意界面、偏好状态和构建资源。

商店描述应突出：

> Runtime features are available on EVM networks where verified 1Do Core contracts are deployed.

不在商店文案中固定列出当前测试网，以免部署到正式网络时产品说明失效。

## 10. 隐私与远程服务

隐私设置只展示实际存在的服务：

- Token and NFT Discovery / Alchemy；
- Indexed Activity / Alchemy；
- Fiat Prices / Alchemy；
- Transaction Simulation / Alchemy；
- Verified Contract Decoding / Sourcify；
- Unverified Function Lookup / 4byte；
- External Address Labels / ENS、Etherscan、Lens；
- NFT Media；
- Network Metadata Updates / chainid.network。

提供 `Disable all optional remote services`。RPC 是钱包运行所必需的网络连接，不伪装成可关闭的可选服务。

不再调用 MetaMask 的 Accounts、Token、NFT、Price、Gas、Geolocation、
Feature Flags、Metrics 或错误监控服务。Alchemy Token/NFT 发现直接使用用户
配置的 Alchemy RPC/API Key；非 Alchemy 自定义 RPC 不提供索引型自动发现，
但链上余额、手动导入和交易功能仍可使用。

删除 Metrics、Profile、Security Alerts、旧 ENS 网站解析设置和所有 `trackEvent` 数据上报路径。

## 11. UI 和设置结构

UI 使用独立 1Do 信息架构，Runtime 是首页核心而不是附加入口。

设置分组：

```text
Accounts
Networks
Runtime
Assets & Activity
Privacy & Remote Services
Security & Backup
Hardware Wallets
About 1Do
```

普通交易确认保留用户熟悉的层级，但使用 1Do 外壳；删除 MetaMask Banner、Fox、教育、促销和 Rewards 视觉体系。

数据导出改名为 `Export Settings and Contacts`，只包含账户名称/地址、联系人、自定义网络、非敏感设置和 Runtime UI 偏好，不包含 Vault、密钥、密码、签名、calldata 或 Activity 缓存。

## 12. 验证记录

当前实现验证结果：

- `yarn lint:changed:fix` 通过；
- `yarn lint:tsc` 通过；
- Activity Alchemy 服务、Preferences、交易解码、设置注册表及迁移器相关单测通过；
- 真实 Alchemy RPC 已确认 `alchemy_getAssetTransfers` 的 transfer、decimal 和 timestamp 返回格式；
- 带 LavaMoat 的 Chromium MV3 `yarn build:test` 通过，生成 `dist/chrome` 测试包；
- 已删除 Firefox MV3 manifest、MetaMask 加密消息 Controller/确认入口及 2.x 不再支持的历史状态迁移文件。

以下项目仍需在 Chrome 测试环境中执行并留存截图/网络日志后，才能作为发布前验收结论：新建/导入钱包、Runtime 激活与停用、硬件钱包激活、Runtime App 开关、真实 Activity 页面、交易模拟余额变化，以及 Chrome Web Store 最终压缩包人工检查。

Runtime 部署验证器的可信、未部署、不可信和 RPC 不可用路径均由 mock RPC 单测覆盖；可信部署事实来源仍是 `1do-core` 的部署 Manifest。

## 13. 相关代码

- Runtime 合约事实来源：`/home/xiang/1do/1do-core`
- 部署 Manifest：[shared/lib/onedo-runtime/deployment-manifest.ts](../shared/lib/onedo-runtime/deployment-manifest.ts)
- 部署验证器：[shared/lib/onedo-runtime/verify-deployment.ts](../shared/lib/onedo-runtime/verify-deployment.ts)
- EIP-7702 工具：[shared/lib/eip7702-utils.ts](../shared/lib/eip7702-utils.ts)
- Runtime App 注册表：[ui/components/multichain/account-overview/runtime-app-registry.ts](../ui/components/multichain/account-overview/runtime-app-registry.ts)
- Clear Signing：[ui/pages/confirmations/utils/onedo-clear-signing.ts](../ui/pages/confirmations/utils/onedo-clear-signing.ts)
