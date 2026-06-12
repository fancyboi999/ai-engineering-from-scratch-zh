# 为什么要用多 agent？

> 单个 agent 会撞墙。聪明的做法不是造一个更大的 agent，而是用更多 agent。

**类型：** Learn
**语言：** TypeScript
**前置要求：** Phase 14（Agent 工程）
**预计时间：** ~60 分钟

## 学习目标

- 识别单 agent 的天花板（上下文溢出、专长混杂、串行瓶颈），并说清什么时候拆成多个 agent 才是对的
- 对比各种 orchestration 模式（流水线、并行扇出、supervisor、层级式），并为给定的任务结构选对模式
- 设计一套多 agent 系统，角色边界清晰、有共享状态、有通信契约
- 分析多 agent 复杂度（延迟、成本、调试难度）相对单 agent 简洁性的取舍

## 问题背景

你在 Phase 14 里造了一个单 agent。它能跑。它能读文件、跑命令、调 API、对结果做推理。然后你把它丢进一个真实代码库：200 个文件、三种语言、依赖基础设施的测试，外加一条「写代码前先去调研外部 API」的要求。

agent 卡住了。不是因为 LLM 笨，而是任务超出了一个 agent 循环能扛的量。上下文窗口被文件内容塞满。agent 忘了 40 次工具调用之前读过什么。它想同时当研究员、程序员和评审，结果三样都干得稀烂。

这就是单 agent 的天花板。只要任务需要以下任意一点，你每次都会撞上：

- **上下文超出单个窗口能装的量** —— 读 50 个文件就冲破 200k token
- **不同阶段需要不同的专长** —— 调研需要的 prompt 跟生成代码完全不同
- **有些活儿本可以并行** —— 既然能同时读三个文件，为什么要一个接一个串行读？

## 核心概念

### 单 agent 的天花板

一个单 agent 就是一个循环、一个上下文窗口、一条 system prompt。想象一下：

```
┌─────────────────────────────────────────┐
│            SINGLE AGENT                 │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │         Context Window            │  │
│  │                                   │  │
│  │  research notes                   │  │
│  │  + code files                     │  │
│  │  + test output                    │  │
│  │  + review feedback                │  │
│  │  + API docs                       │  │
│  │  + ...                            │  │
│  │                                   │  │
│  │  ██████████████████████ FULL ███  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  One system prompt tries to cover       │
│  research + coding + review + testing   │
│                                         │
│  Result: mediocre at everything         │
└─────────────────────────────────────────┘
```

有三处会崩：

1. **上下文饱和** —— 工具结果越堆越多。到第 30 轮，agent 已经吞下了 150k token 的文件内容、命令输出和之前的推理。第 5 轮的关键细节被冲掉了。

2. **角色混乱** —— 一条写着「你是研究员、程序员、评审、测试员」的 system prompt，产出的 agent 是半吊子研究、半吊子写码，评审永远收不了尾。

3. **串行瓶颈** —— agent 先读文件 A，再读 B，再读 C。三次串行 LLM 调用、三次串行工具执行。毫无并行可言。

### 多 agent 解法

把活儿拆开。给每个 agent 一份工作、一个上下文窗口、一条为这份工作调好的 system prompt：

```
┌──────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR                          │
│                                                          │
│  "Build a REST API for user management"                  │
│                                                          │
│         ┌──────────┬──────────┬──────────┐               │
│         │          │          │          │               │
│         ▼          ▼          ▼          ▼               │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│   │RESEARCHER│ │  CODER   │ │ REVIEWER │ │  TESTER  │  │
│   │          │ │          │ │          │ │          │  │
│   │ Reads    │ │ Writes   │ │ Checks   │ │ Runs     │  │
│   │ docs,    │ │ code     │ │ code     │ │ tests,   │  │
│   │ finds    │ │ based on │ │ quality, │ │ reports  │  │
│   │ patterns │ │ research │ │ finds    │ │ results  │  │
│   │          │ │ + spec   │ │ bugs     │ │          │  │
│   └─────┬────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
│         │           │            │             │         │
│         └───────────┴────────────┴─────────────┘         │
│                          │                               │
│                     Merge results                        │
└──────────────────────────────────────────────────────────┘
```

每个 agent 都有：
- 一条聚焦的 system prompt（「你是代码评审。你唯一的工作就是找 bug。」）
- 自己独立的上下文窗口（不被别的 agent 的工作污染）
- 清晰的输入/输出契约（接收调研笔记，输出代码）

