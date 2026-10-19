---
name: write-manual
version: 1.0.0
description: >
  为一个固定版本的技术主题编写长篇手册，从用途讲到每个请求与响应。
  每个示例来自离线运行记录，每个断言追溯到按权威排序的来源，审计必须达到 TOTAL 0。
  用于“编写手册”“为某主题写入门手册”“manual.json”“增加手册章节”
  “构建运行记录工具”“审计手册”“固定规范版本并文档化”。
tags: [manuals, documentation, specifications, technical-writing, audit]
---

# 编写手册

手册深入解释协议、文件格式或运行时等主题的一个精确版本。课程讲完概念就继续，手册要让读者能预测未展示场景下的系统行为。

本技能包括研究、来源排序、冲突登记、离线运行记录、固定章节结构、写作限制，以及必须输出 TOTAL 0 的审计。适用于任意仓库。课程仓库已有工具，manuals/a2a-101/ 是完整示例。

## 适用情况

- 读者需要预测某系统固定版本在未展示场景下的行为。
- 主题有可固定到提交的规范、schema 或源码树。
- 能离线运行主题或忠实替代实现，记录请求与响应。
- 产物为 60 至 100 页，包含图表，且后续由其他人维护。

## 使用其他方式的情况

- 注意力或检索等通用概念：写课程。
- 无版本可固定，或每周变化：先明确稳定范围。
- 无法运行且无法记录输出：只能交付文章，不能声称有运行记录的手册。
- 简短操作指南或不足约十五节：无需这套完整结构。

## 入门手册规模

| 项目 | 目标 |
|---|---|
| 页数 | 60 至 100 |
| 篇数 | 6 至 8，加一篇参考 |
| 节数 | 约 25 |
| 图数 | 30 至 40 |
| manual.json 学习成果 | 至少 3 |
| 每节要点 | 恰好一个块，至少两项 |

完整示例有七篇、二十八节、七个参考节、三十一张图。

## 方法

1. **固定主题。**记录版本、来源 URL、提交、发布日期、核验日期。
2. **来源排序。**按 schema/proto、规范、项目文档、参考 SDK、运行记录排序。
3. **按许可归档。**原样复制允许引用的来源到 research/sources/，旁边保留许可文件。
4. **事实简报。**在 research/ 按章节和行号索引将使用的每条规则，见 [研究与来源](references/research-and-sources.md)。
5. **冲突登记。**发现来源分歧即分配 D1、D2 等 ID。
6. **构建记录工具。**离线运行并把确定性文件写到 capture/out/，见 [运行记录](references/capture-kit.md)。
7. **按规范规划目录。**每节以规范中可查的一项命名。
8. **编写 manual.json。**填写版本、成果、配色、来源、引文来源、运行命令、篇章，见 [声明文件](references/manual-json.md)。
9. **前言。**标题为“如何阅读本手册”，按下文顺序写。
10. **逐节编写。**遵循固定结构，所有 listing 都从运行记录截取。
11. **按记录绘图。**遵守下方要求与 blueprint-figure。
12. **构建与审计。**修复全部问题，直到 TOTAL 0，见 [审计](references/audit.md)。
13. **逐节提交。**每提交包含该节、图表与新增运行记录。已授权批量同步时可按可审查逻辑批次提交。

## 按规范规划目录

先用规范中的名称建目录，再决定每篇证明什么。

- 前言：front.md，标题“如何阅读本手册”。
- 第一篇：用两节说明主题标准化什么，以及一次完整运行交互。
- 中间各篇：每层一篇，例如发现、数据模型、操作、绑定、安全、扩展。
- 最后实现篇：构建客户端和服务端，用官方一致性工具测试，并解释从上一版本迁移。
- 参考篇：方法表、对象、状态、错误、术语、来源、冲突、图索引。

每节以规范中的对象、操作、绑定、头、错误或扩展命名。“CancelTask 与终止状态”具体可查，“状态机”过于泛化。通用概念放在拥有该概念的对象章节中。

## 前言

front.md 按顺序包含：

1. 读者是谁，读完能做什么。
2. 编写方法和来源权威排序表。
3. 运行记录工具。
4. 引文、示例截取、ID 缩写约定。
5. 可离线执行的首次运行。
6. 篇章顺序，以空 parts 块声明。
7. 图表颜色，以空 palette 块声明。
8. 图 0.1，解释本手册箭头与颜色语法。

## 章节结构

每节顺序如下。参考节和前言有中心论点、来源行，但不需要成果句或 takeaways。

1. 首行一个 # 标题，使用规范术语。
2. 标题下直接放 > 中心论点，一句，英文最多 30 词。
3. 开头从读者经历过的具体场景切入。
4. 前两段内包含“读完本节，你可以……”成果句。
5. 正文由二级标题、以粗体术语开头的定义、图、示例、规则、表格构成。
6. 恰好一个 takeaways 块，至少两个行动项。
7. 最后段以 Sources: 开头，列出编写时使用的全部文件。

完整模板见 [章节模板](references/section-template.md)。

## 围栏类型

| 围栏 | 内容 | 必需字段 |
|---|---|---|
| figure | 按 ID 引入一图 | id、kind、title、claim、caption |
| listing | 从一个记录文件截取 | title、source、lang，可选 note，随后分隔线与原始行 |
| rule | 逐字核对的引文 | label、source，随后分隔线与引文 |
| takeaways | 章节行动项 | 至少两行 - 项目 |
| parts、palette、figure-index、contents | 自动生成的表格 | 空块 |

