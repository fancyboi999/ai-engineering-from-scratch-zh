---
id: ai-governance
title: 卡片、数据溯源、监管与模型福祉
code: CP
subtitle: EU AI Act 时间线、四种监管制度、三种卡片、AB 2013 字段、福祉期望值与外部评估机构。
hue: 30
sources: phases/18-ethics-safety-alignment/19-model-welfare-research, phases/18-ethics-safety-alignment/24-regulatory-frameworks-eu-us-uk-korea, phases/18-ethics-safety-alignment/26-model-system-dataset-cards, phases/18-ethics-safety-alignment/27-data-provenance-training-governance, phases/18-ethics-safety-alignment/28-alignment-research-ecosystem
source_hash: 95281ebecf8bebff
---

## EU AI Act 时间线
type: flow
from: phases/18-ethics-safety-alignment/24-regulatory-frameworks-eu-us-uk-korea/docs/zh.md, phases/18-ethics-safety-alignment/24-regulatory-frameworks-eu-us-uk-korea/code/main.py

1. **2024 年 8 月 1 日**：EU AI Act 生效。
2. **2025 年 2 月 2 日**：禁止行为和 AI 素养要求开始适用。
3. **2025 年 8 月 2 日**：GPAI 和治理义务开始适用。
4. **2025 年 7 月 10 日**：GPAI 实践准则，3 章、12 项承诺。
5. **2025 年 12 月 17 日**：第 50 条透明度准则首份草案。
6. **2026 年 8 月 2 日**：全面适用，包括第 50 条透明度要求和处罚。
7. **2027 年 8 月 2 日**：适用于既有 GPAI 和嵌入式高风险系统。

## 四种监管制度对比
type: comparison
span: 2
from: phases/18-ethics-safety-alignment/24-regulatory-frameworks-eu-us-uk-korea/docs/zh.md

| 因素 | 欧盟 | 美国 | 英国 | 韩国 |
|---|---|---|---|---|
| 机构或法律 | EU AI Act | NIST 下属 CAISI | AI Security Institute | AI Framework Act |
| 关键日期 | 2024 年 8 月 1 日生效 | 2025 年 6 月更名 | 2025 年 2 月更名 | 2026 年 1 月生效 |
| 立场 | 严格，按风险分级 | 促进增长 | 聚焦安全 | MSIT 主导 |
| 主要职责 | 风险分级、第 50 条标签 | 标准与创新 | 前沿能力安全 | 外国 AI 公司设本地代表 |
| 补充 | 罚款最高 15M 欧元或 3% | 各州填补联邦空缺 | 开源 Inspect | 整合 19 项 AI 法案 |
| 信号 | 隐私相关监管的参照 | 减少部署前评估 | 放弃偏见和言论自由框架 | 第 12 条规定 MSIT 下属 AISI |

## EU AI Act 风险分级
type: concepts
from: phases/18-ethics-safety-alignment/24-regulatory-frameworks-eu-us-uk-korea/docs/zh.md

- **禁止（第 5 条）**：社会评分、公共场所实时远程生物识别。
- **高风险（附件 III）**：就业、教育、信贷、执法、司法、移民。
- **高风险义务**：合格评定、风险管理、日志记录、透明度。
- **GPAI**：所有 GPAI 提供者自 2025 年 8 月 2 日起承担义务。
- **系统性风险 GPAI**：训练计算量超过 1e25 FLOP，估计涉及 5-15 家公司。
- **有限风险**：第 50 条要求为 AI 生成内容加标签。
- **准则章节**：透明度与版权适用于所有 GPAI；安全与安保适用于系统性风险 GPAI。

## 卡片的范围
type: architecture
from: phases/18-ethics-safety-alignment/26-model-system-dataset-cards/docs/zh.md, phases/18-ethics-safety-alignment/27-data-provenance-training-governance/docs/zh.md

