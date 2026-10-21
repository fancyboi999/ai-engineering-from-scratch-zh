---
id: decision-briefing-tools
title: 决策、变更与教程工具
code: DT
subtitle: 四种证据工具：为方案评分、概述网页变更、检查 API 教程、比较本地模型运行。
hue: 205
sources: projects/decision-tradeoff-explorer, projects/web-change-brief, projects/api-tutorial-runner, projects/local-model-eval-harness
source_hash: 943d4fc28de7337b
---

## 四个项目对比
type: comparison
span: 3
from: projects/decision-tradeoff-explorer/README.md, projects/decision-tradeoff-explorer/solution/cli.ts, projects/web-change-brief/README.md, projects/web-change-brief/solution/main.go, projects/api-tutorial-runner/README.md, projects/api-tutorial-runner/solution/cli.ts, projects/local-model-eval-harness/README.md, projects/local-model-eval-harness/solution/cli.py

| 维度 | Decision Tradeoff Explorer | Web Change Brief | API Tutorial Runner | Local Model Eval Harness |
|---|---|---|---|---|
| 语言 | Node 22.18+ | Go 1.22 或更新版 | Node 22.18 或更新版 | Python 3.10+ |
| 输入 | `criteria`、`options` | 两份 HTML 快照，或基线与 URL | `tutorial`、`fixture` 或 `endpoint` | `manifest`、`source`、`labels`、`records` |
| 输出 | `criteria.csv`、`decision-record.json`、`index.html` | `index.html`、`changes.json`、`baseline.json` | `requests.json`、`results.json`、`junit.xml`、`report.html` | `scorecard.json`、`reliability.html` |
| 闸门 | 所选方案必须符合资格 | `--accept` 替换基线 | 真实端点需 `--allow-network` | 低于 `--min-accuracy` 时以 2 退出 |
| 不执行的操作 | 替用户决策 | 运行 JavaScript 或获取链接资源 | 负载测试 | 下载或启动模型 |

## 运行参考实现
type: command-table
span: 2
from: projects/decision-tradeoff-explorer/README.md, projects/web-change-brief/README.md, projects/api-tutorial-runner/README.md, projects/local-model-eval-harness/README.md

| 命令 | 作用 |
|---|---|
| `node --experimental-strip-types cli.ts fixtures/exhibition.json /tmp/decision-board` | 写入决策看板 |
| `python3 -m http.server 8123 --directory /tmp/decision-board` | 在 localhost:8123 提供服务，用完后停止 |
| `go run . --before fixtures/before.html --after fixtures/after.html --url <url> --out ./web-change-output` | 比较两份已保存的快照 |
| `go run . --fetch <url> --baseline ./web-change-output/baseline.json --out ./next-report` | 获取一个在线页面并与基线比较 |
| `node cli.ts sample.json output` | 在本地回环测试环境运行教程 |
| `python3 cli.py samples/input.json --output scorecard.json --html reliability.html` | 为样例记录评分 |
| `python3 scripts/project_test.py <project> --all --solution --strict` | 评测参考实现 |

## 决策评分规则
type: concepts
from: projects/decision-tradeoff-explorer/solution/main.ts, projects/decision-tradeoff-explorer/README.md

- **收益**：`(v - c.min) / (c.max - c.min)`。
- **成本**：`(c.max - v) / (c.max - c.min)`。
- **得分**：规范化值乘权重后求和，再除以权重总和。
- **缺失值**：该方案不符合资格，即使对应权重为 0。
- **限制**：硬约束。成本高于限制或收益低于限制都不通过。
- **平分**：按方案 id 排序。
- **被支配**：另一方案在所有指标上都不差，且至少一项更好。
- **敏感性**：以 `steps` 为步数，将一个权重从 0 扫到 1。

## 网页变更简报
type: architecture
from: projects/web-change-brief/solution/main.go, projects/web-change-brief/README.md

```arch
node | in | 1,1 | before.html、after.html | 或 --fetch 一个 URL | client
node | ex | 2,1 | ExtractBlocks() | 可读文本块 | process
node | snap | 3,1 | NewSnapshot() | 规范 URL、hash | process
node | cmp | 3,2 | Compare() | 新增、删除、未变 | process
node | exp | 2,2 | ExportBrief() | index.html、changes.json | store
node | base | 1,2 | SaveSnapshot() | baseline.json | store
edge | in | ex | HTML
edge | ex | snap | 文本块
edge | snap | cmp | 两份快照
edge | cmp | exp | 简报
edge | exp | base | 更新后快照
```

## 教程请求块
type: annotated-code
lang: text
from: projects/api-tutorial-runner/solution/sample.json, projects/api-tutorial-runner/solution/main.ts

```text
# 教程在 request 围栏内保存 JSON
{"id": "create-loan", "method": "POST", "path": "/loans",
 "status": 201,  # 预期状态，100..599
 "capture": {"loanId": {"path": "id", "type": "number"}}}  # 带类型的捕获
{"id": "read-loan", "method": "GET",
 "path": "/loans/{{loanId}}",  # 只允许已声明变量
 "status": 200,
 "assert": {"bookName": "Neighborhood Trees"}}  # 过时字段，会失败
```

## API 教程运行器步骤
type: flow
from: projects/api-tutorial-runner/solution/main.ts, projects/api-tutorial-runner/solution/cli.ts

