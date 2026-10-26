(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-math.js"] = {
  "eigen-directions": {
    "text": {
      "EIGEN-DIRECTIONS": "特征方向",
      "For a symmetric matrix the eigenvectors are the dashed axes, and the matrix simply stretches anything along them by the eigenvalue (orange). A generic grey vector, off those axes, both stretches and rotates into the blue image. Drag its angle: only on an eigen-axis does the output stay parallel to the input.": "对称矩阵的特征向量是那两条虚线轴，矩阵只是把沿轴的任何东西按特征值（橙色）拉伸。偏离轴的灰色一般向量则会又拉伸又旋转成蓝色的像。拖动它的角度：只有在特征轴上，输出才与输入保持平行。",
      "eigenvalues stretch the dashed axes  ·  the grey input vector rotates into blue, off-axis": "特征值拉伸虚线轴  ·  灰色输入向量变为蓝色，通常不沿特征轴",
      "M = [[2.0, 0.8], [0.8, 1.0]]   ·   Mv = λv only along the eigen-axes": "M = [[2.0, 0.8], [0.8, 1.0]]   ·   仅沿特征轴时满足 Mv = λv"
    },
    "patterns": [
      [
        "^(M = \\[\\[[-\\d., ]+\\], \\[[-\\d., ]+\\]\\])   ·   Mv = λv only along the eigen-axes$",
        "$1   ·   仅沿特征轴时满足 Mv = λv"
      ]
    ],
    "preserve": [
      {
        "text": "a  (M₁₁)",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "d  (M₂₂)",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  },
  "vector-projection": {
    "text": {
      "VECTOR PROJECTION": "向量投影",
      "Blue is a, grey is the direction of b, orange is the shadow a casts on b. The scalar projection |a|cos θ shrinks to zero when the vectors are perpendicular and goes negative when the angle passes 90°. The dashed line is the perpendicular dropped from a to its foot on b.": "蓝色是 a，灰色是 b 的方向，橙色是 a 投在 b 上的影子。标量投影 |a|cos θ 在两向量垂直时缩为零，夹角过 90° 后变负。虚线是从 a 向 b 上的垂足所作的垂线。",
      "proj length": "投影长度",
      "angle θ = 45°  ·  proj = |a|cos θ = 1.70": "夹角 θ = 45°  ·  proj = |a|cos θ = 1.70",
      "proj_b a = (a·b / |b|²) b   ·   scalar = |a|cos θ   ·   b shown as unit vector (grey)": "proj_b a = (a·b / |b|²) b   ·   标量 = |a|cos θ   ·   b 以灰色单位向量显示"
    },
    "patterns": [
      [
        "^angle θ = ([-\\d.]+)°  ·  proj = \\|a\\|cos θ = ([-\\d.]+)$",
        "夹角 θ = $1°  ·  proj = |a|cos θ = $2"
      ],
      [
        "^angle θ = ([-\\d.]+)°  ·  proj = \\|a\\|cos θ = ([-\\d.]+)  \\(points opposite b\\)$",
        "夹角 θ = $1°  ·  proj = |a|cos θ = $2  （方向与 b 相反）"
      ]
    ],
    "preserve": []
  },
  "matrix-transform": {
    "text": {
      "MATRIX TRANSFORM": "矩阵变换",
      "Grey is the unit square; blue is its image under M. The columns of M are where the basis vectors land. The determinant ad − bc is the signed area of that parallelogram: it is the factor by which the matrix scales area, and it turns negative when the transform flips orientation.": "灰色是单位正方形；蓝色是它经 M 变换后的像。M 的列就是基向量的落点。行列式 ad − bc 是那个平行四边形的有向面积：它是矩阵缩放面积的倍数，变换翻转方向时它变负。",
      "determinant": "行列式",
      "area scales by 1.00x": "面积缩放为 1.00 倍"
    },
    "patterns": [
      [
        "^area scales by ([\\d.]+)x$",
        "面积缩放为 $1 倍"
      ],
      [
        "^orientation flipped  ·  area scales by ([\\d.]+)x$",
        "方向已翻转  ·  面积缩放为 $1 倍"
      ],
      [
        "^collapsed to a line  ·  area scales by ([\\d.]+)x$",
        "塌缩成直线  ·  面积缩放为 $1 倍"
      ]
    ],
    "preserve": [
      {
        "text": "a  (M₁₁)",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "b  (M₁₂)",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "c  (M₂₁)",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "d  (M₂₂)",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "M = [[1.0, 0.5], [0.0, 1.0]]   ·   det = ad − bc = 1.00",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "M = [[-2.0, 0.5], [0.0, 1.0]]   ·   det = ad − bc = -2.00",
        "reason": "矩阵元素与行列式计算公式，变量名和数值原样保留"
      },
      {
        "text": "M = [[2.0, 0.5], [0.0, 1.0]]   ·   det = ad − bc = 2.00",
        "reason": "矩阵元素与行列式计算公式，变量名和数值原样保留"
      },
      {
        "text": "M = [[2.0, -2.0], [0.0, 1.0]]   ·   det = ad − bc = 2.00",
        "reason": "矩阵元素与行列式计算公式，变量名和数值原样保留"
      },
      {
        "text": "M = [[2.0, 2.0], [0.0, 1.0]]   ·   det = ad − bc = 2.00",
        "reason": "矩阵元素与行列式计算公式，变量名和数值原样保留"
      },
      {
        "text": "M = [[2.0, 2.0], [-2.0, 1.0]]   ·   det = ad − bc = 6.00",
        "reason": "矩阵元素与行列式计算公式，变量名和数值原样保留"
      },
      {
        "text": "M = [[2.0, 2.0], [2.0, 1.0]]   ·   det = ad − bc = -2.00",
        "reason": "矩阵元素与行列式计算公式，变量名和数值原样保留"
      },
      {
        "text": "M = [[2.0, 2.0], [2.0, -2.0]]   ·   det = ad − bc = -8.00",
        "reason": "矩阵元素与行列式计算公式，变量名和数值原样保留"
      },
      {
        "text": "M = [[2.0, 2.0], [2.0, 2.0]]   ·   det = ad − bc = 0.00",
        "reason": "矩阵元素与行列式计算公式，变量名和数值原样保留"
      }
    ]
  },
  "derivative-tangent": {
    "text": {
      "DERIVATIVE / TANGENT": "导数 / 切线",
      "The derivative is the slope of the tangent line. For f(x) = x³ − 3x it equals 3x² − 3, which is zero at x = ±1, the two critical points where the orange line goes flat. Between them the function falls, outside them it rises. Gradient descent reads exactly this slope to decide which way to step.": "导数就是切线的斜率。对 f(x) = x³ − 3x 它等于 3x² − 3，在 x = ±1 处为零，正是橙线放平的两个临界点。两点之间函数下降，两侧上升。梯度下降读的正是这个斜率来决定往哪边走。",
      "slope f′(x₀)": "斜率 f′(x₀)",
      "x₀ = -1.60  ·  f(x₀) = 0.70  ·  rising": "x₀ = -1.60  ·  f(x₀) = 0.70  ·  上升",
      "f(x) = x³ − 3x   ·   f′(x) = 3x² − 3   ·   tangent y = f(x₀) + f′(x₀)(x − x₀)": "f(x) = x³ − 3x   ·   f′(x) = 3x² − 3   ·   切线 y = f(x₀) + f′(x₀)(x − x₀)"
    },
    "patterns": [
      [
        "^(x₀ = [-\\d.]+  ·  f\\(x₀\\) = [-\\d.]+)  ·  rising$",
        "$1  ·  上升"
      ],
      [
        "^(x₀ = [-\\d.]+  ·  f\\(x₀\\) = [-\\d.]+)  ·  falling$",
        "$1  ·  下降"
      ],
      [
        "^(x₀ = [-\\d.]+  ·  f\\(x₀\\) = [-\\d.]+)  ·  flat: a critical point$",
        "$1  ·  平坦：临界点"
      ]
    ],
    "preserve": []
  },
  "chain-rule": {
    "text": {
      "dy/dx = product": "dy/dx = 两者乘积",
      "y = sin(1.50) = 0.997  ·  local slopes multiply: 0.07 × 3.00": "y = sin(1.50) = 0.997  ·  局部斜率相乘：0.07 × 3.00",
      "y = sin(a x²)   ·   dy/dx = cos(a x²) · 2 a x   ·   outer derivative × inner derivative": "y = sin(a x²)   ·   dy/dx = cos(a x²) · 2 a x   ·   外层导数 × 内层导数"
    },
    "patterns": [
      [
        "^(y = sin\\([-\\d.]+\\) = [-\\d.]+)  ·  local slopes multiply: ([-\\d.]+ × [-\\d.]+)$",
        "$1  ·  局部斜率相乘：$2"
      ]
    ],
    "preserve": [
      {
        "text": "x",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "a",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "dy/du = cos(a x²)",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "du/dx = 2 a x",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "dy/dx",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  },
  "gaussian-pdf": {
    "text": {
      "GAUSSIAN PDF": "高斯概率密度",
      "The mean slides the bell sideways; the standard deviation sets its width. A smaller σ makes a taller, narrower peak, since the total area stays fixed at 1. The shaded band is μ ± σ, which always captures about 68% of the probability no matter where you put the curve.": "均值左右平移钟形曲线；标准差决定它的宽度。σ 越小峰越高越窄，因为总面积恒为 1。阴影带是 μ ± σ，无论曲线在哪，它总是罩住约 68% 的概率。",
      "peak density": "峰值密度",
      "μ = 0.00  ·  σ = 1.00  ·  shaded ±1σ holds ≈ 68% of the mass": "μ = 0.00  ·  σ = 1.00  ·  阴影 ±1σ 区间包含约 68% 的概率质量",
      "p(x) = exp(−½((x−μ)/σ)²) / (σ√(2π))   ·   area always integrates to 1": "p(x) = exp(−½((x−μ)/σ)²) / (σ√(2π))   ·   积分面积始终为 1"
    },
    "patterns": [
      [
        "^(μ = [-\\d.]+  ·  σ = [\\d.]+)  ·  shaded ±1σ holds ≈ 68% of the mass$",
        "$1  ·  阴影 ±1σ 区间包含约 68% 的概率质量"
      ]
    ],
    "preserve": []
  },
  "bayes-update": {
    "text": {
      "% have it, given +": "% 阳性时真正患病的比例",
      "a positive test happens 5.9% of the time  ·  most are false alarms when the disease is rare": "检测结果有 5.9% 的概率为阳性  ·  疾病罕见时，多数阳性都是误报"
    },
    "patterns": [
      [
        "^a positive test happens ([\\d.]+)% of the time  ·  most are false alarms when the disease is rare$",
        "检测结果有 $1% 的概率为阳性  ·  疾病罕见时，多数阳性都是误报"
      ]
    ],
    "preserve": [
      {
        "text": "P(D|+) = sens·prior / (sens·prior + fpr·(1−prior)) = 0.95·0.010 / 0.0590",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "P(D|+) = sens·prior / (sens·prior + fpr·(1−prior)) = 0.95·0.001 / 0.0509",
        "reason": "贝叶斯更新的数学公式，保留概率变量与计算值"
      },
      {
        "text": "P(D|+) = sens·prior / (sens·prior + fpr·(1−prior)) = 0.95·0.500 / 0.5000",
        "reason": "贝叶斯更新的数学公式，保留概率变量与计算值"
      },
      {
        "text": "P(D|+) = sens·prior / (sens·prior + fpr·(1−prior)) = 0.50·0.500 / 0.2750",
        "reason": "贝叶斯更新的数学公式，保留概率变量与计算值"
      },
      {
        "text": "P(D|+) = sens·prior / (sens·prior + fpr·(1−prior)) = 1.00·0.500 / 0.5250",
        "reason": "贝叶斯更新的数学公式，保留概率变量与计算值"
      },
      {
        "text": "P(D|+) = sens·prior / (sens·prior + fpr·(1−prior)) = 1.00·0.500 / 0.5025",
        "reason": "贝叶斯更新的数学公式，保留概率变量与计算值"
      },
      {
        "text": "P(D|+) = sens·prior / (sens·prior + fpr·(1−prior)) = 1.00·0.500 / 0.6500",
        "reason": "贝叶斯更新的数学公式，保留概率变量与计算值"
      }
    ]
  },
  "entropy-kl": {
    "text": {
      "bits H(p)": "比特 H(p)",
      "KL(p‖q) = 0.789 bits  ·  always ≥ 0, zero only when p = q  ·  asymmetric: KL(p‖q) ≠ KL(q‖p)": "KL(p‖q) = 0.789 比特  ·  始终 ≥ 0，仅当 p = q 时为零  ·  不对称：KL(p‖q) ≠ KL(q‖p)"
    },
    "patterns": [
      [
        "^(KL\\(p‖q\\) = [-\\d.]+) bits  ·  always ≥ 0, zero only when p = q  ·  asymmetric: KL\\(p‖q\\) ≠ KL\\(q‖p\\)$",
        "$1 比特  ·  始终 ≥ 0，仅当 p = q 时为零  ·  不对称：KL(p‖q) ≠ KL(q‖p)"
      ]
    ],
    "preserve": [
      {
        "text": "p 45% · q 10%",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "p 27% · q 20%",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "p 18% · q 30%",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "p 9% · q 40%",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "H(p) = −Σ pᵢ log₂ pᵢ   ·   KL(p‖q) = Σ pᵢ log₂(pᵢ / qᵢ)",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "p 0% · q 10%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 50% · q 20%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 33% · q 30%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 17% · q 40%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 63% · q 10%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 19% · q 20%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 13% · q 30%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 6% · q 40%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 63% · q 0%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 19% · q 22%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 13% · q 33%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 6% · q 44%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 63% · q 53%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 19% · q 11%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 13% · q 16%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 6% · q 21%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 77% · q 53%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 0% · q 11%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 15% · q 16%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 8% · q 21%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 43% · q 53%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 43% · q 11%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 9% · q 16%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 4% · q 21%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 43% · q 59%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 43% · q 0%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 9% · q 18%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 4% · q 24%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 43% · q 37%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 9% · q 11%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 4% · q 15%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 48% · q 37%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 5% · q 15%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 32% · q 37%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 32% · q 11%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 3% · q 15%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 32% · q 42%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 32% · q 0%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 3% · q 17%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 32% · q 29%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 3% · q 12%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 33% · q 29%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 0% · q 12%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 25% · q 29%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 25% · q 12%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 25% · q 33%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 25% · q 0%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      },
      {
        "text": "p 25% · q 25%",
        "reason": "概率分布 p、q 的分箱值标签，保留变量名和百分数"
      }
    ]
  },
  "pca-axes": {
    "text": {
      "PCA AXES": "PCA 主轴",
      "PCA finds the eigenvectors of the covariance matrix. The blue axis (PC1) points along the direction of greatest spread; the orange axis (PC2) is perpendicular and captures what is left. The eigenvalues are the variances along each axis, so the variance-explained on PC1 climbs as the cloud becomes more elongated and correlated.": "PCA 求的是协方差矩阵的特征向量。蓝轴（PC1）指向散布最大的方向；橙轴（PC2）与之垂直，捕捉剩余的部分。特征值就是各轴上的方差，所以点云越拉长、相关性越强，PC1 解释的方差占比就越高。",
      "% variance on PC1": "% PC1 解释的方差比例",
      "principal variances λ₁ = 2.12, λ₂ = 0.14  ·  blue = PC1 (most spread), orange = PC2": "主方差 λ₁ = 2.12，λ₂ = 0.14  ·  蓝色 = PC1（离散最明显），橙色 = PC2",
      "PCs are eigenvectors of the covariance Σ  ·  eigenvalues λ = variance explained along each axis": "主成分是协方差 Σ 的特征向量  ·  特征值 λ = 各轴解释的方差"
    },
    "patterns": [
      [
        "^principal variances (λ₁ = [\\d.]+), (λ₂ = [\\d.]+)  ·  blue = PC1 \\(most spread\\), orange = PC2$",
        "主方差 $1，$2  ·  蓝色 = PC1（离散最明显），橙色 = PC2"
      ]
    ],
    "preserve": []
  },
  "convex-vs-nonconvex": {
    "text": {
      "CONVEX VS NON-CONVEX": "凸与非凸",
      "A convex bowl has one minimum, so gradient descent reaches it from any start. The non-convex landscape has several valleys: the grey trail rolls downhill into whichever one is nearest, and the orange dot can settle in a local minimum that is not the global best. Drag the start to see different basins capture the path.": "凸的碗只有一个最小值，梯度下降从任何起点都能到达。非凸地形有好几个山谷：灰色轨迹滚进离它最近的那个，橙点可能停在并非全局最优的局部极小值里。拖动起点，看不同的盆地如何捕获路径。",
      "convex bowl": "凸碗形",
      "non-convex (bumpy)": "非凸（起伏）",
      "global minimum": "全局最小值",
      "landed at x = -0.00  ·  one valley: any start reaches the bottom": "最终位于 x = -0.00  ·  一个谷底：任意起点都能到达底部",
      "f(x) = ½x²   ·   one minimum, every descent path converges there": "f(x) = ½x²   ·   只有一个最小值，所有下降路径均收敛于此",
      "stuck: local minimum": "受困：局部最小值",
      "f(x) = 0.18x² + sin(3x)   ·   several local minima trap descent": "f(x) = 0.18x² + sin(3x)   ·   多个局部最小值会困住下降路径"
    },
    "patterns": [
      [
        "^landed at x = ([-\\d.]+)  ·  one valley: any start reaches the bottom$",
        "最终位于 x = $1  ·  一个谷底：任意起点都能到达底部"
      ],
      [
        "^landed at x = ([-\\d.]+)  ·  many valleys: the start decides which one you fall into$",
        "最终位于 x = $1  ·  多个谷底：起点决定会落入哪一个"
      ]
    ],
    "preserve": []
  },
  "fourier-synthesis": {
    "text": {
      "FOURIER SYNTHESIS": "傅里叶合成",
      "Every periodic signal is a sum of sine waves at integer multiples of a base frequency. The faint grey curves are the individual odd harmonics; the blue curve is their sum. Set them to 1, 1/3, 1/5, 1/7 of full strength and the sum starts to square off, the classic Fourier-series approach to a square wave.": "任何周期信号都是基频整数倍正弦波的叠加。浅灰曲线是各奇次谐波；蓝色曲线是它们的和。把幅值设为 1、1/3、1/5、1/7，和就开始变方——这是傅里叶级数逼近方波的经典做法。",
      "harmonics at 1f, 3f, 5f, 7f  ·  amplitudes 1.00, 0.00, 0.33, 0.00  ·  odd harmonics 1, 1/3, 1/5 build a square wave": "谐波位于 1f、3f、5f、7f  ·  振幅 1.00, 0.00, 0.33, 0.00  ·  奇次谐波 1、1/3、1/5 构成方波",
      "f(t) = Σ aₖ sin(2π(2k+1)t)   ·   any periodic signal is a sum of sines": "f(t) = Σ aₖ sin(2π(2k+1)t)   ·   任意周期信号都可以表示为正弦波之和"
    },
    "patterns": [
      [
        "^harmonics at 1f, 3f, 5f, 7f  ·  amplitudes ([\\d., ]+)  ·  odd harmonics 1, 1/3, 1/5 build a square wave$",
        "谐波位于 1f、3f、5f、7f  ·  振幅 $1  ·  奇次谐波 1、1/3、1/5 构成方波"
      ],
      [
        "^harmonics at 1f, 3f, 5f, 7f  ·  amplitudes ([\\d., ]+)$",
        "谐波位于 1f、3f、5f、7f  ·  振幅 $1"
      ]
    ],
    "preserve": []
  }
};
