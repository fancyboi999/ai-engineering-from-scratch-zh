import numpy as np

from practice_check import check, close, equal, fixture, fixtures, true

KEYS = ["best_degree", "best_test_error", "crossover_degree", "bias_sq_degree_1", "variance_degree_12"]
P = np.array([[1.0, 2.0, 3.0], [3.0, 2.0, 1.0]])
Y = np.array([1.5, 2.0, 2.0])
_cache = {}


def run_answers(sub):
    if sub not in _cache:
        _cache.clear()
        _cache[sub] = sub.answers()
    return _cache[sub]


@check("examples", "分解两行预测值", "偏差平方使用每个测试点的平均预测值。方差用 ddof=0 计算各行预测值围绕均值的波动。")
def example_decompose(sub):
    bias_sq, variance = sub.decompose(P, Y)
    close(bias_sq, 0.08333333333333333, what="偏差平方")
    close(variance, 0.6666666666666666, what="方差")


@check("examples", "计算两行预测的期望测试误差", "测试误差等于所有训练轮次和测试点的均方误差，再加上噪声方差。")
def example_error(sub):
    close(sub.expected_test_error(P, Y, 0.5), 1.0, what="测试误差")


@check("examples", "使用 5 轮训练的小规模扫描", "第 b 轮用 seed=seed + b 调用 generate_data(n_train, noise_std)，并在 X_TEST 上预测。")
def example_sweep(sub):
    result = sub.sweep_degrees([1, 3], n_rounds=5, n_train=20)
    equal(sorted(result.keys()), [1, 3], what="结果中的阶数")
    close(result[1]["bias_sq"], 0.3909230138895905, what="1 阶的偏差平方")
    close(result[3]["variance"], 0.052499400227697696, what="3 阶的方差")
    close(result[3]["test_error"], 0.3642964495494713, what="3 阶的测试误差")


@check("properties", "误差等于偏差平方、方差和噪声之和", "ddof=0 时，均方误差恰好分解为偏差平方和方差，之后再加噪声方差。")
def identity(sub):
    rng = np.random.default_rng(11)
    preds = rng.normal(size=(7, 9))
    y_true = rng.normal(size=9)
    bias_sq, variance = sub.decompose(preds, y_true)
    close(sub.expected_test_error(preds, y_true, 0.3), bias_sq + variance + 0.09, rtol=1e-10, what="测试误差")


@check("properties", "answers 包含所需键且值均为数值", "检查会读取每个问题对应的有限数值。")
def answer_keys(sub):
    result = run_answers(sub)
    equal(sorted(result.keys()), sorted(KEYS), what="answers() 的键")
    for key in KEYS:
        true(isinstance(result[key], (int, float)) and np.isfinite(result[key]), f"{key} 必须是有限数值", "数值", result[key])


@check("properties", "阶数增加时偏差下降、方差上升", "1 阶直线无法拟合曲线，因此偏差较大；12 阶多项式会拟合噪声，因此方差较大。")
def trend(sub):
    result = sub.sweep_degrees([1, 5, 12], n_rounds=40)
    true(result[5]["bias_sq"] < result[1]["bias_sq"], "从 1 阶到 5 阶，偏差平方应下降", "5 阶更小", result)
    true(result[12]["variance"] > result[5]["variance"] > 0, "方差应大于 0，并从 5 阶到 12 阶上升", "12 阶更大", result)


@check("properties", "输入保持不变", "如果辅助函数修改 predictions，会改变下一个阶数使用的数据。")
def inputs_unchanged(sub):
    preds = P.copy()
    y_true = Y.copy()
    sub.decompose(preds, y_true)
    sub.expected_test_error(preds, y_true, 0.5)
    close(preds, P, atol=0, rtol=0, what="调用后的预测值")
    close(y_true, Y, atol=0, rtol=0, what="调用后的真实值")


@check("edge", "只有一轮时方差为 0", "只有一个训练集时没有波动，因此方差为 0，偏差平方等于均方误差。")
def one_round(sub):
    preds = np.array([[0.0, 1.0, 4.0]])
    y_true = np.array([1.0, 1.0, 1.0])
    bias_sq, variance = sub.decompose(preds, y_true)
    close(variance, 0.0, what="方差")
    close(bias_sq, 10.0 / 3.0, what="偏差平方")


