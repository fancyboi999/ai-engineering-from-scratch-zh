# 为前缀与后续词候选排序

**类型：** Build
**语言：** TypeScript
**阶段：** 第 2 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** TypeScript 基础、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

按最长的已观察历史排序候选，并显示底层计数。

## 公开契约

```typescript
suggest(model: Model, prefix: string, history?: string[], limit?: number): Suggestion[]
```

规范前缀，用 startsWith 过滤词语。每个词使用最长匹配的后缀历史（先 2 再 1），否则用 unigram 计数。按 order 降序、count 降序、词语字典序排序。返回 `{word,score,order,count,sources}`；用于显示的 score 为 order * 1000000 + count，排序分别使用 order/count。limit 默认为 5，必须为 0..50 的整数。

初始工作区包含公开类型、函数桩、CLI 和原始输入 fixture。修改 `main.ts`；CLI 已提供。各阶段累积实现，不替换前面的代码。测试导入由 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 案例分析

历史 `["garden","club"]` 后的前缀 `s`，order 2/count 1 的 shares 排在 order 0/count 20 的 seed 前面。较低原始计数仍可能是更强的条件证据。

```figure
pj-vocabulary-autocomplete-pad-2
```

修改图表控件，预测中间值，再将计算与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py vocabulary-autocomplete-pad --init my-vocabulary-autocomplete-pad
python3 scripts/project_test.py vocabulary-autocomplete-pad --stage 2 --path my-vocabulary-autocomplete-pad --strict
```

只初始化一次。全新的第一阶段会有意抛出带名称的未实现错误。保留签名，对格式不正确的输入给出有用错误。不要修改输入。每个阶段都有独立的留出输入；仅演示通过还不够。

## 失败案例与提示

未见过的历史会回退。没有候选的前缀返回 []；不编造远程补全。

## 使用结果

第四阶段完成后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-vocabulary-autocomplete-pad
node cli.ts sample.json output
```

本地自动补全写作页面与 vocabulary-model.json。打开 `output/report.html`，查看配套的机器可读文件。

## 扩展

增加平滑，同时保留原始证据计数。

范围：这是透明的、基于计数的本地语言模型，不是托管 LLM。它使用最多两个 token 的上下文，建议单个后续 token。浏览器编辑器在输入末尾操作。不暗示存在 provider 适配器。