### 真实在这么干的系统

**Claude Code subagent** —— Claude Code 用 `Task` 派生 subagent 时，会创建一个带受限任务的子 agent。父 agent 保持自己的上下文干净。子 agent 做聚焦的活儿，返回一段摘要。

**Devin** —— 跑一个 planner agent、一个 coder agent、一个 browser agent。planner 把活儿拆成步骤，coder 写代码，browser 调研文档。各自上下文分开。

**多 agent 编码团队（SWE-bench）** —— SWE-bench 上表现最好的系统，会用一个读代码库的 researcher、一个设计修复方案的 planner、一个实现它的 coder。单 agent 系统得分更低。

**ChatGPT Deep Research** —— 并行派生多个搜索 agent，每个从不同角度探索，然后综合结果。

### 谱系

多 agent 不是非黑即白，它是一条连续谱系：

```
SIMPLE ──────────────────────────────────────────── COMPLEX

 Single        Sub-         Pipeline      Team         Swarm
 Agent         agents

 ┌───┐       ┌───┐        ┌───┐───┐    ┌───┐───┐    ┌─┐┌─┐┌─┐
 │ A │       │ A │        │ A │ B │    │ A │ B │    │ ││ ││ │
 └───┘       └─┬─┘        └───┘─┬─┘    └─┬─┘─┬─┘    └┬┘└┬┘└┬┘
               │                │        │   │       ┌┴──┴──┴┐
             ┌─┴─┐          ┌───┘───┐    │   │       │shared │
             │ a │          │ C │ D │  ┌─┴───┴─┐    │ state │
             └───┘          └───┘───┘  │  msg   │    └───────┘
                                       │  bus   │
 1 loop      Parent +      Stage by    │       │    N peers,
 1 context   child tasks   stage       └───────┘    emergent
                                       Explicit      behavior
                                       roles
```

**单 agent** —— 一个循环、一条 prompt。适合简单任务。

**Subagent** —— 父 agent 为聚焦的子任务派生子 agent。父 agent 维护整体计划，子 agent 汇报结果。Claude Code 就是这么干的。

**流水线（Pipeline）** —— agent 顺序执行。agent A 的输出成为 agent B 的输入。适合分阶段的工作流：调研 -> 写码 -> 评审 -> 测试。

**团队（Team）** —— agent 并行运行，共享一条消息总线。每个有自己的角色，由一个 orchestrator 协调。适合需要同时动用多种技能的场景。

**Swarm** —— 大量相同或近乎相同的 agent，共享状态。没有固定的 orchestrator。agent 从队列里领活儿。适合高吞吐的并行任务。

### 四种多 agent 模式

#### 模式 1：流水线（Pipeline）

```
Input ──▶ Agent A ──▶ Agent B ──▶ Agent C ──▶ Output
          (research)  (code)      (review)
```

每个 agent 变换数据再往下传。容易推理。某一环出错会卡住后面所有环节。

#### 模式 2：扇出 / 扇入（Fan-out / Fan-in）

```
                ┌──▶ Agent A ──┐
                │              │
Input ──▶ Split ├──▶ Agent B ──├──▶ Merge ──▶ Output
                │              │
                └──▶ Agent C ──┘
```

把活儿拆给并行的多个 agent，再合并结果。适合能拆成独立子任务的任务。

#### 模式 3：Orchestrator-Worker

```
                    ┌──────────┐
                    │  Orch.   │
                    └──┬───┬───┘
                  task │   │ task
                 ┌─────┘   └─────┐
                 ▼               ▼
           ┌──────────┐   ┌──────────┐
           │ Worker A │   │ Worker B │
           └──────────┘   └──────────┘
```

一个聪明的 orchestrator 决定干什么、把活儿派给 worker、再综合结果。orchestrator 本身就是一个 agent，工具里包含派生和管理其他 agent 的能力。

#### 模式 4：对等 Swarm（Peer Swarm）

```
         ┌───┐ ◄──── msg ────▶ ┌───┐
         │ A │                  │ B │
         └─┬─┘                  └─┬─┘
           │                      │
      msg  │    ┌───────────┐     │ msg
           └───▶│  Shared   │◄────┘
                │  State    │
           ┌───▶│  / Queue  │◄────┐
           │    └───────────┘     │
      msg  │                      │ msg
         ┌─┴─┐                  ┌─┴─┐
         │ C │ ◄──── msg ────▶ │ D │
         └───┘                  └───┘
```

