import numpy as np

from practice_check import check, close, equal, fixture, fixtures, shape, true

Q = np.array([[1.0, 0.0], [1.0, 1.0]])
D = np.array([[2.0, 0.0], [0.0, 3.0], [1.0, 1.0], [-1.0, 0.0]])


@check("examples", '归一化三行，其中一行为零向量', '每行都除以其 L2 范数。范数为 0 的行仍保持为零。')
def example_normalize(sub):
    close(sub.normalize_rows(np.array([[3.0, 4.0], [0.0, 0.0], [0.0, -2.0]])), [[0.6, 0.8], [0.0, 0.0], [0.0, -1.0]], what="归一化后的各行")


@check("examples", '两条查询与四份文档的相似度', '第 (i, j) 项是查询 i 与文档 j 夹角的余弦值，与向量长度无关。')
def example_similarity(sub):
    close(sub.cosine_similarity_matrix(Q, D), [[1.0, 0.0, 0.70710678, -1.0], [0.70710678, 0.70710678, 1.0, -0.70710678]], what="相似度矩阵")


@check("examples", '每条查询的 Top-2 文档', '按分数从高到低排序。分数相同时，索引较小的文档排在前面。')
def example_top_k(sub):
    equal(np.asarray(sub.top_k(Q, D, 2)), np.array([[0, 2], [2, 0]]), what="得分最高的两个索引")


@check("properties", '归一化后的行长度为 1 或 0', '归一化后，每个非零行的 L2 范数为 1，零行的范数仍为 0。')
def unit_rows(sub):
    rng = np.random.default_rng(0)
    X = rng.normal(size=(6, 5)) * rng.uniform(0.1, 50.0, size=(6, 1))
    X[3] = 0.0
    out = sub.normalize_rows(X)
    shape(out, X.shape, what="归一化后的各行")
    expected = np.ones(6)
    expected[3] = 0.0
    close(np.linalg.norm(out, axis=1), expected, atol=1e-12, what="各行的范数")


@check("properties", '缩放向量不会改变相似度', '余弦相似度不考虑向量长度。将查询或文档乘以正数，分数不变。')
def scale_invariance(sub):
    rng = np.random.default_rng(1)
    q = rng.normal(size=(3, 4))
    d = rng.normal(size=(5, 4))
    base = sub.cosine_similarity_matrix(q, d)
    shape(base, (3, 5), what="相似度矩阵")
    close(sub.cosine_similarity_matrix(q * 7.0, d * np.array([[0.5], [2.0], [9.0], [1.0], [0.1]])), base, atol=1e-12, what="缩放后的分数")


@check("properties", '分数在 -1 到 1 之间，向量与自身的分数为 1', '夹角余弦值的范围为 -1 到 1。向量与自身的夹角为 0，因此分数为 1。')
def bounded_scores(sub):
    rng = np.random.default_rng(2)
    X = rng.normal(size=(7, 6))
    scores = sub.cosine_similarity_matrix(X, X)
    true(np.all(np.abs(scores) <= 1.0 + 1e-12), "存在超出 -1 到 1 范围的分数", "values from -1 to 1", scores)
    close(np.diag(scores), np.ones(7), atol=1e-12, what="每个向量与自身的相似度")
    close(scores, scores.T, atol=1e-12, what="自身相似度矩阵的转置")


@check("properties", 'top_k 按分数从高到低返回结果', '第一项对应该行最高分，后续返回项的分数不会升高。')
def top_k_sorted(sub):
    rng = np.random.default_rng(3)
    q = rng.normal(size=(4, 8))
    d = rng.normal(size=(10, 8))
    idx = np.asarray(sub.top_k(q, d, 4))
    shape(idx, (4, 4), what="得分最高的四个索引")
    scores = sub.cosine_similarity_matrix(q, d)
    picked = np.take_along_axis(scores, idx, axis=1)
    true(np.all(np.diff(picked, axis=1) <= 0), "返回索引对应的分数出现了递增", "分数从高到低排列", picked)
    close(picked[:, 0], scores.max(axis=1), atol=0, rtol=0, what="首个索引对应的分数")


