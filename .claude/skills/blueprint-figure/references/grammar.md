# 图表语法：token、色相、箭头与尺寸

本文件给出图表使用的精确值。course-style 保存完整课程 token，此处复制所需值，使本技能可独立使用。

## 中性色 token

| Token | 浅色 | 深色 | 用途 |
|---|---|---|---|
| `--m-paper` | `#fafaf5` | `#0a0d1a` | 页面、步骤圆填充、表格行填充 |
| `--m-panel` | `#f3f1e8` | `#121729` | 图背景、标签补底 |
| `--m-panel-edge` | `#e4e1d4` | `#232a45` | 表格行边框、图框 |
| `--m-ink` | `#1a1a1a` | `#e8e6dc` | 默认文字、调用和响应箭头 |
| `--m-ink-soft` | `#4a4a4a` | `#b4b2aa` | 副行、注释、字段名 |
| `--m-ink-mute` | `#6f6f6a` | `#8a8882` | 小标题、生命线、树边、斜线填充 |
| `--m-accent` | `#3553ff` | `#6b8eff` | 蓝图强调色，用于图主体外 |

## 色相 token

每种色相包含 ink（描边、箭头线、彩色文字）和 fill（方框背景）。

| 色相 | 浅色墨色 | 浅色填充 | 深色墨色 | 深色填充 |
|---|---|---|---|---|
| `grey` | `#5e5e59` | `#ecebe3` | `#b9b7ae` | `rgba(232, 230, 220, 0.08)` |
| `blue` | `#2f5d9a` | `#e6edf6` | `#8fb3e8` | `rgba(110, 150, 220, 0.16)` |
| `teal` | `#18696a` | `#e1efee` | `#6cc4c2` | `rgba(80, 180, 175, 0.15)` |
| `violet` | `#5b4fa3` | `#ebe8f5` | `#b3a8ec` | `rgba(150, 135, 230, 0.16)` |
| `green` | `#336b40` | `#e5f0e4` | `#8fcf98` | `rgba(110, 190, 120, 0.15)` |
| `amber` | `#85590c` | `#f5ecd9` | `#e0b45c` | `rgba(220, 170, 70, 0.15)` |
| `plum` | `#8a3d72` | `#f4e6ef` | `#e29ccb` | `rgba(220, 130, 190, 0.15)` |
| `olive` | `#515f26` | `#eef0dc` | `#c3cf7e` | `rgba(180, 190, 100, 0.15)` |
| `indigo` | `#4b4f9e` | `#e9e9f6` | `#a9adf0` | `rgba(140, 145, 235, 0.16)` |
| `rose` | `#b0344d` | `#f7e4e7` | `#f08aa0` | `rgba(235, 110, 135, 0.16)` |

SVG 所有颜色写作 `var(--m-<token>, <light hex>)`，例如 `fill="var(--m-teal-fill, #e1efee)"`。宿主在 `[data-theme="dark"]` 设置深色值。不带宿主样式表的 README 图片等使用浅色默认值。

给宿主加深色模式时，将深色列复制到 `[data-theme="dark"] { ... }`，保留同样的 `--m-` 名称。

## 固定语义色

四种色相在所有图组中含义固定：

| 色相 | 含义 |
|---|---|
| `rose` | 失败：错误、崩溃、中止、工作丢失 |
| `grey` | 主题外：宿主、操作者、范围外 |
| `amber` | 生命周期：任务、阶段、状态机 |
| `teal` | 持久状态：存储和已提交记录 |

每组为 `blue`、`violet`、`green`、`plum`、`olive`、`indigo` 定义一次含义。首图绘制前写好色相和含义表。以下是 agent 协议手册示例：

| 色相 | 含义 |
|---|---|
| `violet` | 客户端 agent 及其发送内容 |
| `blue` | 远端 agent、它们的卡片和返回消息 |
| `green` | 部件与产物，即任务产生的内容 |
| `indigo` | 流、订阅、推送通知 |
| `plum` | agent 内部的模型或逻辑 |
| `olive` | agent 自己调用的工具和系统 |

## 箭头样式

只使用以下八种样式。

| 样式键 | 线条 | 含义 |
|---|---|---|
| `call` | 墨色实线 | 调用或请求 |
| `reply` | 墨色虚线 | 响应 |
| `write` | 青色实线 | 持久写入 |
| `state` | 琥珀色虚线 | 状态变化 |
| `model` | 梅色实线 | 模型调用或计算 |
| `effect` | 橄榄色虚线 | 系统外部影响 |
| `event` | 靛色点线 | 流或事件 |
| `fail` | 玫红虚线 | 失败 |

