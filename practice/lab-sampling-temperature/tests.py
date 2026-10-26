import numpy as np

from practice_check import check, close, equal, fixture, fixtures, shape, true
from support import LOGITS

KEYS = ["entropy_t1", "top1_t07", "first_grid_temperature", "crossing_temperature", "kept_p09_t07", "kept_p09_t10", "kept_p09_t15"]


@check("examples", '温度为 0.5 时 [1, 2, 3] 的 softmax', '先将 logits 除以温度，再计算 softmax。')
def example_softmax(sub):
    close(sub.softmax_t(np.array([1.0, 2.0, 3.0]), 0.5), [0.01587624, 0.11731043, 0.86681333], rtol=1e-6, what="概率")


@check("examples", '[0.5, 0.25, 0.25] 的熵为 1.5 bit', '以 bit 为单位的熵等于 -sum(p * log2(p))。')
def example_entropy(sub):
    close(sub.entropy_bits(np.array([0.5, 0.25, 0.25])), 1.5, what="熵")


@check("examples", '扫描三个温度', '每个温度对应一个熵和一个最大概率。')
def example_sweep(sub):
    entropies, top1 = sub.sweep_temperature(LOGITS, [0.5, 1.0, 2.0])
    close(entropies, [1.50271532, 2.52573217, 3.09650953], rtol=1e-6, what="各温度下的熵")
    close(top1, [0.61269561, 0.38024152, 0.22636197], rtol=1e-6, what="各温度下的最大概率")


@check("examples", 'Top-p 为 0.8 时，从 [0.1, 0.6, 0.3] 中保留 2 个 token', '按概率从高到低排序，保留累积和首次达到 p 的最短前缀。')
def example_kept(sub):
    equal(int(sub.kept_count(np.array([0.1, 0.6, 0.3]), 0.8)), 2, what="保留的 token 数量")


@check("properties", 'answers 包含全部键，且值均为数值', '检查会为每个问题读取一个有限数值。')
def answer_keys(sub):
    result = sub.answers()
    equal(sorted(result.keys()), sorted(KEYS), what="answers() 的键")
    for key in KEYS:
        true(isinstance(result[key], (int, float)) and np.isfinite(result[key]), f"{key} 必须是有限数值", "一个数值", result[key])


@check("properties", '温度升高时熵增大、最大概率降低', '温度越高，logit 越接近，概率分布越平坦。')
def monotone(sub):
    entropies, top1 = sub.sweep_temperature(LOGITS, [0.2, 0.5, 1.0, 2.0, 5.0])
    shape(entropies, (5,), what="各温度下的熵")
    true(np.all(np.diff(entropies) > 0), "熵必须随温度升高而增大", "递增的数值", entropies)
    true(np.all(np.diff(top1) < 0), "最大概率必须随温度升高而降低", "递减的数值", top1)


@check("properties", '熵在 0 和词表大小的 log2 之间', 'V 个 token 的概率分布，其熵范围是 0 到 log2(V) bit。')
def entropy_bounds(sub):
    rng = np.random.default_rng(4)
    for t in [0.05, 1.0, 50.0]:
        h = sub.entropy_bits(sub.softmax_t(rng.normal(size=12) * 3, t))
        true(-1e-12 <= h <= np.log2(12) + 1e-12, f"温度为 {t} 时，熵超出规定范围", f"0 到 {np.log2(12):.4f}", h)
    close(sub.entropy_bits(np.full(8, 0.125)), 3.0, what="8 个 token 的均匀分布的熵")


@check("properties", '交点温度对应目标熵', '二分法会找到熵等于目标值时的温度。')
def crossing(sub):
    t = sub.temperature_for_entropy(LOGITS, 2.0)
    close(sub.entropy_bits(sub.softmax_t(LOGITS, t)), 2.0, atol=1e-6, what="交点温度对应的熵")


