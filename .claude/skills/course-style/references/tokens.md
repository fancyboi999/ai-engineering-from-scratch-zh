# 设计 token

课程有两组 token。页面和站点组件使用站点 token，静态手册图使用 `--m-` 图表 token，使图表在不同页面中保持一致。

浅色值放在 `:root`，深色值放在 `[data-theme="dark"]`。缺少深色值是缺陷。

## 站点 token

| Token | 浅色 | 深色 | 用途 |
|---|---|---|---|
| `--bg` | `#fafaf5` | `#0a0d1a` | 页面纸张色 |
| `--bg-surface` | `#f3f1e8` | `#131830` | 面板、未交互按钮 |
| `--bg-surface-hover` | `#ece9dc` | `#1b2244` | 面板悬停 |
| `--ink` | `#1a1a1a` | `#e8e6dc` | 正文、硬阴影 |
| `--ink-soft` | `#4a4a4a` | `#a8a6a0` | 次要文字、标签 |
| `--ink-mute` | `#7a7a78` | `#7a7878` | 仅用于较大字号的元信息 |
| `--rule` | `#1a1a1a` | `#e8e6dc` | 强调边框 |
| `--rule-soft` | `rgba(26, 26, 26, 0.16)` | `rgba(232, 230, 220, 0.18)` | 默认边框 |
| `--paper-rule` | `rgba(26, 26, 26, 0.08)` | `rgba(232, 230, 220, 0.08)` | 纸张点阵 |
| `--blueprint` | `#3553ff` | `#6b8eff` | 唯一强调色 |
| `--blueprint-tint` | `rgba(53, 83, 255, 0.08)` | `rgba(107, 142, 255, 0.12)` | 悬停与选中填充 |
| `--blueprint-tint-strong` | `rgba(53, 83, 255, 0.18)` | `rgba(107, 142, 255, 0.22)` | 条形图、就绪卡片阴影 |
| `--status-complete` | `#3553ff` | `#6b8eff` | 已完成 |
| `--status-in-progress` | `#4a4a4a` | `#c8c6c0` | 进行中 |
| `--status-planned` | `#b8b6ad` | `#4a4a48` | 规划中，仅限非文字 |
| `--warn` | `#b8870f` | `#d4a83d` | 警告标记、综合项目标签 |
| `--code-bg` | `#efece0` | `#131830` | 代码块 |
| `--modal-bg` | `#fafaf5` | `#0f1424` | 弹窗与菜单面板 |
| `--overlay-bg` | `rgba(26, 26, 26, 0.55)` | `rgba(10, 13, 26, 0.78)` | 弹窗遮罩 |
| `--header-bg` | `rgba(250, 250, 245, 0.94)` | `rgba(10, 13, 26, 0.94)` | 固定页头，模糊 10px |
| `--accent-hover` | `#2840d6` | `#8aa5ff` | 强调色悬停 |

下列 token 引用其他 token，两种主题共用一个值：

```css
--text: var(--ink);
--text-muted: var(--ink-soft);
--border: var(--rule-soft);
--accent: var(--blueprint);
--secondary: var(--blueprint);
--complete: var(--status-complete);
--planned: var(--status-planned);
--shadow-color: var(--ink);
--shadow-hard: 3px 3px 0 var(--ink);
--shadow-hard-lg: 5px 5px 0 var(--ink);
--dot-color: var(--paper-rule);
--header-offset: 92px;
```

在 `body` 上绘制纸张点阵：

```css
background-color: var(--bg);
background-image: radial-gradient(var(--paper-rule) 1px, transparent 1px);
background-size: 16px 16px;
background-attachment: fixed;
```

阴影为无模糊的硬偏移。菜单用 `--shadow-hard`，弹窗用 `--shadow-hard-lg`。

## 动态 token

| Token | 数值 | 用途 |
|---|---|---|
| `--motion-press` | `160ms` | 按压反馈，`scale(0.97)` |
| `--motion-feedback` | `180ms` | 颜色、边框和背景变化 |
| `--motion-enter` | `220ms` | 显现、进度条、标题入场 |
| `--motion-drawer` | `250ms` | 弹窗与抽屉 |
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | 所有入场的默认值 |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | 两个位置间移动 |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | 弹窗与抽屉 |

站点中使用的动态值：

- 显现：从 `opacity: 0`、`translateY(8px)` 变为 `opacity: 1`、无变换。左侧显现使用 `translateX(-8px)`。
- 交错：每项设置 `--stagger-delay`，用作过渡延迟。
- 弹窗：从 `translateY(14px) scale(0.985)` 变为 `translateY(0) scale(1)`，时长 `--motion-drawer`，缓动 `--ease-drawer`。
- 标题入场：从 `opacity: 0.82`、`translateY(6px)` 开始，只执行一次。
- SMIL 图使用同一曲线 `keySplines="0.23 1 0.32 1"`。