@check("edge", "测试误差相同时选择较低阶数", "两个阶数并列时，选择更简单的模型。")
def best_tie(sub):
    results = {2: {"bias_sq": 0.1, "variance": 0.1, "test_error": 0.5}, 4: {"bias_sq": 0.0, "variance": 0.2, "test_error": 0.5}, 6: {"bias_sq": 0.0, "variance": 0.5, "test_error": 0.8}}
    equal(sub.best_degree(results), 2, what="best_degree")


@check("edge", "交叉点包含偏差与方差相等的情况", "交叉点是方差大于或等于偏差平方的最低阶数。")
def crossover_tie(sub):
    results = {1: {"bias_sq": 0.4, "variance": 0.1, "test_error": 0.75}, 2: {"bias_sq": 0.2, "variance": 0.2, "test_error": 0.65}, 3: {"bias_sq": 0.1, "variance": 0.3, "test_error": 0.65}}
    equal(sub.crossover_degree(results), 2, what="crossover_degree")


@check("edge", "没有交叉点时返回 None", "如果所有阶数的偏差平方都高于方差，就没有交叉点。")
def no_crossover(sub):
    results = {1: {"bias_sq": 0.4, "variance": 0.1, "test_error": 0.75}, 2: {"bias_sq": 0.3, "variance": 0.2, "test_error": 0.75}}
    equal(sub.crossover_degree(results), None, what="crossover_degree")


@fixture("predictions")
def predictions(ref):
    rng = np.random.default_rng(3)
    for b, t in [(1, 4), (3, 5), (10, 8)]:
        preds = rng.normal(size=(b, t)) * 2.0 + 1.0
        y_true = rng.normal(size=t)
        yield {"preds": preds, "y_true": y_true}, {"decompose": ref.decompose(preds, y_true), "error": ref.expected_test_error(preds, y_true, 0.25)}


@fixture("sweeps")
def sweeps(ref):
    for seed, n_train in [(100, 15), (200, 40)]:
        yield {"seed": seed, "n_train": n_train}, ref.sweep_degrees([1, 2, 4, 7], n_rounds=8, n_train=n_train, seed=seed)


@fixture("answers")
def answer_fixture(ref):
    yield {}, ref.answers()


@check("reference", "分解结果和误差与参考实现一致", "随机预测下的偏差平方、方差和测试误差都与参考实现一致。")
def reference_decompose(sub):
    for case, expected in fixtures("predictions"):
        bias_sq, variance = sub.decompose(case["preds"], case["y_true"])
        close(bias_sq, expected["decompose"][0], rtol=1e-9, what=f"形状为 {case['preds'].shape} 时的偏差平方")
        close(variance, expected["decompose"][1], rtol=1e-9, what=f"形状为 {case['preds'].shape} 时的方差")
        close(sub.expected_test_error(case["preds"], case["y_true"], 0.25), expected["error"], rtol=1e-9, what=f"形状为 {case['preds'].shape} 时的测试误差")


@check("reference", "使用其他 seed 的扫描与参考实现一致", "另外两个 seed 的扫描结果也与参考实现一致。")
def reference_sweeps(sub):
    for case, expected in fixtures("sweeps"):
        result = sub.sweep_degrees([1, 2, 4, 7], n_rounds=8, n_train=case["n_train"], seed=case["seed"])
        for degree in [1, 2, 4, 7]:
            for key in ["bias_sq", "variance", "test_error"]:
                close(result[degree][key], expected[degree][key], rtol=1e-7, what=f"{key}（阶数为 {degree}，种子为 {case['seed']}）")


@check("reference", "所有答案都与参考运行结果一致", "每个答案与参考运行结果的相对差异必须不超过 1e-6。")
def reference_answers(sub):
    result = run_answers(sub)
    for case, expected in fixtures("answers"):
        for key in KEYS:
            close(result.get(key), expected[key], rtol=1e-6, what=key)
