import numpy as np

from practice_check import check, close, fixture, fixtures, shape, true

Q2 = np.array([[1.0, 0.0], [0.0, 1.0]])
K3 = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])
V3 = np.array([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]])


def standard_attention(Q, K, V, causal=False):
    scores = Q @ K.T / np.sqrt(Q.shape[1])
    if causal:
        scores = np.where(np.arange(K.shape[0])[None, :] > np.arange(Q.shape[0])[:, None], -np.inf, scores)
    top = np.max(scores, axis=1, keepdims=True)
    weights = np.exp(scores - top)
    total = np.sum(weights, axis=1, keepdims=True)
    return weights @ V / total, top[:, 0] + np.log(total[:, 0])


@check("examples", "块大小为 1、2 和 3 时输出一致", "分块注意力的计算结果是精确的。输出和 log-sum-exp 都与块大小无关。")
def example_blocks(sub):
    for block_size in [1, 2, 3]:
        output, lse = sub.flash_attention(Q2, K3, V3, block_size)
        close(output, [[3.0, 4.0], [3.40667256, 4.40667256]], rtol=1e-7, what=f"块大小为 {block_size} 时的输出")
        close(lse, [1.62062114, 1.62062114], rtol=1e-7, what=f"块大小为 {block_size} 时的 log-sum-exp")


@check("examples", "三个 token 的因果注意力", "causal = True 时，查询 i 会忽略所有满足 j > i 的键 j。")
def example_causal(sub):
    output, lse = sub.flash_attention(K3, K3, V3, 2, causal=True)
    close(output, [[1.0, 2.0], [2.3395231, 3.3395231], [3.51046953, 4.51046953]], rtol=1e-7, what="输出")
    close(lse, [0.70710678, 1.10794031, 2.1004053], rtol=1e-7, what="log-sum-exp")


@check("examples", "单步在线 softmax 更新", "新的最大值取旧最大值和当前块最大值中的较大者。旧总和与旧累加值都要乘以 exp(旧最大值减新最大值) 进行缩放。")
def example_step(sub):
    m = np.array([1.0, -np.inf])
    l = np.array([2.0, 0.0])
    acc = np.array([[1.0, 1.0], [0.0, 0.0]])
    scores = np.array([[3.0, 0.0], [-np.inf, 0.5]])
    v_block = np.array([[1.0, 0.0], [0.0, 1.0]])
    m_new, l_new, acc_new = sub.online_softmax_step(m, l, acc, scores, v_block)
    close(m_new, [3.0, 0.5], rtol=1e-12, what="新的累计最大值")
    close(l_new, [1.32045763, 1.0], rtol=1e-7, what="新的累计和")
    close(acc_new, [[1.13533528, 0.18512235], [0.0, 1.0]], rtol=1e-7, what="新的累加值")


@check("properties", "任意块大小都与标准注意力一致", "累计最大值和累计和使结果保持精确。块大小从 1 到 Tk + 2 时，输出都必须与标准注意力一致。")
def all_block_sizes(sub):
    rng = np.random.default_rng(0)
    Q = rng.normal(size=(5, 4))
    K = rng.normal(size=(7, 4))
    V = rng.normal(size=(7, 3))
    expected, expected_lse = standard_attention(Q, K, V)
    for block_size in range(1, 10):
        output, lse = sub.flash_attention(Q, K, V, block_size)
        shape(output, (5, 3), what=f"块大小为 {block_size} 时的输出")
        close(output, expected, rtol=1e-9, atol=1e-12, what=f"块大小为 {block_size} 时的输出")
        close(lse, expected_lse, rtol=1e-9, atol=1e-12, what=f"块大小为 {block_size} 时的 log-sum-exp")


@check("properties", "因果分块注意力与标准因果注意力一致", "在每个分块中按全局键索引应用掩码。对于查询 i，当键的全局索引满足 j > i 时，要屏蔽该键。")
def causal_all_blocks(sub):
    rng = np.random.default_rng(1)
    X = rng.normal(size=(6, 3))
    V = rng.normal(size=(6, 2))
    expected, expected_lse = standard_attention(X, X, V, causal=True)
    for block_size in [1, 2, 4, 6]:
        output, lse = sub.flash_attention(X, X, V, block_size, causal=True)
        close(output, expected, rtol=1e-9, atol=1e-12, what=f"块大小为 {block_size} 时的因果输出")
        close(lse, expected_lse, rtol=1e-9, atol=1e-12, what=f"块大小为 {block_size} 时的因果 log-sum-exp")


@check("properties", "分两步更新等于合并成一块更新", "在线更新满足结合律。将键分成两部分更新两次，所得状态应与将所有键合为一块更新一次相同。")
def step_associative(sub):
    rng = np.random.default_rng(2)
    scores = rng.normal(size=(3, 6)) * 4
    V = rng.normal(size=(6, 2))
    start = (np.full(3, -np.inf), np.zeros(3), np.zeros((3, 2)))
    one = sub.online_softmax_step(*start, scores, V)
    half = sub.online_softmax_step(*start, scores[:, :2], V[:2])
    two = sub.online_softmax_step(*half, scores[:, 2:], V[2:])
    for name, a, b in zip(["累计最大值", "累计和", "累加器"], two, one):
        close(a, b, rtol=1e-10, atol=1e-12, what=f"两步更新后的 {name}")


