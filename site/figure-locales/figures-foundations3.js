(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-foundations3.js"] = {
  "f3-bootstrap-resample": {
    "text": {
      "BOOTSTRAP RESAMPLING": "自助重采样",
      "resample, recompute, repeat": "重采样、重新计算、重复",
      "The bootstrap treats your sample as a stand-in for the population. Draw n points with replacement, compute the statistic, and repeat thousands of times: the resulting distribution of bootstrap means shows how much the statistic wobbles from sampling noise alone. The middle 95 percent of it is a confidence interval that needs no normality assumption.": "自助法把样本当作总体的替身。有放回地抽取 n 个点，计算统计量，再重复数千次。得到的自助均值分布显示，仅由抽样噪声引起的统计量波动有多大。分布中间的 95% 构成置信区间，无需正态性假设。",
      "observed data (n = 10)": "观测数据（n = 10）",
      "resample with replacement": "有放回重采样",
      "distribution of bootstrap means": "自助均值分布",
      "95% confidence interval": "95% 置信区间"
    },
    "patterns": [],
    "preserve": []
  },
  "f3-learning-boundary": {
    "text": {
      "LEARNING FROM DATA": "从数据中学习",
      "no rules written by hand": "无需手写规则",
      "Nobody wrote an if-statement here. The classifier summarizes each labelled cluster by its centroid, and the decision boundary falls out of the geometry: the perpendicular bisector between the two centroids. Feed it different data and a different boundary emerges. That inversion, rules derived from examples rather than typed by hand, is what makes it machine learning.": "这里没有人手写 if 语句。分类器用质心概括每个带标签簇，而决策边界自然来自几何关系：两个质心之间的垂直平分线。换一组数据，就会出现不同的边界。这种反转——从样本中推导规则，而不是手工输入规则——正是机器学习的特点。",
      "class A centroid": "类别 A 的质心",
      "class B centroid": "类别 B 的质心",
      "learned boundary: closest centroid wins": "学得的边界：距离最近的质心获胜"
    },
    "patterns": [],
    "preserve": []
  },
  "f3-ensemble-average": {
    "text": {
      "ENSEMBLE AVERAGING": "集成平均",
      "many wrongs make a right": "多种误差相互抵消",
      "Each grey curve is one weak learner: high variance, wrong in its own way. Because their errors are (partly) independent, averaging them cancels the noise while keeping the shared signal, and the blue ensemble tracks the true pattern more closely than any member. Bagging builds exactly this, and majority voting is the same cancellation applied to class labels.": "每条灰色曲线都是一个弱学习器：方差高，并且各自以不同方式出错。由于它们的误差部分独立，取平均能消除噪声，同时保留共同信号。因此蓝色集成曲线比任何单个成员都更接近真实模式。Bagging 正是这样构建的；多数投票则把同样的抵消作用应用于类别标签。",
      "5 weak learners, each wrong differently": "5 个弱学习器，各自以不同方式出错",
      "their average": "它们的平均值"
    },
    "patterns": [],
    "preserve": []
  },
  "f3-pipeline-flow": {
    "text": {
      "ML PIPELINE": "机器学习流水线",
      "one object, ordered steps": "一个对象，顺序执行各步骤",
      "A pipeline chains every transformation and the model into one object: the sample enters raw and each stage reshapes it before handing it on. All statistics (medians, means, category maps) are fitted once, on training data only, then frozen. Serving runs the identical chain, which is what closes off data leakage and train-serve skew.": "流水线将每次变换和模型连成一个对象：样本以原始形式进入，各阶段先重塑它，再交给下一阶段。所有统计量（中位数、均值、类别映射）只在训练数据上拟合一次，然后冻结。服务端执行完全相同的链路，由此阻断数据泄漏和训练与服务偏差。",
      "impute": "填补缺失值",
      "median": "中位数",
      "scale": "缩放",
      "mean, std": "均值、标准差",
      "encode": "编码",
      "one-hot": "独热编码",
      "model": "模型",
      "predict": "预测",
      "statistics fitted on train data only": "仅在训练数据上拟合统计量",
      "inference reuses the frozen fit, so train and serve match": "推理复用冻结的拟合结果，使训练与服务保持一致"
    },
    "patterns": [],
    "preserve": []
  },
  "f3-series-decompose": {
    "text": {
      "TIME SERIES DECOMPOSITION": "时间序列分解",
      "peel the layers apart": "逐层分开",
      "The observed series is a sum of three simpler signals: a slow trend, a repeating seasonal cycle, and what is left over, the residual. Decomposition separates them so each can be handled on its own terms: detrend and deseasonalize to reach stationarity, then model the residual. The sweep line reminds you the parts line up point-for-point in time.": "观测序列是三个简单信号之和：缓慢变化的趋势、重复的季节周期，以及剩余的残差。分解将它们分开，以便各自处理：去除趋势和季节性以达到平稳，再对残差建模。扫过的竖线提醒你，各部分在时间上逐点对齐。",
      "observed series": "观测序列",
      "trend": "趋势",
      "seasonality": "季节性",
      "residual": "残差"
    },
    "patterns": [],
    "preserve": []
  },
  "f3-anomaly-fence": {
    "text": {
      "ANOMALY DETECTION": "异常检测",
      "model normal, flag the rest": "学习正常，标记其余",
      "There are too few labelled anomalies to learn what abnormal looks like, so the detector learns the shape of normal instead: the dense region where ordinary points live. Anything that lands outside that fence is flagged, no matter what kind of anomaly it is. That is why the method needs no anomaly labels and still catches failure modes it has never seen.": "带标签的异常太少，难以学出异常的样子，因此检测器转而学习正常数据的形状：普通点所在的密集区域。任何落在围栏外的点都会被标记，不论它属于哪一种异常。因此，这种方法无需异常标签，也能发现从未见过的失效模式。",
      "the model learns this region: normal": "模型学习的区域：正常",
      "anomaly:": "异常：",
      "outside normal": "正常区域之外"
    },
    "patterns": [],
    "preserve": []
  },
  "f3-feature-prune": {
    "text": {
      "FEATURE SELECTION": "特征选择",
      "keep signal, drop noise": "保留信号，丢弃噪声",
      "Score every feature by how much it tells you about the target, mutual information here, and a threshold splits signal from noise. The low bars fade out: dropping them shrinks the feature space, so distances stay meaningful, the model needs less data, and overfitting to noise columns disappears. Filter, wrapper, and embedded methods differ only in how the scores are computed.": "按每个特征能提供多少目标信息来评分，此处使用互信息，再通过阈值区分信号和噪声。低条柱逐渐消失：删除它们会缩小特征空间，使距离仍然有意义、模型需要的数据更少，也不再对噪声列过拟合。过滤法、包装法和嵌入法的区别，只在于评分如何计算。",
      "selection threshold": "选择阈值",
      "feature importance (e.g. mutual information with the target)": "特征重要性（例如与目标的互信息）",
      "10 features in, 4 carry signal, the rest is noise": "输入 10 个特征，其中 4 个携带信号，其余是噪声"
    },
    "patterns": [],
    "preserve": []
  },
  "f3-dqn-stability": {
    "text": {
      "DQN STABILITY TRICKS": "DQN 稳定训练技巧",
      "replay + frozen target": "经验回放 + 冻结目标",
      "Two of the three tricks that made deep Q-learning converge. Transitions stream into a replay buffer, and training samples them at random, so consecutive updates stop being correlated. Meanwhile the amber target network stays frozen while the online network trains, and only snaps to a fresh copy every ten thousand or so steps, keeping the Bellman target from chasing itself.": "这是让深度 Q-learning 收敛的三个技巧中的两个。状态转移流入回放缓冲区，训练从中随机抽样，使连续更新不再相关。同时，琥珀色目标网络在在线网络训练时保持冻结，大约每一万步才复制一次新权重，避免 Bellman 目标追逐自身。",
      "env": "环境",
      "replay buffer": "回放缓冲区",
      "shuffled past": "打乱历史样本",
      "online net": "在线网络",
      "trains every step": "每步训练",
      "target net": "目标网络",
      "frozen copy": "冻结副本",
      "random minibatch: decorrelated": "随机小批次：去相关",
      "copy": "复制",
      "target held fixed ~10k steps, then synced: a stable bootstrap target": "目标固定约 10k 步，再同步：形成稳定的自举目标"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "s, a, r, s'",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  },
  "f3-marl-orbit": {
    "text": {
      "MULTI-AGENT DYNAMICS": "多 agent 动态",
      "cycle vs converge": "循环与收敛",
      "Left: two independent learners in the same world. Each treats the other as part of the environment, so every update by one invalidates the other's value estimates, and the pair orbits forever, the non-stationarity trap. Right: give training a centralized critic that sees the joint state and actions, and the same dynamics spiral inward to a stable joint policy.": "左侧：同一世界中的两个独立学习器。每个都把对方视为环境的一部分，因此一方每次更新都会使另一方的价值估计失效，两者永远绕圈，这就是非平稳性陷阱。右侧：训练时加入能看到联合状态与动作的中心化评判器，同样的动态就会向内螺旋，收敛到稳定的联合策略。",
      "independent learning: each chases": "独立学习：双方不断追逐",
      "the other, policies never settle": "对方，策略始终无法稳定",
      "centralized critic: the joint view": "中心化评判器：联合视角",
      "damps the chase into an equilibrium": "让追逐逐渐减弱，趋向均衡"
    },
    "patterns": [],
    "preserve": []
  },
  "f3-reality-gap": {
    "text": {
      "DOMAIN RANDOMIZATION": "域随机化",
      "widen the envelope": "拓宽训练范围",
      "A policy trained in one fixed simulator sits some distance from the real system on every physics axis, and that distance is the reality gap. Domain randomization widens the training envelope: every episode samples different masses, frictions, delays, and lighting. Once the envelope spans the real robot's parameters, reality is just another sample the policy already handles.": "在固定模拟器中训练的策略，在每个物理参数轴上都与真实系统存在距离，这就是现实差距。域随机化拓宽训练范围：每个回合抽取不同的质量、摩擦、延迟和光照。一旦训练范围涵盖真实机器人的参数，现实就只是策略早已能够处理的另一个样本。",
      "physics parameter (friction, mass, latency, lighting...)": "物理参数（摩擦、质量、延迟、光照等）",
      "sim training envelope": "模拟训练范围",
      "the real robot": "真实机器人",
      "gap": "差距",
      "randomize the sim until reality is just one more variant": "对模拟器随机化，直到现实也只是其中一种变体"
    },
    "patterns": [],
    "preserve": []
  },
  "f3-selfplay-ladder": {
    "text": {
      "SELF-PLAY LADDER": "自我博弈阶梯",
      "the AlphaZero loop": "AlphaZero 循环",
      "One loop drives AlphaZero, MuZero, and GRPO alike: the current policy plays itself, search (or verification) turns those games into a better move distribution, and the network is trained toward what search found. Every lap around the triangle produces a slightly stronger opponent for the next lap, so playing strength climbs the staircase without any human data.": "AlphaZero、MuZero 和 GRPO 都由同一类循环驱动：当前策略与自己对弈，搜索（或验证）将这些对局转化为更好的动作分布，网络再朝搜索得到的结果训练。每绕三角形一圈，就为下一轮产生稍强的对手，因此无需任何人类数据，棋力也能沿阶梯上升。",
      "self-play": "自我博弈",
      "search": "搜索",
      "update": "更新",
      "play yourself, let search improve the move,": "与自己对弈，让搜索改进落子，",
      "train the net on what search found": "用搜索结果训练网络",
      "playing strength, one step per loop": "每轮循环，棋力上升一级"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "Elo",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  }
};
