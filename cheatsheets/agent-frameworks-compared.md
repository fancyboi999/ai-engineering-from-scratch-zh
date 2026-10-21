---
id: agent-frameworks-compared
title: agent 框架对比
code: AC
subtitle: 根据问题形态、状态和路由成本，选择 LangGraph、CrewAI、AutoGen、Agno、Mastra、agent SDK 或原生 Python。
hue: 280
sources: phases/11-llm-engineering/17-agent-framework-tradeoffs, phases/14-agent-engineering/14-autogen-actor-model, phases/14-agent-engineering/15-crewai-role-based-crews, phases/14-agent-engineering/16-openai-agents-sdk, phases/14-agent-engineering/17-claude-agent-sdk, phases/14-agent-engineering/18-agno-and-mastra-runtimes, projects/typed-workflow-agent-with-mastra, projects/support-agent-with-google-adk
source_hash: 238b7ef721723713
---

## 编排框架对比
type: comparison
span: 2
from: phases/11-llm-engineering/17-agent-framework-tradeoffs/docs/zh.md

| 维度 | LangGraph | CrewAI | AutoGen | Agno |
|---|---|---|---|---|
| 核心抽象 | `StateGraph` | `Crew` | `ConversableAgent` 对 | `Agent` |
| 理解方式 | 状态机 | 专家团队 | 聊天 | 功能齐全的 agent |
| 状态 | 类型化状态、检查点保存器 | 经 `context` 传递字符串 | 聊天历史 | 经 `storage=` 存储会话 |
| 分支决策者 | 你，通过条件边 | 管理者，或构建时由你决定 | agent，通过聊天 | 下一次工具调用 |
| 路由 token | 仅用于你编写的 `llm.invoke` | 分层管理者消耗 token | `GroupChatManager` 消耗 token | 精简的单 agent 路径 |
| 最适合 | 类型化状态、人工中断 | 简短的角色驱动计划 | 提议者与批评者对话 | 单 agent、会话、记忆 |
| 最不适合 | 未知拓扑 | 复杂分支 | 已知 DAG、持久状态 | 深层分支图 |

## agent SDK 与运行时对比
type: comparison
span: 2
from: phases/14-agent-engineering/14-autogen-actor-model/docs/zh.md, phases/14-agent-engineering/16-openai-agents-sdk/docs/zh.md, phases/14-agent-engineering/17-claude-agent-sdk/docs/zh.md, phases/14-agent-engineering/18-agno-and-mastra-runtimes/docs/zh.md

| 维度 | OpenAI Agents SDK | Claude Agent SDK | AutoGen v0.4 | Mastra |
|---|---|---|---|---|
| 基本组件 | agent、交接、护栏、会话、追踪 | 工具、MCP、钩子、子 agent、会话存储 | Core、AgentChat、Extensions | agent、工具、工作流 |
| 委派 | 名为 `transfer_to_<agent_name>` 的工具 | 具有独立上下文的子 agent | 发到 actor 收件箱的消息 | 工作流步骤 |
| 状态 | SQLite、Redis 或自定义 `Session` | `append`、`load`、级联 `delete` | actor 私有状态 | 组合存储 |
| 追踪 | 默认开启 | W3C 追踪上下文传入 CLI | 每条消息一个 span | Mastra Studio |
| 适用场景 | 以 OpenAI 为主的产品 | 以 Claude 为主的产品 | actor 并发、故障隔离 | TypeScript、Next.js 或 Vercel |

## 选择条件
type: concepts
from: phases/11-llm-engineering/17-agent-framework-tradeoffs/docs/zh.md, phases/14-agent-engineering/15-crewai-role-based-crews/docs/zh.md, phases/14-agent-engineering/18-agno-and-mastra-runtimes/docs/zh.md

- **LangGraph**：类型化状态、审批、恢复、`Send` 扇出。
- **CrewAI**：在某一步调用 `Crew.kickoff()` 的 Flow。
- **AutoGen**：提议者与批评者对话。
- **Agno**：大量短生命周期 Python agent、FastAPI。
- **Mastra**：TypeScript、Next.js 或 Vercel，以及 Zod 类型化工具。
- **原生 Python**：两次 LLM 调用加一个工具。

