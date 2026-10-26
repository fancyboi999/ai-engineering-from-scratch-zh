---
id: context-engineering
title: 上下文工程与 Agent 记忆
code: CE
subtitle: 分配窗口预算、排列上下文、换入换出记忆、融合记忆存储并持久化 agent 状态。
hue: 280
sources: phases/11-llm-engineering/05-context-engineering, phases/14-agent-engineering/07-memory-virtual-context-memgpt, phases/14-agent-engineering/08-memory-blocks-sleep-time-compute, phases/14-agent-engineering/09-hybrid-memory-mem0, phases/14-agent-engineering/34-repo-memory-and-state, projects/memory-server
source_hash: 152e89c10eba15a7
---

## 上下文窗口预算
type: architecture
from: phases/11-llm-engineering/05-context-engineering/docs/zh.md

```arch
node | sys | 1,1 | 系统 prompt | 约 500 个 token，放最前
node | tools | 2,1 | 工具定义 | 约 2K-8K 个 token
node | ret | 3,1 | 检索上下文 | 约 2K-10K 个 token
node | hist | 4,1 | 对话历史 | 约 2K-20K 个 token
node | shots | 1,2 | 少样本示例 | 约 1K-3K 个 token
node | query | 2,2 | 用户查询 | 约 100-500 个 token，放最后
node | gen | 3,2 | 生成预算 | 约 2K-8K 个 token
node | win | 4,2 | 上下文窗口 | 128K 个 token | model
edge | sys | tools |
edge | tools | ret |
edge | ret | hist |
edge | shots | query |
edge | query | gen |
edge | gen | win | 容纳或截断
```

## 关键数值
type: concepts
from: phases/11-llm-engineering/05-context-engineering/docs/zh.md

- **中间遗忘**：文档放在最前或最后时准确率为 85-90%，放在 20 项中的第 10 项时为 60-70%。
- **低效区**：上下文 40-70% 位置的准确率下降 10-20%。
- **精选胜过堆砌**：精选的 10K token 上下文通常胜过堆砌的 100K token 上下文。
- **工具成本**：每个工具 50-200 个 token。50 个工具各 150 个，共 7,500 个 token。
- **工具裁剪**：减少 60-80% 的工具 token。
- **历史**：50 轮各 200 个 token，共 10,000 个 token。
- **摘要**：用 100 个 token 替代原本耗费 2,000 个 token 的 10 轮对话。
- **Token 估计**：`count_tokens` 将单词数乘以 1.3。

## 为每次查询组装上下文
type: flow
from: phases/11-llm-engineering/05-context-engineering/docs/zh.md, phases/11-llm-engineering/05-context-engineering/code/main.py

1. **分类器**：`classify_intent(query)` 统计每种意图的关键词命中数。无命中时返回 `["code"]`。
2. **工具选择器**：`select_tools(query, token_budget=2000)` 保留分类匹配的工具。
3. **检索器**：`score_relevance(query, documents)` 按词汇重叠评分。低于 `threshold` 的文档被排除。
4. **重排**：`reorder_lost_in_middle(items, scores)` 将最佳条目放在首尾。
5. **历史**：历史超限时，`ConversationManager` 总结最早的 2 轮。
6. **预算**：`ContextBudget` 按组件上限和剩余空间截断各组件。

## ContextEngine.assemble 调用
type: annotated-code
lang: python
from: phases/11-llm-engineering/05-context-engineering/code/main.py, phases/11-llm-engineering/05-context-engineering/docs/zh.md

```python
budget = ContextBudget(max_tokens=128000, generation_reserve=4000)
budget.allocate("system_prompt", self.system_prompt, max_tokens=1000)
tools, tool_tokens = select_tools(query, token_budget=2000)
budget.allocate("tools", tool_text, max_tokens=2000)
budget.allocate("retrieved_context", doc_text, max_tokens=3000)
budget.allocate("conversation_history", history_text, max_tokens=5000)
budget.allocate("user_query", query, max_tokens=500)  # 查询放最后
print(budget.report())  # 各组件的 token 数与占比
```

