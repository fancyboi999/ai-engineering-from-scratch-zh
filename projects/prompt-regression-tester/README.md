# Prompt 回归测试器

用于审核 prompt 变更的工具包，准确指出哪些用户承诺被破坏。

Orchard 必须返回 JSON 并保留来源定位信息。将 `format-json` 和 `source-link` 保持为不同案例 id：它们是对调用方的两个独立承诺。比较运行前，录制文件对整个案例列表（含 prompt 和检查）计算哈希。

## 从学习者工作区开始

[结构化输出](../../phases/11-llm-engineering/03-structured-outputs/docs/zh.md)、[模型评估](../../phases/02-ml-fundamentals/09-model-evaluation/docs/zh.md)。语言基础：[Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)。

使用 Python 3.10+ 及其标准库。项目使用文件锁或进程组监管的地方需要 POSIX。

```bash
python3 scripts/project_test.py prompt-regression-tester --init learning-artifacts/prompt-regression-tester
python3 scripts/project_test.py prompt-regression-tester --stage 1 --path learning-artifacts/prompt-regression-tester
```

## 构建路线

1. [评分前校验案例](stages/01-validate-cases/docs/zh.md)
2. [不调用模型，对录制输出评分](stages/02-score-recordings/docs/zh.md)
3. [跨版本比较相同案例](stages/03-pair-revisions/docs/zh.md)
4. [按明确容差设置发布门禁](stages/04-gate-releases/docs/zh.md)

## 用自己的输入运行

阶段完成后，这些命令用原创 Orchard 示例运行你的工作区代码。将样本路径替换成自己的文件。

```bash
python3 learning-artifacts/prompt-regression-tester/cli.py projects/prompt-regression-tester/examples/cases.json projects/prompt-regression-tester/examples/baseline.json projects/prompt-regression-tester/examples/candidate.json --out prompt-diff.json --markdown prompt-diff.md
```

若想先检查完整参考方案，在同一命令中把 `learning-artifacts/prompt-regression-tester` 替换为 `projects/prompt-regression-tester/solution`。JSON 结果使用 `schema_version: 1`；路径和参数示例明确列出，便于其他工具消费。

## 集成边界

附带录制是编写的 fixture。工具比较录制响应，不调用模型，也不能证明语义正确。JSON 案例和响应文件是公开接口。门禁阻止发布时退出码为 1。

```bash
python3 scripts/project_test.py prompt-regression-tester --all --solution --strict
python3 scripts/project_test.py prompt-regression-tester --all --path learning-artifacts/prompt-regression-tester --strict
```

第一条命令检查参考方案，第二条检查你的实现。发布的示例和测试是回归证据，不是生产认证或未见过的基准测试。

## 主要参考资料

- [机制与 API 参考](https://docs.python.org/3/library/difflib.html)

每份录制通过 `case_sha256` 绑定稳定测试案例，并通过 `template_sha256` 记录精确的 `prompt_template`。模板版本可以不同；更改测试任务则需要新录制。仓库中的响应标记为 `authored_fixture`，不是 provider 测量结果。
