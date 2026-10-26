import numpy as np

from practice_check import check, close, equal, fixture, fixtures, true

P = np.array([0.5, 0.3, 0.2, 0.0])
Q = np.array([0.25, 0.25, 0.25, 0.25])
TARGET = np.array([[0.5, 0.3, 0.2, 0.0], [0.1, 0.6, 0.2, 0.1], [0.25, 0.25, 0.25, 0.25]])
DRAFT = np.array([[0.25, 0.25, 0.25, 0.25], [0.4, 0.2, 0.2, 0.2]])


def random_dist(rng, v, zeros=0):
    x = rng.random(v) + 0.05
    if zeros:
        x[rng.choice(v, size=zeros, replace=False)] = 0.0
    return x / np.sum(x)


def first_token_counts(sub, target, draft, n, seed):
    rng = np.random.default_rng(seed)
    counts = np.zeros(target.size)
    for _ in range(n):
        token = int(rng.choice(draft.size, p=draft))
        counts[sub.speculative_step(np.array([target, target]), np.array([draft]), [token], rng)[0]] += 1
    return counts / n


@check("examples", '示例分布对的接受率和残差', '接受率是词表上 min(p, q) 的总和。残差为 max(0, p - q) 后除以其总和。')
def example_rate_residual(sub):
    close(sub.acceptance_rate(P, Q), 0.7, rtol=1e-12, what="接受率")
    close(sub.residual_distribution(P, Q), [0.83333333, 0.16666667, 0.0, 0.0], rtol=1e-7, atol=1e-12, what="残差分布")


@check("examples", '使用固定随机种子执行三步推测解码', '按从左到右的顺序，为每个 draft token 抽取一次 rng.random()。抽样值小于 min(1, p / q) 时接受。若发生拒绝，则从残差分布抽取一个 token 后停止。全部接受时，从 target 最后一行抽取一个 bonus token。')
def example_steps(sub):
    equal(list(sub.speculative_step(TARGET, DRAFT, [0, 1], np.random.default_rng(0))), [0, 1, 0], what="draft 为 [0, 1] 且种子为 0 时的 token")
    equal(list(sub.speculative_step(TARGET, DRAFT, [3, 0], np.random.default_rng(0))), [0], what="draft 为 [3, 0] 且种子为 0 时的 token")
    equal(list(sub.speculative_step(TARGET, DRAFT, [0, 0], np.random.default_rng(3))), [0, 0, 3], what="draft 为 [0, 0] 且种子为 3 时的 token")


@check("examples", '每次调用 target 的期望 token 数', '接受率为 alpha 且有 gamma 个 draft token 时，期望输出数为 (1 - alpha^(gamma + 1)) / (1 - alpha)。alpha = 1 时为 gamma + 1。')
def example_expected(sub):
    close(sub.expected_tokens(0.8, 4), 3.3616, rtol=1e-12, what="expected_tokens(0.8, 4)")
    close(sub.expected_tokens(1.0, 4), 5.0, rtol=1e-12, what="expected_tokens(1.0, 4)")
    close(sub.expected_tokens(0.0, 4), 1.0, rtol=1e-12, what="expected_tokens(0.0, 4)")


@check("properties", '输出分布与 target 完全一致', 'token 可以在 draft 提议且被接受时输出，也可以在拒绝后从残差分布中采样输出。因此 P(x) = q(x) min(1, p(x) / q(x)) + (1 - alpha) residual(x)，该和必须等于 p(x)。')
def exact_distribution(sub):
    rng = np.random.default_rng(0)
    for v, zp, zq in [(4, 0, 0), (6, 2, 0), (6, 0, 2), (10, 3, 3)]:
        p = random_dist(rng, v, zp)
        q = random_dist(rng, v, zq)
        alpha = sub.acceptance_rate(p, q)
        accepted = np.where(q > 0, q * np.minimum(1.0, np.divide(p, q, out=np.ones_like(p), where=q > 0)), 0.0)
        close(accepted + (1.0 - alpha) * np.asarray(sub.residual_distribution(p, q)), p, atol=1e-12, what=f"词表大小为 {v} 时的输出分布")


@check("properties", '首个输出 token 符合 target 分布', '使用固定种子运行 10000 步，每步从 q 提议一个 draft token。每种首个输出 token 的频率与 p 的差异不得超过 0.02。发生拒绝时应从残差分布采样，而不是从 p 采样。')
def sampled_distribution(sub):
    p = np.array([0.1, 0.2, 0.3, 0.4])
    q = np.array([0.4, 0.3, 0.2, 0.1])
    freq = first_token_counts(sub, p, q, 10000, 7)
    true(np.max(np.abs(freq - p)) < 0.02, "输出 token 不符合 target 分布", p, freq)


@check("properties", '接受率具有对称性且不超过 1', 'alpha 等于 min(p, q) 的总和，交换 p 和 q 后不变。p = q 时 alpha 为 1；一般情况下等于 1 减去一半 L1 距离。')
def alpha_properties(sub):
    rng = np.random.default_rng(1)
    p = random_dist(rng, 8)
    q = random_dist(rng, 8)
    close(sub.acceptance_rate(p, q), sub.acceptance_rate(q, p), rtol=1e-12, what="交换后的 alpha")
    close(sub.acceptance_rate(p, q), 1.0 - 0.5 * np.sum(np.abs(p - q)), rtol=1e-12, what="alpha")
    close(sub.acceptance_rate(p, p), 1.0, rtol=1e-12, what="p 等于 q 时的 alpha")


