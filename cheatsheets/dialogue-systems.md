---
id: dialogue-systems
title: 聊天机器人与对话状态跟踪
code: CS
subtitle: 路由对话轮次、运行 agent 循环、跨轮跟踪槽位并规划上下文窗口预算。使用课程中的 Python。
hue: 170
sources: phases/05-nlp-foundations-to-advanced/17-chatbots-rule-to-neural, phases/05-nlp-foundations-to-advanced/29-dialogue-state-tracking, phases/11-llm-engineering/05-context-engineering
source_hash: 60b06933985fed76
---

## 混合路由
type: architecture
from: phases/05-nlp-foundations-to-advanced/17-chatbots-rule-to-neural/docs/zh.md

```arch
node | in | 1,1 | 用户输入 | | client
node | rule | 2,1 | 破坏性操作检查 | 危险词 | process
node | flow | 3,1 | 结构化流程 | 先确认 | process
node | faq | 2,2 | FAQ 检索 | 阈值 0.6 | store
node | agent | 3,2 | LLM agent 循环 | RAG 与工具调用 | model
node | tools | 4,2 | 工具 | 可调用函数 | process
node | out | 4,1 | 回复 | | client
edge | in | rule |
edge | rule | flow | 破坏性操作
edge | rule | faq | 其他情况
edge | faq | out | 匹配
edge | faq | agent | None
edge | agent | tools | tool_call
edge | flow | out |
```

## agent 循环
type: flow
from: phases/05-nlp-foundations-to-advanced/17-chatbots-rule-to-neural/docs/zh.md

1. **开始**：`history` 包含一条用户消息。循环最多运行 `max_steps` 次。
2. **LLM**：`llm(history, tools=tools)` 返回内容或 `tool_call`。
3. **检查**：工具名未知或参数不是字典时，加入错误消息并继续循环。
4. **工具**：运行 `fn(**args)`。调用及结果写入 `history`。
5. **停止**：不含 `tool_call` 的回复就是最终答案。
6. **预算**：达到 `max_steps` 后返回 "I could not complete the task in the step budget."。

## 代码任务
type: task-table
span: 2
from: phases/05-nlp-foundations-to-advanced/17-chatbots-rule-to-neural/docs/zh.md, phases/05-nlp-foundations-to-advanced/29-dialogue-state-tracking/docs/zh.md, phases/11-llm-engineering/05-context-engineering/code/main.py

| 任务 | 代码 |
|---|---|
| FAQ 答案或 `None` | `faq_respond(user_input, threshold=0.5)` |
| 检测破坏性请求 | `is_destructive_action(text)` |
| 带步数预算的 agent | `agent_loop(user_message, tools, llm, max_steps=5)` |
| 评估跟踪器 | `joint_goal_accuracy(predicted_states, gold_states)` |
| 规划窗口预算 | `ContextBudget(max_tokens=128000, generation_reserve=4000)` |
| 加入有上限的组件 | `budget.allocate("tools", tool_text, max_tokens=2000)` |
| 按意图裁剪工具 | `select_tools(query, token_budget=2000)` |
| 将最佳文档放在首尾 | `reorder_lost_in_middle(items, scores)` |

## 基于规则更新状态
type: annotated-code
lang: python
from: phases/05-nlp-foundations-to-advanced/29-dialogue-state-tracking/code/main.py

```python
SLOT_EXTRACTORS = {"cuisine": extract_cuisine, "area": extract_area,
                   "price": extract_price, "people": extract_people}

def update_state(state, utterance):
    new_state = dict(state)                    # 不重置未涉及的槽位
    for slot, extractor in SLOT_EXTRACTORS.items():
        value = extractor(utterance)
        if value is not None:
            new_state[slot] = value            # 更正会覆盖旧值
            continue
        if is_negation(utterance, slot):
            new_state[slot] = None             # “不用管菜系了”
    return new_state
```

## 带 schema 的 LLM 跟踪器
type: annotated-code
lang: python
from: phases/05-nlp-foundations-to-advanced/29-dialogue-state-tracking/docs/zh.md

```python
class RestaurantState(BaseModel):
    cuisine: Optional[Literal["italian", "chinese", "indian", "thai", "any"]] = None
    area: Optional[Literal["north", "south", "east", "west", "center"]] = None
    price: Optional[Literal["cheap", "moderate", "expensive"]] = None
    people: Optional[int] = None
    day: Optional[str] = None                  # 自由文本槽位

def llm_dst(history, llm):
    prompt = f"""...{render(history)}...Output only the JSON state."""
    return llm(prompt, response_model=RestaurantState)  # 每轮返回完整状态
```

## 按查询组装上下文
type: flow
from: phases/11-llm-engineering/05-context-engineering/docs/zh.md, phases/11-llm-engineering/05-context-engineering/code/main.py

1. **系统 prompt**：放在最前。上限为 `max_tokens=1000`。
2. **工具**：先 `classify_intent`，再 `select_tools`。上限为 2000。
3. **检索**：`score_relevance` 丢弃低于阈值的文档。上限为 3000。
4. **重排**：`reorder_lost_in_middle` 将最佳文档放在首尾。
5. **历史**：摘要加近期轮次。上限为 5000。
6. **查询**：放在最后。上限为 500。其余留作生成预算。

