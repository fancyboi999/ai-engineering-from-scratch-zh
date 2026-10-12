# 执行前解析依赖

**第 3 阶段，共 4 阶段。** TypeScript。预计约 2 小时。

使用深度优先遍历，分别维护 active 与 visited 集合。active 成员关系用来发现环；visited 成员关系避免菱形依赖中的重复执行。所选技能与依赖的权限要求都要校验。先输出依赖，再输出消费者；遇到未知依赖 id 时拒绝，而不是默默跳过工作。

本阶段的边界是 `plan`。保留前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

```figure
pj-skill-router-3
```

## Orchard 案例分析

开始编码前，复习 [TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和 [工具 schema 设计](../../../../../phases/13-tools-and-protocols/05-tool-schema-design/docs/zh.md)。先完成[第 2 阶段](../../02-score/docs/zh.md)。

选择 release-review，必须先有 check-tests。深度优先遍历先输出依赖，再输出所选技能，并检查整张图的权限。依赖被拒绝，就阻止整个计划。

```text
release-review requires check-tests
allowed=[read]
plan=[check-tests,release-review]
```

## 构建与检查

分别跟踪 active 和 visited 集合：active 找环，visited 防止重复执行。不要在依赖之前追加父节点。

在学习者工作区实现本阶段。CLI 辅助程序是提供的适配器，会导入你的函数，不会用参考方案替代。

```bash
python3 scripts/project_test.py skill-router --stage 3 --path learning-artifacts/skill-router
```

先预测上面的中间状态，再运行本阶段。全新桩代码会失败；参考方案运行通过并不能证明你的学习者工作区已完成。

## 继续探究

如果 check-tests 暗中要求 network 权限，会怎样？
