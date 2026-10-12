# 在计划中明确批准不变量

> requiresApproval=false 的 update 动作会失败。只有 lookup 的计划若设置 requiresApproval=true，也违反规定的表示。一到十个动作可接受；每个动作都有受支持的工具和非空 query。

**类型：** Build
**阶段：** 第 2 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 实用边界

read 分类创建 lookup；write 分类创建 update。执行时再次校验计划，因为计划可能被序列化或编辑。requiresApproval 标记必须等于是否存在 update 动作。这防止一个布尔值默默关闭门禁。

```figure
pj-typed-workflow-agent-with-mastra-2
```

## 分析例子

requiresApproval=false 的 update 动作会失败。只有 lookup 的计划若设置 requiresApproval=true，也违反规定的表示。一到十个动作可接受；每个动作都有受支持的工具和非空 query。

编码前写下返回字段和预期副作用次数。保留第二个应失败的输入，避免成功示例变成硬编码答案。

## 构建契约

在学习者工作区实现 `makePlan(classification), validatePlan(plan) in main.ts`。保留导出的名称，继续使用前面阶段，而不是重复其策略。

从零实现的检查点是本地 JSON，不是经过身份验证的授权。可选框架存储实际计划，将批准绑定到摘要和 ticket ID。摘要检测上下文不匹配，不识别是谁批准操作。

## 提示

测试有效计划，再一次修改一个字段。统计写入工具前先检查动作列表。query 保持不变，避免恢复后的工作流悄悄执行改写的请求。

## 验证

```bash
python3 scripts/project_test.py typed-workflow-agent-with-mastra --init my-typed-workflow-agent-with-mastra
python3 scripts/project_test.py typed-workflow-agent-with-mastra --stage 2 --path my-typed-workflow-agent-with-mastra --strict
```

只初始化一次。累积测试导入工作区，保留之前的源文件。参考方案运行验证教学实现，绝不授予学习者证书。可选 SDK 检查需要项目 README 中的依赖与命令。

## 检查结果

公开批准端点还需要哪些身份和访问控制？为什么只有计划哈希不够？

完整项目产生从零实现的 HTML/JSON 工作流审查，以及存储于 SQLite、带有计划绑定批准文档的真实 Mastra 运行。

```bash
cd projects/typed-workflow-agent-with-mastra/solution
node --experimental-strip-types cli.ts --ticket fixtures/ticket.json --out workflow-output
```

用自己工作流中的小型输入替换 fixture。预期结果与观察证据放在一起，再保留独立案例集用于评估。provider 请求测试证明序列化和控制流，不证明模型质量。

## 主要参考资料

[官方 API 文档](https://mastra.ai/docs/workflows/suspend-and-resume)。实现、策略选择和示例均为原创。
