import numpy as np

from practice_check import check, close, equal, fixture, fixtures, shape, true
from support import LEARNING_RATES, make_regression, train

KEYS = ["best_lr", "best_final_loss", "smallest_diverging_lr", "stability_bound"]


@check("examples", '损失曲线下降时未发散，上升时视为发散', '最终损失不是有限值或高于初始损失时，运行判定为发散。')
def example_diverged(sub):
    equal(bool(sub.is_diverged(np.array([2.0, 1.0, 0.5]))), False, what="损失曲线下降时的 is_diverged 结果")
    equal(bool(sub.is_diverged(np.array([1.0, 2.0, 3.0]))), True, what="损失曲线上升时的 is_diverged 结果")


@check("examples", 'best_lr 会跳过发散运行', '最佳学习率是未发散运行中最终损失最低的那个。')
def example_best(sub):
    curves = np.array([[1.0, 0.5], [1.0, 0.2], [1.0, np.inf]])
    close(sub.best_lr([0.1, 0.2, 0.3], curves), 0.2, what="best_lr")


@check("examples", '对角矩阵的稳定界限', '界限为 2 除以 Hessian (2 / n) X^T X 的最大特征值。')
def example_bound(sub):
    close(sub.stability_bound(np.array([[1.0, 0.0], [0.0, 2.0]])), 0.5, what="stability_bound")


@check("properties", 'run_sweep 为每个学习率返回一条曲线', '扫描结果第 i 行是 train 使用 lrs[i] 时的损失曲线。每条曲线有 steps + 1 个值。')
def sweep_shape(sub):
    X, y = make_regression(seed=3, n=16)
    curves = sub.run_sweep(X, y, [0.01, 0.1], steps=5)
    shape(curves, (2, 6), what="学习率扫描结果")
    close(curves[1], train(X, y, 0.1, 5), what="学习率为 0.1 时的损失曲线")


@check("properties", 'answers 包含全部键，且值均为数值', '检查会为每个问题读取一个有限数值。')
def answer_keys(sub):
    result = sub.answers()
    equal(sorted(result.keys()), sorted(KEYS), what="answers() 返回的键")
    for key in KEYS:
        true(isinstance(result[key], (int, float)) and np.isfinite(result[key]), f"{key} 必须是有限数值", "数值", result[key])


@check("properties", '最佳学习率低于界限，第一个发散学习率高于界限', '二次函数上的梯度下降只有在学习率低于 2 除以 Hessian 最大特征值时才稳定。')
def bound_between(sub):
    result = sub.answers()
    true(result["best_lr"] < result["stability_bound"] < result["smallest_diverging_lr"], "稳定界限必须位于最佳学习率和最小发散学习率之间", "best_lr < stability_bound < smallest_diverging_lr", result)


@check("properties", 'X 乘以 sqrt(2) 后，界限减半', 'Hessian 会随 X 的缩放系数平方增长，因此稳定学习率会按相同比例缩小。')
def bound_scaling(sub):
    X, _ = make_regression(seed=4, n=20)
    close(sub.stability_bound(X * np.sqrt(2.0)), sub.stability_bound(X) / 2.0, rtol=1e-9, what="缩放 X 后的稳定界限")


@check("properties", '输入不会被修改', '若辅助函数修改损失曲线，会影响后续问题的数据。')
def inputs_unchanged(sub):
    curves = np.array([[1.0, 0.5], [1.0, 0.2]])
    saved = curves.copy()
    X = np.array([[1.0, 2.0], [3.0, 4.0]])
    saved_x = X.copy()
    sub.is_diverged(curves[0])
    sub.best_lr([0.1, 0.2], curves)
    sub.smallest_diverging_lr([0.1, 0.2], curves)
    sub.stability_bound(X)
    close(curves, saved, atol=0, rtol=0, what="调用后的损失曲线")
    close(X, saved_x, atol=0, rtol=0, what="调用后的 X")


