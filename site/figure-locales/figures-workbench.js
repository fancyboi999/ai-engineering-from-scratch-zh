(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-workbench.js"] = {
  "wb-runtime-spawn": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "PRODUCTION RUNTIME": "生产运行时",
      "a fresh agent per request": "每个请求创建新的 agent",
      "request": "请求",
      "response": "响应",
      "fresh, ~us spawn": "新建，约微秒级创建",
      "session store": "会话存储",
      "stateless loop: the agent is disposable, the session is not": "无状态循环：agent 可随用随弃，会话状态必须保留",
      "Agno's recommended production shape: a stateless session-scoped backend where every request instantiates a fresh agent in microseconds, session state lives in a store, and the agent is torn down after the response. Mastra makes the same bet in TypeScript with typed Agents, Tools, and Workflows served behind standard server adapters.": "Agno 推荐的生产形态是按会话划定边界的无状态后端：每个请求以微秒级开销创建新 agent，会话状态保存在存储中，响应结束后销毁 agent。Mastra 在 TypeScript 中采用相同方向，以带类型的 Agent、Tool 与 Workflow，配合标准服务适配器对外提供服务。"
    },
    "patterns": [],
    "preserve": []
  },
  "wb-trace-ingest": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "AGENT OBSERVABILITY": "agent 可观测性",
      "spans into a scored waterfall": "span 汇成可评分的瀑布图",
      "agent run": "agent 运行",
      "observability platform": "可观测平台",
      "run": "运行",
      "plan": "计划",
      "tool call": "工具调用",
      "model call": "模型调用",
      "eval": "评测",
      "llm-judge: grounded, no hallucination": "LLM 评判：有据可依，无幻觉",
      "spans arrive, the waterfall assembles, a judge scores a span": "接收 span、组装瀑布图，再由评判器为 span 评分",
      "The platform layer above OTel GenAI: it ingests spans, renders the trace waterfall, and runs evaluations over individual steps. Langfuse pairs this with prompt management and session replay, Phoenix with RAG-focused evals and auto-instrumentation, Opik with prompt optimization and LLM-judge hallucination checks.": "这是 OTel GenAI 之上的平台层：接收 span，渲染调用轨迹瀑布图，并评估各个步骤。Langfuse 将其与 prompt 管理和会话回放结合；Phoenix 侧重 RAG 评测与自动埋点；Opik 侧重 prompt 优化，以及通过 LLM 评判器检查幻觉。"
    },
    "patterns": [],
    "preserve": []
  },
  "wb-runtime-shapes": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "RUNTIME SHAPES": "运行时形态",
      "three intakes, one worker": "三种入口，同一工作者",
      "queue": "队列",
      "event": "事件",
      "cron": "定时任务",
      "agent worker": "agent 工作者",
      "same loop inside": "内部循环相同",
      "pick the intake shape first; the loop inside barely changes": "先选择任务入口形态；内部循环几乎不变",
      "Queue-based background work, event-driven triggers, and scheduled cron jobs are three of the six production runtime shapes. Each intake delivers work to the same agent loop, but the shape decides which failures are survivable: a queue can retry, an event can replay, a cron must assume the last run died.": "基于队列的后台作业、事件触发与定时 cron 作业，是六种生产运行时形态中的三种。各入口把工作送入同一个 agent 循环，但形态决定能承受哪些失败：队列可以重试，事件可以回放，而 cron 必须考虑上次运行已经中断。"
    },
    "patterns": [],
    "preserve": []
  },
  "wb-seven-surfaces": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "THE WORKBENCH": "工作台",
      "seven surfaces dock around the model": "七个工作面围绕模型装配",
      "capable model": "有能力的模型",
      "instructions": "指令",
      "state": "状态",
      "scope": "范围",
      "feedback": "反馈",
      "verify": "验证",
      "review": "审查",
      "handoff": "交接",
      "the model is constant; the surfaces are what changed": "模型不变；改变的是工作面",
      "A frontier model on its own flickers: plausible code, no definition of done, no record of what it assumed. Reliability appears as the seven workbench surfaces dock around it, one by one: instructions, state, scope, feedback, verification, review, and handoff. Strip any one away and its failure mode comes back.": "单独使用前沿模型时，表现会摇摆不定：代码貌似合理，却没有完成定义，也不记录做过什么假设。可靠性来自七个工作面依次就位：指令、状态、范围、反馈、验证、审查与交接。去掉任何一个，对应的失败模式就会回来。"
    },
    "patterns": [],
    "preserve": []
  },
  "wb-three-files": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "MINIMAL WORKBENCH": "最小工作台",
      "three files, one cycle": "三个文件，一个循环",
      "agent loop": "agent 循环",
      "working...": "正在工作…",
      "root router": "根路由文件",
      "durable state": "持久状态",
      "in flight / blocked / next": "进行中 / 已阻塞 / 下一步",
      "read at turn start (blue), write at turn end (amber)": "轮次开始时读取（蓝色），结束时写入（琥珀色）",
      "The smallest useful workbench: a short root router the agent reads first, a state file it reads before acting and writes after, and a task board that says what is in flight, blocked, and next. Reads open every turn, writes close it, and no part of the cycle depends on chat history surviving.": "最小可用工作台包括：agent 最先读取的简短根路由文件，行动前读取、行动后写回的状态文件，以及列出进行中、阻塞和下一步任务的看板。每轮以读取开始、写入结束，整个循环不依赖聊天历史能否保留。"
    },
    "patterns": [],
    "preserve": []
  },
  "wb-rule-checkoff": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "RULES AS CONSTRAINTS": "将规则变成约束",
      "a run scored against the rule set": "按规则集为运行评分",
      "startup: init ran before any edit": "启动：任何编辑前先运行初始化",
      "forbidden: no writes outside scope": "禁止：不得写入范围外位置",
      "done: tests actually ran": "完成：测试确实执行过",
      "uncertainty: asked before assuming": "不确定：先询问再作假设",
      "run artifacts": "运行产物",
      "diff + feedback log": "差异 + 反馈日志",
      "score 3 / 4": "得分 3 / 4",
      "one violation, named": "一项违规，有明确名称",
      "each rule is a check, not a wish": "每条规则都是检查项，而非愿望",
      "Prose instructions say \"be careful\"; constraints say which check failed. The rule checker walks the rule set against the run artifacts and marks each rule pass or fail, so a violation is a named line in a report instead of a vibe. Diff-friendly rules mean review sees exactly which constraint changed.": "散文指令只会说“要小心”，约束则会指出哪项检查失败。规则检查器根据运行产物逐项检查，标记通过或失败，因此违规会成为报告中有名称的一行，而非凭感觉判断。便于查看差异的规则，让审查者准确看到哪条约束发生了变化。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "docs/agent-rules.md",
        "reason": "规则文件路径"
      }
    ]
  },
  "wb-state-persist": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "REPO MEMORY": "仓库记忆",
      "state survives the session boundary": "状态跨越会话边界",
      "chat (volatile)": "聊天（易失）",
      "let me check...": "让我检查一下…",
      "editing utils.py": "正在编辑 utils.py",
      "done, I think": "我觉得完成了",
      "session ends": "会话结束",
      "repo (durable)": "仓库（持久）",
      "schema": "模式",
      "rev 6": "修订 6",
      "rev 7 · atomic write": "修订 7 · 原子写入",
      "next session": "下一会话",
      "reads the same file": "读取同一个文件",
      "chat evaporates; the repo remembers": "聊天会消散；仓库会记住",
      "The chat bubbles dissolve when the session ends; the state file does not. A write goes through the schema check before it lands, the revision advances atomically, and the next session, the next agent, and the reviewer all read the same versioned file instead of re-deriving where the work left off.": "会话结束时，聊天气泡会消失，状态文件却不会。写入先通过模式校验，再原子递增修订号；下一会话、下一位 agent 和审查者都读取同一个受版本管理的文件，无需重新推断工作停在何处。"
    },
    "patterns": [],
    "preserve": []
  },
  "wb-init-probes": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "INIT SCRIPT": "初始化脚本",
      "health checks before the first edit": "首次编辑前执行健康检查",
      "runtime": "运行时",
      "deps": "依赖",
      "paths": "路径",
      "tests": "测试",
      "gate": "关卡",
      "work": "工作",
      "probe once, persist the answers, then start": "探测一次，保存结果，再开始工作",
      "One deterministic script probes the runtime, dependencies, paths, and test command before the agent does anything else, and writes each answer into an init report. Only when every lamp is lit does the gate lift and real work begin; a cold session reads the report instead of paying the discovery tax again.": "一个确定性脚本会在 agent 执行其他操作前，检查运行时、依赖、路径与测试命令，并将各项结果写入初始化报告。只有所有指示灯亮起，关卡才抬起，实际工作才开始；新会话直接读取报告，无需再次付出探索成本。"
    },
    "patterns": [],
    "preserve": []
  },
  "wb-scope-bounce": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "SCOPE CONTRACT": "范围契约",
      "a diff bounces off the forbidden glob": "差异碰到禁止路径后退回",
      "allowed": "允许",
      "forbidden": "禁止",
      "diff A": "差异 A",
      "diff B": "差异 B",
      "violation: db/** touched, rolled back": "违规：修改了 db/**，已回滚",
      "allowed + forbidden + rollback": "允许 + 禁止 + 回滚",
      "The contract lists where the task may write and where it must not. A diff that lands inside the allowed glob passes; a diff that drifts toward a forbidden path hits the contract boundary, bounces, and becomes a named violation with a rollback plan, caught by the checker rather than by a reviewer two days later.": "契约列明任务可写与不可写的位置。落在允许路径模式内的差异通过；偏向禁止路径的差异会撞上契约边界并退回，形成有名称的违规项与回滚方案。问题由检查器及时发现，而非两天后才被审查者看到。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "src/auth/**",
        "reason": "范围契约的 glob 路径，不得改变匹配范围"
      },
      {
        "text": "db/** · release/**",
        "reason": "范围契约的 glob 路径，不得改变匹配范围"
      }
    ]
  },
  "wb-feedback-loop": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "FEEDBACK LOOP": "反馈循环",
      "exit codes flow back into the turn": "退出码反馈到当前轮次",
      "agent turn": "agent 轮次",
      "runner": "运行器",
      "wraps the cmd": "包装命令",
      "shell": "Shell 命令行",
      "exit 1 · stderr captured": "退出码 1 · 已捕获 stderr",
      "exit 0 · 412ms": "退出码 0 · 412ms",
      "the error routes back in; the retry reacts to facts": "错误反馈回来；重试依据事实作出调整",
      "Every command goes through the runner, which captures stdout, stderr, exit code, and duration into a structured record. The first run fails with exit 1 and that record, not the agent's imagination of the output, routes back into the next turn; the retry then earns its exit 0 on the same evidence trail the gate will read.": "每条命令都经过运行器，将 stdout、stderr、退出码与耗时捕获为结构化记录。首次运行以退出码 1 失败，送回下一轮次的是这条记录，而非 agent 想象中的输出；重试随后在同一条证据链上取得退出码 0，验证关卡也会读取这条证据链。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "feedback_record.jsonl",
        "reason": "结构化反馈记录文件名"
      }
    ]
  },
  "wb-gate-sequence": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "VERIFICATION GATE": "验证关卡",
      "ordered gates, one verdict": "有序关卡，一个判定",
      "rules": "规则",
      "scope": "范围",
      "feedback": "反馈",
      "accept": "验收",
      "diff": "差异",
      "blocked: acceptance never ran": "已阻塞：验收从未运行",
      "The gate is a deterministic function over artifacts the agent already produced: the rule report, the scope report, the feedback records, and the diff. The change clears rules, scope, and feedback, but acceptance has no record of ever running, so the final gate stays down and done stays false, whatever the chat claimed.": "关卡是对 agent 已产出的材料执行的确定性函数，输入包括规则报告、范围报告、反馈记录与差异。这次修改通过规则、范围和反馈检查，但没有任何验收运行记录，因此最后一道关卡仍然关闭，无论聊天中如何声称，done 都保持 false。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "verification_report.json · passed: false",
        "reason": "原样的协议、代码、产品名或公式标识，不属于人读散文"
      }
    ]
  },
  "wb-builder-marker": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "REVIEWER AGENT": "审查 agent",
      "builder output crosses to a marker": "构建者产出交给独立评分者",
      "builder": "构建者",
      "wrote the change": "编写修改",
      "reviewer": "审查者",
      "read-only, own prompt": "只读，使用独立 prompt",
      "artifacts": "产物",
      "scored per rubric line": "按评分标准逐项评分",
      "artifacts cross the wall; edits never cross back": "产物穿过隔墙；修改不会反向穿回",
      "The builder cannot grade its own work, so its artifacts pass through a slot in the wall to a second loop with a different system prompt, a different goal, and read-only access. The reviewer grades against a rubric line by line and emits a report; nothing it does can modify what the builder produced.": "构建者不能给自己的工作评分，因此产物要穿过隔墙上的槽口，交给另一个循环。它使用不同的系统 prompt、不同目标，以及只读权限。审查者逐项按评分标准评判并生成报告，不能修改构建者的任何产物。"
    },
    "patterns": [],
    "preserve": []
  },
  "wb-handoff-packet": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "MULTI-SESSION HANDOFF": "多会话交接",
      "a packet carries state across the gap": "交接包把状态带过会话间隙",
      "session n": "会话 n",
      "state": "状态",
      "verdict": "判定",
      "review": "审查",
      "handoff": "交接",
      "session boundary": "会话边界",
      "session n+1": "会话 n+1",
      "first action:": "首个动作：",
      "rerun the failing test": "重跑失败测试",
      "what changed, what failed, what is next, what to do first": "改了什么、哪里失败、下一步是什么、先做什么",
      "At session end the workbench compresses state, verdict, and review into one handoff packet and throws it across the boundary. The old session dims, the new one lights up already knowing its first action, so the next agent is productive in the first minute instead of spending thirty rediscovering the last thirty seconds.": "会话结束时，工作台将状态、判定与审查压缩成一个交接包，传过会话边界。旧会话暗下去，新会话亮起时就知道首个动作；下一位 agent 因此能在第一分钟开始工作，而非花三十分钟重新发现前次最后三十秒的进展。"
    },
    "patterns": [],
    "preserve": []
  },
  "wb-ab-runs": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "BEFORE / AFTER": "修改前 / 修改后",
      "one task, two pipelines, five outcomes": "一个任务，两条流水线，五项结果",
      "task: validate /signup": "任务：验证 /signup",
      "prompt-only": "仅用 prompt",
      "workbench": "工作台",
      "tests pass": "测试通过",
      "scope held": "范围守住",
      "feedback real": "反馈真实",
      "handoff usable": "交接可用",
      "no reverts": "无回退",
      "The same task runs twice on the same repo: once prompt-only, once through the full workbench. Five measured outcomes do the arguing: tests, scope, feedback records, handoff quality, and reverts. The model is identical in both lanes; the surfaces are the only variable, and the tally is the case you hand a skeptic.": "同一个任务在同一仓库运行两次：一次仅用 prompt，一次使用完整工作台。用五项可测结果说明差异：测试、范围、反馈记录、交接质量与回退。两路模型完全相同，工作面是唯一变量；这份统计就是交给质疑者的证据。"
    },
    "patterns": [],
    "preserve": []
  },
  "wb-pack-install": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "WORKBENCH PACK": "工作台包",
      "cp -r and the agent works tomorrow": "cp -r 复制，agent 明天即可工作",
      "target repo": "目标仓库",
      "second run: already present, skipped": "第二次运行：已存在，跳过",
      "one command lays the workbench down, idempotently": "一条命令幂等安装工作台",
      "The capstone compresses eleven lessons of surfaces into one versioned directory: the router, the schemas, the scripts, the templates, and a single installer. Each file lands in its slot in the target repo, and a second run detects what is already present and skips it, so the pack is safe to reapply forever.": "综合项目将十一课涉及的工作面收进一个受版本管理的目录：路由文件、模式、脚本、模板，以及单一安装器。每个文件落入目标仓库的对应位置；再次运行会识别已存在内容并跳过，因此这个包可以反复安全应用。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "agent-workbench-pack/",
        "reason": "工作台分发包中的真实目录与安装器路径"
      },
      {
        "text": "schemas/",
        "reason": "工作台分发包中的真实目录与安装器路径"
      },
      {
        "text": "scripts/",
        "reason": "工作台分发包中的真实目录与安装器路径"
      },
      {
        "text": "docs/templates/",
        "reason": "工作台分发包中的真实目录与安装器路径"
      },
      {
        "text": "bin/install.sh",
        "reason": "工作台分发包中的真实目录与安装器路径"
      }
    ]
  }
};
