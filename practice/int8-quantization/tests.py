import numpy as np

from practice_check import check, close, equal, fixture, fixtures, shape, true

T = np.array([[0.5, -1.0, 0.25], [2.0, 0.1, -0.04]])


def int_values(q, what):
    array = np.asarray(q)
    true(array.dtype == np.int8, f"{what} 不是 int8 数组", "int8", str(array.dtype))
    return array


@check("examples", "2×3 矩阵的逐张量量化", "整个张量共用 max(|x|) / 127 作为 scale。每个数值除以 scale 后舍入，并裁剪到 [-127, 127]。")
def example_tensor(sub):
    q, scale = sub.quantize_symmetric(T)
    equal(int_values(q, "量化张量"), np.array([[32, -64, 16], [127, 6, -3]], dtype=np.int8), what="量化张量")
    close(scale, 0.015748031496062992, rtol=1e-12, what="scale")
    close(sub.dequantize_symmetric(q, scale), [[0.50393701, -1.00787402, 0.2519685], [2.0, 0.09448819, -0.04724409]], rtol=1e-6, what="反量化张量")


@check("examples", "同一矩阵的逐行量化", "每行单独使用 max(|row|) / 127 作为 scale。数值范围较小的行可以保留更多精度。")
def example_rows(sub):
    q, scales = sub.quantize_per_channel(T)
    equal(int_values(q, "量化张量"), np.array([[64, -127, 32], [127, 6, -3]], dtype=np.int8), what="量化张量")
    close(scales, [0.00787402, 0.01574803], rtol=1e-6, what="scales")
    close(sub.dequantize_per_channel(q, scales), [[0.50393701, -1.0, 0.2519685], [2.0, 0.09448819, -0.04724409]], rtol=1e-6, what="反量化张量")


@check("examples", "全零行的 scale 为 1", "max(|row|) 为 0 时，将 scale 设为 1.0。量化行全部为 0，也不会出现除以 0。")
def example_zero_row(sub):
    q, scales = sub.quantize_per_channel(np.array([[0.0, 0.0], [1.0, -3.0]]))
    equal(int_values(q, "量化张量"), np.array([[0, 0], [42, -127]], dtype=np.int8), what="量化张量")
    close(scales, [1.0, 0.02362205], rtol=1e-6, what="scales")


@check("properties", "量化误差最多为半个步长", "舍入到最近整数时，每个数值最多移动 0.5。反量化后，每个元素的误差最多为 scale / 2。")
def error_bound(sub):
    rng = np.random.default_rng(1)
    x = rng.normal(size=(6, 9)) * 3
    q, scale = sub.quantize_symmetric(x)
    error = np.abs(sub.dequantize_symmetric(q, scale) - x)
    true(bool(np.all(error <= scale / 2 + 1e-12)), "逐张量量化中有元素的误差超过 scale / 2", f"最多为 {scale / 2:.6g}", float(np.max(error)))
    q, scales = sub.quantize_per_channel(x)
    error = np.abs(sub.dequantize_per_channel(q, scales) - x)
    limit = np.asarray(scales).reshape(-1, 1) / 2 + 1e-12
    true(bool(np.all(error <= limit)), "有元素的误差超过所在行的 scale / 2", "最多为该行缩放系数的一半", float(np.max(error - limit + 1e-12)))


@check("properties", "绝对值最大的数值映射到 127", "绝对值最大的数值会映射到 127 或 -127。scale 会充分利用对称 int8 范围。")
def uses_full_range(sub):
    rng = np.random.default_rng(2)
    x = rng.normal(size=(5, 7))
    q, _ = sub.quantize_symmetric(x)
    q = int_values(q, "量化张量")
    equal(int(np.max(np.abs(q.astype(int)))), 127, what="逐张量量化结果的最大绝对值")
    q, scales = sub.quantize_per_channel(x)
    q = int_values(q, "量化张量")
    shape(scales, (5,), what="scales")
    equal(np.max(np.abs(q.astype(int)), axis=1), np.full(5, 127), what="每一行的最大绝对值")


@check("properties", "输入乘正数只会改变 scale", "x 和 scale 同乘一个正数时，x / scale 不变，因此量化结果也不变。")
def scale_equivariance(sub):
    rng = np.random.default_rng(3)
    x = rng.normal(size=(4, 6))
    q1, s1 = sub.quantize_per_channel(x)
    q2, s2 = sub.quantize_per_channel(x * 8.0)
    equal(np.asarray(q2), np.asarray(q1), what="输入乘以 8 后的量化值")
    close(s2, np.asarray(s1) * 8.0, rtol=1e-12, what="输入乘以 8 后的缩放系数")


@check("properties", "输入保持不变", "如果函数修改输入数组，就会破坏调用它的代码。")
def inputs_unchanged(sub):
    x = T.copy()
    q, scale = sub.quantize_symmetric(x)
    q_saved = np.array(q, copy=True)
    sub.dequantize_symmetric(q, scale)
    q2, scales = sub.quantize_per_channel(x)
    scales_saved = np.array(scales, copy=True)
    sub.dequantize_per_channel(q2, scales)
    close(x, T, atol=0, rtol=0, what="调用后的输入张量")
    equal(np.asarray(q), q_saved, what="反量化后的量化张量")
    close(scales, scales_saved, atol=0, rtol=0, what="反量化后的缩放系数")


