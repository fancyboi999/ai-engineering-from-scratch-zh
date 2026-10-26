import numpy as np

from practice_check import check, close, equal, fixture, fixtures, true

Q3 = np.array([[0.0, 1.0], [2.0, -1.0], [0.5, 0.5]])
TIES = np.array([[1.0, 3.0, 3.0, 0.0]])


def manual_policy(q_row, epsilon, rng, n):
    actions = []
    for _ in range(n):
        if rng.random() < epsilon:
            actions.append(int(rng.integers(len(q_row))))
        else:
            actions.append(int(np.flatnonzero(q_row == np.max(q_row))[0]))
    return actions


@check("examples", '执行一次 Q-learning 更新', "目标值为 r + gamma * max(Q[s', a'])。Q[s, a] 会向目标值移动 alpha 乘以两者之差。")
def example_q(sub):
    close(sub.q_learning_update(Q3.copy(), 0, 1, -1.0, 1, False, alpha=0.5, gamma=0.9), [[0.0, 0.9], [2.0, -1.0], [0.5, 0.5]], what="更新后的 Q 表")


@check("examples", '执行一次 SARSA 更新', "SARSA 使用 agent 实际执行的下一动作，因此目标值为 r + gamma * Q[s', a']，其中 a' 是给定动作。")
def example_sarsa(sub):
    close(sub.sarsa_update(Q3.copy(), 0, 1, -1.0, 1, 1, False, alpha=0.5, gamma=0.9), [[0.0, -0.45], [2.0, -1.0], [0.5, 0.5]], what="更新后的 Q 表")


@check("examples", "终止转移不使用自举", 'done 为 True 时，下一状态没有未来，目标值只有奖励 r。')
def example_terminal(sub):
    close(sub.q_learning_update(Q3.copy(), 0, 1, -1.0, 1, True, alpha=0.5, gamma=0.9), [[0.0, 0.0], [2.0, -1.0], [0.5, 0.5]], what="终止步之后更新得到的 Q 表")


@check("examples", '固定随机种子的 epsilon-greedy', '抽取 u = rng.random()。若 u < epsilon，则返回 rng.integers(n_actions)。否则返回贪心动作，并在并列时选索引最小者。')
def example_policy(sub):
    rng = np.random.default_rng(7)
    actions = [sub.epsilon_greedy(TIES, 0, 0.5, rng) for _ in range(12)]
    equal(actions, [1, 1, 1, 0, 1, 1, 1, 1, 3, 1, 3, 1], what="12 次选择得到的动作")


@check("properties", '只修改 Q[s, a]，且不会修改输入', '一次状态转移只更新一个元素。函数会返回新表，并保持调用方原表不变。')
def one_entry(sub):
    rng = np.random.default_rng(0)
    Q = rng.normal(size=(5, 3))
    saved = Q.copy()
    for fn, args in [(sub.q_learning_update, (Q, 2, 1, 0.7, 4, False, 0.3, 0.95)), (sub.sarsa_update, (Q, 2, 1, 0.7, 4, 0, False, 0.3, 0.95))]:
        new = np.asarray(fn(*args))
        true(np.array_equal(Q, saved), f"{fn.__name__} 修改了输入表", saved, Q)
        mask = np.ones_like(Q, dtype=bool)
        mask[2, 1] = False
        true(np.array_equal(new[mask], saved[mask]), f"{fn.__name__} 修改了 Q[s, a] 以外的元素", saved, new)