没有中心 orchestrator。agent 之间点对点通信。决策从交互中涌现。更难调试，但能扩展到很多 agent。

### 什么时候不要用多 agent

多 agent 会带来复杂度。agent 之间的每条消息都是一个潜在故障点。调试从「读一段对话」变成「在五个 agent 之间追踪消息」。

**这些情况下就留在单 agent：**
- 任务能装进一个上下文窗口（工作数据少于约 100k token）
- 你不需要为不同阶段配不同的 system prompt
- 串行执行已经够快
- 任务足够简单，拆开它带来的开销比价值还大

**复杂度成本：**
- 每个 agent 边界都是一次有损压缩：agent A 的完整上下文被压成一条发给 agent B 的消息
- 协调逻辑（谁做什么、何时做、按什么顺序做）本身就是 bug 的来源
- 延迟上升：N 个 agent 意味着最少 N 次串行 LLM 调用，如果它们要来回对话还更多
- 成本翻倍：每个 agent 各自烧 token

经验法则：如果一个任务工具调用少于 20 次、能装进 100k token，就保持单 agent。

```figure
swarm-messages
```

## 动手构建

### 第 1 步：过载的单 agent

下面是一个想包揽一切的单 agent。它有一条巨大的 system prompt，一个上下文窗口同时装着调研、代码和评审：

```typescript
type AgentResult = {
  content: string;
  tokensUsed: number;
  toolCalls: number;
};

async function singleAgentApproach(task: string): Promise<AgentResult> {
  const systemPrompt = `You are a full-stack developer. You must:
1. Research the requirements
2. Write the code
3. Review the code for bugs
4. Write tests
Do ALL of these in a single conversation.`;

  const contextWindow: string[] = [];
  let totalTokens = 0;
  let totalToolCalls = 0;

  const research = await fakeLLMCall(systemPrompt, `Research: ${task}`);
  contextWindow.push(research.output);
  totalTokens += research.tokens;
  totalToolCalls += research.calls;

  const code = await fakeLLMCall(
    systemPrompt,
    `Given this research:\n${contextWindow.join("\n")}\n\nNow write code for: ${task}`
  );
  contextWindow.push(code.output);
  totalTokens += code.tokens;
  totalToolCalls += code.calls;

  const review = await fakeLLMCall(
    systemPrompt,
    `Given all previous context:\n${contextWindow.join("\n")}\n\nReview the code.`
  );
  contextWindow.push(review.output);
  totalTokens += review.tokens;
  totalToolCalls += review.calls;

  return {
    content: contextWindow.join("\n---\n"),
    tokensUsed: totalTokens,
    toolCalls: totalToolCalls,
  };
}
```

这种做法的问题：
- 上下文窗口每经过一个阶段都在增长。到评审这一步，它同时装着调研笔记、代码和之前的推理。
- system prompt 是通用的，没法为每个阶段调优。
- 没有任何东西在并行。

### 第 2 步：专精 agent

现在把它拆开。每个 agent 只干一份活儿：

```typescript
type SpecialistAgent = {
  name: string;
  systemPrompt: string;
  run: (input: string) => Promise<AgentResult>;
};

function createSpecialist(name: string, systemPrompt: string): SpecialistAgent {
  return {
    name,
    systemPrompt,
    run: async (input: string) => {
      const result = await fakeLLMCall(systemPrompt, input);
      return {
        content: result.output,
        tokensUsed: result.tokens,
        toolCalls: result.calls,
      };
    },
  };
}

const researcher = createSpecialist(
  "researcher",
  "You are a technical researcher. Read documentation, find patterns, and summarize findings. Output only the facts needed for implementation."
);

const coder = createSpecialist(
  "coder",
  "You are a senior TypeScript developer. Given requirements and research notes, write clean, tested code. Nothing else."
);

const reviewer = createSpecialist(
  "reviewer",
  "You are a code reviewer. Find bugs, security issues, and logic errors. Be specific. Cite line numbers."
);
```

每个专精 agent 都有一条聚焦的 prompt。每个都拿到一个只装它所需输入的干净上下文窗口。

### 第 3 步：通过消息协调

用显式的消息传递把专精 agent 串起来：