## 图表 token

手册图中的每种颜色写作 `var(--m-<token>, #hex)`，十六进制默认值始终使用下表浅色值。

| Token | 浅色 | 深色 |
|---|---|---|
| `--m-paper` | `#fafaf5` | `#0a0d1a` |
| `--m-panel` | `#f3f1e8` | `#121729` |
| `--m-panel-edge` | `#e4e1d4` | `#232a45` |
| `--m-ink` | `#1a1a1a` | `#e8e6dc` |
| `--m-ink-soft` | `#4a4a4a` | `#b4b2aa` |
| `--m-ink-mute` | `#6f6f6a` | `#8a8882` |
| `--m-rule` | `rgba(26, 26, 26, 0.16)` | `rgba(232, 230, 220, 0.18)` |
| `--m-rule-strong` | `rgba(26, 26, 26, 0.42)` | `rgba(232, 230, 220, 0.45)` |
| `--m-accent` | `#3553ff` | `#6b8eff` |
| `--m-code-bg` | `#efece0` | `#131830` |

每种色相都包含用于描边与文字的 ink，以及用于框背景的 fill。

| 色相 | 浅色墨色 | 浅色填充 | 深色墨色 | 深色填充 |
|---|---|---|---|---|
| grey | `#5e5e59` | `#ecebe3` | `#b9b7ae` | `rgba(232, 230, 220, 0.08)` |
| blue | `#2f5d9a` | `#e6edf6` | `#8fb3e8` | `rgba(110, 150, 220, 0.16)` |
| teal | `#18696a` | `#e1efee` | `#6cc4c2` | `rgba(80, 180, 175, 0.15)` |
| violet | `#5b4fa3` | `#ebe8f5` | `#b3a8ec` | `rgba(150, 135, 230, 0.16)` |
| green | `#336b40` | `#e5f0e4` | `#8fcf98` | `rgba(110, 190, 120, 0.15)` |
| amber | `#85590c` | `#f5ecd9` | `#e0b45c` | `rgba(220, 170, 70, 0.15)` |
| plum | `#8a3d72` | `#f4e6ef` | `#e29ccb` | `rgba(220, 130, 190, 0.15)` |
| olive | `#515f26` | `#eef0dc` | `#c3cf7e` | `rgba(180, 190, 100, 0.15)` |
| indigo | `#4b4f9e` | `#e9e9f6` | `#a9adf0` | `rgba(140, 145, 235, 0.16)` |
| rose | `#b0344d` | `#f7e4e7` | `#f08aa0` | `rgba(235, 110, 135, 0.16)` |

token 名称为 `--m-<hue>-ink` 与 `--m-<hue>-fill`，例如 `--m-teal-ink`。

### 色相含义

四种色相在所有手册中含义固定：

| 色相 | 含义 |
|---|---|
| rose | 失败：错误、崩溃、中止、工作丢失 |
| grey | 主题外：宿主、操作者、范围外事项 |
| amber | 生命周期：任务、阶段、状态机 |
| teal | 持久状态：存储、已提交记录 |

其他六种色相 blue、violet、green、plum、olive、indigo，由每本手册各自定义含义。同一手册所有图表中的含义保持一致。

### 线条样式

| 样式 | 虚线数组 |
|---|---|
| 实线 | 无 |
| 虚线 | `5 4` |
| 点线 | `1.5 3.5` |

## 实测对比度

以 `--bg` 为背景，使用 WCAG 2.x 相对亮度公式计算。WCAG AA 要求普通文字 4.5:1，大字 3:1。

| 颜色对 | 浅色 | 深色 |
|---|---|---|
| `--ink` | 16.62 | 15.46 |
| `--ink-soft` | 8.46 | 7.95 |
| `--ink-mute` | 4.11 | 4.41 |
| `--blueprint` | 5.23 | 6.39 |
| `--warn` | 3.08 | 8.72 |
| `--m-ink-mute` | 4.82 | 5.46 |
| `--status-planned` | 1.94 | 未测量 |
| 白字叠加于 `--blueprint` | 5.48 | 未使用 |

根据上表：

- 正文用 `--ink` 或 `--ink-soft`。
- `--ink-mute` 只用于至少 24px 的文字、至少 18.66px 的粗体字，或非文字标记。
- `--warn` 用于标记和标签，同时提供 `--ink` 或 `--ink-soft` 的文字说明。
- `--status-planned` 只用于边框和圆点。
