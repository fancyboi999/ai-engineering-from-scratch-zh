# Claude 认证来源核验账本

> 社区材料用于发现教学缺口；只有 Anthropic 官方来源可以决定哪些内容进入事实性课程。

**账本总核验日期：** 2026-08-18

## 来源权威顺序

1. 当前公开考试指南与认证 FAQ 界定考试蓝图、交付方式、评分、报考资格、有效期、价格和重考政策。
2. 当前 Anthropic 产品文档与 Academy 课程目标界定产品机制和建议的学习入口。
3. 社区视频、文章和练习材料可以启发讲解、练习或薄弱点判断，但不能定义考试。
4. 不使用任何来源还原保密试题，也不承诺能够通过考试。

## 已核验的项目事实

- 报名目前仅面向 Claude Partner Network 组织，且需要已获认可的公司域名。
- Pearson 通过在线监考或考试中心提供考试。
- 每场考试时长为 120 分钟；考生应为完整预约预留约 135 分钟。
- 通过标准为 100 至 1,000 分量表中的 720 分，不是原始百分比的换算结果。
- 证书有效期为 12 个月。
- 考试为闭卷；不得使用文档、笔记、AI 助手或浏览器翻译工具。
- 重考等待期依次为 14 天、30 天和 90 天；任一滚动 12 个月内，每门考试最多尝试四次。
- 先前的官方模拟考试已下线；当前考试指南包含示例题。
- 当前标价分别为：Associate Foundations $99、Developer Foundations $125、Architect Foundations $125，以及 Architect Professional $175。
- Architect Foundations 不是 Architect Professional 的前置条件，也不会自动升级为后者。

来源：[官方认证 FAQ](https://anthropic-partners.skilljar.com/page/faq-certifications)、
[官方备考课程索引](https://anthropic-partners.skilljar.com/page/claude-certification-exam-prep-courses)、
[CCAO-F 指南](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542847%2FClaude+Certified+Associate+%E2%80%93+Foundations+Exam+Guide.pdf)、
[CCDV-F 指南](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542875%2FClaude+Certified+Developer+%E2%80%93+Foundations+Exam+Guide.pdf)、
[CCAR-F 指南](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf)，以及
[CCAR-P 指南](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542810%2FClaude+Certified+Architect+%E2%80%93+Professional+Exam+Guide.pdf)。

## 社区说法的处置结论

### 考生文章

随附的考生复盘可用于安排精确机制和场景判断的学习优先级。其中公布的考试用时、分数、课程完成时间估算、考试难度排序、建议报考顺序和回忆中的题型构成，均仍属于第一手个人经验。

以下两项说法不得写成官方课程事实：

- 考试并非仅可在线参加；Pearson 也提供考试中心交付。
- 已发布的 CCAR-P 规范列出多项选择题和多项响应题。一位考生观察到的匹配或下拉界面，不构成第三种官方题型。

### 练习 PDF

提供的 60 题 Associate 练习包遵循公开的七个领域权重，其答案键可作合理辩护。它仍是独立练习来源，课程不会复制其中任何试题措辞。

以下三点警示会影响本课程自身的讲解：

- 内部笔记工作流必须说明内容不敏感，且已获组织政策批准。
- 项目知识是可检索的上下文，并不会自动成为事实；其中的主张仍需验证。
- 75% 的练习目标只是学习启发，不能换算成官方分量表分数。

### 视频与播放列表

逐来源的完整处置记录维护在
[`youtube-source-review.md`](youtube-source-review.md)。在审计范围内，可长期采用的信号包括实际构建、精确机制查找、场景权衡、错误诊断和重复复习。个人分数、学习时长、目录数量、产品排名、回忆试题和保证出现的主题，均不作为事实性输入。

Academy 排名视频将第四项 AI Fluency 能力误称为“Dialogue”。Anthropic 的官方框架使用 **Diligence**。本课程教授 Delegation、Description、Discernment 和 Diligence。

## 产品机制的漂移控制

- 将 stdio 和 Streamable HTTP 视为当前 MCP 传输方式；若为提供历史背景而提及旧版 HTTP+SSE，应标注其已弃用。
- 需要机器契约时，优先采用原生结构化输出或严格的工具 schema，而非仅靠提示词约束 JSON。
- 通过带日期的决策过程讲授速度、effort、thinking 和模型选择，而非维护一张永久有效的兼容性表。
- 发布前必须根据当前文档核验 Claude Code 的准确 flags、paths、settings precedence、hooks，以及 Agent SDK lifecycle fields。
- 将直连 Claude、Amazon Bedrock、Google Vertex AI 和 Microsoft Foundry 作为部署选择；其适配性取决于采购、身份、合规、云承诺、运维控制和成本。

## 发布规则

课程发布前，重新核对 FAQ、四份考试指南、官方课程目标，以及每节课引用的每一项精确产品机制。仅社区来源的变化，绝不能成为修改考试蓝图、分数、报考资格规则或评估形式的依据。
