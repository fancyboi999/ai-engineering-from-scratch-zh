# Evidence: cheatsheets/text-processing-classic.md
upstream_revision: 45fa4084de6ba2f88fa96a41e69efa2166f868b3

# 证据对照：经典文本处理与 TF-IDF

中文主题：[经典文本处理与 TF-IDF](../text-processing-classic.md)。下列逐条英文记录保留冻结上游版本的路径、行号与数值；标题对应中文主题。

原始记录中的 docs/en.md 和行号只在上述 upstream 版本有效，不代表当前 docs/zh.md 的行号，也不表示本次重新运行了命令、GPU 测量或外部模型。当前中文主题的 from 路径另由构建器校验。

Abbreviations: T01 = phases/05-nlp-foundations-to-advanced/01-text-processing, T02 = phases/05-nlp-foundations-to-advanced/02-bag-of-words-tfidf, T05 = phases/05-nlp-foundations-to-advanced/05-sentiment-analysis, T15 = phases/05-nlp-foundations-to-advanced/15-topic-modeling. d = docs/en.md, c = code/main.py.

## 经典文本流水线 (flow)

原始区块：Classic text pipeline (flow, 7 steps)
1. Tokenize, punctuation as standalone tokens: T01/d:24, 49
2. Stem for speed, lemmatize when meaning matters, POS needed: T01/d:30, 250
3. Negation scoping with NOT_ up to punctuation: T05/d:130
4. Bag of words, rows are documents, columns vocabulary: T02/d:22, 76
5. TF-IDF scales down ubiquitous words: T02/d:24, L2 rows and cosine as dot product: T02/d:142
6. Naive Bayes for baseline, logistic regression for production: T05/d:233
7. Per-class precision and recall, macro-F1, confusion matrix: T05/d:164-167

## 代码任务 (task-table)

原始区块：Tasks in code (task-table, 8)
- preprocess(text, pos_tagger=demo_pos_tagger): T01/c:48, 73
- stem_step_1a(word): T01/c:11
- lemmatize(word, pos), table with fallback: T01/c:37-45
- bag_of_words, build_vocab: T02/c:12, 21
- l2_normalize(tfidf(bow)): T02/c:76
- apply_negation(tokens): T05/d:137
- train_nb(docs_by_class, vocab, alpha=1.0): T05/d:64
- collapsed_gibbs_lda(docs, n_topics=3, n_iters=300, seed=42): T15/c:99

## NLTK：token、词干与词形 (annotated-code)

原始区块：NLTK: tokens, stems, lemmas (annotated-code, 8 lines)
- nltk.download punkt_tab, wordnet, averaged_perceptron_tagger_eng: T01/d:145-147
- word_tokenize, contractions and Unicode: T01/d:154, 173
- PorterStemmer().stem, all five phases: T01/d:155, 173
- pos_tag, Penn Treebank: T01/d:157, 173
- WordNetLemmatizer, lemmatize with nltk_pos_to_wordnet: T01/d:156, 170
- Mapping V to v, J to a, R to r, else n: T01/d:160-167

## scikit-learn 情感基线 (annotated-code)

原始区块：Sentiment baseline in scikit-learn (annotated-code, 10 lines)
- Pipeline with TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True, stop_words=None): T05/d:195-196
- LogisticRegression(C=1.0, max_iter=1000): T05/d:197
- pipe.fit, pipe.score: T05/d:199-200
- stop_words=None keeps negations, bigrams give not_good, sublinear_tf dampens, 75% to 85% on SST-2: T05/d:203

## 向量化器参数 (command-table)

原始区块：Vectorizer knobs (command-table, 8)
- CountVectorizer: T02/d:163
- TfidfVectorizer adds IDF and L2: T02/d:163
- ngram_range=(1, 2): T02/d:169
- min_df=2: T02/d:170
- max_df=0.95: T02/d:171
- stop_words="english", not for sentiment: T02/d:172
- sublinear_tf=True, 1 + log(tf): T02/d:173
- get_feature_names_out(): T02/d:155

