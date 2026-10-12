# 项目

从零构建有用的 AI 工程工具，一次完成一个经过测试的阶段。目录覆盖 Python、Rust、TypeScript 和 Go，共有 102 个项目：76 个就绪项目，26 个见[路线图](ROADMAP.md)。

每个就绪项目都有可运行参考实现、学习者初始代码、累计阶段测试、机制图、讲解和运行／输出 GIF。核心测试使用本地 fixture，不需要模型凭据。可选框架对照使用真实 SDK 与确定性假模型。规划项目只有拟定目标和学习里程碑，实现和完成测试尚待编写。

## 开始

```bash
python3 scripts/project_test.py semantic-notes-search --list
python3 scripts/project_test.py semantic-notes-search --init my-semantic-notes-search
python3 scripts/project_test.py semantic-notes-search --stage 1 --path my-semantic-notes-search
```

使用 Python 3.12+，TypeScript 使用 Node 22.18+，Rust 使用 edition 2021 的 rustc，Go 使用 1.23+。只安装项目语言徽章要求的工具链。参考解是教师产物：

```bash
python3 scripts/project_test.py research-report-agent --all --solution --strict
python3 scripts/project_test.py --all --solution --strict --report project-results.json
```

站点用 `node site/build-projects.js --strict` 构建。它打包项目课程和录制内容用于静态托管，预览分支不依赖 GitHub main 上尚未发布的文件。

## 与 agent 一起学习

在 Claude Code 中使用 `/build-project <id>`。在 Codex 或其他兼容宿主中，请它对所选项目使用 `build-project` 技能。导师一次教一个阶段：预测、构建、测试、反思。学习笔记保存在你自己的 `PROJECTS-LEARNING.md`。

## 完成证据

```bash
python3 scripts/project_test.py semantic-notes-search --all --strict --path my-semantic-notes-search --report completion.json
```

在项目页面导入 `completion.json`，输入姓名，下载可打印 HTML 证书。每阶段必须通过非零数量测试，没有跳过项。参考解、部分运行和过期清单不能取得资格。证书是本地自报的社区课程记录，不是监考证书或厂商资质。可选 SDK 验证与核心完成分开。

## 就绪目录

