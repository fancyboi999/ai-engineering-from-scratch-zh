# 项目扩展的本地验证

> 以下为上游 2026-10-09 历史验证记录的完整中文译文，不是本次中文同步的 fresh 验证结果。中文整合后的全量门禁和浏览器验收需另行执行。

2026-10-09 在 macOS arm64 上验证，使用 Python 3.12.14、Node 25.6.1、Go 1.26.0 和 Rust 1.95.0。下述输入均为自编 fixture 或独立本地测试输入，不需要模型凭据。

[2026-09-29 验证快照](validation/2026-09-29.md)保留较早的目录、可选 SDK 和集成证据。这些历史检查与下述结果分开。

## 范围与结果

初始目录有 48 个就绪项目和 52 项计划。这次变更实现其中 26 项，恰好一半，另增敏感文本脱敏门禁和数据集契约门禁。结果为 **76 个就绪项目、26 项计划，共 102 项**。

- 全量严格核心评分通过全部 76 项目和 308 阶段，2,049 测试、无跳过。随后术语布局回归新增一个测试，定向 25 测试运行通过。当前覆盖 **2,050 个通过测试**，包括 **112 个新阶段的 668 个测试**。
- 全部 28 项新增项目通过文档化 CLI／演示、独立自备输入场景及导出产物消费者。全新第一阶段初始代码按预期失败。48 个既有标准演示也在隔离副本上用其 fixture 成功退出。
- 全部 112 个新阶段图在构建后的课程站点挂载，输入变化时改变计算输出。
- 23 个生成浏览器界面的新增项目在本地服务，于 1280×800、390×844、浅色与深色主题检查，演练控件及适用下载。另五个生成 CLI／JSON 产物，直接执行并消费。
- 项目数据、证书、图表运行时和既有图表测试通过，共 62 测试。项目复制测试通过，共 3 测试。严格项目构建、课程构建、课程审计、认证审计及 README 计数检查通过。

每项目 `media/` 包含录制的初始化／评分和输出 GIF、PNG 海报及录制回执。浏览器输出录制捕获生成界面，纯 CLI 项目捕获命令输出。终端录制中的机器特定仓库和 Python 路径已规范化，录制结果及耗时保留。

## 人工场景

两个额外项目是数据集契约门禁和敏感文本脱敏门禁。其余各行完成既有路线图条目。下列测试总数计入最近通过的阶段运行。