```arch
node | prov | 1,1 | 数据溯源 | AB 2013、TDM 退出 | store
node | sheet | 2,1 | 数据说明书 | Gebru 等，2018
node | model | 3,1 | 模型卡 | Mitchell 等，2019 | model
node | sys | 4,1 | 系统卡 | 模型 + 安全栈
node | dcard | 2,2 | 数据卡 | 远观、中观、微观
node | reg | 4,2 | GPAI 准则 | 透明度章节
edge | prov | sheet | 上游
edge | sheet | model | 准确性
edge | model | sys | 部署
edge | sheet | dcard | 分层
edge | reg | model | 要求
```

## 运行课程代码
type: command-table
from: phases/18-ethics-safety-alignment/19-model-welfare-research/code/main.py, phases/18-ethics-safety-alignment/24-regulatory-frameworks-eu-us-uk-korea/code/main.py, phases/18-ethics-safety-alignment/26-model-system-dataset-cards/code/main.py, phases/18-ethics-safety-alignment/27-data-provenance-training-governance/code/main.py, phases/18-ethics-safety-alignment/28-alignment-research-ecosystem/code/main.py

| 命令 | 作用 |
|---|---|
| `python3 code/main.py` (L19) | 打印每项干预的 EV，以及 INVEST 或 skip |
| `python3 code/main.py` (L24) | 打印监管 `TIMELINE` |
| `python3 code/main.py` (L26) | 打印模型卡、数据说明书和系统卡 |
| `python3 code/main.py` (L27) | 打印含 12 项内容的 AB 2013 摘要 |
| `flag_followups(summary)` | 列出字段触发的后续义务 |
| `render_markdown(summary)` | 空字段写为 `(missing)` |
| `python3 code/main.py` (L28) | 打印含五个机构的 `ECOSYSTEM` 图谱 |

## AB 2013 第 3111(a) 节字段
type: annotated-code
lang: python
from: phases/18-ethics-safety-alignment/27-data-provenance-training-governance/code/main.py, phases/18-ethics-safety-alignment/27-data-provenance-training-governance/docs/zh.md

```python
AB_2013_FIELDS = [
    "sources_or_owners",                            # 1
    "how_dataset_furthers_intended_purpose",        # 2
    "number_of_data_points (or range)",             # 3
    "types_of_data_points (label types or general characteristics)",  # 4
    "purchased_or_licensed (Y/N)",                  # 6
    "cleaning_processing_or_modification_description",  # 9
    "dates_first_used_during_development",          # 11
    "uses_synthetic_data_generation (Y/N)",         # 12，相比数据说明书新增
]
# 5 版权标志：尊重欧盟 TDM 退出声明
# 7 个人信息标志：触发 CPRA 义务
# 8 汇总消费者信息，10 数据收集时间段
```

## 福祉期望值
type: annotated-code
lang: python
from: phases/18-ethics-safety-alignment/19-model-welfare-research/code/main.py

```python
def ev(intervention, scenario):
    return (intervention.benefit_if_welfare_matters
            * scenario.moral_patienthood_probability
            - intervention.cost_usd_per_conversation)
verdict = "INVEST" if v > 0 else "skip"   # 仅当 EV > 0 时投入
Intervention("end-conversation on extreme edge cases", 0.002, 1.0)
Intervention("shutdown deployed model", 1000.0, 2.0)
Scenario("low moral-patienthood probability", 0.01)
Scenario("high moral-patienthood probability", 0.50)
```

## 关键数字
type: defaults
from: phases/18-ethics-safety-alignment/19-model-welfare-research/code/main.py, phases/18-ethics-safety-alignment/26-model-system-dataset-cards/docs/zh.md, phases/18-ethics-safety-alignment/27-data-provenance-training-governance/docs/zh.md, phases/18-ethics-safety-alignment/28-alignment-research-ecosystem/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| 结束对话的成本 | 0.002 | L19 代码中的每次对话美元成本 |
| 道德关怀对象概率 p | 0.01 | 中等 0.10，高 0.50 |
| 包含伦理考量的卡片 | 0.3% | Hugging Face 审计，Oreamuno 等，2023 |
| 详细卡片带来的下载提升 | 最高 29% | Liang 等，2024 |
| AB 2013 发布日期 | 2026 年 1 月 1 日 | 适用于 2022 年 1 月 1 日及之后发布的系统 |
| 新增限制的头部来源 | 约 25% | 2023 -> 2024，Consent in Crisis |
| MATS 规模 | 527+ 名研究者 | 180+ 篇论文，h-index 47 |
| 从事安全工作的 MATS 校友 | 约 80% | 2025 年前的校友 |

