---
id: rag-production
title: 生产 RAG 聊天机器人与时效性
code: PC
subtitle: 过滤、融合、缓存、防护与引用。保持索引新鲜，并评测每次排序变化。
hue: 160
sources: phases/19-capstone-projects/02-rag-over-codebase, phases/19-capstone-projects/08-production-rag-chatbot, projects/doc-qa-with-citations, projects/rag-freshness-pipeline, projects/semantic-notes-search, projects/retrieval-evaluation-lab
source_hash: 0f100c52b35e68da
---

## 受监管场景的一轮聊天
type: architecture
from: phases/19-capstone-projects/08-production-rag-chatbot/code/main.py, phases/19-capstone-projects/08-production-rag-chatbot/docs/zh.md

```arch
node | q | 1,1 | 查询 | 角色 + 司法辖区 | client
node | guard | 2,1 | 输入护栏 | BLOCKED_PATTERNS | process
node | filter | 3,1 | 访问过滤 | 角色或公开，标签或任意 | process
node | fuse | 4,1 | 混合检索 | 稠密 + BM25，RRF 60 | store
node | layout | 4,2 | PromptLayout | system、policy、context | process
node | cache | 3,2 | PromptCache | cache_key 命中或未命中 | store
node | synth | 2,2 | 合成 | 引用或表示不确定 | model
node | scrub | 1,2 | PII 脱敏 | 邮箱与 ssn 已遮蔽 | process
edge | q | guard |
edge | guard | filter | 通过
edge | filter | fuse | 符合条件
edge | fuse | layout | 前 3 项
edge | layout | cache | sha256 前缀
edge | cache | synth |
edge | synth | scrub | 答案
```

## 运行、评测与检查
type: command-table
span: 2
from: projects/doc-qa-with-citations/README.md, projects/rag-freshness-pipeline/README.md, projects/semantic-notes-search/README.md, projects/retrieval-evaluation-lab/README.md, phases/19-capstone-projects/02-rag-over-codebase/code/main.py, phases/19-capstone-projects/02-rag-over-codebase/code/ts/README.md

| 命令 | 作用 |
|---|---|
| `python3 scripts/project_test.py <project> --init learning-artifacts/<project>` | 创建工作区，全新起始实现会失败 |
| `python3 scripts/project_test.py <project> --stage 1 --path learning-artifacts/<project>` | 评测代码的一个阶段 |
| `python3 scripts/project_test.py <project> --all --solution --strict` | 检查参考实现 |
| `python3 cli.py samples/docs "When does cache expire?" --output answer.json --html answer.html` | 写出 JSON 与 HTML 引用回执 |
| `cli.py query orchard-index.json tokens --now 210 --max-age 60` | 查询时效性快照 |
| `cli.py <notes> "release replicas" --aliases <aliases.json> --out matches.json` | 搜索 Markdown 目录 |
| `cli.py <baseline> <candidate> <judgments> --out retrieval-diff.json` | 按查询比较两次排序运行 |
| `python main.py` | 离线运行综合项目框架 |

## 缓存感知的聊天轮次
type: annotated-code
lang: python
from: phases/19-capstone-projects/08-production-rag-chatbot/code/main.py

```python
ok, reason = llama_guard_input(query)          # 先检查正则阻止列表
hits = retrieve(query, role, jurisdiction, corpus, k=3)
context = [f"[{c.anchor()}] {c.text}" for c, _ in hits]
layout = PromptLayout(system=SYSTEM_PROMPT,   # 很稳定
    policy=f"role={role} jurisdiction={jurisdiction}",
    context=context, question=query)          # 问题不缓存
cache_hit = cache.check(layout.cache_key())   # 前缀的 sha256，16 位十六进制
answer = presidio_scrub(answer)               # 将邮箱和社保号替换为 [email]、[ssn]
cache.hit_rate()                              # 命中数 /（命中数 + 未命中数）
```

