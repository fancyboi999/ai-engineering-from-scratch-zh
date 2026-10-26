import numpy as np

from practice_check import check, close, equal, fixture, fixtures, shape, true
from support import BITS, make_weights

KEYS = ["smallest_bits_per_tensor", "smallest_bits_per_row", "error_4bit_per_tensor", "error_4bit_per_row", "per_row_gain_4bit"]
SMALL = np.array([[0.5, -1.0, 0.25], [0.0, 0.0, 0.0]])


@check("examples", '小矩阵的 4 bit 逐张量量化', '缩放系数等于最大绝对值除以 2^(b-1) - 1。每个值舍入到最近整数并截断到有效范围。')
def example_symmetric(sub):
    quantized, scale = sub.quantize_symmetric(SMALL, 4)
    equal(np.asarray(quantized).tolist(), [[4, -7, 2], [0, 0, 0]], what="量化值")
    close(scale, 0.14285714285714285, what="缩放系数")


@check("examples", '小向量的相对误差', '相对误差等于差值范数除以原始值范数。')
def example_relative(sub):
    close(sub.relative_error(np.array([3.0, 4.0]), np.array([3.0, 3.0])), 0.2, what="相对误差")


@check("examples", '含离群值的矩阵使用逐张量缩放时需要 8 bit', '一个离群值决定整张矩阵的缩放系数，因此小权重只能使用少数几个量化等级。')
def example_answer(sub):
    result = sub.answers()
    true(isinstance(result, dict), "answers() 必须返回字典", "dict", type(result).__name__)
    close(result.get("smallest_bits_per_tensor"), 8.0, what="smallest_bits_per_tensor")


@check("properties", 'answers 包含全部键，且值均为数值', '检查会为每个问题读取一个有限数值。')
def answer_keys(sub):
    result = sub.answers()
    equal(sorted(result.keys()), sorted(KEYS), what="answers() 返回的键")
    for key in KEYS:
        true(isinstance(result[key], (int, float)) and np.isfinite(result[key]), f"{key} 必须是有限数值", "数值", result[key])


@check("properties", '每个量化值与原值的差不超过半个步长', '舍入会使每个值偏离原值不超过其所在行缩放系数的一半。')
def half_step(sub):
    weights = make_weights(seed=5, rows=8, cols=16)
    for num_bits in [3, 6]:
        quantized, scales = sub.quantize_per_row(weights, num_bits)
        shape(scales, (8,), what="各行的缩放系数")
        error = np.abs(weights - sub.dequantize(quantized, scales))
        true(np.all(error <= np.asarray(scales).reshape(-1, 1) / 2 + 1e-12), f"位宽为 {num_bits} bit 时，存在超过半个步长的误差", "不超过 scale / 2", float(np.max(error)))


@check("properties", '量化编码保持在有符号范围内', 'b bit 编码是 -2^(b-1) 到 2^(b-1) - 1 之间的整数。')
def code_range(sub):
    weights = make_weights(seed=6, rows=10, cols=12)
    for num_bits in BITS:
        for quantized, _ in [sub.quantize_symmetric(weights, num_bits), sub.quantize_per_row(weights, num_bits)]:
            codes = np.asarray(quantized)
            true(np.all(codes == np.round(codes)), "量化编码必须是整数", "integers", codes)
            true(codes.min() >= -(2 ** (num_bits - 1)) and codes.max() <= 2 ** (num_bits - 1) - 1, f"位宽为 {num_bits} bit 时，存在超出范围的量化编码", f"from {-(2 ** (num_bits - 1))} to {2 ** (num_bits - 1) - 1}", codes)


@check("properties", '缩放矩阵会同比缩放系数而不改变编码', 'Absmax 量化不受权重单位影响。')
def scale_equivariance(sub):
    weights = make_weights(seed=7, rows=6, cols=10)
    q1, s1 = sub.quantize_per_row(weights, 5)
    q2, s2 = sub.quantize_per_row(weights * 3.0, 5)
    equal(np.asarray(q2).tolist(), np.asarray(q1).tolist(), what="缩放矩阵后的量化编码")
    close(s2, np.asarray(s1) * 3.0, rtol=1e-12, what="缩放矩阵后的缩放系数")


@check("properties", '含离群值时逐行缩放不会更差', '行缩放系数不会大于张量缩放系数，因此每行步长相同或更细。')
def per_row_better(sub):
    weights = make_weights(seed=0)
    tensor_errors = np.asarray(sub.bit_sweep(weights, BITS, per_row=False))
    row_errors = np.asarray(sub.bit_sweep(weights, BITS, per_row=True))
    shape(tensor_errors, (len(BITS),), what="逐张量量化误差")
    true(np.all(row_errors <= tensor_errors), "某个位宽下的逐行量化误差高于逐张量量化误差", "per row <= per tensor", {"per_row": row_errors.tolist(), "per_tensor": tensor_errors.tolist()})