@check("properties", '输入不会被修改', '若采样器修改 logits，就会影响解码器下一步。')
def inputs_unchanged(sub):
    logits = LOGITS.copy()
    probs = np.array([0.1, 0.6, 0.3])
    saved = probs.copy()
    sub.softmax_t(logits, 0.5)
    sub.sweep_temperature(logits, [0.5, 2.0])
    sub.kept_count(probs, 0.8)
    close(logits, LOGITS, atol=0, rtol=0, what="调用后的 logits")
    close(probs, saved, atol=0, rtol=0, what="调用后的概率数组")


@check("edge", '小温度下的大 logit 不会溢出', '调用 np.exp 前先减去缩放后 logits 的最大值。')
def large_logits(sub):
    probs = sub.softmax_t(np.array([1000.0, 999.0, 990.0]), 0.1)
    close(np.sum(probs), 1.0, what="概率之和")
    close(probs[0], 0.9999546021312976, rtol=1e-9, what="最大概率")


@check("edge", '零概率对熵的贡献为 0', '按 0 * log(0) = 0 处理。np.log2(0) 会得到负无穷。')
def zero_prob(sub):
    close(sub.entropy_bits(np.array([1.0, 0.0, 0.0])), 0.0, what="独热分布的熵")
    close(sub.entropy_bits(np.array([0.5, 0.5, 0.0])), 1.0, what="包含一个零概率项的分布的熵")


@check("edge", '累积和等于 p 时保留达到该值的 token', '规则要求累积和大于或等于 p。')
def exact_p(sub):
    equal(int(sub.kept_count(np.array([0.25, 0.5, 0.25]), 0.75)), 2, what="保留的 token 数量")


@check("edge", 'p 为 1 时保留所有 token', '舍入误差导致总和仍小于 p 时，保留全部 token。')
def p_one(sub):
    probs = np.array([0.3, 0.3, 0.3, 0.1 - 1e-12])
    equal(int(sub.kept_count(probs, 1.0)), 4, what="保留的 token 数量")


@fixture("logits")
def logit_cases(ref):
    rng = np.random.default_rng(9)
    for v in [3, 7, 16]:
        logits = rng.normal(size=v) * 2.0
        temps = [0.3, 0.8, 1.7]
        entropies, top1 = ref.sweep_temperature(logits, temps)
        yield {"logits": logits, "temps": temps}, {
            "entropies": entropies,
            "top1": top1,
            "kept": [ref.kept_count(ref.softmax_t(logits, t), 0.9) for t in temps],
            "crossing": ref.temperature_for_entropy(logits, 0.6 * np.log2(v)),
        }


@fixture("answers")
def answer_fixture(ref):
    yield {}, ref.answers()


@check("reference", '随机 logits 下辅助函数与参考实现一致', '熵、最大概率、保留数量和交点温度都与参考实现一致。')
def reference_helpers(sub):
    for case, expected in fixtures("logits"):
        v = case["logits"].size
        entropies, top1 = sub.sweep_temperature(case["logits"], case["temps"])
        close(entropies, expected["entropies"], rtol=1e-9, what=f"{v} 个 token 在各温度下的熵")
        close(top1, expected["top1"], rtol=1e-9, what=f"{v} 个 token 在各温度下的最大概率")
        close([sub.kept_count(sub.softmax_t(case["logits"], t), 0.9) for t in case["temps"]], expected["kept"], what=f"{v} 个 token 在各温度下的保留数量")
        close(sub.temperature_for_entropy(case["logits"], 0.6 * np.log2(v)), expected["crossing"], rtol=1e-6, what=f"{v} 个 token 达到目标熵的交点温度")


@check("reference", '每个答案都与参考运行一致', '每个答案与参考运行结果的相对误差都须小于 1e-6。')
def reference_answers(sub):
    result = sub.answers()
    for case, expected in fixtures("answers"):
        for key in KEYS:
            close(result.get(key), expected[key], rtol=1e-6, what=key)
