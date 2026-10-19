# 技能 · 从零开始学 AI 工程

规范页面： https://aieng-zh.cn/skills.html

安装全部技能： `npx skills add fancyboi999/ai-engineering-from-scratch-zh`. 安装单个技能时加 `--skill <name>`. 支持 Claude、Cursor、Codex、OpenClaw、Hermes，以及所有能读取 SKILL.md 的 agent。

## 01 开始学习

首次学习这套课程时使用。

### start-learning (v1.0.0)

询问学习目标与可用时间，进行分级测验，并写出供其他技能使用的学习计划。

- 你可以说： "开始学习", "配置课程"
- 写入产物： LEARNING.md
- 安装： `npx skills add fancyboi999/ai-engineering-from-scratch-zh --skill start-learning`
- 源文件： https://github.com/fancyboi999/ai-engineering-from-scratch-zh/blob/main/skills/start-learning/SKILL.md

### find-your-level (v1.0.0)

用简短的自适应测验判断适合的起点，以及可以跳过的课程。

- 你可以说： "测测我的水平", "我该从哪里开始"
- 写入产物： 不写文件，只给出学习起点。
- 安装： `npx skills add fancyboi999/ai-engineering-from-scratch-zh --skill find-your-level`
- 源文件： https://github.com/fancyboi999/ai-engineering-from-scratch-zh/blob/main/skills/find-your-level/SKILL.md

### course-guide (v1.0.0)

提供主题、问题或报错，它会找出相应课程，并给出下一条运行命令。

- 你可以说： "哪节课讲 RAG", "注意力机制这里我卡住了"
- 写入产物： 不写文件，只给出课程链接。
- 安装： `npx skills add fancyboi999/ai-engineering-from-scratch-zh --skill course-guide`
- 源文件： https://github.com/fancyboi999/ai-engineering-from-scratch-zh/blob/main/skills/course-guide/SKILL.md

## 02 学习与练习

每次学习时使用，读取并更新你的计划。

### learn (v1.0.0)

在终端中逐节讲解下一课，提问并记录学习进度。

- 你可以说： "/learn", "教我下一课"
- 写入产物： LEARNING.md
- 安装： `npx skills add fancyboi999/ai-engineering-from-scratch-zh --skill learn`
- 源文件： https://github.com/fancyboi999/ai-engineering-from-scratch-zh/blob/main/skills/learn/SKILL.md

### check-understanding (v1.0.0)

对一个阶段进行测验，指出继续之前需要复习的课程。

- 你可以说： "测验第 3 阶段", "检查我的理解"
- 写入产物： 不写文件，只输出得分与复习建议。
- 安装： `npx skills add fancyboi999/ai-engineering-from-scratch-zh --skill check-understanding`
- 源文件： https://github.com/fancyboi999/ai-engineering-from-scratch-zh/blob/main/skills/check-understanding/SKILL.md

### build-project (v1.0.0)

每次指导一个项目阶段，只给提示。你亲手写代码并运行阶段评分器。

- 你可以说： "做一个项目", "继续我的项目"
- 写入产物： PROJECTS-LEARNING.md
- 安装： `npx skills add fancyboi999/ai-engineering-from-scratch-zh --skill build-project`
- 源文件： https://github.com/fancyboi999/ai-engineering-from-scratch-zh/blob/main/skills/build-project/SKILL.md

## 03 专项路径

围绕一个主题逐课学习。

### learn-mcp (v1.0.0)

沿 Model Context Protocol 路径逐课学习客户端、服务器、传输、安全、网关与一致性。

- 你可以说： "教我 MCP", "继续 MCP 路径"
- 写入产物： MCP-LEARNING.md
- 安装： `npx skills add fancyboi999/ai-engineering-from-scratch-zh --skill learn-mcp`
- 源文件： https://github.com/fancyboi999/ai-engineering-from-scratch-zh/blob/main/skills/learn-mcp/SKILL.md

### learn-agent-skills (v1.0.0)

沿 Agent Skills 路径逐课学习技能的编写、发现、运行、安全、测试、打包与移植。

- 你可以说： "教我 agent 技能", "继续技能路径"
- 写入产物： AGENT-SKILLS-LEARNING.md
- 安装： `npx skills add fancyboi999/ai-engineering-from-scratch-zh --skill learn-agent-skills`
- 源文件： https://github.com/fancyboi999/ai-engineering-from-scratch-zh/blob/main/skills/learn-agent-skills/SKILL.md

### learn-reverse-engineering (v1.0.0)

沿逆向工程路径逐课学习：读取自己编译的程序，解码、提升表示、记录证据，并证明重建结果等价。

