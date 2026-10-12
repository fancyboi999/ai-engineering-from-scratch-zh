# PR 审查报告器

本地补丁审查产物，保留 Git 行级证据，可作为 SARIF 接入 CI。

需要 Node 22.18+、Python 3，且仅 --repo 模式需要 Git；需了解统一 diff 计数器、JSON、精确源引文和 HTML 转义。核心使用标准库。评分器检查你选定的工作区，绝不会用参考实现补齐缺失的行为。

## 构建并运行你的版本

从仓库根目录初始化一次。全新的 starter 会有意失败。

```bash
python3 scripts/project_test.py pr-review-reporter --init learning-artifacts/pr-review-reporter
python3 scripts/project_test.py pr-review-reporter --stage 1 --path learning-artifacts/pr-review-reporter --strict
```

逐阶段实现，然后运行累积评分器和提供的输入驱动器：

```bash
python3 scripts/project_test.py pr-review-reporter --all --path learning-artifacts/pr-review-reporter --strict
cd learning-artifacts/pr-review-reporter
node cli.ts --diff samples/change.diff --output review.json --html review.html --sarif review.sarif
```

驱动器和离线样本是提供的脚手架，其导入指向你的实现。公共输入类型和函数签名见 starter 和 [API 契约](API.md)。

## 单独检查参考实现

从仓库根目录运行：

```bash
python3 scripts/project_test.py pr-review-reporter --all --solution --strict
cd projects/pr-review-reporter/solution
node cli.ts --diff samples/change.diff --output review.json --html review.html --sarif review.sarif
```

## 观察变化

样例补丁在新文件第 2 行添加 eval(input)，第 3 行添加注释。报告保留一个带定位的候选，抑制注释，并写出位置一致的 JSON、HTML 和 SARIF。

编辑样本的副本，再次运行命令。把输入与输出放在一起，方便别人复现；提供的样本是专门编写的教学数据。

## 集成与限制

使用 --diff - 从 stdin 读取；使用 --repo /path --base REF --head REF 获取只读 Git diff；或使用 --candidates recorded-findings.json，对照提供的补丁验证另一位审查者的发现。

四种词法检测器仅产生狭义审查候选，不判定漏洞是否可利用。二进制和 combined diff 不在范围内。带引号的 Git 路径在验证路径穿越和定位前先解码。不向远程 PR 发布评论。

## 阶段

1. [恢复新文件行号](stages/01-diff-lines/docs/zh.md)
2. [生成狭义审查候选](stages/02-inspect/docs/zh.md)
3. [验证并合并发现](stages/03-anchors/docs/zh.md)
4. [发布经过转义的本地报告](stages/04-report/docs/zh.md)


## 主要参考资料

[Git diff 格式](https://git-scm.com/docs/diff-format)
[Python 子进程与 JSON](https://docs.python.org/3/library/json.html)

## 将报告送入评审面板

多 agent 代码审查面板通过 --pr-report 接受这份报告。适配器保留 file、line 和 rule，将 severity 映射为数值投票，并保留 diff_sha256。为面板提供匹配的新文件源快照；过时快照应拒绝导入的引文。
