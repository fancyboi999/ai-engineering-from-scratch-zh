import numpy as np

from practice_check import check, close, fixture, fixtures, numeric_grad, shape, true

LOGP = np.array([[-1.0, -0.5, -2.0], [-0.3, -1.2, 0.0]])
OLD = np.array([[-1.1, -0.5, -1.0], [-0.6, -1.0, 0.0]])
REF = np.array([[-1.2, -0.4, -1.5], [-0.4, -1.1, 0.0]])
ADV = np.array([1.0, -1.0])
MASK = np.array([[True, True, True], [True, True, False]])


def away_from_clip(rng, n, length, clip_eps):
    old = rng.normal(size=(n, length)) - 1.0
    while True:
        delta = rng.uniform(-0.5, 0.5, size=(n, length))
        ratio = np.exp(delta)
        if np.all(np.abs(ratio - (1 + clip_eps)) > 1e-3) and np.all(np.abs(ratio - (1 - clip_eps)) > 1e-3):
            return old + delta, old


@check("examples", "两组各四个回答的优势值", "从每个奖励中减去组内均值，再除以该组的总体标准差加 eps。")
def example_adv(sub):
    adv = sub.group_advantages(np.array([[1.0, 0.0, 0.0, 1.0], [0.0, 0.0, 1.0, 0.0]]))
    close(adv, [[0.99999998, -0.99999998, -0.99999998, 0.99999998], [-0.57735026, -0.57735026, 1.73205077, -0.57735026]], rtol=1e-7, what="优势值")


@check("examples", "三个 token 的 k3 估计值", "k3 等于 pi_ref / pi_theta 减去该比值的对数，再减去 1。两个对数概率相等时，k3 为 0。")
def example_k3(sub):
    close(sub.kl_k3(np.array([-1.0, -2.0, -0.5]), np.array([-1.0, -1.5, -1.0])), [0.0, 0.14872127, 0.10653066], rtol=1e-7, atol=1e-12, what="k3 估计值")


@check("examples", "两条序列的裁剪目标", "取未裁剪和裁剪后的替代目标的较小值，减去 beta 乘以 k3，先平均每条序列的有效 token，再平均各序列。")
def example_objective(sub):
    close(sub.grpo_objective(LOGP, OLD, REF, ADV, MASK), -0.13122323326245566, rtol=1e-10, what="beta = 0.04 时的目标值")
    close(sub.grpo_objective(LOGP, OLD, REF, ADV, MASK, clip_eps=0.2, beta=0.0), -0.1299723302889813, rtol=1e-10, what="beta = 0 时的目标值")


@check("properties", "每组均值为 0、标准差近似为 1", "归一化后，每组优势值的均值为 0。除去小数值 eps 带来的偏差，总体标准差为 1。")
def adv_normalized(sub):
    rng = np.random.default_rng(0)
    rewards = rng.normal(size=(5, 8)) * 3.0 + 2.0
    adv = np.asarray(sub.group_advantages(rewards))
    shape(adv, (5, 8), what="优势值")
    close(adv.mean(axis=1), np.zeros(5), atol=1e-12, what="各组的均值")
    close(adv.std(axis=1), np.ones(5), rtol=1e-7, what="各组的标准差")


@check("properties", "奖励正仿射变换后优势值不变", "每组有各自的均值和尺度。加常数或乘正数后，优势值保持一致，因此容易和困难的 prompt 组可以比较。")
def adv_affine(sub):
    rng = np.random.default_rng(1)
    rewards = rng.random(size=(3, 6))
    shifted = rewards * np.array([[2.0], [10.0], [0.5]]) + np.array([[1.0], [-4.0], [7.0]])
    close(sub.group_advantages(shifted), sub.group_advantages(rewards), rtol=1e-6, atol=1e-7, what="奖励缩放后的优势值")


@check("properties", "k3 非负且是 KL(pi_theta || pi_ref) 的无偏估计", "k3 始终非负。当 token 来自 pi_theta 时，其均值等于精确 KL 散度。检查比值方向：分子是 pi_ref，分母是 pi_theta。")
def k3_unbiased(sub):
    rng = np.random.default_rng(2)
    z = rng.normal(size=6)
    w = rng.normal(size=6)
    logp = z - np.log(np.sum(np.exp(z)))
    logq = w - np.log(np.sum(np.exp(w)))
    k3 = np.asarray(sub.kl_k3(logp, logq))
    true(np.all(k3 >= 0), "存在负的 k3 估计值", "大于或等于 0 的值", k3)
    exact = float(np.sum(np.exp(logp) * (logp - logq)))
    close(np.sum(np.exp(logp) * k3), exact, rtol=1e-10, what="pi_theta 下 k3 的期望")


@check("properties", "更新开始时目标等于平均优势值", "当 pi_theta 等于 pi_old 和 pi_ref 时，所有比值为 1，所有 k3 为 0。每条序列贡献自己的优势值，因此目标等于优势值的均值。")
def objective_at_start(sub):
    rng = np.random.default_rng(3)
    logp = rng.normal(size=(4, 5)) - 1.0
    adv = np.array([0.5, -1.0, 2.0, 0.25])
    mask = np.ones((4, 5), dtype=bool)
    mask[1, 3:] = False
    mask[2, 1:] = False
    close(sub.grpo_objective(logp, logp, logp, adv, mask), float(np.mean(adv)), rtol=1e-12, what="目标值")


