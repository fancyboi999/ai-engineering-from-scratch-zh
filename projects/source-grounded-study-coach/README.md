# 有来源依据的学习教练

构建带来源证据和可见复习计划的练习题。

你将构建独立的答案揭示练习页与 progress.json，包含到期卡片和可复现的计划状态。输入：包含来源段落、编写的问题、可接受答案和证据偏移量的 JSON 卡组，以及带日期的作答事件。

## 开始前

Node.js 22.18 或更新版本。必需核心使用标准库，离线运行。TypeScript 用同一套显式数据类型处理卡组校验、事件处理和可移植 HTML 练习视图。

- 能编写 TypeScript 函数、数组和对象类型。
- 能从本地文件读取 JSON 并处理抛出的错误。
- 理解答案字符串匹配并不代表语义理解。

## 动手构建

```bash
python3 scripts/project_test.py source-grounded-study-coach --init my-source-grounded-study-coach
python3 scripts/project_test.py source-grounded-study-coach --stage 1 --path my-source-grounded-study-coach
python3 scripts/project_test.py source-grounded-study-coach --all --solution --strict
```

第一条命令创建有意未完成的工作区。后续阶段扩展同一个源文件；测试包含新的留出输入。参考方案通过只验证示例，不授予学习者证书。

## 实际使用

```bash
cd projects/source-grounded-study-coach/solution
node --experimental-strip-types main.ts --deck ./fixtures/deck.json --attempts ./fixtures/attempts.json --initial-date 2026-09-01 --date 2026-09-03 --out ./study-output
```

在本地打开生成的 index.html。输入答案，揭示证据，再选择 Check and record my answer（检查并记录我的答案）。下载 attempts JSON，保存实际输入的回答与先前事件。在同一页面会话中重新记录卡片会更新一条新作答；下载前重载会丢失它。浏览器用同一确定性策略立即显示下次到期日期。

用下载文件重新运行调度器：

```bash
node --experimental-strip-types main.ts --deck ./fixtures/deck.json --attempts ./attempts.json --initial-date 2026-09-01 --date 2026-09-03 --out ./next-study-output
```

--date 使用页面所选的复习日期。浏览器中的全部处理都在本地进行。把 HTML 和 JSON 复制到自己的工作流，或从 main 导入具名函数。内置演示在原始 fixture 上运行同一个实现：

```bash
node --experimental-strip-types demo.ts
```

## 阶段

1. [给每个答案标明来源位置](stages/01-ground-the-deck/docs/zh.md)
2. [返回显示来源的反馈](stages/02-grade-with-evidence/docs/zh.md)
3. [重放作答事件，生成可见的复习计划](stages/03-schedule-review/docs/zh.md)
4. [把阅读材料变成实用练习页](stages/04-export-practice/docs/zh.md)

## 结果能证明什么

核心使用编写的问题和精确的规范化答案匹配，不评价任意文章，也不推断理解程度。复习间隔是确定性的教学策略，不是经实证验证的学习效果声明。来源偏移量使用 JavaScript UTF-16 代码单元。

可选：追加 --provider-url http://127.0.0.1:1234/v1/chat/completions --model YOUR_MODEL。若需要身份验证，由 STUDY_MODEL_API_KEY 提供。端点接收第一份来源段落，必须返回逐字引用与答案。提案单独写入 card-proposal.json 供审查，从不默默加入卡组。

provider 测试使用受控响应或回环 HTTP。它们验证请求和响应契约，不验证模型质量或实时服务可用性。本项目没有配置账号连接、对外消息、周期任务或云部署。

## 换成自己的材料

用你工作流中的一小份导出替换编写的 fixture，运行之前写下预期结果。保留第二组示例用于评估。有用的前后对比演示应显示输入、可检查的中间证据和可移植输出，不应以热度声明替代测量结果。

## 主要参考资料

[官方 API 文档](https://nodejs.org/api/typescript.html)。所有项目代码、课程正文和 fixture 均为原创。