## 记忆工具接口
type: command-table
from: phases/14-agent-engineering/07-memory-virtual-context-memgpt/docs/zh.md, phases/14-agent-engineering/07-memory-virtual-context-memgpt/code/main.py, phases/14-agent-engineering/08-memory-blocks-sleep-time-compute/docs/zh.md

| 命令 | 作用 |
|---|---|
| `core_memory_append(section, text)` | 写入 prompt 中固定保留的区段 |
| `core_memory_replace(section, old, new)` | 编辑固定区段 |
| `archival_memory_insert(text)` | 写入可搜索的外部存储 |
| `archival_memory_search(query, top_k)` | 将事实换入下一轮 |
| `conversation_search(query)` | 搜索历史轮次，包括已移出的轮次 |
| `block_append(label, text)` | 向记忆块追加文本 |
| `block_replace(label, old, new)` | 编辑记忆块 |
| `block_summarize(label)` | 压缩接近上限的记忆块 |

## 记忆设计对比
type: comparison
span: 2
from: phases/14-agent-engineering/07-memory-virtual-context-memgpt/docs/zh.md, phases/14-agent-engineering/08-memory-blocks-sleep-time-compute/docs/zh.md, phases/14-agent-engineering/09-hybrid-memory-mem0/docs/zh.md, phases/14-agent-engineering/34-repo-memory-and-state/docs/zh.md

| 比较项 | MemGPT 双层 | Letta 记忆块 | Mem0 混合 | 仓库记忆 |
|---|---|---|---|---|
| 存储 | 主上下文与归档 | 核心、回忆、归档 | 向量、KV、图 | 受模式约束的 JSON 文件 |
| 写入 | 调用记忆工具 | 块工具与休眠期重写 | `add(text, user_id, metadata)` 写入三种存储 | 校验后原子写入 |
| 读取 | `archival_memory_search` | 核心块留在 prompt 中 | `search(query, user_id)` 融合分数 | 加载并校验 |
| 过时事实 | 整合、失效处理 | 休眠期 agent 标记失效 | 旧边标记失效，不删除 | `schema_version` 拒绝未知文件 |
| 主要风险 | 记忆腐化、投毒 | 块膨胀、静默漂移 | 嵌入漂移、图膨胀 | 部分写入 |
| 使用场景 | 数据大于窗口 | 部分事实必须留在 prompt | 查询混合相似性、查找与关系 | 状态需在对话结束后保留 |

## 代码任务
type: task-table
from: phases/14-agent-engineering/08-memory-blocks-sleep-time-compute/code/main.py, phases/14-agent-engineering/09-hybrid-memory-mem0/code/main.py, phases/14-agent-engineering/34-repo-memory-and-state/code/main.py, phases/14-agent-engineering/34-repo-memory-and-state/docs/zh.md

| 任务 | 代码 |
|---|---|
| 创建记忆块 | `create(label, description, limit=300)` |
| 检查块是否需要摘要 | `block.near_limit()` |
| 在关键路径外整合 | `sleep.run(contradictions=[...])` |
| 软删除过时事实 | `self.archival.invalidate(record.rid)` |
| 写入三种存储 | `mem.add(text, user_id=..., kv_triples=...)` |
| 融合且限定作用域的搜索 | `mem.search(query, user_id=..., top_k=3)` |
| 安全持久化状态 | `atomic_write(path, content)` |
| 拒绝无效写入 | `mgr.commit(state)` 抛出 `SchemaError` |

## 记忆服务器项目
type: command-table
span: 2
from: projects/memory-server/README.md, projects/memory-server/solution/cli.ts