@check("properties", "梯度与论文的裁剪替代目标一致", "在裁剪范围内，或较小值来自未裁剪项时，token 的梯度等于比值乘以 A。裁剪项更小时，梯度为 0。KL 项额外贡献 -beta * (1 - pi_ref / pi_theta)。每个 token 再乘以 1 / (N |o_i|)。")
def objective_gradient(sub):
    rng = np.random.default_rng(4)
    clip_eps, beta = 0.2, 0.1
    logp, old = away_from_clip(rng, 3, 4, clip_eps)
    ref = old + rng.normal(size=(3, 4)) * 0.3
    adv = np.array([1.5, -0.7, 0.4])
    mask = np.array([[True, True, True, True], [True, True, False, False], [True, False, False, False]])
    ratio = np.exp(logp - old)
    unclipped = ratio * adv[:, None]
    clipped = np.clip(ratio, 1 - clip_eps, 1 + clip_eps) * adv[:, None]
    surrogate = np.where(unclipped <= clipped, ratio * adv[:, None], 0.0)
    kl = -(1.0 - np.exp(ref - logp))
    expected = (surrogate + beta * kl) * mask / mask.sum(axis=1, keepdims=True) / 3
    grad = numeric_grad(lambda x: sub.grpo_objective(x, old, ref, adv, mask, clip_eps=clip_eps, beta=beta), logp, eps=1e-6)
    close(grad, expected, rtol=1e-5, atol=1e-8, what="目标函数的有限差分梯度")


@check("properties", "输入未被修改", "函数不得写入奖励、对数概率、优势值或掩码数组。")
def inputs_unchanged(sub):
    rewards = np.array([[1.0, 0.0, 1.0]])
    arrays = [LOGP.copy(), OLD.copy(), REF.copy(), ADV.copy(), MASK.copy()]
    saved = [a.copy() for a in arrays] + [rewards.copy()]
    sub.group_advantages(rewards)
    sub.kl_k3(arrays[0], arrays[2])
    sub.grpo_objective(*arrays)
    for name, before, after in zip(["logp", "old_logp", "ref_logp", "advantages", "mask", "rewards"], saved, arrays + [rewards]):
        true(np.array_equal(before, after), f"函数修改了 {name}", before, after)


@check("edge", "组内奖励相同时优势值为零", "组内所有奖励相同时，标准差为 0。eps 使除法结果保持有限，所有优势值均为 0。")
def equal_rewards(sub):
    close(sub.group_advantages(np.array([[1.0, 1.0, 1.0], [0.0, 1.0, 0.0]])), [[0.0, 0.0, 0.0], [-0.70710677, 1.41421353, -0.70710677]], rtol=1e-7, atol=1e-12, what="优势值")


@check("edge", "填充 token 不影响目标", "mask 为 False 的 token 是填充项。改变其对数概率不应改变目标值。")
def padding_ignored(sub):
    base = sub.grpo_objective(LOGP, OLD, REF, ADV, MASK)
    noisy = LOGP.copy()
    noisy[1, 2] = -50.0
    close(sub.grpo_objective(noisy, OLD, REF, ADV, MASK), base, rtol=1e-12, what="改变填充 token 后的目标值")


@check("edge", "比值较大时裁剪限制收益", "当 A > 0 且比值超过 1 + eps 时，较小值来自裁剪项。此时继续增大对数概率不会提高替代目标。")
def clip_saturates(sub):
    old = np.array([[-2.0]])
    adv = np.array([1.0])
    mask = np.array([[True]])
    a = sub.grpo_objective(np.array([[-1.5]]), old, np.array([[-1.5]]), adv, mask, beta=0.0)
    b = sub.grpo_objective(np.array([[-0.5]]), old, np.array([[-0.5]]), adv, mask, beta=0.0)
    close(a, 1.2, rtol=1e-12, what="比值为 exp(0.5) 时的目标值")
    close(b, 1.2, rtol=1e-12, what="比值为 exp(1.5) 时的目标值")


@fixture("cases")
def cases(ref):
    rng = np.random.default_rng(42)
    for n, length, clip_eps, beta in [(2, 3, 0.2, 0.04), (4, 5, 0.1, 0.0), (6, 4, 0.3, 0.1), (8, 6, 0.2, 0.04)]:
        rewards = rng.integers(0, 2, size=(1, n)).astype(float)
        adv = ref.group_advantages(rewards)[0]
        old = rng.normal(size=(n, length)) - 1.0
        logp = old + rng.normal(size=(n, length)) * 0.3
        ref_logp = old + rng.normal(size=(n, length)) * 0.3
        lengths = rng.integers(1, length + 1, size=n)
        mask = np.arange(length)[None, :] < lengths[:, None]
        yield {"rewards": rewards, "logp": logp, "old_logp": old, "ref_logp": ref_logp, "mask": mask, "clip_eps": clip_eps, "beta": beta}, {"advantages": adv, "k3": ref.kl_k3(logp, ref_logp), "objective": ref.grpo_objective(logp, old, ref_logp, adv, mask, clip_eps=clip_eps, beta=beta)}


@check("reference", "4 组数据的优势值、k3 和目标与参考解一致", "对于包含填充项的随机分组，优势值、k3 估计值和目标值应与参考解一致。")
def reference_cases(sub):
    for case, expected in fixtures("cases"):
        label = f"包含 {case['logp'].shape[0]} 个回答的组，clip_eps = {case['clip_eps']}，beta = {case['beta']}"
        adv = np.asarray(sub.group_advantages(case["rewards"]))
        close(adv[0] if adv.ndim == 2 else adv, expected["advantages"], rtol=1e-9, atol=1e-12, what=f"{label} 时的优势值")
        close(sub.kl_k3(case["logp"], case["ref_logp"]), expected["k3"], rtol=1e-10, atol=1e-14, what=f"{label} 时的 k3 估计值")
        close(sub.grpo_objective(case["logp"], case["old_logp"], case["ref_logp"], expected["advantages"], case["mask"], clip_eps=case["clip_eps"], beta=case["beta"]), expected["objective"], rtol=1e-10, what=f"{label} 时的目标值")
