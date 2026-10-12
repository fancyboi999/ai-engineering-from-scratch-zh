# 比较遗漏、数字与可读性指标

**类型：** Build
**语言：** TypeScript
**阶段：** 第 3 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** TypeScript 基础、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

比较可观察到的编辑变化，显示已记录事实的违规情况。

## 公开契约

```typescript
measures(text:string):{words,sentences,averageWords,longWords}; compareParagraphs(paragraphs,proposals,definitions?):Comparison[]
```

每个段落必须恰好有一个提案。统计 Unicode 单词 token、按标点分隔的句子、保留两位小数的平均每句词数，以及长度大于 8 个字符的单词数。issues 报告数字多重集变化、缺少精确保护术语、缺少不区分大小写的必需定义短语。返回 original/candidate、before/after 指标和 issues。

初始工作区包含公开类型、函数桩、CLI 和原始输入 fixture。修改 `main.ts`；CLI 已提供。各阶段累积实现，不替换前面的代码。测试导入由 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 案例分析

样本的第二个提案把 15% 改为 10%，还删掉了必需的精确定义短语。即使句长指标降低，这两个问题也仍然可见。

```figure
pj-plain-language-rewrite-desk-3
```

修改图表控件，预测中间值，再将计算与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py plain-language-rewrite-desk --init my-plain-language-rewrite-desk
python3 scripts/project_test.py plain-language-rewrite-desk --stage 3 --path my-plain-language-rewrite-desk --strict
```

只初始化一次。全新的第一阶段会有意抛出带名称的未实现错误。保留签名，对格式不正确的输入给出有用错误。不要修改输入。每个阶段都有独立的留出输入；仅演示通过还不够。

## 失败案例与提示

平均值降低并不能证明易于理解。数字字面量从 15% 变为 10% 时，即使文字看起来更简单，也必须阻止接受。

## 使用结果

第四阶段完成后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-plain-language-rewrite-desk
node cli.ts sample.json output
```

已接受的 Markdown、段落级 HTML 对照与 revision-decisions.json。打开 `output/report.html`，查看配套的机器可读文件。

## 扩展

增加人工含义检查清单，但不要假装词法检查覆盖所有遗漏。

范围：基线使用确定性短语替换和记录下来的作者提案。未提供实时模型适配器。数字、保护术语和定义检查是词法层面的防护，不能证明每个事实或细微含义都保留了。作者负责审查含义。
