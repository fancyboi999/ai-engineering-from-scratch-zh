import numpy as np

from practice_check import check, close, equal, fixture, fixtures, true

P0 = np.array([1.0, -2.0, 0.5])
G0 = np.array([0.1, -0.3, 2.0])
G1 = np.array([0.2, 0.1, -1.0])


def state_of(sub, params):
    state = sub.init_adam_state(params)
    true(isinstance(state, dict) and {"m", "v", "t"} <= set(state), "init_adam_state 必须返回包含 m、v 和 t 三个键的字典", "{'m': ..., 'v': ..., 't': 0}", state)
    return state


@check("examples", '初始状态', '初始状态中的 m、v 是与 params 同形状的零数组，t 为 0。')
def example_init(sub):
    state = state_of(sub, P0)
    close(state["m"], [0.0, 0.0, 0.0], what="m")
    close(state["v"], [0.0, 0.0, 0.0], what="v")
    equal(state["t"], 0, what="t")


@check("examples", 'Adam 的第一次更新', '第一步的偏差修正使用 t = 1，因此 m_hat 等于梯度，v_hat 等于梯度平方。')
def example_first(sub):
    params, state = sub.adam_step(P0, G0, state_of(sub, P0), lr=0.1)
    close(params, [0.90000001, -1.9, 0.4], what='一步更新后的参数')
    close(state["m"], [0.01, -0.03, 0.2], what='一步更新后的 m')
    close(state["v"], [1e-05, 9e-05, 4e-03], what='一步更新后的 v')
    equal(state["t"], 1, what='一步更新后的 t')


@check("examples", 'Adam 的第二次更新', '第二步使用 t = 2。动量会保留第一步的历史。')
def example_second(sub):
    params, state = sub.adam_step(P0, G0, state_of(sub, P0), lr=0.1)
    params, state = sub.adam_step(params, G1, state, lr=0.1)
    close(params, [0.80348181, -1.85997815, 0.3733663], what='两步更新后的参数')
    close(state["m"], [0.029, -0.017, 0.08], what='两步更新后的 m')
    close(state["v"], [4.999e-05, 9.991e-05, 4.996e-03], what='两步更新后的 v')
    equal(state["t"], 2, what='两步更新后的 t')


@check("examples", 'AdamW 的第一次更新', 'AdamW 先用 1 减去 lr 乘以 weight_decay 的结果乘参数，再减去 Adam 更新量。')
def example_adamw(sub):
    params, _ = sub.adam_step(P0, G0, state_of(sub, P0), lr=0.1, weight_decay=0.5)
    close(params, [0.85000001, -1.8, 0.375], what='AdamW 一步更新后的参数')


@check("properties", '偏差修正会消除初始偏差', '每步梯度 g 相同时，每一步的 m_hat 等于 g，v_hat 等于 g 的平方。因此每步更新量为 lr 乘 g，再除以 abs(g) 加 epsilon。')
def constant_gradient(sub):
    grads = np.array([0.5, -0.02, 3.0])
    params = np.zeros(3)
    state = state_of(sub, params)
    step = 0.01 * grads / (np.abs(grads) + 1e-8)
    for k in range(1, 6):
        new_params, state = sub.adam_step(params, grads, state, lr=0.01)
        close(params - new_params, step, rtol=1e-9, what=f"第 {k} 步的参数变化量")
        params = new_params


@check("properties", '状态符合动量公式', 'm 等于 beta1 乘旧 m 加上 (1 减 beta1) 乘 g。v 等于 beta2 乘旧 v 加上 (1 减 beta2) 乘 g 平方。t 每步加 1。')
def moment_formulas(sub):
    rng = np.random.default_rng(5)
    params = rng.normal(size=(2, 3))
    state = {"m": rng.normal(size=(2, 3)), "v": rng.random(size=(2, 3)), "t": 7}
    grads = rng.normal(size=(2, 3))
    _, new_state = sub.adam_step(params, grads, state, lr=0.01, beta1=0.8, beta2=0.95)
    close(new_state["m"], 0.8 * state["m"] + 0.2 * grads, what='新的 m')
    close(new_state["v"], 0.95 * state["v"] + 0.05 * grads ** 2, what='新的 v')
    equal(new_state["t"], 8, what='新的 t')


