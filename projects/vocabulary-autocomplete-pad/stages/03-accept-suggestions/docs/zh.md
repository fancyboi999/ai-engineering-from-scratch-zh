# 在写作板中接受建议

**类型：** Build
**语言：** TypeScript
**阶段：** 第 3 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** TypeScript 基础、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

插入建议前，区分未完成 token 和完整词语。

## 公开契约

```typescript
completeText(model: Model, text: string, limit?: number): {prefix:string;history:string[];suggestions:Suggestion[]}; acceptSuggestion(text:string,prefix:string,word:string):string
```

只使用最后一个句子边界之后的文本。若末尾是词字符/撇号，就弹出最后一个 token 作为 prefix；否则 prefix 为空。history 是最后两个完整 token。接受时替换精确的后缀 prefix，并追加一个空格。建议必须是规范化的单个 token。

初始工作区包含公开类型、函数桩、CLI 和原始输入 fixture。修改 `main.ts`；CLI 已提供。各阶段累积实现，不替换前面的代码。测试导入由 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 案例分析

`Garden club sh` 得到 prefix sh 和 history [garden,club]。接受 shares 后产生 `Garden club shares `，保留前面的文本。club 后有空格则表示前缀为空。

```figure
pj-vocabulary-autocomplete-pad-3
```

修改图表控件，预测中间值，再将计算与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py vocabulary-autocomplete-pad --init my-vocabulary-autocomplete-pad
python3 scripts/project_test.py vocabulary-autocomplete-pad --stage 3 --path my-vocabulary-autocomplete-pad --strict
```

只初始化一次。全新的第一阶段会有意抛出带名称的未实现错误。保留签名，对格式不正确的输入给出有用错误。不要修改输入。每个阶段都有独立的留出输入；仅演示通过还不够。

## 失败案例与提示

句号后历史重置。不要把补全追加到前缀后，而应替换前缀。拒绝过期前缀。

## 使用结果

第四阶段完成后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-vocabulary-autocomplete-pad
node cli.ts sample.json output
```

本地自动补全写作页面与 vocabulary-model.json。打开 `output/report.html`，查看配套的机器可读文件。

## 扩展

支持光标位置编辑，而不只是在文档规定的输入末尾操作。

范围：这是透明的、基于计数的本地语言模型，不是托管 LLM。它使用最多两个 token 的上下文，建议单个后续 token。浏览器编辑器在输入末尾操作。不暗示存在 provider 适配器。
