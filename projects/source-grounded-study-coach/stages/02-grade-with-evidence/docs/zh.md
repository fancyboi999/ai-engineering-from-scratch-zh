# 返回显示来源的反馈

> 对受限简短答案评分，并展示支持段落。

**类型：** Build  
**语言：** TypeScript  
**阶段：** 第 2 阶段，共 4 阶段  
**预计时间：** 约 2 小时

## 构建内容

入门项目中，狭窄的评分契约比无法解释的模型分数更易检查。规范 Unicode 兼容形式、大小写、空白和句末标点。与规范答案及卡组作者显式批准的变体比较。另一种表达在日常语言中可能正确，但在这里仍需人工审查。

```figure
pj-source-grounded-study-coach-2
```

## 分析一个例子

对 paper envelopes，回答 PAPER   ENVELOPES! 在规范化后被接受。Plastic envelopes 不通过。即使规范化去掉标点，空回答也不通过。若作者把 a paper envelope 列为变体，该精确规范化变体也被接受。

编码前，写下该例返回的字段及一个应失败的输入。将预期结果放在实现旁，便于区分契约变化与错误。

## 实现契约

- `normalizeAnswer(answer: string): string`
- `gradeAnswer(deck, cardId, response)`

返回 cardId、correct、expected、quote、sourceId、start、end、method 和 feedback。未知卡片 ID 和非字符串回答报错。反馈中保留原始预期答案和引用；规范化用于比较，不用于重写证据。

让前面阶段继续工作。在学习者工作区实现这些函数，分析例子时先不要打开参考方案。

## 提示与失败案例

测试正向和反向的近似匹配。子串规则会误接受 not paper envelopes。在 method 字段中保持精确相等和显式变体可见。不要把正确性解释为置信分数。

## 运行本阶段

从仓库根目录初始化一次，再运行累积测试：

```bash
python3 scripts/project_test.py source-grounded-study-coach --init my-source-grounded-study-coach
python3 scripts/project_test.py source-grounded-study-coach --stage 2 --path my-source-grounded-study-coach
```

起始代码有意抛出实现错误。后续初始化保留源文件，不会替换。通过要求所有选中测试都运行；跳过测试不是完成证据。

## 检查推理

一个科学上有效、却没列入 accepted 的同义词会怎样？如何让老师审查这些假阴性，又不削弱证据要求？

## 关联最终产物

独立的答案揭示练习页与 progress.json，包含到期卡片和可复现的计划状态。核心使用编写的问题和精确的规范化答案匹配，不评价任意文章，也不推断理解程度。复习间隔是确定性的教学策略，不是经实证验证的学习效果声明。来源偏移量使用 JavaScript UTF-16 代码单元。

完成项目后，试用自己的输入：

```bash
cd my-source-grounded-study-coach
node --experimental-strip-types main.ts --deck ./fixtures/deck.json --attempts ./fixtures/attempts.json --initial-date 2026-09-01 --date 2026-09-03 --out ./study-output
```

增加申诉事件，为老师保留学习者回答。审查结果与自动评分分开，对可接受答案的编辑做版本管理。

## 主要参考资料

[官方 API 文档](https://nodejs.org/api/typescript.html)。实现、示例和 fixture 均为原创。参考资料解释底层 API；项目特有策略已在上文说明。
