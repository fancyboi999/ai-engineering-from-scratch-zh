# JSON Schema 输出守卫

为模型输出契约提供 schema 预检和有界修复回执。

需要 Node 22.18+ 和用于评分器的 Python 3；需掌握 TypeScript 联合类型、递归函数、JSON 和异步回调。核心使用标准库。评分器检查你选定的工作区，绝不会用参考实现补齐缺失行为。

## 构建并运行你的版本

从仓库根目录初始化一次。全新的 starter 会故意失败。

```bash
python3 scripts/project_test.py json-schema-output-guard --init learning-artifacts/json-schema-output-guard
python3 scripts/project_test.py json-schema-output-guard --stage 1 --path learning-artifacts/json-schema-output-guard --strict
```

实现每个阶段后，运行累积评分器和随附的输入驱动程序：

```bash
python3 scripts/project_test.py json-schema-output-guard --all --path learning-artifacts/json-schema-output-guard --strict
cd learning-artifacts/json-schema-output-guard
node cli.ts --schema samples/schema.json --attempts samples/attempts.json --output guard.json --html guard.html
```

驱动程序和离线样本是现成的脚手架。驱动程序导入的是你的实现。公开输入类型和函数签名见 starter 和 [API 契约](API.md)。

## 单独查看参考实现

从仓库根目录运行：

```bash
python3 scripts/project_test.py json-schema-output-guard --all --solution --strict
cd projects/json-schema-output-guard/solution
node cli.ts --schema samples/schema.json --attempts samples/attempts.json --output guard.json --html guard.html
```

## 观察变化

第 1 次尝试在 $/confidence 拒绝 confidence 1.5。第 2 次接受 confidence 0.8。缺失的可选属性中的不支持关键词，现在会在 schema 预检时失败。

编辑样本的副本并重新运行命令。把输入与输出放在一起，让他人能够复现结果；随附样本是原创教学数据。

## 集成与限制

在应用边界调用 guard(raw,schema)，或调用 repair(generate,schema,maxAttempts)，其中 generate 接收结构化 Issue[] 和从 1 开始的尝试编号。

这是明确限定的 JSON Schema 子集。拒绝 $ref、format 和组合器。通过 schema 不代表回答符合事实。录制的修复不是实时模型调用。

## 阶段

1. [解析不可信边界](stages/01-parse-json/docs/zh.md)
2. [递归遍历 schema](stages/02-validate-types/docs/zh.md)
3. [拒绝有歧义和不支持的契约](stages/03-constraints/docs/zh.md)
4. [用有限预算修复](stages/04-bounded-repair/docs/zh.md)


## 主要参考资料

[JSON Schema 校验词汇](https://json-schema.org/draft/2020-12/json-schema-validation)
[Node TypeScript 执行](https://nodejs.org/api/typescript.html)
