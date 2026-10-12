# 导出已接受修订与变更记录

**类型：** Build
**语言：** TypeScript
**阶段：** 第 4 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** TypeScript 基础、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

只应用显式接受且通过事实检查的提案，其他原文全部保留。

## 公开契约

```typescript
exportRevisions(comparisons,value?):{markdown,changeRecord,decisions,unresolved}; renderDesk(comparisons,state):string
```

审查结构 `{schemaVersion:1,decisions:[{id,decision:"accept"|"reject"|"pending",candidate}]}` 将决定绑定到精确候选文本。未知、重复或过期决定会失败。带 issues 的 accept 会失败。pending 和 reject 段落保留原文。导出 accepted.md、changes.md、带版本的决定和待处理 ID。

初始工作区包含公开类型、函数桩、CLI 和原始输入 fixture。修改 `main.ts`；CLI 已提供。各阶段累积实现，不替换前面的代码。测试导入由 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 案例分析

在界面中接受 p1、拒绝 p2，下载决定，再运行。accepted.md 包含缩短后的第一段和未改变的第二段原文。修改后的审查若接受 p2，会被 CLI 拒绝。

```figure
pj-plain-language-rewrite-desk-4
```

修改图表控件，预测中间值，再将计算与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py plain-language-rewrite-desk --init my-plain-language-rewrite-desk
python3 scripts/project_test.py plain-language-rewrite-desk --stage 4 --path my-plain-language-rewrite-desk --strict
```

只初始化一次。全新的第一阶段会有意抛出带名称的未实现错误。保留签名，对格式不正确的输入给出有用错误。不要修改输入。每个阶段都有独立的留出输入；仅演示通过还不够。

## 失败案例与提示

提案文本变化后，先前批准不能沿用。即使下载文件被编辑，CLI 导入时重新检查也能保护这个边界。

## 使用结果

第四阶段完成后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-plain-language-rewrite-desk
node cli.ts sample.json output
```

已接受的 Markdown、段落级 HTML 对照与 revision-decisions.json。打开 `output/report.html`，查看配套的机器可读文件。将下载的 revision-decisions.json 作为第三个 CLI 参数传入。accepted.md 是完整文档：已接受段落使用修订；pending/rejected 段落保留原文。

## 扩展

记录作者提供的审查者身份与时间戳。

范围：基线使用确定性短语替换和记录下来的作者提案。未提供实时模型适配器。数字、保护术语和定义检查是词法层面的防护，不能证明每个事实或细微含义都保留了。作者负责审查含义。
