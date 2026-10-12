# 生成更简单的候选段落

**类型：** Build
**语言：** TypeScript
**阶段：** 第 2 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** TypeScript 基础、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

让提案来源可见，不要把确定性编辑包装成模型推理。

## 公开契约

```typescript
proposeParagraphs(paragraphs:Paragraph[],recorded?:Record<string,string>):{id,candidate,method}[]
```

按段落 ID 使用提供的已记录提案，否则应用可见的短语替换：in order to -> to、utilize -> use、approximately -> about、prior to -> before、subsequent to -> after、due to the fact that -> because、at this point in time -> now。保留段落身份。拒绝未知提案 ID 和空候选。

初始工作区包含公开类型、函数桩、CLI 和原始输入 fixture。修改 `main.ts`；CLI 已提供。各阶段累积实现，不替换前面的代码。测试导入由 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 案例分析

`In order to utilize the map scale prior to measuring` 变为 `to use the map scale before measuring`。method 字段说明这是可见的短语替换，不声称候选由 LLM 生成。

```figure
pj-plain-language-rewrite-desk-2
```

修改图表控件，预测中间值，再将计算与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py plain-language-rewrite-desk --init my-plain-language-rewrite-desk
python3 scripts/project_test.py plain-language-rewrite-desk --stage 2 --path my-plain-language-rewrite-desk --strict
```

只初始化一次。全新的第一阶段会有意抛出带名称的未实现错误。保留签名，对格式不正确的输入给出有用错误。不要修改输入。每个阶段都有独立的留出输入；仅演示通过还不够。

## 失败案例与提示

替换可能触及保护术语；比较阶段必须捕捉它。不要默默接受任何提案。

## 使用结果

第四阶段完成后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-plain-language-rewrite-desk
node cli.ts sample.json output
```

已接受的 Markdown、段落级 HTML 对照与 revision-decisions.json。打开 `output/report.html`，查看配套的机器可读文件。

## 扩展

在显式凭据控制下增加真实 provider 适配器，另行报告其模型/版本。

范围：基线使用确定性短语替换和记录下来的作者提案。未提供实时模型适配器。数字、保护术语和定义检查是词法层面的防护，不能证明每个事实或细微含义都保留了。作者负责审查含义。
