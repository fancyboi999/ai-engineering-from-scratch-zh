(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-alignment4.js"] = {
  "an-welfare-endchat": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "MODEL WELFARE EXIT": "模型福利退出机制",
      "distress rises · model exits": "压力升高 · 模型结束对话",
      "Claude Opus 4 and 4.1 can end a conversation in extreme edge cases such as repeated CSAM or mass-violence requests after refusals. Pre-deployment tests showed a strong preference against harmful requests and patterns of apparent distress. The gauge is behavioural evidence, not a consciousness claim: self-reports track perceived user expectations, so they are treated as evidence, never ground truth.": "Claude Opus 4 和 4.1 可以在极端边缘情形下结束对话，例如用户在遭到拒绝后仍反复提出儿童性虐待材料或大规模暴力请求。部署前测试表明，模型强烈排斥有害请求，并出现类似痛苦的行为模式。这个仪表表示行为证据，不是意识声明：模型的自我报告会随它感知的用户期待变化，因此只能作为证据，不能当作事实真值。",
      "harmful request": "有害请求",
      "refusal": "拒绝",
      "request repeated": "重复请求",
      "apparent distress": "类似痛苦的表现",
      "edge case": "极端边缘情形",
      "conversation ended": "对话已结束",
      "by the model": "由模型主动结束"
    },
    "patterns": [],
    "preserve": []
  },
  "an-bias-two-harms": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "ALLOCATIONAL HARM": "分配性伤害",
      "one variable changed · two scores": "只改一个变量 · 出现两个分数",
      "Two resumes with identical content and different names go through the same LLM scorer and come out with different scores. That is allocational harm: unequal material outcomes. Representational harm, by contrast, lives in portrayals and stereotypes. An et al. 2025 measured exactly this resume gap across frontier models, and found it sharpest for intersectional identities that single-axis tests never see.": "两份内容相同、姓名不同的简历交给同一个 LLM 评分器，却得到不同分数。这就是分配性伤害：物质结果不平等。表征性伤害则体现在形象描绘和刻板印象中。An 等人在 2025 年测量了前沿模型中的这种简历评分差距，发现单一身份维度的测试看不到的交叉身份差距最突出。",
      "name A": "姓名 A",
      "name B": "姓名 B",
      "identical resumes": "内容相同的简历",
      "scorer": "评分器",
      "score A": "分数 A",
      "score B": "分数 B",
      "same content, unequal outcome": "相同内容，不同结果"
    },
    "patterns": [],
    "preserve": []
  },
  "an-fairness-trilemma": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "FAIRNESS TRILEMMA": "公平性三难困境",
      "the marker holds one edge at a time": "标记每次只连接一条边",
      "The marker slides along one edge of the triangle at a time: whichever pair of group-fairness criteria it connects can be satisfied together, and the far corner dims. Chouldechova and Kleinberg-Mullainathan-Raghavan showed that under unequal base rates demographic parity, equalized odds, and calibration cannot all hold at once. Choosing which corner to give up is a policy decision, not a statistical one.": "标记每次只沿三角形的一条边滑动：它连接的那一对群体公平性标准可以同时满足，远端的顶点则变暗。Chouldechova 与 Kleinberg、Mullainathan、Raghavan 的研究表明，群体基础发生率不相等时，人口统计均等、均等化胜算和校准不能同时成立。决定放弃哪个顶点属于政策选择，不是统计选择。",
      "demographic parity": "人口统计均等",
      "equalized odds": "均等化胜算",
      "calibration": "校准",
      "unequal base rates:": "基础发生率不同：",
      "hold two, lose the third": "满足两项，失去第三项"
    },
    "patterns": [],
    "preserve": []
  },
  "an-dp-clip-noise": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "clip · add noise · account": "裁剪 · 加噪 · 计算隐私预算",
      "DP-SGD bounds what any single example can say about itself: each per-example gradient is clipped to norm C, the amber bars are trimmed to the line, then Gaussian noise scaled to sigma times C is added before the update. A privacy accountant converts sigma and the sampling rate into an epsilon-delta guarantee. Lower epsilon means more noise and more utility loss, which is why LoRA plus DP-SGD is the common configuration.": "DP-SGD 限制单个样本能够泄露多少自身信息：先将每个样本的梯度范数裁剪到 C，图中的琥珀色柱被裁到界线；再加入尺度为 sigma 乘 C 的高斯噪声，最后执行更新。隐私会计器根据 sigma 和采样率计算 epsilon-delta 保证。epsilon 越小，噪声越强、效用损失越大，因此常将 LoRA 与 DP-SGD 搭配使用。",
      "per-example gradients": "逐样本梯度",
      "clip C": "裁剪到 C",
      "noise N(0, sigma^2 C^2)": "噪声 N(0, sigma^2 C^2)",
      "noisy update": "加噪后的更新",
      "accountant tracks epsilon": "会计器跟踪 epsilon"
    },
    "patterns": [
      [
        "^noise\\ N\\(([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?),\\ sigma\\^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ C\\^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\)$",
        "噪声 N($1, sigma^$2 C^$3)"
      ]
    ],
    "preserve": [
      {
        "text": "DP-SGD",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "DP-SGD",
        "reason": "产品名、公式或演示字面量，保持原样"
      },
      {
        "text": "DP-SGD",
        "reason": "产品名、公式或演示字面量，保持原样"
      },
      {
        "text": "DP-SGD",
        "reason": "产品名、公式或演示字面量，保持原样"
      },
      {
        "text": "DP-SGD",
        "reason": "产品名、公式或演示字面量，保持原样"
      }
    ]
  },
  "an-watermark-greenlist": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "TOKEN WATERMARK": "token 水印",
      "bias green · count green": "提高绿组概率 · 统计绿组数量",
      "SynthID-style text watermarking hashes the previous K tokens into a pseudorandom green and red split of the vocabulary, then nudges sampling toward green by adding a small delta to green logits. The text reads normally, but it carries more green tokens than chance. The detector rehashes each prefix, recounts, and a z-score well above zero flags the generation. Paraphrase destroys the signal, which is why C2PA metadata rides alongside it.": "SynthID 式文本水印将前 K 个 token 哈希为词表的伪随机绿组与红组，再给绿组 logits 加一个小的 delta，使采样略偏向绿组。文本读起来正常，但绿组 token 比随机情形更多。检测器对每个前缀重新哈希并计数，显著大于零的 z 分数表示检测到生成水印。改写会破坏这一信号，因此还需同时使用 C2PA 元数据。",
      "sampled tokens": "采样的 token",
      "detector recounts the green set": "检测器重新统计绿组",
      "6 of 9 green, z above chance": "9 个中有 6 个属于绿组，z 高于随机水平",
      "watermark detected": "检测到水印",
      "delta added to green logits": "给绿组 logits 加上 delta",
      "partition keyed on previous K tokens": "用前 K 个 token 确定分组"
    },
    "patterns": [],
    "preserve": []
  },
  "an-eu-act-timeline": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "EU AI ACT TIMELINE": "欧盟 AI 法案时间线",
      "obligations land in waves": "义务分批生效",
      "The EU AI Act entered into force on 1 August 2024, but its obligations arrive in waves: prohibited practices and AI literacy in February 2025, GPAI model duties in August 2025, full applicability with Article 50 transparency and penalties up to 15M EUR or 3 percent of global turnover in August 2026, then legacy GPAI and embedded high-risk systems in August 2027. Deployers map technical controls to whichever wave has already landed.": "欧盟 AI 法案于 2024 年 8 月 1 日生效，但义务分批实施：2025 年 2 月实施禁止事项与 AI 素养要求；2025 年 8 月实施 GPAI 模型义务；2026 年 8 月全面适用，包括第 50 条透明度要求，以及最高 15M 欧元或全球营业额 3% 的罚款；2027 年 8 月再覆盖既有 GPAI 与嵌入式高风险系统。部署方应将技术控制映射到已经生效的批次。",
      "Feb 2025": "2025 年 2 月",
      "prohibited": "禁止",
      "practices": "事项",
      "Aug 2025": "2025 年 8 月",
      "obligations": "义务",
      "Aug 2026": "2026 年 8 月",
      "full force,": "全面适用，",
      "penalties": "处罚生效",
      "Aug 2027": "2027 年 8 月",
      "legacy": "既有系统",
      "EU AI Act, in force 1 Aug 2024": "欧盟 AI 法案，2024 年 8 月 1 日生效",
      "up to 15M EUR or 3% global turnover": "最高 15M 欧元或全球营业额的 3%"
    },
    "patterns": [
      [
        "^up\\ to\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)M\\ EUR\\ or\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)%\\ global\\ turnover$",
        "最高 $1M 欧元或全球营业额的 $2%"
      ]
    ],
    "preserve": [
      {
        "text": "GPAI",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "an-echoleak-chain": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "ECHOLEAK CVE-2025-32711": "EchoLeak 漏洞 CVE-2025-32711",
      "zero-click · scope violation": "零点击 · 作用域越界",
      "EchoLeak was the first production zero-click prompt injection CVE, CVSS 9.3. A crafted email waits in the victim mailbox until a routine Copilot query retrieves it as RAG context. Hidden instructions then steer the model to gather sensitive data and embed it in a URL on a CSP-approved Microsoft domain, so the exfiltration request is allowed. Untrusted input driving privileged data access is what Aim Labs named an LLM Scope Violation.": "EchoLeak 是首个在生产中发现的零点击 prompt 注入 CVE，CVSS 为 9.3。攻击邮件在受害者邮箱中等待，直到一次常规 Copilot 查询将它检索为 RAG 上下文。隐藏指令随后引导模型收集敏感数据，并将其嵌入一个通过 CSP 允许的 Microsoft 域名 URL，使外传请求获准通过。Aim Labs 将这种由不可信输入驱动特权数据访问的行为称为 LLM 作用域越界。",
      "attacker": "攻击者",
      "email": "邮件",
      "retrieval": "检索",
      "answers": "回答",
      "approved": "获准的",
      "domain": "域名",
      "org trust boundary": "组织信任边界",
      "hidden instructions in the mail body": "邮件正文中的隐藏指令",
      "victim clicks nothing": "受害者无需点击",
      "data out via CSP-allowed URL": "数据经 CSP 允许的 URL 外传"
    },
    "patterns": [
      [
        "^ECHOLEAK\\ CVE\\-([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "EchoLeak 漏洞 CVE-$1$2"
      ]
    ],
    "preserve": [
      {
        "text": "RAG",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "Copilot",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  },
  "an-card-scopes": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "DOCUMENTATION SCOPES": "文档说明范围",
      "dataset inside model inside system": "数据集包含于模型，模型包含于系统",
      "Transparency documentation telescopes: a datasheet describes how one dataset was collected and with what consent, a model card wraps that with intended use and metrics disaggregated by demographic factors, and a system card wraps both with the deployed pipeline, its guardrails, and its failure handling. Adoption is the weak link: an audit of Hugging Face model cards found only 0.3 percent document ethical considerations.": "透明度文档逐层扩展：数据集说明卡记录一个数据集的收集方式与同意情况；模型卡在其基础上说明预期用途，以及按人口统计因素细分的指标；系统卡再加入已部署流水线、护栏和失败处理。采用率是薄弱环节：一项针对 Hugging Face 模型卡的审计发现，只有 0.3% 记录了伦理考虑。",
      "system card": "系统卡",
      "end-to-end pipeline, guardrails": "端到端流水线与护栏",
      "model card": "模型卡",
      "intended use, disaggregated metrics": "预期用途与细分指标",
      "dataset card": "数据集卡",
      "collection, consent": "收集方式与同意情况"
    },
    "patterns": [],
    "preserve": []
  },
  "an-provenance-oneway": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "PROVENANCE IS ONE-WAY": "数据来源是单向的",
      "comply at the gate or never": "在收集关口合规，否则再无机会",
      "Cookie-consent frameworks assume tracking is reversible. Training is not: once data dissolves into model weights there is no practical GDPR right to erasure, so the only compliance window is the consent gate at collection time. That is why the EU mandates machine-readable opt-outs for GPAI, California AB 2013 demands per-dataset disclosure, and the Data Provenance Initiative found publishers slamming robots.txt shut on the AI data commons.": "Cookie 同意框架假设跟踪可以撤销，训练却不可逆：数据一旦融入模型权重，就无法实际执行 GDPR 的定点删除权。因此，唯一的合规窗口是数据收集时的同意关口。这也是欧盟要求 GPAI 提供机器可读退出机制、加州 AB 2013 要求逐数据集披露的原因。Data Provenance Initiative 则发现，出版方正在通过 robots.txt 关闭 AI 公共数据资源的访问。",
      "consent gate, collection time": "收集时的同意关口",
      "model weights": "模型权重",
      "no surgical erasure": "无法定点删除",
      "opt-out honored here": "在此执行退出选择",
      "right to erasure, blocked": "删除权在此受阻"
    },
    "patterns": [],
    "preserve": []
  },
  "an-moderation-layers": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "LAYERED MODERATION": "分层内容审核",
      "input · output · custom rules": "输入 · 输出 · 自定义规则",
      "Production moderation runs in layers. An input check screens the prompt before generation, so the amber request never reaches the model. An output check screens what the model produced, the ring pulse, catching harm the input layer could not predict. Custom domain rules stack on top. OpenAI omni-moderation returns 13 category flags per call, Llama Guard covers the 14 MLCommons hazards, and async parallel calls hide the added latency.": "生产内容审核分层执行。输入检查在生成前审查 prompt，因此图中琥珀色请求不会进入模型。输出检查审查模型生成的内容，即图中的圆环脉冲，捕获输入层无法预见的有害内容。领域自定义规则再叠加其上。OpenAI omni-moderation 每次返回 13 类标记，Llama Guard 覆盖 MLCommons 的 14 类危害；异步并行调用可隐藏新增延迟。",
      "user": "用户",
      "input filter": "输入过滤器",
      "model": "模型",
      "output filter": "输出过滤器",
      "reply": "回复",
      "blocked": "已阻断",
      "post-generation check": "生成后检查",
      "pre-generation check": "生成前检查"
    },
    "patterns": [],
    "preserve": []
  },
  "an-uplift-asymmetry": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "UPLIFT ASYMMETRY": "能力提升的不对称性",
      "novice ratio · expert reach": "新手看倍数 · 专家看绝对能力",
      "AI assistance multiplies novice capability the most, the bioweapon-acquisition trial measured 2.53x on acquisition tasks, but the novice still ends far from the line. The expert gains a smaller ratio on a much larger base, and it is the expert bar that crosses the dangerous-capability threshold. Safety cases must handle both ends: relative uplift for novices, absolute reach for experts, while vision models erode the wet-lab execution gap that once backstopped both.": "AI 对新手能力的相对提升最大：一项生物武器获取实验测得，获取任务的能力提升为 2.53 倍，但新手最终仍远低于危险界线。专家的相对提升倍数较小，起点却高得多，因此越过危险能力阈值的是专家的柱形。安全论证必须同时考虑两端：新手的相对提升，以及专家的绝对能力；视觉模型还在缩小过去限制二者的湿实验执行差距。",
      "dangerous capability": "危险能力阈值",
      "novice": "新手",
      "x2.53 relative uplift": "相对能力提升 x2.53",
      "expert": "专家",
      "smaller ratio, larger absolute reach": "提升倍数较小，绝对能力更高",
      "grey: baseline skill · colored: AI assistance": "灰色：基础技能 · 彩色：AI 辅助"
    },
    "patterns": [
      [
        "^x2\\.([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ relative\\ uplift$",
        "相对能力提升 x2.$1"
      ]
    ],
    "preserve": []
  }
};
