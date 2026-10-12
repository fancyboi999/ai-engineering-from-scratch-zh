# 统计独立会话

**第 2 阶段，共 4 阶段。** TypeScript。预计约 2 小时。

按 scope 和保留大小写、规范空白的规则文本分组。对事件 id 去重，拒绝用相同 id 携带不同内容。统计独立会话，而非事件数，避免重复 hook 投递提升规则。保留与候选规则关联的每个 source id，排序最终输出，让文件可复现。

本阶段的边界是 `consolidate`。保留前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

```figure
pj-workflow-hooks-2
```

## Orchard 案例分析

开始编码前，复习 [TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和 [仓库记忆与状态](../../../../../phases/14-agent-engineering/34-repo-memory-and-state/docs/zh.md)。先完成[第 1 阶段](../../01-corrections/docs/zh.md)。

重复投递不是独立证据。同一会话中的两个不同纠正，仍只贡献一个支持会话。保留候选规则的摘录与定位符，让 source id 以后仍可解析。

```text
events a1,a2 from session A -> sessions=[A]
event b1 from session B -> sessions=[A,B]
rule remains candidate until approval
```

## 构建与检查

用完整校验后的内容对事件 id 去重。冲突地复用 id 必须失败，不能默默替换来源。

在学习者工作区实现本阶段。CLI 辅助程序是提供的适配器，会导入你的函数，不会用参考方案替代。

```bash
python3 scripts/project_test.py workflow-hooks --stage 2 --path learning-artifacts/workflow-hooks
```

先预测上面的中间状态，再运行本阶段。全新桩代码会失败；参考方案运行通过并不能证明你的学习者工作区已完成。

## 继续探究

为什么 API_KEY 和 api_key 规则应保留为不同候选？