| 项目 | 语言 | 测试数 | 本地场景及消费者证据 |
|---|---|---:|---|
| [API 教程运行器](api-tutorial-runner/) | TypeScript | 24 | 运行真实 loopback HTTP，产生 pass/fail/skip，接受浏览器修正，再重放修正后的自备教程输入，三步全通过。 |
| [书签路径整理器](bookmark-path-organizer/) | TypeScript | 24 | 导入独立嵌套书签，重排浏览器阅读路径，保存阅读进度，在新 CLI 运行中消费该 JSON。 |
| [目录记录关联器](catalog-record-linker/) | Python | 20 | 解决标题／年份冲突，保留未匹配记录，将三行交叉映射消费成两个保留来源的实体。 |
| [图表故事板构建器](chart-storyboard-builder/) | Python | 20 | 保留缺失月份和负值，将 SVG 解析为 XML，并从导出规范重建两张图。移动图表在滚动区域保留可读标签。 |
| [社区学习路径查找器](community-learning-path-finder/) | Python | 20 | 在预算内选前置路线，暴露缺失前置项目，重新导入完成记录以减少剩余时间。 |
| [配置漂移解释器](configuration-drift-explainer/) | Go | 21 | 经 CLI 运行分层配置，消费漂移报告，检查优先级、缺值和脱敏导出。 |
| [CSV 修复工作台](csv-repair-workbench/) | Python | 20 | 规范化独立标签，审阅有歧义日期，解析清洗后 CSV，在第二张表重放导出配方。 |
| [数据库迁移演练](database-migration-rehearsal/) | Python | 20 | 验证源数据库字节完全未变；可逆索引变更通过，等行数内容损坏失败。 |
| [数据集契约门禁](dataset-contract-gate/) | Python | 27 | 提供整数域含布尔值和重复 ID 的独立行。CLI 退出 1；独立消费者找到一行接受、三行隔离。 |
| [决策权衡探索器](decision-tradeoff-explorer/) | TypeScript | 28 | 改浏览器权重，导出选中场景并消费 JSON。极端有限权重及以原型名命名的准则 ID 有回归覆盖。 |
| [图解阅读助手](diagram-reading-companion/) | TypeScript | 25 | 导航 SVG 节点，编辑解释，批准顺序，重新导入浏览器导出。检查自备 SVG 控件名冲突。 |
| [下载目录整理台](download-folder-sort-desk/) | Python | 21 | 嵌套、大小写冲突名称获得唯一目标。重复字节保持明确；源字节变更使旧批准失效。 |
| [田野笔记地图构建器](field-notes-map-builder/) | TypeScript | 24 | 用距离证据给独立国际日期变更线坐标分组，审阅浏览器组，消费 GeoJSON 而不丢观察记录。 |
| [术语悬浮卡发布器](glossary-hovercard-publisher/) | TypeScript | 25 | 发布独立术语表，打开行内定义控件，解析导出术语 JSON。行内标注保留有效段落与强调结构。 |
| [对冲请求实验](hedged-request-lab/) | Go | 21 | 对真实 loopback 端点运行基线和延迟重复 GET；独立消费延迟和服务工作回执，包括取消后工作。 |
| [基础设施计划解释器](infrastructure-plan-explainer/) | Python | 20 | 解析嵌套模块和实例引用，保留未知端点，确认导出不含密钥和原始变量。 |
| [Kubernetes 事件故事板](kubernetes-event-storyboard/) | Go, TypeScript | 27 | 按 UID 关联自编 Event／工作负载快照，保留版本不确定性，在浏览器筛 Warning 事件，消费脱敏上下文 JSON。 |
| [日志量缩减实验](log-volume-reduction-lab/) | Rust, Python | 29 | 对给定日志运行编译后的 Rust 缩减器，在 Python 消费其输出，检查保留错误证据及字节／数量核算。 |
| [通俗语言改写台](plain-language-rewrite-desk/) | TypeScript | 24 | 接受一个浏览器提案，保留另一原段落，重新导入决定，消费保留已记录事实的 Markdown。 |
| [重试风暴实验](retry-storm-lab/) | Go, TypeScript | 26 | 演练确定性重放和真实 loopback HTTP。共享重试预算将 20 客户端限制在 32 次总调用；独立 CLI 策略展示不同恢复／负载权衡。 |
| [敏感文本脱敏门禁](sensitive-text-redaction-gate/) | Python | 30 | 使用含邮件、带标点 IPv4、字面量和 Unicode 的独立 JSONL。移除三段；JSONL 和回执消费者在 HTML 中找不到原匹配。 |
| [服务归属导航器](service-ownership-navigator/) | TypeScript | 24 | 查询独立路径，展示归属冲突证据，筛选浏览器目录，解析下载的交接包。 |
| [签名 Webhook 收件箱](signed-webhook-inbox/) | Go | 26 | 用独立 Python HMAC 生产者访问接收器，重启进程，验证重复／冲突投递行为，消费一条重放回执。标准演示也通过两次。 |
| [流式答案恢复](streaming-answer-recovery/) | TypeScript, Go | 32 | 将中断浏览器流从 Caf 恢复为 Café，接受四个事件，在 Node 重放下载追踪，检查显式取消。 |
| [字幕本地化台](subtitle-localization-desk/) | Python | 22 | 批准前不导出 WebVTT，应用已审阅译文，往返保留 cue ID／时间／设置。拒绝仅空白的 cue 块注入。 |
| [UI 字符串本地化工作台](ui-string-localization-workbench/) | TypeScript | 24 | 改预览变量，批准一个有效提案，拒绝占位符不匹配，将浏览器导出重新导入成单键 locale 目录。 |
| [词汇自动补全板](vocabulary-autocomplete-pad/) | TypeScript | 24 | 接受真实浏览器建议，导出模型，在另一 CLI 输入中复用。独立文本检查 token／历史行为。 |
| [工作坊材料规划器](workshop-materials-planner/) | Python | 20 | 验证英寸到厘米换算及 23.80 cm 缺口，保留未知换算。导出浏览器参与者变化并经 CLI 消费。 |

## 复现检查

在仓库根目录，安装文档化语言工具链后：

```bash
python3 scripts/project_test.py --all --solution --strict --report project-results.json
node --test site/test_projects_data.js site/test_project_certificates.js site/test_project_figure_runtime.js site/test_dataset_project_figures.js site/test_budget_project_figures.js
node --test site/test_project_copy.js
node site/build.js
node site/build-projects.js --strict
python3 scripts/audit_lessons.py
python3 scripts/audit_certifications.py
python3 scripts/check_readme_counts.py
```

每项目 README 给出自备输入命令和输出文件名。浏览器检查时通过 localhost 服务生成 HTML。HTTP／SSE／webhook fixture 需要 loopback 监听权限。根评分器默认不启用可选框架对照，只有请求时才启用。

## 限制

这些检查确立本地核心行为，不确立 Windows 兼容性、远程 CI 状态、实时模型 provider 行为、真实 Kubernetes 集群集成或生产容量。耗时结果描述受控本地 fixture。webhook 签名和数据集契约格式是明确自编的教学契约，不宣称 provider 或行业规范兼容。脱敏器只覆盖文档化模式和字面量。

参考解报告不能取得学习者证书。本地验证与公开部署分开：合并前检查 PR 检查和预览。
