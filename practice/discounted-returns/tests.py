import numpy as np

from practice_check import check, close, fixture, fixtures, shape, true


@check("examples", '三步 episode 的回报', '第 t 步的回报等于该步奖励加 gamma 乘第 t + 1 步的回报。最后一步没有后续回报。')
def example_returns(sub):
    close(sub.returns_to_go(np.array([1.0, 0.0, 2.0]), 0.9), [2.62, 1.8, 2.0], what='回报')


@check("examples", '同一批次中两条 episode 的回报', 'dones[t] 为 True 时，第 t 步是该 episode 的最后一步。因此该步回报不包含第 t + 1 步的奖励。')
def example_batch(sub):
    rewards = np.array([1.0, 1.0, 1.0, 1.0, 1.0])
    dones = np.array([False, True, False, False, True])
    close(sub.batch_returns(rewards, dones, 0.5), [1.5, 1.0, 1.75, 1.5, 1.0], what='批次回报')


@check("examples", '归一化四个回报', '减去均值，再除以总体标准差加 1e-8。')
def example_normalize(sub):
    close(sub.normalize(np.array([1.0, 2.0, 3.0, 4.0])), [-1.34164077, -0.44721359, 0.44721359, 1.34164077], what='归一化回报')


@check("properties", '每个回报都符合递推关系', '除最后一步外，每一步都满足 G[t] = rewards[t] + gamma * G[t + 1]。')
def recursion(sub):
    rng = np.random.default_rng(0)
    rewards = rng.normal(size=12)
    gamma = 0.93
    G = sub.returns_to_go(rewards, gamma)
    shape(G, (12,), what='回报')
    close(G[:-1], rewards[:-1] + gamma * np.asarray(G)[1:], what='rewards[t] + gamma * G[t + 1]')
    close(G[-1], rewards[-1], what='最后一步的回报')


@check("properties", 'gamma 为 0 和 1', 'gamma = 0 时，每个回报都等于当前奖励。gamma = 1 时，每个回报是从当前步到末尾的奖励总和。')
def gamma_limits(sub):
    rewards = np.array([0.5, -1.0, 2.0, 3.0, -0.25])
    close(sub.returns_to_go(rewards, 0.0), rewards, what='gamma = 0 时的回报')
    close(sub.returns_to_go(rewards, 1.0), np.cumsum(rewards[::-1])[::-1], what='gamma = 1 时的回报')


@check("properties", '批次结果等于逐条计算 episode 后的拼接', '批次回报等于每条 episode 单独计算后按顺序拼接的结果。')
def batch_is_concatenation(sub):
    rng = np.random.default_rng(1)
    lengths = [3, 1, 5, 2]
    rewards = rng.normal(size=sum(lengths))
    dones = np.zeros(sum(lengths), dtype=bool)
    dones[np.cumsum(lengths) - 1] = True
    gamma = 0.8
    parts = []
    start = 0
    for n in lengths:
        parts.append(np.asarray(sub.returns_to_go(rewards[start:start + n], gamma)))
        start += n
    close(sub.batch_returns(rewards, dones, gamma), np.concatenate(parts), what='批次回报')


@check("properties", '归一化后的回报均值为 0、标准差为 1', '归一化会减去均值，并按总体标准差缩放。')
def normalize_moments(sub):
    rng = np.random.default_rng(2)
    out = np.asarray(sub.normalize(rng.normal(3.0, 5.0, size=40)), dtype=float)
    shape(out, (40,), what='归一化回报')
    close(np.mean(out), 0.0, atol=1e-9, what='均值')
    close(np.std(out), 1.0, atol=1e-6, what='总体标准差')


@check("properties", '输入不会被修改', '如果函数修改输入数组，会破坏调用方的后续逻辑。')
def inputs_unchanged(sub):
    rewards = np.array([1.0, -2.0, 0.5, 3.0])
    dones = np.array([False, True, False, False])
    saved_r, saved_d = rewards.copy(), dones.copy()
    sub.returns_to_go(rewards, 0.9)
    sub.batch_returns(rewards, dones, 0.9)
    sub.normalize(rewards)
    close(rewards, saved_r, atol=0, rtol=0, what='调用后的奖励数组')
    true(np.array_equal(dones, saved_d), "dones 数组被修改了", saved_d, dones)


