# 提取可引用的片段

> 指向整篇文档的引用什么也证明不了。指向确切句子。

**类型：** Build
**语言：** Python
**阶段：** 2 / 7（starter）
**预计时间：** 约 2 小时

## 构建内容

`report_agent/snippets.py`：

- `split_sentences(text)` 返回每个句子的 `(start, end)` 范围。
- `score_sentence(sentence, query_tokens, idf)` 对一个句子相对于查询评分。
- `extract_snippets(query, index, ...)` 返回最相关文档中的最佳 `Snippet` 对象。

`Snippet` 包含 `id`、`doc_id`、`start`、`end`、`text` 和 `score`，始终满足：

```python
document.text[snippet.start:snippet.end] == snippet.text
```

## 为什么重要

引用有两个独立性质：标记能解析到来源，且该来源支持主张。有效链接仍可能指向说别的事情的句子。精确证据范围让这个区别可测试。

你无法廉价地对照整张网页检查主张，读者也不会这样做。偏移量让每条引用只需一次查找即可核查：打开文档，切片 `[start:end]`，读句子。第 5 阶段的审查器和第 6 阶段的脚注都依赖这一点。

## 句子范围

在 `.`, `!` 或 `?` 处分割，条件是空白后的下一个字符开始新句，或已到文本结尾。此语料库有两个重要细节：

```text
The socket is at /var/run/container.sock. Any process can write.
                            ^ 不是边界            ^ 边界
It is slower. user-space kernel is still useful.
             ^ 是边界，尽管 user-space kernel 以小写开头
```

范围不要包含周围空白，使 `text[start:end]` 干净。

## 句子评分

复用第 1 阶段的 IDF 表：

```python
score = sum(idf[t] for t in set(query_tokens) if t in tokenize(sentence))
```

再应用两条规则，让片段单独阅读也能理解：

| 规则 | 原因 |
|---|---|
| 少于 `min_words`（6）个词的句子得分 0 | “The tradeoff is overhead.”（代价是开销）脱离上下文没有意义 |
| 以 It、This、These、They 等开头的句子分数减半 | “It uses a limited set of calls”（它使用有限的调用集合）没有说明“它”是什么 |

真实系统通过去语境化解决第二个问题：改写句子，让它可以独立理解。惩罚项是廉价版本。

```figure
pj-rra-snippet-offsets
```

## 沿机制推演

偏移量是去除首尾空白后的文档正文中的位置，不是完整 Markdown 文件的位置。选定句子后，绝不在未调整 start 和 end 的情况下调用 `.strip()`。来源变化后，旧偏移量可能仍指向文本，却不再对应同一主张；第 6 阶段会再次检查相等性。

## 你的任务

```python
def split_sentences(text: str) -> list[tuple[int, int]]: ...
def score_sentence(sentence, query_tokens, idf, min_words=6) -> float: ...
def extract_snippets(query, index, k_docs=4, per_doc=3, start_id=1,
                     min_score=0.0, doc_ids=None) -> list[Snippet]: ...
```

`extract_snippets` 搜索前 `k_docs` 个文档（给定 `doc_ids` 时只搜索指定文档），每文档最多保留 `per_doc` 个句子，将所有候选按分数排序，编号为 `S{start_id}`、`S{start_id + 1}` 等。

## 运行测试

```bash
python3 scripts/project_test.py research-report-agent --stage 2 --path my-report-agent
```

阶段累积运行，因此第 1 阶段必须仍然通过。

## 预期结果

第 2 阶段通过 11 个 Python 测试，之前所有阶段仍通过。每个返回片段精确复现源切片，包括含点 socket 路径后的文本。测试也覆盖小写句子开头、顺序 id 和每文档限制。

## 自测

1. 为什么存偏移量而不只存句子文本？
2. `04-user-space-kernel.md` 中哪个句子损失一半分数？删除它会让读者遗漏什么吗？
3. 分割器将 `container.sock.` 视为两个句子会破坏什么？

## 进一步探索

- 返回相邻句子的窗口作为上下文，但仍引用精确范围。
- 用小模型将句子改写为可独立理解的形式，替代代词惩罚，并保存两个版本。

## Orchard 案例推演

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/zh.md)。先完成[第 1 阶段](../../01-search-the-corpus/docs/zh.md)。

只有保存的范围精确复现文档文本时，Orchard 策略句子才是证据。偏移量属于归一化文档正文，不属于文件头或渲染后的 HTML。

```text
source: "Old rule. New rule."
second span=[10,19)
source[10:19]="New rule."
```

## 构建并检查

在原始字符串上寻找边界，通过移动偏移量去掉空白。计算范围后绝不改写片段。

在学习者工作区实现本阶段。CLI 辅助程序是提供的适配器，导入你的函数，不以参考方案替代。

```bash
python3 scripts/project_test.py research-report-agent --stage 2 --path learning-artifacts/research-report-agent
```

预测上面的中间状态，再运行本阶段。全新桩实现会失败；参考方案通过不能证明学习者工作区已完成。

## 下一步探查

在旧片段的起始偏移量前编辑源文本，会发生什么？
