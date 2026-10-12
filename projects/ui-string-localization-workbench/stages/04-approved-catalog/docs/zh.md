# 导出已批准 locale 与未解决问题

**类型：** Build
**语言：** TypeScript
**阶段：** 第 4 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** TypeScript 基础、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

只导出显式批准、且完成上下文检查的译文。

## 公开契约

```typescript
reviewTranslations(messages,proposals,value?):{catalog,unresolved,review}; renderWorkbench(messages,proposals,state,locale,values?):string
```

审查结构 `{schemaVersion:1,decisions:{[key]:{decision:"pending"|"approve"|"reject",translation,acknowledgeContext:boolean}}}` 将每个决定绑定到精确提案文本。批准要求没有 issues；有歧义的字符串还要求确认上下文。pending/rejected 键保留在 unresolved，不写入 locale.json。浏览器预览支持变量编辑及审查下载。

初始工作区包含公开类型、函数桩、CLI 和原始输入 fixture。修改 `main.ts`；CLI 已提供。各阶段累积实现，不替换前面的代码。测试导入由 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 案例分析

批准 borrow.hello；批准 borrow.return 前先确认上下文。导出的 locale 只包含这两个键；borrow.count 继续待解决，直到修正其提案记录并重新审查。

```figure
pj-ui-string-localization-workbench-4
```

修改图表控件，预测中间值，再将计算与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py ui-string-localization-workbench --init my-ui-string-localization-workbench
python3 scripts/project_test.py ui-string-localization-workbench --stage 4 --path my-ui-string-localization-workbench --strict
```

只初始化一次。全新的第一阶段会有意抛出带名称的未实现错误。保留签名，对格式不正确的输入给出有用错误。不要修改输入。每个阶段都有独立的留出输入；仅演示通过还不够。

## 失败案例与提示

在 CLI 中重新校验下载的决定。过期译文和编辑过的批准文件不能绕过占位符或歧义检查。

## 使用结果

第四阶段完成后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-ui-string-localization-workbench
node cli.ts sample.json output
```

已审查的 locale JSON、交互式消息预览与 unresolved-strings.json。打开 `output/report.html`，查看配套的机器可读文件。运行 `node cli.ts sample.json reviewed-output locale-review.json`；把 locale.json 作为键到字符串的目录消费。未批准键保持缺失，理由在 unresolved-strings.json 中。

## 扩展

用未解决队列规划下一轮编辑。

范围：译文是输入中提供的原创提案记录，不是实时 provider 集成，也不保证质量。这个教学子集支持简单命名占位符，不支持 ICU 消息。locale 标签影响预览的语言元数据；审查者负责判断译文含义。
