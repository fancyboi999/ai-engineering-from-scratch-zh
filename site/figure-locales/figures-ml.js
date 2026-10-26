(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-ml.js"] = {
  "linear-regression-fit": {
    "text": {
      "LINEAR REGRESSION FIT": "线性回归拟合",
      "Each orange bar is a residual, the gap between a point and the line. Squaring and averaging them gives the mean squared error. Least squares is just the choice of slope and intercept that makes that average as small as possible.": "每根橙色柱是一个残差，即数据点与直线在竖直方向上的差距。平方后取平均就是均方误差。最小二乘不过是选出让这个平均值最小的斜率和截距。",
      "line y = 0.70x + 1.40  ·  12 points  ·  orange bars are residuals": "直线 y = 0.70x + 1.40  ·  12 个点  ·  橙色竖条表示残差",
      "MSE = (1/n) Σ (yᵢ − (m·xᵢ + b))²   ·   least squares finds the m, b that minimize it": "MSE = (1/n) Σ (yᵢ − (m·xᵢ + b))²   ·   最小二乘法寻找使其最小的 m、b"
    },
    "patterns": [
      [
        "^line (y = [-\\d.]+x \\+ [-\\d.]+)  ·  (\\d+) points  ·  orange bars are residuals$",
        "直线 $1  ·  $2 个点  ·  橙色竖条表示残差"
      ]
    ],
    "preserve": [
      {
        "text": "MSE = 0.150",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "MSE = 29.526",
        "reason": "均方误差缩写 MSE 与计算结果"
      },
      {
        "text": "MSE = 38.526",
        "reason": "均方误差缩写 MSE 与计算结果"
      },
      {
        "text": "MSE = 13.763",
        "reason": "均方误差缩写 MSE 与计算结果"
      },
      {
        "text": "MSE = 89.946",
        "reason": "均方误差缩写 MSE 与计算结果"
      }
    ]
  },
  "logistic-sigmoid": {
    "text": {
      "LOGISTIC SIGMOID": "Logistic Sigmoid 函数",
      "Logistic regression squashes a linear score through the sigmoid to get a probability. The weight controls how sharply the curve turns; the bias slides it left or right. The orange line is the decision boundary, where the probability crosses one half.": "逻辑回归把线性得分压过 sigmoid 得到概率。权重控制曲线转弯的陡峭程度；偏置左右平移它。橙线是决策边界，即概率跨过一半的位置。",
      "Logistic Sigmoid": "Logistic Sigmoid 函数",
      "at p = 0.5": "在 p = 0.5 处",
      "steepness grows with |w|  ·  the boundary shifts with b  ·  output is a probability in (0, 1)": "陡峭程度随 |w| 增大  ·  边界随 b 移动  ·  输出为 (0, 1) 内的概率",
      "s(x) = 1 / (1 + e^−(w·x + b))   ·   decision boundary where w·x + b = 0  →  x* = −b/w": "s(x) = 1 / (1 + e^−(w·x + b))   ·   决策边界满足 w·x + b = 0  →  x* = −b/w",
      "no boundary": "没有边界"
    },
    "patterns": [
      [
        "^at p = ([\\d.]+)$",
        "在 p = $1 处"
      ]
    ],
    "preserve": [
      {
        "text": "x* = 0.00",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "x* = 1.25",
        "reason": "决策边界变量 x* 与数值"
      },
      {
        "text": "x* = -1.25",
        "reason": "决策边界变量 x* 与数值"
      }
    ]
  },
  "decision-tree-depth": {
    "text": {
      "DECISION TREE DEPTH": "决策树深度",
      "Each extra level of depth doubles the leaves and squares the regions the tree can carve. A few splits capture the real structure; beyond that the leaves turn gold, a sign the tree is fitting one point at a time instead of a pattern.": "深度每加一层，叶子翻倍，树能切出的区域平方级增长。几次分裂足以抓住真实结构；再往深，叶子开始变金——那是树在逐点拟合而非学习模式的信号。",
      "internal splits · 8 leaves": "个内部切分 · 8 个叶节点",
      "past the data: 8 leaves for ~4 real regions, the tree starts memorizing noise": "超出数据结构：8 个叶节点对应仅约 4 个真实区域，决策树开始记忆噪声",
      "a depth-d binary tree has up to 2^d − 1 splits and 2^d leaves   ·   d = 3  →  7 splits, 8 leaves": "深度为 d 的二叉树最多有 2^d − 1 个切分和 2^d 个叶节点   ·   d = 3  →  7 个切分，8 个叶节点"
    },
    "patterns": [
      [
        "^internal splits · (\\d+) leaves$",
        "个内部切分 · $1 个叶节点"
      ],
      [
        "^past the data: (\\d+) leaves for ~(\\d+) real regions, the tree starts memorizing noise$",
        "超出数据结构：$1 个叶节点对应仅约 $2 个真实区域，决策树开始记忆噪声"
      ],
      [
        "^depth (\\d+): still tracking real structure$",
        "深度 $1：仍在拟合真实结构"
      ],
      [
        "^a depth-d binary tree has up to 2\\^d − 1 splits and 2\\^d leaves   ·   d = (\\d+)  →  (\\d+) splits, (\\d+) leaves$",
        "深度为 d 的二叉树最多有 2^d − 1 个切分和 2^d 个叶节点   ·   d = $1  →  $2 个切分，$3 个叶节点"
      ]
    ],
    "preserve": []
  },
  "svm-margin": {
    "text": {
      "SVM MARGIN": "SVM 间隔",
      "A support vector machine does not just separate the classes, it pushes the boundary as far from both as it can. The dashed lines mark the margin; the points touching them, ringed in gold, are the support vectors. Move every other point and nothing changes.": "支持向量机不只是分开两类，它把边界推到离两边都尽可能远。虚线标出间隔；贴着虚线、金圈圈出的点是支持向量。挪动其它任何点，结果纹丝不动。",
      "support vectors": "个支持向量",
      "margin width 2.00  ·  points ringed in gold sit on the margin  ·  the wider the street, the better it generalizes": "间隔宽度 2.00  ·  金色圈出的点位于间隔边界  ·  间隔越宽，泛化越好",
      "maximize the margin 2/‖w‖ subject to yᵢ(w·xᵢ + b) ≥ 1   ·   only the support vectors define the boundary": "在 yᵢ(w·xᵢ + b) ≥ 1 的约束下最大化间隔 2/‖w‖   ·   只有支持向量决定边界"
    },
    "patterns": [
      [
        "^margin width ([\\d.]+)  ·  points ringed in gold sit on the margin  ·  the wider the street, the better it generalizes$",
        "间隔宽度 $1  ·  金色圈出的点位于间隔边界  ·  间隔越宽，泛化越好"
      ]
    ],
    "preserve": []
  },
  "knn-smoothness": {
    "text": {
      "K-NN SMOOTHNESS": "K-NN 平滑度",
      "With k = 1 the prediction copies the nearest point exactly, so the curve is jagged and fits every quirk. Raising k averages over more neighbors, smoothing the boundary until, at very large k, it flattens toward the overall class rate and ignores local structure.": "k = 1 时预测照抄最近的点，曲线参差不齐，拟合了每一处怪癖。调大 k 会对更多邻居取平均，边界逐渐平滑，k 极大时则趋平于整体类别比例，无视局部结构。",
      "· balanced": "· 均衡",
      "top dots are class 1, bottom dots class 0  ·  the curve is P(class 1) from the k nearest points": "上方点为类别 1，下方点为类别 0  ·  曲线是最近 k 个点得到的 P(类别 1)",
      "P(y = 1 | x) = (fraction of class 1 among the k nearest)   ·   small k follows noise, large k washes it out": "P(y = 1 | x) =（最近 k 个邻居中类别 1 的比例）   ·   k 小时追随噪声，k 大时将噪声平滑掉",
      "· jagged · overfit": "· 锯齿状 · 过拟合",
      "· flat · underfit": "· 平坦 · 欠拟合"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "k = 3",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "k = 1",
        "reason": "近邻数量参数 k 与数值"
      },
      {
        "text": "k = 17",
        "reason": "近邻数量参数 k 与数值"
      }
    ]
  },
  "kmeans-step": {
    "text": {
      "K-MEANS STEP": "K-means 迭代",
      "K-means alternates two steps: assign every point to its nearest centroid, then move each centroid to the mean of its points. The within-cluster sum of squares can only fall, so the algorithm converges once no point switches clusters.": "K-means 交替两步：把每个点分给最近的质心，再把每个质心挪到它名下点的均值处。簇内平方和只降不升，所以一旦没有点再换簇，算法就收敛了。",
      "iteration 0 of 6  ·  crosses are centroids  ·  WCSS falls every step until assignments stop changing": "第 0 次迭代，共 6 次  ·  十字表示质心  ·  每步 WCSS 都会下降，直到分配不再变化",
      "repeat: assign each point to its nearest centroid → move each centroid to its cluster mean   ·   WCSS = Σ ‖x − μ‖²": "重复：把每个点分配给最近的质心 → 将每个质心移到所属簇的均值   ·   WCSS = Σ ‖x − μ‖²"
    },
    "patterns": [
      [
        "^iteration (\\d+) of (\\d+)  ·  crosses are centroids  ·  WCSS falls every step until assignments stop changing$",
        "第 $1 次迭代，共 $2 次  ·  十字表示质心  ·  每步 WCSS 都会下降，直到分配不再变化"
      ]
    ],
    "preserve": [
      {
        "text": "WCSS = 119.06",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "WCSS = 10.74",
        "reason": "簇内平方和缩写 WCSS 与计算结果"
      }
    ]
  },
  "feature-scaling": {
    "text": {
      "FEATURE SCALING": "特征缩放",
      "When features live on different scales the loss surface is a long narrow valley, and gradient descent bounces between the walls. Standardizing each feature to zero mean and unit variance rounds the bowl, so the same algorithm walks almost straight to the minimum.": "特征量纲不一时，损失面是一条狭长山谷，梯度下降在两壁之间来回弹。把每个特征标准化为零均值单位方差后，碗变圆了，同样的算法几乎直线走到最小值。",
      "raw (unscaled)": "原始特征（未缩放）",
      "standardized": "已标准化",
      "raw features: contours are stretched, so descent zig-zags across the narrow valley": "原始特征：等高线被拉长，因此下降路径在狭窄谷地内来回摆动",
      "unequal feature scales → elongated loss surface → slow, oscillating convergence": "特征尺度不一致 → 损失曲面狭长 → 收敛缓慢且振荡",
      "standardized: contours are near-circular, so descent heads almost straight to the minimum": "标准化后：等高线接近圆形，因此下降路径几乎直达最小值",
      "x′ = (x − μ) / σ   →   each feature unit variance → round bowl → fast descent": "x′ = (x − μ) / σ   →   每个特征具有单位方差 → 圆形碗状曲面 → 快速下降"
    },
    "patterns": [],
    "preserve": []
  },
  "k-fold-cv": {
    "text": {
      "K-FOLD CROSS-VALIDATION": "K 折交叉验证",
      "Each row is one round: the gold fold is held out for validation, the blue folds are used for training. Rotating the held-out fold means every example is scored exactly once, and averaging the k scores gives a more stable estimate than a single split.": "每一行是一轮：金色折留出来做验证，蓝色折用于训练。轮换留出折意味着每个样本恰好被评分一次，k 个分数取平均比单次切分给出更稳定的估计。",
      "5-fold": "5 折",
      "· 5 rounds": "· 5 轮",
      "each round trains on 4 folds (80%) and validates on the gold one  ·  every example is held out exactly once": "每轮使用 4 折（80%）训练，在金色的一折上验证  ·  每个样本恰好被留出一次",
      "split data into k equal folds → for each fold, train on the other k−1 and score on it → average the k scores": "将数据等分为 k 折 → 对每一折，在其余 k−1 折训练并在该折评分 → 对 k 个分数取平均"
    },
    "patterns": [
      [
        "^(\\d+)-fold$",
        "$1 折"
      ],
      [
        "^· (\\d+) rounds$",
        "· $1 轮"
      ],
      [
        "^each round trains on (\\d+) folds \\((\\d+)%\\) and validates on the gold one  ·  every example is held out exactly once$",
        "每轮使用 $1 折（$2%）训练，在金色的一折上验证  ·  每个样本恰好被留出一次"
      ]
    ],
    "preserve": []
  },
  "naive-bayes": {
    "text": {
      "NAIVE BAYES": "朴素贝叶斯",
      "Each class has its own bell curve over the feature. The orange line is what you observed; the dots are how likely each class is to produce it. Bayes turns those likelihoods, weighted by the priors, into the posterior bar, the probability the point belongs to class B.": "每个类别在特征上有自己的钟形曲线。橙线是你的观测值；圆点是各类别产生它的似然。贝叶斯把这些似然按先验加权，转成后验柱——该点属于类别 B 的概率。",
      "observed x = 0.50  ·  likelihood A 0.607  ·  likelihood B 0.411  ·  equal priors": "观测 x = 0.50  ·  似然 A 0.607  ·  似然 B 0.411  ·  先验相等",
      "P(B | x) = P(x | B)·P(B) / Σ_c P(x | c)·P(c)   ·   with equal priors, the bigger likelihood wins": "P(B | x) = P(x | B)·P(B) / Σ_c P(x | c)·P(c)   ·   先验相等时，似然更大的类别获胜"
    },
    "patterns": [
      [
        "^observed x = ([\\d.]+)  ·  likelihood A ([\\d.]+)  ·  likelihood B ([\\d.]+)  ·  equal priors$",
        "观测 x = $1  ·  似然 A $2  ·  似然 B $3  ·  先验相等"
      ]
    ],
    "preserve": [
      {
        "text": "P(B | x) = 0.404",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "P(B | x) = 0.000",
        "reason": "条件概率公式 P(B | x) 与计算结果"
      },
      {
        "text": "P(B | x) = 1.000",
        "reason": "条件概率公式 P(B | x) 与计算结果"
      }
    ]
  },
  "class-imbalance": {
    "text": {
      "CLASS IMBALANCE": "类别不平衡",
      "When one class is rare, a classifier that always predicts the majority scores high accuracy while catching none of the cases you care about. The gold slice, the positives it never finds, is invisible to accuracy. This is why recall and F1 matter on imbalanced data.": "当一个类别很稀有时，永远预测多数类的分类器准确率很高，却抓不到你真正关心的任何病例。金色切片——它从未找到的正例——在准确率指标里是隐形的。这就是不平衡数据上要看召回率和 F1 的原因。",
      "accuracy · 0% recall": "准确率 · 0% 召回率",
      "predict everything negative: catches all 950 negatives, misses all 50 positives  ·  gold = positives never found": "全部预测为负类：找对全部 950 个负例，却漏掉全部 50 个正例  ·  金色表示从未找到的正例",
      "accuracy = (1 − positive rate)   ·   recall = 0   ·   high accuracy here means nothing": "准确率 =（1 − 正类比例）   ·   召回率 = 0   ·   此处高准确率没有意义"
    },
    "patterns": [
      [
        "^predict everything negative: catches all (\\d+) negatives, misses all (\\d+) positives  ·  gold = positives never found$",
        "全部预测为负类：找对全部 $1 个负例，却漏掉全部 $2 个正例  ·  金色表示从未找到的正例"
      ]
    ],
    "preserve": []
  }
};
