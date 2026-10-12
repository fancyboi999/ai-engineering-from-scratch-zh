# 持久化真实 Mastra 批准状态并恢复

> 启动编写的 workshop 更新，观察 status=suspended，工具调用次数为零。关闭本地 LibSQL 存储，在同一个 SQLite 文件上创建新的工作流，再按 runId 恢复。匹配的批准产生 success；恢复测试中实际观察到恰好一次本地工具调用。错误哈希会失败且调用次数为零。

**类型：** Build
**阶段：** 第 4 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 实用边界

用 Zod 契约组合三个真实 Mastra 步骤：classify、plan 和 execute。update 缺少批准时，执行步骤用 ticketId、planHash、plan 和 reason 调用 Mastra suspend。恢复时，先对照存储计划校验 approved、ticketId 和 planHash，再调用共享的从零实现执行器。

```figure
pj-typed-workflow-agent-with-mastra-4
```

## 分析例子

启动编写的 workshop 更新，观察 status=suspended，工具调用次数为零。关闭本地 LibSQL 存储，在同一个 SQLite 文件上创建新的工作流，再按 runId 恢复。匹配的批准产生 success；恢复测试中实际观察到恰好一次本地工具调用。错误哈希会失败且调用次数为零。

编码前写下返回字段和预期副作用次数。保留第二个应失败的输入，避免成功示例变成硬编码答案。

## 构建契约

在学习者工作区实现 `createTicketWorkflow, planHash, persistentWorkflow in optional-mastra/adapter.ts`。保留导出的名称，继续使用前面阶段，而不是重复其策略。

默认工厂使用 InMemoryStore，便于轻量测试。persistentWorkflow 要求显式 file: URL，以及 @mastra/libsql 1.23.3、@mastra/core 1.71.0 和 Zod 4.3.6。CLI 写入 approved=false 的 approval.json。检查存储计划，显式编辑批准，再运行独立的恢复命令。否定决定仍保持挂起。

## 提示

通过 project_test.py --optional --strict 运行教师维护的可选测试。适配器调用真实 SDK 挂起和恢复；不要仅因为从零实现策略会暂停就抛错。使用返回的 run ID，绝不启动新输入来模仿恢复。

## 验证

```bash
python3 scripts/project_test.py typed-workflow-agent-with-mastra --init my-typed-workflow-agent-with-mastra
python3 scripts/project_test.py typed-workflow-agent-with-mastra --stage 4 --path my-typed-workflow-agent-with-mastra --strict
```

只初始化一次。累积测试导入工作区，保留之前的源文件。参考方案运行验证教学实现，绝不授予学习者证书。可选 SDK 检查需要项目 README 中的依赖与命令。

## 检查结果

哪些状态在进程重启后保留，哪些外部副作用仍需要幂等性？如何连接经过身份验证的审查 UI，又不信任模型批准自己的计划？

完整项目产生从零实现的 HTML/JSON 工作流审查，以及存储于 SQLite、带有计划绑定批准文档的真实 Mastra 运行。

```bash
cd projects/typed-workflow-agent-with-mastra/solution
node --experimental-strip-types cli.ts --ticket fixtures/ticket.json --out workflow-output
```

用自己工作流中的小型输入替换 fixture。预期结果与观察证据放在一起，再保留独立案例集用于评估。provider 请求测试证明序列化和控制流，不证明模型质量。

## 主要参考资料

[官方 API 文档](https://mastra.ai/docs/workflows/suspend-and-resume)。实现、策略选择和示例均为原创。