@check("properties", 'alpha 控制向目标值移动的步长', 'alpha = 1 时，新 Q[s, a] 等于目标值；alpha = 0 时不发生变化。若 Q[s, a] 已等于目标值，更新后也保持不变。')
def alpha_limits(sub):
    rng = np.random.default_rng(1)
    Q = rng.normal(size=(4, 3))
    target = 0.4 + 0.8 * np.max(Q[3])
    close(np.asarray(sub.q_learning_update(Q, 0, 2, 0.4, 3, False, alpha=1.0, gamma=0.8))[0, 2], target, atol=1e-12, what="alpha = 1 时的 Q[0, 2]")
    close(sub.q_learning_update(Q, 0, 2, 0.4, 3, False, alpha=0.0, gamma=0.8), Q, atol=1e-15, what="alpha = 0 时的 Q 表")
    fixed = Q.copy()
    fixed[1, 0] = 0.4 + 0.8 * fixed[3, 1]
    close(sub.sarsa_update(fixed, 1, 0, 0.4, 3, 1, False, alpha=0.5, gamma=0.8), fixed, atol=1e-12, what="Q[s, a] 已等于 SARSA 目标时的 Q 表")


@check("properties", "a' 为贪心动作时，Q-learning 与 SARSA 结果相同", 'Q-learning 使用下一状态的最大动作价值。SARSA 的下一动作若是贪心动作，目标值也相同，因此两种更新结果一致。')
def greedy_agreement(sub):
    rng = np.random.default_rng(2)
    Q = rng.normal(size=(6, 4))
    for s, a, r, s_next in [(0, 1, 1.0, 3), (5, 0, -2.0, 2), (3, 3, 0.5, 3)]:
        greedy = int(np.argmax(Q[s_next]))
        close(sub.sarsa_update(Q, s, a, r, s_next, greedy, False, 0.2, 0.9), sub.q_learning_update(Q, s, a, r, s_next, False, 0.2, 0.9), atol=1e-12, what=f"s' = {s_next}、a' 为贪心动作时的 SARSA 更新结果")


@check("properties", 'epsilon-greedy 按规定顺序抽取随机数', '每次调用都会抽取一次 rng.random()。只有结果小于 epsilon 时，才会抽取 rng.integers(n_actions)。相同种子会产生相同动作。')
def draw_order(sub):
    rng_q = np.random.default_rng(3)
    Q = rng_q.normal(size=(3, 5))
    for epsilon in [0.1, 0.3, 0.9]:
        got = [sub.epsilon_greedy(Q, 1, epsilon, rng) for rng in [np.random.default_rng(11)] for _ in range(30)]
        expected = manual_policy(Q[1], epsilon, np.random.default_rng(11), 30)
        equal(got, expected, what=f"epsilon = {epsilon} 时 30 次选择得到的动作")


@check("edge", 'epsilon 为 0 和 1', 'epsilon = 0 时总是选择贪心动作；epsilon = 1 时每次都从 rng.integers 随机选动作。')
def epsilon_limits(sub):
    rng = np.random.default_rng(4)
    equal([sub.epsilon_greedy(TIES, 0, 0.0, rng) for _ in range(5)], [1, 1, 1, 1, 1], what="epsilon = 0 时选择的动作")
    got = [sub.epsilon_greedy(TIES, 0, 1.0, rng) for rng in [np.random.default_rng(5)] for _ in range(10)]
    equal(got, manual_policy(TIES[0], 1.0, np.random.default_rng(5), 10), what="epsilon = 1 时选择的动作")
    true(all(isinstance(a, int) for a in got), "epsilon_greedy 必须返回 Python int", "int", [type(a).__name__ for a in got])


@check("edge", '并列时选择最小索引', '多个动作的 Q 值并列最大时，贪心策略选择索引最小的动作。')
def ties(sub):
    rng = np.random.default_rng(6)
    Q = np.array([[0.0, 0.0, 0.0], [-1.0, 2.0, 2.0], [5.0, 1.0, 5.0]])
    equal([sub.epsilon_greedy(Q, s, 0.0, rng) for s in range(3)], [0, 1, 0], what="三个状态各自的贪心动作")