描边值：

- 线宽 `1.2`。
- 虚线： `stroke-dasharray="5 4"`.
- 点线： `stroke-dasharray="1.5 3.5"` 并设置 `stroke-linecap="round"`。
- 路径： `fill="none"` 和 `stroke-linejoin="round"`。
- 树边使用 call 样式、ink-mute 色，无箭头。

每种色相一个箭头标记，ID 为 `<figure-id>-head-<hue>`：

```xml
<marker id="fig-1-1-head-teal" viewBox="0 0 10 10" refX="9" refY="5"
  markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse"
  orient="auto-start-reverse">
  <path d="M0 1 L10 5 L0 9 z" fill="var(--m-teal-ink, #18696a)"/>
</marker>
```

箭头在目标边缘前 1 单位结束。右侧目标用 `x2 = target.x - 1`，左侧用 `target.x + target.w + 1`，标记尖端刚好接触边框。

每组首图 0.1 展示使用的每种箭头，注明含义，例如“持久写入 · 青色实线”。

## 边框

| 边框 | 含义 |
|---|---|
| 色相 ink 实线 | 普通部件或状态 |
| 虚线 `5 4` | 中断、可选或不存在 |
| 双边框，第二矩形内缩 3 单位 | 终止状态 |
| 斜线填充 | 时间线等待时间，不能覆盖文字 |

## 字号与度量

| 元素 | 字号 | 字重和字体 | 颜色 |
|---|---|---|---|
| 框标题 | 12.5 | 700，等宽 | ink |
| 框副行 | 11 | 衬线，带 `class="m-serif"` 和 `font-family` | ink-soft |
| 列或组小标题 | 11，英文大写，`letter-spacing="1.2"` | 等宽 | ink-mute |
| 箭头标签 | 11.5 | 等宽 | 箭头色相，调用和响应用 ink |
| 箭头注释 | 11，箭头下方 15 单位 | 衬线 | ink-soft |
| 步骤编号 | 11，圆半径 9 | 等宽 | ink |
| 表格文字 | 12 | 等宽 | ink or ink-soft |

每个文字元素声明自己的字体和颜色，使页面内联、README 图片和手册渲染一致：

- 根设置 `font-family="JetBrains Mono, ui-monospace, monospace"` 和 `fill="var(--m-ink, #1a1a1a)"`。无 fill 的文字继承根墨色。
- 每行衬线字设置 `class="m-serif"` 和 `font-family="Source Serif 4, Georgia, serif"`。
- 所有形状及使用其他色相的文字保留显式 fill。

文字宽度的估算因子：

- 等宽： `characters × size × 0.6`
- 衬线： `characters × size × 0.54`
- 字距增加 `(characters − 1) × spacing`
- 文本框范围从 `y − 0.78 × size` to `y + 0.22 × size`

若缺少 font-family，且宿主无 m-serif 规则，衬线行会变成等宽字，导致长行越界。

## 形状

| 形状 | 数值 |
|---|---|
| 生命线 | `ink-mute`, 线宽 1， `stroke-dasharray="2 3"` |
| 步骤圆 | r 9, fill paper, stroke ink 线宽 1， number at `y + 4` |
| 圆点 | r 2.5 |
| 分隔线 | 线宽 1，无语义时使用 ink-mute |
| 标签补底 | `class="m-knock"`, 填充 panel，两侧各加宽 3，文字顶部再上移 2，高为字号加 4 |
| 斜线图案 | 6 × 6 用户单位， `patternTransform="rotate(45)"`, ink-mute 线透明度 0.4，矩形描边 ink-mute、透明度 0.35 |

## 节拍（可选动画）

图表可按编号节拍显现部件。不播放时仍需完整可读。每个节拍为 `<g data-beat="n">`，n 从 1 至 40，包含：

- 一个 `<animate attributeName="opacity" values="0;0;1">`
- 一个 `<animateTransform type="translate" values="0 4;0 4;0 0">`
- `begin="indefinite"`, `fill="freeze"`, `calcMode="spline"`, `keySplines="0 0 1 1;0.23 1 0.32 1"`

节拍 n 在 `(n − 1) × 0.6` 秒开始，淡入 0.45 秒。宿主脚本启动动画。课程内动画使用 motion-figure。
