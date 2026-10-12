# 发布经过转义的本地报告

第 4 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在此前的契约上。

## 本阶段的变化

渲染独立报告，包含源位置、引用证据、严重级别和消息。对源文本和正文同样仔细转义：diff 可能包含可执行 HTML。外部发布不属于工具职责。CLI 在本地写出 review.html，打印可供自动化使用的机器可读摘要。

本阶段的边界是 `escapeHTML, render`。保持之前阶段的行为不变：最终评分器会在同一工作区运行所有阶段。

## 推演一个具体案例

CLI 读取提供的补丁，验证候选，合并重复项，将匹配的位置写入 review.json、review.html 和 review.sarif。diff SHA-256 将报告绑定到确切补丁字节。

```figure
pj-pr-review-reporter-4
```

改变实验输入，在查看指标前先计算结果。图表根据这些输入计算；下方实现测试仍是完成情况的证据来源。

## 实现契约

在工作区的 `main.ts` 中实现 `escapeHTML, render`。先尝试实现契约，再阅读参考实现的导出类型。保留 starter 的公共名称，让测试能够调用你的实现。核心函数返回结构化值，不在内部打印；CLI 打印最终结果。

使用[公共 API 契约](../../../API.md)和 starter 的类型化签名。核心函数返回值，由提供的驱动器负责文件输入、参数解析和呈现。

把源片段视为不可信 HTML。Git 模式使用参数数组，所有输出保持本地；任何公开发布前都应能检查审查产物。

## 验证并检查

从仓库根目录用 `python3 scripts/project_test.py pr-review-reporter --init learning-artifacts/pr-review-reporter` 初始化一次，然后进行累积评分：

```bash
python3 scripts/project_test.py pr-review-reporter --stage 4 --path learning-artifacts/pr-review-reporter --strict
```

在实现契约前，全新工作区应当失败。所有阶段完成后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/pr-review-reporter
node cli.ts --diff samples/change.diff --output review.json --html review.html --sarif review.sarif
```

## 探查失败边界

创建独立留出补丁，包含带引号的文件名和禁用 TLS。对照 git diff 验证其 SARIF region.startLine，再改变补丁，观察指纹变化。

四种词法检测器仅产生狭义审查候选，不判定漏洞是否可利用。二进制和 combined diff 不在范围内。带引号的 Git 路径在验证路径穿越和定位前先解码。不向远程 PR 发布评论。


## 参考资料

[Git diff 格式](https://git-scm.com/docs/diff-format)
[Python 子进程与 JSON](https://docs.python.org/3/library/json.html)
