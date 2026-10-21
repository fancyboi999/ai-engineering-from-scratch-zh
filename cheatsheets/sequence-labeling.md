---
id: sequence-labeling
title: NER、词性标注与共指消解
code: NP
subtitle: BIO 标签、CRF 与 HMM 标注器、Viterbi、依存分析、共指簇，以及到知识库的实体链接。
hue: 160
sources: phases/05-nlp-foundations-to-advanced/06-named-entity-recognition, phases/05-nlp-foundations-to-advanced/07-pos-tagging-parsing, phases/05-nlp-foundations-to-advanced/24-coreference-resolution, phases/05-nlp-foundations-to-advanced/25-entity-linking
source_hash: 4cf478ba5073db05
---

## 抽取流水线
type: architecture
from: phases/05-nlp-foundations-to-advanced/24-coreference-resolution/docs/zh.md, phases/05-nlp-foundations-to-advanced/25-entity-linking/docs/zh.md, phases/05-nlp-foundations-to-advanced/06-named-entity-recognition/docs/zh.md

```arch
node | text | 1,1 | 文档 | | client
node | ner | 2,1 | NER | BIO token 标签转片段 | model
node | coref | 3,1 | 共指消解 | 提及簇 | model
node | cand | 3,2 | 候选生成 | 别名索引，每次提及 10-30 个 | store
node | dis | 2,2 | 消歧 | 先验 + 上下文或嵌入 | process
node | kb | 1,2 | 各实体的 KB 标识 | 或 NIL | store
edge | text | ner | token
edge | ner | coref | 提及
edge | coref | cand | 每次提及
edge | cand | dis | 候选
edge | dis | kb | top-1
```

## 核心概念
type: concepts
from: phases/05-nlp-foundations-to-advanced/06-named-entity-recognition/docs/zh.md, phases/05-nlp-foundations-to-advanced/07-pos-tagging-parsing/docs/zh.md, phases/05-nlp-foundations-to-advanced/24-coreference-resolution/docs/zh.md, phases/05-nlp-foundations-to-advanced/25-entity-linking/docs/zh.md

- **BIO**：`B-X` 开始，`I-X` 延续，`O` 表示外部。例如 `New B-GPE`、`York I-GPE`。
- **BILOU**：新增 `L-X`（末尾）与 `U-X`（单元），边界更清晰。
- **HMM**：$P = \prod_i P(t_i \mid t_{i-1}) \, P(w_i \mid t_i)$，转移概率乘发射概率。
- **CRF**：判别式模型，结合词形、大小写和相邻特征，强制合法标签序列。
- **Viterbi**：在标签格上用动态规划求最优标签序列。
- **依存分析**：每个词有一个中心词和关系标签。
- **提及类型**：命名实体、名词性、代词性、同位语。
- **先验 + 上下文**：`P(entity | mention) × context-similarity(entity, text)`。

## 基于规则的代词消解器
type: flow
from: phases/05-nlp-foundations-to-advanced/24-coreference-resolution/docs/zh.md, phases/05-nlp-foundations-to-advanced/24-coreference-resolution/code/main.py

1. **extract_mentions**：提取大写开头片段、查表得到的代词和 "the X" 定指短语。
2. **resolve**：为每个代词获取更早的命名实体与名词性提及。
3. **agreement_score**：数一致加 1，性别冲突扣 2。
4. **recency_score**：距离越近分数越高。
5. **resolve**：链接总分最高的候选。
6. **clusters**：对链接做并查集，每个实体得到一个簇。

## 代码任务
type: task-table
span: 2
from: phases/05-nlp-foundations-to-advanced/06-named-entity-recognition/code/main.py, phases/05-nlp-foundations-to-advanced/07-pos-tagging-parsing/code/main.py, phases/05-nlp-foundations-to-advanced/25-entity-linking/code/main.py

| 任务 | 代码 |
|---|---|
| 片段转 BIO 标签 | `spans_to_bio(tokens, spans)` |
| BIO 标签还原片段 | `bio_to_spans(tokens, labels)` |
| 大小写词形 | `word_shape(word)` |
| 地名词典基线 | `rule_based_ner(tokens)` |
| 最常见标签基线 | `predict_mft(tokens, word_best, default_tag)` |
| 训练 bigram HMM | `train_hmm(examples, alpha=0.01)` |
| 解码标签 | `viterbi(tokens, transitions, emissions, tags, vocab, alpha=0.01)` |
| 链接一次提及 | `disambiguate(mention, context, use_prior=True)` |

## CRF 与 transformer NER
type: annotated-code
lang: python
from: phases/05-nlp-foundations-to-advanced/06-named-entity-recognition/docs/zh.md

```python
crf = sklearn_crfsuite.CRF(algorithm="lbfgs",
    c1=0.1, c2=0.1,                   # L1 与 L2 正则化
    max_iterations=100,
    all_possible_transitions=True)    # 学到 O 后不太可能是 I-ORG
X_train = [to_features(s) for s in sentences_tokenized]
crf.fit(X_train, bio_labels_train)    # CoNLL-2003 上约 84 F1
ner = pipeline("ner", model="dslim/bert-base-NER",
               aggregation_strategy="simple")  # 将 B-X、I-X 合并为片段
print(ner("Apple sued Google over its iPhone in the US."))
```

## spaCy：标签、分析、实体与簇
type: annotated-code
lang: python
from: phases/05-nlp-foundations-to-advanced/07-pos-tagging-parsing/docs/zh.md, phases/05-nlp-foundations-to-advanced/06-named-entity-recognition/docs/zh.md, phases/05-nlp-foundations-to-advanced/24-coreference-resolution/docs/zh.md

