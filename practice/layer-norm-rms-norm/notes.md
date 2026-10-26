## 两种范数分别移除了什么

LayerNorm 会消除每个向量的均值和尺度，RMSNorm 只消除尺度。实际中 Transformer 的残差流均值通常接近 0，因此中心化带来的收益很小。RMSNorm 少做一次向量归约和每个元素的一次减法。

## 为什么 eps 放在平方根内

$\sqrt{\sigma^2 + \epsilon}$ 至少为 $\sqrt{\epsilon}$，因此常量向量不会导致除以 0。对常量向量应用 LayerNorm 会得到 $\beta$，对零向量应用 RMSNorm 会得到 0。

## 与 BatchNorm 的区别

BatchNorm 沿批次轴对每个特征归一化。LayerNorm 和 RMSNorm 则沿特征轴处理每个样本。它们不需要运行统计量，训练和推理时行为相同。它们也适用于只有一个 token 的批次，这正是生成时的情况。

## 后续联系

完整 Transformer 课程使用 pre-norm 模块：`x + attention(norm(x))` 和 `x + ffn(norm(x))`。Llama、Mistral 和 Qwen 使用 eps 在 1e-6 到 1e-5 之间的 RMSNorm。综合课程会将同一 RMSNorm 实现为带可学习 `weight` 的模块。
