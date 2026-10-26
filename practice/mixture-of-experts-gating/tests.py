import numpy as np

from practice_check import check, close, equal, fixture, fixtures, numeric_grad, shape, true

L3 = np.array([[2.0, 1.0, 0.5, -1.0], [0.0, 3.0, 3.0, 1.0], [1.0, 1.0, 1.0, 1.0]])


def full_softmax(x):
    e = np.exp(x - np.max(x, axis=-1, keepdims=True))
    return e / np.sum(e, axis=-1, keepdims=True)


def no_ties(rng, t, e):
    return rng.normal(size=(t, e)) + np.arange(e) * 1e-3


@check("examples", "将三个 token 分别路由到 4 个专家中得分最高的两个", "每行选择 logit 最大的 k 个专家，并按降序排列。并列时索引较小者优先。门控权重只对选中的 k 个 logit 计算 softmax。")
def example_route(sub):
    top_idx, gates = sub.route(L3, 2)
    equal(np.asarray(top_idx), np.array([[0, 1], [1, 2], [0, 1]]), what="选中的专家")
    close(gates, [[0.73105858, 0.26894142], [0.5, 0.5], [0.5, 0.5]], rtol=1e-7, what="门控权重")


@check("examples", '相同 logits 对应的负载均衡损失', '损失为 E 乘以各专家 f_i * P_i 之和。f_i 是 T * k 次分配中进入专家 i 的比例，P_i 是该专家完整 softmax 概率的均值。')
def example_loss(sub):
    close(sub.load_balancing_loss(L3, 2), 1.2008139315343698, rtol=1e-9, what="top_k = 2 时的损失")
    close(sub.load_balancing_loss(L3, 1), 1.1983721362825372, rtol=1e-9, what="top_k = 1 时的损失")


@check("examples", 'logit 相同时损失为 1', '所有 logit 相同时，每个专家的 P_i 都为 1 / E。所有 f_i 之和为 1，因此损失为 E * 1 / E，即 1。')
def example_equal(sub):
    close(sub.load_balancing_loss(np.zeros((5, 4)), 2), 1.0, rtol=1e-12, what="logits 全为零时的损失")


@check("properties", "门控权重是在选中专家上重新归一化的 softmax", "每行门控权重之和为 1。每个门控权重等于该专家的完整 softmax 概率除以选中的 k 个专家的概率总和。")
def gates_renormalized(sub):
    rng = np.random.default_rng(0)
    logits = no_ties(rng, 6, 8)
    top_idx, gates = sub.route(logits, 3)
    shape(top_idx, (6, 3), what="top_idx")
    shape(gates, (6, 3), what="门控权重")
    probs = np.take_along_axis(full_softmax(logits), np.asarray(top_idx), axis=-1)
    close(gates, probs / probs.sum(axis=-1, keepdims=True), atol=1e-12, what="门控权重")
    close(np.sum(gates, axis=-1), np.ones(6), atol=1e-12, what="各行门控权重之和")


@check("properties", '选中的专家是 logit 最大的 k 个，并按降序排列', 'top_idx 中包含 k 个不同专家索引。对应 logits 从左到右不增。未选中专家的 logit 都不高于已选中的专家。')
def chosen_are_top(sub):
    rng = np.random.default_rng(1)
    logits = no_ties(rng, 10, 6)
    top_idx, gates = sub.route(logits, 2)
    top_idx = np.asarray(top_idx)
    true(np.issubdtype(top_idx.dtype, np.integer), "top_idx 必须包含整数", "整数数据类型", top_idx.dtype)
    for t in range(10):
        chosen = logits[t, top_idx[t]]
        rest = np.delete(logits[t], top_idx[t])
        true(len(set(top_idx[t].tolist())) == 2, f"token {t} 重复选中了同一个专家", "两个不同的专家", top_idx[t])
        true(np.all(np.diff(chosen) <= 0), f"token {t} 选中的专家没有按 logit 从高到低排列", "按降序排列的 logits", chosen)
        true(chosen.min() >= rest.max(), f"token {t} 跳过了 logit 更大的专家", f"不小于 {rest.max()} 的 logits", chosen)


@check("properties", '均匀分配的损失恰好为 1', '每个专家获得相同分配数量时，所有 f_i 都为 1 / E。此时损失等于 P_i 之和，也就是 1，与概率分布无关。')
def uniform_dispatch(sub):
    rng = np.random.default_rng(2)
    logits = rng.normal(size=(4, 4)) * 0.3 + np.eye(4) * 5.0
    close(sub.load_balancing_loss(logits, 1), 1.0, rtol=1e-12, what="每个专家各分配一个 token 时的损失")


