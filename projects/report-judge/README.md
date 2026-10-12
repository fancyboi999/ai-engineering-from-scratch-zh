# 报告评审器

展示不确定性和待人工审核主张的证据审计工作台。

分别审计每个事实句。Orchard 有带来源的重试限制及无关部署主张；一个有效标记不能让整个段落通过。

## 从学习工作区开始

[检索增强生成](../../phases/11-llm-engineering/06-rag/docs/zh.md)、[模型评估](../../phases/02-ml-fundamentals/09-model-evaluation/docs/zh.md)、[验证门禁](../../phases/14-agent-engineering/38-verification-gates/docs/zh.md)。语言基础：[Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)。

使用 Python 3.10+ 及标准库。项目使用文件锁或进程组监督的地方需要 POSIX。

```bash
python3 scripts/project_test.py report-judge --init learning-artifacts/report-judge
python3 scripts/project_test.py report-judge --stage 1 --path learning-artifacts/report-judge
```

## 构建路线

1. [解析主张与引用标记](stages/01-claims/docs/zh.md)
2. [先检查证据再平均分数](stages/02-support/docs/zh.md)
3. [报告精确率、覆盖率与来源召回率](stages/03-metrics/docs/zh.md)
4. [用 bootstrap 区间比较配对修订](stages/04-compare/docs/zh.md)

## 使用自己的输入运行

完成各阶段后，这些命令在你的工作区代码上运行原创 Orchard 示例。将样本路径替换为自己的文件。

```bash
python3 learning-artifacts/report-judge/cli.py projects/report-judge/examples/claims.json --out evidence-audit.json --html evidence-audit.html
```

若想先检查完整参考实现，在同一命令中将 `learning-artifacts/report-judge` 替换为 `projects/report-judge/solution`。JSON 结果使用 `schema_version: 1`；路径和参数示例明确，便于其他工具使用。

## 集成边界

评审器提供保守的词汇证据检查。顺序、数字和否定暴露部分错误匹配；改写仍可能被拒绝，其他错误匹配仍存在。缺少召回/覆盖标签时为 null。任何自动分数都不证明真实。

```bash
python3 scripts/project_test.py report-judge --all --solution --strict
python3 scripts/project_test.py report-judge --all --path learning-artifacts/report-judge --strict
```

第一条命令检查参考实现，第二条检查你的实现。发布的示例和测试是回归证据，不是生产认证或未见基准。
