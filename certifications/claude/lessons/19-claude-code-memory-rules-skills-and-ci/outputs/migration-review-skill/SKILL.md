---
name: migration-review
description: 当（when）变更新增或修改 migrations/ 下的路径时，审查 database migration 文件。合并前使用此 migration Skill 收集正向、回滚、锁定和数据安全证据。
allowed-tools: Read Grep Glob Bash(python3 ${CLAUDE_SKILL_DIR}/scripts/check_scope.py *)
---

# Migration 审查

仅审查 `$ARGUMENTS` 指定的 migration 文件，以及验证其兼容性所需的代码。本 Skill 不授权应用 migration。

1. Run `python3 ${CLAUDE_SKILL_DIR}/scripts/check_scope.py $ARGUMENTS`.
2. 若检查器拒绝任何 `migrations/` 外的路径，立即停止。
3. 阅读 [references/review-checklist.md](references/review-checklist.md)。
4. 检查每个被接受文件及其 schema 假设。
5. 报告正向行为、回滚限制、锁风险、数据量风险、验证证据和未解决 blocker。

返回以下标题：`Scope`、`Evidence`、`Risks`、`Rollback`、`Blockers` 和 `Decision`。所需证据缺失时，必须使用 `Decision: blocked`。

随附检查器是 [scripts/check_scope.py](scripts/check_scope.py)。`allowed-tools` 条目只为调用回合预批准该命令，不移除其它 tool，也不替代项目权限 Rule。
