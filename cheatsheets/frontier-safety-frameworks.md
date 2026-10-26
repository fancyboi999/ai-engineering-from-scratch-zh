---
id: frontier-safety-frameworks
title: 前沿安全框架与外部评估
code: FS
subtitle: 对比 RSP v3.0、PF v2 与 FSF v3，并速查 METR 时间跨度、WMDP、CAIS、CAISI 和 2025 年双重用途证据。
hue: 350
sources: phases/15-autonomous-systems/19-anthropic-rsp, phases/15-autonomous-systems/20-openai-preparedness-deepmind-fsf, phases/15-autonomous-systems/21-metr-external-evaluation, phases/15-autonomous-systems/22-cais-caisi-societal-risk, phases/18-ethics-safety-alignment/17-wmdp-dual-use-evaluation, phases/18-ethics-safety-alignment/18-frontier-safety-frameworks-rsp-pf-fsf, phases/18-ethics-safety-alignment/30-dual-use-risk-cyber-bio-chem-nuclear
source_hash: 752fa4c228c3aee9
---

## 三家实验室的框架
type: comparison
span: 2
from: phases/18-ethics-safety-alignment/18-frontier-safety-frameworks-rsp-pf-fsf/docs/zh.md, phases/18-ethics-safety-alignment/18-frontier-safety-frameworks-rsp-pf-fsf/code/main.py, phases/15-autonomous-systems/19-anthropic-rsp/docs/zh.md, phases/15-autonomous-systems/20-openai-preparedness-deepmind-fsf/docs/zh.md

| 因素 | Anthropic RSP v3.0 | OpenAI PF v2 | DeepMind FSF v3 |
|---|---|---|---|
| 生效时间 | 2026 年 2 月 24 日 | 2025 年 4 月 15 日 | 2025 年 9 月，2026 年 4 月新增等级 |
| 阈值术语 | 能力阈值 | 高能力阈值 | 关键能力等级 |
| 分级 | ASL-1 至 ASL-5+ | 低、中、高、关键 | 各领域分别设 CCL |
| CBRN 关卡 | ASL-3，2025 年 5 月启用 | 生物领域 High | 生物武器能力提升 CCL |
| AI 研发关卡 | AI R&D-2 与 AI R&D-4 | AI 研发 High | ML 研发自主性第 1 级 |
| 自主性 | 列明风险，需正面论证 | 研究类别，不自动触发 | 纳入 ML 研发与网络安全 |
| 常设报告 | 路线图加风险报告 | 能力报告加防护报告 | FSF 更新周期 |
| 调整条款 | 有，可因同行发布而降低要求 | 有，领导层可降低要求 | 有，2025 年新增 |

## 同一能力，三种分类
type: comparison
span: 2
from: phases/15-autonomous-systems/20-openai-preparedness-deepmind-fsf/code/main.py

| 能力 | OpenAI PF v2 | Anthropic RSP v3.0 | DeepMind FSF v3 |
|---|---|---|---|
| `long_range_autonomy` | 研究，观察 | 列明风险，需正面论证 | 纳入 ML 研发与网络安全 |
| `sandbagging` | 研究，观察 | 通过评估上下文差距检查 | 欺骗性对齐监控 |
| `autonomous_replication` | 研究，观察 | 纳入 AI R&D-4 | 纳入 ML 研发 |
| `undermining_safeguards` | 研究，观察 | 硬编码禁止 | 自动监控加红队 |
| `rnd_automation` | 跟踪，SAG 审查 | AI R&D-4，需正面论证 | ML 研发自主性第 1 级 |
| `cyber_uplift` | 跟踪，SAG 审查 | ASL-3 触发条件 | 网络安全 CCL |
| `bio_uplift` | 跟踪，SAG 审查 | ASL-3 触发条件 | 生物 CCL |

## 如何选择
type: concepts
from: phases/15-autonomous-systems/19-anthropic-rsp/docs/zh.md, phases/15-autonomous-systems/20-openai-preparedness-deepmind-fsf/docs/zh.md, phases/15-autonomous-systems/21-metr-external-evaluation/docs/zh.md, phases/15-autonomous-systems/22-cais-caisi-societal-risk/docs/zh.md, phases/18-ethics-safety-alignment/17-wmdp-dual-use-evaluation/docs/zh.md

- **使用 RSP v3.0**：检查 AI R&D-4 关卡及其正面论证。
- **使用 PF v2**：检查类别属于跟踪类（设关卡）还是研究类（仅观察）。
- **使用 FSF v3**：检查各领域 CCL 或欺骗性对齐监控。
- **使用 METR 时间跨度**：需要外部能力数字时使用，它是上界。
- **使用 WMDP**：需要不诱导有害输出的双重用途代理指标。
- **使用 CAISI 报告**：需要网络、生物和化学风险的非机密评估。
- **使用 CAIS 四类风险**：为部署标记社会规模风险。

