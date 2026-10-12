# 给每个答案标明来源位置

> 对照不可变的来源段落校验编写的卡片。

**类型：** Build  
**语言：** TypeScript  
**阶段：** 第 1 阶段，共 4 阶段  
**预计时间：** 约 2 小时

## 构建内容

练习卡片需要的不只是问题和答案。存储支持引用的 source ID 及 start/end 偏移量。学习者由此检查为何预期这个答案；编辑者也能检测来源变化何时使卡片失效。创建练习队列前先校验。

```figure
pj-source-grounded-study-coach-1
```

## 分析一个例子

来源写着 Each packet records the harvest year.。询问每包记录哪个年份的卡片，用 harvest year 作答案，证据覆盖该句。若编辑者在保留同一来源的同时，把答案改成 purchase year，校验就拒绝卡片。

编码前，写下该例返回的字段及一个应失败的输入。将预期结果放在实现旁，便于区分契约变化与错误。

## 实现契约

- `validateDeck(value: unknown): Deck`

要求 sources 和 cards 数组，非空且唯一的 ID、来源标题和非空文本。每张卡片都指向已知来源，包含非空 question 和 answer，以及满足 0 <= start < end <= text.length 的整数偏移量。规范答案必须逐字出现在引用中。可接受变体是显式声明的非空字符串。返回独立副本，避免后来修改输入对象改变校验过的卡组。

让前面阶段继续工作。在学习者工作区实现这些函数，分析例子时先不要打开参考方案。

## 提示与失败案例

用 source-ID 映射查询。偏移量按 UTF-16 位置处理，因为 JavaScript slice 使用这个单位。在留出示例中，把 emoji 放在引用前，暴露意外使用代码点索引的错误。

## 运行本阶段

从仓库根目录初始化一次，再运行累积测试：

```bash
python3 scripts/project_test.py source-grounded-study-coach --init my-source-grounded-study-coach
python3 scripts/project_test.py source-grounded-study-coach --stage 1 --path my-source-grounded-study-coach
```

起始代码有意抛出实现错误。后续初始化保留源文件，不会替换。通过要求所有选中测试都运行；跳过测试不是完成证据。

## 检查推理

答案出现在段落中，能证明问题写得好吗？除了这些结构检查，哪些部分还需要编辑审查？

## 关联最终产物

独立的答案揭示练习页与 progress.json，包含到期卡片和可复现的计划状态。核心使用编写的问题和精确的规范化答案匹配，不评价任意文章，也不推断理解程度。复习间隔是确定性的教学策略，不是经实证验证的学习效果声明。来源偏移量使用 JavaScript UTF-16 代码单元。

完成项目后，试用自己的输入：

```bash
cd my-source-grounded-study-coach
node --experimental-strip-types main.ts --deck ./fixtures/deck.json --attempts ./fixtures/attempts.json --initial-date 2026-09-01 --date 2026-09-03 --out ./study-output
```

增加卡组版本或来源摘要，只有显式迁移策略允许时才使作答失效。来源编辑后不要默默重映射证据。

## 主要参考资料

[官方 API 文档](https://nodejs.org/api/typescript.html)。实现、示例和 fixture 均为原创。参考资料解释底层 API；项目特有策略已在上文说明。