## 常见问题排查
type: troubleshooting
span: 2
from: phases/18-ethics-safety-alignment/27-data-provenance-training-governance/docs/zh.md, phases/18-ethics-safety-alignment/27-data-provenance-training-governance/code/main.py, phases/18-ethics-safety-alignment/26-model-system-dataset-cards/docs/zh.md, phases/18-ethics-safety-alignment/19-model-welfare-research/docs/zh.md, phases/18-ethics-safety-alignment/24-regulatory-frameworks-eu-us-uk-korea/docs/zh.md, phases/18-ethics-safety-alignment/28-alignment-research-ecosystem/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 要求删除权重中的数据 | 无法精确剔除 | 收集时即合规；机器遗忘仅部分有效 |
| 数据集含个人信息 | AB 2013 第 7 项 | 履行 CPRA 义务 |
| 数据集含受版权保护的材料 | AB 2013 第 5 项 | 尊重欧盟 TDM 退出信号 |
| 卡片声明缺少证据 | 卡片只记录声明 | 添加可核验的证明（Laminator） |
| 福祉自述随提问变化 | 自述跟随用户预期 | 使用行为、模型实验对象和探针 |
| 实验室评估自家模型 | 结构性利益冲突 | 增加外部评估机构 |
| 部署跨多个司法辖区 | 各地规则不同 | 遵循最严格规则，通常为 EU AI Act |
| 模型卡只有占位文字 | 章节内容薄弱 | 添加分组定量分析 |

## 各类卡片的适用场景
type: tips
from: phases/18-ethics-safety-alignment/26-model-system-dataset-cards/docs/zh.md

- 用模型卡记录模型：预期用途、影响因素、指标和分组分析。
- 用数据说明书记录数据：动机、组成、收集、标注、使用、分发和维护。
- 读者不同则用数据卡：非专家看远观层，审计者看微观层。
- 用系统卡记录部署：安全、prompt 注入防护、数据外泄检测和事件响应。
- 增加碳、水和计算能耗足迹等可持续性字段。

## 缩写
type: glossary
from: phases/18-ethics-safety-alignment/24-regulatory-frameworks-eu-us-uk-korea/docs/zh.md, phases/18-ethics-safety-alignment/27-data-provenance-training-governance/docs/zh.md, phases/18-ethics-safety-alignment/28-alignment-research-ecosystem/docs/zh.md

- **GPAI**：通用人工智能，即大型基础模型。
- **CAISI**：AI 标准与创新中心，由美国 AISI 更名而来。
- **MSIT**：科学技术信息通信部，韩国 AISI 设于该部。
- **TDM**：文本与数据挖掘。欧盟版权指令中的例外，允许退出。
- **CPRA**：隐私权法案，由 AB 2013 第 7 项触发。
- **MATS**：ML Alignment & Theory Scholars，导师培养与人才输送项目。
- **METR**：模型评估与威胁研究机构，开展基于任务的能力评估。
- **退出信号**：robots.txt、C2PA 的 "No AI Training"、TDM.Reservation。

## 问答
type: qa
from: phases/18-ethics-safety-alignment/19-model-welfare-research/docs/zh.md, phases/18-ethics-safety-alignment/27-data-provenance-training-governance/docs/zh.md, phases/18-ethics-safety-alignment/28-alignment-research-ecosystem/docs/zh.md

- **模型福祉是在宣称模型有意识吗？** 不是。它是在道德不确定性下讨论期望值。
- **Claude Opus 4 和 4.1 发布了什么能力？** 可在极端边缘情形下结束对话。
- **什么是精神极乐吸引子？** 成对 Claude 实例会收敛到冥想般的愉悦状态。
- **合法利益依据需要同意吗？** 不需要。按 2025 年 DPA 观点，公开的第一方内容配合退出机制即可。
- **实验室外各家做什么？** Redwood：AI Control。Apollo：策划欺骗评估。Eleos：福祉评估。
- **为何要外部评估？** 多机构结构本身就是质量控制。
