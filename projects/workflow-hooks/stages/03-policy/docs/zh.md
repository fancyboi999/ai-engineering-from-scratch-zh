# 批准并选择限定范围的规则

**第 3 阶段，共 4 阶段。** TypeScript。预计约 2 小时。

显式转入批准状态前，要求独立会话支持。已退役规则不能默默复活。触发 hook 时，只纳入匹配当前 scope 或全局 scope 的已批准规则。注入规则文本时也返回 source id，让用户追溯持久指引来自哪里。

本阶段的边界是 `transition, hook`。保留前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

```figure
pj-workflow-hooks-3
```

## Orchard 案例分析

开始编码前，复习 [TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和 [仓库记忆与状态](../../../../../phases/14-agent-engineering/34-repo-memory-and-state/docs/zh.md)。先完成[第 2 阶段](../../02-consolidate/docs/zh.md)。

批准针对精确的候选摘要。第二份来源可能改变摘要，要求重新审查。退役规则会从输出上下文中移除，但仍保留其证据供检查。

```text
candidate -> inspect approval_digest
approve exact digest -> approved
emit orchard -> original rule + evidence
retire -> next emit omits rule
```

## 构建与检查

同时应用状态与 scope 过滤。绝不让全局候选或频繁重复的候选绕过显式批准。

在学习者工作区实现本阶段。CLI 辅助程序是提供的适配器，会导入你的函数，不会用参考方案替代。

```bash
python3 scripts/project_test.py workflow-hooks --stage 3 --path learning-artifacts/workflow-hooks
```

先预测上面的中间状态，再运行本阶段。全新桩代码会失败；参考方案运行通过并不能证明你的学习者工作区已完成。

## 继续探究

新证据到达后，用户仍提供昨天的摘要，CLI 应怎样处理？
