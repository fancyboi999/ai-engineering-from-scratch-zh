# 采样方法

> 采样是 AI 探索可能性空间的方式。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 1，第 06-07 课（概率，贝叶斯定理）
**预计时间：** ~120 分钟

## 学习目标

- 只用均匀随机数从零实现逆 CDF 采样、拒绝采样和重要性采样
- 为语言模型 token 生成构建温度采样、top-k 采样和 top-p（核）采样
- 解释重参数化技巧，以及为什么它让 VAE 里穿过采样的反向传播成为可能
- 跑 Metropolis-Hastings MCMC 从一个未归一化的目标分布采样

## 问题背景

一个语言模型处理完你的 prompt，产出一个 50,000 维的 logits 向量。词表里每个 token 一个。现在它得挑一个。怎么挑？

如果它总挑概率最高的 token，每个回复都一模一样。确定。无聊。如果它均匀随机地挑，输出就是胡言乱语。答案落在这两个极端之间，而那个"之间"由采样控制。

采样不限于文本生成。强化学习通过采样轨迹来估计策略梯度。VAE 通过从学到的分布采样、并穿过这份随机性做反向传播来学习潜在表示。扩散模型通过采样噪声再迭代去噪来生成图像。蒙特卡洛方法估计没有闭式解的积分。MCMC 算法探索无法枚举的高维后验分布。

每个生成式 AI 系统都是一个采样系统。采样策略决定了输出的质量、多样性和可控性。本节课从零构建每个主要的采样方法，从均匀随机数开始，到驱动现代 LLM 和生成模型的技术结束。

## 核心概念

### 采样为什么重要

采样在 AI 和机器学习里扮演四个基本角色：

**生成。** 语言模型、扩散模型和 GAN 都通过采样产出输出。采样算法直接控制创造力、连贯性和多样性。温度、top-k 和核采样是工程师每天拧的旋钮。

**训练。** 随机梯度下降采样小批量。Dropout 采样要停用哪些神经元。数据增强采样随机变换。重要性采样重新加权样本，以降低强化学习（PPO、TRPO）里的梯度方差。

**估计。** ML 里许多量没有闭式解。在数据分布上的期望损失、基于能量模型的配分函数、贝叶斯推断里的证据。蒙特卡洛估计通过在样本上求平均来近似所有这些。

**探索。** MCMC 算法在贝叶斯推断里探索后验分布。进化策略采样参数扰动。Thompson 采样在 bandit 里平衡探索和利用。

核心挑战：你只能直接从简单分布（均匀、正态）采样。对其他一切，你需要一种方法，把简单样本转换成来自你目标分布的样本。

### 均匀随机采样

每个采样方法都从这里开始。均匀随机数生成器产出 [0, 1) 里的值，其中每个等长子区间的概率相等。

```
U ~ Uniform(0, 1)

P(a <= U <= b) = b - a    for 0 <= a <= b <= 1

Properties:
  E[U] = 0.5
  Var(U) = 1/12
```

要从 n 个项的离散集合里均匀采样，生成 U 再返回 floor(n * U)。要从连续区间 [a, b] 采样，计算 a + (b - a) * U。

关键洞见：一个均匀随机数恰好含有产出任意分布一个样本所需的随机性。诀窍在于找到对的变换。

### 逆 CDF 方法（逆变换采样）

累积分布函数（CDF）把值映射到概率：

```
F(x) = P(X <= x)

Properties:
  F is non-decreasing
  F(-inf) = 0
  F(+inf) = 1
  F maps the real line to [0, 1]
```

逆 CDF 把概率映射回值。如果 U ~ Uniform(0, 1)，那么 X = F_inverse(U) 服从目标分布。

```
Algorithm:
  1. Generate u ~ Uniform(0, 1)
  2. Return F_inverse(u)

Why it works:
  P(X <= x) = P(F_inverse(U) <= x) = P(U <= F(x)) = F(x)
```

**指数分布例子：**

```
PDF: f(x) = lambda * exp(-lambda * x),   x >= 0
CDF: F(x) = 1 - exp(-lambda * x)

Solve F(x) = u for x:
  u = 1 - exp(-lambda * x)
  exp(-lambda * x) = 1 - u
  x = -ln(1 - u) / lambda

Since (1 - U) and U have the same distribution:
  x = -ln(u) / lambda
```