## 决策树：recommend(p)
type: flow
from: phases/11-llm-engineering/17-agent-framework-tradeoffs/code/main.py

1. **plain python**：`total_llm_calls` 不超过 2。无角色、对话、恢复、扇出或人工中断。
2. **langgraph**：具有 `needs_resume`、`needs_human_interrupt` 或 `has_parallel_fanout`。
3. **autogen**：具有 `has_dialogue`，没有 `has_typed_state`。
4. **crewai**：具有 `has_roles`，没有 `has_typed_state`。
5. **agno**：具有 `needs_session_memory`，无角色、无对话。
6. **langgraph**：具有 `has_typed_state`，也作为默认选择。

## actor 运行时（AutoGen v0.4 形态）
type: architecture
from: phases/14-agent-engineering/14-autogen-actor-model/code/main.py, phases/14-agent-engineering/14-autogen-actor-model/docs/zh.md

```arch
node | user | 1,1 | __user__ | 发送 start | client
node | queue | 2,1 | 运行时队列 | 消息双端队列 | queue
node | check | 3,1 | ChecklistAgent | 发送三次 review | process
node | dlq | 1,2 | dead_letters | 失败消息 | store
node | rev | 3,2 | ReviewerAgent | 发送 review_result | process
edge | user | queue | send
edge | queue | check | start
edge | check | queue | review
edge | queue | rev | review
edge | rev | queue | review_result
edge | rev | dlq | crash_me 抛出异常
```

## SDK 代码任务
type: task-table
from: phases/11-llm-engineering/17-agent-framework-tradeoffs/code/main.py, phases/14-agent-engineering/15-crewai-role-based-crews/docs/zh.md, phases/14-agent-engineering/16-openai-agents-sdk/docs/zh.md, phases/14-agent-engineering/17-claude-agent-sdk/docs/zh.md

| 任务 | 代码 |
|---|---|
| 向推荐器提问 | `python main.py --ask` |
| 交接给 agent | `transfer_to_<agent_name>` |
| 关闭追踪 | `OPENAI_AGENTS_DISABLE_TRACING=1` |
| 将 span 分发到自有后端 | `add_trace_processor(processor)` |
| 使用已存历史运行 | `Runner.run(agent, input, session=session)` |
| 强制任务输出采用指定类型 | `output_pydantic=MyModel` |
| 列出子 agent 会话 | `list_subkeys(session_id)` |

## 在 Mastra 中挂起与恢复
type: annotated-code
lang: typescript
from: projects/typed-workflow-agent-with-mastra/solution/optional-mastra/adapter.ts, projects/typed-workflow-agent-with-mastra/solution/optional-mastra/cli.ts

```typescript
const workflow = createWorkflow({ id: "ticket-triage", inputSchema: ticketSchema, outputSchema: resultSchema })
  .then(classifyStep)                    // 意图为读取或写入
  .then(planStep)                        // 查询或更新操作
  .then(executeStep)                     // 更新前挂起
  .commit();
if (!resumeData?.approved)
  return suspend({ ticketId: plan.ticket.id, planHash: digest });  // digest = planHash(plan)
const { workflow, storage } = await persistentWorkflow(tool, "file:" + resolve(args["--db"]));
const run = await workflow.createRun({ runId: args["--resume"] });  // 新进程，同一文件
result = await run.resume({ step: "execute", resumeData });  // approved、ticketId、planHash
```

## 运行项目
type: command-table
span: 2
from: projects/typed-workflow-agent-with-mastra/README.md, projects/support-agent-with-google-adk/README.md

| 命令 | 作用 |
|---|---|
| `python3 scripts/project_test.py <project> --stage 1 --path <dir> --strict` | 评测一个阶段 |
| `python3 scripts/project_test.py <project> --all --solution --optional --strict` | 运行真实 SDK 测试。SKIP 也视为失败 |
| `node --experimental-strip-types cli.ts --ticket fixtures/ticket.json --out workflow-output` | 从零实现的工作流。需要批准时写入检查点 |
| `node --experimental-strip-types optional-mastra/cli.ts --ticket fixtures/ticket.json --db ./runs.db --out pending-output` | 持久化 Mastra 运行，报告 runId |
| `python3 main.py --ticket fixtures/ticket.json --out support-output` | 在 index.html 中离线审核支持工单 |
| `main.py --ticket YOUR_TICKET.json --adk --out support-adk-output` | 通过真实 ADK agent 处理同一工单 |

