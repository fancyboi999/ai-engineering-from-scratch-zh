# 记录带来源的纠正

**第 1 阶段，共 4 阶段。** TypeScript。预计约 2 小时。

要求 correction id、session id、scope、rule 和源摘录。规范 scope，同时保留规则大小写与源证据。拒绝过大的值和明显形似凭据的内容。这种启发式不是完整的密钥扫描器：调用者必须在摄取前对源数据脱敏。

本阶段的边界是 `normalize, ingest`。保留前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

```figure
pj-workflow-hooks-1
```

## Orchard 案例分析

开始编码前，复习 [TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和 [仓库记忆与状态](../../../../../phases/14-agent-engineering/34-repo-memory-and-state/docs/zh.md)。

纠正是来自特定会话与源定位符的证据。规则中保留 API_KEY 的精确大小写；大小写折叠会把有用指令变成自相矛盾的指令。

```text
rule: Read API_KEY; never rename it to api_key.
scope: Orchard -> orchard
source locator: local:orchard/config.py:12
```

## 构建与检查

规范 scope 以便匹配，但规则只合并空白。明显形似凭据的数据进入持久存储前就要拒绝。

在学习者工作区实现本阶段。CLI 辅助程序是提供的适配器，会导入你的函数，不会用参考方案替代。

```bash
python3 scripts/project_test.py workflow-hooks --init learning-artifacts/workflow-hooks
python3 scripts/project_test.py workflow-hooks --stage 1 --path learning-artifacts/workflow-hooks
```

先预测上面的中间状态，再运行本阶段。全新桩代码会失败；参考方案运行通过并不能证明你的学习者工作区已完成。

## 继续探究

源摘录中哪些部分需要调用者在摄取前清理？