当你能写出闭式的 F_inverse 时，这完美奏效。对正态分布，没有闭式逆 CDF，所以我们用别的方法（Box-Muller，或数值近似）。

**离散版本：** 对离散分布，把 CDF 构造成累积和，生成 U，找到累积和首次超过 U 的索引。这就是第 06 课里 `sample_categorical` 的工作方式。

### 拒绝采样

当你不能求逆 CDF、但能在相差一个常数的意义上求出目标 PDF 时，拒绝采样奏效。

```
Target distribution: p(x)  (can evaluate, possibly unnormalized)
Proposal distribution: q(x)  (can sample from)
Bound: M such that p(x) <= M * q(x) for all x

Algorithm:
  1. Sample x ~ q(x)
  2. Sample u ~ Uniform(0, 1)
  3. If u < p(x) / (M * q(x)), accept x
  4. Otherwise, reject and go to step 1

Acceptance rate = 1/M
```

界 M 越紧，接受率越高。在低维（1-3）里，拒绝采样工作得不错。在高维里，接受率指数级下降，因为大部分提议体积被拒绝。这是拒绝采样的维数灾难。

**例子：从截断正态采样。** 在截断范围上用均匀提议。包络 M 是该范围里正态 PDF 的最大值。

**例子：从半圆采样。** 在外接矩形里均匀提议。如果点落在半圆内就接受。这就是蒙特卡洛算 pi 的方式：接受率等于面积比 pi/4。

### 重要性采样

有时你不需要来自目标分布 p(x) 的样本。你需要估计 p(x) 下的一个期望，而你有来自另一个分布 q(x) 的样本。

```
Goal: estimate E_p[f(x)] = integral of f(x) * p(x) dx

Rewrite:
  E_p[f(x)] = integral of f(x) * (p(x)/q(x)) * q(x) dx
            = E_q[f(x) * w(x)]

where w(x) = p(x) / q(x)  are the importance weights.

Estimator:
  E_p[f(x)] ~ (1/N) * sum(f(x_i) * w(x_i))    where x_i ~ q(x)
```

这在强化学习里至关重要。在 PPO（近端策略优化）里，你在旧策略 pi_old 下收集轨迹，却想优化新策略 pi_new。重要性权重是 pi_new(a|s) / pi_old(a|s)。PPO 裁剪这些权重，防止新策略偏离旧策略太远。

重要性采样估计器的方差取决于 q 和 p 有多相似。如果 q 和 p 差异很大，少数样本就拿到巨大的权重并主导估计。自归一化重要性采样除以权重之和来减轻这个问题：

```
E_p[f(x)] ~ sum(w_i * f(x_i)) / sum(w_i)
```

### 蒙特卡洛估计

蒙特卡洛估计通过对随机样本求平均来近似积分。大数定律保证收敛。

```
Goal: estimate I = integral of g(x) dx over domain D

Method:
  1. Sample x_1, ..., x_N uniformly from D
  2. I ~ (Volume of D / N) * sum(g(x_i))

Error: O(1 / sqrt(N))   regardless of dimension
```

误差率与维度无关。这就是为什么蒙特卡洛方法在基于网格的积分不可能的高维里占主导。

**估计 pi：**

```
Sample (x, y) uniformly from [-1, 1] x [-1, 1]
Count how many fall inside the unit circle: x^2 + y^2 <= 1
pi ~ 4 * (count inside) / (total count)
```

**估计期望：**

```
E[f(X)] ~ (1/N) * sum(f(x_i))    where x_i ~ p(x)

The sample mean converges to the true expectation.
Variance of the estimator = Var(f(X)) / N
```

### 马尔可夫链蒙特卡洛（MCMC）：Metropolis-Hastings

MCMC 构造一条马尔可夫链，它的平稳分布是目标分布 p(x)。经过足够多步后，链里的样本（近似）就是来自 p(x) 的样本。

```
Target: p(x)  (known up to a normalizing constant)
Proposal: q(x'|x)  (how to propose the next state given the current state)

Metropolis-Hastings algorithm:
  1. Start at some x_0
  2. For t = 1, 2, ..., T:
     a. Propose x' ~ q(x'|x_t)
     b. Compute acceptance ratio:
        alpha = [p(x') * q(x_t|x')] / [p(x_t) * q(x'|x_t)]
     c. Accept with probability min(1, alpha):
        - If u < alpha (u ~ Uniform(0,1)): x_{t+1} = x'
        - Otherwise: x_{t+1} = x_t
  3. Discard first B samples (burn-in)
  4. Return remaining samples
```

