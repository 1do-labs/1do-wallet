# 1do Wallet Agent Instructions

本仓库是 1do Wallet 浏览器扩展，与 MetaMask 主仓库独立。项目沿用了部分 MetaMask Extension 的基础代码和依赖，但产品行为、业务逻辑、合约地址、发布流程和跨仓库约定以 1do 项目为准。

这些规则适用于整个仓库。更深层目录中的 `AGENTS.md` 优先级更高；如果规则与实际代码、`package.json` 或更具体的目录规则冲突，以实际代码和更具体规则为准。

## 基本规则

- 回复用户时使用中文，除非用户明确要求其他语言。
- 新增代码优先使用 TypeScript；只有在必须兼容现有模块时才新增 JavaScript。
- React 使用函数组件和 Hooks，不使用 class component。
- 测试文件与源文件 colocate，沿用仓库已有的 `.test.ts` 或 `.test.tsx` 命名。
- 不修改 git config，不执行 destructive git 操作。
- 不自动执行 `git commit`、`git stage`、`git push` 或创建 PR，除非用户明确要求。
- 不把 secrets、私钥或本地环境文件提交到仓库。
- 修改完成后检查 `git diff --check` 和 `git status --short`。

## 开始任务前

1. 阅读本文件和目标目录下更具体的 `AGENTS.md`。
2. 检查当前工作区状态，不覆盖用户已有的未提交修改。
3. 搜索现有实现、调用方和测试，优先复用已有模式。
4. 对跨模块改动先列出修改范围和验证命令；简单且明确的改动可以直接执行。

如果任务涉及合约、ABI、部署地址、签名协议、Web 应用或服务端逻辑，同时阅读：

```text
/home/xiang/1do/1do-core/AGENTS.md
```

并检查 `1do-core/packages/contracts`、`packages/abi`、`packages/deployments` 以及相关 Web 实现。`1do-core` 是合约和部署数据的事实来源；不要凭记忆填写地址或 ABI。

## 项目结构

```text
app/scripts/                 扩展后台、Controller、消息处理和钱包运行时
ui/                          扩展页面和 React UI
shared/                      前后台共享的常量、类型和工具
test/                        单元、集成和 E2E 测试
development/                 构建、Webpack 和开发脚本
app/manifest/                MV2/MV3 manifest
lavamoat/                    构建安全策略
.github/                     CI 和仓库自动化
```

## 1do Wallet 与 1do Core

- `1do-wallet` 负责浏览器钱包、账户、签名、交易确认和扩展运行时。
- `1do-core` 负责合约、ABI、部署记录、Web 应用和服务端运行时。
- 合约行为和地址以 `1do-core/packages/contracts`、`packages/abi` 和 `packages/deployments` 为准。
- 修改钱包与 Web 或合约的交互时，检查两边的 ABI、部署记录、环境变量和 EIP-712 定义，保持两仓库一致。
- 不在组件、Controller 或测试中散落生产 RPC URL、合约地址或协议常量；优先使用项目现有配置模块。

## 钱包运行时约定

- 当前连接的钱包地址是主要账户视角，不额外引入预测钱包地址作为主流程。
- 账户模式至少区分：`onedo_7702`、`other_7702` 和 `eoa`。
- 当前链上的账户代码和 ERC-7702 委托目标必须通过当前连接的 provider 读取，避免使用与当前网络不一致的静态 RPC 结果。
- 钱包相关授权和转账签名必须显式构造 EIP-712 domain。
- 计算或排查签名问题时，使用与业务相同的 types、domain 和 message 计算本地 digest。
- 新增网络、账户模式或授权流程时，检查对应的 Controller、selectors、确认页面、migration 和 E2E 覆盖。

## 配置与环境变量

- 先搜索现有配置入口，再新增环境变量；不要在 feature code 中直接散落 `process.env` 读取。
- 本地配置使用 `.metamaskrc` 或仓库现有的环境配置文件；不要提交本地配置。
- 需要与 `1do-core` 同步的链和合约配置，必须同时检查 `1do-core` 的部署 JSON、`.env` 示例和相关 Web 配置。
- 新增或修改配置时，更新实际使用该配置的测试和文档。

## Controller 规则

修改或创建 Controller 前，先阅读：

```text
.cursor/rules/controller-guidelines/RULE.md
```

Controller 应遵循以下模式：