@check("edge", 'SARSA 的终止步骤与自环', "done 为 True 时，SARSA 也会忽略 Q[s', a']。s' 等于 s 时，目标值读取同一行的旧值。")
def sarsa_terminal_and_loop(sub):
    Q = np.array([[4.0, -2.0], [10.0, 7.0]])
    close(sub.sarsa_update(Q, 0, 0, 1.0, 1, 0, True, alpha=0.5, gamma=0.9), [[2.5, -2.0], [10.0, 7.0]], what="终止步之后的 SARSA 更新结果")
    close(sub.q_learning_update(Q, 0, 1, 1.0, 0, False, alpha=0.5, gamma=0.9), [[4.0, 1.3], [10.0, 7.0]], what="s' = s 时的 Q-learning 更新结果")


@fixture("transitions")
def transitions(ref):
    rng = np.random.default_rng(42)
    for n_states, n_actions, alpha, gamma in [(4, 2, 0.1, 0.99), (6, 3, 0.5, 0.9), (3, 4, 0.25, 0.5)]:
        Q = rng.normal(size=(n_states, n_actions))
        steps = []
        q_tab = Q.copy()
        s_tab = Q.copy()
        for _ in range(6):
            s = int(rng.integers(n_states))
            a = int(rng.integers(n_actions))
            r = float(rng.normal())
            s_next = int(rng.integers(n_states))
            a_next = int(rng.integers(n_actions))
            done = bool(rng.random() < 0.3)
            q_tab = ref.q_learning_update(q_tab, s, a, r, s_next, done, alpha, gamma)
            s_tab = ref.sarsa_update(s_tab, s, a, r, s_next, a_next, done, alpha, gamma)
            steps.append({"s": s, "a": a, "r": r, "s_next": s_next, "a_next": a_next, "done": done})
        yield {"Q": Q, "alpha": alpha, "gamma": gamma, "steps": steps}, {"q": q_tab, "sarsa": s_tab}


@fixture("policies")
def policies(ref):
    rng = np.random.default_rng(43)
    for n_actions, epsilon, seed in [(3, 0.2, 100), (5, 0.6, 101), (2, 0.05, 102)]:
        Q = np.round(rng.normal(size=(2, n_actions)), 1)
        Q[1, -1] = Q[1, 0]
        draw = np.random.default_rng(seed)
        actions = [ref.epsilon_greedy(Q, i % 2, epsilon, draw) for i in range(20)]
        yield {"Q": Q, "epsilon": epsilon, "seed": seed}, actions


@check("reference", '连续更新与参考实现一致', '经过 6 次随机状态转移（其中包含终止转移）后，Q-learning 和 SARSA 的表都与参考实现一致。')
def reference_updates(sub):
    for case, expected in fixtures("transitions"):
        q_tab = case["Q"].copy()
        s_tab = case["Q"].copy()
        for t in case["steps"]:
            q_tab = sub.q_learning_update(q_tab, t["s"], t["a"], t["r"], t["s_next"], t["done"], case["alpha"], case["gamma"])
            s_tab = sub.sarsa_update(s_tab, t["s"], t["a"], t["r"], t["s_next"], t["a_next"], t["done"], case["alpha"], case["gamma"])
        label = f"形状为 {case['Q'].shape} 的 Q 表"
        close(q_tab, expected["q"], rtol=1e-10, atol=1e-12, what=f"{label}的 Q-learning 更新结果")
        close(s_tab, expected["sarsa"], rtol=1e-10, atol=1e-12, what=f"{label}的 SARSA 更新结果")


@check("reference", 'epsilon-greedy 动作序列与参考实现一致', '使用固定种子的 rng 调用 20 次时，即使表中存在并列，各动作也与参考实现一致。')
def reference_policies(sub):
    for case, expected in fixtures("policies"):
        draw = np.random.default_rng(case["seed"])
        got = [sub.epsilon_greedy(case["Q"], i % 2, case["epsilon"], draw) for i in range(20)]
        equal(got, expected, what=f"epsilon = {case['epsilon']} 时 20 次选择得到的动作")
