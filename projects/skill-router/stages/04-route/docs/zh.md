# 对歧义或受阻请求放弃选择

**第 4 阶段，共 4 阶段。** TypeScript。预计约 2 小时。

结合排名与依赖规划，同时保留四种不同结果：ready、no-match、ambiguous 和 blocked。分数差小于 margin 时，即使平局规则排出了第一名，也仍是 ambiguous。排名胜者仍可能被权限阻止。每种结果都返回排名解释，供调用者显示决定。

本阶段的边界是 `route`。保留前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

```figure
pj-skill-router-4
```

## Orchard 案例分析

开始编码前，复习 [TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和 [工具 schema 设计](../../../../../phases/13-tools-and-protocols/05-tool-schema-design/docs/zh.md)。先完成[第 3 阶段](../../03-dependencies/docs/zh.md)。

当两个技能得分过于接近，或选中的计划要求不可用权限时，放弃选择。解释路由为何停止，比任意选一个胜出技能更有用。

```text
publish request -> release-publish score 2
allowed=[read]; publish requires network
status=blocked, no execution plan
```

## 构建与检查

在依赖规划之前应用分差阈值。排名是选择的证据，不是执行工具的授权。

在学习者工作区实现本阶段。CLI 辅助程序是提供的适配器，会导入你的函数，不会用参考方案替代。

```bash
python3 scripts/project_test.py skill-router --stage 4 --path learning-artifacts/skill-router
```

累积阶段通过后，从仓库根目录在原始样本输入上运行你的产物：

```bash
node learning-artifacts/skill-router/cli.ts projects/skill-router/examples/skills projects/skill-router/examples/request.json
```

SKILL.md 提供标准的 name 和 description；routing.json 是本项目文档说明的本地扩展。路由器输出计划与解释，从不执行选中的技能。关键词分词是 ASCII 词法基线；示例中的英文 SKILL.md 保留为固定的 ASCII 路由实验输入，多语言路由模型属于扩展。

## 继续探究

如何调整一个有歧义的关键词，又不对示例请求过拟合？
