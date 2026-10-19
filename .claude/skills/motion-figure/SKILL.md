---
name: motion-figure
version: 1.1.0
description: >
  制作会运动或响应读者的图表：课程内的 SMIL 动画与滑块组件、展示真实系统部件并计算结论的交互机制图，
  以及课程配色的有序抖色条带。触发短语：“动画图”“添加滑块”“交互图”“展示系统如何工作”
  “让图动起来”“抖色页头”“机制图”“figure 围栏”。
tags: [figures, svg, smil, animation, interactive, dither]
---

# 动态图表

制作会运动或响应输入的图表。支持 Claude、Cursor、Codex、OpenClaw、Hermes 和所有读取 SKILL.md 的 agent。

| 层级 | 产物 | 使用位置 |
|---|---|---|
| 1. 课程图 | 声明式 SMIL 动画，或重绘 SVG 的滑块组件，均通过 figure 围栏挂载 | 课程内 |
| 2. 机制图 | 展示真实系统部件的 HTML 面板，读者操作一个控件并阅读计算结论 | 独立页面、README、文章、课程外站点页面 |
| 3. 抖色场 | 使用纸张、强调色和墨色的 WebGL 有序抖点条带，支持四种固定种子运动 | 页头和节间分隔 |

课程运行时限制严格，所以第 1 层规则最多。第 2、3 层有独立参考文件。

## 适用情况

- 课程解释随时间变化的过程，例如 token 经过阶段、队列填充、循环重复。
- 一个输入改变公式输出，例如学习率、温度、分块大小、批大小。
- 作者要求图表动画、滑块或交互。
- 页面需要读者改变一个条件，观察缓存、队列、上下文窗口或路由器的行为：用第 2 层。
- 页面需要课程配色的缓慢动态页头：用第 3 层。

## 使用其他技能的情况

- 固定结构，无时间轴与输入：使用 `blueprint-figure` 静态图。
- 有独立状态模型与机器几何的完整讲解页：使用 `isometric-explainer`。
- 只需配色、字体或写作规则：使用 `course-style`。本技能把必要部分复制到 `references/tokens.md`。

## 方法

1. 用一句话说明图中唯一的变化。需要两句话时拆成两张图。
2. 选层级。课程内用第 1 层。第 2 层读取 `references/mechanism-figures.md`，从 `templates/mechanism.html` 开始。第 3 层读取 `references/dither-fields.md`，复制 `templates/dither.js`。以下步骤针对第 1 层：时间是变量时用动画，数值是变量时用滑块。
3. 使用 kebab-case 名称，例如 `request-path`、`context-budget`。先查注册表，同名后注册模块会替换先前图表。
4. 代码放进 `figures-<topic>.js`，用 IIFE 包裹，读取 `window.LF`，不存在则立即返回。
5. 图函数签名为 `function (host, cfg)`，向 host 添加一个 `.lf` 卡片，可返回清理函数。
6. 卡片包含 `.lf-head`（大写 `.lf-label` 和短提示）、`.lf-body`、`.lf-cap` 图注。
7. SVG 使用 `viewBox="0 0 520 H"`，通常 H 为 200 至 250，单条形可更矮。
8. 添加 title 和 desc，ID 只创建一次，放在渲染函数外。
9. 动画先入场，再进入一个慢循环，逐项遵守 `references/smil-rules.md`。
10. 滑块先定义 `state._render`，再调用 LF.slider 或 LF.select，最后调用一次 `state._render()`。
11. 模块末尾用 `LF.register({ 'your-name': fn })` 注册。
12. 课程 Markdown 加围栏，首行为名称，后面可带 JSON：

    ````markdown
    ```figure
    context-budget {"windowK": 32}
    ```
    ````

13. 完成检查清单，在浅色、深色、375px 宽度和减少动态效果设置下查看。

## 页面如何挂载图表

- Markdown 解析器把围栏转为 `<div class="lesson-figure" data-figure="name {json}">`。
- 构建器扫描课程中的图名，找到含该带引号名称的模块并写清单。找不到提供者则停止构建。
- 页面按固定顺序只加载该课需要的模块。新文件排在已列文件后，按字母序加载。
- 挂载函数将第一个词作为名称，剩余内容解析为 JSON，失败则 cfg 为空对象。
- 图函数抛错时，运行时清空宿主并记录 warning，课程其他部分继续渲染。
- 挂载后补充缺少的 title、desc、role=img 和控件标签。有 SMIL 时添加暂停按钮，有一次性动画时添加重播按钮。
- 离开视口、标签页隐藏或读者点击暂停时停止动画。减少动态效果或打印时显示静态帧。

全部运行时函数与两个完整示例见 `references/toolkit.md`。

## 规则

动画图：

