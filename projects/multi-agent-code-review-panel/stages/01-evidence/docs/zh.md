# 校验审查证据

第 1 阶段，共 4 阶段。开始前阅读[项目的前置要求](../../../README.md)；本阶段建立在此前契约之上。

## 变化

要求文件存在于给定快照中，行号为从 1 开始的正整数，引用非空且完全匹配，rule id 稳定，严重程度介于 1 到 3。所有审查者共用证据校验。它防止虚构位置进入聚合边界，但一致意见和引用文本仍不能证明发现正确。

本阶段的边界是 `validateFinding`。保留前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

## 分析一个具体案例

审查者声称 run.ts 第 99 行包含 eval(input)，但给定快照只有三行。在计票之前就拒绝它，即使第二位审查者重复了同一个虚构位置。

```figure
pj-multi-agent-code-review-panel-1
```

修改实验输入，先算出结果，再看指标。图表根据输入计算；下面的实现测试仍是完成证据的来源。

## 实现契约

在工作区的 `main.ts` 中实现 `validateFinding`。先尝试实现契约，再阅读参考方案导出的类型。保留起始代码的公开名称，便于测试调用你的实现。核心函数返回结构化值，不在内部打印；CLI 负责打印最终结果。

使用[公开 API 契约](../../../API.md)和起始代码的类型化签名。核心函数返回值，提供的驱动器负责文件输入、参数解析和呈现。

查询文件时只查自有属性，并转换从 1 开始的行号。非空且精确的引用只能支持位置，不能证明严重程度或因果主张。

## 验证与检查

在仓库根目录用 `python3 scripts/project_test.py multi-agent-code-review-panel --init learning-artifacts/multi-agent-code-review-panel` 初始化一次。随后累积评分：

```bash
python3 scripts/project_test.py multi-agent-code-review-panel --stage 1 --path learning-artifacts/multi-agent-code-review-panel --strict
```

全新工作区应在契约实现之前失败。所有阶段完成后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/multi-agent-code-review-panel
node cli.ts --input samples/review.json --output panel.json --html panel.html
```

## 探查失败边界

将一条外部发现记录通过 CLI 送入已修改的源快照。它必须与本地审查者一样，过不了引用校验。




## 参考资料

[Node 中的 AbortController](https://nodejs.org/api/globals.html#class-abortcontroller)
[Node 测试运行器](https://nodejs.org/api/test.html)
