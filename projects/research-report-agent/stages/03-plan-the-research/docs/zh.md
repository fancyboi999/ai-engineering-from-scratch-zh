# 规划研究

> 一个问题藏着好几个问题。搜索前先拆分，并让模型可选。

**类型：** Build
**语言：** Python
**阶段：** 3 / 7（core）
**预计时间：** 约 2 小时

## 构建内容

- `report_agent/planner.py`：`plan_research(question, model=None)` 返回含 `Facet` 列表的 `Plan`。每个 facet 有 id、报告标题标签、子问题和关键词。
- `report_agent/model.py`：`Model` 协议、从记录文件回答的 `ReplayModel`，以及可按需要指向任意 chat-completions 兼容端点的 `LiveModel`。

## 为什么重要

“为什么容器是 agent 代码的弱沙箱？”实际上有四个问题：容器是什么、如何工作、在哪些地方失败、什么时候改用别的方案。规划在检索前命名这些独立覆盖要求。每个 facet 后续成为报告章节，因此轨迹能揭示哪个角度缺乏证据。

规划也是模型首次进入项目的地方，带来每个真实 agent 都会遇到的两个工程问题：

1. **测试不得调用实时模型。** 否则会慢、花钱，每次答案还不同。
2. **模型输出是不可信输入。** 回复可能啰嗦、截断或是无效 JSON。流水线必须继续工作。

## 先做规则规划器

默认规划器使用四个模板：

| 标签 | 子问题 | 额外关键词 |
|---|---|---|
| 概述 | {subject} 是什么？ | 无 |
| 工作原理 | {subject} 如何工作？ | works, uses, runs |
| 风险与限制 | {subject} 有哪些风险与限制？ | risk, attack, escape, weakness, cost |
| 使用时机 | 团队应何时使用 {subject}？ | use, teams, tradeoff, overhead |

subject 是去掉开头疑问词的问题。关键词由问题 token 加额外词组成。这很简单、确定，提供了一条可超越的基线。

## 记录与回放

记录文件是包含已记录调用的 JSON 文件：

```json
{"entries": [{"purpose": "plan", "prompt": "You plan research...", "response": "{\"facets\": [...]}"}]}
```

`ReplayModel` 查找 `prompt_key(purpose, prompt)`，即精确 prompt 的 sha256。prompt 改一个字符，查找就会失配并抛出 `CassetteMiss`。严格正是目的：prompt 变化就是实验变化，应有意重新记录。

## 输出错误时回退

```python
try:
    raw = model.complete(build_planner_prompt(question), purpose="plan")
    return Plan(question, parse_model_facets(raw, max_facets), source="model")
except (KeyError, ValueError, TypeError, AttributeError) as error:
    return Plan(question, rule_plan(question), source="rules-fallback", notes=[...])
```

`plan.source` 记录所运行的路径。第 6 阶段轨迹会显示它，让你能统计模型规划被拒绝的频次。

```figure
pj-rra-plan-facets
```

## 沿机制推演

回放键包含 purpose 和精确 prompt 哈希。分开 purpose 避免同一 prompt 意外匹配不同操作。回退也必须记录原因；否则一次绿色通过的运行可能悄悄不再测试模型规划。

## 你的任务

```python
# model.py
class ReplayModel:
    def __init__(self, cassette_path): ...
    def complete(self, prompt, *, purpose) -> str: ...

# planner.py
class Facet:
    def query(self) -> str: ...
def subject_of(question) -> str: ...
def rule_plan(question, max_facets=4) -> list[Facet]: ...
def parse_model_facets(raw, max_facets) -> list[Facet]: ...
def plan_research(question, model=None, max_facets=4) -> Plan: ...
```

`build_planner_prompt` 已写好。不要改它，否则记录文件不再匹配。

## 运行测试

```bash
python3 scripts/project_test.py research-report-agent --stage 3 --path my-report-agent
```

`fixtures/cassettes/planner.json` 包含一个有效的已记录规划，以及一条不是 JSON 的啰嗦回复。规划器必须使用前者，并在后者时回退。

## 预期结果

第 3 阶段通过 9 个 Python 测试，之前所有阶段仍通过。已记录的 denylist 问题返回 `source="model"`、3 个 facet。啰嗦回复和缺少记录文件都产生 `source="rules-fallback"`，并带解释说明。

## 自测

1. 为什么用完整 prompt 的哈希而非问题作为记录文件的键？
2. 模型返回有效 JSON，但 `facets` 列表为空时应怎么办？
3. 生产中你会在哪里记录 `plan.notes`？

## 进一步探索

- 设置 `RRA_LLM_BASE_URL`、`RRA_LLM_MODEL` 和 `RRA_LLM_API_KEY`，向 `plan_research` 传入 `LiveModel()`，将其 facet 与规则规划器比较。
- 编写包装 `LiveModel` 的 `RecordingModel`，把每次调用追加到记录文件，让实时运行成为测试 fixture。

## Orchard 案例推演

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/zh.md)。先完成[第 2 阶段](../../02-extract-snippets/docs/zh.md)。

明确选择规则、已录制记录文件或实时规划器。只有规划调用可选模型；写作仍是排列检索到的源句子。轨迹记录规划使用规则、模型输出还是回退。

```text
--model rules -> 确定性 facet
--model replay --cassette planner.json -> 精确 prompt 查找
无效 facet JSON -> rules-fallback
```

## 构建并检查

记录文件查找中将 prompt 摘要和 purpose 放在一起。构造 facet 前验证响应结构。

在学习者工作区实现本阶段。CLI 辅助程序是提供的适配器，导入你的函数，不以参考方案替代。

```bash
python3 scripts/project_test.py research-report-agent --stage 3 --path learning-artifacts/research-report-agent
```

预测上面的中间状态，再运行本阶段。全新桩实现会失败；参考方案通过不能证明学习者工作区已完成。

## 下一步探查

为什么不应把实时模型失败错误标记为已验证的离线运行？