## 项目的构建与检查内容
type: concepts
from: projects/typed-workflow-agent-with-mastra/README.md, projects/typed-workflow-agent-with-mastra/project.json, projects/typed-workflow-agent-with-mastra/solution/main.ts, projects/support-agent-with-google-adk/README.md, projects/support-agent-with-google-adk/project.json, projects/support-agent-with-google-adk/solution/intake.py

- **Mastra 构建内容**：类型化审批工作流。更新前挂起，从 SQLite 恢复。
- **Mastra 输出**：`workflow.json`，以及 approved=false 的 `approval.json`。
- **Mastra 检查**：审批匹配时调用工具一次。hash 错误时不调用。
- **ADK 构建内容**：脱敏支持回复或升级人工处理，然后在真实 ADK agent 中应用同样的规则。
- **ADK 输出**：HTML 审核页和 `support.json`。
- **ADK 检查**：发票登录同时涉及计费与访问，因此升级人工处理。

## 默认值与限制
type: defaults
from: phases/14-agent-engineering/14-autogen-actor-model/code/main.py, phases/14-agent-engineering/15-crewai-role-based-crews/code/main.py, phases/14-agent-engineering/16-openai-agents-sdk/code/main.py, phases/14-agent-engineering/16-openai-agents-sdk/docs/zh.md, projects/typed-workflow-agent-with-mastra/solution/main.ts

| 设置 | 默认值 | 说明 |
|---|---|---|
| Runner `max_hops` | 3 | 用跳数计数器防止交接漂移 |
| 运行时 `max_messages` | 100 | 每次 `run_until_idle` 的消息数 |
| HierarchicalCrew `max_steps` | 5 | 停止前的管理者轮数 |
| 护栏模式 | 并行 | 尾延迟更低，触发护栏时会浪费 token |
| `executePlan` `maxCalls` | 3 | 允许范围 1 至 100 |
| `executePlan` `maxAttempts` | 2 | 允许范围 1 至 10 |

## 故障排查
type: troubleshooting
from: phases/14-agent-engineering/15-crewai-role-based-crews/docs/zh.md, phases/14-agent-engineering/16-openai-agents-sdk/docs/zh.md, phases/14-agent-engineering/17-claude-agent-sdk/docs/zh.md, phases/14-agent-engineering/18-agno-and-mastra-runtimes/docs/zh.md, projects/typed-workflow-agent-with-mastra/README.md

| 现象 | 原因 | 修正 |
|---|---|---|
| A 交给 B，B 又交回 A | 交接漂移 | 添加跳数计数器 |
| 内置工具跳过检查 | 工具护栏只对函数工具触发 | 添加独立策略 |
| 任务 N+1 根据自由文本随意发挥 | 交接脆弱 | 在任务 N 上设置 `output_pydantic` |
| Crew 消耗过多 token | 管理者 LLM 的 token 开销 | 切换为 Sequential |
| 首次工具调用前上下文已耗尽 | 背景故事过长 | 将背景故事控制在 200 词以内 |
| 小任务的开销占主导 | 生成过多子 agent | 批量处理任务 |
| 会话无限增长 | 会话膨胀 | 使用 `list_sessions` 和过期策略 |
| 工具调用前恢复失败 | 审批中的工单或摘要错误 | 保持 ticketId 和 planHash 不变 |

## 问答
type: qa
from: phases/14-agent-engineering/14-autogen-actor-model/docs/zh.md, phases/14-agent-engineering/16-openai-agents-sdk/docs/zh.md, phases/14-agent-engineering/18-agno-and-mastra-runtimes/docs/zh.md, phases/11-llm-engineering/17-agent-framework-tradeoffs/docs/zh.md, projects/support-agent-with-google-adk/solution/adk_adapter.py

- **为什么交接是一种工具？** 模型调用 `transfer_to_billing_agent`，运行时切换 agent。
- **actor 为什么能隔离故障？** `send(agent_b, msg)` 只负责入队。运行时捕获处理器崩溃。
- **模型能改变 ADK 路由吗？** 不能，会抛出 `ValueError`。
