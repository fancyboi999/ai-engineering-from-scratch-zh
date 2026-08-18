# YouTube 来源审阅

> 视频用于讲授过程；官方文档用于界定接口。

**审阅日期：** 2026-08-09

视频用于设计教学顺序、实验构想和讲解，但不作为考试权重、费用、政策、资格条件或当前
API 字段的权威来源。所有视频内容均以公开的 2026 年 7 月考试指南和当前 Anthropic
文档为准。

## 课程锚点

| 来源 | 参考价值 | 有用片段 |
|--------|----------------|-----------------|
| [提示工程 101](https://www.youtube.com/watch?v=ysPbXH0LpIE)，Anthropic | 先分析失败，再施加最小干预的提示设计 | [分隔符：10:10](https://www.youtube.com/watch?v=ysPbXH0LpIE&t=610s)、[少样本提示：13:11](https://www.youtube.com/watch?v=ysPbXH0LpIE&t=791s)、[提示词位置：15:47](https://www.youtube.com/watch?v=ysPbXH0LpIE&t=947s) |
| [面向 Agent 的提示工程](https://www.youtube.com/watch?v=XSZP9GhhuAc)，Anthropic | Agent 边界、工具设计、预算和最终状态评估 | [预算：9:47](https://www.youtube.com/watch?v=XSZP9GhhuAc&t=587s)、[最简基线：15:42](https://www.youtube.com/watch?v=XSZP9GhhuAc&t=942s)、[小规模评估：21:38](https://www.youtube.com/watch?v=XSZP9GhhuAc&t=1298s) |
| [CLAUDE.md 文件](https://www.youtube.com/watch?v=O0FGCxkHM-U)，Claude | 用紧凑的项目说明完成入门引导 | [入门引导：0:40](https://www.youtube.com/watch?v=O0FGCxkHM-U&t=40s)、[补充文档：1:57](https://www.youtube.com/watch?v=O0FGCxkHM-U&t=117s) |
| [Claude Code 中的钩子](https://www.youtube.com/watch?v=IkaPHiMDazM)，Claude | 围绕概率性行为建立确定性控制 | [确定性：0:13](https://www.youtube.com/watch?v=IkaPHiMDazM&t=13s)、[工具调用前拦截：1:50](https://www.youtube.com/watch?v=IkaPHiMDazM&t=110s) |
| [工具、技能，还是子 Agent？](https://www.youtube.com/watch?v=mWvtOHlZM-I)，Claude | 拆解一个已经混入过多关注点的提示词 | [提示词膨胀：1:18](https://www.youtube.com/watch?v=mWvtOHlZM-I&t=78s)、[上下文隔离：3:54](https://www.youtube.com/watch?v=mWvtOHlZM-I&t=234s)、[子 Agent：35:19](https://www.youtube.com/watch?v=mWvtOHlZM-I&t=2119s) |
| [Claude Agent SDK 完整工作坊](https://www.youtube.com/watch?v=TqC1qOfiVcQ)，AI Engineer with Anthropic | Harness、工具、文件、会话、钩子、沙箱和子 Agent | [文件系统：4:47](https://www.youtube.com/watch?v=TqC1qOfiVcQ&t=287s)、[上下文压缩和钩子：5:46](https://www.youtube.com/watch?v=TqC1qOfiVcQ&t=346s)、[沙箱：14:17](https://www.youtube.com/watch?v=TqC1qOfiVcQ&t=857s) |
| [使用 MCP 构建 Agent](https://www.youtube.com/watch?v=kQmXtrmQ5Zg)，AI Engineer with Anthropic | 客户端、服务器、工具、资源、提示词与发现机制 | [客户端职责：4:24](https://www.youtube.com/watch?v=kQmXtrmQ5Zg&t=264s)、[工具发现：52:14](https://www.youtube.com/watch?v=kQmXtrmQ5Zg&t=3134s) |
| [使用 MCP 和 Claude API 构建应用](https://www.youtube.com/watch?v=aZLr962R6Ag)，Anthropic | Claude API 的集成形态 | 完整 25 分钟构建过程，并已对照当前 MCP 文档检查 |
| [构建可持续运行数小时的 Agent](https://www.youtube.com/watch?v=mR-WAvEPRwE)，AI Engineer with Anthropic | 检查点、评估器、工作契约和长周期一致性 | [检查点：10:14](https://www.youtube.com/watch?v=mR-WAvEPRwE&t=614s)、[评估器：19:02](https://www.youtube.com/watch?v=mR-WAvEPRwE&t=1142s) |

## 实践实验来源

- [使用原始 Messages API 构建第一个 Agent](https://www.youtube.com/watch?v=RheXq2HKJmY)
  支撑原始状态机实验：检查 `stop_reason`、保留完整消息历史、匹配工具调用标识符、
  返回工具结果，并在明确的终止条件下停止。
- [钩子、护栏与安全](https://www.youtube.com/watch?v=GGO4tn4RTvY)
  支撑破坏性命令拦截、输出归一化、证据检查和间接提示注入测试夹具。
- [AI 评估完全入门课程](https://www.youtube.com/watch?v=TL527yTpxlk)
  提供了有价值的黄金集和人工标注教学顺序。
- [如何系统化搭建 LLM 评估](https://www.youtube.com/watch?v=a3SMraZWNNs)
  强化了单元检查、人工审阅、模型裁判、A/B 对比，以及“分析—衡量—改进”循环。

## 认证学习补充材料

- [Claude Certified Architect Foundations 完整课程](https://www.youtube.com/watch?v=reDRM0tqhNs)，
  freeCodeCamp 和 ExamPro，提供了广泛的主题清单。它不是本课程的编写范本，
  也不定义考试事实。
- [Claude Certified Architect Foundations 考试复习](https://www.youtube.com/watch?v=n-Jse3TE3MI)，
  Tim Warner，强调应围绕每个公开场景构建项目，而非死记答案。
- 独立的 Associate 和 Professional 课程表明，保持场景连续性并从事件切入教学是有效的。
  本课程以新的场景和表述方式采用这些模式。

## 用户提供的审计材料

这些来源均以社区材料的身份审阅，并已对照当前官方考试指南、认证 FAQ、Academy
课程目标和产品文档核查。

| 来源 | 保留的参考信号 | 不作为事实处理的主张 |
|--------|-------------|---------------------------|
| [freeCodeCamp 和 ExamPro 的 CCAR-F 课程](https://www.youtube.com/watch?v=reDRM0tqhNs) | 以构建为先，串联公开 CCAR-F 场景 | 缺乏当前文档支撑的演示行为、个人建议和产品细节 |
| [Chance Xie 的考试经验](https://www.youtube.com/watch?v=kY9z4hiH4nk) | 动手使用和场景推理比术语记忆更重要 | 分数、准备时间、难度和回忆出的题目模式 |
| [Preporato 学习指南](https://www.youtube.com/watch?v=akzKBQVyFEI) | 实用的学习节奏和错题分类法 | 原始分到通过线的换算、保证性的计划和预测的考试分布 |
| [Ivan Fediaev 的考试拆解](https://www.youtube.com/watch?v=PUnB9b6VIWk) | 检查确切机制和被否决的替代方案 | 个人考试构成、难度排序和回忆出的题目 |
| [freeCodeCamp Claude Code Essentials](https://www.youtube.com/watch?v=brLhhkUqcn4) | 可作为候选的长篇练习补充材料 | 未引入任何事实性主张：本次审计期间无法获取公开字幕 |
| [Peace Of Code 的 22 视频播放列表](https://www.youtube.com/playlist?list=PLviC8AFqAj5A9MHkRIn2fU5Ac2lEdJxNf) | Agent 循环、子 Agent 契约、工具、恢复、上下文和审阅演示 | 过时的 MCP 传输建议、以仅靠提示词的 JSON 替代原生结构化输出，以及考试流程信息 |
| [Tech With Deepanshu 的 Academy 排名](https://www.youtube.com/watch?v=OYyYlH6Un0Y) | 优先学习 API 生命周期、Claude Code 操作、Skills、MCP、子 Agent 和能力边界 | 固定课程数、课程排名、学习时长估算、证书价值，以及高级主题曾出现在考试中的说法 |

该排名视频将目录称作由 18 门课程、五条路线组成的集合，并估计完整学习需 50 到 60
小时。Academy 更新过快，这些数字不能作为课程的不变约束。本仓库将官方课程目标映射到
稳定的课程内容，并改为记录核验日期。

有一处直接纠正会影响教学：视频将第四项 AI Fluency 能力称为“Dialogue”。官方框架是
**Delegation、Description、Discernment 和 Diligence**。本课程采用官方术语。视频旁白在
描述 18 门课程的目录时又称讲者完成了 17 门课程，这也是不应把目录数量保留为要求的
另一理由。

## 标准教学模式

1. 展示一个可信的失败案例。
2. 记录可衡量的基线。
3. 加入一项设计干预。
4. 同时测试最终状态和过程轨迹。
5. 记录被否决的替代方案。
6. 将结果打包为可供他人检查的产物。

安全实验始终包含红队测试夹具。架构实验始终包含独立审阅者。专业实验始终以面向利益
相关方的说明和明确的运营负责人收尾。

## 变动风险提示

- 2025 年 3 月的 MCP 工作坊早于后续的传输、认证、注册表和 SDK 变更。
- 较早的 Claude Code 视频可能保留了有价值的工作流建议，但展示的设置键、权限行为或
  功能名称可能已经过时。
- 独立认证课程可能滞后于蓝图修订。
- 个人考试报告属于学习者轶事，不是规范。
- 课程数量、时长、排名和证书价值的主张只是目录快照或观点，不是稳定的认证要求。
- 任何来源都不能为答题套路、复原题目、题库泄露或保证通过的主张背书。