```typescript
type AgentMessage = {
  from: string;
  to: string;
  content: string;
  timestamp: number;
};

async function multiAgentApproach(task: string): Promise<AgentResult> {
  const messages: AgentMessage[] = [];
  let totalTokens = 0;
  let totalToolCalls = 0;

  const researchResult = await researcher.run(task);
  messages.push({
    from: "researcher",
    to: "coder",
    content: researchResult.content,
    timestamp: Date.now(),
  });
  totalTokens += researchResult.tokensUsed;
  totalToolCalls += researchResult.toolCalls;

  const coderInput = messages
    .filter((m) => m.to === "coder")
    .map((m) => `[From ${m.from}]: ${m.content}`)
    .join("\n");

  const codeResult = await coder.run(coderInput);
  messages.push({
    from: "coder",
    to: "reviewer",
    content: codeResult.content,
    timestamp: Date.now(),
  });
  totalTokens += codeResult.tokensUsed;
  totalToolCalls += codeResult.toolCalls;

  const reviewerInput = messages
    .filter((m) => m.to === "reviewer")
    .map((m) => `[From ${m.from}]: ${m.content}`)
    .join("\n");

  const reviewResult = await reviewer.run(reviewerInput);
  messages.push({
    from: "reviewer",
    to: "orchestrator",
    content: reviewResult.content,
    timestamp: Date.now(),
  });
  totalTokens += reviewResult.tokensUsed;
  totalToolCalls += reviewResult.toolCalls;

  return {
    content: messages.map((m) => `[${m.from} -> ${m.to}]: ${m.content}`).join("\n\n"),
    tokensUsed: totalTokens,
    toolCalls: totalToolCalls,
  };
}
```

每个 agent 只收到发给它的消息。没有上下文污染。researcher 那 50k token 的文档阅读永远不会进入 reviewer 的上下文。

### 第 4 步：对比

```typescript
async function compare() {
  const task = "Build a rate limiter middleware for an Express.js API";

  console.log("=== Single Agent ===");
  const single = await singleAgentApproach(task);
  console.log(`Tokens: ${single.tokensUsed}`);
  console.log(`Tool calls: ${single.toolCalls}`);

  console.log("\n=== Multi-Agent ===");
  const multi = await multiAgentApproach(task);
  console.log(`Tokens: ${multi.tokensUsed}`);
  console.log(`Tool calls: ${multi.toolCalls}`);
}
```

多 agent 版本用的总 token 更多（三个 agent、三次独立 LLM 调用），但每个 agent 的上下文都保持干净。每个阶段的质量都提升了，因为 system prompt 是专精的。

## 实际使用

本课产出一份可复用的 prompt，用来判断什么时候该上多 agent。见 `outputs/prompt-multi-agent-decision.md`。

## 练习

1. 加第四个专精 agent：一个「tester」agent，接收 coder 的代码和 reviewer 的评审反馈，然后写测试
2. 改造流水线，让 reviewer 能把反馈回传给 coder 做一轮修订（最多 2 轮）
3. 把串行流水线改成扇出：让 researcher 和一个「需求分析」agent 并行跑，再合并它们的输出，然后传给 coder

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么意思 |
|------|----------------|----------------------|
| Swarm | 「AI agent 的蜂群意识」 | 一组对等 agent，共享状态、没有固定头领。行为从局部交互中涌现。 |
| Orchestrator | 「老板 agent」 | 一个工具里包含派生和管理其他 agent 能力的 agent。它做规划和分派，但可能不亲自干活儿。 |
| Coordinator | 「交警」 | 一个非 agent 组件（通常只是代码，不是 LLM），按规则在 agent 之间路由消息。 |
| Consensus | 「agent 们达成一致」 | 一种协议，多个 agent 必须先达成一致才能继续。用在需要解决输出冲突的场景。 |
| Emergent behavior | 「agent 们自己琢磨出来的」 | 从 agent 交互中产生、却没被显式编程的系统级模式。可能有用，也可能有害。 |
| Fan-out / fan-in | 「agent 版 map-reduce」 | 把任务拆给并行的多个 agent（扇出），再合并它们的结果（扇入）。 |
| Message passing | 「agent 互相交流」 | agent 之间的通信机制：从一个 agent 发往另一个 agent 的结构化数据，用来替代共享上下文窗口。 |

## 延伸阅读

- [The Landscape of Emerging AI Agent Architectures](https://arxiv.org/abs/2409.02977) —— 多 agent 模式综述
- [AutoGen: Enabling Next-Gen LLM Applications](https://arxiv.org/abs/2308.08155) —— 微软的多 agent 对话框架
- [Claude Code subagents documentation](https://docs.anthropic.com/en/docs/claude-code) —— Claude Code 如何用 Task 分派
- [CrewAI documentation](https://docs.crewai.com/) —— 基于角色的多 agent 框架
