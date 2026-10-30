---
name: lesson-screen
version: 1.0.0
description: >
  课程导师在终端教学时，在旁边打开浏览器学习屏幕。展示课程已注册的图表、带真实数值的
  代码执行过程和可点击的预测题。也可结合课程与宿主已安装的图表技能，为当前课程制作
  蓝图、机制图、等距机器或 3D 模型。点击以事件形式返回导师。
  触发短语：“打开学习屏幕”、“用图展示”、“用 3D 展示”、“画出架构”、“为这节课制作图表”，
  或 "open the lesson screen", "show me this visually", "show this in 3D",
  "draw the architecture", "visualize this lesson", "build a figure for this lesson", "lesson screen"。
tags: [tutor, visual, figures, 3d, blueprint, interactive-learning]
---

# 学习屏幕

学习屏幕由一个本地 Web 服务器和一个浏览器标签页组成。导师继续在终端教学。每一步写一个屏幕文件，浏览器展示最新文件。学习者可以点击选项和部件；点击记录进入事件日志，导师在下次回复前读取。

适用于 Claude、Cursor、Codex、OpenClaw、Hermes，以及所有能读取 SKILL.md 的 agent。需要 Node.js 20 或更高版本，以及同一台机器上的浏览器。无需安装依赖包。

## 何时使用

- 课程导师正在讲课，学习者接受使用屏幕。导师包括 learn、learn-mcp、learn-agent-skills、learn-reverse-engineering、claude-certification 和 mcpa-certification。
- 学习者要求展示课程、概念或系统，例如“给我看看”“画出来”“用 3D”。
- 概念涉及结构、流动或数值变化，图示比文字更易理解。

## 何时不用

- 学习者已经拒绝本次使用屏幕。本次会话不再提出。
- 学习者无法访问宿主的浏览器页面，例如无终端的聊天应用，或未转发端口的远程机器。提供 aieng-zh.cn 的课程页。具体情况见 `references/hosts.md`。
- 当前步骤只有文字，例如澄清问题、权衡或定义。留在终端讲解，屏幕显示等待状态。
- 需要写入课程文件的永久图表。直接使用图表技能；本技能为单个学习者制作屏幕。

## 路径

`SKILL_ROOT` 是包含本 SKILL.md 的目录。下文的 `CLI` 表示 `node "$SKILL_ROOT/scripts/lesson-screen.mjs"`。

所有命令从学习者的工作目录运行。屏幕存入 `.lesson-screen/screens/`，图表构建存入 `.lesson-screen/builds/`。若工作目录是 Git 仓库，请学习者将 `.lesson-screen/` 加入 `.gitignore`。

## 启动

1. 运行 `CLI start --open`。命令输出一行 JSON，含 `url`、`screens`、`state` 和 `next`。
2. 把含查询字符串的完整 `url` 给学习者。其中的密钥保护页面访问。
3. 随时可以再次运行 `CLI start`。它复用正在运行的服务器，保持端口不变。
4. 启动失败时，用一句话说明，给出课程页链接并继续教学。

有些宿主会在命令返回后终止子进程。这类宿主需要 `--foreground` 和宿主自己的后台命令选项，见 `references/hosts.md`。

## 教学循环

1. 每次回复前运行 `CLI events`，读取自上次调用以来的点击。将点击视为提示。
2. 将下一屏写到 `<screens>/<next>-<slug>.html`。`next` 来自 `start` 或 `CLI status`。
3. 每个屏幕使用新文件名。浏览器显示最新文件。
4. 用一句话告诉学习者屏幕展示了什么，并请其在终端回答。
5. 当前步骤只有文字时，写一个等待屏幕。

用文件工具写屏幕，不通过终端的 `cat` 或 heredoc 输出屏幕内容。

## 每一步展示什么

| 导师步骤 | 屏幕 | 事实来源 |
|---|---|---|
| 问题背景 | 步骤栏和课程问题卡片 | `docs/zh.md` |
| 核心概念 | 课程已注册的图表，设置为正在讲解的示例 | `docs/zh.md` 中的 `figure` 围栏 |
| 动手构建 | 代码执行过程：代码片段、当前行、变量 | 课程代码的真实运行 |
| 实际使用 | 并列展示库调用与从零实现，输出相同 | 课程代码及其输出 |
| 看图理解 | 为这节课制作的图表 | 图表技能、课程正文、真实运行 |
| 预测或测验 | 问题和可点击选项 | `quiz.json`，不含答案 |

`references/screens.md` 列出所有样式类和每种屏幕的完整示例。

## 优先使用已注册图表

许多课程已有交互图表。制作新图表前先检查。

1. 在课程 `docs/zh.md` 中查找语言标记为 `figure` 的代码围栏。
2. 将围栏第一行放入宿主元素：`<div class="lesson-figure" data-figure="kv-cache-sizer"></div>`。
3. 保留围栏中的 JSON 配置，例如 `data-figure='iso-machine {"machine":"kv-cache"}'`。
4. 只使用围栏中已有的配置键调整数值。

屏幕加载中文课程图表运行时并挂载图表，外观和交互与课程页一致。

## 边学边制作图表

为当前课程制作图表，在教学期间完成，使它能在“看图理解”步骤展示。

1. 课程开始时读取 `docs/zh.md`，运行课程代码。
2. 用一句话说明系统：“X 经过 Y，这个运动表示 Z。”
3. 从下表选择一种形式，说明耗时，得到学习者接受后再制作。
4. 写入制作进度屏幕，并随阶段更新。
5. 宿主允许调用第二个 agent 时，将制作交给它，自己继续在终端教学。
6. 没有第二个 agent 时，在实验或测验期间制作，或提出在会话末尾展示。
7. 用 `CLI shot` 检查成品。查看每张图像并修正问题。
8. 运行 `CLI publish <page.html>`，将页面作为下一屏。

