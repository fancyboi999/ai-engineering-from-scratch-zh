# 用 Mastra 构建类型化工作流 agent

构建类型化批准工作流，再通过真实 Mastra 步骤挂起和恢复。本地 SQLite 存储在多次独立运行之间保留待处理计划。任何 update 工具调用之前，批准必须同时指明 ticket 和计划摘要。

使用 Node 22.18 或更新版本，评分器使用 Python 3。先掌握 TypeScript 对象类型、异步函数和 JSON 运行时校验。必需的从零实现运行时没有依赖。

```bash
python3 scripts/project_test.py typed-workflow-agent-with-mastra --init my-workflow
python3 scripts/project_test.py typed-workflow-agent-with-mastra --stage 1 --path my-workflow --strict
python3 scripts/project_test.py typed-workflow-agent-with-mastra --all --solution --strict
cd projects/typed-workflow-agent-with-mastra/solution
node --experimental-strip-types cli.ts --ticket fixtures/ticket.json --out workflow-output
```

从零实现的 CLI 写入 index.html、workflow.json，并在需要批准时写入检查点。其工具明确是本地模拟，不改变任何外部账号。只有审查后才恢复保存的检查点：

```bash
node --experimental-strip-types cli.ts --checkpoint workflow-output/checkpoint.json --approved --out resumed-output
```

从零实现的运行时能重放保存的计划，但不能恢复被中断的副作用。真实写入适配器需要幂等键和经过身份验证的批准。

## 持久化 Mastra 工作流

在所选工作区根目录安装固定版本的可选依赖。从仓库根目录运行：

```bash
npm install --prefix projects/typed-workflow-agent-with-mastra/solution --ignore-scripts --package-lock=false --save-exact @mastra/core@1.71.0 zod@4.3.6 @mastra/libsql@1.23.3
python3 scripts/project_test.py typed-workflow-agent-with-mastra --all --solution --optional --strict
```

用 --prefix 和 --path 指向学习者工作区，测试自己的实现。缺少软件包会产生 SKIP；严格可选评分会失败。真实 SDK 测试检查一致性、有界失败、挂起、否定或不匹配的批准、成功恢复，以及通过新建的 SQLite 支撑工作流实例恢复。无需模型凭据。

从 solution 目录启动持久化本地运行：

```bash
node --experimental-strip-types optional-mastra/cli.ts --ticket fixtures/ticket.json --db ./runs.db --out pending-output
```

它报告 runId，写入 workflow.json 及 approved=false 的 approval.json。在报告中检查原始查询和计划。要批准这个精确计划，保留 ticketId 和 planHash，将 approved 改为 true，再启动新进程：

```bash
node --experimental-strip-types optional-mastra/cli.ts --resume RUN_ID_FROM_OUTPUT --approval pending-output/approval.json --db ./runs.db --out resumed-output
```

存储的执行步骤通过 Mastra 自身的 resume API 恢复。ticket 或摘要错误会在注入工具调用前失败。否定批准仍保持挂起。摘要绑定上下文，不绑定审查者身份；公开端点需要在此操作外围增加身份验证与授权。

默认的 createTicketWorkflow 工厂使用内存存储。persistentWorkflow 使用显式的本地 file: 数据库 URL。两者共用领域校验和调用预算。基于文件的持久化不能证明外部系统中的副作用恰好执行一次。

1. [校验类型化输入](stages/01-contracts/docs/zh.md)
2. [把批准纳入计划](stages/02-plan/docs/zh.md)
3. [挂起并统计尝试](stages/03-runtime/docs/zh.md)
4. [用 Mastra 持久化并恢复](stages/04-framework-boundary/docs/zh.md)

[官方挂起/恢复文档](https://mastra.ai/docs/workflows/suspend-and-resume)。工作流策略、代码、示例和 fixture 均为原创。
