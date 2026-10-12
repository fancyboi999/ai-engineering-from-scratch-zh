# 分段并记录保护术语与事实

**类型：** Build
**语言：** TypeScript
**阶段：** 第 1 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** TypeScript 基础、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

分开段落，同时记录后续修订必须保留的事实。

## 公开契约

```typescript
segmentProse(text:string,protectedTerms?:string[]):Paragraph[]
```

按空行分段，修剪每个非空段落，分配 p1,p2,...。返回 `{id,text,numbers,protectedTerms}`。numbers 是排序后的数字字面表达式，可带百分号或常见单位 km,cm,mm,ms,kg,m,s。protectedTerms 是该段中出现的区分大小写的精确字符串。

初始工作区包含公开类型、函数桩、CLI 和原始输入 fixture。修改 `main.ts`；CLI 已提供。各阶段累积实现，不替换前面的代码。测试导入由 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 案例分析

段落 `A projection uses 15%.` 记录 numbers ["15%"] 和 protectedTerms ["projection"]。空行创建新身份；仅折行不会。

```figure
pj-plain-language-rewrite-desk-1
```

修改图表控件，预测中间值，再将计算与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py plain-language-rewrite-desk --init my-plain-language-rewrite-desk
python3 scripts/project_test.py plain-language-rewrite-desk --stage 1 --path my-plain-language-rewrite-desk --strict
```

只初始化一次。全新的第一阶段会有意抛出带名称的未实现错误。保留签名，对格式不正确的输入给出有用错误。不要修改输入。每个阶段都有独立的留出输入；仅演示通过还不够。

## 失败案例与提示

重复出现的数字很重要；使用多重集，而不仅是集合。这些检查不能证明语义等价。

## 使用结果

第四阶段完成后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-plain-language-rewrite-desk
node cli.ts sample.json output
```

已接受的 Markdown、段落级 HTML 对照与 revision-decisions.json。打开 `output/report.html`，查看配套的机器可读文件。

## 扩展

增加日期与标识符提取器，并提供显式测试。

范围：基线使用确定性短语替换和记录下来的作者提案。未提供实时模型适配器。数字、保护术语和定义检查是词法层面的防护，不能证明每个事实或细微含义都保留了。作者负责审查含义。
