# 在完成、停滞或预算耗尽时停止

第 2 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在此前的契约上。

## 本阶段的变化

每次操作后重新观察。状态重复、策略阻止操作或步数预算耗尽时停止。完成需要 DOM 成功标记及独立的截图检查。执行前记录每个选定操作。fixture 后端明确是模拟器，提供确定性的观察结果以测试循环，不声称覆盖浏览器。

本阶段的边界是 `runAgent, FixtureDriver`。保持之前阶段的行为不变：最终评分器会在同一工作区运行所有阶段。

## 推演一个具体案例

空的双字段表单需要四次观察：填姓名、填邮箱、提交、验证。预算为 3 时可以提交，但无法确认完成，因此终态仍为 budget-exhausted。

```figure
pj-browser-agent-2
```

改变实验输入，在查看指标前先计算结果。图表根据这些输入计算；下方实现测试仍是完成情况的证据来源。

## 实现契约

在工作区的 `main.ts` 中实现 `runAgent, FixtureDriver`。先尝试实现契约，再阅读参考实现的导出类型。保留 starter 的公共名称，让测试能够调用你的实现。核心函数返回结构化值，不在内部打印；CLI 打印最终结果。

使用[公共 API 契约](../../../API.md)和 starter 的类型化签名。核心函数返回值，由提供的驱动器负责文件输入、参数解析和呈现。

每次修改后重新观察。比较连续的完整观察结果以发现驱动器停滞；接受 done 前比较请求的值。如果截图或检查截图失败，返回 `status: "screenshot-error"`、轨迹、原因及可用的截图路径（截图失败时为 `null`）。未检查图像时省略视觉指标。直接调用 `inspectPNG` 时仍应对无效图像抛出异常。

## 验证并检查

从仓库根目录用 `python3 scripts/project_test.py browser-agent --init learning-artifacts/browser-agent` 初始化一次，然后进行累积评分：

```bash
python3 scripts/project_test.py browser-agent --stage 2 --path learning-artifacts/browser-agent --strict
```

在实现契约前，全新工作区应当失败。所有阶段完成后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/browser-agent
node cli.ts --task samples/contact.json --output browser-run.json
```

## 探查失败边界

使用 samples/accessibility.json，其中姓名已经正确。解释为什么不改策略也只需三次观察。




## 参考资料

[Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
[PNG 规范](https://www.w3.org/TR/png-3/)
[HTML 表单控件](https://html.spec.whatwg.org/multipage/forms.html)
