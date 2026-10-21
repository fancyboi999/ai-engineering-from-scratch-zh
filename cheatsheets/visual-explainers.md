---
id: visual-explainers
title: 图示、图表与基础设施解释器
code: DE
subtitle: 四个本地解释器项目。运行项目、提供输入、阅读输出并修正错误。
hue: 262
sources: projects/chart-storyboard-builder, projects/diagram-reading-companion, projects/infrastructure-plan-explainer, projects/service-ownership-navigator
source_hash: 37ecf891c66f6354
---

## 四个项目对比
type: comparison
span: 3
from: projects/chart-storyboard-builder/README.md, projects/chart-storyboard-builder/solution/cli.py, projects/diagram-reading-companion/README.md, projects/diagram-reading-companion/solution/cli.ts, projects/infrastructure-plan-explainer/README.md, projects/infrastructure-plan-explainer/solution/cli.py, projects/service-ownership-navigator/README.md, projects/service-ownership-navigator/solution/cli.ts

| 因素 | 图表故事板构建器 | 图示阅读助手 | 基础设施计划解释器 | 服务归属导航器 |
|---|---|---|---|---|
| 语言 | Python 3.10+ | Node 22.18 或更新版本 | Python 3.10+ | Node 22.18 或更新版本 |
| 输入 | `csv`, `roles`, `periods`, `charts` | `svg`, `graph` | Terraform plan JSON | `catalog`, `path` |
| 输出 | `chart-N.svg`, `chart-specs.json`, `storyboard.html` | `graph.json`, `analysis.json`, `report.html` | `change-brief.md`, `resource-impact.json`, `review.html` | `handoff.json`, `catalog.json`, `report.html` |
| 审核文件 | 无 | 第三个参数，经审核的顺序 | 无 | 无 |
| 不执行的操作 | 推断日期或因果关系 | 从 SVG 几何推断含义 | 应用计划 | 发送通知 |

## 运行参考解答
type: command-table
from: projects/chart-storyboard-builder/README.md, projects/infrastructure-plan-explainer/README.md, projects/diagram-reading-companion/README.md, projects/service-ownership-navigator/README.md, projects/diagram-reading-companion/solution/cli.ts

| 命令 | 作用 |
|---|---|
| `python3 cli.py samples/input.json --output demo-output` | 图表或基础设施示例 |
| `node cli.ts sample.json output` | 图示或归属示例 |
| `node cli.ts <input.json> <dir> <review.json>` | 使用已审核顺序的图示 |
| `node cli.ts --help` | 打印参数行 |
| `python3 scripts/project_test.py <project> --all --solution --strict` | 评测参考解答 |
| `python3 scripts/project_test.py <project> --init <dir>` | 创建起步项目 |

## 解释真实 Terraform 计划
type: annotated-code
lang: bash
from: projects/infrastructure-plan-explainer/README.md, projects/infrastructure-plan-explainer/solution/cli.py

```bash
terraform show -json saved.plan > input.json  # 将保存的计划导出为 JSON
python3 cli.py input.json --output review  # 绝不应用计划
# review/change-brief.md        带本地锚点的地址
# review/resource-impact.json   graph.edges 与资源
# review/review.html            变更、边、未解析项
```

## 计划解释器流水线
type: flow
from: projects/infrastructure-plan-explainer/API.md, projects/infrastructure-plan-explainer/solution/main.py

1. **load_plan**：仅接受主版本为 1 的格式。保留操作及脱敏后的 `before` 与 `after`。
2. **load_plan**：敏感值显示为 `[sensitive]`，计算值显示为 `[unknown]`。
3. **classify**：将每个精确操作序列映射为一个操作名称。
4. **impact_graph**：按最长地址前缀连接引用与 `depends_on`。
5. **impact_graph**：跳过 `var`、`local`、`path`、`count`、`each`、`terraform` 与 `self`。
6. **explain**：写出 Markdown，每个地址有独立锚点，并列出声明的依赖。

## 操作序列
type: command-table
from: projects/infrastructure-plan-explainer/solution/main.py, projects/infrastructure-plan-explainer/API.md

| 命令 | 作用 |
|---|---|
| `["create"]` | 创建 |
| `["update"]` | 原地更新 |
| `["delete", "create"]` | 替换 |
| `["create", "delete"]` | 替换 |
| `["delete"]` | 删除 |
| `["read"]`, `["no-op"]`, `["forget"]` | 读取、不操作、忘记 |
| 其他任意列表 | `unsupported action sequence` |

## 图示阅读助手
type: architecture
from: projects/diagram-reading-companion/solution/main.ts, projects/diagram-reading-companion/solution/cli.ts

```arch
node | in | 1,1 | sample.json | svg、graph | client
node | load | 2,1 | loadDiagram() | 节点标识必须是 SVG 标识 | process
node | an | 3,1 | analyzeGraph() | 顺序、分支、环 | process
node | rev | 3,2 | reviewGraph() | order、reviewed | process
node | graph | 2,2 | graph.json | 已审核清单 | store
node | html | 1,2 | report.html | 键盘逐步导览 | store
edge | in | load | svg、graph
edge | load | an | graph
edge | an | rev | 顺序
edge | rev | graph | 保存
edge | graph | html | 渲染
```

