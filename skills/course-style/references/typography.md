# 字体与排版

课程使用三种字体：像素展示字体用于标题，衬线字体用于阅读正文，等宽字体用于标签、元信息、图中文字和代码。

## 字体栈

原样复制。站点与图表 token 使用同样的字体列表。

```css
--font-display: 'VT323', ui-monospace, 'JetBrains Mono', monospace;
--font-body: 'Source Serif 4', 'Source Serif Pro', 'Iowan Old Style', Georgia, serif;
--font-mono: 'JetBrains Mono', ui-monospace, 'Consolas', monospace;
--font-heading: var(--font-display);
```

图内使用对应的 `--m-` 名称：`--m-font-display`、`--m-font-body`、`--m-font-mono`，值与上述列表相同。

## 加载

在文档 head 中用一次请求加载三种字体：

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=VT323&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
```

等宽字体只用 400、500、700 字重。衬线字体用 400 至 700。VT323 只有一种字重，因此标题设为 `font-weight: 400`。

通过 `<img>` 加载的 SVG 不能使用页面的网络字体。提供完整字体栈，让浏览器选择本地字体。

## 字号层级

| 元素 | 字体 | 字号 | 其他 |
|---|---|---|---|
| `body` | 正文 | `18px` | `line-height: 1.62`，`hyphens: none` |
| `p` | 正文 | `1rem` | `line-height: 1.62` |
| `h1` | 展示 | `clamp(min(2.4rem, 12vw), 6vw, 4.4rem)` | 下方标题规则共用 |
| `h2` | 展示 | `clamp(min(1.8rem, 9vw), 4vw, 2.6rem)` | |
| `h3` | 展示 | `clamp(min(1.2rem, 6vw), 2.6vw, 1.6rem)` | |
| `h4` | 展示 | `1.1rem` | |
| 首字下沉 | 展示 | `4.2rem` | `line-height: 0.85`，颜色 `--blueprint` |
| 标识 | 展示 | `1.6rem` | 英文大写，`letter-spacing: 0.04em` |
| code、kbd、samp | 等宽 | 继承 | |

所有 `h1` 至 `h4` 共用：

```css
font-family: var(--font-display);
font-weight: 400;
line-height: 1;
letter-spacing: 0.02em;
text-transform: uppercase;
color: var(--blueprint);
overflow-wrap: break-word;
```

## 标签样式

标签使用等宽字体，英文大写并增加字距。使用下表已有类，不另造字号。

| 类 | 字号 | 字重 | 字距 | 颜色 |
|---|---|---|---|---|
| `.label` | `0.72rem` | 500 | `0.12em` | `--ink-soft` |
| `.fig-label` | `0.7rem` | 500 | `0.16em` | `--blueprint` |
| 组件标题 `.lf-head` | `0.68rem` | 继承 | `0.16em` | `--ink-soft`，名称用 `--blueprint` |
| 组件控件标签 | `0.7rem` | 继承 | `0.08em` | `--ink-soft`，数值用 `--blueprint` |
| 卡片元信息 | `0.64rem` | 继承 | `0.1em` | `--ink-mute` |
| 卡片底部 | `0.68rem` | 继承 | `0.08em` | `--blueprint` |
| 页脚文字与链接 | `0.78rem` | 继承 | `0.06em` | `--ink-mute` 或 `--ink-soft` |
| 弹窗部件编号 | `0.78rem` | 500 | `0.16em` | `--blueprint` |

变化中的计数、数值、百分比等数字使用 `font-variant-numeric: tabular-nums`。

## 图中文字

- 使用等宽字体，或带 `m-serif` 类的衬线字体。640 单位宽的 viewBox 内至少 11 单位，屏幕上约为 11px，打印约为 8pt。
- 1200 单位宽的主图中，FIG_ 标签为 11 单位，页脚为 10 单位。
- 每行一个 `<text>` 元素，不定位 `<tspan>` 子元素。
- 放不下时缩短标签，或移到外部并加引线。不要缩小到最低字号以下，也不添加省略号。