@check("properties", '输入不会被修改', '将结果归一化到新数组中。原地除法会修改调用方的向量。')
def inputs_unchanged(sub):
    q = np.array([[3.0, 4.0], [1.0, 2.0]])
    d = np.array([[0.0, 5.0], [2.0, 2.0], [0.0, 0.0]])
    saved_q, saved_d = q.copy(), d.copy()
    sub.normalize_rows(q)
    sub.cosine_similarity_matrix(q, d)
    sub.top_k(q, d, 2)
    close(q, saved_q, rtol=0, atol=0, what="调用后的 Q")
    close(d, saved_d, rtol=0, atol=0, what="调用后的 D")


@check("edge", '零向量文档得分为 0，并列时保留索引顺序', '零向量没有方向，因此相似度为 0。此处文档 0 和 2 的分数都为 0，索引较小者靠前。')
def zero_document(sub):
    q = np.array([[0.0, 1.0]])
    d = np.array([[0.0, 0.0], [0.0, 2.0], [5.0, 0.0], [0.0, -1.0]])
    close(sub.cosine_similarity_matrix(q, d), [[0.0, 1.0, 0.0, -1.0]], what="分数")
    equal(np.asarray(sub.top_k(q, d, 4)), np.array([[1, 0, 2, 3]]), what="完整排序")


@check("edge", '零向量查询与所有文档并列', '零查询与每份文档的分数都是 0。按并列规则，返回索引 0、1、2。')
def zero_query(sub):
    q = np.zeros((1, 3))
    d = np.array([[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [1.0, 1.0, 1.0]])
    equal(np.asarray(sub.top_k(q, d, 3)), np.array([[0, 1, 2]]), what="零向量查询的排序")


@check("edge", '重复文档会并列', '同一文档的两个副本得分相同，索引较小者靠前。')
def duplicate_documents(sub):
    q = np.array([[1.0, 2.0, 3.0]])
    d = np.array([[0.0, 1.0, 0.0], [2.0, 4.0, 6.0], [1.0, 2.0, 3.0], [2.0, 4.0, 6.0]])
    equal(np.asarray(sub.top_k(q, d, 3)), np.array([[1, 2, 3]]), what="得分最高的三个索引")


@check("edge", 'k = 1 和 k 等于文档总数', 'k = 1 时返回唯一最佳文档。k = n_docs 时返回完整排序。')
def k_bounds(sub):
    q = np.array([[1.0, 0.0]])
    d = np.array([[0.0, 1.0], [1.0, 0.1], [-1.0, 0.0]])
    equal(np.asarray(sub.top_k(q, d, 1)), np.array([[1]]), what="得分最高的索引")
    equal(np.asarray(sub.top_k(q, d, 3)), np.array([[1, 0, 2]]), what="完整排序")


@fixture("searches")
def searches(ref):
    rng = np.random.default_rng(42)
    for nq, nd, dim, k in [(1, 5, 3, 2), (3, 8, 4, 3), (4, 12, 16, 5), (2, 6, 2, 6)]:
        q = rng.normal(size=(nq, dim))
        d = rng.normal(size=(nd, dim))
        d[nd // 2] = 0.0
        yield {"Q": q, "D": d, "k": k}, {
            "Qn": ref.normalize_rows(q),
            "scores": ref.cosine_similarity_matrix(q, d),
            "top": ref.top_k(q, d, k),
        }


@check("reference", '归一化、分数和排序与参考实现一致', '在包含零向量文档的随机查询和文档上，各函数结果都与参考实现一致。')
def reference_searches(sub):
    for case, expected in fixtures("searches"):
        label = f"查询数为 {case['Q'].shape[0]}，文档数为 {case['D'].shape[0]}"
        close(sub.normalize_rows(case["Q"]), expected["Qn"], rtol=1e-9, atol=1e-12, what=f"{label} 时归一化后的查询")
        close(sub.cosine_similarity_matrix(case["Q"], case["D"]), expected["scores"], rtol=1e-9, atol=1e-12, what=f"{label} 时的分数")
        equal(np.asarray(sub.top_k(case["Q"], case["D"], case["k"])), expected["top"], what=f"得分最高的 {case['k']} 个索引（{label}）")
