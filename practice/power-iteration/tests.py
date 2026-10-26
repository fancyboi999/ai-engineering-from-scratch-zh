import numpy as np

from practice_check import check, close, equal, fixture, fixtures, true

M_EX = np.array([[4.0, 1.0, 0.0], [1.0, 3.0, 1.0], [0.0, 1.0, 2.0]])


def symmetric_with(eigenvalues, seed):
    rng = np.random.default_rng(seed)
    Q, _ = np.linalg.qr(rng.normal(size=(len(eigenvalues), len(eigenvalues))))
    return Q @ np.diag(eigenvalues) @ Q.T


@check("examples", '最大绝对值元素为负时，fix_sign 会翻转向量', '找到绝对值最大的元素。该元素为负时，将整个向量乘以 -1。')
def example_fix_sign(sub):
    close(sub.fix_sign(np.array([0.1, -0.9, 0.3])), [-0.1, 0.9, -0.3], what="调用 fix_sign 后的向量")
    close(sub.fix_sign(np.array([0.2, 0.7])), [0.2, 0.7], what="已符合符号规则的向量")


@check("examples", '3×3 示例的主特征对', "特征值是最终单位向量对应的瑞利商 v^T M v。结果向量中绝对值最大的元素为正。")
def example_power(sub):
    value, vector, iters = sub.power_iteration(M_EX, np.array([0.0, 0.0, -1.0]))
    close(value, 4.732050806909286, rtol=1e-9, what="特征值")
    close(vector, [0.78866387, 0.57736154, 0.21133613], rtol=0, atol=1e-7, what="特征向量")
    equal(int(iters), 26, what="迭代次数")


@check("examples", '循环在 num_iters 次后停止', '向量未收敛时，循环运行 num_iters 次并返回当前向量。')
def example_max_iters(sub):
    value, vector, iters = sub.power_iteration(M_EX, np.array([1.0, 1.0, 1.0]), num_iters=3)
    close(value, 4.71702331523475, rtol=1e-9, what="迭代 3 次后的特征值")
    close(vector, [0.73272722, 0.62549884, 0.26807093], rtol=0, atol=1e-7, what="迭代 3 次后的向量")
    equal(int(iters), 3, what="迭代次数")


@check("properties", '结果满足 M v = lambda v', '特征对满足 M v = lambda v，且向量长度必须为 1。')
def eigen_equation(sub):
    M = symmetric_with([6.0, 2.0, -1.0, 0.5], seed=0)
    rng = np.random.default_rng(10)
    value, vector, _ = sub.power_iteration(M, rng.normal(size=4))
    close(np.linalg.norm(vector), 1.0, rtol=1e-9, what="向量长度")
    close(M @ vector, value * vector, atol=1e-4, what="M v 与 lambda v 的比较结果")
    close(value, 6.0, rtol=1e-8, what="特征值")


@check("properties", '随机对称矩阵的特征值与 NumPy 一致', '幂迭代会找到绝对值最大的特征值。')
def matches_eigh(sub):
    rng = np.random.default_rng(1)
    for n in [3, 5, 8]:
        S = rng.normal(size=(n, n))
        M = S + S.T
        values, vectors = np.linalg.eigh(M)
        top = int(np.argmax(np.abs(values)))
        expected = vectors[:, top]
        expected = expected if expected[np.argmax(np.abs(expected))] > 0 else -expected
        value, vector, _ = sub.power_iteration(M, rng.normal(size=n), num_iters=2000)
        close(value, values[top], rtol=1e-6, what=f"n = {n} 时的特征值")
        close(vector, expected, atol=1e-3, what=f"n = {n} 时的特征向量")


@check("properties", '结果不受 v0 符号或尺度影响', '第一步会用范数归一化 v0，之后的符号规则会统一初始向量的符号。')
def start_invariance(sub):
    M = symmetric_with([5.0, 1.5, 1.0], seed=2)
    v0 = np.array([0.3, -0.4, 0.8])
    value_a, vector_a, iters_a = sub.power_iteration(M, v0)
    value_b, vector_b, iters_b = sub.power_iteration(M, -250.0 * v0)
    close(value_b, value_a, rtol=1e-12, what="以 -250 v0 为初值时的特征值")
    close(vector_b, vector_a, atol=1e-12, what="以 -250 v0 为初值时的特征向量")
    equal(int(iters_b), int(iters_a), what="以 -250 v0 为初值时的迭代次数")


