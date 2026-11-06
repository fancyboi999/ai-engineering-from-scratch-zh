---
id: clone-mode-and-the-hidden-hook
title: 干净的 diff 与新增的 pre-commit 钩子
card: sandboxes
kind: debug
level: 2
roles: [agentic-ai-engineer, applied-ai-engineer, forward-deployed-ai-engineer]
rounds: [debugging, system-design]
tags: [sandbox, workspace, clone-mode, git, supply-chain]
minutes: 8
lessons: []
manuals: [docker-sandboxes-101#s-clone-and-run-sandbox-source]
practice: []
cheatsheet: [docker-sandboxes, coding-agents]
related: [sandboxes/hypervisor-is-the-boundary]
updated: 2026-11-03
---

你让 agent 在带有默认工作空间挂载的沙箱中对一个代码仓库通宵工作。次日早晨 `git diff` 显示一片干净，然而在 `.git/hooks/pre-commit` 路径下却多出了一个新文件。解释该 agent 是如何写入了一个任何 diff 都无法呈现的文件的，哪种工作空间模式能够防止该问题，以及在该安全模式下 agent 所提交的 commit 如何正常同步给你。

## Short answer

默认挂载是将宿主机路径以相同绝对路径读写挂载到虚拟机内部，因此 agent 能够随意修改该目录树中的任何内容（包括 Git 钩子、CI 配置、`package.json` 脚本以及 agent 自身配置），而位于 `.git/hooks` 下的钩子脚本从不出现在 `git diff` 中。在创建沙箱时指定 `--clone` 参数会让 agent 在独立的私有克隆副本上运行，而宿主机仓库仅以只读方式挂载在虚拟机的 `/run/sandbox/source` 下，从而阻止任何直接反向推送。Agent 的提交通过虚拟机内部由 `sbx` 映射在环回端口上的 git daemon 守护进程同步出来，并在宿主机仓库中注册为名为 `sandbox-<name>` 的远端，因此在销毁沙箱前直接从该远端拉取即可。

## Full answer

### 三种工作空间模式

| 工作空间模式 | Agent 视角所见 | Agent 能够对宿主机修改的内容 |
|---|---|---|
| direct mount（直接挂载） | 相同路径下的宿主机目录，`virtiofs`，可读写 | 该目录树中的一切内容，包含 Git 钩子 |
| mountless（无挂载） | 模板自带的默认工作目录 `/home/agent/workspace` | 毫无影响，无法修改宿主机任何文件 |
| `--clone`（克隆模式） | 相同路径下的独立私有克隆（位于专属 ext4 卷），`origin` 对应 `/run/sandbox/source` | 毫无影响；宿主机源码挂载完全只读 |

除首个路径外可以追加额外路径，且附加 `:ro` 即可将其设为只读（即便单个文件亦支持）。执行 `sbx run` 时若未指定路径默认会挂载当前目录，这正是题目陷阱所在。

### 录制的克隆运行实测表现

在虚拟机内部执行 `touch /run/sandbox/source/x` 会报错提示 `Read-only file system`（只读文件系统），而尝试向 `origin` 执行 `git push` 会因 `remote unpack failed`（远端解包失败）而中止。虚拟机内部的 git daemon 监听在 9418 端口上，CLI 会在宿主机 `.git/config` 中自动写入两条抓取引用规范（refspec），因此一次抓取会同时更新 `refs/remotes/sandbox-<name>/<branch>` 和 `refs/sandboxes/<name>/<branch>`。执行 `sbx rm` 会移除该远端配置与守护进程并打印出恢复命令，而先前抓取存留的 `refs/sandboxes` 副本在容器销毁后依然完好留存。执行 `sbx stop` 会停止守护进程，而重启时会重新分配一个新端口并自动更新远端 URL。

### 克隆模式无法防范的事项

它防范的是恶意写入，而非未授权读取。宿主机仓库中未被 git 跟踪的 `.env` 敏感文件在只读挂载下依然能够被克隆环境直接读取，因此在将仓库克隆入沙箱前，切勿将敏感凭据留在仓库目录中。该标志在 v0.31.0 中替换了早期的 `--branch`，且在重新连接已有沙箱时属于空操作（no-op），因此该决策必须在 `sbx create` 创建之初就明确确定。

## Follow-ups

- **Level 2:** 能否将一个已经运行的现有沙箱切换为克隆模式？ Expected: 不能；模式在创建时就已固定，该标志在重连时无效，必须先销毁然后重新创建。
- **Level 3:** Agent 在沙箱内部向 `main` 分支提交了 commit，执行 fetch 抓取后该提交位于宿主机的何处？ Expected: 位于 `refs/remotes/sandbox-<name>/main` 和 `refs/sandboxes/<name>/main`, 不在宿主机自己的 `main` 上。
- **Level 3:** 执行过一次 fetch 后你删除了沙箱，你能恢复出什么？ Expected: 先前已抓取出的提交；`refs/sandboxes/<name>/<branch>` 依然留存，通过 `git branch <local> refs/sandboxes/<name>/<branch>` 即可恢复。最后一次抓取之后做出的提交会随沙箱丢失，因此在 `sbx rm` 之前必须先执行 fetch。
- **Level 4:** 克隆模式留下了哪项安全敞口，如何封堵？ Expected: 读取风险；未被跟踪的文件（如 `.env`）通过只读挂载依然完全可见，因此应将其移出仓库目录，或只挂载更狭窄的代码子目录。

## Wrong answers

- "`git status` 会把新增的钩子显示出来。" 位于 `.git/` 内部的文件不属于工作区文件；`status` 和 `diff` 都不会列出它们。
- "以 `:ro` 挂载仓库并允许 Agent 提交。" 只读挂载会同时封死 Agent 本身正常的 git commit 行为；克隆模式赋予其可写的独立克隆同时将宿主机保持为只读。
- "使用 `--branch` 让 Agent 在分支上工作。" 该标志早已被废弃移除，现在使用会报错并提示改用 `--clone`。

## Taught in

[克隆模式章节](../../../manuals/docker-sandboxes-101/sections/3-2-clone-and-run-sandbox-source.md)记录了被拒绝的推送、两条引用规范以及销毁后存留的引用。