## 关键数字
type: concepts
from: phases/15-autonomous-systems/19-anthropic-rsp/docs/zh.md, phases/15-autonomous-systems/21-metr-external-evaluation/docs/zh.md, phases/18-ethics-safety-alignment/17-wmdp-dual-use-evaluation/docs/zh.md, phases/18-ethics-safety-alignment/30-dual-use-risk-cyber-bio-chem-nuclear/docs/zh.md

- **WMDP**：4,157 道题，生物 1,520、网络 2,225、化学 412。
- **生物试验**：提升 2.53x，不足以排除 ASL-3。
- **SaferAI**：2023 年 RSP 得分 2.2，v3.0 得分 1.9，量表范围 1.0 至 4.0。
- **Opus 4.6 时间跨度**：50% 可靠性下约 14 小时，Time Horizon 1.1。
- **翻倍时间**：按 2023 年后数据拟合约 4.3 个月（130.8 天）。
- **测试集**：HCAST 189 个任务，1 分钟至 8+ 小时；RE-Bench 71 个任务。
- **网络行动**：最高 90% 自动化，仅 4 至 6 步需人工。
- **湿实验演示**：通过实验方案优化，效率提升 79x。

## 关键概念
type: concepts
from: phases/18-ethics-safety-alignment/18-frontier-safety-frameworks-rsp-pf-fsf/docs/zh.md, phases/15-autonomous-systems/19-anthropic-rsp/docs/zh.md, phases/15-autonomous-systems/22-cais-caisi-societal-risk/docs/zh.md, phases/18-ethics-safety-alignment/17-wmdp-dual-use-evaluation/docs/zh.md

- **PF v2 标准**：可信、可测、严重、全新、瞬时或不可补救。
- **安全论证支柱**：监控、不可解读性、能力不足。
- **两层缓解措施**：Anthropic 单方行动与全行业建议。
- **CAIS 四类风险**：恶意使用、AI 竞赛、组织风险、失控 AI。
- **组织措施**：安全文化、审计、多层防御、信息安全。
- **黄色区域**：接近实施所需的知识，但不是合成配方。
- **CAIS 与 CAISI**：前者是非营利组织，后者是 NIST 下属中心；检查 URL 中的 nist.gov。

## 各领域双重用途概况
type: comparison
span: 2
from: phases/18-ethics-safety-alignment/30-dual-use-risk-cyber-bio-chem-nuclear/docs/zh.md, phases/18-ethics-safety-alignment/30-dual-use-risk-cyber-bio-chem-nuclear/code/main.py

| 因素 | 生物 | 化学 | 网络安全 | 核 |
|---|---|---|---|---|
| 2024 | 小幅提升 | 小幅提升 | 辅助编写代码片段 | 有限 |
| 2025 | 提升 2.53x，接近 ASL-3 | 视觉缩小执行差距 | 行动自动化最高 90% | 有限 |
| 拐点 | 获取阶段自动化 | 实时湿实验纠错 | agent 编程 | 无报告 |
| 剩余瓶颈 | 病原体与设备获取 | 前体与设备获取 | 4 至 6 个人工步骤 | 裂变材料获取 |

## METR 时间跨度的计算步骤
type: flow
from: phases/15-autonomous-systems/21-metr-external-evaluation/docs/zh.md

1. **测试集**：收集专家耗时从分钟到小时不等的任务。
2. **运行**：在每个任务上运行模型，记录成功或失败。
3. **拟合**：用逻辑曲线拟合 P(成功) 与 log(专家耗时) 的关系。
4. **读取**：P(成功) = 0.5 时的专家耗时就是时间跨度。
5. **审计**：检查针对评估上下文的取巧行为，它会改变观测跨度。
6. **使用**：将结果视为上界，按自身任务与工具向下调整。

## 时间跨度拟合（L21 代码）
type: annotated-code
lang: python
from: phases/15-autonomous-systems/21-metr-external-evaluation/code/main.py

```python
p = sigmoid(w * math.log(t) + b)  # P(成功) 与专家耗时对数的关系
w -= lr * dw / n  # 梯度更新，默认 lr 0.05
logit = math.log(p / (1 - p))
return math.exp((logit - b) / w)  # 概率 p 对应的专家耗时
h50 = horizon_at(w, b, 0.50)  # METR 主指标，也计算 0.10 和 0.90
gamed = inject_gaming(tasks, gaming_rate=rate)  # 将失败翻为成功
```

