(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-math2.js"] = {
  "svd-rank-reconstruction": {
    "text": {
      "SVD LOW-RANK": "SVD 低秩近似",
      "Keeping the k largest singular values gives the best rank-k approximation of a matrix. The first few capture most of the energy, so a low rank reconstructs the pattern almost exactly while storing far fewer numbers. That is the whole idea behind compression and low-rank adapters.": "保留最大的 k 个奇异值，就得到矩阵的最优 k 秩近似。前几个奇异值占据了大部分能量，所以低秩就能几乎还原出模式，存储的数字却少得多。压缩和低秩适配器（LoRA）背后就是这一个思想。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "% energy": "% 能量",
      "rank 2 of 8  ·  stores 34 numbers vs 64 full  ·  blue bars are the kept singular values": "保留 8 个中的前 2 个秩分量 · 存储 34 个数值，完整矩阵需 64 个 · 蓝柱是保留的奇异值",
      "A_k = sum_{i<k} sigma_i u_i v_iT   ·   energy = sum top-k sigma^2 / sum all sigma^2": "A_k = sum_{i<k} sigma_i u_i v_iT · 能量 = 前 k 个 sigma^2 之和 / 全部 sigma^2 之和"
    },
    "patterns": [
      [
        "^rank (\\d+) of (\\d+)  ·  stores (\\d+) numbers vs (\\d+) full  ·  blue bars are the kept singular values$",
        "保留 $2 个中的前 $1 个秩分量 · 存储 $3 个数值，完整矩阵需 $4 个 · 蓝柱是保留的奇异值"
      ],
      [
        "^A_k\\ =\\ sum_\\{i<k\\}\\ sigma_i\\ u_i\\ v_iT\\ \\ \\ ·\\ \\ \\ energy\\ =\\ sum\\ top\\-k\\ sigma\\^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ /\\ sum\\ all\\ sigma\\^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "A_k = sum_{i<k} sigma_i u_i v_iT · 能量 = 前 k 个 sigma^$1 之和 / 全部 sigma^$2 之和"
      ]
    ],
    "preserve": []
  },
  "tensor-broadcast": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "shape A": "形状 A",
      "shape B": "形状 B",
      "result": "结果",
      "broadcasts": "可广播",
      "mismatch": "不匹配",
      "result shape (8, 4, 3)  ·  a 1 stretches to match the other": "结果形状（8, 4, 3）· 长度 1 的维度扩展以匹配另一侧",
      "align trailing dims; each pair must be equal or one of them 1": "从末尾对齐维度；对应维度必须相等，或其中一个为 1"
    },
    "patterns": [
      [
        "^result shape \\(([^()]*)\\)  ·  a 1 stretches to match the other$",
        "结果形状（$1）· 长度 1 的维度扩展以匹配另一侧"
      ],
      [
        "^cannot broadcast  ·  dim (\\d+): (\\d+) vs (\\d+) \\(neither is 1\\)$",
        "无法广播 · 维度 $1：$2 与 $3（均不为 1）"
      ],
      [
        "^result\\ shape\\ \\(([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?),\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?),\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\)\\ \\ ·\\ \\ a\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ stretches\\ to\\ match\\ the\\ other$",
        "结果形状（$1, $2, $3）· 长度 $4 的维度扩展以匹配另一侧"
      ],
      [
        "^align\\ trailing\\ dims;\\ each\\ pair\\ must\\ be\\ equal\\ or\\ one\\ of\\ them\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "从末尾对齐维度；对应维度必须相等，或其中一个为 $1"
      ]
    ],
    "preserve": []
  },
  "logsumexp-stability": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "naive log(sum exp x)": "朴素形式 log(sum exp x)",
      "stable m + log(sum exp(x-m))": "稳定形式 m + log(sum exp(x-m))",
      "both agree": "两者一致",
      "naive overflows": "朴素形式溢出",
      "Infinity (overflow)": "Infinity（溢出）",
      "the two forms are algebraically equal and both finite here (max = 700)": "两个形式代数等价，此处均为有限值（max = 700）"
    },
    "patterns": [
      [
        "^exp\\((\\d+)\\) is beyond float64 range \\(~exp 709\\), so the naive sum is Infinity; the stable form returns ([-\\d.]+)$",
        "exp($1) 超出 float64 范围（约 exp 709），因此朴素求和为 Infinity；稳定形式返回 $2"
      ],
      [
        "^the\\ two\\ forms\\ are\\ algebraically\\ equal\\ and\\ both\\ finite\\ here\\ \\(max\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\)$",
        "两个形式代数等价，此处均为有限值（max = $1）"
      ]
    ],
    "preserve": [
      {
        "text": "Log-Sum-Exp",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "logsumexp(x) = m + log( sum exp(x - m) ),  m = max(x)",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "norm-unit-balls": {
    "text": {
      "NORM UNIT BALLS": "范数单位球",
      "A norm measures length, and its unit ball is every vector of length one. L2 sums squares and gives a circle; L1 sums absolute values and gives a diamond; Linf takes the largest coordinate and gives a square. Which norm you choose changes what counts as close, which is why it shapes regularization and distance.": "范数度量长度，单位球是所有长度为一的向量。L2 对平方求和，是圆；L1 对绝对值求和，是菱形；L∞ 取最大坐标，是方形。选哪种范数改变了「接近」的定义，所以它塑造着正则化与距离。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "L2 (Euclidean)": "L2（欧几里得范数）",
      "L1 (Manhattan)": "L1（曼哈顿范数）",
      "Linf (max)": "Linf（最大范数）",
      "L2 norm": "L2 范数",
      "L1 norm": "L1 范数",
      "Linf norm": "Linf 范数",
      "L2 of (0.60, 0.50) = sqrt(x^2 + y^2)  ·  the outline is every point of norm 1": "L2 范数：(0.60, 0.50) = sqrt(x^2 + y^2) · 轮廓上所有点的范数为 1"
    },
    "patterns": [
      [
        "^(L1|L2|Linf) of \\(([-\\d.]+), ([-\\d.]+)\\) = (.*?)  ·  the outline is every point of norm 1$",
        "$1 范数：($2, $3) = $4 · 轮廓上所有点的范数为 1"
      ],
      [
        "^L2\\ of\\ \\(([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?),\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\)\\ =\\ sqrt\\(x\\^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\+\\ y\\^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\)\\ \\ ·\\ \\ the\\ outline\\ is\\ every\\ point\\ of\\ norm\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "L2 范数：($1, $2) = sqrt(x^$3 + y^$4) · 轮廓上所有点的范数为 $5"
      ]
    ],
    "preserve": []
  },
  "monte-carlo-pi": {
    "text": {
      "MONTE CARLO PI": "蒙特卡洛求 π",
      "Scatter points in the unit square and count how many fall inside the quarter circle. That fraction is the ratio of areas, pi/4, so four times it estimates pi. More samples tighten the estimate, but the error only falls like one over the square root of N, the defining cost of Monte Carlo.": "往单位正方形里撒点，数落进四分之一圆的比例。这个比例就是面积比 π/4，乘四即得 π 的估计。样本越多估得越准，但误差只按 1/√N 下降——这是蒙特卡洛方法的标志性代价。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "157 of 200 inside  ·  error 0.0016  ·  shrinks like 1/sqrt(N)": "200 个点中有 157 个在圆内 · 误差 0.0016 · 按 1/sqrt(N) 缩小",
      "pi ~ 4 * (points inside quarter circle) / N   ·   true pi = 3.14159": "pi ~ 4 *（四分之一圆内的点数）/ N · 真实 pi = 3.14159"
    },
    "patterns": [
      [
        "^(\\d+) of ([\\d,]+) inside  ·  error ([\\d.]+)  ·  shrinks like 1/sqrt\\(N\\)$",
        "共 $2 个点，$1 个在圆内 · 误差 $3 · 按 1/sqrt(N) 缩小"
      ],
      [
        "^pi\\ \\~\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\*\\ \\(points\\ inside\\ quarter\\ circle\\)\\ /\\ N\\ \\ \\ ·\\ \\ \\ true\\ pi\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "pi ~ $1 *（四分之一圆内的点数）/ N · 真实 pi = $2"
      ]
    ],
    "preserve": []
  },
  "linear-system-conditioning": {
    "text": {
      "CONDITIONING": "条件数",
      "A 2x2 system is the intersection of two lines. When the lines cross at a wide angle the solution is sharp and stable. As they tilt toward parallel the determinant shrinks, the condition number explodes, and a tiny change in the inputs swings the intersection far away. Ill-conditioned systems amplify noise.": "2x2 线性方程组就是两条直线的交点。两线大角度相交时，解清晰而稳定。它们趋向平行时，行列式缩小、条件数爆炸，输入的微小变动就把交点甩到很远。病态系统会放大噪声。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "cond number": "条件数",
      "well-conditioned: det = 1.186  ·  near-parallel lines make the intersection hypersensitive to noise": "条件良好：det = 1.186 · 近乎平行的直线让交点对噪声极度敏感",
      "kappa = sigma_max / sigma_min   ·   small noise in b shifts the solution by up to kappa times": "kappa = sigma_max / sigma_min · b 的微小噪声最多可将解的偏移放大 kappa 倍"
    },
    "patterns": [
      [
        "^ill-conditioned: det = ([-\\d.]+)  ·  near-parallel lines make the intersection hypersensitive to noise$",
        "病态：det = $1 · 近乎平行的直线让交点对噪声极度敏感"
      ],
      [
        "^well\\-conditioned:\\ det\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ ·\\ \\ near\\-parallel\\ lines\\ make\\ the\\ intersection\\ hypersensitive\\ to\\ noise$",
        "条件良好：det = $1 · 近乎平行的直线让交点对噪声极度敏感"
      ]
    ],
    "preserve": []
  },
  "roots-of-unity": {
    "text": {
      "ROOTS OF UNITY": "单位根",
      "The n complex nth-roots of unity are the solutions of z to the n equals one. They sit evenly around the unit circle at angles two pi k over n, one of them always at 1. These evenly spaced points are the sampling frequencies behind the discrete Fourier transform.": "n 个复 n 次单位根是方程 zⁿ = 1 的解。它们均匀分布在单位圆上，角度为 2πk/n，其中一个总在 1 处。这些等距点正是离散傅里叶变换背后的采样频率。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "roots": "个单位根",
      "spaced 72.0 deg apart  ·  k = 0 (orange) is always 1  ·  they sum to 0 for n > 1": "间隔 72.0 度 · k = 0（橙色）始终为 1 · n > 1 时所有根之和为 0"
    },
    "patterns": [
      [
        "^spaced ([\\d.]+) deg apart  ·  k = 0 \\(orange\\) is always 1  ·  they sum to 0 for n > 1$",
        "间隔 $1 度 · k = 0（橙色）始终为 1 · n > 1 时所有根之和为 0"
      ]
    ],
    "preserve": [
      {
        "text": "z_k = exp(2*pi*i*k/n) = cos(2*pi*k/n) + i*sin(2*pi*k/n),  k = 0..n-1",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "graph-degree-distribution": {
    "text": {
      "GRAPH DEGREES": "图的度数",
      "Every edge touches two nodes, so it adds one to each of their degrees. Add up the degrees of all nodes and you have counted every edge exactly twice. This handshake lemma holds for any graph and forces the number of odd-degree nodes to be even.": "每条边触及两个节点，给它们的度各加一。把所有节点的度加起来，每条边恰好被数了两次。这条握手引理对任何图成立，并迫使奇数度节点的个数必为偶数。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "= 2 * 7 edges": "= 2 * 7 条边",
      "each node label is its degree  ·  average degree 2.33": "节点标签表示其度数 · 平均度数为 2.33",
      "handshake lemma: sum of degrees = 2 * (number of edges)": "握手定理：度数之和 = 2 *（边数）"
    },
    "patterns": [
      [
        "^each node label is its degree  ·  average degree ([\\d.]+)  ·  capped at (\\d+) \\(complete graph\\)$",
        "节点标签表示其度数 · 平均度数为 $1 · 最多 $2 条边（完全图）"
      ],
      [
        "^=\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\*\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ edges$",
        "= $1 * $2 条边"
      ],
      [
        "^each\\ node\\ label\\ is\\ its\\ degree\\ \\ ·\\ \\ average\\ degree\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "节点标签表示其度数 · 平均度数为 $1"
      ],
      [
        "^handshake\\ lemma:\\ sum\\ of\\ degrees\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\*\\ \\(number\\ of\\ edges\\)$",
        "握手定理：度数之和 = $1 *（边数）"
      ]
    ],
    "preserve": []
  },
  "random-walk-diffusion": {
    "text": {
      "RANDOM WALK": "随机游走",
      "A one-dimensional walk takes a plus-or-minus-one step each tick. Steps are independent so variances add: after t steps the variance is t and the typical distance from the start is the square root of t. Diffusion spreads slowly, which is why the walk wanders but rarely runs straight away.": "一维随机游走每一拍走 ±1。各步独立，方差相加：t 步后方差为 t，距起点的典型距离是 √t。扩散是慢的——这就是游走四处徘徊却很少直线跑远的原因。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "std = sqrt(t)": "标准差 = sqrt(t)",
      "t = 50 steps  ·  endpoints spread out like sqrt(t), not t  ·  dashed orange is the +/- one std envelope": "t = 50 步 · 终点按 sqrt(t) 而非 t 扩散 · 橙色虚线是正负一个标准差包络",
      "each step +/-1 with equal odds  ·  Var(position) = t,  std = sqrt(t)": "每步以相等概率取 +/-1 · Var(position) = t，std = sqrt(t)"
    },
    "patterns": [
      [
        "^t\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ steps\\ \\ ·\\ \\ endpoints\\ spread\\ out\\ like\\ sqrt\\(t\\),\\ not\\ t\\ \\ ·\\ \\ dashed\\ orange\\ is\\ the\\ \\+/\\-\\ one\\ std\\ envelope$",
        "t = $1 步 · 终点按 sqrt(t) 而非 t 扩散 · 橙色虚线是正负一个标准差包络"
      ],
      [
        "^each\\ step\\ \\+/([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ with\\ equal\\ odds\\ \\ ·\\ \\ Var\\(position\\)\\ =\\ t,\\ \\ std\\ =\\ sqrt\\(t\\)$",
        "每步以相等概率取 +/$1 · Var(position) = t，std = sqrt(t)"
      ]
    ],
    "preserve": []
  }
};
