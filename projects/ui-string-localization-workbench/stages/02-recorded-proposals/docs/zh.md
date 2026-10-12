# 生成有边界的翻译提案

**类型：** Build
**语言：** TypeScript
**阶段：** 第 2 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** TypeScript 基础、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

限制已记录翻译提案，并在审查前报告契约问题。

## 公开契约

```typescript
proposeTranslations(messages:Message[],recorded:unknown,locale:string):Proposal[]
```

用 Intl.Locale 校验 locale。已记录提案是按键索引的字符串，每项 1..2000 个字符。未知键会失败；缺失键产生 null translation 与 missing-proposal 问题。精确保留占位符多重集，公开语法/不匹配问题。返回 `{key,translation,issues,needsContext}`。

初始工作区包含公开类型、函数桩、CLI 和原始输入 fixture。修改 `main.ts`；CLI 已提供。各阶段累积实现，不替换前面的代码。测试导入由 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 案例分析

样本中 borrow.count 的西班牙语提案遗漏 {count}，因此收到 Placeholder multiset changed。borrow.return 没有占位符问题，但仍有歧义，因为 Return 可能指动作，也可能指导航。

```figure
pj-ui-string-localization-workbench-2
```

修改图表控件，预测中间值，再将计算与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py ui-string-localization-workbench --init my-ui-string-localization-workbench
python3 scripts/project_test.py ui-string-localization-workbench --stage 2 --path my-ui-string-localization-workbench --strict
```

只初始化一次。全新的第一阶段会有意抛出带名称的未实现错误。保留签名，对格式不正确的输入给出有用错误。不要修改输入。每个阶段都有独立的留出输入；仅演示通过还不够。

## 失败案例与提示

提案不会自动批准。即使译文自然流畅，缺失占位符也属于可见失败。

## 使用结果

第四阶段完成后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-ui-string-localization-workbench
node cli.ts sample.json output
```

已审查的 locale JSON、交互式消息预览与 unresolved-strings.json。打开 `output/report.html`，查看配套的机器可读文件。

## 扩展

增加真实 provider 适配器，记录 provider/版本，且绝不绕过审查。

范围：译文是输入中提供的原创提案记录，不是实时 provider 集成，也不保证质量。这个教学子集支持简单命名占位符，不支持 ICU 消息。locale 标签影响预览的语言元数据；审查者负责判断译文含义。