- 你可以说： "教我逆向工程", "继续逆向工程路径"
- 写入产物： REVERSE-ENGINEERING-LEARNING.md
- 安装： `npx skills add fancyboi999/ai-engineering-from-scratch-zh --skill learn-reverse-engineering`
- 源文件： https://github.com/fancyboi999/ai-engineering-from-scratch-zh/blob/main/skills/learn-reverse-engineering/SKILL.md

## 04 认证备考

通过课程、实验和限时练习准备考试。

### claude-certification (v1.0.0)

指导四条独立的 Claude 认证备考路线：选择路线、逐课学习、运行实验、参加模拟考试。

- 你可以说： "准备 Claude 认证", "继续我的认证备考"
- 写入产物： CLAUDE-CERTIFICATION.md
- 安装： `npx skills add fancyboi999/ai-engineering-from-scratch-zh --skill claude-certification`
- 源文件： https://github.com/fancyboi999/ai-engineering-from-scratch-zh/blob/main/skills/claude-certification/SKILL.md

### mcpa-certification (v1.0.0)

指导 Model Context Protocol Associate 考试备考，提供课程、实践实验和带反馈的练习题。

- 你可以说： "准备 MCPA", "MCPA 模拟考试"
- 写入产物： MCPA-CERTIFICATION.md
- 安装： `npx skills add fancyboi999/ai-engineering-from-scratch-zh --skill mcpa-certification`
- 源文件： https://github.com/fancyboi999/ai-engineering-from-scratch-zh/blob/main/skills/mcpa-certification/SKILL.md

## 05 制作图表与手册

制作符合本站风格的图表和手册。

### course-style (v1.0.0)

定义明暗主题配色、字体、图表标签和清晰的技术写作规则。本组其他技能会读取它。

- 你可以说： "使用课程风格", "检查这段技术文字是否清楚"
- 写入产物： 不写文件，供其他技能读取。
- 安装： `npx skills add fancyboi999/ai-engineering-from-scratch-zh --skill course-style`
- 源文件： https://github.com/fancyboi999/ai-engineering-from-scratch-zh/blob/main/skills/course-style/SKILL.md

### blueprint-figure (v1.0.0)

为课程、README 和手册制作静态 SVG 图表。提供九种图形、配色规则，以及标签字号和重叠检查。

- 你可以说： "画一张请求路径图", "为本课制作 FIG_012"
- 写入产物： 一个 SVG 文件
- 安装： `npx skills add fancyboi999/ai-engineering-from-scratch-zh --skill blueprint-figure`
- 源文件： https://github.com/fancyboi999/ai-engineering-from-scratch-zh/blob/main/skills/blueprint-figure/SKILL.md

### motion-figure (v1.1.0)

制作动画与交互图表：SVG 动画、滑块组件、带控件和计算结果的图表，以及本页顶部这样的抖色条带。

- 你可以说： "用动画解释这个概念", "展示这个系统如何工作"
- 写入产物： 课程图表、独立图表或抖色条带
- 安装： `npx skills add fancyboi999/ai-engineering-from-scratch-zh --skill motion-figure`
- 源文件： https://github.com/fancyboi999/ai-engineering-from-scratch-zh/blob/main/skills/motion-figure/SKILL.md

### isometric-explainer (v1.0.0)

用交互式等距机器逐步展示流程，由经过测试的状态模型驱动。用控件禁用部件，观察故障如何发生。

- 你可以说： "用机器解释缓存如何淘汰条目", "为本课制作等距交互讲解"
- 写入产物： 独立 HTML 页面及其源文件
- 安装： `npx skills add fancyboi999/ai-engineering-from-scratch-zh --skill isometric-explainer`
- 源文件： https://github.com/fancyboi999/ai-engineering-from-scratch-zh/blob/main/skills/isometric-explainer/SKILL.md

### write-manual (v1.0.0)

围绕一个工具的固定版本编写长篇手册，包含来源、目录、每个示例的离线运行记录、图表与审计。

- 你可以说： "为这个工具编写手册", "开始编写入门手册"
- 写入产物： 手册目录：manual.json、章节、图表、运行记录
- 安装： `npx skills add fancyboi999/ai-engineering-from-scratch-zh --skill write-manual`
- 源文件： https://github.com/fancyboi999/ai-engineering-from-scratch-zh/blob/main/skills/write-manual/SKILL.md

## 06 课程产物

409 个技能与 100 个 prompt 位于 `phases/**/outputs/`。安装命令为 `python3 scripts/install_skills.py <target> --phase <n>` 或 `--tag <tag>`。