1. 只用 animate、animateTransform、animateMotion，不在图中使用 setInterval 或 requestAnimationFrame。
2. 每图最多 55 个 SVG 元素。
3. 入场从 opacity 0、scale 0.95 到 opacity 1、scale 1，不从 scale 0 开始。
4. 入场使用 calcMode=spline、`keySplines="0.23 1 0.32 1"`，时长 0.5 至 0.6 秒。
5. 入场错开 0.05 至 0.4 秒，退出比入场短。
6. 循环 2.5 至 6 秒，repeatCount=indefinite。循环不设 fill=freeze，否则运行时改为播放一次。
7. keyTimes 与 values 项数相同，从 0 到 1，单调不减。
8. keySplines 比 keyTimes 少一项，只能与 calcMode=spline 共用。
9. animateMotion 使用 keyPoints 时，calcMode=linear，keyPoints 与 keyTimes 项数相同，不带 values。
10. 动画 fill 或 stroke 值不用 var()。叠加目标颜色元素，改变其透明度。
11. 循环只改变 opacity、transform、stroke-dashoffset 或路径运动。x、y、x1、y1、x2、y2、width、height、r、cx、cy、rx、ry 动画会被运行时改为一次性。
12. 宿主 data-static-time 指定的帧必须完整可读，默认 1.5 秒。完整状态较晚才出现时显式设置。
13. 元素绕中心缩放：组内内容围绕 (0,0) 绘制，用 translate 移动组，缩放用 additive=sum。

滑块组件：

14. 只写 ES5，使用 var、函数表达式、字符串拼接，不用箭头、let、const、模板字符串。
15. 第一次 LF.slider 或 LF.select 前定义 state._render，因为控件创建时会包裹它。
16. state._render 中移除全部 SVG 子元素再重建，不原地编辑节点。
17. ID 在渲染外只创建一次。新节点缺少的属性会被运行时删除，包括 ID。
18. 条形通过长度或路径 stroke-dasharray 增长，不用 scale，因为协调后的节点绕中心缩放。
19. 标签短小，英文小写，括号内写单位，例如 `chunk size (tokens)`。中文页面对应翻译。

两种图共用：

20. 颜色来自 CSS 变量，以浅色值作默认，例如 `var(--blueprint,#3553ff)`。无变量可用时才用字面十六进制值。
21. 主体最多一个强调色 blueprint，第二状态可用 warn，其他部分用 ink 和 rule token。
22. SVG 字至少 12 单位，字体 var(--font-mono)。必须更小时，给 SVG 至少 500px 宽并允许图内横向滚动。
23. 在手机上测量实际字号。375px 屏幕中 520 单位图可能只宽 279px，12 单位标签实际约 6.4px。
24. 图注清楚说明每种颜色。英文每句最多 25 词，中文用短句。
25. lf-label 英文大写、两至四词，中文对应翻译。

机制图，第 2 层：

26. 展示真实文件名、键名、token 数等名称和数值，不用 item 1 或无名灰条。
27. 提供一个主控件：单步、滑块、开关、播放或停止部件。
28. 最后以文字输出从图中数值计算的结论，不写死结果。
29. 35% 可见时播放一次，提供重播按钮，不循环。
30. 只动画 transform 和 opacity，缓动 `cubic-bezier(0.23, 1, 0.32, 1)`。按压 120 至 160ms，显现 200 至 300ms，折叠 380 至 500ms。
31. 列表每项错开 30 至 70ms，只错开前八项。
32. 每帧标签完整，不省略、不重叠、不压点阵。文字至少 11px，结论至少 12.5px。
33. 320px 时面板单列，控件触摸目标 40px。
34. 使用站内其他页面未用过的机制，并登记机制表。

抖色场，第 3 层：

35. 读取 bg、blueprint、ink，data-theme 改变时重绘。
36. 最多每秒 30 帧，只在可见时绘制。
37. 减少动态效果时绘制静态帧。无 WebGL 时显示静态斜线填充。
38. 条带 aria-hidden=true。除标签小片外，点阵上不放文字。

## 完成前检查

- [ ] 围栏名称与注册名完全一致，没有其他模块同名。
- [ ] 模块没有箭头、let、const、模板字符串。
- [ ] 课程图没有 setInterval 或 requestAnimationFrame。
- [ ] smil-rules.md 的校验器对已挂载宿主返回空数组。
- [ ] 每个动画图最多 55 个 SVG 元素。
- [ ] 循环时长均在 2.5 至 6 秒。
- [ ] 循环不改变第 11 条的几何属性。
- [ ] 减少动态效果时图完整，没有丢失元素。
- [ ] 深色下所有线和标签可见。
- [ ] 375px 宽时标签可读，图表外页面不横向滚动。
- [ ] 滑块到最小、最大均无 NaN、负宽度、控制台错误。
- [ ] SVG 有一个 title 和 desc，滑动后 ID 保持不变。
- [ ] 图注解释每种颜色。
- [ ] 第 2 层通过 mechanism-figures.md 的全部检查。
- [ ] 第 3 层通过 dither-fields.md 的全部检查。

## 文件

- `references/smil-rules.md`：十二条 SMIL 规则、原因与浏览器校验器。
- `references/toolkit.md`：LF 函数、挂载顺序、完整滑块和 SMIL 模块、站外预览页。
- `references/tokens.md`：明暗配色、字体、动态时长。
- `references/mechanism-figures.md`：第 2 层的真实名称、反例、机制、结构、结论、动态预算与检查。
- `references/dither-fields.md`：第 3 层的着色器、四种运动、标记、规则、抖色条和检查。
- `templates/mechanism.html`：可在浏览器直接打开的 LRU 缓存机制图，含容量控件。
- `templates/dither.js`：完整抖色脚本，加载后添加 `<div class="dither" data-seed="...">`。

仓库内另见 `site/lesson-figures.js` 运行时与 `site/figures-*.js` 更多图表。
