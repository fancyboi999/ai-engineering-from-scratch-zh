# 配置作用域审计：Python 服务

## Instruction Hierarchy（指令层级）

根指南包含用途、结构、规范命令、安全边界和链接。API、迁移和文档指引仍保持在路径作用域。

## Path Rule Fixtures（路径 Rule Fixture）

API allow fixture `src/api/orders.py` 会加载合约和 authorization 指引；deny fixture `docs/orders.md` 不会。迁移 fixture 证明只追加指引仅在 `migrations/**` 下加载。

## Skill and Command（Skill 与 Command）

migration-review Skill 打包可复用的证据收集流程。旧的显式 ADR command 仍然兼容，但新的多步骤流程使用 Skill，让辅助文件按需加载。两者都不授予 authorization。

## Skill Package（Skill 包）

`migration-review-skill/SKILL.md` 定义触发 description 和狭窄的 `allowed-tools` 授权。它将详细证据路由到 `references/review-checklist.md`，并用 `scripts/check_scope.py` 校验每个参数。该授权只为调用回合预批准随附检查器，不限制其它所有 tool，也不覆盖 deny Rule。

## Subagent Contract（Subagent 合约）

`/agents` 注册一个具有 read-only tool、`maxTurns: 10`，并在请求编辑时使用 `isolation: worktree` 的迁移审计器。它的响应包含 `status`、`evidence`、`blockers` 和 `next_step`。它会在回合上限处停止并报告障碍，而不会声称成功或扩大范围。

## Plugin Distribution（Plugin 分发）

项目 Skill 和 agent 提交在 `.claude/` 下。共享 plugin 来源和默认值通过 `.claude/settings.json` 中的 `extraKnownMarketplaces` 与 `enabledPlugins` 管理，并配套文件夹信任和审查。组织的 managed settings 限制允许的 marketplace 和不可妥协的权限；上线前记录版本和回滚方案。

## Hooks（Hook）

确定性的 pre-write hook 阻止声明作用域外的路径；post-edit hook 只格式化变更文件；pre-command hook 阻止打印 secret 和破坏性操作。`PreToolUse` 结构化决定使用 exit 0 和 JSON；exit 2 hook 将阻止原因写入 stderr，不打印 JSON。`PermissionRequest` hook 使用它自己的嵌套决定形态。

## Headless CI（无头 CI）

CI 从 fresh checkout 开始，使用版本化项目配置、read-only 审查 tool、受限运行时、structured finding 和独立的 deterministic 测试。它绝不继承交互式 session。核验于 2026-08-09，managed Code Review 是 Team 和 Enterprise 的 research preview；它报告 finding，但不替代 gate。仓库自动化使用 `anthropics/claude-code-action@v1`，并明确声明 workflow 权限和 tool。

## Remediation（修复）

稳定 finding ID、原始证据、当前 diff、测试和验收 Rule 会传给修复审查；个人本地偏好不在其中。
