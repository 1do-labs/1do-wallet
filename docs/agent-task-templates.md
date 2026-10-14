# Codex Task Templates

## 调查模式

```text
先不要修改文件。请搜索相关实现、调用方和测试，并说明：
1. 当前行为
2. 最小修改方案
3. 影响范围
4. 验证命令
```

## 执行模式

```text
直接完成这个改动。允许修改明确列出的文件或仓库。
完成后运行相关测试、yarn lint:changed:fix 和必要的跨仓库检查。
不要 commit、stage 或 push。
最后汇报修改文件、测试结果和未验证风险。
```

## 跨仓库协议改动

```text
这个任务涉及 1do Wallet 和 1do Core 的协议/ABI/部署配置。
先阅读两个仓库的 AGENTS.md 和 docs/cross-repo-change-checklist.md，
搜索双方调用方，再实现修改并运行跨仓库验证。
```
