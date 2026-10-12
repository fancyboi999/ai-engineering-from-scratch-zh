# 导出学得的模型与编辑器函数

**类型：** Build
**语言：** TypeScript
**阶段：** 第 4 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** TypeScript 基础、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

校验可移植模型，交付调用同一套建议函数的写作板。

## 公开契约

```typescript
importModel(value: unknown): Model; renderPad(model: Model, initial?: string): string
```

导入时检查 schema 版本、正整数计数、规范化词语、来源数组、history 键长度，以及不超过 unigram 计数的条件计数。返回副本。写作板显示每条建议的证据，导出精确模型及写作文本。

初始工作区包含公开类型、函数桩、CLI 和原始输入 fixture。修改 `main.ts`；CLI 已提供。各阶段累积实现，不替换前面的代码。测试导入由 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 案例分析

导出模型，经 importModel 解析，再调用 suggest。候选列表应相同；JSON 传输不能改变 token 计数或来源证据。

```figure
pj-vocabulary-autocomplete-pad-4
```

修改图表控件，预测中间值，再将计算与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py vocabulary-autocomplete-pad --init my-vocabulary-autocomplete-pad
python3 scripts/project_test.py vocabulary-autocomplete-pad --stage 4 --path my-vocabulary-autocomplete-pad --strict
```

只初始化一次。全新的第一阶段会有意抛出带名称的未实现错误。保留签名，对格式不正确的输入给出有用错误。不要修改输入。每个阶段都有独立的留出输入；仅演示通过还不够。

## 失败案例与提示

把导入的 JSON 当作数据。嵌入脚本的分隔符必须转义；建议使用 DOM textContent。

## 使用结果

第四阶段完成后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-vocabulary-autocomplete-pad
node cli.ts sample.json output
```

本地自动补全写作页面与 vocabulary-model.json。打开 `output/report.html`，查看配套的机器可读文件。使用 `importModel(JSON.parse(modelFile))`，再调用 `suggest(model,"se",["shares","native"])`。若通过 CLI 复用，把 `{model: exportedModel, text:"Garden club sh"}` 作为输入 JSON 传入。

## 扩展

把 suggest 打包成编辑器插件。

范围：这是透明的、基于计数的本地语言模型，不是托管 LLM。它使用最多两个 token 的上下文，建议单个后续 token。浏览器编辑器在输入末尾操作。不暗示存在 provider 适配器。
