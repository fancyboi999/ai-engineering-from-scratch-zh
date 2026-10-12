# 导出可供人工检查的简报

> 在来源和哈希旁展示精确新增和移除语句。

**类型：** Build  
**语言：** Go  
**阶段：** 第 4 阶段，共 4 阶段  
**预计时间：** 约 2 小时

## 构建内容

报告应无需阅读原始 HTML 就回答什么变化。列精确新增移除的规范语句、出现次数、未变块数。包含源 URL 与两哈希，让其他工具关联简报与保存快照。

```figure
pj-web-change-brief-4
```

## 示例推演

makerspace fixture 将维修开始从 14:00 改为 15:00，志愿者名额从三个减为一个，新增无台阶入口说明。导航计数和页脚时间戳变化不出现。报告保留前后语句，不虚构其意图摘要。

编码前写下示例返回字段和一个应失败输入。把预期结果放在实现旁，区分契约变化与错误。

## 实现契约

- `ExportBrief(brief Brief, directory string) error`
- `CLI 标记：--before, --after, --url, --out, --fetch, --baseline, --accept, --ignore`

写 changes.json 和 index.html。用 html/template 转义不可信页面文本、安全处理 URL 上下文。空变更列表显示明确无变化消息。CLI 也将新快照写入输出目录；真实模式仅提供 --accept 才覆盖已有基线。错误返回非零退出码。

保持此前阶段正常工作。在学员工作区实现这些函数，推演示例时不要打开参考方案。

## 提示与失败案例

构建带类似脚本文本块的 Brief，验证 HTML 含转义文本。解码 JSON 报告，检查出现次数。对不同保存文件运行实际 CLI，再打开输出，不要只从模板源码判断页面。

## 运行阶段

从仓库根初始化一次，再运行累积测试：

```bash
python3 scripts/project_test.py web-change-brief --init my-web-change-brief
python3 scripts/project_test.py web-change-brief --stage 4 --path my-web-change-brief
```

starter 刻意抛实现错误。之后初始化保留源码，不替换。通过要求每个选定测试运行；跳过测试不是完成证据。

## 检查推理

人能从报告直接确认什么，什么需要原始 HTML 或渲染页？生成叙述为何绝不能替代精确变更证据？

## 接入完成产物

独立变更报告、changes.json 与可复用 baseline.json 快照。提取器是刻意受限的可读块扫描器，不是 HTML5 DOM 或浏览器。不执行 JavaScript、不评估 CSS 可见性、不抓链接资源。忽略块顺序，保留重复文本计数。过滤短语可能隐藏有用变化，所以两快照使用相同显式过滤策略。

项目完成后试自己的输入：

```bash
cd my-web-change-brief
go run . --before fixtures/before.html --after fixtures/after.html --url https://example.invalid/makerspace --out ./web-change-output
```

添加审查备注字段或 Markdown 导出供团队交接。自动外发通知保持为单独配置集成，带自己的测试。

## 主要参考

[官方 API 文档](https://pkg.go.dev/net/http)。实现、示例、fixture 均原创。参考解释底层 API；项目特定策略已在上面说明。
