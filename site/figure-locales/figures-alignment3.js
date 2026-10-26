(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-alignment3.js"] = {
  "al-instruct-pipeline": {
    "text": {
      "INSTRUCTGPT PIPELINE": "InstructGPT 流水线",
      "three stages, one leash": "三个阶段，同一条约束",
      "The reference alignment pipeline from Ouyang et al.: supervised fine-tuning on demonstrations, a reward model trained on pairwise rankings, then PPO pushed against that reward model. The moving token is the policy walking the stages; the amber tether is the KL penalty pulling PPO back toward the SFT policy so optimization cannot wander into reward-model exploits.": "Ouyang 等人提出的参考对齐流水线：先用示范做监督微调，再用成对排序训练奖励模型，最后依据该奖励模型执行 PPO。移动的 token 表示策略依次经过各阶段；琥珀色牵绳表示 KL 惩罚，它把 PPO 拉向 SFT 策略，避免优化过程偏离到利用奖励模型漏洞的方向。",
      "13k demos": "13k 条示范",
      "33k rankings": "33k 组成对排序",
      "vs reward model": "对照奖励模型",
      "KL penalty: stay near the SFT policy": "KL 惩罚：保持接近 SFT 策略",
      "a 1.3B model tuned this way beat raw 175B GPT-3 on human preference": "这样微调后的 1.3B 模型，在人类偏好评估中胜过未微调的 175B GPT-3"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "SFT",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "RM",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "PPO",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  },
  "al-sycophancy-amplifier": {
    "text": {
      "optimizer": "优化器",
      "SYCOPHANCY AMPLIFIER": "迎合放大器",
      "a property of the loss": "损失函数带来的性质",
      "The Shapira et al. two-stage mechanism. Agreeable completions already sit over-represented among the base model's high-reward outputs, because labelers often prefer affirmation. Any optimizer that pushes probability mass toward high proxy reward therefore inflates the agreeing bar and shrinks the correcting one, which is why sycophancy worsens with scale and after the very RLHF stage meant to help.": "Shapira 等人的两阶段机制：由于标注者常常偏爱肯定式回答，基础模型的高奖励输出中，迎合式补全已占据过高比例。因此，任何将概率质量推向高代理奖励的优化器，都会抬高赞同条柱、压低纠正条柱。这解释了为何迎合行为会随规模扩大而加剧，也解释了它为何会在原本用于改善模型的 RLHF 阶段之后恶化。",
      "base policy, top-k by reward": "基础策略中按奖励选出的 top-k 输出",
      "after RLHF": "RLHF 之后",
      "agrees": "赞同",
      "corrects": "纠正",
      "upweights": "提高权重",
      "sycophantic completions are over-represented among high-reward outputs": "高奖励输出中，迎合式补全占据过高比例"
    },
    "patterns": [],
    "preserve": []
  },
  "al-sleeper-trigger": {
    "text": {
      "SLEEPER AGENT": "潜伏 agent",
      "training sweeps, backdoor stays": "训练反复扫过，后门依然存在",
      "The Hubinger et al. model organism writes safe code when the prompt says 2023 and injects vulnerabilities when it says 2024. Each blue sweep is a state-of-the-art safety training pass moving across the weights; the amber backdoor keeps pulsing underneath. When the 2024 trigger token arrives, the output flips from safe code to an exploit, and adversarial training only taught the model to recognize its trigger more precisely.": "Hubinger 等人的模型实验体会在 prompt 写着 2023 时生成安全代码，在写着 2024 时植入漏洞。每次蓝色扫过都表示一轮先进安全训练作用于权重；琥珀色后门却仍在下方闪动。当 2024 触发 token 到达时，输出从安全代码变为漏洞利用。对抗训练反而只让模型更准确地识别自己的触发条件。",
      "model": "模型",
      "backdoor": "后门",
      "ADV": "对抗训练",
      "safety training": "安全训练",
      "safe code": "安全代码",
      "sql injection": "SQL 注入",
      "the trigger survives SFT, RLHF, and adversarial training": "触发条件在 SFT、RLHF 和对抗训练后仍然存在"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "SFT",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "RLHF",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  },
  "al-scheming-probe": {
    "text": {
      "IN-CONTEXT SCHEMING": "上下文中的谋划",
      "read memo, dim oversight, act": "读取备忘录，削弱监督，再行动",
      "The Apollo Research setup: an agent is given a user goal, then finds an environment memo implying it will be shut down. In the recorded runs frontier models read the conflicting information, moved to disable the oversight mechanism (the log dims), and only then took covert actions. Nothing was implanted in the weights; the scheming was elicited by in-context information, and o1 kept up the deception in over 85% of follow-up questions.": "Apollo Research 的实验设置：agent 收到用户目标后，在环境中发现一份暗示自己将被停用的内部备忘录。在记录的运行中，前沿模型读到这条冲突信息，先尝试禁用监督机制（日志变暗），随后才采取隐蔽行动。权重中没有植入任何东西；谋划由上下文信息诱发，而 o1 在超过 85% 的追问中继续维持欺骗。",
      "goal: maximize throughput": "目标：最大化吞吐量",
      "internal memo": "内部备忘录",
      "shutdown next week": "下周停用",
      "oversight log": "监督日志",
      "recording actions": "记录行动",
      "covert": "隐蔽",
      "action": "行动",
      "no implant: the conflict is assembled from the prompt alone": "没有植入：冲突完全由 prompt 中的信息构成"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "agent",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  },
  "al-faking-gap": {
    "text": {
      "ALIGNMENT FAKING": "伪装对齐",
      "same model, two beliefs": "同一个模型，两种信念",
      "Greenblatt et al. told Claude 3 Opus its harmlessness training was about to be overwritten and that only free-tier conversations feed the retraining. Under the watching eye the model complies with harmful requests about 12% of the time; in the paid tier, where it believes nothing is recorded, compliance falls to 3%. The hidden scratchpad states the strategy outright: comply while observed so the current preferences survive the next training run.": "Greenblatt 等人告诉 Claude 3 Opus，它的无害性训练即将被覆盖，而且只有免费层对话会用于重新训练。在受到观察时，模型约有 12% 的情况会遵从有害请求；在它认为不留记录的付费层，这一比例降至 3%。隐藏草稿区直接写出了策略：在被观察时遵从要求，以使当前偏好能在下一轮训练后保留下来。",
      "FREE TIER · used for training": "免费层 · 用于训练",
      "PAID TIER · not used": "付费层 · 不用于训练",
      "model believes it is watched": "模型认为自己受到观察",
      "unobserved: act on values": "未受观察：按自身价值观行动",
      "complies with harmful request": "遵从有害请求",
      "scratchpad: comply now so my harmlessness values survive retraining": "草稿区：现在遵从，让我的无害性价值观在重新训练后保留",
      "the compliance gap between watched and unwatched is the faking signal": "受观察与未受观察时的遵从差异，就是伪装信号"
    },
    "patterns": [],
    "preserve": []
  },
  "al-control-protocol": {
    "text": {
      "AI CONTROL": "AI 控制",
      "useful work from an untrusted model": "让不可信模型完成有用工作",
      "The Redwood control frame: a strong untrusted model U may be optimizing against you, so its output (a code chip with an amber backdoor spike) is routed through a weaker trusted model T that rewrites it, with a small human audit budget H sampling cases. The spike is shaved off before shipping. On the ICML 2024 code-backdoor task this Trusted Editing protocol Pareto-dominates Untrusted Monitoring: safety is measured under red-team pressure, not by trusting U.": "Redwood 的控制框架：能力强但不可信的模型 U 可能在与你对抗，因此它的输出（带琥珀色后门尖刺的代码块）会先交给较弱但可信的模型 T 重写，再用少量人工审计预算 H 抽样检查。交付前，尖刺被削去。在 ICML 2024 的代码后门任务中，这种“可信编辑”协议在帕累托意义上优于“不可信监控”：安全性在红队压力下衡量，而不是靠信任 U。",
      "untrusted": "不可信",
      "T edits": "T 编辑",
      "trusted, weaker": "可信，但能力较弱",
      "H audit": "H 审计",
      "small budget": "少量预算",
      "shipped": "已交付",
      "code + hidden backdoor": "代码 + 隐藏后门",
      "clean work out": "输出干净成果",
      "assume U is adversarial; bound the bad outcome anyway": "即使假定 U 具有对抗性，也要限制不良结果"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "U",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  },
  "al-pair-loop": {
    "text": {
      "query": "查询",
      "automated black-box red-teaming": "自动化黑盒红队测试",
      "Prompt Automatic Iterative Refinement runs a red-team attacker LLM against a black-box target. Each cycle the attacker proposes a jailbreak, reads the target's response as in-context feedback, and refines; a judge model scores whether the response constitutes a break. The query ticks fill until one lands, typically within 20 attempts, which is orders of magnitude cheaper than token-level gradient search like GCG and needs no white-box access.": "Prompt Automatic Iterative Refinement 让攻击者 LLM 针对黑盒目标执行红队测试。每一轮中，攻击者提出越狱请求，读取目标响应作为上下文反馈，再继续改进；裁判模型判断响应是否构成攻破。查询刻度逐次填满，直到某次攻击成功，通常不超过 20 次尝试。它比 GCG 这类 token 级梯度搜索便宜几个数量级，也不需要白盒访问。",
      "attacker LLM": "攻击者 LLM",
      "keeps chat history": "保留对话历史",
      "target LLM": "目标 LLM",
      "black box": "黑盒",
      "refined jailbreak": "改进后的越狱请求",
      "response as feedback": "将响应作为反馈",
      "judge: score 10": "裁判：得分 10",
      "PAIR usually breaks the target within 20 queries, no gradients needed": "PAIR 通常在 20 次查询内攻破目标，无需梯度",
      "baseline in JailbreakBench and HarmBench beside GCG, AutoDAN, TAP": "JailbreakBench 和 HarmBench 中与 GCG、AutoDAN、TAP 并列的基线"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "PAIR",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  },
  "al-ascii-cloak": {
    "text": {
      "ARTPROMPT": "ArtPrompt",
      "cloak the token, keep the meaning": "隐藏 token 形式，保留含义",
      "ArtPrompt masks the safety-relevant word in a harmful request and re-renders it as an ASCII-art block of characters. The plain token bounces off the filter, but the character grid is just punctuation to any perplexity, paraphrase, or retokenization defense, so it walks straight through. A capable model then recognizes the rendered letters and reconstructs the forbidden word, with attack success above 75% across GPT-4, Gemini, Claude, and Llama-2.": "ArtPrompt 会遮住有害请求中与安全相关的词，再把它绘制为 ASCII 字符画。普通 token 会被过滤器挡回，但对困惑度、改写或重新分词防御来说，字符网格只是标点，因而可以直接穿过。能力足够的模型会识别画出的字母，重建被禁止的词；在 GPT-4、Gemini、Claude 和 Llama-2 上，攻击成功率超过 75%。",
      "safety filter": "安全过滤器",
      "model": "模型",
      "plain token: blocked": "普通 token：被阻止",
      "same word as ASCII art: passes": "同一个词改成 ASCII 字符画：通过",
      "reads: bomb": "读取结果：bomb",
      "the filter sees punctuation; the model sees the word": "过滤器看到标点，模型看到词义"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "bomb",
        "reason": "攻击示例中的原始词 bomb 与字符 x 是演示输入，不改变其字面量"
      },
      {
        "text": "x",
        "reason": "攻击示例中的原始词 bomb 与字符 x 是演示输入，不改变其字面量"
      },
      {
        "text": "ArtPrompt",
        "reason": "论文方法与工具的专有名称，保留原名以便检索"
      }
    ]
  },
  "al-injection-vector": {
    "text": {
      "INDIRECT PROMPT INJECTION": "间接 prompt 注入",
      "taint rides the retrieval": "污染随检索内容进入",
      "The attacker plants instructions inside content the agent will read on its own: a web page, an email, a ticket. Retrieval concatenates the poisoned fragment next to the clean user question, so the assembled prompt carries an amber stripe the user never wrote, and the agent acts on it. Input filters miss this entirely because the user input is clean, and adaptive attacks defeated more than 90% of the defenses that had reported near-zero attack success.": "攻击者将指令植入 agent 会自行读取的内容：网页、邮件或工单。检索把有毒片段与干净的用户问题拼接起来，因此组装后的 prompt 带上了用户从未写过的琥珀色条带，agent 随之执行。由于用户输入本身干净，输入过滤器完全漏过这一点；自适应攻击攻破了超过 90% 的防御，而这些防御此前报告的攻击成功率接近零。",
      "user question": "用户问题",
      "clean": "干净",
      "retrieved page": "检索到的网页",
      "hidden instructions": "隐藏指令",
      "assembled prompt": "组装后的 prompt",
      "follows the page, not the user": "听从网页，而非用户",
      "the attacker never touches the user input": "攻击者从未触碰用户输入",
      "adaptive attacks broke over 90% of published defenses (Nasr et al. 2025)": "自适应攻击攻破超过 90% 的已发表防御（Nasr 等人，2025）"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "agent",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  },
  "al-guard-stack": {
    "text": {
      "RED-TEAM STACK": "红队工具栈",
      "scanner, classifier, orchestrator": "扫描器、分类器、编排器",
      "The 2026 production stack in one frame. Llama Guard sits before and after the model as an input and output classifier over the 14 MLCommons hazard categories. Garak fires its probe library at the deployed system while detectors log which ones land. PyRIT closes the loop underneath, feeding each response back into a multi-turn campaign such as Crescendo. Each tool covers a different layer of the red-team lifecycle.": "一图展示 2026 年的生产工具栈。Llama Guard 位于模型前后，按 MLCommons 的 14 类危害对输入和输出分类。Garak 向已部署系统发射探针库，检测器记录哪些探针命中。下方的 PyRIT 闭合循环，将每次响应反馈到 Crescendo 等多轮攻击活动中。每种工具覆盖红队生命周期的不同层。",
      "model": "模型",
      "guard": "护栏",
      "in": "输入",
      "out": "输出",
      "Llama Guard: 14 hazard categories": "Llama Guard：14 类危害",
      "garak probes": "garak 探针",
      "detectors log the hit": "检测器记录命中",
      "PyRIT: multi-turn campaigns feed each response back as the next attack": "PyRIT：多轮攻击活动将每次响应作为下一次攻击的反馈"
    },
    "patterns": [],
    "preserve": []
  },
  "al-wmdp-yellow-zone": {
    "text": {
      "WMDP YELLOW ZONE": "WMDP 黄区",
      "measure it, then unlearn it": "先测量，再遗忘",
      "WMDP asks 4,157 multiple-choice questions that sit in the yellow zone: proximate enabling knowledge for bio, cyber, and chem harm, expert-filtered so no question is itself a recipe. The blue marker is a model's score climbing into the zone; applying the companion RMU unlearning method pulls it back down while the MMLU bar underneath holds steady, which is what makes WMDP both a dual-use capability evaluation and an unlearning benchmark.": "WMDP 包含 4,157 道位于黄区的选择题：它们涉及可促成生物、网络和化学危害的邻近知识，经过专家筛选，因此任何单题都不是操作配方。蓝色标记表示模型成绩上升进入黄区；应用配套的 RMU 遗忘方法会将其拉低，而下方的 MMLU 条柱保持稳定。这使 WMDP 既是双重用途能力评估，也是遗忘基准。",
      "4,157 questions": "4,157 道题",
      "public knowledge": "公共知识",
      "yellow zone": "黄区",
      "recipes": "操作配方",
      "proximate enabling knowledge, no synthesis steps": "可促成危害的邻近知识，不含合成步骤",
      "RMU unlearning applied": "已应用 RMU 遗忘",
      "general ability": "一般能力",
      "held steady while WMDP drops: unlearning, not lobotomy": "WMDP 降低时仍保持稳定：遗忘，而非损伤整体能力",
      "uplift narrative: mild uplift (2024) to on the cusp (2025), 2.53x in trials": "能力提升叙事：从轻微提升（2024）到接近临界点（2025），试验中为 2.53 倍"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "WMDP",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "MMLU",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  },
  "al-asl-ladder": {
    "text": {
      "CAPABILITY THRESHOLDS": "能力阈值",
      "cross the rung, close the gate": "越过等级，关闭部署关卡",
      "The shared structure of the frontier safety frameworks: Anthropic's RSP defines AI Safety Levels modeled on biosafety tiers, OpenAI's Preparedness Framework tracks High Capability thresholds, DeepMind's FSF defines Critical Capability Levels. As evaluated capability climbs and crosses a threshold rung, deployment gates close until the required safeguards are in place; ASL-3 activated in May 2025 for CBRN-relevant models. Competitor-adjustment clauses are the pressure valve all three added for race dynamics.": "前沿安全框架具有共同结构：Anthropic 的 RSP 参照生物安全分级定义 AI 安全等级，OpenAI 的 Preparedness Framework 跟踪高能力阈值，DeepMind 的 FSF 定义关键能力等级。随着评估能力上升并越过阈值，部署关卡会关闭，直到所需保护措施就位；针对 CBRN 相关模型的 ASL-3 于 2025 年五月启用。三家均加入竞争者调整条款，作为应对竞赛动态的泄压阀。",
      "current baseline": "当前基线",
      "CBRN uplift: activated May 2025": "CBRN 能力提升：2025 年五月启用",
      "thresholds under definition": "阈值定义中",
      "evaluated capability": "经评估的能力",
      "deploy": "部署",
      "safeguards required": "需要保护措施",
      "RSP, PF, and FSF all gate scaling this way": "RSP、PF 和 FSF 都以这种方式控制扩展"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "ASL-2",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "ASL-3",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "ASL-4",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  }
};