## 图表规则
type: concepts
from: projects/chart-storyboard-builder/API.md, projects/chart-storyboard-builder/solution/main.py, projects/chart-storyboard-builder/README.md

- **roles**：`group`、`value` 与 `unit` 指定 CSV 列与显示单位。
- **聚合器**：`sum`、`mean` 与 `count`。计数使用非空值，单位为 `records`。
- **语法**：分类使用 `bar`，有序时期使用 `line`。
- **空值**：表示缺失，不是零。折线在该处断开。
- **periods**：设置顺序。未出现的时期绘制为 null。
- **坐标轴**：始终包含零。
- **注解**：必须对应已绘制的点。文字获得精确数值与单位。

## 归属规则
type: concepts
from: projects/service-ownership-navigator/solution/main.ts, projects/service-ownership-navigator/README.md

- **最后匹配优先**：最后匹配的规则决定生效负责人。
- **锚定**：以 `/` 开头或包含 `/` 的模式从根目录匹配。
- **通配符**：`*` 留在一个路径段内，`**/` 跨文件夹，`?` 匹配一个字符。
- **目录**：末尾 `/` 匹配该文件夹及全部下级内容。
- **服务**：包含该路径的最长服务 `root`。
- **负责人**：仅支持 `@user` 或 `@org/team` 名称。
- **运行手册链接**：本地链接必须指向提供的运行手册文件。

## 默认值与限制
type: defaults
from: projects/chart-storyboard-builder/solution/main.py, projects/chart-storyboard-builder/solution/cli.py, projects/diagram-reading-companion/solution/main.ts, projects/service-ownership-navigator/solution/main.ts, projects/diagram-reading-companion/solution/cli.ts, projects/infrastructure-plan-explainer/solution/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `reducer` | `sum` | `charts` 中各图表独立设置 |
| `grammar` | `bar` | 或 `line` |
| `schema_version` | 1 | 图表规格与计划摘要 |
| SVG 大小 | 500000 | 最大字符数 |
| 规则来源 | `CODEOWNERS` | 证据行中的名称 |
| 输出目录 | `output` | Node CLI 的第二个参数 |
| 图表宽度 | 640 | SVG 最小宽度，单位为像素 |

## 错误消息与修正
type: troubleshooting
from: projects/infrastructure-plan-explainer/solution/main.py, projects/chart-storyboard-builder/solution/main.py, projects/diagram-reading-companion/solution/main.ts, projects/service-ownership-navigator/solution/main.ts

| 现象 | 原因 | 修正 |
|---|---|---|
| `unsupported Terraform JSON format major` | 不是 `terraform show -json` 文件 | 将保存的计划导出为 JSON |
| `periods omit data or duplicate a group` | 某数据组不在 `periods` 中 | 每组列出一次 |
| `annotation needs a unique plotted point` | 注解对应空白或未知组 | 对有值的点添加注解 |
| `Node missing from SVG or duplicated` | 清单标识没有对应 SVG `id` | 为 SVG 元素加入 `id` |
| `Unsupported SVG element` | 标签不在安全子集中 | 使用形状、文本、`g`、`title`、`desc` |
| `Review order must contain every node exactly once` | 顺序过时或不完整 | 每个节点标识列出一次 |
| `Earlier matching rules name different owners; last matching rule wins` | 规则重叠 | 检查最后一条规则是否正确 |
| `Missing local runbook link` | 运行手册链接了未提供的文件 | 将文件加入 `runbooks` |

## 实例问答
type: qa
from: projects/chart-storyboard-builder/solution/samples/input.json, projects/chart-storyboard-builder/README.md, projects/infrastructure-plan-explainer/solution/samples/input.json, projects/infrastructure-plan-explainer/README.md, projects/service-ownership-navigator/solution/sample.json, projects/diagram-reading-companion/solution/sample.json

- **W1 使用 sum 绘制什么值？** 18。它的两行分别为 8 和 10。
- **W2 与 W3 会怎样？** W2 为空，W3 未出现。两者均绘制为缺失。
- **为何数据库是替换？** 它的操作为先 `delete` 再 `create`。
- **摘要如何显示密码？** 显示 `[sensitive]`，数组内也一样。
- **`services/images/cache/store.ts` 归谁负责？** `@fictional/cache`，来自最后一条规则。
- **图示在哪里分支？** 在 `check` 处分向 `share` 与 `clarify`。

## 提示
type: tips
from: projects/infrastructure-plan-explainer/README.md, projects/infrastructure-plan-explainer/API.md, projects/diagram-reading-companion/README.md, projects/chart-storyboard-builder/API.md, projects/service-ownership-navigator/README.md

- 图中的边是声明的依赖，不代表服务商执行顺序。
- 计划工具不预测停机时间、成本或完整执行顺序。
- 阅读顺序只是待审核候选，不证明教学有效性。
- 图表 SVG 带有 `title` 与 `desc`，不含 JavaScript。
- 归属格式是本地子集，不是完整 CODEOWNERS 格式。
