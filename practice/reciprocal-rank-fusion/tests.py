from practice_check import check, close, equal, fixture, fixtures, raises, true

import numpy as np

BM25 = [3, 1, 4]
DENSE = [1, 5, 3]


def as_pairs(result):
    return [(int(doc_id), float(score)) for doc_id, score in result]


def check_fused(actual, expected, what):
    pairs = as_pairs(actual)
    equal([doc_id for doc_id, _ in pairs], [doc_id for doc_id, _ in expected], what=f"文档顺序（{what}）")
    close([score for _, score in pairs], [score for _, score in expected], rtol=1e-12, what=f"融合分数（{what}）")


@check("examples", 'k = 60 时两个列表的融合分数', '每个列表都会给其中的文档增加 1 / (k + rank)。列表首个文档的 rank 为 1。')
def example_scores(sub):
    scores = sub.rrf_scores([BM25, DENSE])
    equal(sorted(scores), [1, 3, 4, 5], what="分数字典中的文档 ID")
    close([scores[d] for d in (1, 3, 4, 5)], [0.03252247488101534, 0.032266458495966696, 0.015873015873015872, 0.016129032258064516], rtol=1e-12, what="文档 1、3、4、5 的分数")


@check("examples", '融合两个列表后的排序', 'fuse 按融合分数从高到低排序，并返回 (doc_id, score) 对。')
def example_fuse(sub):
    check_fused(sub.fuse([BM25, DENSE]), [(1, 0.03252247488101534), (3, 0.032266458495966696), (5, 0.016129032258064516), (4, 0.015873015873015872)], "融合后的排序")


@check("examples", '权重会缩放各列表贡献', '使用权重后，第 i 个列表的贡献为 weights[i] / (k + rank)。BM25 权重设为 2 时，文档 3 排在首位。')
def example_weights(sub):
    check_fused(sub.fuse([BM25, DENSE], weights=[2.0, 1.0]), [(3, 0.04865990111891751), (1, 0.048651507139079855), (4, 0.031746031746031744), (5, 0.016129032258064516)], "加权融合后的排序")


@check("properties", '所有列表中的文档都会得到分数', 'RRF 会对所有列表的并集进行评分。文档只出现在一个列表中时，仍会得到该列表的分数。')
def union_of_lists(sub):
    rankings = [[0, 1, 2], [5, 6], [], [2, 9]]
    equal(sorted(sub.rrf_scores(rankings)), [0, 1, 2, 5, 6, 9], what="已评分的文档 ID")
    equal(sorted(doc_id for doc_id, _ in as_pairs(sub.fuse(rankings))), [0, 1, 2, 5, 6, 9], what="融合结果中的文档 ID")


@check("properties", '单个列表会保留原有顺序', '只有一个列表时，rank 越大分数越低，因此融合后的顺序与原列表一致。')
def single_list(sub):
    ranking = [8, 2, 5, 0, 7]
    equal([doc_id for doc_id, _ in as_pairs(sub.fuse([ranking]))], ranking, what="单个列表融合后的顺序")
    close(sub.rrf_scores([ranking], k=10)[8], 1.0 / 11.0, rtol=1e-12, what="k = 10 时首个文档的分数")


@check("properties", '列表的顺序不影响结果', '融合分数是对各列表求和，因此调换列表顺序不会改变分数或排序。')
def list_order(sub):
    rng = np.random.default_rng(0)
    a = [int(x) for x in rng.permutation(10)[:6]]
    b = [int(x) for x in rng.permutation(10)[:7]]
    c = [int(x) for x in rng.permutation(10)[:4]]
    one = as_pairs(sub.fuse([a, b, c]))
    two = as_pairs(sub.fuse([c, a, b]))
    equal([d for d, _ in one], [d for d, _ in two], what="调换列表顺序后的排序")
    close([s for _, s in one], [s for _, s in two], rtol=1e-12, what="调换列表顺序后的分数")


@check("properties", '融合分数按降序排列', 'fuse 按融合分数从高到低返回文档。')
def descending(sub):
    rng = np.random.default_rng(1)
    rankings = [[int(x) for x in rng.permutation(15)[:n]] for n in (8, 12, 5)]
    scores = [s for _, s in as_pairs(sub.fuse(rankings))]
    true(all(x >= y for x, y in zip(scores, scores[1:])), "融合分数高于排在它前面的分数", "分数从高到低排列", scores)


@check("properties", '输入不会被修改', 'RRF 只读取列表，不得对其排序或修改。')
def inputs_unchanged(sub):
    rankings = [[4, 2, 9], [9, 4]]
    weights = [1.0, 0.5]
    sub.rrf_scores(rankings, 60, weights)
    sub.fuse(rankings, 60, weights)
    equal(rankings, [[4, 2, 9], [9, 4]], what="调用后的排名列表")
    equal(weights, [1.0, 0.5], what="调用后的权重")


@check("edge", '分数相同时较小 doc id 优先', '文档 7 和 2 在两个列表中的排名分别为 1 和 2，因此总分相同。doc id 较小的 2 排在前面。')
def tie_rule(sub):
    check_fused(sub.fuse([[7, 2], [2, 7]]), [(2, 0.03252247488101534), (7, 0.03252247488101534)], "分数相同时的排序")


@check("edge", 'k 较小时更强调靠前排名', 'k = 1 时，rank 1 的贡献为 1 / 2，rank 2 的贡献为 1 / 3。')
def small_k(sub):
    check_fused(sub.fuse([BM25, DENSE], k=1), [(1, 0.8333333333333333), (3, 0.75), (5, 0.3333333333333333), (4, 0.25)], "k = 1 时的排序")


@check("edge", '权重长度不正确时抛出 ValueError', '每个列表都必须有一个权重。zip 会静默丢弃多余项，导致有列表没有提示就被忽略。')
def bad_weights(sub):
    raises(ValueError, sub.rrf_scores, [[1, 2], [2, 3]], 60, [1.0])
    raises(ValueError, sub.fuse, [[1, 2]], 60, [1.0, 1.0])


@check("edge", '没有列表或列表均为空时没有文档', '没有可融合的内容时，rrf_scores 返回空字典，fuse 返回空列表。')
def empty_inputs(sub):
    equal(dict(sub.rrf_scores([])), {}, what="没有输入列表时的分数")
    equal(list(sub.fuse([[], []])), [], what="两个空列表融合后的排序")


@fixture("rankings")
def rankings(ref):
    rng = np.random.default_rng(42)
    for n_lists, n_docs, k, weighted in [(2, 6, 60, False), (3, 12, 60, True), (2, 20, 10, False), (4, 9, 1, True)]:
        lists = [[int(x) for x in rng.permutation(n_docs)[: int(rng.integers(1, n_docs + 1))]] for _ in range(n_lists)]
        weights = [float(w) for w in rng.uniform(0.5, 2.0, size=n_lists)] if weighted else None
        yield {"rankings": lists, "k": k, "weights": weights}, [[d, s] for d, s in ref.fuse(lists, k, weights)]


@check("reference", '融合排序与参考实现一致', '在不同长度列表、k 值和权重的随机用例中，融合顺序和分数都与参考实现一致。')
def reference_rankings(sub):
    for case, expected in fixtures("rankings"):
        label = f"{len(case['rankings'])} 个列表，k = {case['k']}，权重为 {case['weights']}"
        check_fused(sub.fuse(case["rankings"], case["k"], case["weights"]), [(int(d), float(s)) for d, s in expected], label)
