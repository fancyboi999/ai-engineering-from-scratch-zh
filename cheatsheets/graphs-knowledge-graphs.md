---
id: graphs-knowledge-graphs
title: 图与知识图谱
code: GK
subtitle: 图矩阵、拉普拉斯与消息传递、实体链接、关系抽取及混合图记忆。
hue: 160
sources: phases/01-math-foundations/21-graph-theory, phases/05-nlp-foundations-to-advanced/25-entity-linking, phases/05-nlp-foundations-to-advanced/26-relation-extraction-kg, phases/14-agent-engineering/09-hybrid-memory-mem0
source_hash: b1c5096612ebf143
---

## 图矩阵
type: concepts
from: phases/01-math-foundations/21-graph-theory/docs/zh.md

- **邻接矩阵**：有边时 $A[i][j] = 1$。无向图的邻接矩阵对称。
- **度矩阵**：$D$ 是对角矩阵，对角项为各节点的度。三角形对应 diag(2, 2, 2)。
- **拉普拉斯矩阵**：$L = D - A$，为半正定矩阵。所有特征值都 $\ge 0$。
- **零特征值**：数量等于连通分量数。
- **Fiedler 值**：最小非零特征值。较小的值表示存在瓶颈。
- **消息传递**：$H^{(k+1)} = \sigma(A_{\text{norm}} H^{(k)} W)$。$A_{\text{norm}}$ 每行之和为 1。
- **GCN 层**：$\sigma(\hat{D}^{-1/2} \hat{A} \hat{D}^{-1/2} H W)$，带自环 $\hat{A} = A + I$。
- **PageRank**：$(1-d)/n + d \sum \text{score}(u) / \text{out}(u)$，其中 d=0.85。

## 代码中的图任务
type: task-table
span: 2
from: phases/01-math-foundations/21-graph-theory/code/graph_theory.py, phases/01-math-foundations/21-graph-theory/docs/zh.md

| 任务 | 代码 |
|---|---|
| 构建图 | `Graph(n_nodes, directed=False)` |
| 添加边 | `add_edge(u, v, weight=1.0)` |
| 跳数距离与访问顺序 | `bfs(graph, start)` 返回顺序和距离 |
| 查找连通分量 | `connected_components(graph)` |
| 划分为两个簇 | `spectral_clustering(graph, k=2)` |
| 执行一轮 GNN | `message_passing(graph, features, weight_matrix)` |
| 为节点排名 | `pagerank(graph, damping=0.85, max_iter=100, tol=1e-6)` |
| 拉普拉斯特征值，升序 | `np.linalg.eigvalsh(L)` |

## 用 numpy 做谱划分
type: annotated-code
lang: python
from: phases/01-math-foundations/21-graph-theory/docs/zh.md

```python
D = np.diag(A.sum(axis=1))                       # 度矩阵
L = D - A                                        # 拉普拉斯矩阵
eigenvalues, eigenvectors = np.linalg.eigh(L)    # 升序
eigenvalues[1]                                   # Fiedler 值
fiedler = eigenvectors[:, 1]                     # Fiedler 向量
group_a = np.where(fiedler >= 0)[0]              # 一个簇
group_b = np.where(fiedler < 0)[0]               # 另一个簇
G = nx.karate_club_graph()                       # 34 个节点，78 条边
nx.number_connected_components(G)
nx.pagerank(G)                                   # 节点重要性
```

## 从文本到知识图谱
type: flow
from: phases/05-nlp-foundations-to-advanced/26-relation-extraction-kg/docs/zh.md, phases/05-nlp-foundations-to-advanced/25-entity-linking/docs/zh.md

1. **NER**：查找文本中的实体提及。
2. **共指消解**：在 RE 前，将“他”等代词解析到正确实体。
3. **实体链接**：把每次提及映射到唯一 KB 标识。
4. **关系抽取**：输出带文本区间的 (subject, relation, object) 三元组。
5. **验证**：将三元组每个元素与来源匹配，拒绝没有依据的三元组。
6. **本体映射**：把关系映射到标准标识，例如雇主关系 `P108`。
7. **图加载**：为每个三元组保存文档标识和字符区间。

## 链接一次提及
type: flow
from: phases/05-nlp-foundations-to-advanced/25-entity-linking/docs/zh.md, phases/05-nlp-foundations-to-advanced/25-entity-linking/code/main.py

1. **别名索引**：查询转成小写的提及，典型索引返回 10-30 个候选。
2. **无候选**：`disambiguate` 返回 `None, 0.0`。
3. **上下文分数**：上下文 token 与描述 token 的 Jaccard 重叠度。
4. **先验**：分数为 `jac + 0.1 * prior`，先验来自 `PRIORS`。
5. **嵌入选项**：用 [MENTION] 标签标记区间，选择余弦相似度最大者。
6. **NIL**：没有匹配的 KB 条目，对最高分设置阈值。
7. **合并**：每个共指簇只保留一个 KB 标识。

## 抽取、验证与构建
type: annotated-code
lang: python
from: phases/05-nlp-foundations-to-advanced/26-relation-extraction-kg/code/main.py

```python
def verify(triples, text):
    verified = []
    for t in triples:
        s, e = t["span"]
        if text[s:e] != t["evidence"]:          # 区间必须与来源匹配
            continue
        verified.append(t)
    return verified

triples = extract(doc)                          # 正则 PATTERNS，每项一个 P 标识
graph = build_graph(verify(triples, doc))       # 主体映射到关系、客体
for rel, obj, ev in graph.get("Tim Cook", []):  # ev 为源句子
    if rel == "P169":                           # 担任 CEO
```

