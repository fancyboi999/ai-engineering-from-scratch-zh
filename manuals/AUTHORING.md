# 手册编写契约

手册围绕一个主题的固定版本，从用途讲到每次请求与响应。课程讲清一个概念后继续前进；手册则留在同一个系统里，直到读者能预测手册未展示的情形。

101 手册通常为 60–100 页，分为 6–8 部分，约 25 节，配有 30–40 幅图。展示的记录必须来自实际运行，断言必须能追溯到按权威性排序的来源。无法追溯的断言应删去。

工具会校验大部分契约。合并前，`node scripts/audit_manuals.js --skip-capture` 必须报告 `TOTAL 0`。捕获套件的执行另行核对权限与依赖；不要为完成审计调用模型、云资源或修改宿主设置。

## 手册是什么

- **一个主题、一个版本、一个日期。** 扉页固定版本、源码提交、发布日期，以及上游最后核验事实的日期。中文同步不是重新核验，不能更新历史日期来冒充 fresh 验证。
- **以真实运行记录为基础。** 捕获套件驱动目标系统，写下所见内容。代码清单与图表取自这些文件，不凭记忆编造。
- **按权威性追溯来源。** 手册将来源按权威性排序，每节末尾列出编写时使用的文件。
- **与课程配套。** 需要深入解释时链接到阶段课程，不复制课程正文。
- **原创内容。** 不把其他指南、课程或书籍当作来源。引用规范、源码、论文和目标系统自己的文档。

## 文件

```text
manuals/<id>/
  manual.json                 元数据、固定版本、配色、部分与章节顺序
  README.md                   status 为 ready 前必须存在
  front.md                    “如何阅读本手册”
  sections/<n>-<m>-<slug>.md  每节一个文件
  sections/r-<n>-<slug>.md    参考章节
  figures/<figure-id>.svg     各版本共用的静态图表
  figures/src/<figure-id>.js  可选的图表套件源文件
  capture/                    捕获套件，输出存入 capture/out/
  research/brief.md           编写正文使用的事实简报
  research/sources/           随仓库保存的原始来源及其许可，用于校验引文
```

`<id>` 使用小写字母和连字符，例如 `a2a-101`，并与目录名一致。中文正文保留手册现有 `front.md` 和 `sections/*.md` 结构；课程的 `docs/en.md` 则须翻译为 `docs/zh.md`。

## manual.json

| 字段 | 含义 |
|---|---|
| `id`, `title`, `subtitle`, `summary` | 标识与简短介绍 |
| `audience` | 面向谁，以及读者应已掌握什么 |
| `edition` | 本版的 `YYYY.MM` |
| `status` | `draft` 构建页面但不列入目录；`ready` 列入目录，需有 README |
| `pin` | `subject`、`version`、`source` URL、`commit`、发布 `date`、上游核验日期 `verified` |
| `outcomes` | 读完手册后能完成的至少三项操作 |
| `palette` | 配色表，每种 `hue` 在本手册中只有一种 `meaning` |
| `sources` | 按权威性排序的来源，包含 `name`、`path`、`usedFor` |
| `quoteSources` | 引用键（如 `spec`）到来源文件的映射；`null` 声明无法校验引文的来源 |
| `capture` | 在手册目录运行的 `run`、`check` argv 数组；可选 `timeoutSeconds` 默认 300 |
| `front` | 前言文件 |
| `plate` | 封面插图的 `figure`、`title`、`caption` |
| `parts` | 有序部分：`number`、`title`、`thesis`、`summary`、`accent`、`sections` |
| `reference` | 参考部分的 `title`、`thesis`、`accent`、`sections` |
| `related` | 讲解更深入内容的课程仓库路径 |

[manual.schema.json](manual.schema.json) 是机器可读的契约，构建器会校验每个清单。章节 ID 按顺序为 `<part>.<n>`，如 `3.2`；参考章节为 `R.<n>`。翻译面向读者的值，不改字段名、枚举、ID、路径或命令。

## 手册结构

**前言。** 使用一个 `front.md`，标题为“如何阅读本手册”。依次说明：适合谁、读完能做什么、编写方法与按权威性排序的来源表、捕获套件、阅读约定、读者可离线执行的首次运行、部分顺序（`parts` 块）、图表配色（`palette` 块），以及讲解箭头与配色语法的图 0.1。