@check("properties", '权重衰减与梯度解耦', '梯度为零时 Adam 更新量为 0。此时 AdamW 只会用 1 减 lr 乘 weight_decay 的结果乘以参数。不要把衰减项加进梯度。')
def decoupled_decay(sub):
    params = np.array([4.0, -2.0, 1.0])
    new_params, _ = sub.adam_step(params, np.zeros(3), state_of(sub, params), lr=0.1, weight_decay=0.2)
    close(new_params, params * (1 - 0.1 * 0.2), rtol=1e-12, what='零梯度衰减更新后的参数')


@check("properties", '输入不会被修改', 'adam_step 会返回新数组和新状态，不会写入 params、grads 或旧状态数组。')
def inputs_unchanged(sub):
    params = np.array([1.0, 2.0, 3.0])
    grads = np.array([0.3, -0.2, 0.1])
    state = {"m": np.array([0.1, 0.1, 0.1]), "v": np.array([0.2, 0.2, 0.2]), "t": 3}
    saved = (params.copy(), grads.copy(), state["m"].copy(), state["v"].copy())
    sub.adam_step(params, grads, state, lr=0.1, weight_decay=0.1)
    close(params, saved[0], atol=0, rtol=0, what='调用后的 params')
    close(grads, saved[1], atol=0, rtol=0, what='调用后的 grads')
    close(state["m"], saved[2], atol=0, rtol=0, what='调用后的旧 m')
    close(state["v"], saved[3], atol=0, rtol=0, what='调用后的旧 v')
    equal(state["t"], 3, what='调用后的旧 t')


@check("edge", '零梯度不会产生更新或 NaN', '第一步的 g = 0 时，m_hat 和 v_hat 都是 0。更新量为 0 除以 epsilon，结果仍是 0。')
def zero_gradient(sub):
    params = np.array([[1.0, -1.0], [0.0, 2.0]])
    new_params, state = sub.adam_step(params, np.zeros((2, 2)), state_of(sub, params), lr=0.1)
    close(new_params, params, atol=0, rtol=0, what='零梯度更新后的参数')
    close(state["v"], np.zeros((2, 2)), what='零梯度更新后的 v')


@check("edge", '极小梯度仍会产生约 lr 的更新', 'Adam 用 v_hat 的平方根加 epsilon 作为分母，epsilon 在根号外。梯度为 1e-6 时，参数仍会移动约 0.99 倍 lr。')
def tiny_gradient(sub):
    params = np.array([0.0])
    new_params, _ = sub.adam_step(params, np.array([1e-6]), state_of(sub, params), lr=0.1)
    close(new_params, [-0.1 * 1e-6 / (1e-6 + 1e-8)], rtol=1e-9, what='极小梯度更新一步后的参数')


@fixture("runs")
def runs(ref):
    rng = np.random.default_rng(21)
    for shp, lr, beta1, beta2, decay in [((3,), 0.01, 0.9, 0.999, 0.0), ((2, 2), 0.1, 0.8, 0.99, 0.0), ((4,), 0.001, 0.95, 0.9, 0.01), ((5,), 0.05, 0.9, 0.999, 0.3)]:
        params = rng.normal(size=shp)
        grads = [rng.normal(size=shp) * rng.choice([0.01, 1.0, 10.0]) for _ in range(4)]
        state = ref.init_adam_state(params)
        out = []
        p = params
        for g in grads:
            p, state = ref.adam_step(p, g, state, lr=lr, beta1=beta1, beta2=beta2, weight_decay=decay)
            out.append({"params": p, "m": state["m"], "v": state["v"], "t": state["t"]})
        yield {"params": params, "grads": grads, "lr": lr, "beta1": beta1, "beta2": beta2, "weight_decay": decay}, out


@check("reference", '连续四步与参考实现一致', '不同参数设置下，Adam 和 AdamW 连续更新四步后，参数和状态都与参考实现一致。')
def reference_runs(sub):
    for case, expected in fixtures("runs"):
        params = case["params"]
        state = sub.init_adam_state(params)
        for k, (g, want) in enumerate(zip(case["grads"], expected), start=1):
            params, state = sub.adam_step(params, g, state, lr=case["lr"], beta1=case["beta1"], beta2=case["beta2"], weight_decay=case["weight_decay"])
            label = f"第 {k} 步，lr 为 {case['lr']}，weight_decay 为 {case['weight_decay']}"
            close(params, want["params"], rtol=1e-9, atol=1e-12, what=f"{label} 时的参数")
            close(state["m"], want["m"], rtol=1e-9, atol=1e-12, what=f"{label} 时的 m")
            close(state["v"], want["v"], rtol=1e-9, atol=1e-15, what=f"{label} 时的 v")
            equal(state["t"], want["t"], what=f"{label} 时的 t")
