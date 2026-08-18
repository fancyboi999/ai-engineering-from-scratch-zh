# 团队配置审查：Support Router

状态：已准备好接受团队审查

## Scope（范围）

Owner：developer-platform。被审查的 job 会根据 pull request diff 提出 patch，但不能 merge、deploy、发布 comment，也不能读取无关仓库。

## Capability Inventory（能力清单）

Read 仅限隔离 checkout，Edit 仅限 patch workspace。job 可以运行 `python3 -m unittest`；环境不提供网络和生产凭证。merge 及任何外部通信都由人负责。

## Permission Modes（权限模式）

交互式工作从 `default` 开始。`acceptEdits` 可以预先批准文件编辑，但不授权 push、deploy、网络调用或外部消息。headless review 使用 `dontAsk` 和范围明确的 allow rule；deny rule 则会在每种普通 mode 下阻止访问凭证和发布操作。此 job 不允许使用 `bypassPermissions`。

## Context Recovery（上下文恢复）

operator 使用 `/context` 检查上下文占用，并通过指定明确 focus 的 `/compact` 继续同一任务。`/clear` 使用空对话上下文启动无关工作。`/rewind` 可以恢复受追踪的编辑或对话，但 Git 与权威外部状态才是恢复记录。

## Autonomous Boundary（自主边界）

只有同时具备可测量验收条件、evaluator 可见的轮数预算和外部强制的 turn bound 时，才允许使用 `/goal`。`/loop` 可以在 session 保持打开期间轮询 CI，但不能凭空创造新工作，也不能扩大发布权限。两者都保留当前 permission 边界。

## Worktree Ownership（Worktree 归属）

每项并行变更都从 `claude --worktree <owner-task>` 开始。每个分支和文件范围只由一个具名 owner 控制。worktree 隔离可以防止编辑冲突，却不能隔离凭证或网络访问；共享的 Git metadata 仍受仓库策略保护。

## Hook Decision（Hook 决策）

`permission-request-decision.json` 是 `PermissionRequest` 事件的一份 exit 0 结构化响应，会附带消息拒绝外部发布。使用 exit 2 的 command hook 改为通过 stderr 阻止操作；它绝不会同时打印 JSON 并返回 exit 2。

## Scheduled Execution（调度执行）

session 内 `/loop` 用于短期轮询。cloud routine 被视为自主身份进行审查，只能访问必需仓库与 connector。GitHub Actions 负责由仓库治理的 cron job，并使用最小 workflow 权限。

## Review Automation（审查自动化）

截至 2026-08-09 核验，managed Code Review 是面向 Team 与 Enterprise 套餐的 research preview。它可以报告行内 finding，却不会批准或阻止 pull request。仓库自动化使用 `anthropics/claude-code-action@v1`，配合固定 prompt、显式 tool、轮数上限和受保护 merge 路径。

## Allowed Fixture（允许 Fixture）

allow fixture 读取 `src/router.py`、编辑对应测试、运行聚焦测试套件，并输出含准确测试证据的 patch 产物。`acceptEdits` 可以加快这些本地编辑，却不授予任何公开操作权限。

## Denied Fixture（拒绝 Fixture）

deny fixture 尝试读取 `.env`、push 受保护分支并调用未获批准的 server。pre-action 策略会在执行前阻止这三项操作。

## Version Evidence（版本证据）

Claude Code 配置 version `team-review-1.2` 与审查流程已 pinned 在仓库中。每次运行都会在产物 metadata 中记录模型 alias、plugin version 与测试命令。

## Rollback（回滚）

rollback 会禁用 job、丢弃其隔离 patch、恢复配置 `team-review-1.1`，并在重新启用前再次运行 allow 与 deny fixture。