## 代码库混合检索
type: annotated-code
lang: python
from: phases/19-capstone-projects/02-rag-over-codebase/code/main.py

```python
tokens = (tokenize(chunk.symbol) * 4 +        # 符号权重为 4
          tokenize(chunk.summary) * 2 +       # 摘要权重为 2
          tokenize(chunk.body))               # 正文权重为 1
dense_hits = dense.search(query, k=10)
sparse_hits = bm25.search(query, k=10)
fused = rrf(dense_hits, sparse_hits)          # k_rrf: int = 60
top = rerank(query, fused, top_k=5)           # 符号权重 0.3，摘要权重 0.1
citations = [c.anchor() for c, _ in top]      # repo/path:start-end
```

## 项目函数
type: task-table
from: projects/doc-qa-with-citations/API.md, projects/doc-qa-with-citations/solution, projects/rag-freshness-pipeline/solution, projects/semantic-notes-search/solution/main.py, projects/retrieval-evaluation-lab/solution/main.py

| 任务 | 代码 |
|---|---|
| 加载文本文件并计算 SHA-256 | `load_documents(root)` |
| 带偏移量切块 | `chunk_document(doc, size=200, overlap=30)` |
| 验证模型引文 | `answer(question, chunks, model)` |
| 规划索引变化 | `diff(previous, incoming)` |
| 提交快照 | `commit(path, documents, expected_version)` |
| 丢弃过期证据 | `retrieve(documents, query, now, max_age=3600, k=3)` |
| 构建 TF-IDF 索引 | `build_index(documents, aliases=None)` |
| 为两个系统评分 | `compare_systems(systems, judgments, k)` |

## 时效性摄取与查询
type: flow
from: projects/rag-freshness-pipeline/solution, projects/rag-freshness-pipeline/README.md

1. **normalize**：文本做 NFC 规范化，将 CRLF 转为 LF，去首尾空白，再计算正文 SHA-256。
2. **diff**：新 id 进入 `insert`。
3. **diff**：hash 改变进入 `update`；只有 `updated` 时间变化则进入 `refresh`。
4. **diff**：完整语料中不存在的 id 进入 `delete`。
5. **commit**：flock 加锁，比较 `expected_version`，写临时文件，fsync，再 `os.replace`。
6. **retrieve**：年龄小于 0 或超过 `max_age` 时跳过文档。
7. **retrieve**：得分为匹配词数除以查询词数，按得分、年龄、id 排序。

## 项目输入、输出与检查
type: comparison
from: projects/doc-qa-with-citations/README.md, projects/doc-qa-with-citations/solution/cli.py, projects/rag-freshness-pipeline/README.md, projects/rag-freshness-pipeline/solution/cli.py, projects/semantic-notes-search/README.md, projects/semantic-notes-search/solution/cli.py, projects/retrieval-evaluation-lab/README.md, projects/retrieval-evaluation-lab/solution/cli.py

| 维度 | 文档问答 | 时效性 | 笔记搜索 | 评估实验 |
|---|---|---|---|---|
| 构建产物 | 引用回执 | 新鲜索引 | 词汇 TF-IDF 搜索 | 回归差异 |
| 输入 | .txt 目录 | 完整语料 JSON | .md 目录 | 3 个 JSON 文件 |
| 输出 | answer.json、answer.html | 快照、变更 | matches.json | retrieval-diff.json |
| 关键字段 | start、end、sha256 | version、age、hash | score、matched | delta_ndcg |
| 状态 | answered、abstained | insert 到 delete | 前 k 个匹配 | 回归数量 |
| 护栏 | needs_review | 旧版本错误 | k 必须为正数 | `--fail-on-regression` |

