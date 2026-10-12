# 读取消息键、占位符与上下文

**类型：** Build
**语言：** TypeScript
**阶段：** 第 1 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** TypeScript 基础、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

翻译前记录稳定键与精确的插值契约。

## 公开契约

```typescript
placeholders(text:string):string[]; readCatalog(value:unknown):Message[]
```

消息目录将键映射到 `{text,context,ambiguous?}`。键以字母开头，可包含字母/数字/点/下划线/连字符；保留的原型名称会失败。text/context 必须非空。只支持简单的 `{name}` 占位符，返回包含重复项的排序多重集。拒绝未配对/嵌套花括号及 ICU plural 语法。

初始工作区包含公开类型、函数桩、CLI 和原始输入 fixture。修改 `main.ts`；CLI 已提供。各阶段累积实现，不替换前面的代码。测试导入由 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 案例分析

消息 count 的文本为 `You selected {count} tools`，context 说明其汇总位置。存储的占位符多重集是 ["{count}"]。删除 count 的译文不能批准。

```figure
pj-ui-string-localization-workbench-1
```

修改图表控件，预测中间值，再将计算与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py ui-string-localization-workbench --init my-ui-string-localization-workbench
python3 scripts/project_test.py ui-string-localization-workbench --stage 1 --path my-ui-string-localization-workbench --strict
```

只初始化一次。全新的第一阶段会有意抛出带名称的未实现错误。保留签名，对格式不正确的输入给出有用错误。不要修改输入。每个阶段都有独立的留出输入；仅演示通过还不够。

## 失败案例与提示

{count} 出现两次，译文中也必须出现两次。简短且有歧义的 UI 文本必须有上下文。

## 使用结果

第四阶段完成后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-ui-string-localization-workbench
node cli.ts sample.json output
```

已审查的 locale JSON、交互式消息预览与 unresolved-strings.json。打开 `output/report.html`，查看配套的机器可读文件。

## 扩展

把 ICU 解析器作为独立扩展添加，并给出自己的契约。

范围：译文是输入中提供的原创提案记录，不是实时 provider 集成，也不保证质量。这个教学子集支持简单命名占位符，不支持 ICU 消息。locale 标签影响预览的语言元数据；审查者负责判断译文含义。