1. **extractRequests**：读取各请求围栏，最多允许 20 步。
2. **CLI**：没有 `endpoint` 时，从 `fixture` 启动回环服务器。
3. **runTutorial**：用先前捕获值填充 `{{name}}`，未声明名称会失败。
4. **runTutorial**：发送请求，不跟随重定向，设置超时和字节限制。
5. **runTutorial**：检查状态及每个 `assert` 路径，再保存捕获值。
6. **runTutorial**：某步失败后，跳过后续步骤，不再发送请求。
7. **exportResults**：为每个失败写入 JUnit、HTML 和 `corrections.json`。

## 记录并比较本地模型
type: annotated-code
lang: bash
from: projects/local-model-eval-harness/README.md, projects/local-model-eval-harness/solution/record.py, projects/local-model-eval-harness/solution/cli.py

```bash
python3 record.py samples/cases.json \  # 仅允许回环 HTTP 端点
  --endpoint http://127.0.0.1:11434/v1/chat/completions \
  --model <model> --revision <rev> --hardware <hw> \
  --output measured.json  # manifest、source、labels、records
python3 cli.py measured.json --baseline samples/input.json \
  --output compared.json  # 拒绝数据集标签不同的记录
python3 cli.py <recording> --min-accuracy <n>  # 低于闸门值时以 2 退出
```

## 评分卡字段
type: concepts
from: projects/local-model-eval-harness/solution/main.py, projects/local-model-eval-harness/solution/cli.py, projects/local-model-eval-harness/README.md

- **accuracy**：忽略大小写并清理空格后精确匹配答案，以全部标签为分母。
- **coverage**：预测数除以标签数。
- **ece**：逐分箱计算置信度差距，按箱内数量加权。
- **p50_ms、p95_ms**：使用最近秩法计算的延迟百分位数。
- **dataset_sha256**：标签的 hash，基线必须匹配。
- **manifest**：需要 `model`、`model_revision`、`prompt_revision`、`hardware` 和 `confidence_method`。

## 默认值与限制
type: defaults
from: projects/web-change-brief/solution/main.go, projects/api-tutorial-runner/solution/main.ts, projects/local-model-eval-harness/solution/main.py, projects/local-model-eval-harness/solution/cli.py, projects/decision-tradeoff-explorer/solution/main.ts

| 设置 | 默认值 | 说明 |
|---|---|---|
| `--out` | `web-change-output` | 网页简报目录 |
| `MaxHTMLBytes` | `2_000_000` | 每页 2 MB |
| `timeoutMs` | 1500 | 每请求超时，范围 1 至 30000 |
| `maxBytes` | 65536 | 响应字节上限 |
| 请求步骤 | 20 | 每篇教程的最大步数 |
| `bins` | 5 | 校准分箱数 |
| `--min-accuracy` | 0 | 低于该值时退出码为 2 |
| 敏感性 `steps` | 10 | 范围 1 至 100 |

## 错误消息与修正
type: troubleshooting
from: projects/decision-tradeoff-explorer/solution/main.ts, projects/web-change-brief/solution/main.go, projects/web-change-brief/README.md, projects/api-tutorial-runner/solution/main.ts, projects/api-tutorial-runner/README.md, projects/local-model-eval-harness/solution/cli.py

| 现象 | 原因 | 修正 |
|---|---|---|
| `chosen option must be eligible` | 方案有缺失值或违反限制 | 选择已评分的方案 |
| `value outside declared range` | 值不在 `min` 与 `max` 之间 | 修正值或范围 |
| `Snapshots must refer to the same canonical URL` | 两个 URL 不同 | 比较同一页面的快照 |
| `Live fetch requires --baseline JSON` | 使用 `--fetch` 但未提供基线 | 先运行已保存文件模式 |
| `Baseline checksum mismatch` | 基线文件被修改 | 新建基线 |
| `Network endpoint requires explicit allowNetwork` | 端点不是回环地址 | 添加 `--allow-network` |
| `Earlier step failed; no request sent` | 前面某步失败 | 修正首个失败步骤 |
| `cannot compare different datasets` | 标签与基线不同 | 重新记录同一组样例 |

## 示例解读
type: qa
from: projects/decision-tradeoff-explorer/solution/fixtures/exhibition.json, projects/decision-tradeoff-explorer/solution/main.ts, projects/api-tutorial-runner/README.md, projects/api-tutorial-runner/solution/sample.json, projects/local-model-eval-harness/README.md

- **展览样例中哪个方案胜出？** `pods` 得分 0.68，`open` 为 0.67。
- **为什么 `archive` 没有排名？** 它的 `flow` 值为 null，因此不符合资格。
- **`open` 什么时候胜出？** 在 `access` 扫描中，权重达到 0.6 或更高时。
- **`read-loan` 为什么失败？** 它断言了过时字段 `bookName`。
- **评估样例得分是多少？** 准确率 2/3，覆盖率完整，p95 为 200 ms。

## 提示
type: tips
from: projects/web-change-brief/README.md, projects/decision-tradeoff-explorer/README.md, projects/local-model-eval-harness/README.md, projects/api-tutorial-runner/README.md

- 两份快照使用同一过滤策略，过滤短语可能隐藏变更。
- 除非传入 `--accept`，否则不会修改基线。
- 权重是偏好，不是概率。
- 报告的置信度由模型自述，ECE 随分箱与样本数变化。
- 教程命令写出证据后会成功退出。必须阅读执行回执。