@check("edge", '有限损失曲线的终值高于初值时也算发散', '损失持续增长但仍为有限数值，也属于发散。')
def finite_growth(sub):
    equal(bool(sub.is_diverged(np.array([1.0, 0.4, 1.5]))), True, what="is_diverged")


@check("edge", '含 NaN 的曲线不会成为最佳结果', 'np.argmin 可能将 NaN 当作最小值。选择最佳学习率前先排除发散运行。')
def nan_curve(sub):
    curves = np.array([[1.0, np.nan], [1.0, 0.3], [1.0, 0.6]])
    close(sub.best_lr([0.5, 0.1, 0.05], curves), 0.1, what="best_lr")
    close(sub.smallest_diverging_lr([0.5, 0.1, 0.05], curves), 0.5, what="smallest_diverging_lr")


@check("edge", '学习率顺序任意', '按数值返回最小发散学习率，而不是列表中的第一个。')
def unsorted_rates(sub):
    curves = np.array([[1.0, np.inf], [1.0, 0.3], [1.0, np.inf]])
    close(sub.smallest_diverging_lr([0.8, 0.1, 0.4], curves), 0.4, what="smallest_diverging_lr")


@check("edge", '最终损失相同时选择较小学习率', '两次运行的最终损失相同时，较小的学习率更稳妥。')
def ties(sub):
    curves = np.array([[1.0, 0.2], [1.0, 0.2]])
    close(sub.best_lr([0.3, 0.1], curves), 0.1, what="best_lr")


@check("edge", '没有发散运行或没有稳定运行时返回 None', '没有运行发散时，smallest_diverging_lr 为 None。所有运行都发散时，best_lr 为 None。')
def none_cases(sub):
    calm = np.array([[1.0, 0.5], [1.0, 0.4]])
    wild = np.array([[1.0, np.inf], [1.0, 2.0]])
    equal(sub.smallest_diverging_lr([0.1, 0.2], calm), None, what="没有发散运行时的 smallest_diverging_lr 结果")
    equal(sub.best_lr([0.1, 0.2], wild), None, what="所有运行都发散时的 best_lr 结果")


@fixture("problems")
def problems(ref):
    for seed, n in [(1, 12), (2, 30), (5, 48)]:
        X, y = make_regression(seed=seed, n=n)
        curves = ref.run_sweep(X, y, LEARNING_RATES, steps=40)
        yield {"seed": seed, "n": n}, {
            "best": ref.best_lr(LEARNING_RATES, curves),
            "diverged": ref.smallest_diverging_lr(LEARNING_RATES, curves),
            "bound": ref.stability_bound(X),
        }


@fixture("answers")
def answer_fixture(ref):
    yield {}, ref.answers()


@check("reference", '另外三个问题上的扫描结果与参考实现一致', '对另外三个随机种子，扫描辅助函数得到的最佳学习率、发散学习率和界限都与参考实现一致。')
def reference_sweeps(sub):
    for case, expected in fixtures("problems"):
        X, y = make_regression(seed=case["seed"], n=case["n"])
        curves = sub.run_sweep(X, y, LEARNING_RATES, steps=40)
        close(sub.best_lr(LEARNING_RATES, curves), expected["best"], what=f"随机种子为 {case['seed']} 时的 best_lr 结果")
        close(sub.smallest_diverging_lr(LEARNING_RATES, curves), expected["diverged"], what=f"随机种子为 {case['seed']} 时的 smallest_diverging_lr 结果")
        close(sub.stability_bound(X), expected["bound"], rtol=1e-9, what=f"随机种子为 {case['seed']} 时的 stability_bound 结果")


@check("reference", '每个答案都与参考运行一致', '每个答案与参考运行结果的相对误差都必须小于 1e-6。')
def reference_answers(sub):
    result = sub.answers()
    for case, expected in fixtures("answers"):
        for key in KEYS:
            close(result.get(key), expected[key], rtol=1e-6, what=key)
