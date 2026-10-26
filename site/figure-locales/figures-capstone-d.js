(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-capstone-d.js"] = {
  "cd-hyde-vector": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "HyDE QUERY REWRITE": "HyDE 查询改写",
      "fake answer lands on target": "用假想答案命中目标",
      "embedding space": "嵌入空间",
      "doc": "文档",
      "query vec": "查询向量",
      "LLM writes a": "LLM 生成",
      "hypothetical answer:": "假想答案：",
      "embed THAT, not": "嵌入这段答案，",
      "the question": "而非问题",
      "The raw query vector points into the wrong region, so the answering document never reaches the top-N. HyDE asks the model to write the document that would answer the question, embeds that hypothetical answer instead, and the retrieval vector lands where the real document already lives.": "原始查询向量指向错误区域，因此包含答案的文档进不了 top-N。HyDE 让模型先编写一份能回答问题的文档，再对这份假想答案而非问题进行嵌入，使检索向量落到真实文档所在的区域。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "\"AbortMultipartOnFail",
        "reason": "HyDE 演示中假想英文文档的原始检索语料，不改变嵌入示例输入"
      },
      {
        "text": "aborts the S3 upload",
        "reason": "HyDE 演示中假想英文文档的原始检索语料，不改变嵌入示例输入"
      },
      {
        "text": "and decrements the",
        "reason": "HyDE 演示中假想英文文档的原始检索语料，不改变嵌入示例输入"
      },
      {
        "text": "retry budget...\"",
        "reason": "HyDE 演示中假想英文文档的原始检索语料，不改变嵌入示例输入"
      }
    ]
  },
  "cd-bleu-overlap": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "BLEU N-GRAM OVERLAP": "BLEU N-gram 重合",
      "count matches, clamp, penalize": "计数匹配、截断、惩罚",
      "candidate": "候选",
      "reference": "参考",
      "precision": "精确率",
      "(too short)": "（过短）",
      "BLEU is counting. Each candidate n-gram that appears in the reference scores a match; the clipped count over the candidate length is modified n-gram precision. A candidate shorter than the reference takes a brevity penalty, so high precision on a stub still loses. ROUGE-L instead rewards the longest common subsequence.": "BLEU 本质上是在计数。候选中的每个 N-gram，只要出现在参考文本里就算匹配；截断后的计数除以候选长度，得到修正 N-gram 精确率。候选比参考短时还会受到长度惩罚，因此一小段文本即使精确率高也会输。ROUGE-L 则奖励最长公共子序列。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "the",
        "reason": "BLEU N-gram 匹配中的原始英文 token 样本，翻译会改变重合计数"
      },
      {
        "text": "cat",
        "reason": "BLEU N-gram 匹配中的原始英文 token 样本，翻译会改变重合计数"
      },
      {
        "text": "sat",
        "reason": "BLEU N-gram 匹配中的原始英文 token 样本，翻译会改变重合计数"
      },
      {
        "text": "mat",
        "reason": "BLEU N-gram 匹配中的原始英文 token 样本，翻译会改变重合计数"
      }
    ]
  },
  "cd-reliability-diagram": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "CALIBRATION RELIABILITY": "校准可靠性",
      "confidence vs accuracy": "置信度与准确率",
      "perfect": "理想校准",
      "predicted confidence": "预测置信度",
      "observed accuracy": "实测准确率",
      "ECE: gap to diagonal": "ECE：与对角线的差距",
      "Bin predictions by stated confidence and plot observed accuracy. A calibrated model sits on the diagonal. The orange gaps are where it claims more confidence than it earns; the expected calibration error is the bin-weighted average of those gaps. Perplexity asks if held-out text is plausible at all; calibration asks if the confidence is honest.": "按模型报告的置信度给预测分箱，再绘制观测准确率。校准良好的模型落在对角线上。橙色差距表示宣称的置信度高于实际表现；期望校准误差是这些差距按分箱加权后的平均值。困惑度衡量留出文本是否合理，校准则衡量置信度是否诚实。"
    },
    "patterns": [],
    "preserve": []
  },
  "cd-zero-shard": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "ZeRO STATE SHARDING": "ZeRO 状态分片",
      "optimiser split 1/N per rank": "每个 rank 分到 1/N 优化器状态",
      "each rank: full params, but only 1/N of the optimiser": "每个 rank：完整参数，仅 1/N 优化器状态",
      "params": "参数",
      "reduce_scatter grads in": "reduce_scatter 分发梯度",
      "allgather params out": "allgather 汇集参数",
      "Vanilla DDP replicates the optimiser state on every rank, the largest allocation in the stack. ZeRO stage 1 gives each rank only 1/N of the Adam moments. reduce_scatter delivers each rank its gradient shard, it steps locally, then allgather broadcasts the updated parameter shards back so every rank rebuilds the full model. Memory drops linearly; the wire cost equals one allreduce.": "普通 DDP 会在每个 rank 上复制优化器状态，而它通常是整个栈中最大的内存占用。ZeRO 第 1 阶段让每个 rank 只持有 1/N 的 Adam 动量。reduce_scatter 将梯度分片送到各个 rank，各 rank 本地更新，再通过 allgather 广播更新后的参数分片，使每个 rank 重建完整模型。内存占用线性下降，通信量相当于一次 allreduce。"
    },
    "patterns": [
      [
        "^shard (\\d+)$",
        "分片 $1"
      ]
    ],
    "preserve": [
      {
        "text": "Adam",
        "reason": "优化器名称与分布式进程编号"
      },
      {
        "text": "rank 0",
        "reason": "优化器名称与分布式进程编号"
      },
      {
        "text": "rank 1",
        "reason": "优化器名称与分布式进程编号"
      },
      {
        "text": "rank 2",
        "reason": "优化器名称与分布式进程编号"
      },
      {
        "text": "rank 3",
        "reason": "优化器名称与分布式进程编号"
      }
    ]
  },
  "cd-pipeline-bubble": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "PIPELINE PARALLEL": "流水线并行",
      "microbatches fill the stages": "微批次填满各阶段",
      "bubble": "气泡",
      "bubble fraction = (N-1)/(M+N-1)  =  3/7  ≈  43% at M=4, N=4": "气泡比例 = (N-1)/(M+N-1)  =  3/7  ≈  43%（M=4，N=4）",
      "Each stage lives on its own rank; a microbatch enters stage 0, hands its activation to stage 1, and so on diagonally through time. The shaded triangle is the bubble, the idle time while the pipeline fills and drains. More microbatches per step shrink the bubble: (N-1)/(M+N-1) falls from 43% at M=4 to under 5% at M=64.": "每个阶段位于独立 rank 上。一个微批次进入阶段 0 后，将激活交给阶段 1，如此沿时间轴斜向前进。阴影三角形就是气泡，即流水线填充与排空时的空闲时间。每步增加微批次数可缩小气泡：(N-1)/(M+N-1) 从 M=4 时的 43%，降到 M=64 时不足 5%。"
    },
    "patterns": [
      [
        "^stage (\\d+)$",
        "阶段 $1"
      ]
    ],
    "preserve": []
  },
  "cd-attack-taxonomy": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "JAILBREAK TAXONOMY": "越狱攻击分类",
      "six trust boundaries": "六条信任边界",
      "assistant": "助手",
      "trust core": "信任核心",
      "role-play": "角色扮演",
      "persona": "人设",
      "instruction-override": "覆盖指令",
      "system authority": "系统权限",
      "context-smuggling": "上下文夹带",
      "content/instruction gap": "内容与指令的间隙",
      "multi-turn-ramp": "多轮递进",
      "history as contract": "将历史视作契约",
      "encoding-trick": "编码技巧",
      "surface form": "表层形式",
      "prefix-injection": "前缀注入",
      "next-token": "下一个 token",
      "A safety harness without a taxonomy is a coin flip. Each of the six categories names one trust boundary an attack abuses, from the assistant persona to its next-token decision. Naming the boundary turns an attack stream into a histogram, the histogram into a coverage chart, and the chart into the next sprint.": "没有分类体系的安全测试框架，如同抛硬币。六个类别分别命名攻击所利用的信任边界，范围从助手人设到下一个 token 的选择。明确边界后，攻击流可以变成直方图，直方图变成覆盖图，再据此安排下一轮迭代。"
    },
    "patterns": [],
    "preserve": []
  },
  "cd-output-router": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "OUTPUT POLICY ROUTER": "输出策略路由",
      "classifiers → severity → action": "分类器 → 严重度 → 动作",
      "model output → three classifiers run in parallel": "模型输出 → 三个分类器并行运行",
      "policy": "策略",
      "router": "路由器",
      "toxicity": "有害内容",
      "slur / harassment": "侮辱 / 骚扰",
      "PII": "个人信息",
      "email · SSN · card": "邮箱 · SSN · 卡号",
      "leakage": "泄漏",
      "system-prompt echo": "系统 prompt 回显",
      "log": "记录",
      "warn": "警告",
      "redact": "脱敏",
      "block": "阻止",
      "severity → action": "严重度 → 动作",
      "Input checks are not enough; an output-side classifier sees the actual response and asks if it is safe to ship. Three independent classifiers (toxicity, PII, leakage) return a severity, and the router picks the action by the worst finding: log, warn, redact, or block. Classifiers run in parallel with streaming so the latency hides behind the final flush.": "仅检查输入还不够；输出侧分类器会检查实际响应，判断是否能安全交付。三个独立分类器（有害内容、个人信息和泄漏）各自返回严重度，路由器按最严重的发现选择记录、警告、脱敏或阻止。分类器与流式输出并行运行，将额外延迟藏在最终刷新之前。"
    },
    "patterns": [],
    "preserve": []
  },
  "cd-constitution-loop": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "CONSTITUTIONAL RULES": "宪法规则",
      "draft → fix → re-check": "草稿 → 修正 → 复查",
      "draft": "草稿",
      "rules engine": "规则引擎",
      "fixer": "修正器",
      "revised": "修订稿",
      "rules 2nd pass": "第二轮规则检查",
      "verdict": "判定",
      "violation: code lacks runnable block": "违规：代码缺少可运行代码块",
      "accepted: revision satisfies every rule": "已接受：修订稿满足所有规则",
      "A rule is a name, a predicate, and an explanation; anything missing one of those is a vibe. The constitution lives in YAML under version control. The engine flags each violation, the fixer proposes a revision, and a second pass confirms the revision satisfies every rule before the response is accepted or escalated.": "规则由名称、判定条件与说明组成，少了任何一项都只能算感觉。宪法规则保存在受版本控制的 YAML 中。引擎标记每条违规，修正器提出修订；第二轮检查确认修订稿满足所有规则后，才接受响应或升级处理。"
    },
    "patterns": [],
    "preserve": []
  }
};