对对称提议（q(x'|x) = q(x|x')），这个比值简化为 p(x')/p(x)。这是原始的 Metropolis 算法。

**它为什么有效。** 接受规则保证细致平衡：处于 x 并移动到 x' 的概率等于处于 x' 并移动到 x 的概率。细致平衡意味着 p(x) 是这条链的平稳分布。

**实践考虑：**
- Burn-in：在链达到平衡之前丢弃早期样本
- 稀释（thinning）：每 k 个样本保留一个以减少自相关
- 提议尺度：太小链移动慢（接受率高、探索慢）；太大大多数提议被拒绝（接受率低、原地卡住）
- 高维里高斯提议的最优接受率约为 0.234

### Gibbs 采样

Gibbs 采样是 MCMC 用于多元分布的一个特例。它不一次性在所有维度上提议移动，而是一次从一个变量的条件分布更新它。

```
Target: p(x_1, x_2, ..., x_d)

Algorithm:
  For each iteration t:
    Sample x_1^{t+1} ~ p(x_1 | x_2^t, x_3^t, ..., x_d^t)
    Sample x_2^{t+1} ~ p(x_2 | x_1^{t+1}, x_3^t, ..., x_d^t)
    ...
    Sample x_d^{t+1} ~ p(x_d | x_1^{t+1}, x_2^{t+1}, ..., x_{d-1}^{t+1})
```

Gibbs 采样要求你能从每个条件分布 p(x_i | x_{-i}) 采样。这对许多模型来说很直接：
- 贝叶斯网络：条件分布由图结构得出
- 高斯混合：条件分布是高斯的
- Ising 模型：每个自旋的条件只依赖它的邻居

接受率总是 1（每个提议都被接受），因为从精确条件采样自动满足细致平衡。

**局限。** 当变量高度相关时，Gibbs 采样混合得慢，因为一次更新一个变量没法在分布里做大的对角移动。

### 温度采样（LLM 里用）

语言模型为词表里每个 token 输出 logits z_1, ..., z_V。Softmax 把它们转成概率。温度在 softmax 前重新缩放 logits：

```
p_i = exp(z_i / T) / sum(exp(z_j / T))

T = 1.0: standard softmax (original distribution)
T -> 0:  argmax (deterministic, always picks highest logit)
T -> inf: uniform (all tokens equally likely)
T < 1.0: sharpens the distribution (more confident, less diverse)
T > 1.0: flattens the distribution (less confident, more diverse)
```

**它为什么有效。** 把 logits 除以 T < 1 放大了 logits 之间的差异。如果 z_1 = 2、z_2 = 1，除以 T = 0.5 得到 z_1/T = 4、z_2/T = 2，差距更大了。经过 softmax，最高 logit 的 token 拿到大得多的份额。

**实践中：**
- T = 0.0：贪心解码，最适合事实问答
- T = 0.3-0.7：略有创意，适合代码生成
- T = 0.7-1.0：均衡，适合一般对话
- T = 1.0-1.5：创意写作、头脑风暴
- T > 1.5：越来越随机，很少有用

温度不改变哪些 token 是可能的。它改变分配给每个 token 的概率质量。

### Top-k 采样

Top-k 采样把候选集限制为概率最高的 k 个 token，然后重新归一化并从那个受限集合采样。

```
Algorithm:
  1. Compute softmax probabilities for all V tokens
  2. Sort tokens by probability (descending)
  3. Keep only the top k tokens
  4. Renormalize: p_i' = p_i / sum(p_j for j in top-k)
  5. Sample from the renormalized distribution

k = 1:  greedy decoding
k = V:  no filtering (standard sampling)
k = 40: typical setting, removes long tail of unlikely tokens
```

Top-k 防止模型选中存在于词表分布长尾里的极不可能的 token（错别字、胡话）。问题是：k 是固定的，与上下文无关。当模型自信时（一个 token 有 95% 概率），k = 40 仍允许 39 个备选。当模型不确定时（概率散在 1000 个 token 上），k = 40 砍掉了合理的选项。

### Top-p（核）采样

Top-p 采样动态调整候选集大小。它不保留固定数量的 token，而是保留累积概率超过 p 的最小 token 集合。

```
Algorithm:
  1. Compute softmax probabilities for all V tokens
  2. Sort tokens by probability (descending)
  3. Find smallest k such that sum of top-k probabilities >= p
  4. Keep only those k tokens
  5. Renormalize and sample

p = 0.9:  keeps tokens covering 90% of probability mass
p = 1.0:  no filtering
p = 0.1:  very restrictive, nearly greedy
```

当模型自信时，核采样保留很少的 token（也许 2-3 个）。当模型不确定时，它保留很多（也许 200 个）。这种自适应行为就是核采样通常比 top-k 产生更好文本的原因。

**常见组合：**
- 温度 0.7 + top-p 0.9：好用的通用设置
- 温度 0.0（贪心）：最适合确定性任务
- 温度 1.0 + top-k 50：Fan 等（2018）原论文的设置

Top-k 和 top-p 可以组合。先应用 top-k，再在剩下的集合上应用 top-p。

### 重参数化技巧（VAE 里用）

变分自编码器（VAE）通过把输入编码成隐空间里的一个分布、从该分布采样、再把样本解码回来学习。问题：你不能穿过一个采样操作做反向传播。

```
Standard sampling (not differentiable):
  z ~ N(mu, sigma^2)

  The randomness blocks gradient flow.
  d/d_mu [sample from N(mu, sigma^2)] = ???
```

重参数化技巧把随机性和参数分开：

```
Reparameterized sampling:
  epsilon ~ N(0, 1)          (fixed random noise, no parameters)
  z = mu + sigma * epsilon   (deterministic function of parameters)

  Now z is a deterministic, differentiable function of mu and sigma.
  d(z)/d(mu) = 1
  d(z)/d(sigma) = epsilon

  Gradients flow through mu and sigma.
```

这有效是因为 N(mu, sigma^2) 和 mu + sigma * N(0, 1) 有相同的分布。关键洞见：把随机性挪到一个无参数的源（epsilon），然后把样本表达为参数的可微变换。

**在 VAE 训练循环里：**
1. 编码器为每个输入输出 mu 和 log(sigma^2)
2. 采样 epsilon ~ N(0, 1)
3. 计算 z = mu + sigma * epsilon
4. 解码 z 以重构输入
5. 穿过第 4、3、2、1 步做反向传播（因为第 3 步可微所以可行）

没有重参数化技巧，VAE 没法用标准反向传播训练。就这一个洞见让 VAE 变得实用。

### Gumbel-Softmax（可微的类别采样）

重参数化技巧对连续分布（高斯）有效。对离散类别分布，我们需要另一种办法。Gumbel-Softmax 提供了对类别采样的一个可微近似。

**Gumbel-Max 技巧（不可微）：**

```
To sample from a categorical distribution with log-probabilities log(p_1), ..., log(p_k):
  1. Sample g_i ~ Gumbel(0, 1) for each category
     (g = -log(-log(u)), where u ~ Uniform(0, 1))
  2. Return argmax(log(p_i) + g_i)

This produces exact categorical samples.
```

**Gumbel-Softmax（可微近似）：**

```
Replace the hard argmax with a soft softmax:
  y_i = exp((log(p_i) + g_i) / tau) / sum(exp((log(p_j) + g_j) / tau))

tau (temperature) controls the approximation:
  tau -> 0:  approaches a one-hot vector (hard categorical)
  tau -> inf: approaches uniform (1/k, 1/k, ..., 1/k)
  tau = 1.0: soft approximation
```

Gumbel-Softmax 产出一个离散样本的连续松弛。输出是一个概率向量（软 one-hot），而不是硬 one-hot。梯度穿过 softmax 流动。训练中的前向传播里，你可以用"直通"估计器：前向传播用硬 argmax，反向传播用软 Gumbel-Softmax 的梯度。

**应用：**
- VAE 里的离散隐变量
- 神经架构搜索（选择离散操作）
- 硬注意力机制
- 带离散动作的强化学习

### 分层采样

标准蒙特卡洛采样可能因偶然在样本空间里留下空隙。分层采样通过把空间分成层、从每层采样来强制均匀覆盖。

```
Standard Monte Carlo:
  Sample N points uniformly from [0, 1]
  Some regions may have clusters, others gaps

Stratified sampling:
  Divide [0, 1] into N equal strata: [0, 1/N), [1/N, 2/N), ..., [(N-1)/N, 1)
  Sample one point uniformly within each stratum
  x_i = (i + u_i) / N   where u_i ~ Uniform(0, 1),  i = 0, ..., N-1
```

分层采样的方差总是低于或等于标准蒙特卡洛：

```
Var(stratified) <= Var(standard Monte Carlo)

The improvement is largest when f(x) varies smoothly.
For piecewise-constant functions, stratified sampling is exact.
```

**应用：**
- 数值积分（拟蒙特卡洛）
- 训练数据划分（保证每折的类别平衡）
- 带分层的重要性采样（两种技术结合）
- NeRF（神经辐射场）沿相机射线用分层采样

### 与扩散模型的联系

扩散模型通过一个采样过程生成图像。前向过程在 T 步里给图像加高斯噪声，直到它变成纯噪声。反向过程学习去噪，一步步恢复原始图像。

```
Forward process (known):
  x_t = sqrt(alpha_t) * x_{t-1} + sqrt(1 - alpha_t) * epsilon
  where epsilon ~ N(0, I)

  After T steps: x_T ~ N(0, I)  (pure noise)

Reverse process (learned):
  x_{t-1} = (1/sqrt(alpha_t)) * (x_t - (1 - alpha_t)/sqrt(1 - alpha_bar_t) * epsilon_theta(x_t, t)) + sigma_t * z
  where z ~ N(0, I)

  Each denoising step is a sampling step.
```

与本节课方法的联系：
- 每个去噪步用重参数化技巧（采样噪声、应用确定性变换）
- 噪声调度 {alpha_t} 控制一种温度退火
- 训练用蒙特卡洛估计来近似 ELBO（证据下界）
- 扩散模型里的祖先采样是一条马尔可夫链（每步只依赖当前状态）

整个图像生成过程就是迭代采样：从噪声出发，每一步以学到的去噪模型为条件，采样一个噪声稍微少一点的版本。

```figure
monte-carlo-pi
```

## 动手构建

### 第 1 步：均匀采样和逆 CDF 采样

```python
import math
import random

def sample_uniform(a, b):
    return a + (b - a) * random.random()

def sample_exponential_inverse_cdf(lam):
    u = random.random()
    return -math.log(u) / lam
```

生成 10,000 个指数样本，验证均值是 1/lambda。

### 第 2 步：拒绝采样

```python
def rejection_sample(target_pdf, proposal_sample, proposal_pdf, M):
    while True:
        x = proposal_sample()
        u = random.random()
        if u < target_pdf(x) / (M * proposal_pdf(x)):
            return x
```

用拒绝采样从截断正态分布抽样。通过对样本做直方图来验证形状。

### 第 3 步：重要性采样

```python
def importance_sampling_estimate(f, target_pdf, proposal_pdf, proposal_sample, n):
    total = 0
    for _ in range(n):
        x = proposal_sample()
        w = target_pdf(x) / proposal_pdf(x)
        total += f(x) * w
    return total / n
```

用均匀提议估计正态分布下的 E[X^2]。和已知答案（mu^2 + sigma^2）对比。

### 第 4 步：蒙特卡洛估计 pi

```python
def monte_carlo_pi(n):
    inside = 0
    for _ in range(n):
        x = random.uniform(-1, 1)
        y = random.uniform(-1, 1)
        if x*x + y*y <= 1:
            inside += 1
    return 4 * inside / n
```

### 第 5 步：Metropolis-Hastings MCMC

```python
def metropolis_hastings(target_log_pdf, proposal_sample, proposal_log_pdf, x0, n_samples, burn_in):
    samples = []
    x = x0
    for i in range(n_samples + burn_in):
        x_new = proposal_sample(x)
        log_alpha = (target_log_pdf(x_new) + proposal_log_pdf(x, x_new)
                     - target_log_pdf(x) - proposal_log_pdf(x_new, x))
        if math.log(random.random()) < log_alpha:
            x = x_new
        if i >= burn_in:
            samples.append(x)
    return samples
```

从一个双峰分布（两个高斯的混合）采样。把链的轨迹可视化。

### 第 6 步：Gibbs 采样

```python
def gibbs_sampling_2d(conditional_x_given_y, conditional_y_given_x, x0, y0, n_samples, burn_in):
    x, y = x0, y0
    samples = []
    for i in range(n_samples + burn_in):
        x = conditional_x_given_y(y)
        y = conditional_y_given_x(x)
        if i >= burn_in:
            samples.append((x, y))
    return samples
```

### 第 7 步：温度采样

```python
def softmax(logits):
    max_l = max(logits)
    exps = [math.exp(z - max_l) for z in logits]
    total = sum(exps)
    return [e / total for e in exps]

def temperature_sample(logits, temperature):
    scaled = [z / temperature for z in logits]
    probs = softmax(scaled)
    return sample_from_probs(probs)
```

展示温度如何改变一组 token logits 的输出分布。

### 第 8 步：Top-k 和 top-p 采样

```python
def top_k_sample(logits, k):
    indexed = sorted(enumerate(logits), key=lambda x: -x[1])
    top = indexed[:k]
    top_logits = [l for _, l in top]
    probs = softmax(top_logits)
    idx = sample_from_probs(probs)
    return top[idx][0]

def top_p_sample(logits, p):
    probs = softmax(logits)
    indexed = sorted(enumerate(probs), key=lambda x: -x[1])
    cumsum = 0
    selected = []
    for token_idx, prob in indexed:
        cumsum += prob
        selected.append((token_idx, prob))
        if cumsum >= p:
            break
    sel_probs = [pr for _, pr in selected]
    total = sum(sel_probs)
    sel_probs = [pr / total for pr in sel_probs]
    idx = sample_from_probs(sel_probs)
    return selected[idx][0]
```

### 第 9 步：重参数化技巧

```python
def reparam_sample(mu, sigma):
    epsilon = random.gauss(0, 1)
    return mu + sigma * epsilon

def reparam_gradient(mu, sigma, epsilon):
    dz_dmu = 1.0
    dz_dsigma = epsilon
    return dz_dmu, dz_dsigma
```

演示梯度穿过重参数化样本流动、但不穿过直接采样。

### 第 10 步：Gumbel-Softmax

```python
def gumbel_sample():
    u = random.random()
    return -math.log(-math.log(u))

def gumbel_softmax(logits, temperature):
    gumbels = [math.log(p) + gumbel_sample() for p in logits]
    return softmax([g / temperature for g in gumbels])
```

展示降低温度如何让输出趋近一个 one-hot 向量。

带全部可视化的完整实现在 `code/sampling.py` 里。

## 实际使用

用 NumPy 和 SciPy，生产版本：

```python
import numpy as np

rng = np.random.default_rng(42)

exponential_samples = rng.exponential(scale=2.0, size=10000)
print(f"Exponential mean: {exponential_samples.mean():.4f} (expected 2.0)")

from scipy import stats
normal = stats.norm(loc=0, scale=1)
print(f"CDF at 1.96: {normal.cdf(1.96):.4f}")
print(f"Inverse CDF at 0.975: {normal.ppf(0.975):.4f}")

logits = np.array([2.0, 1.0, 0.5, 0.1, -1.0])
temperature = 0.7
scaled = logits / temperature
probs = np.exp(scaled - scaled.max()) / np.exp(scaled - scaled.max()).sum()
token = rng.choice(len(logits), p=probs)
print(f"Sampled token index: {token}")
```

对于大规模的 MCMC，用专门的库：
- PyMC：用 NUTS（自适应 HMC）做完整贝叶斯建模
- emcee：集成 MCMC 采样器
- NumPyro/JAX：GPU 加速的 MCMC

你从零写出了这些。现在你知道库调用在做什么了。

## 练习

1. 为柯西分布实现逆 CDF 采样。CDF 是 F(x) = 0.5 + arctan(x)/pi。生成 10,000 个样本，把直方图和真实 PDF 对比画出来。注意那条重尾（远离中心的极端值）。

2. 用 Uniform(0, 1) 提议、通过拒绝采样生成 Beta(2, 5) 分布的样本。把接受的样本和真实 Beta PDF 对比画出来。理论接受率是多少？

3. 用 1,000、10,000 和 100,000 个样本的蒙特卡洛估计 sin(x) 从 0 到 pi 的积分。比较每个水平的误差。验证误差按 O(1/sqrt(N)) 缩放。

4. 实现 Metropolis-Hastings，从一个二维分布 p(x, y) 正比于 exp(-(x^2 * y^2 + x^2 + y^2 - 8*x - 8*y) / 2) 采样。画出样本和链的轨迹。试验不同的提议标准差。

5. 构建一个完整的文本生成演示：给定一个有 10 个词、带 logits 的词表，用 (a) 贪心、(b) temperature=0.7、(c) top-k=3、(d) top-p=0.9 生成 20 个 token 的序列。比较 5 次运行中输出的多样性。

## 关键术语

| 术语 | 人们常说 | 它实际指什么 |
|------|----------------|----------------------|
| 采样 | "抽随机值" | 按概率分布生成值。所有生成式 AI 背后的机制 |
| 均匀分布 | "都等可能" | [a, b] 里每个值有相等的概率密度 1/(b-a)。所有采样方法的起点 |
| 逆 CDF | "概率变换" | F_inverse(U) 把均匀样本转成任意已知 CDF 分布的样本。精确且高效 |
| 拒绝采样 | "提议再接受/拒绝" | 从简单提议生成，按目标/提议比成比例的概率接受。精确但浪费样本 |
| 重要性采样 | "重新加权样本" | 用来自 q(x) 的样本估计 p(x) 下的期望，每个样本按 p(x)/q(x) 加权。RL 里 PPO 的核心 |
| 蒙特卡洛 | "对随机样本求平均" | 把积分近似为样本平均。误差 O(1/sqrt(N))，与维度无关 |
| MCMC | "会收敛的随机游走" | 构造一条平稳分布是目标的马尔可夫链。Metropolis-Hastings 是奠基性算法 |
| Metropolis-Hastings | "上坡就接受，有时也下坡" | 提议移动，按密度比接受。细致平衡保证收敛到目标分布 |
| Gibbs 采样 | "一次一个变量" | 在固定其他变量的情况下从每个变量的条件分布更新它。100% 接受率 |
| 温度 | "置信度旋钮" | 在 softmax 前把 logits 除以 T。T<1 锐化（更自信），T>1 展平（更多样） |
| Top-k 采样 | "保留 k 个最好的" | 把除最高概率 k 个 token 外的全部置零，重新归一化，采样。固定候选集大小 |
| 核采样（top-p） | "保留有可能的那些" | 保留累积概率超过 p 的最小 token 集合。自适应候选集大小 |
| 重参数化技巧 | "把随机性挪到外面" | 写成 z = mu + sigma * epsilon，其中 epsilon ~ N(0,1)。让采样可微。VAE 训练的关键 |
| Gumbel-Softmax | "软类别采样" | 用 Gumbel 噪声 + 带温度的 softmax 对类别采样的可微近似 |
| 分层采样 | "强制覆盖" | 把样本空间分层，从每层采样。方差总是低于朴素蒙特卡洛 |
| Burn-in | "预热期" | 在链达到平稳分布之前丢弃的初始 MCMC 样本 |
| 细致平衡 | "可逆性条件" | p(x) * T(x->y) = p(y) * T(y->x)。p 是马尔可夫链平稳分布的充分条件 |
| 扩散采样 | "迭代去噪" | 从噪声出发、应用学到的去噪步来生成数据。每一步是一次条件采样操作 |

## 延伸阅读

- [Holbrook (2023): The Metropolis-Hastings Algorithm](https://arxiv.org/abs/2304.07010) - MCMC 基础的详细教程
- [Jang, Gu, Poole (2017): Categorical Reparameterization with Gumbel-Softmax](https://arxiv.org/abs/1611.01144) - Gumbel-Softmax 原论文
- [Holtzman et al. (2020): The Curious Case of Neural Text Degeneration](https://arxiv.org/abs/1904.09751) - 核（top-p）采样论文
- [Kingma & Welling (2014): Auto-Encoding Variational Bayes](https://arxiv.org/abs/1312.6114) - 引入重参数化技巧的 VAE 论文
- [Ho, Jain, Abbeel (2020): Denoising Diffusion Probabilistic Models](https://arxiv.org/abs/2006.11239) - DDPM 把采样和图像生成联系起来