## 混合记忆：Mem0
type: architecture
from: phases/14-agent-engineering/09-hybrid-memory-mem0/docs/zh.md, phases/14-agent-engineering/09-hybrid-memory-mem0/code/main.py

```arch
node | add | 1,2 | add() | text, user_id, metadata | client
node | vec | 2,1 | VectorStore | 语义相似度 | store
node | kv | 2,2 | KVStore | user_id, fact_type, entity | store
node | graph | 2,3 | GraphStore | 类型化边、有效标记 | store
node | fuse | 3,2 | 融合分数 | 相关性、重要性、近期性 | process
node | out | 4,2 | search() | 融合后的 top_k |
edge | add | vec |
edge | add | kv |
edge | add | graph |
edge | vec | fuse | 余弦相似度
edge | kv | fuse | 精确命中
edge | graph | fuse | 子图
edge | fuse | out |
```

## Mem0Config 与默认值
type: defaults
from: phases/14-agent-engineering/09-hybrid-memory-mem0/code/main.py, phases/14-agent-engineering/09-hybrid-memory-mem0/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `w_relevance` | 0.6 | 检索 agent 可提高此值 |
| `w_importance` | 0.2 | 合规 agent 可提高此值 |
| `w_recency` | 0.2 | 聊天 agent 可提高此值 |
| `recency_halflife_s` | 86400.0 | 每个半衰期近期性减半 |
| `importance` | 0.5 | 添加时为每条记录设置 |
| `scope` | user | 也可为 session 或 agent |
| `top_k` | 5 | 向量搜索先获取 3 倍记录 |
| KV 命中相关性 | 0.4 | 仅来自 KV 的记录使用固定相关性 |

## 故障与修正
type: troubleshooting
from: phases/05-nlp-foundations-to-advanced/25-entity-linking/docs/zh.md, phases/05-nlp-foundations-to-advanced/26-relation-extraction-kg/docs/zh.md, phases/14-agent-engineering/09-hybrid-memory-mem0/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 高频实体总是胜出 | 流行度偏差 | 在领域数据上微调 |
| 正确实体从未进入评分 | 候选召回率低 | 先测量提及召回率 @ 30 |
| 新名字映射到错误实体 | KB 中没有该提及 | 预测 NIL |
| 遗漏“He founded Apple” | RE 前未做共指消解 | 先运行共指消解 |
| 三元组无文本依据 | LLM 幻觉 | 对照来源验证每个区间 |
| 图无法查询 | 开放信息抽取的关系漂移 | 合并为标准标识 |
| 向量召回退化 | 语料增长导致嵌入漂移 | 重新嵌入使用最多的前 N 条记录 |
| 每条消息生成 50 条边 | 抽取器噪声大 | 限制每次 `add` 的图写入量 |

## 缩写
type: glossary
from: phases/01-math-foundations/21-graph-theory/docs/zh.md, phases/05-nlp-foundations-to-advanced/25-entity-linking/docs/zh.md, phases/05-nlp-foundations-to-advanced/26-relation-extraction-kg/docs/zh.md, phases/14-agent-engineering/09-hybrid-memory-mem0/docs/zh.md

- **BFS / DFS**：广度优先用队列，深度优先用栈。两者都是 $O(V + E)$。
- **GCN**：图卷积网络，使用对称归一化的消息传递。
- **EL**：实体链接，将提及映射到唯一 KB 条目。
- **KB**：知识库，如 Wikidata、Wikipedia、DBpedia 或领域知识库。
- **NIL**：预测没有匹配的 KB 条目。
- **RE**：关系抽取，从文本生成 (subject, relation, object) 三元组。
- **AEVS**：锚定、抽取、验证、补充。通过区间验证的抽取方法。
- **Open IE**：开放信息抽取，任意动词短语都可作关系。召回高，精度低。
- **Mem0g**：带时间有效性的类型化边，支持关系查询。

## 问答
type: qa
from: phases/01-math-foundations/21-graph-theory/docs/zh.md, phases/05-nlp-foundations-to-advanced/25-entity-linking/docs/zh.md, phases/14-agent-engineering/09-hybrid-memory-mem0/docs/zh.md

- **跳数距离为何用 BFS？** 无权图中，节点的 BFS 层数就是最短路径长度。
- **Fiedler 向量如何划分？** 正项进入一个簇，负项进入另一个簇。
- **K 轮消息传递能看到什么？** 每个节点的 K 跳邻域。
- **为何报告两个 EL 指标？** 候选召回率为 80% 时，即使消歧准确率为 99%，整条流水线也只有约 80%。
- **为何将边标为无效？** 时间查询遍历指定时间有效的子图。
- **为何使用三种记忆存储？** 单一存储不适合其中两类查询。

## 提示
type: tips
from: phases/01-math-foundations/21-graph-theory/docs/zh.md, phases/05-nlp-foundations-to-advanced/26-relation-extraction-kg/docs/zh.md, phases/05-nlp-foundations-to-advanced/25-entity-linking/docs/zh.md, phases/14-agent-engineering/09-hybrid-memory-mem0/docs/zh.md

- 生产环境使用 networkx，用从零实现的代码理解其原理。
- 为每个三元组提供来源字符区间和文档标识。
- 合并前，把开放信息抽取的关系映射到封闭本体。
- 为标准化预留 60-80% 的工程工作量。
- 为有时间范围的关系添加 `P580` 开始时间和 `P582` 结束时间。
- 在 AIDA-CoNLL 上报告 KB 内准确率（`P@1`）与 NIL 检出率。
- 每次写入记忆只选一个作用域：user、session 或 agent。
