---
name: course-style
version: 1.0.0
description: >
  从零开始学 AI 工程页面、图表与手册共用的视觉和写作参考。
  用于明暗主题颜色 token、字体栈、FIG_ 标签、卡片布局、清晰的技术写作规则，
  以及无障碍和减少动态效果默认值。触发短语：“课程风格”“蓝图配色”“课程 token”
  “FIG 标签”“检查技术文案”“课程字体”“深色主题 token”。
tags: [design-system, tokens, typography, writing, accessibility]
---

# 课程风格

本技能定义从零开始学 AI 工程的外观与表达。blueprint-figure、motion-figure、isometric-explainer 和 write-manual 从这里读取精确值。支持 Claude、Cursor、Codex、OpenClaw、Hermes，以及所有读取 SKILL.md 的 agent。本技能不定义绘图方法，而是规定颜色、字体、标签、间距、用词与检查方法。

## 何时使用

- 编写或审查课程页面、卡片、图表或手册。
- 查找明暗主题 token。
- 查找图、子图、交互组件的标签格式。
- 按清晰的技术写作规则检查正文。
- 添加动态效果，需要确定时长、缓动和减少动态效果的行为。

## 交给其他技能的情况

- 静态 SVG 图：使用 blueprint-figure，它会引用本技能。
- 动画或滑块图：使用 motion-figure。
- 等距机器讲解：使用 isometric-explainer。
- 完整手册的结构与审计：使用 write-manual。
- 其他产品使用自己的品牌规范。

## 方法

1. 设置主题。将 `references/tokens.md` 的浅色 token 放到 `:root`，深色 token 放到 `[data-theme="dark"]`。
2. 选择 token 集。页面使用站点 token，手册图使用 `--m-` token。
3. 用 `references/typography.md` 中的精确链接加载三种字体，原样使用字体栈。
4. 按 `references/labels-and-layout.md` 为每张图设置标签。
5. 按同一文档的尺寸构建卡片和图框。
6. 动态效果只使用动态 token，并加入 `references/accessibility.md` 的减少动态效果代码。
7. 编写正文，然后逐行按 `references/plain-english.md` 检查。
8. 完成下方清单，修复每项失败。

## 规则

### 颜色

- 每页只用一个强调色 `--blueprint`，浅色 `#3553ff`、深色 `#6b8eff`。仅状态 token 与手册图的语义色例外。
- 所有颜色写成 CSS 变量。十六进制值只能作为 `var()` 的默认值。
- 每个 token 都要定义明暗两种值，缺少深色值是缺陷。
- 正文只用 `--ink` 或 `--ink-soft`。
- 正文不用 `--ink-mute` 或 `--warn`，它们在纸张色上的对比度不足 4.5:1。
- 保留四种固定语义色：玫红表示失败，灰色表示范围外，琥珀表示生命周期，青色表示持久状态。
- 只有纸张点阵和虚线分隔条可用渐变。卡片和图框使用直角。

### 字体

- 标题使用展示字体，字重 400，英文大写，字距 0.02em，颜色 `--blueprint`。
- 正文使用衬线字体，18px，行高 1.62。
- 标签、元信息和代码使用等宽字体。英文标签大写，字距 0.06em 至 0.16em。
- 图宽 640 单位时，图中文字至少 11 单位。

### 标签

- 课程图编号为 `FIG_` 加三位数字，例如 `FIG_005`，编号不得重复。
- 子图加点和大写字母，例如 `FIG_005.A`。
- 用中点分隔，两侧各一个空格，例如 `FIG_001 · FORWARD PASS`。
- 手册图使用 `Fig. <part>.<n>`，例如 `Fig. 4.1`，ID 为 `fig-4-1`。

### 正文

- 英文每句最多 25 词，指令最多 20 词并用祈使句。中文采用短句原则，不套用英文分词计数。
- 每段只谈一个主题，最多六句。
- 不用长短破折号、分号和英文缩写形式。
- 英文不用 "may"，改用 "can" 或说明具体条件。
- 不使用 `references/plain-english.md` 中的禁用表达。
- 行内代码、代码块、引用和引文标记不受上述文字检查限制。

### 动态效果与无障碍

- 只使用四种时长：160、180、220、250 ms。
- 页面显现从偏移 8px、不透明度 0 开始，使用 `--ease-out`。弹窗从下移 14px、缩放 0.985 开始。
- 按下按钮时缩放至 0.97。
- 在 `prefers-reduced-motion: reduce` 下移除过渡与动画，显示最终状态。
- 每个可聚焦控件使用 2px 实线 `--blueprint` 轮廓，偏移 2px。
- 菜单和图表控件的触摸目标至少高 44px。

## 完成前检查

- [ ] 所有颜色都是 `var(--token)`，每个 token 都有明暗值。
- [ ] 页面只用一个强调色。
- [ ] 正文没有使用 `--ink-mute` 或 `--warn`。
- [ ] 字体从统一 Google Fonts 链接加载，字体栈与 `references/typography.md` 一致。
- [ ] 每张图都有符合 `references/labels-and-layout.md` 的标签。
- [ ] 标签不使用破折号分隔。
- [ ] 每个过渡都用动态 token，并包含减少动态效果的代码。
- [ ] 每个控件有可见焦点轮廓。菜单行与图表控件至少高 44px。
- [ ] `references/plain-english.md` 的文字检查无命中。
- [ ] 切换深色主题，再读一遍页面。

## 文件

- `references/tokens.md`：站点和图表的明暗 token、语义色、动态 token、实测对比度。
- `references/typography.md`：字体栈、字体链接、字号与标签样式。
- `references/labels-and-layout.md`：FIG_ 格式、文件名、卡片布局与图框。
- `references/plain-english.md`：完整写作规则、禁用词与检查器。
- `references/accessibility.md`：焦点、触摸目标、图表标记、主题初始化与减少动态效果。

仓库中的源值在 `site/style.css`、`manuals/_shared/tokens.css` 和 `scripts/audit_manuals.js`。
