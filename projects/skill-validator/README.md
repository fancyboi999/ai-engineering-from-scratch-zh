# SKILL.md 验证器与加载器

解释 skill 为何在一个 agent 中可用、另一个中失败的兼容性检查器。

安装器输出带引号元数据。接受普通单行标量和 JSON 兼容双引号标量，包括转义引号和 Unicode。拒绝标签、别名、多行 YAML，不悄悄重新解释它们。

## 从学员工作区开始

[数据管理](../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)、[结构化输出](../../phases/11-llm-engineering/03-structured-outputs/docs/zh.md)。语言基础：[Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)。

安装 Rust（`rustc`）与 Python 3.10+。核心用 Rust 标准库；Python 适配器编译到私有临时目录。

```bash
python3 scripts/project_test.py skill-validator --init learning-artifacts/skill-validator
python3 scripts/project_test.py skill-validator --stage 1 --path learning-artifacts/skill-validator
```

## 构建路线

1. [解析明确的 frontmatter 子集](stages/01-parse-an-explicit-frontmatter-subset/docs/zh.md)
2. [验证名称和描述](stages/02-validate-names-and-descriptions/docs/zh.md)
3. [约束资源路径](stages/03-contain-resource-paths/docs/zh.md)
4. [在字符预算内加载上下文](stages/04-load-context-within-a-character-budget/docs/zh.md)

## 用自己的输入运行

阶段完成后，这些命令在原创 Orchard 示例上运行你的工作区代码。把样本路径替换为自己的文件。

```bash
rustc --edition=2021 learning-artifacts/skill-validator/cli.rs -o learning-artifacts/skill-validator/validator
learning-artifacts/skill-validator/validator projects/skill-validator/examples/orchard-release 2000 --activate references/restore.md
```

先检查完整参考方案时，将同命令中的 `learning-artifacts/skill-validator` 替换为 `projects/skill-validator/solution`。JSON 结果使用 `schema_version: 1`；路径和参数示例明确，便于其他工具消费。

## 集成边界

解析器接受普通单行值和 JSON 兼容带引号字符串。刻意拒绝多行 YAML、别名、标签、流式集合。发现与激活上下文使用字符预算，不是模型 token。已有规范路径必须留在提供的 skill 目录内。

```bash
python3 scripts/project_test.py skill-validator --all --solution --strict
python3 scripts/project_test.py skill-validator --all --path learning-artifacts/skill-validator --strict
```

首命令检查参考方案，第二检查你的实现。发布的示例和测试是回归证据，不是生产认证或未见基准测试。

## 主要参考资料

- [官方参考](https://agentskills.io/specification)
