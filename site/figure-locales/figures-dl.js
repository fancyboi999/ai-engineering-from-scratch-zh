(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-dl.js"] = {
  "perceptron-boundary": {
    "text": {
      "PERCEPTRON BOUNDARY": "感知机边界",
      "A perceptron predicts by the sign of w·x + b, so its decision surface is a straight line. Drag the weights and bias to rotate and shift that line until every blue circle sits on the positive side and every grey square on the negative one.": "感知机按 w·x + b 的符号做预测，所以它的决策面是一条直线。拖动权重和偏置，旋转、平移这条线，直到每个蓝圈都在正侧、每个灰方块都在负侧。",
      "of 12 misclassified": "个分类错误（共 12 个）",
      "all points correct: this line separates the two classes": "所有点都正确：直线分开了两类",
      "predict + when  1.0·x + 1.0·y + (0.0) > 0": "当 1.0·x + 1.0·y + (0.0) > 0 时预测 +",
      "filled = correct, hollow = wrong side of the line": "实心 = 正确，空心 = 位于直线错误一侧",
      "predict + when  -3.0·x + 1.0·y + (0.0) > 0": "当 -3.0·x + 1.0·y + (0.0) > 0 时预测 +",
      "predict + when  3.0·x + -3.0·y + (0.0) > 0": "当 3.0·x + -3.0·y + (0.0) > 0 时预测 +",
      "predict + when  3.0·x + 3.0·y + (-3.0) > 0": "当 3.0·x + 3.0·y + (-3.0) > 0 时预测 +"
    },
    "patterns": [
      [
        "^of\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ misclassified$",
        "个分类错误（共 $1 个）"
      ],
      [
        "^predict\\ \\+\\ when\\ \\ ([-+]?\\d+(?:[.,]\\d+)*)·x\\ \\+\\ ([-+]?\\d+(?:[.,]\\d+)*)·y\\ \\+\\ \\(([-+]?\\d+(?:[.,]\\d+)*)\\)\\ >\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "当 $1·x + $2·y + ($3) > $4 时预测 +"
      ],
      [
        "^predict\\ \\+\\ when\\ \\ ([-+]?\\d+(?:[.,]\\d+)*)·x\\ \\+\\ ([-+]?\\d+(?:[.,]\\d+)*)·y\\ \\+\\ \\(([-+]?\\d+(?:[.,]\\d+)*)\\)\\ >\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "当 $1·x + $2·y + ($3) > $4 时预测 +"
      ],
      [
        "^predict\\ \\+\\ when\\ \\ ([-+]?\\d+(?:[.,]\\d+)*)·x\\ \\+\\ ([-+]?\\d+(?:[.,]\\d+)*)·y\\ \\+\\ \\(([-+]?\\d+(?:[.,]\\d+)*)\\)\\ >\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "当 $1·x + $2·y + ($3) > $4 时预测 +"
      ],
      [
        "^predict\\ \\+\\ when\\ \\ ([-+]?\\d+(?:[.,]\\d+)*)·x\\ \\+\\ ([-+]?\\d+(?:[.,]\\d+)*)·y\\ \\+\\ \\(([-+]?\\d+(?:[.,]\\d+)*)\\)\\ >\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "当 $1·x + $2·y + ($3) > $4 时预测 +"
      ]
    ],
    "preserve": []
  },
  "mlp-forward": {
    "text": {
      "MLP FORWARD PASS": "MLP 前向传播",
      "Two inputs feed three hidden units through fixed weights, each squashed by tanh, then combine into one output. Blue edges are positive weights, gold are negative; node shading shows how strongly each unit fires for the inputs you set.": "两个输入经固定权重喂给三个隐藏单元，各自被 tanh 压缩，再汇成一个输出。蓝边是正权重，金边是负权重；节点深浅显示在你设定的输入下每个单元的激活强度。",
      "output": "输出",
      "hidden = [0.81, -0.79, 0.25]  ·  darker node = stronger activation": "隐藏激活 = [0.81, -0.79, 0.25]  ·  节点越深，激活越强",
      "hidden = [-0.96, 0.24, -0.97]  ·  darker node = stronger activation": "隐藏激活 = [-0.96, 0.24, -0.97]  ·  节点越深，激活越强",
      "hidden = [0.72, 0.92, 1.00]  ·  darker node = stronger activation": "隐藏激活 = [0.72, 0.92, 1.00]  ·  节点越深，激活越强"
    },
    "patterns": [
      [
        "^hidden\\ =\\ \\[([-+]?\\d+(?:[.,]\\d+)*),\\ ([-+]?\\d+(?:[.,]\\d+)*),\\ ([-+]?\\d+(?:[.,]\\d+)*)\\]\\ \\ ·\\ \\ darker\\ node\\ =\\ stronger\\ activation$",
        "隐藏激活 = [$1, $2, $3]  ·  节点越深，激活越强"
      ],
      [
        "^hidden\\ =\\ \\[([-+]?\\d+(?:[.,]\\d+)*),\\ ([-+]?\\d+(?:[.,]\\d+)*),\\ ([-+]?\\d+(?:[.,]\\d+)*)\\]\\ \\ ·\\ \\ darker\\ node\\ =\\ stronger\\ activation$",
        "隐藏激活 = [$1, $2, $3]  ·  节点越深，激活越强"
      ],
      [
        "^hidden\\ =\\ \\[([-+]?\\d+(?:[.,]\\d+)*),\\ ([-+]?\\d+(?:[.,]\\d+)*),\\ ([-+]?\\d+(?:[.,]\\d+)*)\\]\\ \\ ·\\ \\ darker\\ node\\ =\\ stronger\\ activation$",
        "隐藏激活 = [$1, $2, $3]  ·  节点越深，激活越强"
      ]
    ],
    "preserve": [
      {
        "text": "h = tanh(W₁x + b₁),  y = tanh(w₂·h + b₂)",
        "reason": "神经网络数学公式"
      }
    ]
  },
  "backprop-vanishing": {
    "text": {
      "VANISHING GRADIENTS": "梯度消失",
      "Backprop multiplies one activation derivative per layer. Sigmoid caps that derivative at 0.25 and tanh stays below one, so the product collapses toward zero in deep nets (note the log axis). ReLU keeps a derivative of one for active units, which is why it made deep training practical.": "反向传播每过一层就乘上一个激活函数的导数。Sigmoid 的导数上限是 0.25，tanh 也始终小于一，于是深网络里这个乘积塌向零（注意对数坐标轴）。ReLU 对激活的单元保持导数为一，这正是它让深度训练变得可行的原因。",
      "gradient": "梯度",
      "per-layer factor 0.25  ·  after 10 layers  ·  vanished: gradient is too small to train early layers": "每层因子 0.25  ·  经过 10 层后  ·  梯度消失：梯度过小，无法训练前面的层",
      "∂L/∂early ∝ Π σ′(zₗ) ≈ (0.25)^depth   (log scale)": "∂L/∂early ∝ Π σ′(zₗ) ≈ (0.25)^depth   （对数刻度）",
      "per-layer factor 1.00  ·  after 10 layers  ·  stable: derivative stays at 1, gradient survives depth": "每层因子 1.00  ·  经过 10 层后  ·  稳定：导数保持为 1，梯度可传播到深层",
      "per-layer factor 1.00  ·  after 2 layers  ·  stable: derivative stays at 1, gradient survives depth": "每层因子 1.00  ·  经过 2 层后  ·  稳定：导数保持为 1，梯度可传播到深层",
      "per-layer factor 1.00  ·  after 20 layers  ·  stable: derivative stays at 1, gradient survives depth": "每层因子 1.00  ·  经过 20 层后  ·  稳定：导数保持为 1，梯度可传播到深层",
      "per-layer factor 0.42  ·  after 2 layers  ·  shrinking with depth": "每层因子 0.42  ·  经过 2 层后  ·  随深度缩小"
    },
    "patterns": [
      [
        "^Backprop\\ multiplies\\ one\\ activation\\ derivative\\ per\\ layer\\.\\ Sigmoid\\ caps\\ that\\ derivative\\ at\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ and\\ tanh\\ stays\\ below\\ one,\\ so\\ the\\ product\\ collapses\\ toward\\ zero\\ in\\ deep\\ nets\\ \\(note\\ the\\ log\\ axis\\)\\.\\ ReLU\\ keeps\\ a\\ derivative\\ of\\ one\\ for\\ active\\ units,\\ which\\ is\\ why\\ it\\ made\\ deep\\ training\\ practical\\.$",
        "反向传播每过一层就乘上一个激活函数的导数。Sigmoid 的导数上限是 $1，tanh 也始终小于一，于是深网络里这个乘积塌向零（注意对数坐标轴）。ReLU 对激活的单元保持导数为一，这正是它让深度训练变得可行的原因。"
      ],
      [
        "^per\\-layer\\ factor\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ after\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ layers\\ \\ ·\\ \\ vanished:\\ gradient\\ is\\ too\\ small\\ to\\ train\\ early\\ layers$",
        "每层因子 $1  ·  经过 $2 层后  ·  梯度消失：梯度过小，无法训练前面的层"
      ],
      [
        "^∂L/∂early\\ ∝\\ Π\\ σ′\\(zₗ\\)\\ ≈\\ \\(([-+]?\\d+(?:[.,]\\d+)*)\\)\\^depth\\ \\ \\ \\(log\\ scale\\)$",
        "∂L/∂early ∝ Π σ′(zₗ) ≈ ($1)^depth   （对数刻度）"
      ],
      [
        "^per\\-layer\\ factor\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ after\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ layers\\ \\ ·\\ \\ stable:\\ derivative\\ stays\\ at\\ ([-+]?\\d+(?:[.,]\\d+)*),\\ gradient\\ survives\\ depth$",
        "每层因子 $1  ·  经过 $2 层后  ·  稳定：导数保持为 $3，梯度可传播到深层"
      ],
      [
        "^per\\-layer\\ factor\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ after\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ layers\\ \\ ·\\ \\ stable:\\ derivative\\ stays\\ at\\ ([-+]?\\d+(?:[.,]\\d+)*),\\ gradient\\ survives\\ depth$",
        "每层因子 $1  ·  经过 $2 层后  ·  稳定：导数保持为 $3，梯度可传播到深层"
      ],
      [
        "^per\\-layer\\ factor\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ after\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ layers\\ \\ ·\\ \\ stable:\\ derivative\\ stays\\ at\\ ([-+]?\\d+(?:[.,]\\d+)*),\\ gradient\\ survives\\ depth$",
        "每层因子 $1  ·  经过 $2 层后  ·  稳定：导数保持为 $3，梯度可传播到深层"
      ],
      [
        "^per\\-layer\\ factor\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ after\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ layers\\ \\ ·\\ \\ shrinking\\ with\\ depth$",
        "每层因子 $1  ·  经过 $2 层后  ·  随深度缩小"
      ]
    ],
    "preserve": []
  },
  "optimizer-trajectory": {
    "text": {
      "OPTIMIZER TRAJECTORY": "优化器轨迹",
      "The loss is a narrow ravine: gentle along x, twenty times steeper along y. Plain SGD bounces across the steep walls and crawls down the valley. Momentum smooths the bounce; Adam normalizes each direction so both axes converge at a similar rate.": "损失面是一条窄峡谷：沿 x 平缓，沿 y 陡二十倍。朴素 SGD 在陡壁之间来回弹跳，顺谷底爬行。动量平滑了弹跳；Adam 把每个方向归一化，让两个轴以相近速率收敛。",
      "Momentum": "动量",
      "gold dot is the minimum  ·  momentum averages out the zig-zag and rolls down the valley": "金点是最小值  ·  动量平均掉来回摆动，沿谷底下降",
      "f(x,y) = ½(x² + 20y²)   condition number 20  ·  30 steps": "f(x,y) = ½(x² + 20y²)   条件数 20  ·  30 步",
      "gold dot is the minimum  ·  plain SGD zig-zags across the steep ravine wall": "金点是最小值  ·  普通 SGD 在陡峭谷壁之间来回摆动",
      "gold dot is the minimum  ·  Adam rescales each axis, so the steep and flat directions advance together": "金点是最小值  ·  Adam 分别缩放每个轴，让陡峭和较平坦的方向同步前进"
    },
    "patterns": [
      [
        "^f\\(x,y\\)\\ =\\ ½\\(x²\\ \\+\\ ([-+]?\\d+(?:[.,]\\d+)*)y²\\)\\ \\ \\ condition\\ number\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ ([-+]?\\d+(?:[.,]\\d+)*)\\ steps$",
        "f(x,y) = ½(x² + $1y²)   条件数 $2  ·  $3 步"
      ]
    ],
    "preserve": [
      {
        "text": "SGD",
        "reason": "优化器名称"
      },
      {
        "text": "Adam",
        "reason": "优化器名称"
      }
    ]
  },
  "weight-init-variance": {
    "text": {
      "WEIGHT INIT VARIANCE": "权重初始化方差",
      "Each layer multiplies the activation variance by a gain of n·Var(w). Naive large weights make that gain grow with width, so activations explode (log axis). Xavier sets Var(w)=1/n and He sets 2/n for ReLU, both holding the gain near one so signal magnitude stays flat across depth.": "每一层把激活方差乘上 n·Var(w) 的增益。朴素地取大初始权重，会让增益随宽度增长、激活值爆炸（对数轴）。Xavier 取 Var(w)=1/n，He 为 ReLU 取 2/n，都把增益压在一附近，让信号幅度在深度方向保持平稳。",
      "naive (large)": "朴素初始化（较大）",
      "std @ L10": "第 L10 层的标准差",
      "per-layer gain 1.00  ·  stable: variance held near one across all ten layers": "每层增益 1.00  ·  稳定：十层中的方差保持在一附近",
      "Var(w) = 1/n  →  gain ≈ 1": "Var(w) = 1/n  →  增益 ≈ 1",
      "per-layer gain 5.12  ·  exploding: activations blow up layer by layer": "每层增益 5.12  ·  爆炸：激活值逐层增大",
      "Var = 1 (too large)  →  gain = n·Var grows with width": "Var = 1（过大） → 增益 = n·Var，随宽度增加",
      "Var(w) = 2/n  →  gain ≈ 1 after ReLU": "Var(w) = 2/n  →  ReLU 后增益 ≈ 1"
    },
    "patterns": [
      [
        "^Each\\ layer\\ multiplies\\ the\\ activation\\ variance\\ by\\ a\\ gain\\ of\\ n·Var\\(w\\)\\.\\ Naive\\ large\\ weights\\ make\\ that\\ gain\\ grow\\ with\\ width,\\ so\\ activations\\ explode\\ \\(log\\ axis\\)\\.\\ Xavier\\ sets\\ Var\\(w\\)=([-+]?\\d+(?:[.,]\\d+)*)/n\\ and\\ He\\ sets\\ ([-+]?\\d+(?:[.,]\\d+)*)/n\\ for\\ ReLU,\\ both\\ holding\\ the\\ gain\\ near\\ one\\ so\\ signal\\ magnitude\\ stays\\ flat\\ across\\ depth\\.$",
        "每一层把激活方差乘上 n·Var(w) 的增益。朴素地取大初始权重，会让增益随宽度增长、激活值爆炸（对数轴）。Xavier 取 Var(w)=$1/n，He 为 ReLU 取 $2/n，都把增益压在一附近，让信号幅度在深度方向保持平稳。"
      ],
      [
        "^std\\ @\\ L1([-+]?\\d+(?:[.,]\\d+)*)$",
        "第 L1$1 层的标准差"
      ],
      [
        "^per\\-layer\\ gain\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ stable:\\ variance\\ held\\ near\\ one\\ across\\ all\\ ten\\ layers$",
        "每层增益 $1  ·  稳定：十层中的方差保持在一附近"
      ],
      [
        "^Var\\(w\\)\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*)/n\\ \\ →\\ \\ gain\\ ≈\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "Var(w) = $1/n  →  增益 ≈ $2"
      ],
      [
        "^per\\-layer\\ gain\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ exploding:\\ activations\\ blow\\ up\\ layer\\ by\\ layer$",
        "每层增益 $1  ·  爆炸：激活值逐层增大"
      ],
      [
        "^Var\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\(too\\ large\\)\\ \\ →\\ \\ gain\\ =\\ n·Var\\ grows\\ with\\ width$",
        "Var = $1（过大） → 增益 = n·Var，随宽度增加"
      ],
      [
        "^Var\\(w\\)\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*)/n\\ \\ →\\ \\ gain\\ ≈\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ after\\ ReLU$",
        "Var(w) = $1/n  →  ReLU 后增益 ≈ $2"
      ]
    ],
    "preserve": [
      {
        "text": "Xavier / Glorot",
        "reason": "Xavier和Glorot初始化方法名"
      },
      {
        "text": "He / Kaiming",
        "reason": "He和Kaiming初始化方法名"
      }
    ]
  },
  "gradient-clipping": {
    "text": {
      "GRADIENT CLIPPING": "梯度裁剪",
      "When a gradient norm spikes, a single step can throw the weights off a cliff. Clipping rescales any gradient whose norm exceeds the threshold τ back down to τ, keeping direction but capping magnitude. Below τ the gradient is untouched; above it the update is tamed to min(‖g‖, τ).": "梯度范数突然飙升时，一步就能把权重甩下悬崖。裁剪把范数超过阈值 τ 的梯度按比例缩回 τ，方向不变、幅度封顶。低于 τ 的梯度原样通过；高于 τ 的更新被驯服为 min(‖g‖, τ)。",
      "clipped norm": "裁剪后范数",
      "exploding: raw norm 4.00 scaled by 0.25 down to the cap": "梯度爆炸：原始范数 4.00 乘以 0.25，降到上限",
      "if ‖g‖ > τ:  g ← g · τ / ‖g‖   →   clipped = min(‖g‖, τ) = min(4.0, 1.0)": "若 ‖g‖ > τ：g ← g · τ / ‖g‖   →   裁剪后 = min(‖g‖, τ) = min(4.0, 1.0)",
      "within budget: gradient passes through unchanged": "未超出预算：梯度原样通过"
    },
    "patterns": [
      [
        "^exploding:\\ raw\\ norm\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ scaled\\ by\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ down\\ to\\ the\\ cap$",
        "梯度爆炸：原始范数 $1 乘以 $2，降到上限"
      ],
      [
        "^if\\ ‖g‖\\ >\\ τ:\\ \\ g\\ ←\\ g\\ ·\\ τ\\ /\\ ‖g‖\\ \\ \\ →\\ \\ \\ clipped\\ =\\ min\\(‖g‖,\\ τ\\)\\ =\\ min\\(([-+]?\\d+(?:[.,]\\d+)*),\\ ([-+]?\\d+(?:[.,]\\d+)*)\\)$",
        "若 ‖g‖ > τ：g ← g · τ / ‖g‖   →   裁剪后 = min(‖g‖, τ) = min($1, $2)"
      ]
    ],
    "preserve": []
  },
  "dropout-mask": {
    "text": {
      "DROPOUT MASK": "Dropout 掩码",
      "Dropout zeroes a fraction p of units each step so the network cannot lean on any single one. Because only the survivors pass signal, they are scaled up by 1/(1−p) to keep the expected activation the same, and at test time the full layer runs with no scaling.": "Dropout 每步随机清零比例为 p 的单元，让网络无法依赖任何单个单元。因为只有幸存者传递信号，它们被放大 1/(1−p) 以保持期望激活不变，测试时整层全开、不做缩放。",
      "of 24 dropped": "个被丢弃（共 24 个）",
      "kept units scaled by 1/(1−p) = 1.43 so the expected sum is unchanged": "保留单元乘以 1/(1−p) = 1.43，使期望总和不变",
      "drop each unit with prob p = 0.30,  then divide survivors by (1 − p)": "以概率 p = 0.30 丢弃每个单元，再将保留单元除以 (1 − p)"
    },
    "patterns": [
      [
        "^Dropout\\ zeroes\\ a\\ fraction\\ p\\ of\\ units\\ each\\ step\\ so\\ the\\ network\\ cannot\\ lean\\ on\\ any\\ single\\ one\\.\\ Because\\ only\\ the\\ survivors\\ pass\\ signal,\\ they\\ are\\ scaled\\ up\\ by\\ ([-+]?\\d+(?:[.,]\\d+)*)/\\(([-+]?\\d+(?:[.,]\\d+)*)−p\\)\\ to\\ keep\\ the\\ expected\\ activation\\ the\\ same,\\ and\\ at\\ test\\ time\\ the\\ full\\ layer\\ runs\\ with\\ no\\ scaling\\.$",
        "Dropout 每步随机清零比例为 p 的单元，让网络无法依赖任何单个单元。因为只有幸存者传递信号，它们被放大 $1/($2−p) 以保持期望激活不变，测试时整层全开、不做缩放。"
      ],
      [
        "^of\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ dropped$",
        "个被丢弃（共 $1 个）"
      ],
      [
        "^kept\\ units\\ scaled\\ by\\ ([-+]?\\d+(?:[.,]\\d+)*)/\\(([-+]?\\d+(?:[.,]\\d+)*)−p\\)\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ so\\ the\\ expected\\ sum\\ is\\ unchanged$",
        "保留单元乘以 $1/($2−p) = $3，使期望总和不变"
      ],
      [
        "^drop\\ each\\ unit\\ with\\ prob\\ p\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*),\\ \\ then\\ divide\\ survivors\\ by\\ \\(([-+]?\\d+(?:[.,]\\d+)*)\\ −\\ p\\)$",
        "以概率 p = $1 丢弃每个单元，再将保留单元除以 ($2 − p)"
      ]
    ],
    "preserve": []
  },
  "batchnorm-effect": {
    "text": {
      "BATCH NORM": "批归一化",
      "Whatever mean and spread the layer below sends up (grey), batch norm subtracts the batch mean and divides by the batch standard deviation, snapping the distribution to zero mean and unit variance (blue). Learnable γ and β then let the network re-stretch it if a different scale is useful.": "不管下层送上来的均值和离散度是什么样（灰色），批归一化都会减去批均值、除以批标准差，把分布拉回零均值单位方差（蓝色）。可学习的 γ 和 β 再让网络在需要别的尺度时重新拉伸。",
      "grey is the raw pre-activation, blue is after batch norm  ·  recentred and rescaled every batch": "灰色为原始预激活，蓝色为批归一化结果  ·  每批都重新居中并缩放",
      "x̂ = (x − μ_B) / √(σ²_B + ε),  then  y = γ·x̂ + β": "x̂ = (x − μ_B) / √(σ²_B + ε)，然后 y = γ·x̂ + β"
    },
    "patterns": [],
    "preserve": []
  },
  "learning-curves": {
    "text": {
      "LEARNING CURVES": "学习曲线",
      "Grey is training loss, blue is validation loss. More capacity always lowers training loss, but validation loss bottoms out and then climbs as the model starts memorizing noise. The widening gap is the overfit signal; the gold line marks where early stopping would freeze the model.": "灰色是训练损失，蓝色是验证损失。容量越大训练损失永远越低，但验证损失见底后回升——模型开始记噪声了。拉大的缺口就是过拟合信号；金线标出早停会冻结模型的位置。",
      "gap 0.81": "差距 0.81",
      "· best": "· 最佳",
      "train 0.99  ·  val 1.80  ·  early stop at capacity 6 (gold line)": "训练 0.99  ·  验证 1.80  ·  容量 6 时提前停止（金线）",
      "train loss falls with capacity; val loss is U-shaped; stop where val bottoms out": "训练损失随容量下降；验证损失呈 U 形；在验证损失最低处停止",
      "· underfit": "· 欠拟合",
      "· overfit": "· 过拟合"
    },
    "patterns": [
      [
        "^gap\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "差距 $1"
      ],
      [
        "^train\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ val\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ early\\ stop\\ at\\ capacity\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\(gold\\ line\\)$",
        "训练 $1  ·  验证 $2  ·  容量 $3 时提前停止（金线）"
      ]
    ],
    "preserve": []
  }
};
