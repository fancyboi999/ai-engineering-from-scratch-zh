## 为什么输出分布与 target 一致

单个 draft token 最终输出 $x$ 有两种情况。第一种是 draft 提议 $x$ 并被接受，概率为 $q(x) \min(1, p(x)/q(x)) = \min(p(x), q(x))$。第二种是拒绝 draft token（概率为 $1 - \alpha$），随后从残差分布中采样得到 $x$。残差为 $\max(0, p(x) - q(x)) / (1 - \alpha)$，因为 $\max(0, p - q)$ 的总和为 $1 - \alpha$。两种情况的概率之和为 $\min(p, q) + \max(0, p - q) = p(x)$。精确分布检查验证的就是这个恒等式。

## 速度提升

每步只调用一次 target 模型，并输出 1 到 $\gamma + 1$ 个 token。若各次接受事件独立且接受率为 $\alpha$，平均输出数为 $(1 - \alpha^{\gamma + 1}) / (1 - \alpha)$。draft 与 target 越接近，$\alpha$ 越高。论文还证明 $\alpha = 1 - \frac{1}{2} \lVert p - q \rVert_1$，即 1 减去总变差距离。

## p 和 q 的记号

本题沿用论文记号：$p$ 表示 target，$q$ 表示 draft。课程代码使用相反记号，但规则相同。

## 后续联系

Medusa 和 EAGLE 课程会用 target 模型上的额外预测头替代独立 draft 模型，但验证步骤保持不变。
