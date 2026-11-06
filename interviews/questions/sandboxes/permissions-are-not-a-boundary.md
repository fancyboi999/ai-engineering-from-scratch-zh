---
id: permissions-are-not-a-boundary
title: pwd 在某次运行中被拒，在下次运行中却执行了
card: sandboxes
kind: concept
level: 2
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer, applied-ai-engineer]
rounds: [screen, debugging]
tags: [agent-runtime, permissions, safety-mode, hooks, headless]
minutes: 8
lessons: []
manuals: [docker-sandboxes-101#s-permissions-safety-and-hooks, docker-sandboxes-101#s-docker-agent-run-new-and-doctor]
practice: []
cheatsheet: [agent-harness, agent-failure-modes]
related: [sandboxes/hypervisor-is-the-boundary]
updated: 2026-11-03
---

agent 配置文件中包含 `allow: shell:cmd=echo*` 和 `deny: shell:cmd=rm*`，并在 CI 中以 `--exec` 参数执行无人值守运行。某次调用 `pwd` 被拒绝，而在另一次运行中却成功执行了。解释裁决顺序、选择适合无人值守运行的安全模式，并说明权限控制机制无法提供什么保证。

## Short answer

工具调用的裁决顺序为：抢占式 `pre_tool_use` 钩子、随后是显式 `deny` 拒绝、随后是显式 `allow` 放行、随后是 `ask` 询问、随后是基于调用危险标签的安全模式裁决、随后是默认钩子，最后由人工用户裁决。`pwd` 未命中任何模式且携带 `safe` 标签，因此在 `strict` 模式下触发了弹窗询问，且无人值守终端将该询问直接转化为了拒绝响应；而在 `restricted` 模式下则直接予以放行。无人值守运行应当选用 `restricted` 模式，因为它放行 `safe` 级别并对 `destructive`（破坏性）和 `unknown`（未知）操作执行安全阻断。权限控制机制纯粹是由客户端强制执行的；官方文档明确指出它们旨在防范误操作，不是针对不可信 agent 的安全隔离边界，因此强隔离必须依赖沙箱虚拟化。

## Full answer

### 安全模式裁决矩阵

| 安全模式 | `safe`（安全） | `destructive`（破坏性） | `unknown`（未知） |
|---|---|---|---|
| `strict` | ask（弹窗询问） | ask（弹窗询问） | ask（弹窗询问） |
| `balanced` | allow（放行） | ask（弹窗询问） | ask（弹窗询问） |
| `restricted` | allow（放行） | deny（直接拒绝） | deny（直接拒绝） |
| `autonomous` | allow（放行） | allow（放行） | allow（放行） |

`--yolo` 标志等价于 `--safety autonomous`。完全未指定安全模式的会话沿用旧版默认行为：仅有只读工具能够免弹窗运行，其他所有工具均会弹窗询问。这也是为何在实测运行中调用 `wc -l` 依然会弹窗的原因，尽管其标签为 `safe`：因为 `shell` 工具自身声明了 `readOnlyHint: false`。

### 实测运行所揭示的现象

在没有交互式终端的情况下，三条命令先后在 `strict` 和 `restricted` 模式下执行。`echo` 在两种模式下均成功运行，因为命中放行规则。`rm -rf` 在两种模式下均被拒绝，报错提示 `Tool 'shell' is denied by permissions configuration.`（工具 shell 被权限配置拒绝）。唯独未命中任何模式的 `pwd` 在两种安全模式下表现出不同行为。Agent 文件中定义的模式与用户全局设置中的模式会合并，且任何一方的 deny 拒绝规则均无条件优先胜出。

### 钩子函数（Hook）能够与不能改变的逻辑

`command` 钩子从标准输入读取单个 JSON 对象，并在标准输出返回 JSON 应答，返回退出码 2 代表阻断，默认超时时间为 60 秒。带有 `preempt_yolo` 标记的抢占式钩子最先执行，任何安全模式或放行规则都无法绕过其作出的 deny 拒绝或 ask 询问裁决。但其给出的 allow 仅属于建议性质：实测钩子对全部三条调用均输出了 `permission_decision: allow`，而 `rm` 依然被显式 deny 拦截，且 `strict` 依然对 `pwd` 弹出了询问。由于默认开启了 `redact_secrets` 机密脱敏，每次调用都会触发运行两个内置转换钩子。当单条消息同时请求执行三条命令时，钩子会并发启动三次，且两组日志交错混杂写入，因此每条审计日志必须单次原子写入。

### 无人值守环境下的特有失效

在带有 `--exec` 且缺乏终端的环境下，`tool_call_confirmation` 询问因无人应答而自动转变为工具执行错误：`The user rejected the tool call.`（用户拒绝了工具调用），模型随后可能尝试绕道或盲目自我重试。因此无人值守任务必须采用 `restricted` 模式，并为其必须调用的工具配置显式 `allow` 放行规则。

## Follow-ups

- **Level 2:** 为什么在未指定模式时只读命令依然会弹出确认提示？ Expected: 旧版默认仅允许只读工具免弹窗，而 `shell` 工具声明了 `readOnlyHint: false`，因此其标签无法豁免弹窗。
- **Level 3:** 抢占式钩子对 `rm` 调用返回了 allow，它会被实际执行吗？ Expected: 不会；抢占式钩子的 allow 仅属于参考建议，显式 deny 模式依然会坚决阻断该调用。
- **Level 3:** 你的钩子日志出现了交错错乱的半行内容，发生了什么？ Expected: 单条消息并发触发了多个钩子实例同时写入；每次追加日志记录必须以单次写入操作完成。
- **Level 4:** `restricted` 模式留下了哪些未防护的敞口？ Expected: 任何不经过该运行时的操作、危险标签打错的工具，以及宿主机系统本身；必须将 Agent 放入隔离沙箱中运行以实现真正的强隔离。

## Wrong answers

- "`restricted` 是安全隔离边界，因此宿主机是安全的。" 文档明确将其定性为防范非预期调用的额外防护层，且仅由客户端负责执行。
- "在 CI 中使用 `autonomous` 模式以避免任何阻塞。" 它会同时放行 `destructive` 破坏性操作；`restricted` 能够对破坏性操作执行安全阻断。
- "钩子可以强行放行被 `deny` 拦截的调用。" 任何一方的 deny 均优先胜出，且钩子的 allow 仅仅属于建议。

## Taught in

[权限章节](../../../manuals/docker-sandboxes-101/sections/5-5-permissions-safety-and-hooks.md)记录了两种模式与钩子输入，[运行章节](../../../manuals/docker-sandboxes-101/sections/5-1-docker-agent-run-new-and-doctor.md)展示了无人值守下确认弹窗转变为拒绝响应的全过程。