| 命令 | 作用 |
|---|---|
| `python3 scripts/project_test.py memory-server --init <dir>` | 创建工作区；初始模板会失败 |
| `python3 scripts/project_test.py memory-server --all --path <dir> --strict` | 评测全部四个阶段 |
| `node cli.ts --data-dir memory-data --put samples/memory.json` | 追加 `cache-policy` 的修订 1 |
| `node cli.ts --data-dir memory-data --query "cache policy"` | 搜索 `docs` 命名空间 |
| `node cli.ts --data-dir memory-data --put samples/memory-updated.json --revision 1` | 追加修订 2；再次使用修订 0 会冲突 |
| `node cli.ts --data-dir memory-data --history cache-policy --html history.html` | 打印全部修订并写入对比表 |
| `node cli.ts --data-dir memory-data --serve --port 8788` | 提供 REST 和 MCP；先设置 MEMORY_TOKEN |

## 默认值
type: defaults
from: phases/11-llm-engineering/05-context-engineering/code/main.py, phases/11-llm-engineering/05-context-engineering/docs/zh.md, phases/14-agent-engineering/07-memory-virtual-context-memgpt/code/main.py, phases/14-agent-engineering/08-memory-blocks-sleep-time-compute/code/main.py, phases/14-agent-engineering/09-hybrid-memory-mem0/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `max_tokens` | 128000 | 减去 `generation_reserve` 的 4000 |
| `max_history_tokens` | 5000 | 超过时总结旧轮次 |
| `token_budget` | 2000 | 工具定义上限 |
| 相关性 `threshold` | 0.05 | 文档版本使用 0.1 |
| `max_messages` | 4 | MemGPT 主上下文；旧消息移入 `evicted` |
| 块 `limit` | 300 | 字符数；`near_limit` 在 0.8 时触发 |
| `w_relevance` | 0.6 | `w_importance` 为 0.2，`w_recency` 为 0.2 |
| `recency_halflife_s` | 86400.0 | 每过一个半衰期，新近性变为 0.5 |

## 故障排查
type: troubleshooting
from: phases/11-llm-engineering/05-context-engineering/docs/zh.md, phases/14-agent-engineering/07-memory-virtual-context-memgpt/docs/zh.md, phases/14-agent-engineering/08-memory-blocks-sleep-time-compute/docs/zh.md, phases/14-agent-engineering/09-hybrid-memory-mem0/docs/zh.md, phases/14-agent-engineering/34-repo-memory-and-state/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 模型忽略中间事实 | 中间遗忘 | 关键事实在前、查询在后；末尾重复要点 |
| 工具填满窗口 | 每次调用都发送所有工具 | 分类意图并裁剪工具 |
| 检索充斥过时事实 | 记忆腐化 | 在休眠处理中整合并标记失效 |
| Agent 服从旧的注入笔记 | 记忆投毒 | 将检索记忆视为不可信文本 |
| Agent 能回忆但无法引用 | 引用丢失 | 每次写入保存会话 ID 和轮次 ID |
| 块达到上限 | 块膨胀 | 在导致超限的写入前生成摘要 |
| 用户看到他人的事实 | 作用域混用 | 每次写入选择一个作用域 |
| 会话从损坏状态恢复 | 非原子写入 | 临时文件、`fsync`、`os.replace` |

## 问答
type: qa
from: phases/11-llm-engineering/05-context-engineering/docs/zh.md, phases/14-agent-engineering/07-memory-virtual-context-memgpt/docs/zh.md, phases/14-agent-engineering/08-memory-blocks-sleep-time-compute/docs/zh.md, phases/14-agent-engineering/09-hybrid-memory-mem0/docs/zh.md, phases/14-agent-engineering/34-repo-memory-and-state/docs/zh.md

- **窗口更大就不需要记忆？** 128k 窗口基线仍会遗漏长期事实，而带外部记忆的 4k 窗口 agent 能捕获。
- **为何在休眠期计算？** 主对话无需等待。休眠 agent 可使用更强、更慢的模型。
- **为何用三种存储？** 单一存储无法适配三类查询中的两类。
- **融合如何排序？** 对相关性、重要性和新近性加权求和。权重随产品调整。
- **仓库记忆存什么？** 任务 ID、改动文件、假设、阻塞、下一步操作。不存原始聊天记录。
