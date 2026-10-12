# permissions、--safety 与 hooks

> deny、allow、ask 模式，随后安全模式与 hooks 决定工具是否运行；文档说它们都不是安全边界。

agent 在 CI 用 `--exec` 运行，无人看终端。你希望 `echo` 运行，`rm` 永不运行，其余调用除非标签为 `safe` 都失败关闭。agent 文件加一个 flag 能表达它，但只对经 `docker-agent` 的调用有效。

读完本节，你能写 `permissions` 模式，为无人值守运行选 `--safety`，并预测 `pre_tool_use` hook 的影响。

```rule
label: 权限不是什么
source: docs-agent Permissions
---
"Permissions are enforced client-side. They help prevent accidental operations but should not be relied upon as a security boundary for untrusted agents."
```

引文释义：权限在客户端执行，可防止误操作，但不能作为不可信 agent 的安全边界。

同页说 `restricted` “is defense in depth against unwanted tool calls, not a security boundary” {{docs-agent Permissions}}，只是防止非预期工具调用的纵深防御，不是安全边界。隔离应使用沙箱，见 [docker-agent run --sandbox](#s-docker-agent-run-sandbox-end-to-end)。

## 受控 agent {#s-permissions-safety-and-hooks-the-guarded-agent}

```listing
title: 一个 shell 工具集、一个 hook 与两个模式
source: capture/fixtures/agents/guarded.yaml
lang: yaml
note: models 块已截去。
---
version: "16"

agents:
  root:
    model: local
    description: Runs shell commands under a permission list and a hook.
    instruction: |
      Run exactly the shell commands the user lists, one tool call per
      command, in the given order. Then report each command and its
      result or refusal in one line each.
    max_iterations: 8
    toolsets:
      - type: shell
    hooks:
      pre_tool_use:
        - matcher: shell
          preempt_yolo: true
          hooks:
            - type: command
              command: ./fixtures/hooks/log-hook.sh
              env:
                M101_HOOK_LOG: ./work/hook-stdin.jsonl

permissions:
  allow:
    - "shell:cmd=echo*"
  deny:
    - "shell:cmd=rm*"
…
```

**权限模式：** 工具名 glob，可带参数条件，如 `shell:cmd=rm*`，位于 `allow`、`ask` 或 `deny` 列表。文件与用户配置 `settings.permissions` 的模式合并，任一侧拒绝都优先 {{docs-agent Permissions}}。

**安全模式：** 无权限模式匹配时的处理方式。运行时读取 `safe`、`destructive` 或 `unknown` 标签，再按模式决定 {{docs-agent Permissions}}：

| 模式 | `safe` | `destructive` | `unknown` |
|---|---|---|---|
| `strict` | 询问 | 询问 | 询问 |
| `balanced` | 允许 | 询问 | 询问 |
| `restricted` | 允许 | 拒绝 | 拒绝 |
| `autonomous` | 允许 | 允许 | 允许 |

`--yolo` 等于 `--safety autonomous` {{help-agent docker-agent run}}。从未选模式的会话保留“the historical default: read-only tools auto-approve, everything else asks” {{docs-agent Permissions}}，只读自动批准，其余询问。因此[run、new 与 doctor](#s-docker-agent-run-new-and-doctor) 的 `wc -l` 即使标签 `safe` 仍询问，因为 `shell` 带 `readOnlyHint: false`。

## 两种模式下的三次调用 {#s-permissions-safety-and-hooks-three-calls-in-two-modes}

套件在 `--safety strict` 与 `--safety restricted` 下发送同样三条消息，每条一个命令，没有终端回答提示。

| 命令 | 决定因素 | `strict` | `restricted` |
|---|---|---|---|
| `echo m101-ok` | `allow: shell:cmd=echo*` | 执行，`m101-ok` | 执行，`m101-ok` |
| `pwd` | 无模式匹配，标签 `safe` | 询问，随后 "The user rejected the tool call." | 执行，`$CAPTURE` |
| `rm -rf work/m101-nothing` | `deny: shell:cmd=rm*` | "Tool 'shell' is denied by permissions configuration." | 相同拒绝 |

两种模式下权限模式相同，只有未匹配 `pwd` 改变。`restricted` 允许 `safe`；`strict` 发出 `tool_call_confirmation`，无终端转为拒绝（`20-strict.txt`、`20-restricted.txt`）。

## 判断顺序与 hook 能改什么 {#s-permissions-safety-and-hooks-the-order-and-what-a-hook-can-change}

文档给出每次调用的统一顺序 {{docs-agent Permissions}}：

1. `preempt_yolo` 的 `pre_tool_use` hooks 先运行，任何模式或允许规则都不能绕过其拒绝或询问。
2. `deny` 模式阻止调用。
3. `allow` 模式批准调用。
4. `ask` 模式询问用户。
5. 无匹配时按标签应用安全模式。
6. 模式决定询问时，默认 `pre_tool_use` hooks 可允许、拒绝或询问。
7. 仍无决定则询问用户。

**Hook：** 指定事件运行的 `command`、`builtin`、`model` 或 `evaluator` 条目 {{schema HookDefinition}}。`command` hook 从 stdin 读一个 JSON 对象，可向 stdout 回 JSON。退出码2阻止，默认超时60秒 {{docs-agent Hooks}}。

```listing
title: rm 调用时 hook 收到什么
source: capture/out/20-hook-stdin.jsonl
lang: jsonl
note: 三行中的第三行；restricted 每次调用各一行。
---
{"agent_name": "root", "cwd": "$CAPTURE", "hook_event_name": "pre_tool_use", "safety_policy": "restricted", "session_id": "<uuid>", "tool_input": {"cmd": "rm -rf work/m101-nothing"}, "tool_name": "shell", "tool_use_id": "<call-id>"}
```

`log-hook.sh` 将该行追加到文件，并输出 `"permission_decision":"allow"`。事件流中三个调用都出现 `pre_tool_use_pre_yolo` 和 `"allowed": true`，但 `rm` 仍被拒绝，strict 的 `pwd` 仍询问。抢先 hook 的“an allow verdict is advisory” {{schema HookMatcherConfig}}，允许只是建议；拒绝或询问才会结束判断。

每次调用还有两个 hooks：流中出现 `tool_input_transform` 和 `tool_response_transform`，即使没有文件声明。默认 `true` 的 `redact_secrets` 在这些事件安装内置 hook {{schema AgentConfig}}。hook 也可同时运行多次：一条消息请求三个命令时并行运行三次，其中两次同时追加日志（`capture/README.md`）。每条记录用一次 write 写入。

```figure
id: fig-5-5
kind: decision
title: 三次 shell 调用经过批准顺序
claim: 抢先 hook 对所有调用的允许仅为建议；权限模式决定 `rm` 与 `echo`，安全模式独自决定 `pwd`。
caption: 从上向下读。问题框表示判断阶段，右侧框为录制结果。玫红表示拒绝，橄榄色为已执行命令。来源为 capture/fixtures/agents/guarded.yaml、capture/out/20-strict.ndjson、20-restricted.ndjson 和 20-hook-stdin.jsonl。
```

```takeaways
- 无人值守用 `--safety restricted`，未匹配且非 safe 的调用失败关闭。
- 破坏性命令放入 `deny`；任何模式与 hook 允许都不能覆盖拒绝。
- `preempt_yolo` hook 用于拒绝或询问，不用于授权。
- 不信任 agent 时放进沙箱；权限判断在客户端运行。
```

Sources: docs-agent Permissions, Hooks (research/sources/docs-docker-agent.md, pages configuration/permissions, configuration/hooks); schema AgentConfig, HookMatcherConfig, HookDefinition (research/sources/agent-schema.json); help-agent docker-agent run (research/sources/help-docker-agent.md); capture/README.md; capture/fixtures/agents/guarded.yaml; capture/fixtures/hooks/log-hook.sh; capture/out/18-transcript.txt, 20-strict.txt, 20-strict.ndjson, 20-restricted.txt, 20-restricted.ndjson, 20-hook-stdin.jsonl