| 项目 | 级别 | 语言 | 阶段数 | 预计时间 |
|---|---|---|---|---|
| [书签路径整理器](bookmark-path-organizer/) | 1 | TypeScript | 4 | 约 8 小时 |
| [CSV 修复工作台](csv-repair-workbench/) | 1 | Python | 4 | 约 8 小时 |
| [数据集划分审计器](dataset-split-auditor/) | 1 | Python | 4 | 约 8 小时 |
| [下载目录整理台](download-folder-sort-desk/) | 1 | Python | 4 | 约 8 小时 |
| [术语悬浮卡发布器](glossary-hovercard-publisher/) | 1 | TypeScript | 4 | 约 8 小时 |
| [JSON Schema 输出守卫](json-schema-output-guard/) | 1 | TypeScript | 4 | 约 8 小时 |
| [prompt 回归测试器](prompt-regression-tester/) | 1 | Python | 4 | 约 8 小时 |
| [语义笔记搜索](semantic-notes-search/) | 1 | Python | 4 | 约 8 小时 |
| [SKILL.md 校验与加载器](skill-validator/) | 1 | Rust | 4 | 约 8 小时 |
| [微型编码 agent](tiny-coding-agent/) | 1 | Python | 4 | 约 8 小时 |
| [token 计数与成本表](token-counter-and-cost-meter/) | 1 | Rust | 4 | 约 8 小时 |
| [词汇自动补全板](vocabulary-autocomplete-pad/) | 1 | TypeScript | 4 | 约 8 小时 |
| [API 教程运行器](api-tutorial-runner/) | 2 | TypeScript | 4 | 约 8 小时 |
| [日历专注规划器](calendar-focus-planner/) | 2 | TypeScript | 4 | 约 8 小时 |
| [目录记录关联器](catalog-record-linker/) | 2 | Python | 4 | 约 8 小时 |
| [Git 变更日志编写器](changelog-writer-from-git/) | 2 | Go | 4 | 约 8 小时 |
| [图表故事板构建器](chart-storyboard-builder/) | 2 | Python | 4 | 约 8 小时 |
| [配置漂移解释器](configuration-drift-explainer/) | 2 | Go | 4 | 约 8 小时 |
| [CSV 问答工作台](csv-sql-question-workbench/) | 2 | Python | 4 | 约 8 小时 |
| [数据集契约门禁](dataset-contract-gate/) | 2 | Python | 4 | 约 8 小时 |
| [图解阅读助手](diagram-reading-companion/) | 2 | TypeScript | 4 | 约 8 小时 |
| [文档提取审阅台](document-extraction-desk/) | 2 | Python | 4 | 约 8 小时 |
| [带引用的 LangChain 文档问答](doc-qa-with-citations/) | 2 | Python | 4 | 约 8 小时 |
| [反馈主题板](feedback-theme-board/) | 2 | TypeScript | 4 | 约 8 小时 |
| [田野笔记地图构建器](field-notes-map-builder/) | 2 | TypeScript | 4 | 约 8 小时 |
| [收件箱分诊台](inbox-triage-desk/) | 2 | Python | 4 | 约 8 小时 |
| [事故复盘编写器](postmortem-writer/) | 2 | Go | 4 | 约 8 小时 |
| [基础设施计划解释器](infrastructure-plan-explainer/) | 2 | Python | 4 | 约 8 小时 |
| [本地模型评估框架](local-model-eval-harness/) | 2 | Python | 4 | 约 8 小时 |
| [日志量缩减实验](log-volume-reduction-lab/) | 2 | Rust, Python | 4 | 约 8 小时 |
| [会议纪要转行动](meeting-notes-to-actions/) | 2 | Python | 4 | 约 8 小时 |
| [通俗语言改写台](plain-language-rewrite-desk/) | 2 | TypeScript | 4 | 约 8 小时 |
| [PR 评审报告器](pr-review-reporter/) | 2 | Python, TypeScript | 4 | 约 8 小时 |
| [研究报告 agent](research-report-agent/) | 2 | Rust, Python, TypeScript | 7 | 约 20 小时 |
| [检索评估实验](retrieval-evaluation-lab/) | 2 | Python | 4 | 约 8 小时 |
| [敏感文本脱敏门禁](sensitive-text-redaction-gate/) | 2 | Python | 4 | 约 8 小时 |
| [服务归属导航器](service-ownership-navigator/) | 2 | TypeScript | 4 | 约 8 小时 |
| [技能路由器](skill-router/) | 2 | TypeScript | 4 | 约 8 小时 |
| [基于来源的学习教练](source-grounded-study-coach/) | 2 | TypeScript | 4 | 约 8 小时 |
| [字幕本地化台](subtitle-localization-desk/) | 2 | Python | 4 | 约 8 小时 |
| [UI 字符串本地化工作台](ui-string-localization-workbench/) | 2 | TypeScript | 4 | 约 8 小时 |
| [工作坊材料规划器](workshop-materials-planner/) | 2 | Python | 4 | 约 8 小时 |
| [agent 预算规划器](agent-budget-planner/) | 3 | Python | 4 | 约 8 小时 |
| [agent 追踪调试器](agent-trace-debugger/) | 3 | TypeScript | 4 | 约 8 小时 |
| [社区学习路径查找器](community-learning-path-finder/) | 3 | Python | 4 | 约 8 小时 |
| [跨 agent 技能安装器](skill-installer/) | 3 | TypeScript | 4 | 约 8 小时 |
| [数据库迁移演练](database-migration-rehearsal/) | 3 | Python | 4 | 约 8 小时 |
| [决策权衡探索器](decision-tradeoff-explorer/) | 3 | TypeScript | 4 | 约 8 小时 |
| [Harness Bench](harness-bench/) | 3 | Go | 4 | 约 8 小时 |
| [Kubernetes 事件故事板](kubernetes-event-storyboard/) | 3 | Go, TypeScript | 4 | 约 8 小时 |
| [带回退的 LLM 网关](llm-gateway-with-fallbacks/) | 3 | Go | 4 | 约 8 小时 |
| [多 agent 代码评审面板](multi-agent-code-review-panel/) | 3 | TypeScript | 4 | 约 8 小时 |
| [持久记忆服务器](memory-server/) | 3 | TypeScript, Rust | 4 | 约 8 小时 |
| [RAG 新鲜度流水线](rag-freshness-pipeline/) | 3 | Python | 4 | 约 8 小时 |
| [报告评判器](report-judge/) | 3 | Python | 4 | 约 8 小时 |
| [重试风暴实验](retry-storm-lab/) | 3 | Go, TypeScript | 4 | 约 8 小时 |
| [自纠正工作流钩子](workflow-hooks/) | 3 | TypeScript | 4 | 约 8 小时 |
| [技能供应链扫描器](skill-scanner/) | 3 | Rust | 4 | 约 8 小时 |
| [流式答案恢复](streaming-answer-recovery/) | 3 | TypeScript, Go | 4 | 约 8 小时 |
| [Google ADK 支持 agent](support-agent-with-google-adk/) | 3 | Python | 4 | 约 8 小时 |
| [Mastra 类型化工作流 agent](typed-workflow-agent-with-mastra/) | 3 | TypeScript | 4 | 约 8 小时 |
| [视觉证据库](visual-evidence-library/) | 3 | Python | 4 | 约 8 小时 |
| [语音笔记转录流水线](voice-note-transcriber-pipeline/) | 3 | Python | 4 | 约 8 小时 |
| [网页变更简报](web-change-brief/) | 3 | Go | 4 | 约 8 小时 |
| [AWS Strands 云 agent](cloud-agent-with-aws-strands/) | 4 | Python | 4 | 约 8 小时 |
| [桌面控制后端](desktop-control/) | 4 | Rust | 4 | 约 8 小时 |
| [持久 agent 作业](durable-agent-jobs/) | 4 | Go | 4 | 约 8 小时 |
| [对冲请求实验](hedged-request-lab/) | 4 | Go | 4 | 约 8 小时 |
| [MCP 工具发现工作台](mcp-at-scale/) | 4 | Python, TypeScript | 5 | 约 10 小时 |
| [沙箱策略规划器](sandbox-ladder/) | 4 | Rust | 4 | 约 8 小时 |
| [签名 Webhook 收件箱](signed-webhook-inbox/) | 4 | Go | 4 | 约 8 小时 |
| [Rust 流式 agent shell](rust-agent-shell/) | 4 | Rust | 4 | 约 8 小时 |
| [工具调用防火墙](tool-call-firewall/) | 4 | Rust | 4 | 约 8 小时 |
| [浏览器 agent](browser-agent/) | 5 | TypeScript, Python | 4 | 约 8 小时 |
| [分布式评估农场协调器](distributed-eval-farm/) | 5 | Go | 4 | 约 8 小时 |
| [自改进技能循环](self-improving-skill-loop/) | 5 | Python | 4 | 约 8 小时 |


