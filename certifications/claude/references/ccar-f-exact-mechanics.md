# CCAR-F 精确机制复习

> 在理解架构后，将此文档用作带日期的查阅演练。它不能替代亲手构建工作流。

**指南：** Claude Certified Architect - Foundations，版本 1.0
**指南生效时间：** 2026 年 7 月
**已核验：** 2026-08-18

公开的 CCAR-F 指南考查持久的判断力和精确的操作机制。
本复习汇集指南中具名的接口，帮助你区分正确设计与看似合理的命令、路径或字段。发布前，请始终根据当前官方指南和文档重新核对每一项。

## 代理循环与会话状态

| 机制 | 需要记住的内容 | 决策边界 |
|---|---|---|
| `stop_reason: "tool_use"` | 执行请求的工具，追加匹配的结果，然后继续 | 不要根据自然语言短语推断循环状态 |
| `stop_reason: "end_turn"` | 模型已抵达正常的终止回合 | 生产环境还要处理错误、限制、取消和其他终止状态 |
| 工具结果标识 | 针对原始工具使用标识返回每一项结果 | 不要按数组位置关联并发结果 |
| 对话状态 | 保留下一次请求所需的内容块 | 将持久事实提取到有损摘要之外 |
| `--resume <session-name>` | 继续一个已命名的先前会话 | 当旧工具观察结果过期时，用明确摘要重新开始 |
| `fork_session` | 从共享基线分支出独立探索 | 当不同方法不应相互污染时，使用独立分支 |

## 工具选择与结构化输出

| 机制 | 含义 |
|---|---|
| `tool_choice: "auto"` | 模型可以调用工具，也可以返回文本 |
| `tool_choice: "any"` | 模型必须调用所提供工具中的一个 |
| `tool_choice: {"type":"tool","name":"..."}` | 必须选择具名工具 |
| 严格 JSON Schema | 降低语法和形状失败；仍需进行语义验证 |
| Pydantic 验证 | 这是形状和领域检查的 Python 实现选项，不证明提取出的事实为真 |

仅当工作流确实要求先执行该类型化操作时，才使用强制选择。它不能笼统替代编排、授权或语义验证。

## MCP 配置

| 范围或行为 | 公开指南中的机制 |
|---|---|
| 共享项目服务器 | 受版本控制的 `.mcp.json` |
| 个人或实验性服务器 | `~/.claude.json` |
| 密钥 | 使用 `${GITHUB_TOKEN}` 等环境变量展开；绝不提交实际值 |
| 发现 | 已配置服务器的工具会在连接时被发现 |
| 资源 | 当通过重复工具调用浏览内容目录和模式会造成浪费时，应将其暴露出来 |

当前 MCP 传输和部署细节见第 11 课。将 stdio 和 Streamable HTTP 视为当前传输方式，将旧版 HTTP+SSE 视为已弃用。

## Claude Code 团队配置位置

| 配置位置 | 精确复习点 |
|---|---|
| 项目命令 | `.claude/commands/` |
| 个人命令 | `~/.claude/commands/` |
| 技能 | `.claude/skills/<skill-name>/SKILL.md` |
| 技能前置元数据 | 指南中列出 `context: fork`、`allowed-tools` 和 `argument-hint` |
| 条件规则 | 位于 `.claude/rules/` 的 Markdown，并在 YAML 前置元数据中使用 `paths` 通配模式 |
| 非交互式运行 | `-p` 或 `--print` |
| 机器可读的 CI | 使用 `--output-format json`，并携带 `--json-schema` |

范围是答案的一部分。一条有用的指令若位于错误的用户、项目或路径特定位置，仍然是配置失败。

## 消息批处理（Message Batches）

2026 年 7 月指南列出以下考试参考事实：

- 相较标准处理节省 50% 成本。
- 最长 24 小时的处理窗口，且不提供有保证的延迟 SLA。
- 使用 `custom_id` 关联请求和结果。
- 一个批处理请求中不支持多轮工具执行。
- 对失败项分类后，仅重新提交安全的失败项。

这些是带日期的产品事实。在将其用于实际成本或 SLA 决策前，请查阅当前的 Message Batches 文档。

## 内置工具选择

指南明确列出 Read、Write、Edit、Bash、Grep 和 Glob。请复习其边界，而非记忆流行度顺序：

- 在改动尚未检查的内容前，先用 Read。
- Edit 需要可靠匹配；只有在受控替换更安全时，才使用整文件写入。
- Grep 搜索内容；Glob 按模式查找路径。
- Bash 跨越强大的执行边界，因此需要更严格的权限、验证和沙箱控制。

## 闭卷演练

针对以上每一行：

1. 凭记忆写出精确的路径、标志、字段或状态。
2. 给出一个它是正确选择的场景。
3. 给出一个看似合理的替代方案，以及它违反的约束。
4. 在官方来源中核验该精确机制。
5. 构建或运行练习该决策的关联课程产物。

在你能解释其范围、失败模式和更安全的替代方案之前，不要把记住字符串当作掌握。

## 官方来源

- [CCAR-F 考试指南](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf)
- [Claude Code 文档](https://code.claude.com/docs/en/overview)
- [Claude Agent SDK 文档](https://code.claude.com/docs/en/agent-sdk/overview)
- [工具使用文档](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [结构化输出文档](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Message Batches 文档](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- [MCP 文档](https://modelcontextprotocol.io/docs/getting-started/intro)