| 形式 | 制作方式 | 耗时 | 适用情况 |
|---|---|---|---|
| 蓝图 | blueprint-figure 技能 | 5 到 10 分钟 | 概念是有名称部件组成的结构 |
| 机制图 | motion-figure 技能的第 2 层 | 15 到 25 分钟 | 一个控件改变计算结果 |
| 等距机器 | isometric-explainer 技能 | 40 到 90 分钟 | 概念是有工位、顺序和故障的流程 |
| 3D 模型 | 已安装且支持 3D 的图表技能，或 three.js | 60 到 120 分钟 | 深度或旋转本身承载概念，或学习者要求 3D |

选择能讲清概念的最小形式。学习者有时间并提出要求时，再提供更大的形式。

每次制作前读取 `references/build.md`，其中规定制作阶段、页面契约、制作准则和 3D 要求。

### 图表技能

课程图表技能包括 blueprint-figure、motion-figure、isometric-explainer 和 course-style。未安装时，从 `https://raw.githubusercontent.com/fancyboi999/ai-engineering-from-scratch-zh/main/skills/<name>/` 读取。

选择形式前检查宿主技能列表。若已安装的技能支持更合适的等距插画、WebGL 效果或 3D 模式，可以使用；仍须遵守本技能的事实规则与页面契约。

## 课后练习

`CLI practice <lesson-path>` 将一节课的练习页写为下一屏，包含四部分：

- **概览**：课程摘要、学习目标，以及点击后显示含义的术语卡片。
- **练习**：`quiz.json` 中的问题，数字键 1 到 4 作答，Enter 进入下一题，可选计时。
- **复习**：错题在 1、3、7、16 天后返回。
- **深入学习**：课程页、课程目录、代码运行命令、一项练习和延伸阅读。

遵循以下规则：

- 导师自己的课后测验结束后，才提供练习页。页面包含答案。
- 页面自行评分，进度只留在浏览器。不从这里记录成绩、复习队列或任何证据。
- 优先读取本地克隆；没有克隆时从中文 GitHub 仓库读取。
- 没有 `quiz.json` 时，根据课程的关键术语表生成问题。
- 代码命令只在与课程声明语言匹配的 `code/main.*` 存在时提供。使用其他入口的课程从课程目录查阅运行方式。

## 事实规则

- 数值、标签和步骤说明来自课程正文或真实运行，不编造数字。
- 带运动的自制图表使用经过测试的小型状态模型。模型同时驱动部件和数值显示。
- 学习者作答前，屏幕不放正确答案、答案索引或解析。学习者能查看页面源码。唯一例外是导师测验结束后才提供的练习页。
- 点击只是提示，绝不计作测验答案、检查点证据或实验结果。
- 进度、成绩和证据始终由导师自己的规则决定。
- 每张自制图表注明：由导师为本课制作，未经课程作者审阅。
- 模拟值或缩放值在页面明确标注。

## 事件

`CLI events` 输出 `{"type":"events","events":[...]}`。每个事件含 `type`、`screen`、`at`，以及下列字段。

| type | 字段 | 含义 |
|---|---|---|
| `choice` | `question`、`choice`、`text` | 学习者点击了一个选项 |
| `part` | `part`、`label` | 学习者询问自制图表的某个部件 |
| `step` | `step`、`label` | 学习者切换到自制图表的某个步骤 |
| `note` | `text` | 自定义屏幕中的自由备注 |

`CLI events --all` 输出全部事件，不改变读取位置。

## 停止与保留

- 课程结束时运行 `CLI stop`，除非立即开始下一课。
- 服务器空闲两小时后自动停止。
- 自制页面可从磁盘打开；向导师提问的功能只在服务器中可用。
- 学习者想保留的成品连同源文件复制到 `learning-artifacts/<phase>-<lesson>/`。

## 命令

| 命令 | 作用 |
|---|---|
| `start [--open] [--foreground] [--port N] [--host H] [--url-host H] [--assets live\|local] [--repo PATH] [--idle-minutes N]` | 启动服务器，或复用正在运行的实例 |
| `status` | 输出 `running`、`url`、`screens`、`latest`、`next` 和未读事件数 |
| `events [--all]` | 输出新事件 |
| `publish FILE [--name SLUG]` | 将自制页面复制为下一屏 |
| `practice LESSON [--repo PATH] [--name SLUG]` | 根据课程路径生成下一屏练习页 |
| `shot TARGET [--width N] [--height N] [--theme light\|dark] [--wait MS] [--out FILE] [--chrome PATH]` | 用本地 Chrome、Chromium 或 Edge 截取屏幕或页面 |
| `stop` | 停止服务器 |

所有命令接受 `--dir PATH` 指定其他会话目录，输出一行 JSON。错误以 JSON 写入 stderr，退出码为 1。

屏幕默认从 aieng-zh.cn 加载图表运行时。`--assets local` 从本地克隆的 `site/` 加载。先在该克隆运行 `node site/build.js`。

## 收尾检查

- [ ] 学习者拿到了含密钥的完整 URL，或课程页链接。
- [ ] 每次回复前已读取事件。
- [ ] 每一屏与终端正在讲解的步骤一致。
- [ ] 学习者作答前，屏幕没有答案。
- [ ] 自制图表的所有数字来自课程或真实运行。
- [ ] 发布前已查看 `CLI shot` 的明暗主题截图。
- [ ] 已停止服务器，或说明它仍在运行。
