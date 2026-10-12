# 日历专注计划器

找到日历中的真实空闲时间，安排优先任务，并解释哪些任务放不下。

最终得到可检查的 HTML 计划、机器可读日程，以及供手动导入的可移植 ICS 建议。

## 运行完成的工具

从仓库根目录运行：

```bash
cd projects/calendar-focus-planner/solution
node cli.ts sample.ics tasks.json 2026-10-14 output 10
```

样本为本项目原创。通过同一 CLI 换成你自己的输入。基线不需要模型 key。启用可选外部适配器前，先看命令帮助。

## 自己动手构建

先学习[开发环境搭建](../../phases/00-setup-and-tooling/01-dev-environment/docs/zh.md)和[数据管理](../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。开始前应能读取 JSON 对象、调用函数、运行终端命令，并理解失败测试。

```bash
python3 scripts/project_test.py calendar-focus-planner --init my-calendar-focus-planner
python3 scripts/project_test.py calendar-focus-planner --stage 1 --path my-calendar-focus-planner --strict
python3 scripts/project_test.py calendar-focus-planner --all --path my-calendar-focus-planner --strict --report completion.json
```

全新工作区在实现函数之前会故意失败。CLI、输入文件和公开类型已提供，因此完成任务不需要复制参考入口。依次完成各阶段：

1. [读取显式日历区间](stages/01-read-calendar/docs/zh.md)
2. [先合并重叠，再寻找空档](stages/02-compute-free-time/docs/zh.md)
3. [按优先级排程，不假装所有任务都能放下](stages/03-place-tasks/docs/zh.md)
4. [导出可审核的日历建议](stages/04-export-proposals/docs/zh.md)

## 复用产物

CLI 和可导入函数读取普通本地文件，返回结构化输出。与其他程序集成时，保留输入身份和明确的失败元数据。HTML 输出没有第三方脚本；检查其中包含的源数据后即可分享。

## 验证与范围

```bash
python3 scripts/project_test.py calendar-focus-planner --all --solution --strict
```

解析器要求 UTC 事件和全天日期都具有明确的 `DTSTART` 和 `DTEND`。全天事件的 `DTEND;VALUE=DATE` 不包含结束日期：10 月 14 日的事件使用开始值 `20261014`、结束值 `20261015`。隐含一天的结束时间，以及用 `DURATION` 代替 `DTEND`，都不在教学子集内。重复规则和命名时区必须先由日历导出器展开，遇到它们会拒绝。CLI 规划 UTC 09:00–17:00 的一天。它只创建本地建议，从不修改账号日历。

评分验证随附的确定性契约。学习者证书是自我声明的完成记录，不代表真实 provider 验证或职业认证。在认为工具已经集成前，阅读 JSON 回执并至少测试一个新输入。

主要参考：[iCalendar RFC 5545](https://www.rfc-editor.org/rfc/rfc5545)。
