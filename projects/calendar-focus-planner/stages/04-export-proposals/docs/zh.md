# 导出可审核的日历建议

**类型：** Build
**语言：** TypeScript
**阶段：** 第 4 阶段，共 4 阶段
**预计时间：** 约 2 小时，需先完成链接中的前置内容
**前置要求：** 前一阶段，以及[开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/zh.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。

## 构建内容

本阶段推进日历专注计划器：找到日历中的真实空闲时间，安排优先任务，并解释哪些任务放不下。

公开契约为 `exportCalendar(plan, createdAt); renderPlan(plan)`。随附 CLI 和样本文件位于你的工作区；在 `main.ts` 中实现领域函数。保留签名，使其他应用也能调用同一边界。

## 推演机制

导出的专注区块是一项建议。给它基于任务身份和计划起点的稳定身份、明确 UTC 端点，以及调用者提供的创建时间戳。转义文本属性并折叠长行，不要拆开 UTF-8 字符。

HTML 用人可读的方式解释同一日程，包括未排入工作。JSON 让其他程序检查决策。手动 ICS 导入把最终日历编辑权留给学习者，也避免本项目涉及账号凭据。

| 输出 | 用途 |
|---|---|
| focus.ics | 可移植的事件建议 |
| plan.json | 可检查的排程结果 |
| plan.html | 人工审核与被拒绝任务 |

## 运行前先预测

使用包含逗号和换行的任务标题。导出后再次解析，验证标题和区间都被保留。

```figure
pj-calendar-focus-planner-4
```

修改图表输入并检查计算值。把一个改变后的结果对应到你的实现中的某一行；图表是解释模型，不是真实程序的替代品。

## 构建与验证

从仓库根目录初始化一次。这会复制公开类型、函数桩、真实命令包装器和原创样本输入。全新的第一阶段应当失败，因为领域函数尚未实现。

```bash
python3 scripts/project_test.py calendar-focus-planner --init my-calendar-focus-planner
python3 scripts/project_test.py calendar-focus-planner --stage 4 --path my-calendar-focus-planner --strict
```

用标准库实现契约。先手工推演示例。保持调用者输入不变，以可操作的错误拒绝不合法数据。测试导入你的工作区，绝不导入参考方案。

## 逐级提示

1. 折叠行前先转义值。
2. 折叠时计算 UTF-8 字节数，而不是 JavaScript 字符串长度。
3. 测试中使用固定创建时间戳。

## 预期结果

本阶段评分器应报告第 1 至第 4 阶段的真实测试通过。完成全部四阶段后，用随附样本运行交付工具，再换成自己的输入：

```bash
cd my-calendar-focus-planner
node cli.ts sample.ics tasks.json 2026-10-14 output 10
```

最终产物是可检查的 HTML 计划、机器可读日程，以及供手动导入的可移植 ICS 建议。打开 HTML 并检查配套 JSON，不要只相信退出码。修改一个输入，准确解释哪个结果必须改变。

## 扩展

构建独立适配器，将外部计划器的建议转成经过校验的 Task 记录，保留这个调度器作为确定性边界。

范围：解析器支持显式 UTC 事件和全天日期。重复规则和命名时区必须先由日历导出器展开，遇到它们会拒绝。CLI 规划 UTC 09:00–17:00 的一天。它只创建本地建议，从不修改账号日历。

主要参考：[iCalendar RFC 5545](https://www.rfc-editor.org/rfc/rfc5545)。实现和练习数据均为原创教学示例。