## 主题模型 (annotated-code)

原始区块：Topic models (annotated-code, 10 lines)
- CountVectorizer(max_features, stop_words="english", min_df=2, max_df=0.9): T15/d:57-62
- LDA expects raw counts: T15/d:82
- X = cv.fit_transform(documents): T15/d:63
- LatentDirichletAllocation(n_components, random_state=42, max_iter=50, learning_method="online"): T15/d:64-69
- doc_topic = lda.fit_transform(X), rows sum to 1: T15/d:30, 70
- BERTopic(embedding_model=..., min_topic_size=15), library default 10: T15/d:89-91, 103
- topics, probs = topic_model.fit_transform(documents): T15/d:95
- get_topic_info, Topic -1 outlier bucket: T15/d:96, 103

## 公式 (concepts)

原始区块：Formulas (concepts, 8)
- TF-IDF formula: T02/d:26-31
- Smoothed IDF log((n+1)/(d+1)) + 1, IDF 1 for every-doc words: T02/d:98, 101
- L2 rows, long documents dominate otherwise: T02/d:142
- Naive Bayes log prior plus log word probs, max: T05/d:82-90
- Laplace (counts + alpha) / (total + alpha * |V|): T05/d:75-77, 93
- Logistic regression sigmoid(X @ w + b) >= 0.5: T05/d:101-102, 121
- Macro-F1 mean of per-class F1: T05/d:165
- c_v NPMI, cosine, higher is better: T15/d:109

## 默认值 (defaults)

原始区块：Defaults (defaults, 8)
- NB alpha 1.0 teaching default, 0.01 common: T05/d:93
- LR l2 0.01, start and tune: T05/d:105, 124
- epochs 500, lr 0.05: T05/d:105
- C 1.0, max_iter=1000: T05/d:197
- min_topic_size library default 10, 50 or 100 over 10,000 docs: T15/d:103
- Gibbs alpha 0.1, beta 0.01, must be positive: T15/c:13, 16-17
- n_iters 200, demo 300: T15/c:13, 99
- Topic count max(5, round(sqrt(n_docs))), clamp 200 under 40,000: T15/d:156

## 故障排查 (troubleshooting)

原始区块：Troubleshooting (troubleshooting, 8)
- Training / inference mismatch, ship preprocessing inside the model package: T01/d:211
- Reproducibility drift, pin versions, freeze 20 sentences: T01/d:209
- ponies to poni from the ies rule, step 1b fixes it: T01/d:80
- watched not in table, fallback only ing, use WordNet or spaCy: T01/d:122
- Negations dropped by stopwords, stop_words=None plus bigrams: T02/d:172, T05/d:203
- Micro-F1 on imbalance, macro-F1, AUPRC over 95-5: T05/d:170, 172
- LDA junk topics from stopwords and frequent terms: T15/d:158, min_df and max_df: T15/d:82
- -1 outlier cluster: T15/d:158, min_topic_size: T15/d:103, qualitative read: T15/d:111

## 按场景选择 (qa)

原始区块：Use X when (qa, 6)
- Stem for search indexing, lemmatize for user-read text: T01/d:30
- NLTK teaching and swapping, spaCy production speed: T01/d:201-202
- TF-IDF for spam, logs, low data, explainability: T02/d:177-180
- Transformer for sarcasm, sentiment shifts, aspects, low-resource languages: T05/d:207-210
- LDA long docs with mixtures, BERTopic short text: T15/d:117-118
- No GPU, LDA or NMF: T15/d:119

## 提示 (tips)

原始区块：Tips (tips, 3)
- Stay sparse, 100k documents dense does not fit: T02/d:163
- Pull 5 wrong predictions per class: T05/d:168
- Regenerate the baseline on your pipeline: T05/d:216
