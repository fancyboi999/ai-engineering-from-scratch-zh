# 技能路由器

一个路由调试器，展示错误技能为何被激活，以及如何修正规则。

通过 SKILL.md 的 name 和 description 发现技能，再将 routing.json 作为本地路由扩展读取。目录名必须与技能名一致。路由元数据不是可移植技能格式的一部分。

## 从学习者工作区开始

[工具 schema 设计](../../phases/13-tools-and-protocols/05-tool-schema-design/docs/zh.md), [验证门禁](../../phases/14-agent-engineering/38-verification-gates/docs/zh.md)。语言基础：[TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)。

使用 Node 22.18+，评分器使用 Python 3.10+。核心 TypeScript 无需安装软件包。

```bash
python3 scripts/project_test.py skill-router --init learning-artifacts/skill-router
python3 scripts/project_test.py skill-router --stage 1 --path learning-artifacts/skill-router
```

## 构建路线

1. [解析类型化技能目录](stages/01-catalog/docs/zh.md)
2. [为词语和仓库路径评分](stages/02-score/docs/zh.md)
3. [执行前解析依赖](stages/03-dependencies/docs/zh.md)
4. [对歧义或受阻请求放弃选择](stages/04-route/docs/zh.md)

## 使用自己的输入运行

完成各阶段后，这些命令会在原始 Orchard 示例上运行你的工作区代码。将样本路径换成你自己的文件。

```bash
node learning-artifacts/skill-router/cli.ts projects/skill-router/examples/skills projects/skill-router/examples/request.json
```

若想先查看完整参考方案，将同一命令中的 `learning-artifacts/skill-router` 换成 `projects/skill-router/solution`。JSON 结果使用 `schema_version: 1`；路径与参数示例都明确给出，便于其他工具消费。

## 集成边界

SKILL.md 提供标准的 name 和 description；routing.json 是本项目文档说明的本地扩展。路由器输出计划与解释，从不执行选中的技能。关键词分词是 ASCII 词法基线；示例中的英文 SKILL.md 保留为固定的 ASCII 路由实验输入，多语言路由模型属于扩展。

```bash
python3 scripts/project_test.py skill-router --all --solution --strict
python3 scripts/project_test.py skill-router --all --path learning-artifacts/skill-router --strict
```

第一条命令检查参考方案，第二条检查你的实现。发布的示例与测试是回归证据，不是生产认证或未见过的基准。

## 主要参考资料

- [Agent Skills 规范](https://agentskills.io/specification)
- [Node path API](https://nodejs.org/api/path.html)