## 路线图

[26 个规划项目](ROADMAP.md)通过实用应用、数据与多模态工作流、开发工具、DevOps 和 agent 系统扩展全部五个级别。每份简介列明交付物、前置项目、首个演示和四个拟定里程碑。网站将这些卡片标为规划中，不计入已完成阶段或证书。

## 构建自己能用的应用

应用路线包括 CSV 问答工作台、文档提取审阅台、日历专注规划器、反馈主题板、收件箱分诊台、基于来源的学习教练、视觉证据库和网页变更简报。每项接收你自己的输入，导出可审阅产物，如 HTML、JSON、iCalendar 或未发送邮件草稿。

从声明的前置要求开始，运行 fixture，改变一个输入并预测结果。然后在自己的工作区实现各阶段。可编辑机制图展示中间值；通过的测试和明确限制使其他开发者更容易集成产物。受欢迎程度是发布后要测量的结果，不是课程附带的保证。

## 框架对照

文档问答用 LangChain 进行切分和模型接口。支持路由用 Google ADK 执行真实专家交接。云检查项目用 AWS Strands 配合本地模型，云调用保持显式启用。类型化工作流将手写执行器与 Mastra 对照。框架仅用于这些具体工作；标准库实现仍然可见。

四个框架项目均说明依赖设置，并使用 `--optional --strict`。缺模块产生带安装提示的跳过；严格模式失败。假模型测试验证 SDK 集成，不验证实时 provider 行为。

## 范围与证据

[本地验证报告](VALIDATION.md)记录 26 个路线图实现、两个额外项目、人工场景及验证边界。报告保留上游历史证据，不代表中文同步已重新执行那些验证。

公开 fixture 可供审阅，不是秘密。评估分数描述这些 fixture，不能确立生产表现。沙箱项目规划策略，不提供操作系统隔离。桌面控制验证 fixture 后端，原生访问保持明确。浏览器项目除确定性 fixture 外还有真实浏览器 adapter。语音处理包含真实 PCM 分段和 multipart HTTP 识别 adapter；离线语音 fixture 使用明确提供的参考转录。

## 贡献

阅读 [AUTHORING.md](AUTHORING.md) 和 [SUBMITTING.md](SUBMITTING.md)。复制 [_template/](_template/)，编写原创有用产物，添加测试学习者代码的阶段。
