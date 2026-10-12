# 自改进技能循环

从纠错到技能的实验运行器，保留来源、防止泄漏并支持回滚。

留出隔离必须依据内容和分组，不能只依据 id。不同 id 的工单可能重复同一客户消息。先规范化内容并合并关联记录，再把连通分量分配到分区。

## 从学习者工作区开始

[模型评估](../../phases/02-ml-fundamentals/09-model-evaluation/docs/zh.md)、[仓库记忆与状态](../../phases/14-agent-engineering/34-repo-memory-and-state/docs/zh.md)、[验证门禁](../../phases/14-agent-engineering/38-verification-gates/docs/zh.md)。语言基础：[Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)。

使用 Python 3.10+ 及其标准库。项目使用文件锁或进程组监管的地方需要 POSIX。

```bash
python3 scripts/project_test.py self-improving-skill-loop --init learning-artifacts/self-improving-skill-loop
python3 scripts/project_test.py self-improving-skill-loop --stage 1 --path learning-artifacts/self-improving-skill-loop
```

## 构建路线

1. [划分标注案例，防止身份泄漏](stages/01-dataset/docs/zh.md)
2. [执行透明路由技能并评分](stages/02-skill/docs/zh.md)
3. [只从开发集错误提出规则](stages/03-propose/docs/zh.md)
4. [晋升前要求独立门禁](stages/04-promotion/docs/zh.md)

## 用自己的输入运行

阶段完成后，这些命令用原创 Orchard 示例运行你的工作区代码。将样本路径替换成自己的文件。

```bash
python3 learning-artifacts/self-improving-skill-loop/cli.py projects/self-improving-skill-loop/examples/support-cases.json --out experiment.json
```

若想先检查完整参考方案，在同一命令中把 `learning-artifacts/self-improving-skill-loop` 替换为 `projects/self-improving-skill-loop/solution`。JSON 结果使用 `schema_version: 1`；路径和参数示例明确列出，便于其他工具消费。

## 集成边界

实验从开发数据提出确定性路由规则。显式 development/holdout 输入接受内容和分组泄漏审计。晋升需要 --promote-to 和通过门禁打印的精确 --approve-digest。旧规则保存在 <destination>.previous 供手动回滚；这是单写入者文件流程。

```bash
python3 scripts/project_test.py self-improving-skill-loop --all --solution --strict
python3 scripts/project_test.py self-improving-skill-loop --all --path learning-artifacts/self-improving-skill-loop --strict
```

第一条命令检查参考方案，第二条检查你的实现。发布的示例和测试是回归证据，不是生产认证或未见过的基准测试。


`--dataset-audit audit.json` 消费数据集划分审计器带版本的 `partitions.train` 和 `partitions.test` 记录，保留标签与来源，并在本地重新检查泄漏。`--export-skill orchard-routing` 写出新草稿 `SKILL.md` 和 `references/rules.json`；不会安装或激活候选。
