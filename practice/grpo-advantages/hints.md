## 提示 1

计算每组的均值和标准差时，使用 `axis=-1` 和 `keepdims=True`。`np.std` 默认除以 $G$，符合本题要求。

## 提示 2

用对数概率计算时，比值 $\pi_{ref} / \pi_\theta$ 等于 `exp(ref_logp - logp)`。该比值的对数是 `ref_logp - logp`。

## 提示 3

用 `advantages[:, None]` 为优势值增加一个 token 轴，使它能沿 `L` 维广播。计算未裁剪和裁剪后的替代目标，再用 `np.minimum` 取较小值。

## 提示 4

将掩码转为浮点数。将每个 token 的值乘以掩码，沿轴 1 求和，再除以每个回答的有效 token 数。最后对回答取平均。
