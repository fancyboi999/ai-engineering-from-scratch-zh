# 汇总独立支持

第 2 阶段，共 4 阶段。开始前阅读[项目的前置要求](../../../README.md)；本阶段建立在此前契约之上。

## 变化

按文件、行号和规则对有效发现分组。每组每位审查者只计一票，拒绝重复的审查者身份，并保留所有严重程度投票。达到法定票数就形成共识；单票发现仍以 needs-review 显示。即使形成共识，也保留分歧标记，让用户检查冲突的严重程度判断。

本阶段的边界是 `aggregate`。保留前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

## 分析一个具体案例

一位审查者将同一发现重复五次，第二位审查者报告一次。支持者是两个不同的 reviewer id，而不是六份报告。严重程度 [3,2] 产生带有 disagreement=true 的共识。

```figure
pj-multi-agent-code-review-panel-2
```

修改实验输入，先算出结果，再看指标。图表根据输入计算；下面的实现测试仍是完成证据的来源。

## 实现契约

在工作区的 `main.ts` 中实现 `aggregate`。先尝试实现契约，再阅读参考方案导出的类型。保留起始代码的公开名称，便于测试调用你的实现。核心函数返回结构化值，不在内部打印；CLI 负责打印最终结果。

使用[公开 API 契约](../../../API.md)和起始代码的类型化签名。核心函数返回值，提供的驱动器负责文件输入、参数解析和呈现。

按稳定元组 (file,line,rule) 分组。在输出中保留严重程度投票与支持者 id，不要把决定压缩成一个布尔值。

## 验证与检查

在仓库根目录用 `python3 scripts/project_test.py multi-agent-code-review-panel --init learning-artifacts/multi-agent-code-review-panel` 初始化一次。随后累积评分：

```bash
python3 scripts/project_test.py multi-agent-code-review-panel --stage 2 --path learning-artifacts/multi-agent-code-review-panel --strict
```

全新工作区应在契约实现之前失败。所有阶段完成后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/multi-agent-code-review-panel
node cli.ts --input samples/review.json --output panel.json --html panel.html
```

## 探查失败边界

把样本中的法定票数从 2 提高到 3。找出哪个真实发现变成 needs-review，哪个误报原本就只有一票。




## 参考资料

[Node 中的 AbortController](https://nodejs.org/api/globals.html#class-abortcontroller)
[Node 测试运行器](https://nodejs.org/api/test.html)