```python
nlp = spacy.load("en_core_web_sm")
doc = nlp("The cats were running at 3pm.")
for token in doc:
    print(token.tag_, token.pos_, token.dep_, token.head.text)  # Penn、UD、关系
for ent in doc.ents:
    print(f"{ent.text:20s} {ent.label_}")   # sm 中 iPhone 被识别为 ORG
nlp = spacy.load("en_coreference_web_trf")   # 实验模型
doc = nlp("<text>")                          # 用共指模型重新运行
for cluster in doc._.coref_clusters:
    print(cluster, "->", [m.text for m in cluster])
```

## 预期数字
type: defaults
from: phases/05-nlp-foundations-to-advanced/07-pos-tagging-parsing/docs/zh.md, phases/05-nlp-foundations-to-advanced/24-coreference-resolution/docs/zh.md, phases/05-nlp-foundations-to-advanced/25-entity-linking/docs/zh.md, phases/05-nlp-foundations-to-advanced/06-named-entity-recognition/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| Brown 上最常见标签基线 | 约 85% | 所有标注器的下限 |
| Brown 上 bigram HMM | 约 93% | 收益来自转移概率 |
| 带特征的 CRF | 约 97% | BiLSTM-CRF 或 transformer 约 98%+ |
| PTB 标注者一致率 | 97% | 超过 98% 可能过拟合 |
| 标签集 | 36 | PTB 有 36 个标签，UD 有 17 个 |
| CoNLL-2012 共指最佳水平 | ~83 F1 | MUC、B³、CEAF 的均值 |
| 每次提及的候选 | 10-30 | 来自别名索引 |
| 经典 NER 延迟 | 50ms | 低于此值时经典 NER 占优 |

## 常见问题排查
type: troubleshooting
from: phases/05-nlp-foundations-to-advanced/06-named-entity-recognition/docs/zh.md, phases/05-nlp-foundations-to-advanced/24-coreference-resolution/docs/zh.md, phases/05-nlp-foundations-to-advanced/25-entity-linking/docs/zh.md, phases/05-nlp-foundations-to-advanced/07-pos-tagging-parsing/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| CoNLL 模型处理合同失败 | 领域偏移 | 用本领域数据微调 |
| ORG 与 FACILITY 重叠 | BIO 无法嵌套片段 | 基于片段或多轮 NER |
| 长实体拆成两部分 | token 级标签 | `aggregation_strategy` 或后处理 |
| F1 看起来过高 | 使用 token 级 F1 | 用 `seqeval` 计算实体级 F1 |
| 每次提及各自成簇 | 单例簇激增 | 同时检查 MUC、B³ 与 CEAF |
| 长文档共指表现下降 | 超过 2,000 token 时约降 15 F1 | 滑动窗口加合并 |
| 选错知名实体 | 流行度偏差 | 领域微调，检查 NIL |
| EL 召回下降 | NER 截短了片段 | 修复上游提及边界 |

## 如何选择
type: qa
from: phases/05-nlp-foundations-to-advanced/06-named-entity-recognition/docs/zh.md, phases/05-nlp-foundations-to-advanced/07-pos-tagging-parsing/docs/zh.md, phases/05-nlp-foundations-to-advanced/24-coreference-resolution/docs/zh.md, phases/05-nlp-foundations-to-advanced/25-entity-linking/docs/zh.md

- **经典 NER 还是 LLM？** 低于 50ms、98%+ F1 或本地部署时用经典方案，否则先做 LLM 零样本基线。
- **PTB 还是 UD？** 纯英文旧流水线用 PTB，多语言用 UD。
- **哪个分析器？** 多数生产用 spaCy，多语言用 stanza，追求最佳 UD 准确率用 trankit。
- **哪种 EL 方法？** 英文维基百科用 BLINK 或 REL，最低延迟用精确匹配先验。
- **LLM 共指消解？** 仅简单情况，长文档会过度合并并遗漏提及。

## 缩写
type: glossary
from: phases/05-nlp-foundations-to-advanced/06-named-entity-recognition/docs/zh.md, phases/05-nlp-foundations-to-advanced/07-pos-tagging-parsing/docs/zh.md, phases/05-nlp-foundations-to-advanced/24-coreference-resolution/docs/zh.md, phases/05-nlp-foundations-to-advanced/25-entity-linking/docs/zh.md

- **NER**：命名实体识别，为 token 片段标记类型。
- **CRF**：条件随机场，建模标签转移。
- **PTB / UD**：Penn Treebank 与 Universal Dependencies 标签集。
- **EL**：实体链接，将提及映射到一个知识库条目。
- **NIL**：知识库没有匹配该提及的条目。
- **CoNLL F1**：MUC、B³ 和 CEAF-φ4 F1 的均值。
- **后指**：代词出现在其指代对象之前。

## 提示
type: tips
from: phases/05-nlp-foundations-to-advanced/25-entity-linking/docs/zh.md, phases/05-nlp-foundations-to-advanced/24-coreference-resolution/docs/zh.md, phases/05-nlp-foundations-to-advanced/07-pos-tagging-parsing/docs/zh.md

- 报告提及召回率和消歧准确率。80% 召回上做到 99%，整条流水线也约为 80%。
- 将共指簇合入 NER 实体，每个实体输出一个 KB 标识，而非每次提及一个。
- 将 LLM 实体链接约束在有效 KB 标识内。
- 在 20 个抽样输出上测试名词与动词歧义（`saw`、`book`、`can`）。
