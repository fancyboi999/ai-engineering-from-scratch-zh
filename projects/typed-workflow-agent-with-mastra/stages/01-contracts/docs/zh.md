# 在运行时校验类型化步骤输入

> Find the workshop policy 产生 read 意图。Update the workshop label 产生 write 意图。空白 ID 在选工具之前失败。unchanged 内的 change 不匹配变更动词的单词边界。

**类型：** Build
**阶段：** 第 1 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 实用边界

TypeScript 类型不能校验 JSON 文件。要求 ID 和 message 非空，修剪两者，并拒绝超过 10000 字符的消息。然后用显式变更动词 update、delete、change 和 cancel 作为教学意图基线。分类器的限制要保持可见。

```figure
pj-typed-workflow-agent-with-mastra-1
```

## 分析例子

Find the workshop policy 产生 read 意图。Update the workshop label 产生 write 意图。空白 ID 在选工具之前失败。unchanged 内的 change 不匹配变更动词的单词边界。

编码前写下返回字段和预期副作用次数。保留第二个应失败的输入，避免成功示例变成硬编码答案。

## 构建契约

在学习者工作区实现 `parseTicket(raw), classify(raw) in main.ts`。保留导出的名称，继续使用前面阶段，而不是重复其策略。

所选工具决定后续批准要求。词表不能授权现实操作，也不能可靠推断每种自然语言意图。输出是类型化分类，包含原始校验后的 ticket、intent 和 topic。

## 提示

写一张短语表，暴露误报与漏报。运行时输入类型与分类行为分开测试。Node 去除 TypeScript 注解，不会替你做静态类型检查。

## 验证

```bash
python3 scripts/project_test.py typed-workflow-agent-with-mastra --init my-typed-workflow-agent-with-mastra
python3 scripts/project_test.py typed-workflow-agent-with-mastra --stage 1 --path my-typed-workflow-agent-with-mastra --strict
```

只初始化一次。累积测试导入工作区，保留之前的源文件。参考方案运行验证教学实现，绝不授予学习者证书。可选 SDK 检查需要项目 README 中的依赖与命令。

## 检查结果

哪些校验属于传输边界，哪些决定属于工具能力检查？

完整项目产生从零实现的 HTML/JSON 工作流审查，以及存储于 SQLite、带有计划绑定批准文档的真实 Mastra 运行。

```bash
cd projects/typed-workflow-agent-with-mastra/solution
node --experimental-strip-types cli.ts --ticket fixtures/ticket.json --out workflow-output
```

用自己工作流中的小型输入替换 fixture。预期结果与观察证据放在一起，再保留独立案例集用于评估。provider 请求测试证明序列化和控制流，不证明模型质量。

## 主要参考资料

[官方 API 文档](https://mastra.ai/docs/workflows/suspend-and-resume)。实现、策略选择和示例均为原创。
