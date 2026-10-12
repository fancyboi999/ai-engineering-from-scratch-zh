# 只依据证据写作

> 写作器不允许知道任何事情。它只能排列搜索找到的内容。

**类型：** Build
**语言：** Python
**阶段：** 4 / 7（core）
**预计时间：** 约 2 小时

## 构建内容

- `report_agent/citations.py`：读取引用标记、分割报告句子、验证每个句子引用存在的片段。
- `report_agent/writer.py`：为每个 facet 收集片段，据此写章节，渲染 Markdown。

完成的句子如下：

```text
Each microVM runs its own guest kernel [S4].
```

## 为什么重要

生成报告最常见的故障，是流畅句子没有来源，或附着的来源不支持句子。修复方式是结构性的，不是更好的 prompt：定义引用格式，拒绝任何违反格式的输出。强报告系统在代码中强制依据证据，例如让写作器只处理提取并编号的证据。弱系统则客气地要求模型，然后寄希望于它。

本阶段构建抽取式写作器：每个句子都是复制的片段，带着 id。有意让它枯燥。这让报告在构造上正确；以后换成能写真正正文的模型，验证器仍可保留。

## 引用契约

| 规则 | 失败示例 |
|---|---|
| 每个句子以一个或多个标记结束，再接句号 | `Containers share a kernel.` |
| 每个标记指向已知片段 | `Containers share a kernel [S99].` |
| 标题不是句子 | 跳过 `## Overview` |

`validate_citations(markdown, snippet_ids)` 返回 `CitationError(sentence, reason)` 列表，reason 为 `uncited` 或 `dangling:S99`。空列表表示有效。

一个微妙的分割：`user-space kernel` 以小写开头，因此 "... workloads [S1]. user-space kernel is ..." 仍必须在 `[S1].` 后分割。不管后面是什么，都将结束标记加句号视为边界。

## 为每个 facet 收集片段

```python
top_docs = [doc_id for doc_id, _ in index.search(plan.question, k=k_docs)]
for facet in plan.facets:
    candidates = extract_snippets(plan.question + " " + facet.query(), index,
                                  per_doc=per_doc, doc_ids=top_docs)
    # 跳过已用范围，低于 relative_floor * 最佳分数时停止，
    # 保留 per_facet 个，跨整份报告重新编号为 S1、S2、……
```

对完整问题搜索一次，使每章节都切题。facet 只改变这些文档中哪些句子胜出。跨 facet 重新编号，意味着 `S3` 在整份报告中只有一种含义。

```figure
pj-rra-cited-writer
```

## 沿机制推演

片段注册表是主键表。写作器将 id 用作外键，验证器检查引用完整性。跨 facet 分配 id 前，按 `(doc_id, start, end)` 去重；单独编号的重复项看似独立证据，实际不是。

## 你的任务

```python
# citations.py
def cites_of(sentence) -> list[str]: ...
def strip_cites(sentence) -> str: ...
def report_sentences(markdown) -> list[str]: ...
def validate_citations(markdown, snippet_ids) -> list[CitationError]: ...

# writer.py
class CitedSentence:
    def render(self) -> str: ...
def gather_snippets(plan, index, k_docs=4, per_doc=4, per_facet=3, relative_floor=0.4) -> dict: ...
def write_report(plan, snippets_by_facet, max_sentences=3) -> Report: ...
def to_markdown(report) -> str: ...
```

## 运行测试

```bash
python3 scripts/project_test.py research-report-agent --stage 4 --path my-report-agent
```

一个测试检查写作器不编造任何东西：折叠空白后，每句必须等于片段文本。

## 预期结果

第 4 阶段通过 12 个 Python 测试，之前所有阶段仍通过。干净的抽取式报告没有引用错误。无标记句子产生 `uncited`；`[S99]` 产生 `dangling:S99`。空白归一化后，每个报告句子等于源片段。

## 自测

1. 为什么验证器放在独立模块，而不是写作器内部？
2. 与改写模型相比，抽取式写作器损失了什么？
3. 如何允许模型改写句子，又保持契约？

## 进一步探索

- 添加模型写作器，只接收编号片段，必须返回引用格式的句子。对输出运行验证器，失败后重试一次。
- 将意思相同的两个片段合并成带两个标记的句子，如 `[S2][S5]`。

## Orchard 案例推演

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/zh.md)。先完成[第 3 阶段](../../03-plan-the-research/docs/zh.md)。

报告句子必须携带证据账本中存在的片段 id。写作器为每个 facet 选择证据；只有 60 分钟来源时，不能编出新的 15 分钟策略。

```text
更新前语料库 -> "tokens expire after 60 minutes" [S1]
更新后语料库 -> "tokens expire after 15 minutes" [S1]
```

## 构建并检查

将引用 id 与源范围一起追踪，而不只追踪显示编号。跨章节去重重复句子，不丢证据。

在学习者工作区实现本阶段。CLI 辅助程序是提供的适配器，导入你的函数，不以参考方案替代。

```bash
python3 scripts/project_test.py research-report-agent --stage 4 --path learning-artifacts/research-report-agent
```

预测上面的中间状态，再运行本阶段。全新桩实现会失败；参考方案通过不能证明学习者工作区已完成。

## 下一步探查

为什么同一显示 id S1 在两次独立运行中可能指向不同证据？