@check("edge", "中间值舍入到偶数", "np.round 会将 2.5 舍入为 2，将 -0.5 舍入为 0。要用 np.round，不要使用 floor(x + 0.5)。")
def ties(sub):
    q, scale = sub.quantize_symmetric(np.array([127.0, 2.5, -0.5, 1.5, -3.5]))
    close(scale, 1.0, rtol=1e-12, what="scale")
    equal(np.asarray(q), np.array([127, 2, 0, 2, -4], dtype=np.int8), what="量化值")


@check("edge", "绝对值最大的数是负数", "scale 按绝对值计算。若最负的数绝对值最大，它会映射到 -127。")
def negative_max(sub):
    x = np.array([[-4.0, 1.0, 2.0], [0.5, -0.25, 0.125]])
    q, scale = sub.quantize_symmetric(x)
    close(scale, 4.0 / 127, rtol=1e-12, what="scale")
    equal(int(np.asarray(q)[0, 0]), -127, what="-4.0 的量化值")
    q, scales = sub.quantize_per_channel(x)
    close(scales, [4.0 / 127, 0.5 / 127], rtol=1e-12, what="scales")


@check("edge", "全零张量", "所有值为 0 时，每个 scale 都是 1.0，量化结果也全为 0。scale 为 0 会导致 NaN。")
def zero_tensor(sub):
    q, scale = sub.quantize_symmetric(np.zeros((2, 3)))
    close(scale, 1.0, rtol=0, atol=0, what="scale")
    equal(np.asarray(q), np.zeros((2, 3), dtype=np.int8), what="量化张量")
    close(sub.dequantize_symmetric(q, scale), np.zeros((2, 3)), atol=0, what="反量化张量")
    q, scales = sub.quantize_per_channel(np.array([[0.0, 0.0, 0.0], [0.0, 0.5, 0.0], [0.0, 0.0, 0.0]]))
    close(scales, [1.0, 0.5 / 127, 1.0], rtol=1e-12, what="逐行 scales")
    equal(np.asarray(q), np.array([[0, 0, 0], [0, 127, 0], [0, 0, 0]], dtype=np.int8), what="逐行量化张量")


@check("edge", "单行和非方阵", "逐行量化为每行生成一个 scale，因此即使只有一行，scales 的形状仍为 (rows,)。")
def shapes(sub):
    x = np.array([[0.3, -0.6, 0.9, 0.0, 1.2]])
    q, scales = sub.quantize_per_channel(x)
    shape(q, (1, 5), what="量化张量")
    shape(scales, (1,), what="scales")
    x = np.arange(12.0).reshape(3, 4) - 5.0
    q, scales = sub.quantize_per_channel(x)
    shape(scales, (3,), what="3×4 矩阵的缩放系数")
    close(sub.dequantize_per_channel(q, scales), x, atol=0.03, what="反量化后的 3×4 矩阵")


@fixture("tensors")
def tensors(ref):
    rng = np.random.default_rng(42)
    for rows, cols, spread in [(1, 4, 1.0), (3, 5, 0.1), (6, 8, 10.0), (8, 3, 1.0)]:
        x = rng.normal(size=(rows, cols)) * spread * rng.random(size=(rows, 1)) * 4
        q, scale = ref.quantize_symmetric(x)
        qc, scales = ref.quantize_per_channel(x)
        yield {"x": x}, {"q": q, "scale": scale, "deq": ref.dequantize_symmetric(q, scale), "qc": qc, "scales": scales, "deqc": ref.dequantize_per_channel(qc, scales)}


@check("reference", "逐张量结果与参考实现一致", "随机矩阵上的量化值、scale 和反量化张量均与参考实现一致。")
def reference_tensor(sub):
    for case, expected in fixtures("tensors"):
        size = case["x"].shape
        q, scale = sub.quantize_symmetric(case["x"])
        equal(np.asarray(q), expected["q"], what=f"形状为 {size} 时的逐张量量化结果")
        close(scale, expected["scale"], rtol=1e-12, what=f"形状为 {size} 时的缩放系数")
        close(sub.dequantize_symmetric(expected["q"], expected["scale"]), expected["deq"], rtol=1e-12, what=f"形状为 {size} 时的反量化张量")


@check("reference", "逐行结果与参考实现一致", "逐行量化值、scales 和反量化张量均与参考实现一致。")
def reference_rows(sub):
    for case, expected in fixtures("tensors"):
        size = case["x"].shape
        q, scales = sub.quantize_per_channel(case["x"])
        equal(np.asarray(q), expected["qc"], what=f"形状为 {size} 时的逐行量化结果")
        close(scales, expected["scales"], rtol=1e-12, what=f"形状为 {size} 时的缩放系数")
        close(sub.dequantize_per_channel(expected["qc"], expected["scales"]), expected["deqc"], rtol=1e-12, what=f"形状为 {size} 时的反量化张量")
