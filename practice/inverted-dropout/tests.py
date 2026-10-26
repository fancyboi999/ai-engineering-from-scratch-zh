import numpy as np

from practice_check import check, close, equal, fixture, fixtures, numeric_grad, shape, true

X = np.array([[1.0, 2.0, 3.0, 4.0], [5.0, 6.0, 7.0, 8.0]])


@check("examples", "p = 0.5、seed = 0 时的训练前向传播", "rng.random(x.shape) 大于或等于 p 时保留该元素。保留值除以 1 - p，其余元素设为 0。")
def example_forward(sub):
    out, mask = sub.dropout_forward(X, 0.5, np.random.default_rng(0))
    close(out, [[2.0, 0.0, 0.0, 0.0], [10.0, 12.0, 14.0, 16.0]], what="输出")
    equal(np.asarray(mask, dtype=bool), np.array([[True, False, False, False], [True, True, True, True]]), what="掩码")


@check("examples", "使用相同掩码进行反向传播", "梯度只通过保留的元素传播，并乘以相同的缩放系数 1 / (1 - p)。")
def example_backward(sub):
    _, mask = sub.dropout_forward(X, 0.5, np.random.default_rng(0))
    close(sub.dropout_backward(np.ones((2, 4)), mask, 0.5), [[2.0, 0.0, 0.0, 0.0], [2.0, 2.0, 2.0, 2.0]], what="输入梯度")


@check("examples", "推理模式返回输入", "推理模式下 dropout 不做任何处理。输出等于 x，掩码保留所有元素。")
def example_eval(sub):
    out, mask = sub.dropout_forward(X, 0.5, np.random.default_rng(0), training=False)
    close(out, X, atol=0, rtol=0, what="推理输出")
    equal(np.asarray(mask, dtype=bool), np.ones((2, 4), dtype=bool), what="推理掩码")


@check("properties", "掩码与输出一致", "掩码为 False 时输出为 0；为 True 时输出为 x / (1 - p)。掩码是与 x 同形状的布尔数组。")
def mask_matches_output(sub):
    rng = np.random.default_rng(1)
    x = rng.normal(size=(6, 7)) + 5.0
    p = 0.3
    out, mask = sub.dropout_forward(x, p, np.random.default_rng(11))
    shape(out, x.shape, what="输出")
    shape(mask, x.shape, what="掩码")
    true(np.asarray(mask).dtype == bool, "掩码不是布尔数组", "bool", str(np.asarray(mask).dtype))
    close(out, np.where(mask, x / (1 - p), 0.0), rtol=1e-12, what="根据掩码计算的输出")


@check("properties", "掩码只调用一次 rng.random(x.shape) 生成", "掩码必须由 rng.random(x.shape) >= p 得到。多调用一次随机生成器就会改变掩码。")
def mask_convention(sub):
    x = np.ones((5, 8))
    p = 0.4
    _, mask = sub.dropout_forward(x, p, np.random.default_rng(12))
    expected = np.random.default_rng(12).random((5, 8)) >= p
    equal(np.asarray(mask, dtype=bool), expected, what="种子为 12、p = 0.4 时的掩码")


@check("properties", "输出的期望等于输入", "Inverted dropout 保持均值不变。元素足够多时，输出均值应接近 x 的均值。")
def keeps_mean(sub):
    x = np.full((200, 200), 3.0)
    out, _ = sub.dropout_forward(x, 0.25, np.random.default_rng(13))
    close(np.mean(out), 3.0, rtol=0.02, what="输出均值")


@check("properties", "反向传播与有限差分一致", "掩码固定时，dropout 对 x 是线性的。x 的微小改变量引起的损失变化应等于梯度乘以该改变量。")
def finite_differences(sub):
    rng = np.random.default_rng(2)
    x = rng.normal(size=(3, 4))
    upstream = rng.normal(size=(3, 4))
    p = 0.35
    def loss(v):
        return float(np.sum(sub.dropout_forward(v, p, np.random.default_rng(21))[0] * upstream))
    _, mask = sub.dropout_forward(x, p, np.random.default_rng(21))
    close(sub.dropout_backward(upstream, mask, p), numeric_grad(loss, x), atol=1e-7, rtol=1e-5, what="输入梯度")


