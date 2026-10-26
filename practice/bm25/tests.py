import math

import numpy as np

from practice_check import check, close, equal, fixture, fixtures, shape, true

CORPUS = [
    ["the", "cat", "sat"],
    ["the", "dog", "sat", "on", "the", "mat"],
    ["cat", "cat", "food"],
    ["dogs", "and", "cats"],
]


def lesson_idf(n_docs, n):
    return math.log(1 + (n_docs - n + 0.5) / (n + 0.5))


@check("examples", '三个词的 idf', 'idf(t) = ln(1 + (N - n + 0.5) / (n + 0.5))，其中 n 是至少包含一次 t 的文档数。')
def example_idf(sub):
    close(sub.idf(CORPUS, "cat"), 0.6931471805599453, what="'cat' 的 idf")
    close(sub.idf(CORPUS, "the"), 0.6931471805599453, what="'the' 的 idf")
    close(sub.idf(CORPUS, "zebra"), 2.302585092994046, what="'zebra' 的 idf")


@check("examples", '查询 cat sat 的分数', '每份文档对包含的每个查询词，累加 idf 乘 f (k1 + 1) / (f + k1 (1 - b + b dl / avgdl))。')
def example_scores(sub):
    close(sub.bm25_scores(CORPUS, ["cat", "sat"]), [1.5234004, 0.54578518, 1.05823997, 0.0], rtol=1e-7, what='分数')


@check("examples", '查询 cat sat 得分最高的三份文档', '按得分从高到低排序。分数相同时，索引较小的文档排在前面。')
def example_rank(sub):
    equal(list(sub.rank(CORPUS, ["cat", "sat"], 3)), [0, 2, 1], what='得分最高的三个索引')


@check("properties", '每份文档都有一个非负分数', '课程中的 idf 始终为正，所有词项权重也为正，因此分数大于或等于 0。')
def scores_shape(sub):
    rng = np.random.default_rng(0)
    vocab = [f"w{i}" for i in range(8)]
    corpus = [[vocab[j] for j in rng.integers(0, 8, size=rng.integers(1, 9))] for _ in range(7)]
    scores = np.asarray(sub.bm25_scores(corpus, ["w1", "w3", "w5"]), dtype=float)
    shape(scores, (7,), what='分数')
    true(np.all(scores >= 0), "存在负分数", "大于或等于 0 的分数", scores)


@check("properties", '不含查询词的文档得分为 0', 'BM25 只累加文档实际包含的词。不含任何查询词的文档得分为 0。')
def no_overlap(sub):
    corpus = [["a", "b"], ["c", "d", "e"], ["a", "f"]]
    scores = np.asarray(sub.bm25_scores(corpus, ["a"]), dtype=float)
    close(scores[1], 0.0, atol=0, what="不含 'a' 的文档分数")
    true(scores[0] > 0 and scores[2] > 0, "包含 'a' 的文档未得到正分数", "文档 0 和 2 的分数均为正", scores)


@check("properties", '单个词项的得分符合公式', '查询中只有一个词时，分数为 idf 乘 f (k1 + 1) / (f + k1 (1 - b + b dl / avgdl))。')
def single_term_formula(sub):
    corpus = [["x", "x", "y"], ["y", "z"], ["x", "y", "z", "z", "w"]]
    avg_dl = 10 / 3
    weight = lesson_idf(3, 2)
    expected = []
    for f, dl in [(2, 3), (0, 2), (1, 5)]:
        expected.append(weight * f * 2.2 / (f + 1.2 * (1 - 0.6 + 0.6 * dl / avg_dl)) if f else 0.0)
    close(sub.bm25_scores(corpus, ["x"], k1=1.2, b=0.6), expected, rtol=1e-9, what='k1 = 1.2、b = 0.6 时的分数')


@check("properties", '排序结果与分数顺序一致', 'rank 按 bm25_scores 从高到低返回文档索引，分数相同时索引较小者靠前。')
def rank_matches_scores(sub):
    rng = np.random.default_rng(1)
    vocab = [f"w{i}" for i in range(6)]
    corpus = [[vocab[j] for j in rng.integers(0, 6, size=rng.integers(1, 7))] for _ in range(9)]
    query = ["w0", "w2"]
    scores = np.asarray(sub.bm25_scores(corpus, query), dtype=float)
    expected = sorted(range(9), key=lambda i: (-scores[i], i))[:5]
    equal(list(sub.rank(corpus, query, 5)), expected, what='得分最高的五个索引')


@check("properties", '输入不会被修改', '计算得分时只读取语料和查询，不应排序、删除或增加 token。')
def inputs_unchanged(sub):
    corpus = [["b", "a", "a"], ["c"], ["a", "c", "b"]]
    query = ["c", "a", "c"]
    saved_corpus = [list(doc) for doc in corpus]
    saved_query = list(query)
    sub.idf(corpus, "a")
    sub.bm25_scores(corpus, query)
    sub.rank(corpus, query, 2)
    equal(corpus, saved_corpus, what='调用后的语料')
    equal(query, saved_query, what='调用后的查询')


