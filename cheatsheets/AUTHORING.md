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
---

## 启动服务
type: annotated-code
lang: bash
from: manuals/sglang-101/sections/2-1-sglang-serve-and-the-three-processes.md

```bash
sglang serve --model-path <model> --port 30000   # 启动 HTTP 服务
```
````

Frontmatter 有五个必填键。`id`、`title`、`subtitle` 是文本。副标题最多 120 字符。`hue` 是 0 至 359 的数字，决定海报颜色。`sources` 列出覆盖的课程和手册，课程页根据这些路径反向链接速查表。可选的 `code` 设置卡片上的两个字母，默认取英文标题首字母。中文主题应显式保留独立代码，各主题不能重码。

每个区块以 `## ` 标题开始，标题显示在彩色栏上。其后的 `key: value` 行为区块元数据，空行结束元数据，之后才是正文。

| 键 | 必填 | 含义 |
|---|---|---|
| `type` | 是 | 下表中的一种区块类型 |
| `from` | 是 | 用逗号分隔的仓库路径，必须包含本区块事实的来源 |
| `lang` | 代码区块必填 | `annotated-code` 区块的语言 |
| `col` | 否 | 海报列号，1 至 4。省略时按顺序放置并平衡各列 |
| `span` | 否 | 区块跨列数，1 至 4。代码注解、架构、默认值和排错默认跨 2 列，其余跨 1 列 |

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