@check("properties", "输入保持不变", "如果函数修改输入数组，就会破坏调用它的代码。")
def inputs_unchanged(sub):
    x = X.copy()
    upstream = np.arange(8.0).reshape(2, 4)
    saved_upstream = upstream.copy()
    _, mask = sub.dropout_forward(x, 0.5, np.random.default_rng(0))
    saved_mask = np.array(mask, copy=True)
    sub.dropout_backward(upstream, mask, 0.5)
    sub.dropout_forward(x, 0.5, np.random.default_rng(0), training=False)
    close(x, X, atol=0, rtol=0, what="调用后的 x")
    close(upstream, saved_upstream, atol=0, rtol=0, what="调用后的 grad_output")
    equal(np.asarray(mask), saved_mask, what="反向传播后的掩码")


@check("edge", "p = 0 时保留所有元素", "p = 0 时所有元素都被保留，缩放系数为 1，输出等于 x。")
def p_zero(sub):
    rng = np.random.default_rng(3)
    x = rng.normal(size=(4, 5))
    out, mask = sub.dropout_forward(x, 0.0, np.random.default_rng(4))
    close(out, x, rtol=1e-15, atol=0, what="p = 0 时的输出")
    true(bool(np.all(mask)), "p = 0 时掩码仍丢弃了元素", "所有元素都为 True", mask)


@check("edge", "推理模式不会使用随机数生成器", "推理模式下不要从 rng 取样。同 seed 的新生成器与原 rng 的下一个随机数必须相同。")
def eval_no_draw(sub):
    rng = np.random.default_rng(5)
    sub.dropout_forward(X, 0.5, rng, training=False)
    close(rng.random(), np.random.default_rng(5).random(), atol=0, rtol=0, what="推理调用后 rng 生成的下一个随机数")


@check("edge", "推理模式返回新数组", "推理输出必须是副本。调用方修改输出时不能影响 x。")
def eval_copy(sub):
    x = X.copy()
    out, _ = sub.dropout_forward(x, 0.5, np.random.default_rng(0), training=False)
    true(not np.shares_memory(out, x), "推理输出与 x 共享内存", "新数组", "与 x 共享内存的数组")
    close(out, X, atol=0, rtol=0, what="推理输出")


@check("edge", "支持不同维数的输入", "Dropout 逐元素生效。它必须支持一维和三维输入，并返回同形状掩码。")
def any_shape(sub):
    x1 = np.arange(1.0, 7.0)
    out1, mask1 = sub.dropout_forward(x1, 0.5, np.random.default_rng(6))
    close(out1, np.where(np.random.default_rng(6).random(6) >= 0.5, x1 * 2.0, 0.0), what="一维输入的输出")
    x3 = np.ones((2, 3, 4))
    out3, mask3 = sub.dropout_forward(x3, 0.2, np.random.default_rng(7))
    shape(out3, (2, 3, 4), what="三维输入的输出")
    shape(mask3, (2, 3, 4), what="三维输入的掩码")


@fixture("draws")
def draws(ref):
    rng = np.random.default_rng(42)
    for shape_, p, seed in [((3,), 0.5, 1), ((4, 5), 0.1, 2), ((6, 6), 0.5, 3), ((2, 3, 4), 0.8, 4)]:
        x = rng.normal(size=shape_)
        upstream = rng.normal(size=shape_)
        out, mask = ref.dropout_forward(x, p, np.random.default_rng(seed))
        yield {"x": x, "p": p, "seed": seed, "upstream": upstream}, {"out": out, "mask": mask, "grad": ref.dropout_backward(upstream, mask, p)}


@check("reference", "前向传播与参考实现一致", "在四种形状、不同 p 和 seed 下，输出和掩码都与参考实现一致。")
def reference_forward(sub):
    for case, expected in fixtures("draws"):
        out, mask = sub.dropout_forward(case["x"], case["p"], np.random.default_rng(case["seed"]))
        label = f"形状为 {case['x'].shape}、p = {case['p']} 的 x"
        equal(np.asarray(mask, dtype=bool), expected["mask"], what=f"{label} 对应的掩码")
        close(out, expected["out"], rtol=1e-12, atol=1e-15, what=f"{label} 对应的输出")


@check("reference", "反向传播与参考实现一致", "这些用例的输入梯度与参考实现一致。")
def reference_backward(sub):
    for case, expected in fixtures("draws"):
        close(sub.dropout_backward(case["upstream"], expected["mask"], case["p"]), expected["grad"], rtol=1e-12, atol=1e-15, what=f"形状为 {case['x'].shape}、p = {case['p']} 时的输入梯度")