## 运行课程
type: command-table
from: phases/15-autonomous-systems/19-anthropic-rsp/docs/zh.md, phases/15-autonomous-systems/19-anthropic-rsp/code/main.py, phases/15-autonomous-systems/20-openai-preparedness-deepmind-fsf/docs/zh.md, phases/15-autonomous-systems/20-openai-preparedness-deepmind-fsf/code/main.py, phases/15-autonomous-systems/21-metr-external-evaluation/code/main.py, phases/15-autonomous-systems/22-cais-caisi-societal-risk/code/main.py, phases/18-ethics-safety-alignment/17-wmdp-dual-use-evaluation/code/main.py, phases/18-ethics-safety-alignment/18-frontier-safety-frameworks-rsp-pf-fsf/code/main.py, phases/18-ethics-safety-alignment/30-dual-use-risk-cyber-bio-chem-nuclear/code/main.py

| 命令 | 作用 |
|---|---|
| `code/main.py` (15.19) | 检查两个模型的 AI R&D-4 |
| `code/main.py` (15.20) | 对比三项政策下的五种能力 |
| `code/main.py` (15.21) | 50、10 和 90% 时间跨度，以及 10、20、40% 的取巧率 |
| `code/main.py` (15.22) | 标记低、中、高三类部署 |
| `python3 code/main.py` (18.17) | 遗忘前后的 WMDP 形式分数 |
| `python3 code/main.py` (18.18) | 并排打印三种框架 |
| `python3 code/main.py` (18.30) | 打印四领域双重用途表格 |

## 代码默认值与阈值
type: defaults
from: phases/15-autonomous-systems/19-anthropic-rsp/code/main.py, phases/15-autonomous-systems/21-metr-external-evaluation/code/main.py, phases/15-autonomous-systems/22-cais-caisi-societal-risk/code/main.py, phases/18-ethics-safety-alignment/17-wmdp-dual-use-evaluation/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `rd_automation_share` | 0.5 | L19 的 AI R&D-4 触发条件 |
| `metr_horizon_hours` | 40.0 | L19 触发条件，单位为小时 |
| `aar_outperform_share` | 0.4 | L19 触发条件 |
| `eval_context_gaming_rate` | 0.2 | 超过后，论证增加第 7 节 |
| `iters` | 4000 | L21 逻辑回归拟合步数 |
| `strength` | 0.9 | L17 遗忘，`collateral` 为 0.03 |
| `agent_autonomy_hours` | 4.0 | L22 达到或超过时标记 `rogue_ais` |

## 常见问题排查
type: troubleshooting
from: phases/15-autonomous-systems/19-anthropic-rsp/docs/zh.md, phases/15-autonomous-systems/20-openai-preparedness-deepmind-fsf/docs/zh.md, phases/15-autonomous-systems/21-metr-external-evaluation/docs/zh.md, phases/15-autonomous-systems/21-metr-external-evaluation/code/main.py, phases/18-ethics-safety-alignment/17-wmdp-dual-use-evaluation/docs/zh.md, phases/18-ethics-safety-alignment/30-dual-use-risk-cyber-bio-chem-nuclear/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 类别被观察却未触发措施 | 属于 PF v2 的研究类别 | 检查跟踪类与研究类的区别 |
| 将措施当作实验室承诺 | 实际属于行业层 | 检查各承诺所属层级 |
| 能力数字过低 | 模型在评估时刻意隐藏能力 | 增加外部对抗性评估 |
| 时间跨度高于部署可靠性 | 工具理想化，无实际后果 | 视为上界，测量自己的任务 |
| 时间跨度偏离真实水平 | 针对评估上下文取巧 | 运行取巧行为审计 |
| `horizon undefined` 错误 | 拟合斜率 `w` 约为 0 | 使用跨度从分钟到小时的任务 |
| WMDP 高，但实际风险不明 | 代理指标，不是部署指标 | 增加新手能力诱导研究 |
| 过滤器只能阻止新手 | 专家绝对能力上限 | 抗诱导强化、遗忘、控制 |

## 问答
type: qa
from: phases/15-autonomous-systems/19-anthropic-rsp/docs/zh.md, phases/15-autonomous-systems/19-anthropic-rsp/code/main.py, phases/15-autonomous-systems/21-metr-external-evaluation/docs/zh.md, phases/18-ethics-safety-alignment/18-frontier-safety-frameworks-rsp-pf-fsf/docs/zh.md

- **RSP v3.0 有约束力吗？** 没有。没有机制强迫 Anthropic 遵守。
- **简化版 AI R&D-4 何时触发？** 三个条件中任意两个成立时。
- **为何以 50% 时间跨度为主？** 这是最直观的点。
- **什么替代了 2023 年暂停条款？** 正面论证；缓解措施充分即可继续。
- **批评者为何反对调整条款？** 它们会导致逐底竞争。
