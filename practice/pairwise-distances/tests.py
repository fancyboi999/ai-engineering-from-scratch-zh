import numpy as np

from practice_check import check, close, fixture, fixtures, shape, true

A_EX = np.array([[0.0, 0.0], [3.0, 4.0]])
B_EX = np.array([[3.0, 0.0], [0.0, 4.0], [3.0, 4.0]])


def brute_distances(A, B):
    out = np.zeros((A.shape[0], B.shape[0]))
    for i in range(A.shape[0]):
        for j in range(B.shape[0]):
            out[i, j] = np.sqrt(np.sum((A[i] - B[j]) ** 2))
    return out


@check("examples", '小型示例中的距离平方', '第 (i, j) 项是 A 的第 i 行与 B 的第 j 行之间的欧氏距离平方。')
def example_sq(sub):
    close(sub.pairwise_sq_distances(A_EX, B_EX), [[9.0, 16.0, 25.0], [16.0, 9.0, 0.0]], what="距离平方")


@check("examples", '小型示例中的距离', '距离等于距离平方的平方根。')
def example_dist(sub):
    close(sub.pairwise_distances(A_EX, B_EX), [[3.0, 4.0, 5.0], [4.0, 3.0, 0.0]], what="距离")


@check("examples", '小型示例中的余弦相似度', '包含零向量的点对相似度为 0。其他点对的相似度等于点积除以两个范数。')
def example_cos(sub):
    close(sub.cosine_similarity_matrix(A_EX, B_EX), [[0.0, 0.0, 0.0], [0.6, 0.8, 1.0]], what="余弦相似度")


@check("properties", '距离结果与逐点对循环一致', '向量化结果必须与逐个点对计算得到的距离相同。')
def matches_loop(sub):
    rng = np.random.default_rng(0)
    A = rng.normal(size=(5, 3))
    B = rng.normal(size=(7, 3))
    result = sub.pairwise_distances(A, B)
    shape(result, (5, 7), what="距离矩阵")
    close(result, brute_distances(A, B), rtol=1e-7, atol=1e-9, what="距离")


@check("properties", 'A 与自身的距离矩阵是对称矩阵', 'a 到 b 的距离等于 b 到 a 的距离，每个点到自身的距离为 0。')
def symmetric(sub):
    rng = np.random.default_rng(1)
    A = rng.normal(size=(6, 4))
    D = sub.pairwise_distances(A, A)
    close(D, D.T, atol=1e-9, what="矩阵减去自身转置的结果")
    close(np.diag(D), np.zeros(6), atol=1e-6, what="对角线")


@check("properties", '距离满足三角不等式', '任意三个点都满足 d(a, c) 不大于 d(a, b) + d(b, c)。')
def triangle(sub):
    rng = np.random.default_rng(2)
    A = rng.normal(size=(8, 3))
    D = sub.pairwise_distances(A, A)
    excess = D[:, None, :] - (D[:, :, None] + D[None, :, :])
    true(np.all(excess <= 1e-9), "两点间的距离大于经过第三点的路径长度", "d(a, c) <= d(a, b) + d(b, c)", float(np.max(excess)))


@check("properties", '余弦相似度与向量长度无关', '余弦相似度只取决于方向。将一行乘以正数不会改变相似度。')
def cosine_scale(sub):
    rng = np.random.default_rng(3)
    A = rng.normal(size=(4, 5))
    B = rng.normal(size=(3, 5))
    base = sub.cosine_similarity_matrix(A, B)
    close(sub.cosine_similarity_matrix(A * 7.0, B * 0.25), base, atol=1e-9, what="缩放后的相似度")
    true(np.all(np.abs(base) <= 1 + 1e-12), "存在超出 [-1, 1] 范围的余弦相似度", "-1 到 1 之间的值", base)