其他围栏必须有语言。json、jsonl、http、sse 内容必须改为带来源的 listing。

## Markdown 子集

仅使用以下结构，让各版本一致渲染：

- 第一行一个 # 标题，下方中心论点引用。
- 二级、三级标题，可带 {#anchor}。
- 段落与单层无序、有序列表。
- 带表头的管道表格。
- 粗体、斜体、行内代码。
- 引文 `{{key ref}}`、交叉链接 `[text](#s-5-3)`、仓库链接。

原始 HTML、水平分隔线、嵌套列表、四级标题、其他引用块会使构建失败。节锚点为 s- 加将点换成连字符的 ID，例如 s-1-4、s-r-2。

## 示例记录

- 每个 listing 从 capture/out/ 截取，不凭记忆写请求或响应。
- 每行必须逐字存在于来源。
- 用单独一行或行内的 … 标记截取。
- note 说明省略了什么。
- source 给出源文件，供读者查看完整记录。

## 来源、引文与冲突

- sources 按权威排序，分歧时遵循较高来源并明确说明。
- 规则逐字引用，后接引用键，例如 `"quoted text" {{spec §3.1.5}}`。
- quoteSources 声明所有引用键，映射归档文件，无法归档时为 null。
- null 来源（如 SDK）只转述，不直接引用。
- 来源分歧时，正文引用双方、说明选择并链接登记项。
- 冲突表放来源参考节，五列为 ID、来源说法、选择、涉及章节、上游状态。
- 引用规范、源码、论文和主题官方文档，不引用其他指南、课程或书籍。

## 写作限制

| 项目 | 英文限制 |
|---|---|
| 句子 | 最多 25 词 |
| 中心论点 | 一句，最多 30 词 |
| 图表断言 | 一句，最多 28 词，以句号结束 |
| 要点 | 祈使句，最多 20 词 |
| 段落 | 最多六句 |

使用第二人称解释机制。术语定义一次，始终一致，并加入术语表。引用、代码、引文标记免检。中文使用这些清晰表达原则，不套用英文分词。

不用分号、英文缩写、长短破折号。英文不用 `may`，改用 `can` 或说明条件。禁用表达见 [写作规则](references/prose-rules.md)。

## 图表要求

使用 blueprint-figure，并满足：

- 九种类型之一：sequence、structure、flow、comparison、timeline、tree、state、decision、layers。
- 使用运行记录中的真实 ID、字段、方法与序号。
- 每图一句断言，英文最多 28 词。图注说明读图顺序和记录文件。
- 不用泛化组件框、统计卡、进度条。
- 比较主题两种行为，不与自己的旧版本比较。
- 每手册各色含义固定，rose 失败、grey 主题外、amber 生命周期、teal 持久状态。
- 使用下方八种箭头，图 0.1 说明本手册使用的样式。
- viewBox 宽 640，高最多 760，字至少 11 单位，文件最多 40KB。
- 根有 role=img、title、至少 40 字符 desc。
- 所有 ID 以图 ID 开头，因为图表共用一页。
- 颜色为 var(--m-<token>,#hex)，hex 为 token 浅色值。

| 箭头 | 含义 |
|---|---|
| 墨色实线 | 调用或请求 |
| 墨色虚线 | 响应 |
| 青色实线 | 持久写入 |
| 琥珀虚线 | 状态变化 |
| 梅色实线 | 模型调用或计算 |
| 橄榄虚线 | 系统外部影响 |
| 靛色点线 | 流或事件 |
| 玫红虚线 | 失败 |

## 构建与审计

课程仓库根目录运行：

```bash
node --test site/test_manuals.js
node site/build-manuals.js
node manuals/_shared/figkit.js build manuals/<id>
node scripts/audit_manuals.js --manual <id>
```

仓库外按 [审计](references/audit.md) 实现同样检查。修正文字，不放宽限制。TOTAL 0 前不能合并。

## 提交规则

- 每节一提交，包含相关图和新增记录。已授权批量同步可按逻辑批次。
- 消息格式 feat(manual/<id>): <section slug>。
- 不提交生成的 site/manual-<id>.html、site/manuals.html、site/manuals-data.js。
- 未完成前 status=draft，ready 手册必须有 README.md。
- 归档来源与 manual.json 的 pin 一起更新。

## 完成前检查

- [ ] manual.json 有效，pin 含 subject、version、source、commit、date、verified。
- [ ] 每节标题对应规范一项。
- [ ] 每节有中心论点、前两段成果句、一个要点块、Sources 行。
- [ ] json/jsonl/http/sse 均为带记录来源的 listing。
- [ ] 离线记录检查无漂移。
- [ ] 至少 24 字符的引用逐字存在于归档文件。
- [ ] 每冲突有 ID，涉及章节链接到它。
- [ ] 所有 SVG 被文档引用，并等于脚本输出。
- [ ] 审计输出 TOTAL 0。
- [ ] 提交范围与授权批次一致。

## 文件

- [manual-json.md](references/manual-json.md)：声明字段和起点。
- [section-template.md](references/section-template.md)：章节骨架和围栏。
- [research-and-sources.md](references/research-and-sources.md)：简报、归档、引文、冲突。
- [capture-kit.md](references/capture-kit.md)：确定性运行记录与漂移检查。
- [prose-rules.md](references/prose-rules.md)：长度限制与禁用词。
- [audit.md](references/audit.md)：全部检查与站外复现。
- 仓库另见 manuals/AUTHORING.md、manuals/manual.schema.json、manuals/a2a-101/。