**第 1 部分：一页讲清主题。** 包含两节，应完整读一遍：

1. 主题标准化了什么，哪些内容留给实现。
2. 捕获记录中的一次完整交互，从首个请求到最后响应。

**中间各部分。** 每个层次一个部分，例如发现文档、数据模型、操作、绑定，以及安全与扩展规则。章节标题应指向规范中能查到的对象、操作、绑定、头、错误或扩展。不单独写“状态机”或“威胁”等泛泛概念，而是在拥有该概念的对象或操作章节中解释。

**最后一部分：实现。** 构建客户端与服务器，再说明如何用官方一致性工具测试两者，以及如何从上一版本迁移。区分已执行验证、历史记录和未验证的可选依赖。

**参考。** 包含 API 或方法表、对象与字段、状态、错误、术语表、来源，以及图表索引（`figure-index` 块）。

## 章节结构

1. `# 标题`：使用规范中的名称，指出本节解释的主题，例如“CancelTask 与终态”。
2. `> 论点`：用一句话说清本节要证明的结论。
3. 从具体情境开始的首段；前两段必须说明读者学完能做什么。中文可用“读完本节后，你可以……”“读完本节，你能……”或“读完后，你能……”，不强迫逐字套用英文。
4. 正文包含 `##` 小节、以 `**术语：**` 开头的定义、图表、代码清单与表格。
5. 恰好一个 `takeaways` 块，以动作说明如何使用本节知识。
6. 最后一个段落列出来源，可使用 `来源：...`；兼容历史 `Sources: ...`，页面统一显示中文标签。

前言与参考章节需要论点和来源行，但不要求学习成果句或实践要点。

## Markdown 子集

渲染器只接受一个较小的子集，以便各版呈现一致。

| 结构 | 语法 |
|---|---|
| 标题 | `# 标题`，仅文件首行 |
| 论点 | 标题下紧跟 `> 一句话` |
| 小节 | `##`、`###`，可选 `{#anchor}` |
| 段落、列表 | 普通段落，`-` 或 `1.` 列表，仅一层 |
| 表格 | 带表头的竖线表格 |
| 强调 | `**粗体**`、`*斜体*`、行内代码 |
| 引用 | `{{spec §4.1}}` 渲染为小号等宽引用 |
| 交叉引用 | `[结论](#s-send-message)` 或 `[图](#fig-5-3)`；分页打印添加页码 |
| 仓库链接 | `[课程](phases/13-tools-and-protocols/19-a2a-protocol)`，指向中文仓库源码 |
| 代码 | 带语言标记的围栏 |

原始 HTML、水平分隔线、嵌套列表、深于 `###` 的标题和论点以外的引用块会使构建失败。章节锚点由文件名生成，例如 `sections/4-1-send-message.md` 对应 `s-send-message`，`sections/r-1-operations-by-binding.md` 对应 `s-ref-operations-by-binding`。译文小标题可生成中文锚点；已有显式 `{#anchor}` 应保持不变。

## 围栏块

图表：

````text
```figure
id: fig-4-1
kind: state
title: 任务生命周期
claim: 任务进入四种终态之一后，不会再离开终态。
caption: 从左向右读，虚线边框表示中断态。来源：capture/out/task-states.txt。
```
````

代码清单取自捕获文件，每行必须在来源中原样存在。用单独一行或行内的 `…` 表示省略，并在 note 中说明省略了什么：

````text
```listing
title: 第二条消息后的任务
source: capture/out/07-book-turn-2.http
lang: json
note: history 数组在首条消息后截断。
---
{
  "id": "task-0003",
  …
}
```
````

引用规则的正文会与 `quoteSources` 指向的原始文件逐字比对。保留原始引文，在相邻正文解释中文含义，不将译文冒充原文：

````text
```rule
label: 核心规则
source: spec §3.1
---
"Quoted text, word for word."
```
````

实践要点至少包含两个动作：

````text
```takeaways
- 发送消息前先读取卡片。
- 将远端 agent 视为内部不透明的系统。
```
````

自动生成的块不带正文：`parts`、`palette`、`figure-index`、`contents`。

## 图表

### 九种类型