@check("properties", '输入不会被修改', '若函数修改输入数组，会破坏调用方后续逻辑。')
def inputs_unchanged(sub):
    A = np.array([[1.0, 2.0], [0.0, 0.0]])
    B = np.array([[-1.0, 0.5], [2.0, 2.0], [0.0, 3.0]])
    saved_a, saved_b = A.copy(), B.copy()
    sub.pairwise_sq_distances(A, B)
    sub.pairwise_distances(A, B)
    sub.cosine_similarity_matrix(A, B)
    close(A, saved_a, rtol=0, atol=0, what="调用后的 A")
    close(B, saved_b, rtol=0, atol=0, what="调用后的 B")


@check("edge", '远离原点的点也不会产生 NaN', '两个点相等时，舍入误差可能让展开式结果略小于 0。开平方前将距离平方截断到 0。')
def far_points(sub):
    rng = np.random.default_rng(4)
    for scale in [1e2, 1e3, 1e4]:
        X = rng.normal(size=(6, 5)) * scale + scale * 10
        sq = sub.pairwise_sq_distances(X, X)
        true(np.all(sq >= 0), "存在负的距离平方", "大于或等于 0 的值", sq)
        D = sub.pairwise_distances(X, X)
        true(np.all(np.isfinite(D)), "存在值为 NaN 的距离", "有限的距离值", D)


@check("edge", '零向量的余弦相似度为 0', '零向量的范数为 0。任何包含零向量的点对都应返回 0，而不是 NaN。')
def zero_rows(sub):
    A = np.array([[0.0, 0.0, 0.0], [1.0, 0.0, 0.0]])
    B = np.array([[0.0, 0.0, 0.0], [2.0, 0.0, 0.0], [0.0, -1.0, 0.0]])
    close(sub.cosine_similarity_matrix(A, B), [[0.0, 0.0, 0.0], [0.0, 1.0, 0.0]], what="相似度")


@check("edge", '每个输入都只有一行', 'A 和 B 都只有一行时，函数也必须正常工作，结果形状为 (1, 1)。')
def single_rows(sub):
    A = np.array([[1.0, -2.0, 2.0]])
    B = np.array([[1.0, -2.0, 2.0]])
    close(sub.pairwise_distances(A, B), [[0.0]], atol=1e-9, what="距离")
    close(sub.cosine_similarity_matrix(A, -B), [[-1.0]], what="与反向向量的相似度")


@fixture("pairs")
def pairs(ref):
    rng = np.random.default_rng(42)
    for n, m, d, scale in [(1, 4, 2, 1.0), (5, 3, 4, 2.0), (6, 6, 6, 1.0), (10, 7, 3, 5.0), (4, 9, 8, 0.5)]:
        A = rng.normal(size=(n, d)) * scale
        B = rng.normal(size=(m, d)) * scale
        if n > 2:
            A[1] = 0.0
        yield {"A": A, "B": B}, {
            "sq": ref.pairwise_sq_distances(A, B),
            "dist": ref.pairwise_distances(A, B),
            "cos": ref.cosine_similarity_matrix(A, B),
        }


@check("reference", '随机输入的距离与参考实现一致', '在多种形状的输入下，距离平方和距离都与参考实现一致。')
def reference_dist(sub):
    for case, expected in fixtures("pairs"):
        label = f"A 形状为 {case['A'].shape}，B 形状为 {case['B'].shape}"
        close(sub.pairwise_sq_distances(case["A"], case["B"]), expected["sq"], rtol=1e-7, atol=1e-9, what=f"{label}时的距离平方")
        close(sub.pairwise_distances(case["A"], case["B"]), expected["dist"], rtol=1e-7, atol=1e-7, what=f"{label}时的距离")


@check("reference", '余弦相似度与参考实现一致', '对相同输入，包括零行，余弦相似度矩阵都与参考实现一致。')
def reference_cos(sub):
    for case, expected in fixtures("pairs"):
        label = f"A 形状为 {case['A'].shape}，B 形状为 {case['B'].shape}"
        close(sub.cosine_similarity_matrix(case["A"], case["B"]), expected["cos"], rtol=1e-7, atol=1e-9, what=f"{label}时的相似度")
