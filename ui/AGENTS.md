# UI Agent Rules

适用于 `ui` 及其子目录。

- 修改前按需阅读 `.cursor/rules/coding-guidelines/RULE.md`、`.cursor/rules/ui-development-guidelines/RULE.md` 和性能规则。
- 使用函数组件和 Hooks，保持 Hooks 顺序稳定。
- 遵循现有 Redux、selector、messenger 和组件样式模式。
- 动态列表使用稳定业务 ID 作为 key；不要为派生值新增重复全局 state。
- 测试与组件 colocate，测试用户可观察行为。
- 完成后运行相关 Jest 测试和 `yarn lint:changed:fix`。
