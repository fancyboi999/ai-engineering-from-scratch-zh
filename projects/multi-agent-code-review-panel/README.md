# 多 agent 代码审查小组

一个审查分歧工作台，用来衡量法定票数何时有帮助、何时会掩盖发现。

需要 Node 22.18+，评分器需要 Python 3；需要了解 TypeScript 对象、集合、Promise、AbortSignal 以及精确率/召回率。核心使用标准库。评分器检查你选定的工作区，绝不会从参考方案补全缺失行为。

## 构建并运行你的版本

在仓库根目录初始化一次。全新的起始代码会有意失败。

```bash
python3 scripts/project_test.py multi-agent-code-review-panel --init learning-artifacts/multi-agent-code-review-panel
python3 scripts/project_test.py multi-agent-code-review-panel --stage 1 --path learning-artifacts/multi-agent-code-review-panel --strict
```

实现各阶段后，运行累积评分器和提供的输入驱动器：

```bash
python3 scripts/project_test.py multi-agent-code-review-panel --all --path learning-artifacts/multi-agent-code-review-panel --strict
cd learning-artifacts/multi-agent-code-review-panel
node cli.ts --input samples/review.json --output panel.json --html panel.html
```

驱动器和离线样本是预置脚手架。它导入的是你的实现。公开输入类型与函数签名见起始代码和 [API 契约](API.md)。

## 单独查看参考方案

从仓库根目录运行：

```bash
python3 scripts/project_test.py multi-agent-code-review-panel --all --solution --strict
cd projects/multi-agent-code-review-panel/solution
node cli.ts --input samples/review.json --output panel.json --html panel.html
```

## 观察变化

宽泛审查者标记了一条注释和两个真实候选问题：精确率为 2/3。法定票数过滤掉只有一票的注释误报，将精确率提高到 1，同时保留 TLS 严重程度分歧。预算为 1 时不产生共识。

编辑样本副本，重新运行命令。输入和输出放在一起，便于他人复现；提供的样本是专门编写的教学数据。

## 集成与限制

输入中的 files 将名称映射到文本或行数组。可选的 reviewers 包含 id、cost、findings 记录。预期标签使用 {file,line,rule}；报告记录源指纹，以及各审查者与共识的对比指标。

本地审查者是不同的静态启发式规则，不是独立 LLM。共识衡量支持程度，不代表真相。外部回调必须遵守 AbortSignal；超时不能撤销远程副作用。

## 阶段

1. [校验审查证据](stages/01-evidence/docs/zh.md)
2. [汇总独立支持](stages/02-agreement/docs/zh.md)
3. [预留费用并执行截止时间](stages/03-budgets/docs/zh.md)
4. [衡量审查小组的精确率与召回率](stages/04-evaluate/docs/zh.md)


## 主要参考资料

[Node 中的 AbortController](https://nodejs.org/api/globals.html#class-abortcontroller)
[Node 测试运行器](https://nodejs.org/api/test.html)

## 复用 PR 审查回执

在专门编写的 diff 上运行 PR Review Reporter，然后通过 `--pr-report /path/review.json` 提供其 schema_version1 输出，以及匹配的完整源快照：

```bash
node cli.ts --input samples/pr-snapshot.json --pr-report /path/review.json --output composed-panel.json
```

适配器将 high/medium/low 严重程度转换为 3/2/1，保留 file/line/rule 身份并记录 pr_diff_sha256。导入的发现仍须通过小组的源引用校验。这证明的是产物兼容性，不会把相关的词法检测器变成独立判断。
