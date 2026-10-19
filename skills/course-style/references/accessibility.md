# 无障碍与减少动态效果

以下默认值适用于课程中的所有页面、卡片与图表。每项都能在产物中检查。

## 主题初始化

首次绘制前，在根元素设置主题。优先读取已保存的选择，再读取系统设置，最后使用浅色。

```javascript
(function () {
  var root = document.documentElement;
  var stored = '';
  try { stored = localStorage.getItem('theme') || ''; } catch (_) {}
  if (stored === 'light' || stored === 'dark') root.setAttribute('data-theme', stored);
  else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) root.setAttribute('data-theme', 'dark');
  else root.setAttribute('data-theme', 'light');
})();
```

- 存储键为 `theme`，值为 `light` 或 `dark`。
- 所有存储读写都放在 `try` 中，让隐私窗口也能渲染。
- 主题切换时同步修改根元素和存储值。

## 焦点

- 链接、按钮、输入框和开关在 `:focus-visible` 时都要显示焦点环。
- 使用 `outline: 2px solid var(--blueprint)`，以及 `outline-offset: 2px`。
- 跳到正文链接放在 `body` 首位，平时隐藏，聚焦时显示，使用 `padding: 12px 18px` 和 `2px solid var(--ink)` 轮廓。
- 移除默认轮廓时，必须提供相同尺寸的替代焦点环。

## 触摸目标

- 菜单行、图表控件和移动端按钮使用 `min-height: 44px`。
- 弹窗关闭按钮与切换按钮使用 `min-height: 36px`，宽度至少 78px。
- 480px 以下的正文为 `16px`，阅读文字不得更小。

## 颜色与对比度

- 正文用 `--ink` 或 `--ink-soft`，二者在明暗主题中都达到 4.5:1。
- `--ink-mute` 浅色对比度为 4.11:1，深色为 4.41:1，只用于大字或非文字标记。
- 状态不能只靠颜色表达，还需文字、边框样式或符号。例如规划中卡片同时使用虚线边框和弱化文字。
- 完成前检查明暗两种主题。

## 图表标记

静态 SVG：

- 根元素包含 `role="img"` 和 `aria-labelledby="<id>-title <id>-desc"`。
- 根元素的直接子元素包含 `<title>` 和 `<desc>`。`<desc>` 至少 40 个字符，说明图表表达什么。
- 没有 `<title>` 和 `<desc>` 的课程图使用以 FIG_ 标签开头的 `aria-label`。
- 图内所有 `id` 以图表 ID 开头。
- 手册图内没有脚本、事件处理器、链接或 `style` 属性。

交互组件：

- 每个控件都有 `<label>`，其 `for` 指向控件 ID。
- 滑块在标签旁用文字显示当前值。
- 使用原生 `<input type="range">`，设置 `accent-color: var(--blueprint)`。

## 减少动态效果

站点 CSS、课程图与 SMIL 动画都遵循 `prefers-reduced-motion: reduce`。

页面 CSS：

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .reveal,
  .ascii-rule,
  .toc-row {
    transition: none !important;
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
    clip-path: none !important;
  }
}
```

规则：

- 立即显示最终状态，不等过渡结束才显示内容。
- 可保留不超过 180ms 的颜色与透明度变化，移除位移、缩放和裁剪变化。
- 关闭平滑滚动。
- 按下按钮时不缩放。

课程动画图：

- 动画有带 `aria-pressed` 的切换按钮，文字为 `Pause animation` 或 `Play animation`。
- `aria-label` 为 `Pause explanatory animation` 或 `Play explanatory animation`。
- 减少动态效果时，按钮显示 `Motion reduced`、禁用，并标注 `Animation disabled because reduced motion is enabled`。中文页面将这些可见文字与无障碍标签对应译为中文。
- 此时图表显示一个静态帧，时间取宿主的 `data-static-time`，默认 1.5 秒。
- 选取能完整表达内容、易读的一帧。
- 打印时隐藏切换按钮。

交互讲解在减少动态效果时不自动播放。先绘制完整的一帧，再由读者通过控件开始播放。
