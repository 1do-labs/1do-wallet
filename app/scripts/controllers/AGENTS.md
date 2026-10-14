# Controller Agent Rules

适用于 `app/scripts/controllers` 及其子目录。

- 修改前阅读 `.cursor/rules/controller-guidelines/RULE.md`。
- 优先使用现有 messenger、selectors、metadata 和 migration 模式。
- 新增 Controller 使用 TypeScript、单一 options 对象和 default state function。
- 不把派生值存入 state；通过 selectors 提供派生结果。
- 修改持久化 state 结构时，检查 `app/scripts/migrations`。
- 测试与 Controller colocate；完成后运行对应 Jest 测试和 `yarn lint:changed:fix`。
