# 自纠正工作流 hook

一本纠正台账，展示规则为何存在、改变了什么，以及如何撤销。

纠正是来自特定会话与源定位符的证据。规则中保留 API_KEY 的精确大小写；大小写折叠会把有用指令变成自相矛盾的指令。

## 从学习者工作区开始

[仓库记忆与状态](../../phases/14-agent-engineering/34-repo-memory-and-state/docs/zh.md), [验证门禁](../../phases/14-agent-engineering/38-verification-gates/docs/zh.md)。语言基础：[TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)。

使用 Node 22.18+，评分器使用 Python 3.10+。核心 TypeScript 无需安装软件包。

```bash
python3 scripts/project_test.py workflow-hooks --init learning-artifacts/workflow-hooks
python3 scripts/project_test.py workflow-hooks --stage 1 --path learning-artifacts/workflow-hooks
```

## 构建路线

1. [记录带来源的纠正](stages/01-corrections/docs/zh.md)
2. [统计独立会话](stages/02-consolidate/docs/zh.md)
3. [批准并选择限定范围的规则](stages/03-policy/docs/zh.md)
4. [跨会话持久化规则](stages/04-durability/docs/zh.md)

## 使用自己的输入运行

完成各阶段后，这些命令会在原始 Orchard 示例上运行你的工作区代码。将样本路径换成你自己的文件。

```bash
node learning-artifacts/workflow-hooks/cli.ts capture orchard-rules.json projects/workflow-hooks/examples/corrections.jsonl
node learning-artifacts/workflow-hooks/cli.ts inspect orchard-rules.json
```

若想先查看完整参考方案，将同一命令中的 `learning-artifacts/workflow-hooks` 换成 `projects/workflow-hooks/solution`。JSON 结果使用 `schema_version: 1`；路径与参数示例都明确给出，便于其他工具消费。

## 集成边界

capture、inspect、approve、retire 和 emit 是基于文件的命令。emit 返回包含 additional_context 和可解析证据的中立 JSON；agent 集成必须将该字段映射到其文档规定的 hook 接口。批准要求提供当前摘要。存储带版本、原子写入，并且只支持单写入者。

```bash
python3 scripts/project_test.py workflow-hooks --all --solution --strict
python3 scripts/project_test.py workflow-hooks --all --path learning-artifacts/workflow-hooks --strict
```

第一条命令检查参考方案，第二条检查你的实现。发布的示例与测试是回归证据，不是生产认证或未见过的基准。

## 主要参考资料

- [Node 文件系统操作](https://nodejs.org/api/fs.html)
- [JSON 数据交换](https://www.rfc-editor.org/rfc/rfc8259)