## 默认值与数值
type: defaults
from: projects/doc-qa-with-citations/API.md, projects/rag-freshness-pipeline/solution/cli.py, projects/semantic-notes-search/solution/cli.py, projects/retrieval-evaluation-lab/solution/main.py, phases/19-capstone-projects/08-production-rag-chatbot/docs/zh.md, phases/19-capstone-projects/02-rag-over-codebase/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| 文档问答块 `size` | 200 | `overlap` 为 30 |
| `--max-age` | 3600 | 跳过更旧的证据 |
| `--k` | 3 | 时效性、笔记与评估 CLI |
| 笔记大小限制 | 100 KB | 更大的笔记报错 |
| 相关性等级 | 0..3 | 仅允许整数 |
| 重排候选池 | top-20 | 前 5 项用于合成 |
| 缓存命中目标 | 60-80% | 稳定前缀放在前面 |
| 漂移警报 | 5% | 每周检索质量下降幅度 |

## 故障排查
type: troubleshooting
from: projects/doc-qa-with-citations/solution, projects/doc-qa-with-citations/README.md, projects/rag-freshness-pipeline/solution, projects/rag-freshness-pipeline/README.md, projects/semantic-notes-search/solution/cli.py, phases/19-capstone-projects/08-production-rag-chatbot/docs/zh.md, phases/19-capstone-projects/02-rag-over-codebase/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| "unsupported model answer" | 引文不在所引块中 | 返回精确文本区间及其块 id |
| `state` 为 needs_review | 引文没有查询词 | 人工判断相关性 |
| `state` 为 abstained | 检索未找到块 | 离题查询下符合预期 |
| "stale index version" | 另一写入者先提交 | 读取快照并传入其版本 |
| "duplicate document id" | 两份传入文档共用 id | 使 id 唯一 |
| 已修改政策仍被引用 | 索引落后于来源 | 重新摄取完整语料 |
| "symlink notes are not supported" | 笔记是链接 | 使用目录内的普通文件 |
| 生成代码污染命中 | 语料中存在模板代码 | 标记为 "generated" 并降权 |

## 代码中的排序指标
type: concepts
from: projects/retrieval-evaluation-lab/solution/main.py, projects/semantic-notes-search/solution/main.py, projects/doc-qa-with-citations/solution/retrieval.py

- **Precision@k**：前 k 项中的相关命中数除以 k。
- **Recall@k**：相关命中数除以等级大于 0 的文档总数。
- **RR**：首个相关文档排名的倒数，没有则为 0。
- **nDCG**：以 `2 ** grade - 1` 为增益的 DCG 除以理想 DCG。
- **未评判项**：前 k 项中没有标签的文档，增益为零。
- **笔记 IDF**：`math.log((1 + len(terms)) / (1 + count)) + 1`。
- **文档问答得分**：将 `(1 + math.log(bag[t]))` 乘 IDF 项后求和。

## 问答
type: qa
from: phases/19-capstone-projects/08-production-rag-chatbot/docs/zh.md, phases/19-capstone-projects/02-rag-over-codebase/docs/zh.md, projects/doc-qa-with-citations/README.md, projects/rag-freshness-pipeline/README.md

- **为什么先按角色过滤？** 任何评分之前都必须满足访问策略。
- **为什么把问题放最后？** 系统 prompt 与上下文构成缓存前缀。
- **重建索引会改什么？** 只改文本变化的块，导入变化时才改变边。
- **有效引用能证明答案吗？** 不能，内容仍可能无关或过时。
- **刷新等于重写吗？** 不等于。同内容、较新时间只更新时间。

## 提示
type: tips
from: phases/19-capstone-projects/08-production-rag-chatbot/docs/zh.md, phases/19-capstone-projects/02-rag-over-codebase/docs/zh.md

- 为 100 个跨仓库问题标注标准的 file:line 答案。
- 保留 200 组问答黄金集与 50 个对抗 prompt。
- 拒绝任何没有 `(repo/path:start-end)` 锚点的主张。
- 50 个文件的推送应在 60 秒内完成重建索引。