@check("properties", '输入不会被修改', '量化器若修改权重数组，就会破坏模型参数。')
def inputs_unchanged(sub):
    weights = make_weights(seed=8, rows=8, cols=6)
    saved = weights.copy()
    sub.quantize_symmetric(weights, 4)
    sub.quantize_per_row(weights, 4)
    sub.bit_sweep(weights, [2, 4], per_row=True)
    close(weights, saved, atol=0, rtol=0, what="调用后的权重")


@check("edge", '零行使用缩放系数 1，不产生 NaN', '整行全零时使用缩放系数 1.0。0 除以 0 会得到 NaN。')
def zero_row(sub):
    quantized, scales = sub.quantize_per_row(SMALL, 4)
    close(scales, [0.14285714285714285, 1.0], what="各行的缩放系数")
    close(sub.dequantize(quantized, scales)[1], [0.0, 0.0, 0.0], what="重建后的零行")
    _, scale = sub.quantize_symmetric(np.zeros((2, 2)), 4)
    close(scale, 1.0, what="全零张量的缩放系数")


@check("edge", '恰好位于中间的数舍入到偶数', 'np.round 会将 0.5 舍入为 0，将 2.5 舍入为 2。2 bit 行 [0.5, -1.0, 0.25] 的缩放系数为 1，因此 0.5 会变成 0。')
def round_half_even(sub):
    quantized, scales = sub.quantize_per_row(SMALL, 2)
    equal(np.asarray(quantized).tolist(), [[0, -1, 0], [0, 0, 0]], what="2 bit 量化编码")


@check("edge", '误差等于阈值时通过', '条件是误差小于或等于阈值。')
def threshold_inclusive(sub):
    equal(sub.smallest_bits([2, 4, 8], [0.3, 0.05, 0.01], 0.05), 4, what="smallest_bits")


@check("edge", '没有位宽满足阈值时返回 None', '若所有误差都高于阈值，说明没有合适的位宽。')
def none_pass(sub):
    equal(sub.smallest_bits([2, 4], [0.5, 0.2], 0.05), None, what="smallest_bits")


@fixture("matrices")
def matrices(ref):
    rng = np.random.default_rng(21)
    for rows, cols, num_bits in [(3, 5, 2), (6, 4, 4), (5, 9, 7)]:
        weights = rng.normal(size=(rows, cols)) * rng.uniform(0.1, 3.0, size=(rows, 1))
        q_t, s_t = ref.quantize_symmetric(weights, num_bits)
        q_r, s_r = ref.quantize_per_row(weights, num_bits)
        yield {"weights": weights, "bits": num_bits}, {"q_tensor": q_t, "s_tensor": s_t, "q_row": q_r, "s_row": s_r, "sweep": ref.bit_sweep(weights, BITS, per_row=True)}


@fixture("answers")
def answer_fixture(ref):
    yield {}, ref.answers()


@check("reference", '随机矩阵的量化结果与参考实现一致', '三个随机矩阵的编码、缩放系数和误差都与参考实现一致。')
def reference_quantizers(sub):
    for case, expected in fixtures("matrices"):
        weights, num_bits = case["weights"], case["bits"]
        q_t, s_t = sub.quantize_symmetric(weights, num_bits)
        q_r, s_r = sub.quantize_per_row(weights, num_bits)
        close(q_t, expected["q_tensor"], atol=0, rtol=0, what=f"权重形状为 {weights.shape} 时的逐张量量化编码")
        close(s_t, expected["s_tensor"], rtol=1e-12, what=f"权重形状为 {weights.shape} 时的逐张量缩放系数")
        close(q_r, expected["q_row"], atol=0, rtol=0, what=f"权重形状为 {weights.shape} 时的逐行量化编码")
        close(s_r, expected["s_row"], rtol=1e-12, what=f"权重形状为 {weights.shape} 时的逐行缩放系数")
        close(sub.bit_sweep(weights, BITS, per_row=True), expected["sweep"], rtol=1e-9, what=f"权重形状为 {weights.shape} 时的逐行位宽扫描结果")


@check("reference", '每个答案都与参考运行一致', '每个答案与参考运行结果的相对误差都须小于 1e-6。')
def reference_answers(sub):
    result = sub.answers()
    for case, expected in fixtures("answers"):
        for key in KEYS:
            close(result.get(key), expected[key], rtol=1e-6, what=key)