@check("properties", "输入保持不变", "若函数修改 Q、K、V 或调用方的累计状态，调用它的循环就会被破坏。")
def inputs_unchanged(sub):
    rng = np.random.default_rng(3)
    Q = rng.normal(size=(3, 2))
    K = rng.normal(size=(5, 2))
    V = rng.normal(size=(5, 2))
    saved = [Q.copy(), K.copy(), V.copy()]
    sub.flash_attention(Q, K, V, 2, causal=True)
    for name, before, after in zip(["Q", "K", "V"], saved, [Q, K, V]):
        true(np.array_equal(before, after), f"函数修改了{name}", before, after)
    m = np.array([0.5, 1.0])
    l = np.array([1.0, 2.0])
    acc = np.array([[1.0, 0.0], [0.0, 1.0]])
    state = [m.copy(), l.copy(), acc.copy()]
    sub.online_softmax_step(m, l, acc, np.array([[2.0], [0.0]]), np.array([[1.0, 1.0]]))
    for name, before, after in zip(["m", "l", "acc"], state, [m, l, acc]):
        true(np.array_equal(before, after), f"online_softmax_step 修改了输入 {name}", before, after)


@check("edge", "尚无可用键时遇到全屏蔽块", "当累计最大值和所有分数都为负无穷时，状态应保持 m = 负无穷、l = 0、acc = 0。在指数表达式中，用 0 代替负无穷的最大值，避免计算负无穷减负无穷。")
def fully_masked_first_block(sub):
    m_new, l_new, acc_new = sub.online_softmax_step(np.full(2, -np.inf), np.zeros(2), np.zeros((2, 3)), np.full((2, 2), -np.inf), np.ones((2, 3)))
    true(np.all(np.isneginf(np.asarray(m_new))), "累计最大值不为负无穷", "[-inf, -inf]", m_new)
    close(l_new, [0.0, 0.0], what="累计和")
    close(acc_new, np.zeros((2, 3)), what="累加值")


@check("edge", "分块中的极大分数不会溢出", "一个分块的分数约为 1414，下一块约为 -1414。必须保留截至当前所有分块的累计最大值。若只用当前块的最大值，会计算 exp(2828) 并溢出。")
def large_scores(sub):
    Q = np.array([[2000.0, 0.0]])
    K = np.array([[1.0, 0.0], [0.999, 0.0], [-1.0, 0.0], [0.0, 1.0]])
    V = np.array([[1.0, 0.0], [0.0, 1.0], [5.0, 5.0], [7.0, 7.0]])
    expected, expected_lse = standard_attention(Q, K, V)
    for block_size in [1, 2, 3]:
        output, lse = sub.flash_attention(Q, K, V, block_size)
        close(output, expected, rtol=1e-8, atol=1e-12, what=f"块大小为 {block_size} 时的输出")
        close(lse, expected_lse, rtol=1e-12, what=f"块大小为 {block_size} 时的 log-sum-exp")


@check("edge", "只有一个键，且块大小超过键的数量", "只有一个键时，它的权重为 1，输出就是对应的值行。块大小大于 Tk 时只会生成一个分块。")
def one_key(sub):
    V = np.array([[2.5, -1.0, 4.0]])
    output, lse = sub.flash_attention(np.array([[0.3, 0.7], [1.0, -2.0]]), np.array([[-1.0, 2.0]]), V, 8)
    close(output, np.vstack([V, V]), what="输出")
    close(lse, np.array([1.1, -5.0]) / np.sqrt(2.0), rtol=1e-12, what="log-sum-exp")


@fixture("cases")
def cases(ref):
    rng = np.random.default_rng(42)
    for tq, tk, d, dv, block_size, causal in [(3, 5, 4, 2, 2, False), (4, 7, 8, 3, 3, False), (6, 6, 4, 4, 4, True), (5, 9, 2, 2, 1, True), (2, 4, 16, 5, 7, False)]:
        Q = rng.normal(size=(tq, d))
        K = rng.normal(size=(tk, d))
        V = rng.normal(size=(tk, dv))
        output, lse = ref.flash_attention(Q, K, V, block_size, causal=causal)
        yield {"Q": Q, "K": K, "V": V, "block_size": block_size, "causal": causal}, {"output": output, "lse": lse}


@check("reference", "分块注意力在 5 个随机用例上与参考实现一致", "在多种张量形状、块大小和因果设置下，输出与 log-sum-exp 都应和参考实现一致。")
def reference_cases(sub):
    for case, expected in fixtures("cases"):
        label = f"Q 形状为 {case['Q'].shape}，K 形状为 {case['K'].shape}，block_size = {case['block_size']}，causal = {case['causal']}"
        output, lse = sub.flash_attention(case["Q"], case["K"], case["V"], case["block_size"], causal=case["causal"])
        close(output, expected["output"], rtol=1e-9, atol=1e-12, what=f"{label} 时的输出")
        close(lse, expected["lse"], rtol=1e-9, atol=1e-12, what=f"{label} 时的 log-sum-exp")
