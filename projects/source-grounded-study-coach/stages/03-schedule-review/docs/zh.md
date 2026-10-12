# 重放作答事件，生成可见的复习计划

> 从稳定、带日期的作答事件推导到期日期。

**类型：** Build  
**语言：** TypeScript  
**阶段：** 第 3 阶段，共 4 阶段  
**预计时间：** 约 2 小时

## 构建内容

将作答存为事件，便于重新计算进度。每个事件有 ID、card ID、date 和 answer。完全重复的事件不能让卡片晋级两次。相同 ID 内容不同时报错。先按日期再按事件 ID 排序，让同日顺序确定。

```figure
pj-source-grounded-study-coach-3
```

## 分析一个例子

9 月 1 日第一次正确回答将卡片移到 box 1，9 月 2 日到期。9 月 2 日答对后移到 box 2，9 月 4 日到期。错误回答重置到 box 0，并安排次日复习。box 上限为 5，此时答对的间隔为 16 天。

编码前，写下该例返回的字段及一个应失败的输入。将预期结果放在实现旁，便于区分契约变化与错误。

## 实现契约

- `parseDay(value: string): number`
- `buildProgress(deck, attempts, initialDate): Progress[]`
- `dueCards(progress, date): Progress[]`

只接受真实的 YYYY-MM-DD 日期；9 月 31 日必须失败。作答不能早于 initialDate，也不能指向未知卡片。每张卡片从 box 0 开始，initialDate 到期。正确答案晋升一个 box，使用 2^(box-1) 天间隔；错误答案重置，使用一天间隔。按卡组顺序返回进度；dueCards 选择 due <= date，再按到期日期、card ID 排序。

让前面阶段继续工作。在学习者工作区实现这些函数，分析例子时先不要打开参考方案。

## 提示与失败案例

在 UTC 午夜进行日历计算，避免本地夏令时偏移。处理前对事件去重。将乱序输入列表与其排序后的版本比较，并用明确预期日期检查跨月日期。

## 运行本阶段

从仓库根目录初始化一次，再运行累积测试：

```bash
python3 scripts/project_test.py source-grounded-study-coach --init my-source-grounded-study-coach
python3 scripts/project_test.py source-grounded-study-coach --stage 3 --path my-source-grounded-study-coach
```

起始代码有意抛出实现错误。后续初始化保留源文件，不会替换。通过要求所有选中测试都运行；跳过测试不是完成证据。

## 检查推理

为什么即使调度器确定，同一天两次正确作答也可能夸大学习？面向真实学习者，你会修改哪项调度策略？

## 关联最终产物

独立的答案揭示练习页与 progress.json，包含到期卡片和可复现的计划状态。核心使用编写的问题和精确的规范化答案匹配，不评价任意文章，也不推断理解程度。复习间隔是确定性的教学策略，不是经实证验证的学习效果声明。来源偏移量使用 JavaScript UTF-16 代码单元。

完成项目后，试用自己的输入：

```bash
cd my-source-grounded-study-coach
node --experimental-strip-types main.ts --deck ./fixtures/deck.json --attempts ./fixtures/attempts.json --initial-date 2026-09-01 --date 2026-09-03 --out ./study-output
```

增加有文档说明的同日晋级上限，或另一种调度策略。在相同作答日志上比较行为，不要仅凭间隔长短声称学习效果更好。

## 主要参考资料

[官方 API 文档](https://nodejs.org/api/typescript.html)。实现、示例和 fixture 均为原创。参考资料解释底层 API；项目特有策略已在上文说明。
