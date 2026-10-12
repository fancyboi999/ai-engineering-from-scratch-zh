# 恢复新文件行号

第 1 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在此前的契约上。

## 本阶段的变化

将 hunk 头解析为旧、新计数器。上下文消耗两个计数器，删除只消耗旧计数器，添加消耗新计数器并产生可审查位置。拒绝截断 hunk 和向父目录穿越的路径。解析器有意只处理文本统一 diff；二进制补丁和 combined merge diff 不在契约内。用 execFileSync 和 stdin 将 Python 接入 TypeScript，绝不用插值 shell 命令。

本阶段的边界是 `parseDiff`。保持之前阶段的行为不变：最终评分器会在同一工作区运行所有阶段。

## 推演一个具体案例

一个 hunk 从新行 10 开始，包含两行上下文，删除三行旧内容，并添加 eval(input)。添加属于新行 12：删除绝不推进新文件计数器。

```figure
pj-pr-review-reporter-1
```

改变实验输入，在查看指标前先计算结果。图表根据这些输入计算；下方实现测试仍是完成情况的证据来源。

## 实现契约

在工作区的 `main.ts` 中实现 `parseDiff`。先尝试实现契约，再阅读参考实现的导出类型。保留 starter 的公共名称，让测试能够调用你的实现。核心函数返回结构化值，不在内部打印；CLI 打印最终结果。

使用[公共 API 契约](../../../API.md)和 starter 的类型化签名。核心函数返回值，由提供的驱动器负责文件输入、参数解析和呈现。

当 hunk 仍有剩余行时，以 +++ 开头的行仍是添加内容，不是新文件名头。验证路径穿越前，先解码 Git 引号路径。

## 验证并检查

从仓库根目录用 `python3 scripts/project_test.py pr-review-reporter --init learning-artifacts/pr-review-reporter` 初始化一次，然后进行累积评分：

```bash
python3 scripts/project_test.py pr-review-reporter --stage 1 --path learning-artifacts/pr-review-reporter --strict
```

在实现契约前，全新工作区应当失败。所有阶段完成后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/pr-review-reporter
node cli.ts --diff samples/change.diff --output review.json --html review.html --sarif review.sarif
```

## 探查失败边界

使用含空格的文件名，以及源内容以 ++ 开头的添加行。两者都必须保留精确证据，不能混淆解析器状态。




## 参考资料

[Git diff 格式](https://git-scm.com/docs/diff-format)
[Python 子进程与 JSON](https://docs.python.org/3/library/json.html)
