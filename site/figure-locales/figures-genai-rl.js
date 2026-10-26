(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-genai-rl.js"] = {
  "vae-latent-grid": {
    "text": {
      "VAE LATENT GRID": "VAE 潜空间网格",
      "A VAE maps inputs to a smooth latent space and decodes points back to outputs. The square on the left is a slice of that space; the dot is your latent code. Moving it morphs the decoded shape on the right continuously, because the decoder is trained so that nearby codes produce nearby outputs.": "VAE 将输入映射到平滑的潜空间，并把空间中的点解码回输出。左侧方框是潜空间的切片，圆点表示潜变量编码。移动圆点会连续改变右侧解码得到的形状，因为解码器经过训练，使相邻编码产生相近输出。"
    },
    "patterns": [
      [
        "^latent \\(z1, z2\\) = \\(([\\d.-]+), ([\\d.-]+)\\)  ·  decoded (\\d+) lobes  ·  mixed$",
        "潜变量 (z1, z2) = ($1, $2)  ·  解码出 $3 个瓣  ·  混合形状"
      ],
      [
        "^x = decoder\\(z\\),  z ~ N\\(0, I\\)   ·   nearby z decode to similar shapes \\(smooth latent space\\)$",
        "x = decoder(z),  z ~ N(0, I)   ·   相近的 z 解码为相似形状（平滑潜空间）"
      ],
      [
        "^latent \\(z1, z2\\) = \\(([\\d.-]+), ([\\d.-]+)\\)  ·  decoded (\\d+) lobes  ·  round$",
        "潜变量 (z1, z2) = ($1, $2)  ·  解码出 $3 个瓣  ·  圆润形状"
      ],
      [
        "^latent \\(z1, z2\\) = \\(([\\d.-]+), ([\\d.-]+)\\)  ·  decoded (\\d+) lobes  ·  spiky$",
        "潜变量 (z1, z2) = ($1, $2)  ·  解码出 $3 个瓣  ·  尖锐形状"
      ]
    ],
    "preserve": []
  },
  "gan-minimax": {
    "text": {
      "GAN MINIMAX": "GAN 极小极大博弈",
      "near equilibrium: useful gradients flow": "接近平衡：有效梯度能传播",
      "A GAN is a two-player game: the generator (blue) tries to fool the discriminator (grey), which tries to tell real from fake. Both must improve together. If the discriminator wins decisively its gradient to the generator vanishes; if the generator races ahead it can collapse onto a few outputs. Healthy training stays near the dashed equilibrium.": "GAN 是双人博弈：生成器（蓝色）试图欺骗判别器（灰色），判别器则试图区分真实与生成样本。两者必须一起进步。判别器压倒性获胜时，传给生成器的梯度会消失；生成器领先太多则可能坍缩为少数输出。健康的训练应保持在虚线平衡点附近。",
      "generator dominates: mode collapse risk": "生成器占优：存在模式坍缩风险",
      "discriminator too strong: vanishing gradient": "判别器过强：梯度消失"
    },
    "patterns": [
      [
        "^generator loss ([\\d.]+)  ·  discriminator loss ([\\d.]+)  ·  gradient to G (\\d+)%$",
        "生成器损失 $1  ·  判别器损失 $2  ·  传给 G 的梯度 $3%"
      ],
      [
        "^(min_G max_D  .+)   ·   balance keeps the game informative$",
        "$1   ·   平衡让博弈持续提供有效学习信息"
      ]
    ],
    "preserve": []
  },
  "diffusion-denoise": {
    "text": {
      "DIFFUSION DENOISE": "扩散去噪",
      "A diffusion model learns to reverse a noising process. At t = T the signal is pure noise; as t falls toward 0 the model removes noise step by step and the underlying signal (grey dashes) re-emerges. Each x_t is a fixed mix of the clean signal and the same noise, weighted by the schedule.": "扩散模型学习逆转加噪过程。t = T 时，信号是纯噪声；t 逐渐减到 0，模型逐步去噪，底层信号（灰色虚线）重新出现。每个 x_t 都按调度给出的权重，由干净信号与同一份噪声固定混合而成。"
    },
    "patterns": [
      [
        "^t = (\\d+) of (\\d+)  ·  signal (\\d+)%  ·  noise (\\d+)%  ·  almost clean$",
        "t = $1 / $2  ·  信号 $3%  ·  噪声 $4%  ·  几乎干净"
      ],
      [
        "^t = (\\d+) of (\\d+)  ·  signal (\\d+)%  ·  noise (\\d+)%  ·  near pure noise$",
        "t = $1 / $2  ·  信号 $3%  ·  噪声 $4%  ·  接近纯噪声"
      ],
      [
        "^t = (\\d+) of (\\d+)  ·  signal (\\d+)%  ·  noise (\\d+)%  ·  denoising$",
        "t = $1 / $2  ·  信号 $3%  ·  噪声 $4%  ·  正在去噪"
      ]
    ],
    "preserve": [
      {
        "text": "x_t = sqrt(alpha_bar_t) x_0 + sqrt(1 - alpha_bar_t) noise   ·   alpha_bar_t = cos^2((t/T)·pi/2)",
        "reason": "扩散过程公式，noise 为数学变量"
      }
    ]
  },
  "noise-schedule": {
    "text": {
      "cosine": "余弦",
      "linear": "线性",
      "NOISE SCHEDULE": "噪声调度",
      "alpha_bar is the fraction of signal surviving at step t, and its ratio to the remaining noise is the signal-to-noise ratio. A linear schedule wipes out the signal fast in the early steps; the cosine schedule decays more gently in the middle, leaving useful signal for longer and giving the model more informative intermediate targets.": "alpha_bar 表示第 t 步保留的信号比例，它与剩余噪声的比值就是信噪比。线性调度会在前期迅速抹去信号；余弦调度在中段下降更平缓，让有效信号保留更久，并为模型提供信息更丰富的中间目标。"
    },
    "patterns": [
      [
        "^alpha_bar = ([\\d.]+)  ·  SNR = ([\\d.]+)  ·  cosine keeps signal longer in mid steps$",
        "alpha_bar = $1  ·  SNR = $2  ·  余弦调度在中间步骤保留信号更久"
      ],
      [
        "^alpha_bar = ([\\d.]+)  ·  SNR = ([\\d.]+)  ·  linear destroys signal early$",
        "alpha_bar = $1  ·  SNR = $2  ·  线性调度在前期迅速抹去信号"
      ]
    ],
    "preserve": [
      {
        "text": "alpha_bar_t = cos^2((t/T)·pi/2)   ·   SNR(t) = alpha_bar_t / (1 - alpha_bar_t)",
        "reason": "噪声调度与信噪比公式"
      },
      {
        "text": "alpha_bar_t = (1 - t/T)^2.2   ·   SNR(t) = alpha_bar_t / (1 - alpha_bar_t)",
        "reason": "线性噪声调度与信噪比公式"
      }
    ]
  },
  "discount-horizon": {
    "text": {
      "DISCOUNT HORIZON": "折扣视界",
      "step horizon": "步视界",
      "Future reward t steps away is weighted by gamma^t, so the weights fall off geometrically (the bars). The dashed line marks the effective horizon 1/(1 - gamma), where the weight has dropped to about 1/e. Raising gamma stretches that horizon, making the agent care about reward much further into the future.": "距离当前 t 步的未来奖励乘以 gamma^t，因此权重按几何级数递减（柱形）。虚线标出有效视界 1/(1 - gamma)，此处权重已降至约 1/e。增大 gamma 会延长视界，让 agent 更重视遥远未来的奖励。",
      "return = sum_t gamma^t r_t   ·   effective horizon = 1/(1 - gamma)   ·   weights decay geometrically": "回报 = sum_t gamma^t r_t   ·   有效视界 = 1/(1 - gamma)   ·   权重按几何级数衰减"
    },
    "patterns": [
      [
        "^gamma = ([\\d.]+)  ·  weight at the horizon = ([\\d.]+) \\(about 1/e\\)  ·  reward (\\d+) steps out weighs ([\\d.]+)$",
        "gamma = $1  ·  视界处权重 = $2（约 1/e）  ·  $3 步后奖励的权重为 $4"
      ]
    ],
    "preserve": []
  },
  "value-iteration-gamma": {
    "text": {
      "VALUE ITERATION": "价值迭代",
      "GOAL": "目标",
      "Value iteration backs reward up from the goal one step at a time. On this chain the only reward is at the rightmost cell, so each state is worth gamma raised to its distance from the goal. A small gamma makes distant reward nearly worthless (short-sighted); a gamma near 1 carries strong value all the way back along the chain.": "价值迭代每次向前回传一步目标奖励。这条链仅在最右端的格子有奖励，因此各状态的价值等于 gamma 的“距目标步数”次方。gamma 小时，远处的奖励几乎没有价值，策略较短视；gamma 接近 1 时，较高的价值能沿链传回很远。",
      "V(s) = gamma^(distance to goal)   ·   higher gamma propagates value further from the goal": "V(s) = gamma^(距目标步数)   ·   gamma 越大，价值能从目标向外传得越远"
    },
    "patterns": [
      [
        "^gamma = ([\\d.]+)  ·  value (\\d+) steps from goal = ([\\d.]+)  ·  moderate horizon$",
        "gamma = $1  ·  距目标 $2 步的价值 = $3  ·  中等视界"
      ],
      [
        "^gamma = ([\\d.]+)  ·  value (\\d+) steps from goal = ([\\d.]+)  ·  short-sighted: distant reward fades$",
        "gamma = $1  ·  距目标 $2 步的价值 = $3  ·  短视：远处奖励减弱"
      ],
      [
        "^gamma = ([\\d.]+)  ·  value (\\d+) steps from goal = ([\\d.]+)  ·  far-sighted: value carries across the chain$",
        "gamma = $1  ·  距目标 $2 步的价值 = $3  ·  长视界：价值传遍整条链"
      ]
    ],
    "preserve": []
  },
  "epsilon-greedy": {
    "text": {
      "fixed": "固定",
      "decaying": "衰减",
      "explore share of actions": "探索动作占比",
      "EPSILON-GREEDY": "ε-贪心",
      "With probability epsilon the agent explores a random action; otherwise it exploits its current best estimate. The bar shows the explore/exploit split and the curve is cumulative regret, the reward given up by not always picking the best arm. A fixed epsilon piles up regret forever; a decaying schedule explores early then exploits, so regret flattens.": "agent 以 epsilon 的概率随机探索动作，否则利用当前最佳估计。柱形展示探索与利用的比例；曲线是累积遗憾，即没有始终选择最优拉杆而放弃的奖励。固定 epsilon 会让遗憾持续累积；衰减调度则先探索、后利用，让遗憾曲线趋于平缓。",
      "decaying epsilon_t = epsilon_0 / (1 + t/60)  ·  regret levels off as exploration fades": "衰减 epsilon_t = epsilon_0 / (1 + t/60)  ·  探索减少时遗憾趋于平缓"
    },
    "patterns": [
      [
        "^start explore (\\d+)% / exploit (\\d+)%  ·  end explore (\\d+)%  ·  total regret ([\\d.]+)$",
        "开始时探索 $1% / 利用 $2%  ·  结束时探索 $3%  ·  总遗憾 $4"
      ],
      [
        "^fixed epsilon: regret grows linearly forever  ·  P\\(explore\\) = ([\\d.]+)$",
        "固定 epsilon：遗憾始终线性增长  ·  P(explore) = $1"
      ]
    ],
    "preserve": []
  },
  "qlearning-gridworld": {
    "text": {
      "Q-LEARNING GRIDWORLD": "Q-learning 网格世界",
      "GOAL": "目标",
      "PIT": "陷阱",
      "The agent learns to reach the goal and avoid the pit. Cell shading is the learned state value (blue good, amber bad) and the arrows are the greedy policy. Early on values sit near zero; with training, value propagates outward from the goal and the arrows line up into a path that routes around the pit.": "agent 学习到达目标并避开陷阱。格子颜色表示学到的状态价值（蓝色好、琥珀色坏），箭头表示贪心策略。早期各状态价值接近零；训练进行后，价值从目标向外传播，箭头逐渐连成避开陷阱的路径。"
    },
    "patterns": [
      [
        "^episode (\\d+) of (\\d+)  ·  policy converged$",
        "第 $1 / $2 回合  ·  策略已收敛"
      ],
      [
        "^episode (\\d+) of (\\d+)  ·  values still near zero$",
        "第 $1 / $2 回合  ·  各状态价值仍接近零"
      ],
      [
        "^episode (\\d+) of (\\d+)  ·  value spreading from the goal$",
        "第 $1 / $2 回合  ·  价值从目标向外传播"
      ]
    ],
    "preserve": [
      {
        "text": "Q(s,a) <- Q(s,a) + alpha [ r + gamma max_a' Q(s',a') - Q(s,a) ]   ·   gamma = 0.9",
        "reason": "Q-learning 的原始更新公式"
      }
    ]
  },
  "policy-gradient-landscape": {
    "text": {
      "POLICY GRADIENT": "策略梯度",
      "Policy gradient methods adjust the policy parameter theta in the direction that raises expected reward. Here the grey curve is the reward landscape and the dots are ascent steps climbing toward the peak. A small rate creeps up slowly; too large a rate overshoots; a local bump on the left can trap the climb if it starts there.": "策略梯度方法沿提高期望奖励的方向调整策略参数 theta。灰色曲线是奖励景观，圆点表示朝峰值攀升的更新步骤。学习率小会缓慢上升；学习率过大会越过峰值；从左侧开始时，还可能被局部小峰困住。",
      "theta <- theta + lr · grad_theta J(theta)   ·   ascent moves toward higher expected reward": "theta <- theta + lr · grad_theta J(theta)   ·   沿期望奖励上升的方向更新",
      "reached the peak": "已到达峰值"
    },
    "patterns": [
      [
        "^theta = ([\\d.-]+)  ·  reward ([\\d.]+) of ([\\d.]+) max  ·  climbing$",
        "theta = $1  ·  奖励 $2 / 最大值 $3  ·  正在攀升"
      ],
      [
        "^theta = ([\\d.-]+)  ·  reward ([\\d.]+) of ([\\d.]+) max  ·  large lr: may overshoot the peak$",
        "theta = $1  ·  奖励 $2 / 最大值 $3  ·  学习率大：可能越过峰值"
      ]
    ],
    "preserve": [
      {
        "text": "J(theta) = 0.50",
        "reason": "目标函数及其数值"
      },
      {
        "text": "J(theta) = 0.41",
        "reason": "目标函数 J(theta) 与计算值，完整数学表达式原样保留"
      },
      {
        "text": "J(theta) = 0.46",
        "reason": "目标函数 J(theta) 与计算值，完整数学表达式原样保留"
      },
      {
        "text": "J(theta) = 2.87",
        "reason": "目标函数 J(theta) 与计算值，完整数学表达式原样保留"
      },
      {
        "text": "J(theta) = 2.86",
        "reason": "目标函数 J(theta) 与计算值，完整数学表达式原样保留"
      }
    ]
  }
};
