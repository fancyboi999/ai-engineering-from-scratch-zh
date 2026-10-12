# 用提供的插值预览字符串

**类型：** Build
**语言：** TypeScript
**阶段：** 第 3 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** TypeScript 基础、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

把插值呈现为文本，让审查者看到真实的布局内容。

## 公开契约

```typescript
previewMessage(template:string,values:Record<string,string|number>):string
```

用提供的自有属性值替换每个支持的占位符。缺少值时保留原来的 {name} token。返回纯文本；HTML 调用者必须使用 textContent 或转义。先验证占位符语法。

初始工作区包含公开类型、函数桩、CLI 和原始输入 fixture。修改 `main.ts`；CLI 已提供。各阶段累积实现，不替换前面的代码。测试导入由 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 案例分析

值为 `{count:3,name:"Lina"}` 时，`Hola, {name}` 预览为 Hola, Lina。缺少 name 时保留可见的 {name}。改变预览值从不改变存储的译文。

```figure
pj-ui-string-localization-workbench-3
```

修改图表控件，预测中间值，再将计算与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py ui-string-localization-workbench --init my-ui-string-localization-workbench
python3 scripts/project_test.py ui-string-localization-workbench --stage 3 --path my-ui-string-localization-workbench --strict
```

只初始化一次。全新的第一阶段会有意抛出带名称的未实现错误。保留签名，对格式不正确的输入给出有用错误。不要修改输入。每个阶段都有独立的留出输入；仅演示通过还不够。

## 失败案例与提示

包含标记的值在界面中必须仍作为可见文本。不要使用 JavaScript 求值或继承的对象属性。

## 使用结果

第四阶段完成后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-ui-string-localization-workbench
node cli.ts sample.json output
```

已审查的 locale JSON、交互式消息预览与 unresolved-strings.json。打开 `output/report.html`，查看配套的机器可读文件。

## 扩展

针对选定产品组件，用真实浏览器尺寸衡量溢出。

范围：译文是输入中提供的原创提案记录，不是实时 provider 集成，也不保证质量。这个教学子集支持简单命名占位符，不支持 ICU 消息。locale 标签影响预览的语言元数据；审查者负责判断译文含义。
