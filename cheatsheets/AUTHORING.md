# 编写速查表

速查表供工作时随手查阅，不是课程摘要。一个文件承载一个主题，构建后生成横向海报，通常一页，最多两页。

每个主题对应 `cheatsheets/<id>.md`，标识使用小写字母与连字符。

## 文件结构

````text
---
id: sglang-serving
title: 使用 SGLang 提供 LLM 服务
subtitle: 启动、规划容量、衡量并排查 SGLang 服务。基于 SGLang 0.5.22。
hue: 200
code: LS
sources: manuals/sglang-101, phases/17-infrastructure-and-production/03-vllm-serving
source_hash: <当前中文来源哈希>
---

## 启动服务
type: annotated-code
lang: bash
from: manuals/sglang-101/sections/2-1-sglang-serve-and-the-three-processes.md

```bash
sglang serve --model-path <model> --port 30000   # 启动 HTTP 服务
```
````

Frontmatter 的内容字段如下。`id`、`title`、`subtitle` 是文本。副标题最多 120 字符。`hue` 是 0 至 359 的数字，决定海报颜色。`sources` 列出覆盖的课程和手册，课程页根据这些路径反向链接速查表。可选的 `code` 设置卡片上的两个字母，默认取英文标题首字母。中文主题应显式保留独立代码，各主题不能重码。

每个区块以 `## ` 标题开始，标题显示在彩色栏上。其后的 `key: value` 行为区块元数据，空行结束元数据，之后才是正文。

| 键 | 必填 | 含义 |
|---|---|---|
| `type` | 是 | 下表中的一种区块类型 |
| `from` | 是 | 用逗号分隔的仓库路径，必须包含本区块事实的来源 |
| `lang` | 代码区块必填 | `annotated-code` 区块的语言 |
| `col` | 否 | 海报列号，1 至 4。省略时按顺序放置并平衡各列 |
| `span` | 否 | 区块跨列数，1 至 4。代码注解、架构、对比、默认值和排错默认跨 2 列，其余跨 1 列 |

## 区块类型

| 类型 | 颜色 | 正文 |
|---|---|---|
| `concepts` | 紫色 | 列表：`- **名称**：一行说明` |
| `glossary` | 紫色 | 列表：`- **缩写**：全称与一行说明` |
| `task-table` | 蓝色 | 表格：`\| 任务 \| 代码 \|`，代码单元格使用反引号 |
| `command-table` | 蓝色 | 表格：`\| 命令 \| 作用 \|` |
| `annotated-code` | 墨色 | 一个代码围栏，注释前至少两个空格，构建时将注释对齐成列 |
| `flow` | 青色 | 编号列表：`1. **执行者**：发生什么`，构建时绘制编号步骤 |
| `architecture` | 青色 | `arch` 围栏，使用下文的 `node` 与 `edge` 行 |
| `comparison` | 钢蓝色 | 3 至 5 列的方案对比表，首列列出对比因素 |
| `defaults` | 琥珀色 | 表格：`\| 设置 \| 默认值 \| 说明 \|` |
| `troubleshooting` | 红色 | 表格：`\| 现象 \| 原因 \| 修正 \|` |
| `qa` | 绿色 | 列表：`- **问题？** 答案。` |
| `tips` | 绿色 | 列表 |

读者需要替换的值使用尖括号，如 `<model>`、`<port>`，构建后会着色。

### 架构区块

```text
node | api | 1,1 | HTTP 服务 | 分词器管理器
node | sched | 2,1 | 调度器 | 批处理与 KV 池
edge | api | sched | ZMQ
```

节点行为 `node | <id> | <列>,<行> | <标签> | <第二行> | <类型>`，行列从 1 开始。第二行可留空。可选类型在角落绘制图标，支持 `client`、`process`、`store`、`queue`、`gpu`、`model`。边行为 `edge | <起点标识> | <终点标识> | <标签>`，标签可留空。

## 事实与证据

每项事实必须来自其区块 `from` 列表中的文件：课程正文、课程代码、手册章节或捕获记录。不要加入来源中没有的命令、选项、API 名称、默认值或数字。`node site/build-cheatsheets.js --check` 会执行部分检查：每个选项（`--name`）、含下划线、点号或调用的名称，以及默认值必须出现在至少一个来源文件中。中文描述中的数值仍会检查，检查通过不等于语义已经核实。

中文正文来源使用 `docs/zh.md`，渲染器复用 `site/md-render.js`。不恢复英文正文或复制一套渲染器。代码、命令、标识和公式保持原样，读者可见文案与说明性注释译为中文。

`cheatsheets/evidence/` 保留逐主题的来源对照。历史定位记录中的英文行号指向其注明的冻结上游版本，不能当作中文行号，也不能当作本次运行证据。新增或修改事实时，同时检查当前中文来源。

## 文风与验证

使用短句。一行只写一条表格行或一个列表项。说明读者该输入什么、会得到什么，不讲故事。翻译遵循根目录 `TRANSLATION.md`。

运行 `node site/build-cheatsheets.js --check` 与 `node --test site/test_cheatsheets.js`。构建后在真实浏览器中检查检索、复制、来源链接、中文 SVG 换行和打印布局。生成的 `site/cheatsheets/`、`site/cheatsheet-map.json` 不提交。


## 主题覆盖与来源版本

`cheatsheets/topics.yaml` 登记主题的 `id`、中文 `title`、`kind` 与 `sources`。每节核心课程、手册和项目至少由一个主题覆盖；主题文件的标题与来源必须与清单一致。`kind` 使用 `concept`、`commands`、`comparison`、`debugging`、`manual` 或 `project`，保持机器标识英文。

`source_hash` 由 `site/cheatsheet-topics.js` 的 `sourceHash(sources, root)` 按当前中文源计算；翻译或来源内容发生变化后，先核对受影响事实再刷新哈希。不要用上游英文哈希冒充中文内容已同步。

源于冻结上游的证据文件声明 `upstream_revision`，并保留原始英文逐条记录的路径、行号和数值；区块标题对应中文海报。可用的冻结版本由 `site/cheatsheet-evidence.js` 声明。单一版本使用 `AIFS_CHEATSHEET_EVIDENCE_ROOT`；多版本使用 `AIFS_CHEATSHEET_EVIDENCE_ROOTS`，按操作系统路径分隔符连接多个源根。每个源根的 `.aifs-upstream-revision` 标明其 SHA，校验按每份证据声明的版本选择源根。CI 在 `.github/workflows/build.yml` 显式取得该 oracle；缺源不能跳过。原始记录只证明出处，不证明本次执行或当前供应商行为。

不运行上游外部 LLM 生成工作流。主题由当前 agent 或已授权子 agent 翻译整合。除来源与覆盖检查外，运行 `node site/build-cheatsheets.js --check-quality` 检查区块、排错、对比和打印页数。完整构建后再检查，避免把尚未生成的手册页面误报为断链。