@check("properties", '损失梯度与论文公式一致', 'f_i 来自计数，因此没有梯度。梯度只通过 P_i 传播。对 token t 和专家 j，梯度为 E / T * p_tj * (f_j - sum_i(f_i p_ti))。')
def loss_gradient(sub):
    rng = np.random.default_rng(3)
    logits = no_ties(rng, 5, 4) * 2.0
    T, E = logits.shape
    p = full_softmax(logits)
    counts = np.zeros(E)
    for row in logits:
        counts[np.argsort(-row, kind="stable")[:2]] += 1
    f = counts / (T * 2)
    expected = E / T * p * (f[None, :] - (p @ f)[:, None])
    grad = numeric_grad(lambda z: sub.load_balancing_loss(z, 2), logits, eps=1e-6)
    close(grad, expected, rtol=1e-5, atol=1e-8, what="损失的有限差分梯度")


@check("properties", '输入不会被修改', 'route 和 load_balancing_loss 不得修改 logits 数组。')
def inputs_unchanged(sub):
    rng = np.random.default_rng(4)
    logits = rng.normal(size=(5, 6))
    saved = logits.copy()
    sub.route(logits, 2)
    sub.load_balancing_loss(logits, 2)
    true(np.array_equal(saved, logits), "函数修改了 logits", saved, logits)


@check("edge", '并列时索引较小的专家优先', "三个专家的 logit 并列最大时，选择索引最小的两个，且两者的门控权重相同。")
def ties(sub):
    top_idx, gates = sub.route(np.array([[0.0, 5.0, 5.0, 5.0]]), 2)
    equal(np.asarray(top_idx), np.array([[1, 2]]), what="选中的专家")
    close(gates, [[0.5, 0.5]], what="门控权重")


@check("edge", '大 logit 不会溢出', 'float64 中 exp(1000) 会溢出。调用 np.exp 前减去选中专家 logits 的行最大值。')
def large_logits(sub):
    logits = np.array([[1000.0, 999.0, -1000.0]])
    top_idx, gates = sub.route(logits, 2)
    equal(np.asarray(top_idx), np.array([[0, 1]]), what="选中的专家")
    close(gates, [[0.73105858, 0.26894142]], rtol=1e-7, what="门控权重")
    close(sub.load_balancing_loss(logits, 2), 1.5, rtol=1e-9, what="损失")


@check("edge", 'top_k 等于专家数', "k = E 时会选中所有专家，因此门控权重是按降序排列的完整 softmax，且每个 f_i 为 1 / E。")
def k_equals_e(sub):
    logits = np.array([[0.5, 2.0, -1.0]])
    top_idx, gates = sub.route(logits, 3)
    equal(np.asarray(top_idx), np.array([[1, 0, 2]]), what="选中的专家")
    close(gates, full_softmax(logits)[:, [1, 0, 2]], rtol=1e-12, what="门控权重")
    close(sub.load_balancing_loss(logits, 3), 1.0, rtol=1e-12, what="损失")


@check("edge", '所有 token 都选择同一个专家', '所有 token 都以高概率路由到专家 0 时，f_0 为 1，P_0 接近 1，损失接近最大值 E。')
def collapse(sub):
    logits = np.array([[8.0, 0.0, 0.0], [7.0, 0.0, 1.0], [9.0, 2.0, 0.0], [6.0, 0.0, 0.0]])
    close(sub.load_balancing_loss(logits, 1), 2.9924873086504276, rtol=1e-9, what="损失")
    top_idx, gates = sub.route(logits[:1], 1)
    close(gates, [[1.0]], what="只选中一个专家时的门控权重")


@fixture("cases")
def cases(ref):
    rng = np.random.default_rng(42)
    for t, e, k in [(1, 4, 1), (6, 4, 2), (8, 8, 2), (5, 6, 3), (12, 16, 4)]:
        logits = rng.normal(size=(t, e)) * 2.0
        top_idx, gates = ref.route(logits, k)
        yield {"logits": logits, "top_k": k}, {"top_idx": top_idx, "gates": gates, "loss": ref.load_balancing_loss(logits, k)}


@check("reference", '5 个随机用例的路由和损失与参考实现一致', "选中的专家、门控权重和损失都与参考实现一致。")
def reference_cases(sub):
    for case, expected in fixtures("cases"):
        label = f"logits 形状为 {case['logits'].shape}，top_k = {case['top_k']}"
        top_idx, gates = sub.route(case["logits"], case["top_k"])
        equal(np.asarray(top_idx), expected["top_idx"], what=f"{label} 时选中的专家")
        close(gates, expected["gates"], rtol=1e-9, what=f"{label}时的门控权重")
        close(sub.load_balancing_loss(case["logits"], case["top_k"]), expected["loss"], rtol=1e-9, what=f"{label}时的损失")
