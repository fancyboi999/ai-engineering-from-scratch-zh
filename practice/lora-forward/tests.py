import numpy as np

from practice_check import check, close, equal, fixture, fixtures, shape, true

X = np.array([[1.0, 2.0, 0.0], [0.0, -1.0, 1.0]])
W = np.array([[0.5, -0.5, 1.0], [1.0, 0.0, 0.0]])
BIAS = np.array([0.1, -0.2])
A = np.array([[1.0, 0.0, 1.0], [0.0, 1.0, 0.0]])
B = np.array([[1.0, 0.5], [-1.0, 0.0]])


def random_layer(rng, n, d_in, d_out, rank):
    x = rng.normal(size=(n, d_in))
    w = rng.normal(size=(d_out, d_in))
    b = rng.normal(size=d_out)
    a = rng.normal(size=(rank, d_in))
    bb = rng.normal(size=(d_out, rank))
    return x, w, b, a, bb


@check("examples", '小型线性层的前向传播', "输出等于 x W^T + b 再加 alpha / r * x A^T B^T。此处 r = 2、alpha = 4，因此适配器分支乘以 2。")
def example_forward(sub):
    close(sub.lora_forward(X, W, BIAS, A, B, 4.0), [[3.6, -1.2], [2.6, -2.2]], what="层输出")


@check("examples", 'B = 0 时输出与基础模型一致', "B 为零时，适配器的输出为零，层输出为 x W^T + b。")
def example_zero_b(sub):
    close(sub.lora_forward(X, W, BIAS, A, np.zeros((2, 2)), 4.0), [[-0.4, 0.8], [1.6, -0.2]], what="B = 0 时的层输出")


@check("examples", '小型线性层合并后的权重', '合并权重为 W + (alpha / r) B A，形状与 W 相同。')
def example_merge(sub):
    close(sub.merge_lora(W, A, B, 4.0), [[2.5, 0.5, 3.0], [-1.0, 0.0, -2.0]], what="合并后的权重")


@check("examples", "4096×4096 层在秩为 8 时的可训练参数数量", 'A 包含 r * in_features 个值，B 包含 out_features * r 个值。只有 A 和 B 参与训练。')
def example_count(sub):
    equal(sub.count_trainable(4096, 4096, 8), 65536, what="可训练参数数量")


@check("properties", "合并后的层与带适配器的层输出一致", "使用合并权重 W' 计算 x W'^T + b，结果必须与单独计算适配器的前向传播相同。")
def merge_matches_forward(sub):
    rng = np.random.default_rng(0)
    x, w, b, a, bb = random_layer(rng, 5, 7, 4, 3)
    merged = sub.merge_lora(w, a, bb, 6.0)
    shape(merged, w.shape, what="合并后的权重")
    close(x @ merged.T + b, sub.lora_forward(x, w, b, a, bb, 6.0), rtol=1e-9, atol=1e-9, what="合并后的层输出")


@check("properties", '任意 A 下，B = 0 时输出都与基础模型一致', 'LoRA 将 B 初始化为 0，因此该层一开始表现与基础模型一致。')
def zero_b_property(sub):
    rng = np.random.default_rng(1)
    x, w, b, a, bb = random_layer(rng, 4, 6, 5, 2)
    close(sub.lora_forward(x, w, b, a, np.zeros_like(bb), 16.0), x @ w.T + b, rtol=1e-12, atol=1e-12, what="B = 0 时的输出")
    close(sub.merge_lora(w, a, np.zeros_like(bb), 16.0), w, rtol=0, atol=0, what="B = 0 时合并后的权重")


@check("properties", "适配器分支随 alpha 线性变化", "适配器输出为 alpha / r * x A^T B^T。alpha 加倍时，相对基础输出的变化也加倍。")
def linear_in_alpha(sub):
    rng = np.random.default_rng(2)
    x, w, b, a, bb = random_layer(rng, 3, 5, 4, 4)
    base = x @ w.T + b
    one = sub.lora_forward(x, w, b, a, bb, 8.0) - base
    two = sub.lora_forward(x, w, b, a, bb, 16.0) - base
    close(two, 2.0 * one, rtol=1e-9, atol=1e-12, what="alpha 加倍时适配器引起的输出变化")


