# 动态图表 token

数值来自课程样式表，完整值在 course-style。本文件只复制动态图所需部分，使技能可独立使用。

## 颜色 token

默认浅色主题放在 root，深色放在 data-theme=dark。

| Token | 浅色 | 深色 | 图中用途 |
|---|---|---|---|
| `--bg` | `#fafaf5` | `#0a0d1a` | 卡片与 SVG 背景、点轮廓 |
| `--bg-surface` | `#f3f1e8` | `#131830` | 框填充 |
| `--ink` | `#1a1a1a` | `#e8e6dc` | 主要标签 |
| `--ink-soft` | `#4a4a4a` | `#a8a6a0` | 次要线与标签 |
| `--ink-mute` | `#7a7a78` | `#7a7878` | 坐标轴标签、其他序列 |
| `--rule-soft` | `rgba(26, 26, 26, 0.16)` | `rgba(232, 230, 220, 0.18)` | 框描边、轨道、网格 |
| `--blueprint` | `#3553ff` | `#6b8eff` | 唯一强调色，图表主体 |
| `--blueprint-tint` | `rgba(53, 83, 255, 0.08)` | `rgba(107, 142, 255, 0.12)` | 按下或激活背景 |
| `--blueprint-tint-strong` | `rgba(53, 83, 255, 0.18)` | `rgba(107, 142, 255, 0.22)` | 合并或选中单元格 |
| `--warn` | `#b8870f` | `#d4a83d` | 第二状态：超预算、失败、另一类别 |

颜色写作 `var(--token,<light value>)`，例如 `var(--ink-mute,#7a7a78)`。

课程模块文件顶部声明的颜色常量：

```js
var INK = 'var(--ink,#1a1a1a)', SOFT = 'var(--ink-soft,#555)', MUTE = 'var(--ink-mute,#777)';
var BP = 'var(--blueprint,#3553ff)', BG = 'var(--bg,#fafaf5)', SURF = 'var(--bg-surface,#eee)';
var RULE = 'var(--rule-soft,#ddd)', WARN = 'var(--warn,#b8870f)';
```

## 字体

| Token | 数值 | 用途 |
|---|---|---|
| `--font-mono` | `'JetBrains Mono', ui-monospace, 'Consolas', monospace` | 全部 SVG 文字、控件标签、图头 |
| `--font-body` | `'Source Serif 4', 'Source Serif Pro', 'Iowan Old Style', Georgia, serif` | 图注 |
| `--font-display` | `'VT323', ui-monospace, 'JetBrains Mono', monospace` | 大型状态数字 |

## 动态 token

| Token | 数值 | 用途 |
|---|---|---|
| `--motion-press` | `160ms` | 按钮按压缩放 0.97 |
| `--motion-feedback` | `180ms` | 悬停或聚焦的颜色和边框变化 |
| `--motion-enter` | `220ms` | 协调节点的透明度和变换 |
| `--motion-drawer` | `250ms` | 抽屉和面板 |
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | 入场和反馈 |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | 两个静止位置间移动 |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | 抽屉 |

SMIL 样条 `0.23 1 0.32 1` 与 ease-out 是同一曲线。

## SMIL 时间值

| 项目 | 数值 |
|---|---|
| 入场时长 | 0.5 至 0.6 秒 |
| 入场起态 | opacity 0、scale 0.95 |
| 入场交错 | 0.05 至 0.4 秒 |
| 循环时长 | 2.5 至 6 秒 |
| 静态帧时间 | 宿主 data-static-time，默认 1.5 秒 |
| 元素预算 | 每图 55 个 SVG 元素 |
| 最低标签字号 | 12 个 SVG 单位 |

## 卡片类

| 类 | 部分 |
|---|---|
| `.lf` | 卡片 |
| `.lf-head` | 图头：大写等宽 0.68rem，字距 0.16em |
| `.lf-label` | 图头中的名称，blueprint 色 |
| `.lf-body` | 控件和输出，16px 内边距 |
| `.lf-grid` | 两列控件，640px 以下单列 |
| `.lf-ctrl` | 一个控件：标签、数值、输入 |
| `.lf-out` | 虚线下方输出区 |
| `.lf-num` | 大型数字，2rem，blueprint 色 |
| `.lf-meta` | 数字下方简短等宽文字 |
| `.lf-formula` | 带当前值的公式 |
| `.lf-cap` | 使用正文字体的图注 |

## 减少动态效果

减少动态效果时显示静态帧，禁用暂停按钮并显示“已减少动态效果”。协调节点只保留 opacity、fill、stroke 过渡，停止 transform 过渡。
