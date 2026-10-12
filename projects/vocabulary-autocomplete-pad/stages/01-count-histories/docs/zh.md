# 对语料分词并统计词语历史

**类型：** Build
**语言：** TypeScript
**阶段：** 第 1 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** TypeScript 基础、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

统计词语及一词或两词历史，不跨越句子边界。

## 公开契约

```typescript
tokenize(text: string): string[]; train(corpus: unknown): Model
```

输入语料为 `{id:string,text:string}[]`，id 非空且唯一。规范为 NFC 和小写。token 包含 Unicode 字母/数字及内部撇号。按句号、问号、感叹号或换行分句。模型 `{schemaVersion:1,words,histories,sources}` 将 token 映射到计数、JSON 编码的历史映射到后续词计数、词语映射到 source id。

初始工作区包含公开类型、函数桩、CLI 和原始输入 fixture。修改 `main.ts`；CLI 已提供。各阶段累积实现，不替换前面的代码。测试导入由 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 案例分析

语料 `Garden club shares seeds. Garden club grows herbs.` 统计 garden=2、club=2，并记录 `["garden","club"] -> {shares:1,grows:1}`。不会记录 seeds 到 garden 的转移。

```figure
pj-vocabulary-autocomplete-pad-1
```

修改图表控件，预测中间值，再将计算与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py vocabulary-autocomplete-pad --init my-vocabulary-autocomplete-pad
python3 scripts/project_test.py vocabulary-autocomplete-pad --stage 1 --path my-vocabulary-autocomplete-pad --strict
```

只初始化一次。全新的第一阶段会有意抛出带名称的未实现错误。保留签名，对格式不正确的输入给出有用错误。不要修改输入。每个阶段都有独立的留出输入；仅演示通过还不够。

## 失败案例与提示

使用能安全处理 constructor 等 token 的字典。不要学习跨句转移。来源必须保持可检查。

## 使用结果

第四阶段完成后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-vocabulary-autocomplete-pad
node cli.ts sample.json output
```

本地自动补全写作页面与 vocabulary-model.json。打开 `output/report.html`，查看配套的机器可读文件。

## 扩展

除了来源身份，也跟踪段落来源。

范围：这是透明的、基于计数的本地语言模型，不是托管 LLM。它使用最多两个 token 的上下文，建议单个后续 token。浏览器编辑器在输入末尾操作。不暗示存在 provider 适配器。