@check("edge", 'b = 0 时关闭长度归一化', 'b = 0 时，文档长度不会影响分数。此处 document 0 中 the 出现一次，document 1 中出现两次。')
def b_zero(sub):
    close(sub.bm25_scores(CORPUS, ["the"], k1=1.2, b=0.0), [0.69314718, 0.95307737, 0.0, 0.0], rtol=1e-7, what='b = 0 时的分数')
    equal(list(sub.rank(CORPUS, ["the"], 4)), [1, 0, 2, 3], what="查询 'the' 的完整排序")


@check("edge", '重复查询词会重复计分', '查询是列表。词项每出现一次就累计一次权重，因此 cat cat 的得分是 cat 的两倍。')
def repeated_query_term(sub):
    once = np.asarray(sub.bm25_scores(CORPUS, ["cat"]), dtype=float)
    twice = np.asarray(sub.bm25_scores(CORPUS, ["cat", "cat"]), dtype=float)
    close(twice, 2.0 * once, rtol=1e-12, what='查询 cat cat 的分数')


@check("edge", '每篇文档都含有的词仍有正 idf', '对数中的 1 + 保证 idf 大于 0，即使该词出现在每篇文档中也是如此。')
def common_term(sub):
    corpus = [["a", "b"], ["a"], ["a", "c", "a"]]
    close(sub.idf(corpus, "a"), math.log(1 + 0.5 / 3.5), rtol=1e-12, what='出现在全部 3 份文档中的词的 idf')
    true(sub.idf(corpus, "a") > 0, "出现在每份文档中的词的 idf 不是正数", "正的 idf", sub.idf(corpus, "a"))


@check("edge", 'df 统计文档数，而不是词频', 'n 是包含该词的文档数。一个词在同一文档中出现 3 次，n 仍为 1。')
def df_counts_documents(sub):
    corpus = [["q", "q", "q"], ["r"], ["s", "r"]]
    close(sub.idf(corpus, "q"), lesson_idf(3, 1), rtol=1e-12, what='在一份文档中出现 3 次的词的 idf')


@check("edge", '空文档与不匹配的查询', '空文档长度为 0，得分也为 0。如果查询词没有出现在任何文档中，就不会增加分数；所有得分并列为 0，排序为 0、1、2。')
def empty_and_no_match(sub):
    corpus = [[], ["a", "b"], ["b"]]
    close(sub.bm25_scores(corpus, ["zzz"]), [0.0, 0.0, 0.0], atol=0, what='查询未知词时的分数')
    equal(list(sub.rank(corpus, ["zzz"], 3)), [0, 1, 2], what='所有分数为 0 时的排序')
    scores = np.asarray(sub.bm25_scores(corpus, ["b"]), dtype=float)
    close(scores[0], 0.0, atol=0, what='空文档的分数')


@fixture("corpora")
def corpora(ref):
    rng = np.random.default_rng(42)
    for n_docs, vocab_size, max_len, k1, b in [(3, 4, 4, 1.5, 0.75), (6, 6, 8, 1.2, 0.75), (8, 10, 12, 2.0, 0.5), (10, 5, 6, 0.9, 1.0)]:
        vocab = [f"t{i}" for i in range(vocab_size)]
        corpus = [[vocab[j] for j in rng.integers(0, vocab_size, size=rng.integers(1, max_len + 1))] for _ in range(n_docs)]
        query = [vocab[j] for j in rng.integers(0, vocab_size, size=3)]
        yield {"corpus": corpus, "query": query, "k1": k1, "b": b}, {
            "idf": [ref.idf(corpus, term) for term in vocab],
            "scores": ref.bm25_scores(corpus, query, k1, b),
            "rank": list(ref.rank(corpus, query, n_docs, k1, b)),
        }


@check("reference", 'idf、分数和排序与参考实现一致', '在多个 k1 和 b 参数设置下，这些函数对随机语料的结果都与参考实现一致。')
def reference_corpora(sub):
    for case, expected in fixtures("corpora"):
        corpus, query = case["corpus"], case["query"]
        label = f"文档数为 {len(corpus)}，查询为 {query}，k1 = {case['k1']}，b = {case['b']}"
        close([sub.idf(corpus, f"t{i}") for i in range(len(expected["idf"]))], expected["idf"], rtol=1e-9, what=f"{label} 时的 idf 值")
        close(sub.bm25_scores(corpus, query, case["k1"], case["b"]), expected["scores"], rtol=1e-9, atol=1e-12, what=f"{label} 时的分数")
        equal(list(sub.rank(corpus, query, len(corpus), case["k1"], case["b"])), expected["rank"], what=f"{label} 时的排序")