@check("edge", '长度为 1 的 episode', '只有一步时，回报就等于该步奖励。')
def length_one(sub):
    close(sub.returns_to_go(np.array([4.0]), 0.99), [4.0], what='回报')
    close(sub.batch_returns(np.array([4.0]), np.array([True]), 0.99), [4.0], what='批次回报')


@check("edge", '每一步都是 done', '每一步都结束一条 episode 时，后续奖励不会累加到前面的步骤。每个回报都等于当前奖励。')
def done_every_step(sub):
    rewards = np.array([1.0, 2.0, 3.0, 4.0])
    close(sub.batch_returns(rewards, np.ones(4, dtype=bool), 0.9), rewards, what='批次回报')


@check("edge", '批次末尾未结束的 episode', '最后一个 done 之后的步骤没有 done 标记。将批次末尾当作回报求和的终点，不使用 bootstrap value。')
def trailing_partial(sub):
    rewards = np.array([1.0, 2.0, 1.0, 1.0, 1.0])
    dones = np.array([False, True, False, False, False])
    expected = np.concatenate([np.asarray(sub.returns_to_go(rewards[:2], 0.7)), np.asarray(sub.returns_to_go(rewards[2:], 0.7))])
    close(sub.batch_returns(rewards, dones, 0.7), expected, what='批次回报')
    close(sub.batch_returns(rewards, np.zeros(5, dtype=bool), 0.7), sub.returns_to_go(rewards, 0.7), what='没有 done 标记时的批次回报')


@check("edge", '归一化相同的回报', '所有回报相等时，标准差为 0。加上 1e-8 可避免除零，结果全为 0。')
def normalize_constant(sub):
    close(sub.normalize(np.array([2.0, 2.0, 2.0])), [0.0, 0.0, 0.0], atol=1e-12, what='归一化回报')


@check("edge", '只归一化一个回报', '少于两个值时无法衡量离散程度，原样返回这些值。')
def normalize_single(sub):
    close(sub.normalize(np.array([5.0])), [5.0], what='归一化回报')


@fixture("batches")
def batches(ref):
    rng = np.random.default_rng(42)
    for n, gamma, p_done in [(1, 0.99, 0.5), (6, 0.9, 0.3), (15, 0.99, 0.2), (20, 0.5, 0.5), (9, 1.0, 0.1)]:
        rewards = np.round(rng.normal(size=n) * 2.0, 3)
        dones = rng.random(n) < p_done
        yield {"rewards": rewards, "dones": dones, "gamma": gamma}, {
            "returns": ref.returns_to_go(rewards, gamma),
            "batch": ref.batch_returns(rewards, dones, gamma),
            "normalized": ref.normalize(ref.batch_returns(rewards, dones, gamma)),
        }


@check("reference", '5 个随机批次的回报与参考实现一致', '在不同长度、gamma 值和 done 模式的批次中，回报都与参考实现一致。')
def reference_returns(sub):
    for case, expected in fixtures("batches"):
        n = case["rewards"].shape[0]
        close(sub.returns_to_go(case["rewards"], case["gamma"]), expected["returns"], what=f"长度为 {n} 时的 returns_to_go 结果")
        close(sub.batch_returns(case["rewards"], case["dones"], case["gamma"]), expected["batch"], what=f"长度为 {n} 时的 batch_returns 结果")


@check("reference", '批次归一化结果与参考实现一致', '相同批次的归一化结果与参考实现一致。')
def reference_normalize(sub):
    for case, expected in fixtures("batches"):
        close(sub.normalize(expected["batch"]), expected["normalized"], what=f"长度为 {case['rewards'].shape[0]} 时的 normalize 结果")