| Kind | 用途 |
|---|---|
| `sequence` | 沿生命线排列参与者，时间向下，交互编号 |
| `structure` | 一个记录、对象或 schema 的组成 |
| `flow` | 数据经过的阶段，以及谁写、谁读 |
| `comparison` | 并列展示同一问题的两种回答 |
| `timeline` | 在提交序号或时间等编号轴上展示轨道 |
| `tree` | 归属、包含或委派关系 |
| `state` | 状态机及转换 |
| `decision` | 失败位置与各结果的含义 |
| `layers` | 分层及每层拥有的部分 |

[_shared/templates](_shared/templates) 使用图表套件提供每种类型的示例。

### 颜色

每本手册在 `manual.json` 中定义一个配色表，同一种色相在所有图表中含义一致。四种含义跨手册固定：

| Hue | 固定含义 |
|---|---|
| `rose` | 失败：错误、崩溃、中止、工作丢失 |
| `grey` | 主题外部：宿主、操作者、范围之外 |
| `amber` | 生命周期：任务、阶段、状态机 |
| `teal` | 持久状态：存储与已提交记录 |

其余六种色相（`blue`、`violet`、`green`、`plum`、`olive`、`indigo`）由各手册指定。

### 箭头

各手册用相同的八种样式表示交互，图 0.1 教读者识别本手册使用的样式。

| 样式 | 含义 |
|---|---|
| 墨色实线 | 调用或请求 |
| 墨色虚线 | 回复 |
| 青色实线 | 持久写入 |
| 琥珀虚线 | 状态变化 |
| 梅紫实线 | 模型调用或计算 |
| 橄榄虚线 | 系统外的副作用 |
| 靛蓝点线 | 流或事件 |
| 玫红虚线 | 失败 |

### 图表必须展示什么

- 使用真实系统的真实名称：捕获记录中的 ID、字段名、方法名和序号。不画“组件 A”这样的泛化方框、统计卡或进度条。
- 一幅图说明一个结论。图注以加粗的一句话开头，然后说明读法与来源。
- 不与较早构建做“前后对比”；应比较主题的两种行为。

### 可读性

- 640 单位宽度下，文字至少 11 单位，即屏幕约 11 像素、打印约 8 磅。
- 标签中不能有省略号，文字不能重叠、放在斜线填充上或被线穿过。
- 放不下的标签移到框外，用引线或编号索引连接，不缩小字号。
- 箭头标签下面放一块与面板同色、带 `class="m-knock"` 的遮罩，隐藏后面的线。审计只接受这种遮罩，或在线之后绘制的不透明方框。遮罩不算标签必须放入的容器。
- 图表套件与审计共用文字度量。中文与全角标点按全宽估计，拉丁字母按原字体比例估计；这不是浏览器实测，仍须做最终视觉验收。

### 技术规则

- 根元素使用 `viewBox="0 0 640 H"`，H 不超过 760，并有 `role="img"`、`aria-labelledby="<id>-title <id>-desc"`。
- 直接子元素包含 `<title>` 和至少 40 字符的 `<desc>`。
- 所有 `id` 以图表 ID 开头，因为所有图表会放在同一页。
- 颜色只能使用 `var(--m-<token>, #hex)`，hex 为 [_shared/tokens.css](_shared/tokens.css) 中 token 的浅色值。
- 只接受套件输出的元素与属性。禁止 `style`、脚本、事件处理器、链接和图片。每幅不超过 40 KB。
- 变换只能是 `<g>` 上的 `translate()`；每行一个 `<text>`。

### 图表套件

[_shared/figkit.js](_shared/figkit.js) 从短脚本生成图表，内置上述语法。它与审计使用同一度量，标签放不下时抛出错误。

```javascript
const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-1-2', {
  height: 220,
  title: '一次委派请求',
  desc: '客户端 agent 向远端 agent 发送一条消息，远端返回一个任务，客户端继续跟踪该任务直到完成，并读取结果。',
}, f => {
  const client = f.box({ x: 20, y: 30, w: 180, h: 44, hue: 'violet', title: '客户端 agent', sub: 'planner' });
  const remote = f.box({ x: 440, y: 30, w: 180, h: 44, hue: 'blue', title: '远端 agent', sub: 'travel-agent' });
  f.arrow(client.right(), [remote.x - 1, client.cy], { style: 'call', label: 'SendMessage', note: '一次 JSON-RPC 请求' });
});
```

