## 提示 1

先实现 `acceptance_rate` 和 `residual_distribution`。它们都只需一个 numpy 表达式和一次求和。

## 提示 2

验证步骤中，读取 draft token 在两种分布下的概率：`target_probs[i][token]` 和 `draft_probs[i][token]`。$p / q$ 可能大于 1，此时该 token 一定会被接受。

## 提示 3

拒绝 draft token 后，应从残差分布采样，而不是从 $p$ 采样。对于 $q > p$ 的 token，draft 已经提议得过多；残差只会给 $p > q$ 的 token 增加概率。

## 提示 4

循环未发生拒绝时，target 模型还提供索引为 `gamma` 的下一行概率。应从该行采样 bonus token。每步输出 token 数介于 1 和 `gamma + 1` 之间。
