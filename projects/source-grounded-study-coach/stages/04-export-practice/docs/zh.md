# 把阅读材料变成实用练习页

> 导出可移植的答案揭示与复习视图，进度可复现。

**类型：** Build  
**语言：** TypeScript  
**阶段：** 第 4 阶段，共 4 阶段  
**预计时间：** 约 2 小时

## 构建内容

最终页面让你输入答案，再揭示预期答案和支持引用。它还显示每张卡片何时到期。揭示来源后，学习者在本地检查并记录实际输入的答案。页面显示下次到期日期，将先前和新增作答下载为 JSON 供 CLI 使用。重新记录卡片会编辑当前会话的作答，下载前重载会丢失它。页面不发网络请求。

```figure
pj-source-grounded-study-coach-4
```

## 分析一个例子

编写的种子图书馆卡组含三张卡片。两次正确的存储问题回答与一次错误的收获年份回答后，9 月 3 日报告列出未作答的分类卡片及收获年份卡片已到期。存储卡片 9 月 4 日到期。导出相同事件会复现这些日期。

编码前，写下该例返回的字段及一个应失败的输入。将预期结果放在实现旁，便于区分契约变化与错误。

## 实现契约

- `renderPractice(deck, progress, date): string`
- `exportPractice(deck, attempts, initialDate, date, out)`
- `proposeCard(source, endpoint, model, apiKey="")`

写入 progress.json 和 index.html。拒绝早于初始日期或任何作答的报告日期。转义问题、答案、来源标题和引用。包含精确评分和教学调度方法。可选的真实 HTTP 提案适配器必须要求非空问题、答案和逐字引用；答案位于引用内，引用位于来源内。模型提案另存，供作者审查。

让前面阶段继续工作。在学习者工作区实现这些函数，分析例子时先不要打开参考方案。

## 提示与失败案例

用原生 details/summary 揭示答案，让页面无需框架或服务器也可工作。测试类似 HTML 的来源标题。对于适配器，运行本地 HTTP 服务器，检查发出请求，并返回有效证据与虚构证据。

## 运行本阶段

从仓库根目录初始化一次，再运行累积测试：

```bash
python3 scripts/project_test.py source-grounded-study-coach --init my-source-grounded-study-coach
python3 scripts/project_test.py source-grounded-study-coach --stage 4 --path my-source-grounded-study-coach
```

起始代码有意抛出实现错误。后续初始化保留源文件，不会替换。通过要求所有选中测试都运行；跳过测试不是完成证据。

## 检查推理

学习者只拿 index.html，能离线做什么？要重新计算进度或换用其他界面，必须保留哪些内容？

## 关联最终产物

独立的答案揭示练习页与 progress.json，包含到期卡片和可复现的计划状态。核心使用编写的问题和精确的规范化答案匹配，不评价任意文章，也不推断理解程度。复习间隔是确定性的教学策略，不是经实证验证的学习效果声明。来源偏移量使用 JavaScript UTF-16 代码单元。

完成项目后，试用自己的输入：

```bash
cd my-source-grounded-study-coach
node --experimental-strip-types main.ts --deck ./fixtures/deck.json --attempts ./fixtures/attempts.json --initial-date 2026-09-01 --date 2026-09-03 --out ./study-output
```

使用 Download attempts JSON（下载作答 JSON）按钮，再把文件传给 --attempts，所选复习日期传给 --date。另加一组生成问题的留出评估；传输正常和浏览器事件导出正常，不能证明问题质量。

## 主要参考资料

[官方 API 文档](https://nodejs.org/api/typescript.html)。实现、示例和 fixture 均为原创。参考资料解释底层 API；项目特有策略已在上文说明。