- 继承仓库使用的 `BaseController`，使用 messenger 进行跨 Controller 通信。
- 使用单一 options 对象构造，不使用多个位置参数。
- 为所有 state 字段定义 metadata，并明确敏感数据的日志和持久化策略。
- 导出返回新对象的 default state function，不导出可共享的默认对象。
- 暴露描述用户动作的方法，不新增通用 setter。
- 不把可由现有 state 推导出的值重复存入 state；通过 selectors 推导。
- 有定时器、订阅或其他后台资源时，实现清理逻辑。
- 改变持久化 state 结构时，检查并新增对应 migration。

## React 和 UI 规则

修改 UI 前按需阅读：

```text
.cursor/rules/coding-guidelines/RULE.md
.cursor/rules/ui-development-guidelines/RULE.md
.cursor/rules/front-end-performance-rendering/RULE.md
.cursor/rules/front-end-performance-hooks-effects/RULE.md
.cursor/rules/front-end-performance-state-management/RULE.md
```

- 遵循现有 Redux、selector 和 messenger 模式，不为派生值增加重复全局 state。
- 保持 Hooks 调用顺序稳定；不要在 render 中通过 effect 计算可直接得到的值。
- React 19/Next 相关交互中，用户触发的异步 state 更新按现有代码使用 microtask 或 `startTransition`，避免 hydration 时序警告。
- 动态列表使用稳定的业务 ID 作为 key，不使用数组下标。
- 视觉改动必须检查现有组件样式、响应式行为和相关 Storybook 或测试。

## 常用命令

先运行 `nvm use`，再使用仓库锁定的 Node/Yarn 环境。

### 开发和构建

```bash
yarn install
yarn start                         # 开发构建，关闭 LavaMoat
yarn start:lavamoat                # 开发构建，启用 LavaMoat
yarn webpack                       # Webpack 开发流程
yarn dist                          # 生产构建
yarn build:test                    # 带 LavaMoat 的 E2E 测试构建
yarn build:test:dev                # 快速测试构建
yarn build:test:webpack            # Webpack 测试构建
```

### 测试和检查

```bash
yarn test:unit path/to/file.test.ts
yarn test:integration
yarn test:e2e:chrome
yarn test:e2e:single path/to/test.spec.js --browser=chrome
yarn lint:changed:fix
yarn lint:tsc
yarn circular-deps:check
git diff --check
```

只运行与改动直接相关的测试。涉及构建、LavaMoat、manifest 或扩展启动流程时，再运行对应的测试构建或完整检查。

## 测试规则

- 单元测试使用 Jest，测试公共接口和用户可观察行为。
- 测试名称使用现在时，不使用 `should`。
- 行为变化必须同时更新或新增测试；不要只修改快照来掩盖行为变化。
- E2E 测试前先准备测试构建。迭代时可使用 `yarn start:test`（如果该脚本在当前分支存在），最终验证使用启用 LavaMoat 的测试构建。
- 创建新的 E2E 测试时，阅读 `.cursor/skills/creating-e2e-tests/SKILL.md`。
- 涉及 UI 状态、签名、账户或网络切换的改动，优先补充对应的回归测试。

## 依赖、LavaMoat 和生成文件

只有修改依赖或其 Node API 使用方式时，才执行依赖相关更新：

```bash
yarn lint:lockfile:dedupe:fix
yarn lavamoat:auto
yarn attributions:generate
```

修改依赖后检查 `package.json`、`yarn.lock`、相关 LavaMoat policy 和 `attribution.txt` 是否需要一起更新。普通业务或 UI 修改不需要运行这些命令。

## CI 和工作流

修改 `.github/workflows/`、`.github/scripts/` 或其他 CI 配置前，先阅读：

```text
.github/AGENTS.md
```

不要为了验证普通代码修改而改动 CI；修改工作流时同时检查 pull request 和 merge queue 的 job wiring。

## 完成任务前

1. 确认没有误改无关文件。
2. 运行与改动直接相关的单元、集成或 E2E 测试。
3. 运行 `yarn lint:changed:fix`。
4. 对 Controller、复杂依赖或跨模块改动运行 `yarn circular-deps:check`。
5. 运行 `git diff --check`，检查 `git status --short`。
6. 汇报修改文件、关键决策、测试结果和仍未验证的风险。

## 提交和发布

- 未经用户明确要求，不提交、不推送、不创建 PR。
- 用户要求提交时使用 Conventional Commits，例如：`fix(wallet): handle delegated account code`。
- 用户要求发布合约或同步地址时，必须完成部署、验证、部署 JSON、Wallet 配置和 `1do-core` 配置的同步后再报告完成。
