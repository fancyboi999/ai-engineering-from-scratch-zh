import numpy as np

from practice_check import check, close, fixture, fixtures, numeric_grad, shape, true

OLD = np.log(np.array([0.5, 0.5, 0.5, 0.5]))
NEW = np.log(np.array([0.7, 0.55, 0.3, 0.45]))
ADV = np.array([1.0, 2.0, -1.0, -0.5])


def away_from_kinks(rng, n, eps):
    logp_old = rng.normal(size=n) - 1.0
    deltas = rng.uniform(-0.5, 0.5, size=n)
    ratio = np.exp(deltas)
    near = (np.abs(ratio - (1 + eps)) < 0.02) | (np.abs(ratio - (1 - eps)) < 0.02)
    deltas[near] += 0.05
    advantages = rng.normal(size=n)
    advantages[np.abs(advantages) < 0.05] = 0.5
    return logp_old + deltas, logp_old, advantages


@check("examples", '四个样本的批次损失', '比率为 exp(logp_new - logp_old)。每个样本对应 min(r A, clip(r, 1 - eps, 1 + eps) A)。损失是这些值的均值取负。')
def example_loss(sub):
    close(sub.ppo_clip_loss(NEW, OLD, ADV), -0.5375000000000001, rtol=1e-9, what="损失")


@check("examples", '四个样本的裁剪比例', 'A > 0 且 r > 1 + eps，或 A < 0 且 r < 1 - eps 时样本被裁剪。样本 0 和 2 被裁剪，因此比例为 0.5。')
def example_fraction(sub):
    close(sub.clip_fraction(NEW, OLD, ADV), 0.5, what="裁剪比例")


@check("examples", '四个样本的批次梯度', '被裁剪样本的梯度为 0。其他样本的损失对新对数概率的梯度为 -r A / N。')
def example_grad(sub):
    close(sub.ppo_clip_grad(NEW, OLD, ADV), [0.0, -0.55, 0.0, 0.1125], rtol=1e-9, atol=1e-12, what="梯度")


@check("properties", '梯度与有限差分一致', '远离裁剪边界时损失是平滑的。微调一个新对数概率时，损失变化应等于梯度乘以变化量。')
def finite_differences(sub):
    rng = np.random.default_rng(0)
    for n, eps in [(6, 0.2), (9, 0.1), (5, 0.3)]:
        logp_new, logp_old, advantages = away_from_kinks(rng, n, eps)
        numeric = numeric_grad(lambda z: sub.ppo_clip_loss(z, logp_old, advantages, eps), logp_new)
        grad = sub.ppo_clip_grad(logp_new, logp_old, advantages, eps)
        shape(grad, (n,), what="梯度")
        close(grad, numeric, rtol=1e-5, atol=1e-8, what=f"N = {n} 且 eps = {eps} 时的梯度")


@check("properties", '策略不变时得到普通策略梯度', 'logp_new 等于 logp_old 时，所有比率都为 1。此时损失是平均优势值的相反数，梯度为 -A / N，且没有样本被裁剪。')
def same_policy(sub):
    rng = np.random.default_rng(1)
    logp = rng.normal(size=8) - 2.0
    advantages = rng.normal(size=8)
    close(sub.ppo_clip_loss(logp, logp, advantages), -np.mean(advantages), atol=1e-12, what="策略不变时的损失")
    close(sub.ppo_clip_grad(logp, logp, advantages), -advantages / 8, atol=1e-12, what="策略不变时的梯度")
    close(sub.clip_fraction(logp, logp, advantages), 0.0, what="策略不变时的裁剪比例")


@check("properties", '裁剪目标是下界', 'min 会选两项中的较小值。因此负损失不会大于 r A 的均值，也不会大于 clip(r) A 的均值。')
def pessimistic_bound(sub):
    rng = np.random.default_rng(2)
    logp_old = rng.normal(size=20) - 1.0
    logp_new = logp_old + rng.normal(scale=0.4, size=20)
    advantages = rng.normal(size=20)
    ratio = np.exp(logp_new - logp_old)
    objective = -sub.ppo_clip_loss(logp_new, logp_old, advantages)
    true(objective <= np.mean(ratio * advantages) + 1e-12, "损失的相反数大于 r A 的均值。请使用 np.minimum，而非 np.maximum。", float(np.mean(ratio * advantages)), objective)
    true(objective <= np.mean(np.clip(ratio, 0.8, 1.2) * advantages) + 1e-12, "损失的相反数大于 clip(r) A 的均值", float(np.mean(np.clip(ratio, 0.8, 1.2) * advantages)), objective)


@check("properties", '裁剪只在单侧生效', 'A > 0 时，小比率不会被裁剪，因为 min 会选择 r A。A < 0 时，大比率也不会被裁剪。这些样本仍有梯度。')
def one_sided_clip(sub):
    logp_old = np.log(np.array([0.5, 0.5]))
    logp_new = np.log(np.array([0.2, 0.9]))
    advantages = np.array([1.0, -1.0])
    close(sub.clip_fraction(logp_new, logp_old, advantages), 0.0, what="裁剪比例")
    ratio = np.exp(logp_new - logp_old)
    close(sub.ppo_clip_grad(logp_new, logp_old, advantages), -ratio * advantages / 2, rtol=1e-9, what="梯度")
    close(sub.ppo_clip_loss(logp_new, logp_old, advantages), -np.mean(ratio * advantages), rtol=1e-9, what="损失")


