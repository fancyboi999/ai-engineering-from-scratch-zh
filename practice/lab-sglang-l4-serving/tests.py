import numpy as np

from practice_check import check, close, equal, fixture, fixtures, true

KEYS = [
    "saturation_default",
    "saturation_fp8",
    "slo_concurrency_default",
    "best_goodput_concurrency_default",
    "fp8_speedup_c32",
    "chunk_ttft_change_pct",
    "chunk_throughput_change_pct",
    "chunk_overlap_rates",
]


@check("examples", '默认配置前三个点的增益', '每步增益等于新值除以前一个值再减 1。')
def example_gains(sub):
    close(sub.gains([13.42, 31.2, 61.54]), [1.32488823, 0.9724359], rtol=1e-6, what="增益")


@check("examples", '短序列的饱和点', '返回增益首次低于 min_gain 的步骤之前的水平。')
def example_saturation(sub):
    equal(sub.saturation_point([1, 2, 4, 8], [10.0, 20.0, 20.5, 30.0]), 2, what="饱和点")


@check("examples", '默认模型在并发数 32 时饱和', '在 L4 上，输出吞吐从并发 32 到 64 时下降，因此规则会在 32 停止。')
def example_answer(sub):
    result = sub.answers()
    true(isinstance(result, dict), "answers() 必须返回字典", "dict", type(result).__name__)
    close(result.get("saturation_default"), 32.0, what="saturation_default")


@check("properties", 'answers 包含所有键，且值均为数值', '检查会为每个问题读取一个数值。缺少键或值为 None 都会失败。')
def answer_keys(sub):
    result = sub.answers()
    equal(sorted(result.keys()), sorted(KEYS), what="answers() 的键")
    for key in KEYS:
        true(isinstance(result[key], (int, float)) and np.isfinite(result[key]), f"{key} 必须为有限数值", "数值", result[key])


@check("properties", 'gains 的长度比序列少 1', '包含 n 个点的序列有 n - 1 步。')
def gains_length(sub):
    ys = [3.0, 6.0, 9.0, 9.0, 4.5]
    close(sub.gains(ys), [1.0, 0.5, 0.0, -0.5], what="增益")


@check("properties", '饱和点不受单位影响', '规则使用相对增益。每秒 token 数和每分钟 token 数应得到相同饱和点。')
def scale_invariance(sub):
    xs = [1, 2, 4, 8, 16]
    ys = [0.010, 0.019, 0.0195, 0.03, 0.031]
    first = sub.saturation_point(xs, ys)
    equal(sub.saturation_point(xs, [y * 6000.0 for y in ys]), first, what="单位变化后的饱和点")
    equal(first, 2, what="饱和点")


@check("properties", '数值相等时 pct_change 为 0，且符号反映变化方向', 'pct_change 等于 100 乘以 (新值 - 旧值) 再除以旧值。')
def pct_properties(sub):
    close(sub.pct_change(5.0, 5.0), 0.0, what="pct_change(5, 5)")
    close(sub.pct_change(110.0, 100.0), 10.0, what="pct_change(110, 100)")
    close(sub.pct_change(50.0, 200.0), -75.0, what="pct_change(50, 200)")


@check("properties", 'ranges_overlap 满足对称性', '范围 a 与范围 b 重叠，当且仅当范围 b 与范围 a 重叠。')
def overlap_symmetric(sub):
    a = {"min": 1.0, "max": 3.0}
    b = {"min": 2.5, "max": 9.0}
    c = {"min": 4.0, "max": 5.0}
    equal(bool(sub.ranges_overlap(a, b)), True, what="ranges_overlap(a, b)")
    equal(bool(sub.ranges_overlap(b, a)), True, what="ranges_overlap(b, a)")
    equal(bool(sub.ranges_overlap(a, c)), False, what="ranges_overlap(a, c)")
    equal(bool(sub.ranges_overlap(c, a)), False, what="ranges_overlap(c, a)")


