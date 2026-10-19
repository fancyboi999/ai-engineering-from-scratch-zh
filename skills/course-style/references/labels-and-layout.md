# 标签与布局

## 课程图 FIG_ 标签

课程、README、首页的图表使用全局编号。

| 形式 | 示例 | 位置 |
|---|---|---|
| 图 | `FIG_005` | 图左上角、文件名、替代文字 |
| 子图 | `FIG_005.A` | 一组中的面板或卡片 |
| 带标题标签 | `FIG_001 · FORWARD PASS` | 页面图表头部 |
| 图下说明 | `FIG_001 · A` | README 卡片的 `<sub>` 说明 |
| 命名模拟 | `FIG_AGT · An interactive simulation` | 交互讲解 |
| 页脚行 | `© FIG_005 · MULTI-HEAD ATTENTION · MIT` | 主图右下角 |
| 元信息行 | `PHASE 07 · LESSON 01 · MULTI-HEAD ATTENTION` | 主图右上角 |

规则：

- 编号固定三位，补前导零，确定后不改、不复用。
- `001` 至 `099` 属于第 0 至 7 阶段早期课程图。`100` 起按编写顺序编号。
- 子图用大写后缀 `.A`、`.B`、`.C`，窄屏版本用 `.M`。
- 分隔符为中点 `·`，两侧各一个空格，不用破折号或冒号。
- 英文标题大写，命名模拟的中点后使用句首大写。面向中文读者的说明译为中文。
- README 说明必须匹配 `FIG_\d{3}\s*·\s*[A-Z]`，翻译版也逐字节保留该标签和拉丁大写字母。
- 图文件名为 `<NNN>-<slug>.svg`，例如 `005-transformer-attention-heads.svg`。子图为 `<NNN>-<letter>-<slug>.svg`，例如 `001-a-prompts.svg`。
- 根 `aria-label` 或 `alt` 先写标签，再加冒号和简单说明，例如 `FIG_001.A: a prompt, an instruction document sent to a model`。中文说明对应翻译。
- 图表索引每图一行，包含 FIG 编号、slug、阶段、课号、添加日期、一句话说明。

1200 单位宽主图的头部：

```svg
<text class="mono bp" x="40" y="44" font-size="11" letter-spacing="2.4">FIG_005</text>
<text class="mono mute" x="1160" y="44" font-size="11" letter-spacing="2.4" text-anchor="end">PHASE 07 · LESSON 01 · MULTI-HEAD ATTENTION</text>
<line x1="40" y1="64" x2="1160" y2="64" stroke="#3553ff" stroke-width="0.6" stroke-opacity="0.35"/>
```

## 手册图标签

手册按篇编号，不使用全局 FIG_ 编号。

| 项目 | 格式 | 示例 |
|---|---|---|
| 可见图号 | `Fig. <part>.<n>` | `Fig. 4.1` |
| 图 ID | `fig-<part>-<n>` | `fig-4-1` |
| 前言图 | `Fig. 0.<n>` | `Fig. 0.1` 说明箭头和颜色语法 |
| 参考篇图 | `Fig. R.<n>` | `Fig. R.2` |
| 封面图 | `Plate I` | 每本手册一张 |
| 图索引列名 | `Fig.` | 位于每张图的断言旁 |

图头依次显示编号、标题、类型。英文标题小写。九种类型为 `sequence`、`structure`、`flow`、`comparison`、`timeline`、`tree`、`state`、`decision`、`layers`。

图注先用粗体写一句断言。英文最多 28 词，以句号结尾。随后说明读图方法和源文件。

手册内所有图表共用一个页面，所以每张图内部的 `id` 都以该图 ID 开头。

## 交互组件标签

课程交互组件的头部有两部分：

- 名称使用 `--blueprint`，英文大写，例如 `KV-CACHE SIZER`、`GRADIENT DESCENT`、`RAG CHUNKING`。
- 操作提示使用 `--ink-soft`，英文小写，例如 `drag the learning rate`、`pick a schedule`。

名称最多四个英文词，操作提示以动词开头。中文页面对应翻译显示文字。

## 卡片

卡片置于网格中，使用直角。

```css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 12px;
  padding: 14px;
}
.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 170px;
  padding: 16px;
  border: 1px solid var(--rule-soft);
  background: var(--bg);
  color: var(--ink);
}
.card h3 { margin: 0; font-size: 1.45rem; line-height: 1.05; }
.card p { margin: 0; font-size: 0.92rem; color: var(--ink-soft); }
```

卡片状态：

| 状态 | 边框 | 阴影 | 文字 |
|---|---|---|---|
| 默认 | `1px solid var(--rule-soft)` | 无 | `--ink`，正文 `--ink-soft` |
| 就绪，可点击 | `2px solid var(--blueprint)` | `4px 4px 0 var(--blueprint-tint-strong)` | 同默认 |
| 就绪时悬停 | 同就绪 | `6px 6px 0 var(--blueprint)`，`translate(-2px, -2px)` | 同默认 |
| 规划中 | `1px dashed`，透明背景 | 无 | 标题和正文 `--ink-mute` |

- 顶行放元信息和徽标，使用 `justify-content: space-between`，间距 6px。
- 底行使用 `margin-top: auto`，保持在各卡片底部。
- 底部进度条高 6px，底色 `--blueprint-tint-strong`。
- 560px 以下改为单列。
- 悬停变化使用 `--motion-feedback` 和 `--ease-out`，减少动态效果时移除。

## 图框

课程图框：

| 部分 | 数值 |
|---|---|
| 图框 | `1px solid var(--rule-soft)`，背景 `--bg`，外边距 `28px 0`，无内边距 |
| 图头 | flex 行，`padding: 12px 16px`，底边框 `1px solid var(--rule-soft)` |
| 主体 | `padding: 16px` |
| 控件 | 两列，间距 `12px 24px`，640px 以下单列 |
| 输出 | 顶边框 `1px dashed var(--rule-soft)`，`margin-top: 18px`，`padding-top: 14px` |
| 大数字 | 等宽 `2rem`，`--blueprint`，等宽数字 |
| 图注 | 衬线 `0.92rem`，`--ink-soft`，`line-height: 1.5`，`padding: 12px 16px`，顶边框 |
| 动画 SVG | 最大宽度 760px |

## 页面布局

- 内容容器：`max-width: 1200px`，两侧内边距 `32px`。
- 页头：固定，高 64px，内部最大宽 1360px，底边框 `1px solid var(--rule-soft)`。
- 锚点标题用 `scroll-padding-top: 96px` 避开页头。
- 弹窗：最大宽 820px，边框 `1px solid var(--ink)`，阴影 `--shadow-hard-lg`。
- 节间分隔条：高 6px，4px 蓝图色虚线叠加于浅色虚线行。
