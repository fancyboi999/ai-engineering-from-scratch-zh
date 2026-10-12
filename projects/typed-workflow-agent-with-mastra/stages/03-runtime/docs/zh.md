# 在副作用前挂起，并统计失败尝试

> 返回结果的 lookup 一次调用就完成。工具两次返回空文本，在两次调用后失败。未经批准的 write 返回检查点且调用次数为零；用 approved=true 恢复该检查点，会执行原始 query。

**类型：** Build
**阶段：** 第 3 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 实用边界

在共享调用预算和每动作重试上限下执行注入工具。失败调用消耗预算。未经批准的 write 在任何工具调用前返回 suspended 及独立的计划副本。空工具输出视为失败，因为它没有可用答案。

```figure
pj-typed-workflow-agent-with-mastra-3
```

## 分析例子

返回结果的 lookup 一次调用就完成。工具两次返回空文本，在两次调用后失败。未经批准的 write 返回检查点且调用次数为零；用 approved=true 恢复该检查点，会执行原始 query。

编码前写下返回字段和预期副作用次数。保留第二个应失败的输入，避免成功示例变成硬编码答案。

## 构建契约

在学习者工作区实现 `executePlan(plan, tool, options), runTicket(raw, tool, options) in main.ts`。保留导出的名称，继续使用前面阶段，而不是重复其策略。

从零实现的运行时在内存中工作，工具调用期间没有崩溃恢复。CLI 使用的工具明确是本地模拟。真实写入需要幂等键，因为网络可能在远程系统已应用动作、响应尚未到达时失败。

## 提示

注入一个记录每次调用的工具。同时断言返回状态与实际调用列表。进入循环前校验预算。区分 suspended 与 failed，让审查队列恢复工作，而不是重试错误。

## 验证

```bash
python3 scripts/project_test.py typed-workflow-agent-with-mastra --init my-typed-workflow-agent-with-mastra
python3 scripts/project_test.py typed-workflow-agent-with-mastra --stage 3 --path my-typed-workflow-agent-with-mastra --strict
```

只初始化一次。累积测试导入工作区，保留之前的源文件。参考方案运行验证教学实现，绝不授予学习者证书。可选 SDK 检查需要项目 README 中的依赖与命令。

## 检查结果

为什么失败调用也必须计入预算？哪些证据能区分挂起的工作流与已经完成、但响应丢失的写入？

完整项目产生从零实现的 HTML/JSON 工作流审查，以及存储于 SQLite、带有计划绑定批准文档的真实 Mastra 运行。

```bash
cd projects/typed-workflow-agent-with-mastra/solution
node --experimental-strip-types cli.ts --ticket fixtures/ticket.json --out workflow-output
```

用自己工作流中的小型输入替换 fixture。预期结果与观察证据放在一起，再保留独立案例集用于评估。provider 请求测试证明序列化和控制流，不证明模型质量。

## 主要参考资料

[官方 API 文档](https://mastra.ai/docs/workflows/suspend-and-resume)。实现、策略选择和示例均为原创。