@check("properties", '输入不会被修改', '辅助函数若修改输入列表，会影响下一题的数据。')
def inputs_unchanged(sub):
    xs = [1, 2, 4]
    ys = [5.0, 9.0, 9.1]
    sub.gains(ys)
    sub.saturation_point(xs, ys)
    sub.largest_within(xs, ys, 9.0)
    equal(xs, [1, 2, 4], what="调用后的 xs")
    equal(ys, [5.0, 9.0, 9.1], what="调用后的 ys")


@check("edge", '增益等于 min_gain 时仍算增长', '只有增益严格低于 min_gain 时规则才会停止。')
def gain_equal_threshold(sub):
    equal(sub.saturation_point([1, 2, 4], [100.0, 150.0, 225.0], min_gain=0.5), 4, what="饱和点")


@check("edge", '始终增长的序列返回最后一个水平', '若没有步骤的增益低于 min_gain，扫描就尚未达到饱和，应返回 xs 中最大的水平。')
def never_saturates(sub):
    equal(sub.saturation_point([1, 2, 4, 8], [1.0, 2.0, 4.0, 8.0]), 8, what="饱和点")


@check("edge", '值等于限制时也满足限制', '延迟恰好为 1000 ms 时，也满足 1000 ms 的 SLO。')
def limit_inclusive(sub):
    equal(sub.largest_within([1, 2, 4, 8], [100.0, 900.0, 1000.0, 1200.0], 1000.0), 4, what="满足限制的最大水平")


@check("edge", '没有水平符合限制时返回 None', '所有值都高于限制时，没有水平满足 SLO。')
def none_within(sub):
    equal(sub.largest_within([1, 2], [2000.0, 3000.0], 1000.0), None, what="满足限制的最大水平")


@check("edge", '范围只在一个端点相接时也算重叠', '两个种子范围共享端点时属于重叠。')
def touching_ranges(sub):
    equal(bool(sub.ranges_overlap({"min": 1.0, "max": 2.0}, {"min": 2.0, "max": 3.0})), True, what="范围在端点相接时的 ranges_overlap 结果")


@fixture("series")
def series(ref):
    rng = np.random.default_rng(7)
    for n in [3, 5, 7, 9]:
        xs = [int(2 ** i) for i in range(n)]
        ys = list(np.cumsum(rng.uniform(0.0, 10.0, size=n)) + 1.0)
        ys = [float(y) for y in ys]
        old = float(rng.uniform(10.0, 100.0))
        new = float(rng.uniform(10.0, 100.0))
        yield {"xs": xs, "ys": ys, "old": old, "new": new}, {
            "gains": ref.gains(ys),
            "saturation": ref.saturation_point(xs, ys, 0.1),
            "within": ref.largest_within(xs, ys, float(np.median(ys))),
            "pct": ref.pct_change(new, old),
        }


@fixture("answers")
def answer_fixture(ref):
    yield {}, ref.answers()


@check("reference", '随机序列的辅助函数结果与参考实现一致', '四个随机序列的辅助函数结果都与参考实现相同。')
def reference_helpers(sub):
    for case, expected in fixtures("series"):
        n = len(case["xs"])
        close(sub.gains(case["ys"]), expected["gains"], rtol=1e-9, what=f"{n} 个点的 gains 结果")
        equal(sub.saturation_point(case["xs"], case["ys"], 0.1), expected["saturation"], what=f"{n} 个点的 saturation_point 结果")
        equal(sub.largest_within(case["xs"], case["ys"], float(np.median(case["ys"]))), expected["within"], what=f"{n} 个点的 largest_within 结果")
        close(sub.pct_change(case["new"], case["old"]), expected["pct"], rtol=1e-9, what="pct_change")


@check("reference", '每个答案都与参考运行一致', '基于 L4 数据，每个答案与参考运行结果的相对误差都必须小于 1e-6。')
def reference_answers(sub):
    result = sub.answers()
    for case, expected in fixtures("answers"):
        for key in KEYS:
            close(result.get(key), expected[key], rtol=1e-6, what=key)
