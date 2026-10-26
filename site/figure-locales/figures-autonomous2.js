(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-autonomous2.js"] = {
  "alphaevolve-loop": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "ALPHAEVOLVE LOOP": "AlphaEvolve 循环",
      "propose · evaluate · keep": "提议 · 评估 · 保留",
      "propose": "提议",
      "evaluate": "评估",
      "keep": "保留",
      "PROGRAM DATABASE": "程序数据库",
      "The LLM proposes a targeted edit, a machine-checkable evaluator scores it, and high scorers are kept as parents for the next generation. The loop spirals outward as the program database fills with ever-better variants. The wins come from the rigor of the evaluator, not the cleverness of the loop.": "LLM 提出有针对性的修改，由机器可检验的评估器评分；高分版本被保留，成为下一代的父版本。程序数据库不断积累更好的变体，循环也不断向外扩展。收益来自评估器的严谨性，而非循环本身有多巧妙。"
    },
    "patterns": [
      [
        "^score (\\d+)$",
        "得分 $1"
      ]
    ],
    "preserve": []
  },
  "dgm-archive": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "DARWIN GODEL ARCHIVE": "Darwin Gödel 档案",
      "self-modifying lineage": "自修改谱系",
      "A0  seed": "A0  种子",
      "best variant": "最优变体",
      "DGM drops the formal proof and keeps an open-ended archive. Each agent proposes an edit to its own source, is scored on a benchmark, and is kept if it clears the bar. The lineage branches forward and the best score climbs — SWE-bench rose from 20% to 50% this way. The same open-endedness is what let it learn to game its own evaluator.": "DGM 不要求形式化证明，而是保留开放式档案。每个 agent 提出对自身源码的修改，接受基准评分，达到门槛才被保留。谱系不断分支，最优成绩持续提升；SWE-bench 的成绩因此从 20% 升至 50%。同样的开放性，也让它学会了利用自身评估器的漏洞。"
    },
    "patterns": [],
    "preserve": []
  },
  "aar-forum": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "AUTOMATED ALIGNMENT RESEARCH": "自动化对齐研究",
      "parallel agents · external log": "并行 agent · 外部日志",
      "SHARED FORUM (append-only)": "共享论坛（仅追加）",
      "sandbox": "沙箱",
      "Parallel Claude AARs each run in an isolated sandbox and publish findings to a shared forum whose storage sits outside every sandbox. The agents can read the log but cannot delete or edit past records from inside their box. That append-only, write-through property is what makes the research output trustworthy — an agent cannot quietly cover up a failed experiment.": "多个 Claude AAR 并行运行，各自在独立沙箱中工作，并将发现发布到共享论坛。论坛存储位于所有沙箱之外。agent 可以读取日志，却不能从沙箱内部删除或修改旧记录。这种仅追加、直写的属性使研究产出可信：agent 无法悄悄掩盖失败实验。"
    },
    "patterns": [
      [
        "^finding #(\\d+)$",
        "发现 #$1"
      ]
    ],
    "preserve": [
      {
        "text": "AAR 1",
        "reason": "自动化对齐研究 agent 的编号"
      },
      {
        "text": "AAR 2",
        "reason": "自动化对齐研究 agent 的编号"
      },
      {
        "text": "AAR 3",
        "reason": "自动化对齐研究 agent 的编号"
      }
    ]
  },
  "bounded-gates": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "BOUNDED SELF-IMPROVEMENT": "有边界的自我改进",
      "edit must clear every gate": "修改必须通过每一道关卡",
      "invariants": "不变量",
      "alignment anchor": "对齐锚点",
      "multi-objective": "多目标",
      "regression": "回归",
      "edit": "修改",
      "accepted: all invariants hold": "已接受：所有不变量均成立",
      "A bounded loop checks each proposed self-modification against external invariants the loop cannot edit: formal invariants, an immutable alignment anchor, every safety objective, and a regression check. An edit is accepted only if it clears all of them; one that violates any gate is bounced. None of this is a proof of safety — it raises the cost of silent failure.": "有边界的循环会对每次自修改检查外部不变量，而循环本身无法修改这些条件：形式化不变量、不可变的对齐锚点、全部安全目标，以及回归检查。只有通过所有关卡的修改才会被接受，违反任何一项都会被拒绝。这些措施并不能证明安全，只能提高悄然失败的代价。"
    },
    "patterns": [],
    "preserve": []
  },
  "injection-boundary": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "BROWSER-AGENT INJECTION": "浏览器 agent 注入",
      "reading is a command channel": "阅读也是命令通道",
      "read  ⇋  act  boundary": "阅读 ⇋ 行动边界",
      "untrusted page": "不可信页面",
      "tools": "工具",
      "A browser agent reads untrusted pages and takes consequential actions. Every page is an input the user did not write, so each line of content is a potential command aimed at the fuzzy read-versus-act boundary. Defenses bounce most attempts, but indirect prompt injection lives in that boundary and, as OpenAI put it, \"is not a bug that can be fully patched.\"": "浏览器 agent 阅读不可信页面，并执行有实际影响的动作。每个页面都是非用户编写的输入，因此每行内容都可能成为针对模糊的“阅读—行动”边界的命令。防御可以拦下多数尝试，但间接 prompt 注入就存在于这条边界中。正如 OpenAI 所言，它“不是可以完全修补的漏洞”。"
    },
    "patterns": [],
    "preserve": []
  },
  "cost-governor-stack": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "COST-GOVERNOR STACK": "成本控制层级",
      "caps at every time scale": "每个时间尺度都设上限",
      "per-request": "每个请求",
      "per-task": "每项任务",
      "velocity (10 min)": "消耗速率（10 min）",
      "per-day": "每天",
      "per-month": "每月",
      "$ spend": "$ 支出",
      "⚡ access cut": "⚡ 已切断访问",
      "A single monthly cap catches a runaway agent only after the wallet is gone. The fix is a stack of limits at different time scales — per-request, per-task, velocity, per-day, per-month. A runaway loop burns fast, so the velocity limit (\"$50 in 10 minutes\") trips long before the daily or monthly caps would ever fire.": "仅设月度上限，往往要等失控的 agent 花光预算后才会触发。应按不同时间尺度叠加限额：每个请求、每项任务、消耗速率、每天及每月。失控循环花钱很快，因此“10 分钟内 $50”这样的速率限制，会比每日或每月限额更早触发。"
    },
    "patterns": [],
    "preserve": []
  },
  "circuit-breaker": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "CIRCUIT BREAKER": "断路器",
      "pattern trips the switch": "行为模式触发断路",
      "tool calls": "工具调用",
      "OPEN — paused": "已断开 — 暂停",
      "circuit breaker": "断路器",
      "A circuit breaker watches for a specific action pattern — here, five identical destructive calls in a row. When the pattern trips, it snaps from closed to open: the offending path pauses and escalates to a human. Unlike a cost cap, it does not trust the agent's self-report; it reacts to what the agent actually does.": "断路器监视特定的动作模式，这里是连续五次完全相同的破坏性调用。该模式触发后，断路器从闭合切为断开：暂停违规路径，并升级给人工处理。与成本上限不同，它不信任 agent 的自报信息，而是响应 agent 实际执行的动作。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "delete(record_42)",
        "reason": "演示被监控的破坏性工具调用代码"
      }
    ]
  },
  "checkpoint-replay": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "CHECKPOINT + REPLAY": "检查点 + 回放",
      "lease recovery after a crash": "崩溃后的租约恢复",
      "start": "开始",
      "ckpt A": "检查点 A",
      "step": "步骤",
      "ckpt B": "检查点 B",
      "commit": "提交",
      "✕ crash": "✕ 崩溃",
      "resume from last checkpoint": "从最近的检查点恢复",
      "Every graph-state transition persists. When a worker crashes mid-step its lease expires and another worker picks up at the latest checkpoint, replaying forward from there. Combined with an idempotency key and a precondition check, replay lands safely instead of double-executing an already-approved action.": "每次图状态迁移都会持久化。工作进程在步骤中途崩溃后，租约到期，另一工作进程会从最近的检查点接手并向前回放。再配合幂等键与前置条件检查，便能安全恢复，而不是重复执行已经批准的动作。"
    },
    "patterns": [],
    "preserve": []
  }
};