@check("properties", '输出长度等于接受数加一', '每步会返回所有被接受的 draft token，再额外返回一个 token。被接受的 token 是 draft 序列开头的若干项，顺序不变。')
def output_length(sub):
    rng = np.random.default_rng(2)
    target = np.array([random_dist(rng, 5) for _ in range(4)])
    draft = np.array([random_dist(rng, 5) for _ in range(3)])
    tokens = [int(rng.choice(5, p=d)) for d in draft]
    for seed in range(20):
        out = list(sub.speculative_step(target, draft, tokens, np.random.default_rng(seed)))
        true(1 <= len(out) <= 4, "该步骤必须返回 1 到 gamma + 1 个 token", "1 到 4 个 token", out)
        equal(out[:-1], tokens[:len(out) - 1], what=f"种子为 {seed} 时被接受的 token")


@check("properties", '输入不会被修改', '如果函数修改 target 或 draft 概率数组，会破坏调用它的解码器。')
def inputs_unchanged(sub):
    target = TARGET.copy()
    draft = DRAFT.copy()
    tokens = [3, 0]
    sub.acceptance_rate(target[0], draft[0])
    sub.residual_distribution(target[0], draft[0])
    sub.speculative_step(target, draft, tokens, np.random.default_rng(0))
    true(np.array_equal(target, TARGET), "函数修改了 target 概率", TARGET, target)
    true(np.array_equal(draft, DRAFT), "函数修改了 draft 概率", DRAFT, draft)
    equal(tokens, [3, 0], what="draft token")


@check("edge", '两个分布相同时，所有 draft token 都会被接受', 'p = q 时，min(1, p / q) 为 1，因此每个 draft token 都会被接受。残差 max(0, p - q) 全为 0，此时返回 p 的副本。')
def equal_distributions(sub):
    p = np.array([0.2, 0.5, 0.3])
    close(sub.residual_distribution(p, p), p, what="p 等于 q 时的残差")
    for seed in range(10):
        out = list(sub.speculative_step(np.array([p, p, p]), np.array([p, p]), [1, 2], np.random.default_rng(seed)))
        equal(out[:2], [1, 2], what=f"种子为 {seed} 时被接受的 token")
        true(len(out) == 3, "全部接受时必须额外添加一个 token", 3, len(out))


@check("edge", 'target 概率为 0 的 token 总会被拒绝', 'p(x) 为 0 时，接受概率也是 0。残差不会采样到 x，因为 max(0, p(x) - q(x)) 为 0。')
def zero_target(sub):
    for seed in range(20):
        out = list(sub.speculative_step(TARGET, DRAFT, [3, 0], np.random.default_rng(seed)))
        true(len(out) == 1 and out[0] != 3, "p = 0 的 draft token 被接受或从残差分布中输出", "一个不为 3 的 token", out)


@check("edge", '没有 draft token', 'gamma = 0 时，该步骤会从唯一一行 target 分布中采样一个 token。')
def no_drafts(sub):
    target = np.array([[0.0, 1.0, 0.0]])
    equal(list(sub.speculative_step(target, np.zeros((0, 3)), [], np.random.default_rng(0))), [1], what="token")
    close(sub.expected_tokens(0.5, 0), 1.0, rtol=1e-12, what="expected_tokens(0.5, 0)")


@fixture("cases")
def cases(ref):
    rng = np.random.default_rng(42)
    for v, gamma, seed in [(4, 1, 0), (5, 2, 1), (6, 3, 2), (8, 4, 3), (3, 2, 4)]:
        target = np.array([random_dist(rng, v, 1) for _ in range(gamma + 1)])
        draft = np.array([random_dist(rng, v) for _ in range(gamma)])
        tokens = [int(rng.choice(v, p=d)) for d in draft]
        alpha = ref.acceptance_rate(target[0], draft[0])
        yield {"target": target, "draft": draft, "tokens": tokens, "seed": seed}, {"out": ref.speculative_step(target, draft, tokens, np.random.default_rng(seed)), "alpha": alpha, "residual": ref.residual_distribution(target[0], draft[0]), "expected": ref.expected_tokens(alpha, gamma)}


@check("reference", '步骤、接受率和残差与参考实现一致', '使用相同种子并按相同顺序抽取随机数时，该步骤返回的 token 与参考实现一致。')
def reference_cases(sub):
    for case, expected in fixtures("cases"):
        label = f"词表大小为 {case['target'].shape[1]}、gamma = {len(case['tokens'])} 且种子为 {case['seed']}"
        close(sub.acceptance_rate(case["target"][0], case["draft"][0]), expected["alpha"], rtol=1e-12, what=f"{label} 时的 alpha")
        close(sub.residual_distribution(case["target"][0], case["draft"][0]), expected["residual"], rtol=1e-10, atol=1e-14, what=f"{label} 时的残差")
        close(sub.expected_tokens(expected["alpha"], len(case["tokens"])), expected["expected"], rtol=1e-12, what=f"{label} 时的期望 token 数")
        equal(list(sub.speculative_step(case["target"], case["draft"], case["tokens"], np.random.default_rng(case["seed"]))), expected["out"], what=f"{label} 时的 token")
