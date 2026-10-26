(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-nlp3.js"] = {
  "pos-tagger": {
    "text": {
      "Motion reduced": "已减少动画",
      "POS TAGGER": "词性标注器",
      "tags drop onto tokens": "标签逐个落在 token 上",
      "Each token gets one grammatical category. A tagger sweeps the sentence left to right, dropping a label onto every word: determiner, noun, auxiliary, verb, adverb. Those tags are what a lemmatizer and a dependency parser read next.": "每个 token 获得一个语法类别。标注器从左到右扫描句子，为每个词赋予限定词、名词、助动词、动词或副词标签。词形还原器和依存分析器随后读取这些标签。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "The",
        "reason": "词性标注语料"
      },
      {
        "text": "DET",
        "reason": "词性标签枚举"
      },
      {
        "text": "cats",
        "reason": "词性标注语料"
      },
      {
        "text": "NOUN",
        "reason": "词性标签枚举"
      },
      {
        "text": "were",
        "reason": "词性标注语料"
      },
      {
        "text": "AUX",
        "reason": "词性标签枚举"
      },
      {
        "text": "running",
        "reason": "词性标注语料"
      },
      {
        "text": "VERB",
        "reason": "词性标签枚举"
      },
      {
        "text": "fast",
        "reason": "词性标注语料"
      },
      {
        "text": "ADV",
        "reason": "词性标签枚举"
      }
    ]
  },
  "dependency-arcs": {
    "text": {
      "Motion reduced": "已减少动画",
      "DEPENDENCY PARSE": "依存分析",
      "arcs draw themselves": "依存弧逐条绘制",
      "Dependency parsing draws one labeled arc from each word to its head. The verb \"running\" is the root; \"cats\" is its subject, \"were\" its auxiliary, and the prepositional phrase hangs off it. Every edge is a (head, dependent, relation) triple.": "依存分析从每个词向其中心词绘制带标签的弧。动词 \"running\" 为根，\"cats\" 为主语，\"were\" 为助动词，介词短语挂在它下面。每条边都是（中心词、依存词、关系）三元组。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "cats",
        "reason": "词性标注语料"
      },
      {
        "text": "were",
        "reason": "词性标注语料"
      },
      {
        "text": "running",
        "reason": "词性标注语料"
      },
      {
        "text": "dawn",
        "reason": "依存分析语料"
      },
      {
        "text": "nsubj",
        "reason": "依存关系标签"
      },
      {
        "text": "aux",
        "reason": "依存关系标签"
      },
      {
        "text": "prep",
        "reason": "依存关系标签"
      },
      {
        "text": "pobj",
        "reason": "依存关系标签"
      }
    ]
  },
  "summarize-collapse": {
    "text": {
      "Motion reduced": "已减少动画",
      "SUMMARIZATION": "摘要",
      "a long bar collapses into a short one": "长文条缩为短文条",
      "Extractive summarization ranks every sentence and lifts the few most central ones, in order. The long document collapses to a handful of verbatim lines. Abstractive systems instead rewrite; they read fluently but can fabricate facts the source never stated.": "抽取式摘要给每句排序，按原顺序提取最核心的少数句子，长文变成几行原文。生成式系统则改写内容，读起来流畅，却可能编造原文从未陈述的事实。",
      "document": "文档",
      "summary": "摘要",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": []
  },
  "qa-span": {
    "text": {
      "Motion reduced": "已减少动画",
      "EXTRACTIVE QA": "抽取式问答",
      "span highlights in the passage": "在段落中高亮答案区间",
      "Extractive QA never invents an answer. Two heads predict the start and end token of a span inside the given passage; the model sweeps the text and lights up the contiguous run between them. The answer is lifted verbatim, so it cannot hallucinate.": "抽取式问答不编造答案。两个头预测给定段落中答案区间的起始和结束 token，模型扫描文本并高亮两端之间的连续内容。答案逐字提取，因此不会凭空生成。",
      "answer: \"June 29, 2007\"": "答案：\"June 29, 2007\"",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^answer:\\ \"June\\ ([-+]?\\d+(?:[.,]\\d+)*),\\ ([-+]?\\d+(?:[.,]\\d+)*)\"$",
        "答案：\"June $1, $2\""
      ]
    ],
    "preserve": [
      {
        "text": "Q:  When did the first iPhone launch?",
        "reason": "抽取式问答问题语料，与原文token对齐"
      },
      {
        "text": "The first iPhone was announced in",
        "reason": "抽取式问答原始语料，与答案区间对齐"
      },
      {
        "text": "January 2007 and launched on",
        "reason": "抽取式问答原始语料，与答案区间对齐"
      },
      {
        "text": "June 29, 2007 to long queues.",
        "reason": "抽取式问答原始语料，与答案区间对齐"
      }
    ]
  },
  "topic-drift": {
    "text": {
      "Motion reduced": "已减少动画",
      "TOPIC MODELING": "主题建模",
      "words drift into clusters": "词语逐渐聚成簇",
      "Unsupervised topic modeling needs no labels. Scattered vocabulary drifts together by co-occurrence or embedding similarity into a few coherent groups; each cluster, read by its top words, names a latent topic the corpus is \"about\".": "无监督主题建模不需要标签。分散的词汇按共现关系或嵌入相似度聚成少量连贯簇；读取每簇的高权重词，就能为语料隐含讨论的主题命名。",
      "sports": "体育",
      "finance": "金融",
      "travel": "旅行",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "goal",
        "reason": "主题建模语料单词"
      },
      {
        "text": "team",
        "reason": "主题建模语料单词"
      },
      {
        "text": "score",
        "reason": "主题建模语料单词"
      },
      {
        "text": "stock",
        "reason": "主题建模语料单词"
      },
      {
        "text": "bond",
        "reason": "主题建模语料单词"
      },
      {
        "text": "yield",
        "reason": "主题建模语料单词"
      },
      {
        "text": "flight",
        "reason": "主题建模语料单词"
      },
      {
        "text": "hotel",
        "reason": "主题建模语料单词"
      },
      {
        "text": "visa",
        "reason": "主题建模语料单词"
      }
    ]
  },
  "constrained-decoder": {
    "text": {
      "Motion reduced": "已减少动画",
      "CONSTRAINED DECODING": "受约束解码",
      "invalid tokens masked to −∞": "无效 token 屏蔽为 −∞",
      "A logit processor sits between the model and the sampler. At each step it asks the grammar which tokens are legal and sets every invalid logit to negative infinity. The softmax then puts mass only on valid continuations, so the output is structurally correct by construction.": "logit 处理器位于模型和采样器之间。每一步向语法查询合法 token，将所有无效 logit 设为负无穷。softmax 只给合法后续项分配概率，因此输出从构造时就符合结构。",
      "emitted:  { \"ok\":": "已输出：{ \"ok\":",
      "grammar wants a boolean → mask everything else": "语法要求布尔值 → 屏蔽其他所有项",
      "sampled from valid set → \"true\"": "从合法集合采样 → \"true\"",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "true",
        "reason": "JSON布尔字面量"
      },
      {
        "text": "false",
        "reason": "JSON布尔字面量"
      },
      {
        "text": "\"yes\"",
        "reason": "JSON字符串样例"
      },
      {
        "text": "-inf",
        "reason": "负无穷数值表示"
      },
      {
        "text": "null",
        "reason": "JSON空值字面量"
      }
    ]
  },
  "nli-router": {
    "text": {
      "Motion reduced": "已减少动画",
      "NATURAL LANGUAGE INFERENCE": "自然语言推断",
      "pair routes to one label": "句对路由到一个标签",
      "NLI takes a premise t and a hypothesis h and routes the pair to exactly one of three labels: entailment, neutral, or contradiction. The same classifier powers hallucination checks, grounded-QA verification, and zero-shot labeling.": "NLI 接收前提 t 和假设 h，将句对分到蕴含、中立或矛盾三类之一。同一分类器也用于幻觉检查、有依据问答的验证和零样本标注。",
      "entailment": "蕴含",
      "neutral": "中立",
      "contradiction": "矛盾",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "t:  The cat is on the mat",
        "reason": "NLI前提语料，保持与假设语义配对"
      },
      {
        "text": "h:  There is a cat",
        "reason": "NLI假设语料，保持与前提语义配对"
      },
      {
        "text": "NLI",
        "reason": "NLI技术缩写"
      }
    ]
  },
  "coref-links": {
    "text": {
      "Motion reduced": "已减少动画",
      "COREFERENCE": "共指消解",
      "mentions link to one entity": "多个提及链接到同一实体",
      "Three surface forms — \"He\", \"the CEO\", \"Cook\" — all point at the same person. Coreference resolution draws a link from every mention back into one cluster, so downstream NER, QA, and knowledge graphs count them as a single entity.": "\"He\"、\"the CEO\"、\"Cook\" 三种表面形式都指向同一个人。共指消解将每次提及链接到同一个簇，使下游 NER、问答和知识图谱把它们计为一个实体。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "Tim Cook",
        "reason": "实体人名"
      },
      {
        "text": "the CEO",
        "reason": "共指消解提及语料"
      },
      {
        "text": "Cook",
        "reason": "实体人名片段"
      }
    ]
  },
  "relation-triples": {
    "text": {
      "Motion reduced": "已减少动画",
      "RELATION EXTRACTION": "关系抽取",
      "text → (subject, relation, object)": "文本 →（主体、关系、客体）",
      "Relation extraction anchors entity spans in the text, then snaps them into typed edges. \"Tim Cook\" and \"Apple\" become nodes; the verb phrase becomes the labeled edge between them. Aggregate the triples and you have a knowledge graph.": "关系抽取先锚定文本中的实体区间，再形成有类型的边。\"Tim Cook\" 和 \"Apple\" 成为节点，动词短语成为两者间带标签的边。汇总这些三元组，就得到知识图谱。",
      "employer": "雇主",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "\"Tim Cook became CEO of Apple.\"",
        "reason": "关系抽取原始语句，保留实体区间与谓词配对"
      },
      {
        "text": "Tim Cook",
        "reason": "实体人名"
      },
      {
        "text": "Apple",
        "reason": "公司实体名"
      }
    ]
  }
};