@check("properties", '输入不会被修改', '损失、裁剪比例和梯度只读取输入数组。')
def inputs_unchanged(sub):
    rng = np.random.default_rng(3)
    logp_new, logp_old, advantages = away_from_kinks(rng, 7, 0.2)
    saved = [logp_new.copy(), logp_old.copy(), advantages.copy()]
    sub.ppo_clip_loss(logp_new, logp_old, advantages)
    sub.clip_fraction(logp_new, logp_old, advantages)
    sub.ppo_clip_grad(logp_new, logp_old, advantages)
    for name, before, after in zip(["logp_new", "logp_old", "advantages"], saved, [logp_new, logp_old, advantages]):
        true(np.array_equal(before, after), f"代码修改了 {name}", before, after)


@check("edge", '所有样本都被裁剪', '所有样本均被裁剪时，裁剪比例为 1，梯度处处为 0。损失为 (1 + eps) A 或 (1 - eps) A 的均值取负。')
def all_clipped(sub):
    logp_old = np.log(np.array([0.2, 0.4, 0.5]))
    logp_new = np.log(np.array([0.4, 0.1, 0.9]))
    advantages = np.array([2.0, -1.0, 0.5])
    close(sub.clip_fraction(logp_new, logp_old, advantages), 1.0, what="裁剪比例")
    close(sub.ppo_clip_grad(logp_new, logp_old, advantages), np.zeros(3), atol=1e-15, what="梯度")
    close(sub.ppo_clip_loss(logp_new, logp_old, advantages), -0.7333333333333333, rtol=1e-9, what="损失")


@check("edge", '极小概率', '对数概率接近 -800 时，各自取指数都会变成 0。应将比率计算为 exp(logp_new - logp_old)。')
def tiny_probabilities(sub):
    logp_new = np.array([-800.0, -801.0])
    logp_old = np.array([-800.1, -800.9])
    advantages = np.array([1.0, -2.0])
    close(sub.ppo_clip_loss(logp_new, logp_old, advantages), 0.3522519589981026, rtol=1e-9, what="损失")
    close(sub.ppo_clip_grad(logp_new, logp_old, advantages), [-0.55258546, 0.90483742], rtol=1e-7, what="梯度")


@check("edge", '零优势值与单个样本', 'A = 0 的样本对损失贡献为 0，且不会被裁剪。只有一个样本时，均值就是该样本的值。')
def zero_and_one(sub):
    logp_old = np.log(np.array([0.3, 0.6, 0.5]))
    logp_new = np.log(np.array([0.9, 0.1, 0.5]))
    advantages = np.zeros(3)
    close(sub.ppo_clip_loss(logp_new, logp_old, advantages), 0.0, atol=1e-15, what="优势值全为 0 时的损失")
    close(sub.clip_fraction(logp_new, logp_old, advantages), 0.0, what="优势值全为 0 时的裁剪比例")
    close(sub.ppo_clip_grad(logp_new, logp_old, advantages), np.zeros(3), atol=1e-15, what="优势值全为 0 时的梯度")
    close(sub.ppo_clip_loss(np.array([np.log(0.6)]), np.array([np.log(0.5)]), np.array([3.0])), -3.5999999999999996, rtol=1e-9, what="单个样本且 r = 1.2 时的损失")


@fixture("batches")
def batches(ref):
    rng = np.random.default_rng(42)
    for n, eps, scale in [(5, 0.2, 0.3), (12, 0.1, 0.5), (20, 0.2, 0.2), (8, 0.3, 0.8)]:
        logp_old = rng.normal(size=n) - 1.5
        logp_new = logp_old + rng.normal(scale=scale, size=n)
        advantages = rng.normal(size=n)
        yield {"logp_new": logp_new, "logp_old": logp_old, "advantages": advantages, "eps": eps}, {
            "loss": ref.ppo_clip_loss(logp_new, logp_old, advantages, eps),
            "fraction": ref.clip_fraction(logp_new, logp_old, advantages, eps),
            "grad": ref.ppo_clip_grad(logp_new, logp_old, advantages, eps),
        }


@check("reference", '损失、裁剪比例和梯度与参考实现一致', '多个 eps 设置下，三个函数在随机批次上的结果都与参考实现一致。')
def reference_batches(sub):
    for case, expected in fixtures("batches"):
        args = (case["logp_new"], case["logp_old"], case["advantages"], case["eps"])
        label = f"N = {case['advantages'].size} 且 eps = {case['eps']}"
        close(sub.ppo_clip_loss(*args), expected["loss"], rtol=1e-9, atol=1e-12, what=f"{label} 时的损失")
        close(sub.clip_fraction(*args), expected["fraction"], what=f"{label} 时的裁剪比例")
        close(sub.ppo_clip_grad(*args), expected["grad"], rtol=1e-9, atol=1e-12, what=f"{label} 时的梯度")
