# 决策取舍探索器

帮助社区团队使用用户提供的标准表和支撑笔记比较实际项目方案。应用明确约束、加权评分和敏感性分析，让缺失值保持可见，并导出交互式 HTML 决策看板和可复用决策记录。

只用标准库。四个阶段，约八小时。评分器会实际运行 TypeScript 实现。

## 动手构建

1. [声明方案与证据](stages/01-declare-evidence/docs/zh.md)
2. [计算可比较的分数](stages/02-normalize-and-score/docs/zh.md)
3. [探索敏感性与支配关系](stages/03-sweep-preferences/docs/zh.md)
4. [导出选定情景](stages/04-export-board/docs/zh.md)

```bash
python3 scripts/project_test.py decision-tradeoff-explorer --init /tmp/decision-tradeoff-explorer-work
python3 scripts/project_test.py decision-tradeoff-explorer --stage 1 --path /tmp/decision-tradeoff-explorer-work --strict
python3 scripts/project_test.py decision-tradeoff-explorer --all --solution --strict
```

全新 starter 在你实现它之前会失败。运行参考方案绝不会授予学习者完成证书。

## 运行你自己的决策

```bash
cd projects/decision-tradeoff-explorer/solution
node --experimental-strip-types cli.ts fixtures/exhibition.json /tmp/decision-board
python3 -m http.server 8123 --directory /tmp/decision-board
```

打开 localhost:8123，修改某项标准的权重，选一个合格方案并下载 decision-record.json。检查后停止临时服务器。CLI 会结束；预览服务器是明确的独立命令。需要 Node 22.18+。

输入 schema 和准确的公开函数契约见各阶段。评分使用固定、预先声明的范围和归一化非负权重。缺失值保持可见，即使对应标准权重为零，也使方案不合格。约束是硬限制。同分按 ID 排序。未知值绝不会被悄悄填补。

导出的 CSV 保留每条原始来源笔记。版本 1 JSON 包含完整决策输入和选定权重，其他程序可用 `score({criteria:receipt.criteria,options:receipt.options},receipt.weights)` 重算。HTML 下载保留用户当前选择的情景。浏览器不发网络请求，只为原创或用户提供的证据评分；它不推断偏好真相，也不代替用户决策。

[Node TypeScript 支持](https://nodejs.org/api/typescript.html)介绍原生类型擦除运行时。

## 完成证据

```bash
python3 scripts/project_test.py decision-tradeoff-explorer --all --path /tmp/decision-tradeoff-explorer-work --strict --report /tmp/decision-tradeoff-explorer-result.json
```

本地报告是未签名的自报证据。可编辑图表计算示意值；CLI 运行实际实现。
