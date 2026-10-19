# 图表检查项

每项都有规则名和可由脚本或审阅者执行的检查。仓库内 `scripts/audit_manuals.js` 运行全部检查。仓库外运行 `templates/figure.mjs` 的检查，再人工核对清单。

## 根与无障碍

| 规则 | 检查 |
|---|---|
| viewBox | `viewBox="0 0 640 H"`，H 不超过 760 |
| role | 根有 `role="img"` |
| labels | 根有 `aria-labelledby="<id>-title <id>-desc"` |
| title | 根的直接子元素有带文字的 `<title id="<id>-title">` |
| desc | 根的直接子元素有至少 40 字符的 `<desc id="<id>-desc">` |
| ids | 每个 ID 都以 `<id>-` 开头，因为所有图共用一页 |
| font | 根声明等宽字体，每个 m-serif 文字声明衬线字体 |
| ink | 根有 `fill="var(--m-ink, #1a1a1a)"`，未声明 fill 的文字在深色页也可见 |

`desc` 按阅读顺序列出真实部件和交互，让屏幕阅读器用户获得完整图意。

## 允许的标记

元素：

```text
svg title desc defs g rect line path polyline polygon
circle ellipse text tspan marker pattern animate animateTransform animateMotion
```

属性：

```text
xmlns viewBox role aria-labelledby font-family id class x
y x1 y1 x2 y2 cx cy r
rx ry width height d points fill stroke
stroke-width stroke-dasharray stroke-linecap stroke-linejoin stroke-opacity fill-opacity opacity transform
font-size font-weight font-style text-anchor letter-spacing marker-start marker-end refX
refY markerWidth markerHeight markerUnits orient patternUnits patternTransform data-beat
attributeName type values keyTimes keySplines keyPoints calcMode dur
begin path
```

类仅允许 `m-serif`、`m-knock`、`m-packet`。

禁止 style 元素或属性、脚本、事件处理器、链接、图片、foreignObject。

## 大小与结构

| 规则 | 检查 |
|---|---|
| figure-size | 最多 40 KB，绘制元素最多 450 个 |
| figure-transform | transform 只用于 g，且只能为 translate(x, y) |
| figure-tspan | 每行一个 text，不定位 tspan，即无 x、y、dx、dy、rotate |
| figure-text | text 中只有文字和普通 tspan |
| figure-color | fill 和 stroke 只能是 none、transparent、currentColor、`url(#<id>-...)`、`var(--m-<token>, #hex)` |
| figure-color | var() 中十六进制值等于 token 的浅色值 |

## 可读性

| 规则 | 检查 |
|---|---|
| figure-font | 所有文字至少 11 单位 |
| figure-bounds | 文本框距 viewBox 边界至少 1 单位 |
| figure-ellipsis | 标签不含 `…` 或 `...` |
| figure-spill | 框内文字左右至少留 2 单位，上下至少留 1 单位 |
| figure-overlap | 任意两个文本框重叠不超过 0.5 单位 |
| figure-crossing | 线或路径不穿文字，除非线与字之间已绘制补底或不透明矩形 |
| figure-hatch | 文字不放在斜线填充上 |
| figure-lexicon | 标签、title、desc 不使用比喻或 AI 套话 |

按 grammar.md 的度量估算：等宽每字符 `0.6 × 字号`，衬线 `0.54 × 字号`，上边 `y − 0.78 × 字号`，下边 `y + 0.22 × 字号`。交叉检查先将文本框各边内缩 1.5 单位，再测试线。

标签放不下时：

1. 缩短为真实名称，不加省略号。
2. 仍过长就移到框外，加引线。
3. 过长标签很多时，框内放编号，文字放编号索引。

不能缩小到 11 以下来塞入标签。

## 动画（仅图表有节拍时）

| 规则 | 检查 |
|---|---|
| begin | `begin="indefinite"` |
| fill | `fill="freeze"` |
| dur | 正秒数，例如 `0.45s` |
| values | values 中没有 var() |
| keyTimes | 从 0 到 1，单调不减，项数与 values 或 keyPoints 一致 |
| keySplines | 比 keyTimes 少一项，每项四个 0 至 1 的数，只在 calcMode=spline 时使用 |
| keyPoints | 只与 calcMode=linear 一起使用 |
| beat group | 每个 g data-beat 包含 opacity animate |

## 图注

图注放在页面中，不放进 SVG。

| 规则 | 检查 |
|---|---|
| figure-claim | 粗体断言开头，一句，英文最多 28 词，以句号结束 |
| reading | 下一句说明读图顺序 |
| source | 最后一句说明源文件或运行记录 |

## 来源

| 规则 | 检查 |
|---|---|
| figure-drift | 脚本绘图时，提交的 SVG 等于脚本输出 |
| figure-orphan | 图目录中的每个 SVG 都被页面引用 |
