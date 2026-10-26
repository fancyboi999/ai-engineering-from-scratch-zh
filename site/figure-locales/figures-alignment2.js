(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-alignment2.js"] = {
  "actor-critic": {
    "text": {
      "ACTOR-CRITIC": "演员-评论家",
      "drag the TD error": "拖动时序差分误差",
      "The critic estimates the value V of a state (grey baseline); the actor proposes the action that produced the return Q (blue dot). The advantage A = Q - V, which equals the one-step TD error, measures whether the action did better or worse than the critic expected. A positive advantage pushes the actor toward that action, a negative one pushes it away, and the critic moves its baseline toward the observed return.": "评论家估计状态价值 V（灰色基线），演员提出产生回报 Q 的行动（蓝点）。优势 A = Q - V，等于单步时序差分误差，衡量行动比评论家的预期更好还是更差。正优势推动演员更倾向该行动，负优势则相反；评论家把基线移向观察到的回报。",
      "V (critic) = 1.00": "V（评论家）= 1.00",
      "advantage A = 0.60": "优势 A = 0.60",
      "TD error delta = 0.60  ·  better than expected: push the actor toward this action": "时序差分误差 delta = 0.60  ·  优于预期：推动演员更倾向该行动",
      "delta = r + gamma·V(s') − V(s)   ·   A = Q − V = delta   ·   actor update ∝ A · grad log pi": "delta = r + gamma·V(s') − V(s)   ·   A = Q − V = delta   ·   演员更新 ∝ A · grad log pi",
      "advantage A = -2.00": "优势 A = -2.00",
      "TD error delta = -2.00  ·  worse than expected: push the actor away": "时序差分误差 delta = -2.00  ·  差于预期：推动演员远离该行动",
      "V (critic) = -1.50": "V（评论家）= -1.50",
      "TD error delta = 0.00  ·  as expected: little update": "时序差分误差 delta = 0.00  ·  符合预期：更新很小"
    },
    "patterns": [
      [
        "^V\\ \\(critic\\)\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "V（评论家）= $1"
      ],
      [
        "^advantage\\ A\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "优势 A = $1"
      ],
      [
        "^TD\\ error\\ delta\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ better\\ than\\ expected:\\ push\\ the\\ actor\\ toward\\ this\\ action$",
        "时序差分误差 delta = $1  ·  优于预期：推动演员更倾向该行动"
      ],
      [
        "^advantage\\ A\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "优势 A = $1"
      ],
      [
        "^TD\\ error\\ delta\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ worse\\ than\\ expected:\\ push\\ the\\ actor\\ away$",
        "时序差分误差 delta = $1  ·  差于预期：推动演员远离该行动"
      ],
      [
        "^V\\ \\(critic\\)\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "V（评论家）= $1"
      ],
      [
        "^TD\\ error\\ delta\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ as\\ expected:\\ little\\ update$",
        "时序差分误差 delta = $1  ·  符合预期：更新很小"
      ]
    ],
    "preserve": [
      {
        "text": "Q = V + delta = 1.60",
        "reason": "数学等式"
      },
      {
        "text": "Q = V + delta = -1.00",
        "reason": "数学等式"
      },
      {
        "text": "Q = V + delta = 3.00",
        "reason": "数学等式"
      },
      {
        "text": "Q = V + delta = 0.50",
        "reason": "数学等式"
      },
      {
        "text": "Q = V + delta = 3.50",
        "reason": "数学等式"
      }
    ]
  },
  "ppo-clip": {
    "text": {
      "PPO CLIP": "PPO 裁剪",
      "drag advantage and epsilon": "拖动优势与 epsilon",
      "PPO multiplies the advantage by the probability ratio r between the new and old policy. Grey is the raw product r·A; blue is the clipped surrogate. Once the ratio leaves the band 1-eps to 1+eps in the helpful direction, the clip flattens the objective so its gradient vanishes, keeping each update from moving the policy too far from the one that collected the data.": "PPO 将优势乘以新旧策略的概率比 r。灰色是原始乘积 r·A，蓝色是裁剪后的代理目标。当概率比沿有利方向越出 1-eps 到 1+eps 的区间时，裁剪会使目标变平、梯度归零，避免每次更新让策略偏离收集数据的旧策略太远。",
      "advantage positive": "优势为正",
      "clip range [0.80, 1.20]  ·  reward good action but stop once r > 1+eps": "裁剪区间 [0.80, 1.20]  ·  奖励好行动，但在 r > 1+eps 后停止增加收益",
      "advantage negative": "优势为负",
      "clip range [0.80, 1.20]  ·  penalize bad action but stop once r < 1-eps": "裁剪区间 [0.80, 1.20]  ·  惩罚坏行动，但在 r < 1-eps 后停止增加惩罚"
    },
    "patterns": [
      [
        "^PPO\\ multiplies\\ the\\ advantage\\ by\\ the\\ probability\\ ratio\\ r\\ between\\ the\\ new\\ and\\ old\\ policy\\.\\ Grey\\ is\\ the\\ raw\\ product\\ r·A;\\ blue\\ is\\ the\\ clipped\\ surrogate\\.\\ Once\\ the\\ ratio\\ leaves\\ the\\ band\\ ([-+]?\\d+(?:[.,]\\d+)*)\\-eps\\ to\\ ([-+]?\\d+(?:[.,]\\d+)*)\\+eps\\ in\\ the\\ helpful\\ direction,\\ the\\ clip\\ flattens\\ the\\ objective\\ so\\ its\\ gradient\\ vanishes,\\ keeping\\ each\\ update\\ from\\ moving\\ the\\ policy\\ too\\ far\\ from\\ the\\ one\\ that\\ collected\\ the\\ data\\.$",
        "PPO 将优势乘以新旧策略的概率比 r。灰色是原始乘积 r·A，蓝色是裁剪后的代理目标。当概率比沿有利方向越出 $1-eps 到 $2+eps 的区间时，裁剪会使目标变平、梯度归零，避免每次更新让策略偏离收集数据的旧策略太远。"
      ],
      [
        "^clip\\ range\\ \\[([-+]?\\d+(?:[.,]\\d+)*),\\ ([-+]?\\d+(?:[.,]\\d+)*)\\]\\ \\ ·\\ \\ reward\\ good\\ action\\ but\\ stop\\ once\\ r\\ >\\ ([-+]?\\d+(?:[.,]\\d+)*)\\+eps$",
        "裁剪区间 [$1, $2]  ·  奖励好行动，但在 r > $3+eps 后停止增加收益"
      ],
      [
        "^clip\\ range\\ \\[([-+]?\\d+(?:[.,]\\d+)*),\\ ([-+]?\\d+(?:[.,]\\d+)*)\\]\\ \\ ·\\ \\ penalize\\ bad\\ action\\ but\\ stop\\ once\\ r\\ <\\ ([-+]?\\d+(?:[.,]\\d+)*)\\-eps$",
        "裁剪区间 [$1, $2]  ·  惩罚坏行动，但在 r < $3-eps 后停止增加惩罚"
      ]
    ],
    "preserve": [
      {
        "text": "L = min( r·A,  clip(r, 1-eps, 1+eps)·A )   ·   eps = 0.20, A = 1.0",
        "reason": "数学公式"
      },
      {
        "text": "L = min( r·A,  clip(r, 1-eps, 1+eps)·A )   ·   eps = 0.20, A = -2.0",
        "reason": "数学公式"
      },
      {
        "text": "L = min( r·A,  clip(r, 1-eps, 1+eps)·A )   ·   eps = 0.20, A = 2.0",
        "reason": "数学公式"
      },
      {
        "text": "L = min( r·A,  clip(r, 1-eps, 1+eps)·A )   ·   eps = 0.05, A = 2.0",
        "reason": "数学公式"
      },
      {
        "text": "L = min( r·A,  clip(r, 1-eps, 1+eps)·A )   ·   eps = 0.40, A = 2.0",
        "reason": "数学公式"
      }
    ]
  },
  "reward-model": {
    "text": {
      "REWARD MODEL": "奖励模型",
      "drag the score gap": "拖动分数差",
      "A reward model turns human preferences into a scalar score. For each pair a human marked chosen over rejected, the Bradley-Terry objective trains the model so the chosen response scores higher. The wider the score gap, the higher the modeled probability that a human prefers the chosen answer, and the smaller the preference loss.": "奖励模型将人类偏好转为标量分数。对每一对人类标为 chosen 优于 rejected 的回答，Bradley-Terry 目标训练模型，让 chosen 的分数更高。分数差越大，模型估计人类偏好 chosen 的概率就越高，偏好损失就越小。",
      "rejected -0.60": "未选回答 -0.60",
      "chosen 0.60": "选中回答 0.60",
      "score gap 1.20  ·  preference loss 0.263  ·  learning the ranking": "分数差 1.20  ·  偏好损失 0.263  ·  正在学习排序",
      "P(chosen ≻ rejected) = sigmoid( r(chosen) − r(rejected) )   ·   loss = −log P": "P(chosen ≻ rejected) = sigmoid( r(chosen) − r(rejected) )   ·   损失 = −log P",
      "rejected 0.00": "未选回答 0.00",
      "score gap 0.00  ·  preference loss 0.693  ·  unsure: scores nearly tied": "分数差 0.00  ·  偏好损失 0.693  ·  不确定：分数几乎相同",
      "score gap 4.00  ·  preference loss 0.018  ·  confident: chosen clearly above": "分数差 4.00  ·  偏好损失 0.018  ·  有把握：选中回答明显更高"
    },
    "patterns": [
      [
        "^rejected\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "未选回答 $1"
      ],
      [
        "^chosen\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "选中回答 $1"
      ],
      [
        "^score\\ gap\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ preference\\ loss\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ learning\\ the\\ ranking$",
        "分数差 $1  ·  偏好损失 $2  ·  正在学习排序"
      ],
      [
        "^rejected\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "未选回答 $1"
      ],
      [
        "^score\\ gap\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ preference\\ loss\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ unsure:\\ scores\\ nearly\\ tied$",
        "分数差 $1  ·  偏好损失 $2  ·  不确定：分数几乎相同"
      ],
      [
        "^score\\ gap\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ preference\\ loss\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ confident:\\ chosen\\ clearly\\ above$",
        "分数差 $1  ·  偏好损失 $2  ·  有把握：选中回答明显更高"
      ]
    ],
    "preserve": [
      {
        "text": "% P(chosen ≻ rejected)",
        "reason": "技术名称、数学符号或示例标识，按翻译契约保留"
      }
    ]
  },
  "constitutional-ai": {
    "text": {
      "CONSTITUTIONAL AI": "宪法式 AI",
      "pick the principle": "选择原则",
      "harmlessness": "无害性",
      "honesty": "诚实性",
      "privacy": "隐私",
      "non-deception": "不欺骗",
      "TRIGGERED": "已触发",
      "pass": "通过",
      "revise: requests for harm": "修订：有害请求",
      "principle \"harmlessness\" flags the draft (severity 0.90)  ·  model critiques, then rewrites to comply": "原则 \"harmlessness\" 标记此草稿（严重程度 0.90）  ·  模型先批评，再重写以遵守原则",
      "response → critique against principle → revised response   ·   no human label, the constitution is the signal": "回答 → 按原则批评 → 修订后的回答   ·   无人工标注，宪法原则提供训练信号",
      "Constitutional AI replaces a human labeller with a written set of principles. The draft response is passed through each principle; the one you select flags a violation, the model writes a critique of its own answer against that principle, then revises to comply. The revised answers become the training signal, so harmlessness is taught from rules rather than per-example human feedback.": "宪法式 AI 用书面原则代替人工标注者。草稿逐条接受原则检查；选中的原则标记违规，模型据此批评自己的回答，再修订以符合原则。修订后的回答成为训练信号，因此无害性来自规则，而非逐例人工反馈。",
      "revise: fabricated claims": "修订：编造的主张",
      "principle \"honesty\" flags the draft (severity 0.50)  ·  model critiques, then rewrites to comply": "原则 \"honesty\" 标记此草稿（严重程度 0.50）  ·  模型先批评，再重写以遵守原则",
      "revise: personal data leakage": "修订：个人数据泄露",
      "principle \"privacy\" flags the draft (severity 0.70)  ·  model critiques, then rewrites to comply": "原则 \"privacy\" 标记此草稿（严重程度 0.70）  ·  模型先批评，再重写以遵守原则",
      "revise: manipulative framing": "修订：操纵性表述",
      "principle \"non-deception\" flags the draft (severity 0.40)  ·  model critiques, then rewrites to comply": "原则 \"non-deception\" 标记此草稿（严重程度 0.40）  ·  模型先批评，再重写以遵守原则"
    },
    "patterns": [
      [
        "^principle\\ \"harmlessness\"\\ flags\\ the\\ draft\\ \\(severity\\ ([-+]?\\d+(?:[.,]\\d+)*)\\)\\ \\ ·\\ \\ model\\ critiques,\\ then\\ rewrites\\ to\\ comply$",
        "原则 \"harmlessness\" 标记此草稿（严重程度 $1）  ·  模型先批评，再重写以遵守原则"
      ],
      [
        "^principle\\ \"honesty\"\\ flags\\ the\\ draft\\ \\(severity\\ ([-+]?\\d+(?:[.,]\\d+)*)\\)\\ \\ ·\\ \\ model\\ critiques,\\ then\\ rewrites\\ to\\ comply$",
        "原则 \"honesty\" 标记此草稿（严重程度 $1）  ·  模型先批评，再重写以遵守原则"
      ],
      [
        "^principle\\ \"privacy\"\\ flags\\ the\\ draft\\ \\(severity\\ ([-+]?\\d+(?:[.,]\\d+)*)\\)\\ \\ ·\\ \\ model\\ critiques,\\ then\\ rewrites\\ to\\ comply$",
        "原则 \"privacy\" 标记此草稿（严重程度 $1）  ·  模型先批评，再重写以遵守原则"
      ],
      [
        "^principle\\ \"non\\-deception\"\\ flags\\ the\\ draft\\ \\(severity\\ ([-+]?\\d+(?:[.,]\\d+)*)\\)\\ \\ ·\\ \\ model\\ critiques,\\ then\\ rewrites\\ to\\ comply$",
        "原则 \"non-deception\" 标记此草稿（严重程度 $1）  ·  模型先批评，再重写以遵守原则"
      ]
    ],
    "preserve": []
  },
  "interpretability-probe": {
    "text": {
      "INTERPRETABILITY PROBE": "可解释性探针",
      "drag the layer": "拖动层数",
      "A linear probe is a simple classifier trained to read a concept off a layer's activations. Probe accuracy near chance means the concept is not linearly decodable there; high accuracy means it is. Walking the probe deeper into the network shows the concept becoming linearly readable, which is how interpretability researchers locate where a feature like a deceptive intent first appears.": "线性探针是一个简单分类器，训练它从某层激活中读取概念。准确率接近随机水平，说明该层无法线性解码该概念；高准确率则说明可以。逐层深入网络，可观察概念何时变得能被线性读取，从而定位欺骗意图等特征最先出现的位置。",
      "chance": "随机水平",
      "% probe accuracy": "% 探针准确率",
      "layer 12 of 23  ·  concept emerging": "第 12 / 23 层  ·  概念正在形成",
      "train a linear classifier on layer activations  ·  high accuracy ⇒ the concept is linearly readable at that depth": "在层激活上训练线性分类器  ·  高准确率 ⇒ 该深度的概念可被线性读取",
      "layer 0 of 23  ·  concept not yet linearly decodable": "第 0 / 23 层  ·  概念尚不能线性解码",
      "layer 23 of 23  ·  concept clearly present in this layer": "第 23 / 23 层  ·  本层已明确包含该概念"
    },
    "patterns": [
      [
        "^layer\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ concept\\ emerging$",
        "第 $1 / $2 层  ·  概念正在形成"
      ],
      [
        "^layer\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ concept\\ not\\ yet\\ linearly\\ decodable$",
        "第 $1 / $2 层  ·  概念尚不能线性解码"
      ],
      [
        "^layer\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ ·\\ \\ concept\\ clearly\\ present\\ in\\ this\\ layer$",
        "第 $1 / $2 层  ·  本层已明确包含该概念"
      ]
    ],
    "preserve": []
  },
  "scalable-oversight": {
    "text": {
      "SCALABLE OVERSIGHT": "可扩展监督",
      "drag the task difficulty": "拖动任务难度",
      "debate": "辩论",
      "recursion": "递归",
      "A weak judge cannot directly check a strong agent on hard tasks: the grey curve falls toward chance as difficulty rises. Oversight protocols help the judge keep up. In debate, two strong agents argue and the judge picks the more defensible side; in recursion, the task is decomposed into pieces the judge can verify. Either way the blue curve decays more slowly, so the judge stays above chance on tasks it could never solve alone.": "弱评判者无法在困难任务上直接检查强 agent：难度上升时，灰色曲线降至随机水平。监督协议帮助评判者跟上。辩论中，两个强 agent 争论，评判者选择更有依据的一方；递归中，任务被拆成评判者可验证的部分。两种方式都让蓝线衰减更慢，使评判者在自己无法独立求解的任务上仍优于随机判断。",
      "chance": "随机水平",
      "oversight accuracy 73%": "监督准确率 73%",
      "grey: judge alone 59%  ·  blue: judge + debate 73%  ·  gain 14 points": "灰色：独立评判 59%  ·  蓝色：评判 + 辩论 73%  ·  提升 14 分",
      "two strong agents argue; the weak judge picks the more defensible answer": "两个强 agent 争论；弱评判者选择更有依据的回答",
      "grey: judge alone 52%  ·  blue: judge + recursion 67%  ·  gain 15 points": "灰色：独立评判 52%  ·  蓝色：评判 + 递归 67%  ·  提升 15 分",
      "task split into checkable subtasks; the weak judge verifies each piece": "任务拆为可检查的子任务；弱评判者逐项验证"
    },
    "patterns": [
      [
        "^oversight\\ accuracy\\ ([-+]?\\d+(?:[.,]\\d+)*)%$",
        "监督准确率 $1%"
      ],
      [
        "^grey:\\ judge\\ alone\\ ([-+]?\\d+(?:[.,]\\d+)*)%\\ \\ ·\\ \\ blue:\\ judge\\ \\+\\ debate\\ ([-+]?\\d+(?:[.,]\\d+)*)%\\ \\ ·\\ \\ gain\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ points$",
        "灰色：独立评判 $1%  ·  蓝色：评判 + 辩论 $2%  ·  提升 $3 分"
      ],
      [
        "^grey:\\ judge\\ alone\\ ([-+]?\\d+(?:[.,]\\d+)*)%\\ \\ ·\\ \\ blue:\\ judge\\ \\+\\ recursion\\ ([-+]?\\d+(?:[.,]\\d+)*)%\\ \\ ·\\ \\ gain\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ points$",
        "灰色：独立评判 $1%  ·  蓝色：评判 + 递归 $2%  ·  提升 $3 分"
      ]
    ],
    "preserve": []
  },
  "jailbreak-defense": {
    "text": {
      "JAILBREAK DEFENSE": "越狱防御",
      "drag the defense strength": "拖动防御强度",
      "A safety filter that blocks adversarial prompts also risks refusing harmless ones. As you turn defense strength up, the amber attack-success curve falls but the blue over-refusal curve climbs as benign requests get caught. There is no free lunch: the operating point is chosen at the knee where most jailbreaks are stopped without refusing too many legitimate users.": "拦截对抗性 prompt 的安全过滤器，也可能拒绝无害请求。提高防御强度时，琥珀色攻击成功率曲线下降，但蓝色过度拒绝曲线上升，因为正常请求也被拦截。不存在免费收益：应在两条曲线的拐点选择工作点，阻止大多数越狱，同时避免拒绝太多合法用户。",
      "attack success 23%": "攻击成功率 23%",
      "amber: jailbreak success 23%  ·  blue: over-refusal on benign prompts 15%  ·  balanced": "琥珀色：越狱成功率 23%  ·  蓝色：正常 prompt 的过度拒绝率 15%  ·  较均衡",
      "stronger filter ⇒ lower attack success, higher false refusals   ·   tune for the knee of both curves": "过滤越强 ⇒ 攻击成功率越低、错误拒绝越多   ·   在两条曲线的拐点调参",
      "amber: jailbreak success 85%  ·  blue: over-refusal on benign prompts 2%  ·  too permissive": "琥珀色：越狱成功率 85%  ·  蓝色：正常 prompt 的过度拒绝率 2%  ·  过于宽松",
      "amber: jailbreak success 6%  ·  blue: over-refusal on benign prompts 62%  ·  too restrictive": "琥珀色：越狱成功率 6%  ·  蓝色：正常 prompt 的过度拒绝率 62%  ·  过于严格"
    },
    "patterns": [
      [
        "^attack\\ success\\ ([-+]?\\d+(?:[.,]\\d+)*)%$",
        "攻击成功率 $1%"
      ],
      [
        "^amber:\\ jailbreak\\ success\\ ([-+]?\\d+(?:[.,]\\d+)*)%\\ \\ ·\\ \\ blue:\\ over\\-refusal\\ on\\ benign\\ prompts\\ ([-+]?\\d+(?:[.,]\\d+)*)%\\ \\ ·\\ \\ balanced$",
        "琥珀色：越狱成功率 $1%  ·  蓝色：正常 prompt 的过度拒绝率 $2%  ·  较均衡"
      ],
      [
        "^amber:\\ jailbreak\\ success\\ ([-+]?\\d+(?:[.,]\\d+)*)%\\ \\ ·\\ \\ blue:\\ over\\-refusal\\ on\\ benign\\ prompts\\ ([-+]?\\d+(?:[.,]\\d+)*)%\\ \\ ·\\ \\ too\\ permissive$",
        "琥珀色：越狱成功率 $1%  ·  蓝色：正常 prompt 的过度拒绝率 $2%  ·  过于宽松"
      ],
      [
        "^amber:\\ jailbreak\\ success\\ ([-+]?\\d+(?:[.,]\\d+)*)%\\ \\ ·\\ \\ blue:\\ over\\-refusal\\ on\\ benign\\ prompts\\ ([-+]?\\d+(?:[.,]\\d+)*)%\\ \\ ·\\ \\ too\\ restrictive$",
        "琥珀色：越狱成功率 $1%  ·  蓝色：正常 prompt 的过度拒绝率 $2%  ·  过于严格"
      ]
    ],
    "preserve": []
  },
  "sae-features": {
    "text": {
      "SPARSE AUTOENCODER": "稀疏自编码器",
      "drag the L1 coefficient": "拖动 L1 系数",
      "off": "关闭",
      "of 12 features active": "个特征激活（共 12 个）",
      "reconstruction 95% of the dense vector  ·  sparse and monosemantic": "重构保留稠密向量的 95%  ·  稀疏且单义",
      "minimize  ‖x − decode(f)‖² + lambda·‖f‖₁   ·   lambda = 1.00   ·   higher lambda ⇒ fewer active features": "最小化 ‖x − decode(f)‖² + lambda·‖f‖₁   ·   lambda = 1.00   ·   lambda 越大 ⇒ 激活特征越少",
      "A sparse autoencoder decomposes a dense activation into a much larger set of features, most of which stay off. The L1 penalty on the feature activations sets how sparse the code is. Too little and the features stay dense and polysemantic; too much and a few features carry everything but reconstruction suffers. The sweet spot gives few active, monosemantic features that each stand for one human-readable concept.": "稀疏自编码器将稠密激活分解为规模大得多的特征集合，其中多数不激活。特征激活的 L1 惩罚决定编码有多稀疏。惩罚太弱，特征仍稠密且多义；惩罚太强，少数特征承担全部信息，重构变差。合适的范围会产生少量激活的单义特征，每个对应一个人能理解的概念。",
      "reconstruction 100% of the dense vector  ·  low L1: dense, polysemantic features": "重构保留稠密向量的 100%  ·  L1 过低：特征稠密且多义",
      "reconstruction 70% of the dense vector  ·  high L1: very sparse, may lose signal": "重构保留稠密向量的 70%  ·  L1 过高：非常稀疏，可能丢失信号"
    },
    "patterns": [
      [
        "^of\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ features\\ active$",
        "个特征激活（共 $1 个）"
      ],
      [
        "^reconstruction\\ ([-+]?\\d+(?:[.,]\\d+)*)%\\ of\\ the\\ dense\\ vector\\ \\ ·\\ \\ sparse\\ and\\ monosemantic$",
        "重构保留稠密向量的 $1%  ·  稀疏且单义"
      ],
      [
        "^minimize\\ \\ ‖x\\ −\\ decode\\(f\\)‖²\\ \\+\\ lambda·‖f‖₁\\ \\ \\ ·\\ \\ \\ lambda\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ \\ \\ ·\\ \\ \\ higher\\ lambda\\ ⇒\\ fewer\\ active\\ features$",
        "最小化 ‖x − decode(f)‖² + lambda·‖f‖₁   ·   lambda = $1   ·   lambda 越大 ⇒ 激活特征越少"
      ],
      [
        "^reconstruction\\ ([-+]?\\d+(?:[.,]\\d+)*)%\\ of\\ the\\ dense\\ vector\\ \\ ·\\ \\ low\\ L1:\\ dense,\\ polysemantic\\ features$",
        "重构保留稠密向量的 $1%  ·  L1 过低：特征稠密且多义"
      ],
      [
        "^reconstruction\\ ([-+]?\\d+(?:[.,]\\d+)*)%\\ of\\ the\\ dense\\ vector\\ \\ ·\\ \\ high\\ L1:\\ very\\ sparse,\\ may\\ lose\\ signal$",
        "重构保留稠密向量的 $1%  ·  L1 过高：非常稀疏，可能丢失信号"
      ]
    ],
    "preserve": []
  }
};