## 范式与 DST 术语
type: concepts
from: phases/05-nlp-foundations-to-advanced/17-chatbots-rule-to-neural/docs/zh.md, phases/05-nlp-foundations-to-advanced/29-dialogue-state-tracking/docs/zh.md

- **基于规则**：模式、意图和槽位填充。超出范围就会失败。
- **基于检索**：查找最接近的已存回复。不生成，因此没有幻觉。
- **神经 seq2seq**：流畅，但回复泛化且事实易漂移。
- **LLM agent**：规划、调用工具、观察结果、决定下一步。
- **槽位**：后端所需的命名参数，例如菜系或日期。
- **分类式 DST**：对每个槽位与候选值判断是或否。词表封闭。
- **生成式 DST**：以文本生成槽位值。词表开放，是现代默认方式。
- **JGA**：全部槽位均正确的轮次比例。全对才计分。

## 默认值与数字
type: defaults
from: phases/11-llm-engineering/05-context-engineering/code/main.py, phases/11-llm-engineering/05-context-engineering/docs/zh.md, phases/05-nlp-foundations-to-advanced/17-chatbots-rule-to-neural/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `max_tokens` | 128000 | `ContextBudget` 的窗口大小 |
| `generation_reserve` | 4000 | 为回答保留 2,000-4,000 |
| `max_history_tokens` | 5000 | 超出后总结最早的 2 轮 |
| `token_budget` | 2000 | 一次查询的工具定义预算 |
| 相关性阈值 | 0.05 | 课程正文使用 0.1 |
| token 估算值 | 1.3 | 每个空格分隔单词对应的 token 数 |
| `max_steps` | 5 | agent 步数预算 |
| FAQ `threshold` | 0.5 | 混合路由使用 0.6 |

## 故障排查
type: troubleshooting
from: phases/05-nlp-foundations-to-advanced/17-chatbots-rule-to-neural/docs/zh.md, phases/05-nlp-foundations-to-advanced/29-dialogue-state-tracking/docs/zh.md, phases/11-llm-engineering/05-context-engineering/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| agent 声称执行了未执行的动作 | 自信编造 | 只相信工具成功返回 |
| 输入覆盖系统 prompt | prompt 注入 | 将输入视为不可信，使用 PVE，确认破坏性操作 |
| 反复调用同一工具 | 无限循环 | 设置步数预算，去重工具调用 |
| 最早轮次丢失 | 上下文窗口已满 | 总结或检索旧轮次 |
| 中间的事实被忽略 | 中间信息丢失 | 将关键事实置于首尾 |
| 更正一个槽位却清空其他槽位 | 重置了未涉及的槽位 | 只覆盖被更正的槽位 |
| "Italian" 与 "italian" 不同 | 大小写问题 | 全面归一化 |
| 旧训练数据失效 | 后来新增了槽位 | 对 schema 进行版本管理 |

## 缩写
type: glossary
from: phases/05-nlp-foundations-to-advanced/17-chatbots-rule-to-neural/docs/zh.md, phases/05-nlp-foundations-to-advanced/29-dialogue-state-tracking/docs/zh.md, phases/11-llm-engineering/05-context-engineering/docs/zh.md

- **DST**：对话状态跟踪。跨轮保留槽位值字典。
- **JGA**：联合目标准确率。MultiWOZ 2.4 顶尖系统达到 80-83%。
- **MultiWOZ**：多领域 WOZ 数据集。标准 DST 基准。
- **LDST**：LLaMA 加 LoRA，使用领域-槽位 prompt 做指令调优。
- **TripPy**：使用 BERT 编码的复制式 DST。LLM 出现前的标准方案。
- **PVE**：规划、验证、执行。先按计划检查每个动作。
- **RAG**：检索相关文档，再以文档为依据回复。
- **中间信息丢失**：首尾准确率 85-90%，中间为 60-70%。

## 问答
type: qa
from: phases/05-nlp-foundations-to-advanced/17-chatbots-rule-to-neural/docs/zh.md, phases/05-nlp-foundations-to-advanced/29-dialogue-state-tracking/docs/zh.md, phases/11-llm-engineering/05-context-engineering/docs/zh.md

- **为何要路由，而非只用一个模型？** 没有一种架构能处理好所有请求。
- **为何支付使用规则？** 破坏性操作需要确定且经确认的流程。
- **增量更新还是重新生成？** 根据历史重新生成完整状态。这样能处理更正。
- **重新生成的成本如何？** 总 token 为 $O(n^2)$。限制或总结旧轮次。
- **更大的窗口够用吗？** 不够。精心筛选的 10K 上下文常胜过直接塞入的 100K。

## 提示
type: tips
from: phases/05-nlp-foundations-to-advanced/17-chatbots-rule-to-neural/docs/zh.md, phases/05-nlp-foundations-to-advanced/29-dialogue-state-tracking/docs/zh.md, phases/11-llm-engineering/05-context-engineering/docs/zh.md

- 低于 FAQ 阈值时，返回 `None` 并升级处理。
- 记录 agent 的每一步。测量偏离任务的比例。
- 混合自由文本槽位（姓名、时间）和封闭槽位（菜系、区域）。
- 始终传入完整历史，使早先槽位保持已设置状态。
- 工具裁剪可将工具 token 减少 60-80%。
- 两三个好的少样本示例往往胜过冗长指令。