保存为 `figures/src/fig-1-2.js`，运行 `node manuals/_shared/figkit.js build manuals/<id>`。提交的 SVG 与源文件输出不同时，审计失败。没有源文件的图表按手写 SVG 校验。

## 代码清单与捕获套件

- JSON、HTTP、SSE、JSONL 块必须用带 `source` 的 `listing`；普通 `json` 围栏会被审计拒绝。
- 套件位于 `capture/`，应能离线运行，不需要网络和密钥，遵循仓库依赖白名单。
- 专有二进制或托管服务无法在 CI 离线运行时，由原作者在安装固定版本的机器上录制。`check` 比较脱敏后的已存输出；目标未安装时应打印 `skipped` 及原因并退出 0。前言说明哪些记录来自这种方式，以及录制机器。
- `capture.run` 写入 `capture/out/`。`capture.check` 在临时目录生成数据，再对比经过掩码的已存输出；时间戳、随机 ID 等变化值需要掩码。
- 默认审计只应在明确批准后运行 `capture.check`；中文同步可用 `--skip-capture` 做静态溯源校验，报告必须披露跳过的执行。不得把 `skipped` 当成目标系统运行成功。
- 清单头保留 source 文件路径，让读者能打开完整原始记录。

## 来源与引用

- `sources` 按权威性排序。冲突时采用更高的来源，并在正文说明。
- 仅在许可允许时把来源放进 `research/sources/`，旁边保留许可文件。
- 每个 `rule` 块和带 `{{spec §4.1}}` 等引用的行内原文都必须使用 `quoteSources` 中声明的键。未声明键或文件缺失时构建失败。
- 审计与对应原始文件逐字比对引文，兼容英文双引号和中文弯引号，不跨越不成对的引号。`null` 表示无法随仓库保存的来源，其引文不做逐字校验。

## 正文

面向一个读者，用第二人称解释机制，从具体情境开始。段落保持简短；术语定义一次，始终用同一名称，并加入术语表。中文遵循 [TRANSLATION.md](../TRANSLATION.md)，不用摘要或字典替换代替完整翻译。

英文审计保留简化技术英语的限制：一句最多 25 个词，论点 30 个词，图表结论 28 个词，实践要点 20 个词；不使用分号、缩写、长破折号、含糊的 may、俚语、夸张词、套话或将技术名词用作动词。词表为 `scripts/audit_manuals.js` 中的 `LEXICON`。

中文不套用英文词数。审计识别中文句号、问号和叹号，仍检查论点与图表结论是否为一句、段落是否超过六句，以及章节结构。代码、引用和原始记录不按散文风格改写。

## 构建与检查

```bash
node --test site/test_manuals.js
node site/build-manuals.js --out /tmp/manual-web
node scripts/audit_manuals.js --manual <id> --skip-capture
node site/build-manuals.js --print /tmp/manual-print
# 可选：在临时 npm 工作区安装固定版本，不改仓库依赖或宿主设置
npx --yes pagedjs-cli@0.4.3 /tmp/manual-print/<id>/print.html -o /tmp/manual-print/aiefs-manual-<id>.pdf
```

`site/build-manuals.js` 生成 `manual-<id>.html`、`manual-<id>-print.html`、`manuals.html` 和 `manuals-data.js`。不提交生成的 HTML、PDF 或数据脚本；部署时构建。默认写入 `site/`，`--out` 可指定隔离输出目录，`--root` 可指定临时手册输入目录。

目录只列出 `ready` 手册，预览草稿时加 `--drafts`。`--manual <id>` 只构建一本，不重写目录，也不删除其他手册页面。`--print <目录>` 输出官方分页工具使用的完整打印 HTML。

中文版目前提供实际生成的打印 HTML，不承诺 PDF 已发布。PDF 生成与发布是独立步骤；离线浏览器分页实验只在临时目录进行，失败时保留准确错误。最终浏览器视觉验收、发布与根构建接入由整合负责人完成。

## 状态与提交

- `draft` 在 `/manual-<id>.html` 构建，带 `noindex`，不列入目录。
- `ready` 列入手册页，需要 `README.md`，并提供打印版。
- 章节与配套图表、捕获记录组成可审查的逻辑批次。中文同步提交使用不超过 72 字符的中文约定式前缀，例如 `sync(zh):` 或 `feat(site):`。