@check("properties", '输入不会被修改', '如果函数修改输入数组，会破坏调用方的后续逻辑。')
def inputs_unchanged(sub):
    M = M_EX.copy()
    v0 = np.array([0.0, 0.0, -1.0])
    v = np.array([0.1, -0.9, 0.3])
    saved_m, saved_v0, saved_v = M.copy(), v0.copy(), v.copy()
    sub.power_iteration(M, v0)
    sub.fix_sign(v)
    close(M, saved_m, rtol=0, atol=0, what="调用后的 M")
    close(v0, saved_v0, rtol=0, atol=0, what="调用后的 v0")
    close(v, saved_v, rtol=0, atol=0, what="传给 fix_sign 的向量")


@check("edge", '主特征值为负', "主特征值为负时，向量每步都会变号。停止条件应将点积绝对值与 1 - tol 比较，并保留瑞利商的符号。")
def negative_dominant(sub):
    value, vector, iters = sub.power_iteration(np.diag([-5.0, 2.0, 1.0]), np.array([1.0, 1.0, 1.0]))
    close(value, -5.0, rtol=1e-9, what="特征值")
    close(vector, [1.0, 0.0, 0.0], atol=1e-5, what="特征向量")
    equal(int(iters), 14, what="迭代次数")


@check("edge", '零矩阵', 'M v 的范数小于 tol 时，返回 0.0、按符号规则调整后的当前向量，以及迭代次数。')
def zero_matrix(sub):
    value, vector, iters = sub.power_iteration(np.zeros((2, 2)), np.array([0.0, -2.0]))
    close(value, 0.0, what="特征值")
    close(vector, [0.0, 1.0], what="向量")
    equal(int(iters), 1, what="迭代次数")


@check("edge", '1×1 矩阵以及 fix_sign 中的并列', '1×1 矩阵会在一步内收敛。绝对值最大元素并列时，fix_sign 选第一个索引。')
def tiny_and_tie(sub):
    value, vector, iters = sub.power_iteration(np.array([[3.0]]), np.array([-2.0]))
    close(value, 3.0, what="特征值")
    close(vector, [1.0], what="向量")
    equal(int(iters), 1, what="迭代次数")
    close(sub.fix_sign(np.array([-0.5, 0.5])), [0.5, -0.5], what="对 [-0.5, 0.5] 调用 fix_sign 的结果")
    close(sub.fix_sign(np.array([0.5, -0.5])), [0.5, -0.5], what="对 [0.5, -0.5] 调用 fix_sign 的结果")


@fixture("matrices")
def matrices(ref):
    rng = np.random.default_rng(42)
    for n, scale, num_iters, tol in [(2, 1.0, 200, 1e-10), (4, 3.0, 200, 1e-10), (5, 0.5, 50, 1e-8), (6, 1.0, 500, 1e-12), (3, 100.0, 200, 1e-10), (7, 1.0, 10, 1e-10)]:
        eigenvalues = np.sort(rng.uniform(-1.0, 1.0, size=n))
        eigenvalues[-1] = 2.0 if rng.random() < 0.5 else -2.0
        M = symmetric_with(eigenvalues * scale, seed=int(rng.integers(0, 1000)))
        v0 = rng.normal(size=n) * 5.0
        value, vector, iters = ref.power_iteration(M, v0, num_iters=num_iters, tol=tol)
        yield {"M": M, "v0": v0, "num_iters": num_iters, "tol": tol}, {"value": value, "vector": vector, "iters": int(iters)}


@check("reference", '随机矩阵的特征对与参考实现一致', '多种矩阵大小、尺度和容差下，特征值、特征向量与迭代次数都与参考实现一致。')
def reference_power(sub):
    for case, expected in fixtures("matrices"):
        value, vector, iters = sub.power_iteration(case["M"], case["v0"], num_iters=case["num_iters"], tol=case["tol"])
        label = f"n = {case['M'].shape[0]}, num_iters = {case['num_iters']}, tol = {case['tol']}"
        close(value, expected["value"], rtol=1e-8, what=f"{label}时的特征值")
        close(vector, expected["vector"], atol=1e-8, what=f"{label}时的特征向量")
        true(abs(int(iters) - expected["iters"]) <= 1, f"{label}时的迭代次数错误", expected["iters"], int(iters))
