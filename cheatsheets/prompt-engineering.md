---
id: prompt-engineering
title: Prompt 工程
subtitle: 编写 prompt、添加样例与推理、投票，并规划上下文窗口预算。使用课程中的 Python 实现。
hue: 230
sources: phases/11-llm-engineering/01-prompt-engineering, phases/11-llm-engineering/02-few-shot-cot, phases/11-llm-engineering/05-context-engineering, phases/11-llm-engineering/15-prompt-caching
code: PE
---

## 窗口中包含什么
type: architecture
from: phases/11-llm-engineering/05-context-engineering/docs/zh.md

```arch
node | sys | 1,1 | 系统 prompt | 约 500 token
node | tools | 2,1 | 工具定义 | 2K 至 8K token
node | ret | 3,1 | 检索上下文 | 2K 至 10K token
node | hist | 4,1 | 对话历史 | 2K 至 20K token
node | shots | 4,2 | 少样例 | 1K 至 3K token
node | query | 3,2 | 用户查询 | 100 至 500 token
node | gen | 2,2 | 生成预算 | 2K 至 8K token
node | win | 1,2 | 上下文窗口 | 输入加输出
edge | sys | tools |
edge | tools | ret |
edge | ret | hist |
edge | hist | shots |
edge | shots | query |
edge | query | gen |
edge | gen | win | 总量
```

## 为每次查询组装上下文
type: flow
from: phases/11-llm-engineering/05-context-engineering/code/main.py, phases/11-llm-engineering/05-context-engineering/docs/zh.md

1. **ContextBudget**：可用 token 为 `max_tokens` 减去 `generation_reserve`。
2. **系统 prompt**：首先分配，最多 1000 token。
3. **select_tools**：`classify_intent` 识别意图，在 2000 token 内保留匹配工具。
4. **score_relevance**：保留词重叠率至少为 0.05 的文档。
5. **reorder_lost_in_middle**：将最佳文档放在两端，最多分配 3000 token。
6. **ConversationManager**：旧轮次摘要加近期轮次，最多 5000 token。
7. **用户查询**：最后分配，最多 500 token。

## 代码任务
type: task-table
from: phases/11-llm-engineering/01-prompt-engineering/code/prompt_engineering.py, phases/11-llm-engineering/02-few-shot-cot/code/advanced_prompting.py, phases/11-llm-engineering/05-context-engineering/code/main.py

| 任务 | 代码 |
|---|---|
| 从模式构建 prompt | `build_prompt("persona", <variables>)` |
| 构建多轮消息列表 | `build_multi_turn(<pattern>, <turns>)` |
| 为输出评分 | `score_response(<text>, <criteria>)` |
| 少样例 CoT prompt | `build_cot_prompt(question, examples, num_examples=3)` |
| 对采样结果多数投票 | `self_consistency_solve(question, examples, client, model, n_samples=5)` |
| 先 CoT，再投票，再 ToT | `solve_with_escalation(question, examples, client, model)` |
| 规划窗口预算 | `ContextBudget(max_tokens=128000, generation_reserve=4000)` |
| 按意图裁剪工具 | `select_tools(query, token_budget=2000)` |

## 自洽性投票
type: annotated-code
lang: python
from: phases/11-llm-engineering/02-few-shot-cot/code/advanced_prompting.py

```python
system, user = build_cot_prompt(question, examples)  # 3 个完整样例
answers = []
for _ in range(n_samples):                       # n_samples=5
    text = call_llm(client, model, system, user, temperature=0.7)
    answer = extract_answer(text)                # 读取 "The answer is <n>"
    if answer is not None:
        answers.append(answer)
vote_counts = Counter(answers)
best_answer = vote_counts.most_common(1)[0][0]   # 多数答案
confidence = vote_counts[best_answer] / len(answers)
if confidence >= 0.8 and single_answer == sc_answer:
    ...                                          # 接受投票
tree_of_thought_solve(question, client, model, breadth=3, depth=2)  # 否则升级
```

## 选择推理技术
type: command-table
from: phases/11-llm-engineering/02-few-shot-cot/docs/zh.md

| 方法 | 作用 |
|---|---|
| 零样本 | 简单任务，1 次调用，无额外开销 |
| 少样例 | 格式匹配，额外 200-500 token |
| 零样本 CoT | 添加 "Let's think step by step"，额外 50-200 token |
| 少样例 CoT | 单次调用准确率最佳，额外 300-600 token |
| 自洽性，N=5 | 高风险推理，token 成本 5 倍 |
| 思维树 | 搜索与规划，10-40 次以上调用 |
| ReAct | 有知识依据的推理，3-10 次以上调用 |
| Prompt 链 | 复杂多步任务，2-5 次调用 |