@check("properties", 'alpha 等于 r 时缩放因子为 1', "alpha = r 时 alpha / r = 1，因此适配器正好增加 x A^T B^T。")
def alpha_equals_rank(sub):
    rng = np.random.default_rng(3)
    x, w, b, a, bb = random_layer(rng, 3, 6, 2, 3)
    close(sub.lora_forward(x, w, b, a, bb, 3.0), x @ w.T + b + x @ a.T @ bb.T, rtol=1e-9, atol=1e-12, what="层输出")


@check("properties", '输入不会被修改', 'merge_lora 会返回新数组，不得修改冻结权重 W。')
def inputs_unchanged(sub):
    rng = np.random.default_rng(4)
    x, w, b, a, bb = random_layer(rng, 2, 4, 3, 2)
    saved = [arr.copy() for arr in (x, w, b, a, bb)]
    sub.lora_forward(x, w, b, a, bb, 4.0)
    sub.merge_lora(w, a, bb, 4.0)
    for name, arr, old in zip(("x", "W", "b", "A", "B"), (x, w, b, a, bb), saved):
        close(arr, old, rtol=0, atol=0, what=f"调用后的 {name}")


@check("edge", "宽层中秩为 1 的适配器", "秩等于 A 的行数。秩为 1 的适配器对应一个外积。")
def rank_one(sub):
    x = np.ones((1, 4))
    w = np.zeros((3, 4))
    b = np.zeros(3)
    a = np.array([[1.0, 1.0, 1.0, 1.0]])
    bb = np.array([[1.0], [2.0], [3.0]])
    close(sub.lora_forward(x, w, b, a, bb, 0.5), [[2.0, 4.0, 6.0]], what="秩为 1 时的输出")


@check("edge", "秩大于输出维度", "从 A 读取秩，而不是从 W 读取。此处 r = 4，层有 2 个输出和 3 个输入。")
def rank_from_a(sub):
    rng = np.random.default_rng(5)
    x, w, b, a, bb = random_layer(rng, 2, 3, 2, 4)
    close(sub.lora_forward(x, w, b, a, bb, 2.0), x @ w.T + b + 0.5 * (x @ a.T @ bb.T), rtol=1e-9, atol=1e-12, what="层输出")


@check("edge", '非方形层的参数数目', '此处 in_features 与 out_features 不同。A 的形状为 (r, in_features)，B 的形状为 (out_features, r)。')
def count_non_square(sub):
    equal(sub.count_trainable(768, 3072, 16), 61440, what="输入维度为 768、输出维度为 3072、秩为 16 时的参数数量")
    equal(sub.count_trainable(3, 2, 2), 10, what="输入维度为 3、输出维度为 2、秩为 2 时的参数数量")


@fixture("layers")
def layers(ref):
    rng = np.random.default_rng(42)
    for n, d_in, d_out, rank, alpha in [(1, 4, 3, 1, 1.0), (3, 6, 5, 2, 16.0), (4, 8, 8, 4, 8.0), (2, 5, 9, 3, 32.0)]:
        x, w, b, a, bb = random_layer(rng, n, d_in, d_out, rank)
        yield {"x": x, "W": w, "b": b, "A": a, "B": bb, "alpha": alpha}, {
            "y": ref.lora_forward(x, w, b, a, bb, alpha),
            "merged": ref.merge_lora(w, a, bb, alpha),
            "count": ref.count_trainable(d_in, d_out, rank),
        }


@check("reference", "输出、合并权重和参数数量与参考实现一致", "在不同大小、不同秩的随机层中，三个函数的结果都与参考实现一致。")
def reference_layers(sub):
    for case, expected in fixtures("layers"):
        label = f"W 形状为 {case['W'].shape}、秩为 {case['A'].shape[0]} 的层"
        close(sub.lora_forward(case["x"], case["W"], case["b"], case["A"], case["B"], case["alpha"]), expected["y"], rtol=1e-9, atol=1e-12, what=f"{label}的输出")
        close(sub.merge_lora(case["W"], case["A"], case["B"], case["alpha"]), expected["merged"], rtol=1e-9, atol=1e-12, what=f"{label} 合并后的权重")
        equal(sub.count_trainable(case["W"].shape[1], case["W"].shape[0], case["A"].shape[0]), expected["count"], what=f"{label}的参数数量")