## Prompt 结构与模式
type: concepts
from: phases/11-llm-engineering/01-prompt-engineering/docs/zh.md, phases/11-llm-engineering/05-context-engineering/docs/zh.md

- **系统消息**：身份、规则与约束，跨轮次保留。
- **用户消息**：当前任务，每轮变化。
- **助手预填充**：用 `{` 等部分响应确定输出格式。
- **角色**：具体角色缩小输出分布。
- **约束**：否定式“不要”、肯定式“始终”、条件式“若 X 则 Y”。
- **分隔符**：以 `<analysis>` 等 XML 标签隔开各部分。
- **清晰性**：说明格式、长度、受众、包含与排除内容，并给一个样例。
- **中间遗忘**：首尾准确率为 85-90%，中间降至 60-70%。

## 默认值与数值
type: defaults
from: phases/11-llm-engineering/01-prompt-engineering/docs/zh.md, phases/11-llm-engineering/02-few-shot-cot/docs/zh.md, phases/11-llm-engineering/02-few-shot-cot/code/advanced_prompting.py, phases/11-llm-engineering/05-context-engineering/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| 提取与代码任务的温度 | 0.0 | Top-p 1.0，也用于 prompt 测试 |
| 摘要任务的温度 | 0.3 | Top-p 0.9 |
| 通用问答温度 | 0.7 | Top-p 0.95 |
| 少样例数量 | 3-5 | 标签多时每个标签一个样例 |
| `n_samples` | 5 | 温度 0.7，N=3 是最小投票规模 |
| 接受投票的置信度 | 0.8 | 低于此值则升级为思维树 |
| `generation_reserve` | 4000 | 为答案保留的 token |
| 系统 prompt 大小 | 少于 500 token | 适用于多数任务 |

## 故障排查
type: troubleshooting
from: phases/11-llm-engineering/01-prompt-engineering/docs/zh.md, phases/11-llm-engineering/02-few-shot-cot/docs/zh.md, phases/11-llm-engineering/05-context-engineering/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 输出空泛，质量平庸 | 任务模糊，角色笼统 | 明确角色、格式、长度与受众 |
| 自信地胡说 | 角色在训练数据中过于罕见 | 放宽角色定义 |
| 遵守一条规则却丢掉另一条 | 指令相互矛盾 | 审核 prompt 冲突 |
| 任务质量下降 | 规则长达 2,000 词 | 系统 prompt 保持少于 500 token |
| 用户文本覆盖规则 | prompt 注入 | 验证输入、使用分隔符、过滤输出 |
| 所有投票完全相同 | 采样温度为 0.0 | 改用 0.7 采样 |
| 投票无法比较 | 缺少固定答案格式 | 要求以 "The answer is [number]" 结尾 |
| 关键事实被忽略 | 事实位于长上下文中间 | 放在首尾，或在末尾重复 |

## 缩略语
type: glossary
from: phases/11-llm-engineering/01-prompt-engineering/docs/zh.md, phases/11-llm-engineering/02-few-shot-cot/docs/zh.md, phases/11-llm-engineering/05-context-engineering/docs/zh.md

- **CoT**：思维链，在最终答案前生成推理 token。
- **ToT**：思维树，生成、评分并裁剪推理分支。
- **ReAct**：使用工具的思考、动作、观察循环。
- **自洽性**：温度大于 0 时采样 N 次，再多数投票。
- **Top-p**：核采样，选择累计概率达到 p 的最小 token 集合。
- **少样例**：prompt 中包含 2-10 个输入输出示例。
- **NIAH**：大海捞针，按位置测试长上下文召回能力。

## 问答
type: qa
from: phases/11-llm-engineering/01-prompt-engineering/docs/zh.md, phases/11-llm-engineering/02-few-shot-cot/docs/zh.md

- **CoT 为何有效？** 每个推理 token 都是下一个 token 的上下文，增加了计算深度。
- **CoT 何时有害？** 简单记忆与单步分类，它会多用 50-200 token。
- **推理模型需要 CoT 指令吗？** 不需要，模型内部已经推理，该短语多余。
- **为何先以温度 0 测试？** 可以将 prompt 质量与采样噪声分开。
- **温度与 top-p 一起调吗？** 不要，只调一个，两者的相互作用难以预测。

## 提示
type: tips
from: phases/11-llm-engineering/02-few-shot-cot/docs/zh.md, phases/11-llm-engineering/05-context-engineering/docs/zh.md, phases/11-llm-engineering/15-prompt-caching/docs/zh.md

- 选择与输入相似的样例，覆盖每个标签。
- 关键指令放最前，查询放最后。
- 丢弃低于相关性阈值的检索块，差的检索不如没有检索。
- 只包含当前意图需要的工具，可减少 60-80% 工具 token。
- 历史超过如 5,000 token 的阈值后进行摘要。
- 稳定部分放顶部、变化部分放底部，以利用 prompt 缓存。
