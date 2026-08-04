# 基于角色的 Agent 团队——角色、任务与流程

> 四个原语：Agent、Task、Crew、Process。两种顶层形态：Crew（自主、基于角色的协作）和 Flow（事件驱动、确定性）。CrewAI 是 2026 年的参考实现，其文档说得很直白：「对任何生产就绪的应用，从 Flow 开始。」

**类型：** Learn + Build
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 12（工作流模式）、阶段 14 · 14（Actor 模型）
**预计时间：** ~75 分钟

## 学习目标

- 说出 CrewAI 的四个原语（Agent、Task、Crew、Process），各自掌管什么。
- 区分 Sequential、Hierarchical 和计划中的 Consensus 流程；按工作负载各选其一。
- 区分 Crew（自主、基于角色）和 Flow（事件驱动、确定性），并解释文档的生产建议。
- 用 `@tool` 装饰器和 `BaseTool` 子类接入工具；权衡结构化输出 vs 自由文本。
- 说出 CrewAI 的四种记忆类型，以及各自什么时候划算。
- 用标准库实现一个三 agent crew（研究员、写手、编辑）来产出一份简报。
- 揪出 CrewAI 的三个失败模式：prompt 膨胀、manager-LLM 税、脆弱的交接。

## 问题背景

采用多 agent 框架的团队都撞上同一堵墙。「自主协作」在演示里听着很棒。然后一个客户报了 bug，你需要确定性的重放。或者财务问一个 LLM 路由的 crew 每次运行花多少钱。或者值班的人需要知道凌晨 3 点是哪个 agent 卡住了。

自由形式的 LLM 路由 crew 对这些都答不利索。纯 DAG 全都答得上来，但丢掉了一个头脑风暴 agent 所需的探索性形态。

CrewAI 的拆分对这个取舍是诚实的。Crew 用于协作的、基于角色的、探索性的工作。Flow 用于事件驱动的、代码掌管的、可审计的生产。同一个框架，两种形态，按场景挑。

## 核心概念

### 四个原语

CrewAI 的接触面很小。记住这个，剩下的都是配置。

- **Agent。** `role + goal + backstory + tools + （可选）llm`。backstory 是承重的。它塑造语气、判断、agent 何时停下。tool 是 agent 能调用的函数（下面详述）。
- **Task。** `description + expected_output + agent + （可选）context + （可选）output_pydantic`。一个可复用的工作单元。`expected_output` 是契约。`context` 列出其输出会被传入的上游任务。`output_pydantic` 强制一个结构化形态。
- **Crew。** 容器。掌管 `agents` 列表、`tasks` 列表、`process`，以及可选的 `memory` + `verbose` + `manager_llm` 设置。
- **Process。** 执行策略。Sequential、Hierarchical、Consensus（计划中）。决定运行的形态。

agent 之间不直接看到彼此。task 引用 agent。Crew 给 task 排序。Process 决定谁挑下一个 task。整个心智模型就这些。

> **校验基准** CrewAI 0.86（2026-05）。较新版本可能重命名或合并流程类型；在依赖某个特定形态前查阅 [CrewAI Processes 文档](https://docs.crewai.com/concepts/processes)。

### Sequential vs Hierarchical vs Consensus

- **Sequential。** task 按声明顺序运行。task N 的输出可作为 `context` 供 task N+1 使用。成本最低。最可预测。当顺序固定时用。
- **Hierarchical。** 一个 manager Agent（单独的 LLM 调用）在专家之间路由。CrewAI 要么从你的 `manager_llm` 配置、要么用默认值派生出 manager。manager 每一轮挑下一个 task，可以拒绝或重新路由。当你有四个或更多专家、且顺序确实取决于先前输出时用。
- **Consensus。** 计划中，公开 API 里目前未实现。文档为一个未来的基于投票的流程预留了这个名字。今天别依赖它。

Hierarchical 在每个专家调用之上加了一个每轮的 LLM 调用（manager）。在一次五步运行里 token 成本可能翻三倍。只在你需要那个路由时才为它买单。

### Crew vs Flow

这是 2026 年文档开篇的框定。

- **Crew。** LLM 驱动的自主性。框架在运行时挑形态。适合：研究、头脑风暴、初稿，以及任何「路径本身就是答案一部分」的地方。难重放。难测试。原型成本低。
- **Flow。** 你掌管的事件驱动图。`@start` 标记入口。`@listen(topic)` 标记一个步骤，当另一个步骤发出那个 topic 时触发。每个步骤都是普通 Python（内部可以调一个 Crew）。适合：生产。可观测。可测试。确定性。

文档 2026 年的生产建议：从 Flow 开始。当自主性对得起它的成本时，把 Crew 作为 `Crew.kickoff()` 调用折进 Flow 步骤里。Flow 给你审计轨迹，Crew 给你探索。组合，别二选一。

### 工具集成

给 Agent 接工具有三种方式。挑合适的最简单那个。

1. **`@tool` 装饰器。** 纯函数变成工具。签名就是 schema；docstring 就是 LLM 看到的描述。最适合一次性的小助手。

   ```python
   from crewai.tools import tool

   @tool("Search the web")
   def search(query: str) -> str:
       """Return top results for the query."""
       return run_search(query)
   ```

2. **`BaseTool` 子类。** 基于类的工具，带显式参数 schema、异步支持、重试。当工具有状态（一个客户端、一个缓存）或需要结构化参数时用。

   ```python
   from crewai.tools import BaseTool
   from pydantic import BaseModel

   class SearchArgs(BaseModel):
       query: str
       limit: int = 10

   class SearchTool(BaseTool):
       name = "web_search"
       description = "Search the web and return top results."
       args_schema = SearchArgs

       def _run(self, query: str, limit: int = 10) -> str:
           return self.client.search(query, limit=limit)
   ```

3. **内置工具包。** CrewAI 提供第一方适配器：`SerperDevTool`、`FileReadTool`、`DirectoryReadTool`、`CodeInterpreterTool`、`RagTool`、`WebsiteSearchTool`。一个 import 就接好。

结构化输出用 Pydantic。在 Task 上传 `output_pydantic=MyModel`。CrewAI 对照模型校验 LLM 响应，要么强制转换要么重试。把它和一个紧凑的 `expected_output` 字符串配对。自由文本输出对初稿没问题；结构化输出才是下游 Flow 能消费的东西。

### 记忆 hook

CrewAI 开箱提供四种记忆类型。它们可组合：一个 Crew 可以一次启用全部四种。

> **校验基准** CrewAI 0.86（2026-05）。近期版本把一切都路由进一个统一的 `Memory` 系统，它包裹这四个存储。下面的概念模型仍然成立，但公开类接触面在较新版本里可能收拢成单个 `Memory` 入口；当前 API 见 [CrewAI memory 文档](https://docs.crewai.com/concepts/memory)。

- **Short-term。** 单次运行内的对话缓冲区。运行结束时清空。
- **Long-term。** 跨运行持久化。存在一个向量数据库里（默认 Chroma，可换）。按与当前任务的相似度检索。
- **Entity。** 按实体的事实。「客户 X 在企业版套餐上。」按实体而非相似度为键。跨运行存活。
- **Contextual。** 装配时检索。在 Agent 需要的那一刻拉取相关记忆，而非预加载。

在 Crew 上用 `memory=True` 或按类型配置启用。由你配置的一个 embedding 提供方支撑（默认 OpenAI，可换成本地）。记忆是 CrewAI 相比更薄框架对得起身价的地方之一；纯 LangGraph 要求你自己把这些一个个接好。

### 基于角色的团队什么时候合适

- 三到六个有具名角色和协作工作流的 agent。起草、审查、规划、头脑风暴。
- 路由场景，其中 LLM 对下一步的判断本身就是价值的一部分（Hierarchical）。
- 任何团队读 `role + goal + backstory` 比读一个图定义更舒服的地方。

### 什么时候不合适

- 有严格顺序的确定性 DAG。用 LangGraph（第 13 课）。图形态才是对的抽象；CrewAI 的角色框定是摩擦。
- 亚秒级延迟预算。Hierarchical 增加往返。连 Sequential 都要序列化那些包含 backstory 和先前输出的 prompt。
- 单 agent 循环。跳过框架；一个 agent 循环（第 1 课）加一个工具注册表更短。

第 17 课（Agent 框架取舍）用一张矩阵把这个铺开。简而言之：CrewAI 坐在「协作的、基于角色的」那个角落。

### 依赖形态

独立于 LangChain。Python 3.10 到 3.13。用 `uv`。star 数：见 [crewAIInc/crewAI](https://github.com/crewAIInc/crewAI)（截至 2026-05 的快照）。AWS Bedrock 集成有文档；厂商基准报告在 QA 工作负载上相比 LangGraph 有可观提速，但方法论（数据集、硬件、评估指标）未公开，所以把框架厂商的数字只当方向性参考。

### 这个模式在哪里会出错

- **backstory 导致的 prompt 膨胀。** 每个 agent 一段 2000 词的 backstory、加一个五 agent 的 crew，在第一次工具调用之前就把上下文预算烧光了。backstory 控制在 200 词以内。在 agent 之间复用措辞；别把团队风格重复五遍。
- **manager-LLM 的 token 税。** Hierarchical 流程在每个专家调用前加一个 manager LLM 调用。在一个五任务 crew 上那是六次 LLM 调用而不是五次，而且 manager 调用带着完整的任务列表加先前输出。除非路由取决于输出，否则切到 Sequential。
- **脆弱的交接。** task N 的 `expected_output` 是「一份大纲」。task N+1 把它当 `context` 读，试图解析三个 section。LLM 产出了四个。下游 Agent 即兴发挥。用 task N 上的 `output_pydantic` 修，这样 task N+1 读的是一个带类型对象，而非自由文本。
- **Crew 当生产。** 自由形式的 Crew 没套 Flow 包装就上了生产。输出波动很大；重放不可能；值班的人没法把一次坏运行和一次好运行做 diff。用 Flow 包起来。

```figure
ae-crew-vs-flow
```

## 动手构建

`code/main.py` 实现两种形态的标准库版本，外加一个三 agent crew。

形态：

- `Agent`、`Task` dataclass，匹配 CrewAI 的接触面。
- `SequentialCrew.kickoff(inputs)` 按声明顺序跑 task，把输出作为 `context` 串起来。
- `HierarchicalCrew.kickoff(topic)` 加一个 manager Agent，每轮挑下一个专家，在「done」处停。
- 带 `@start` 和 `@listen(topic)` 装饰器的 `Flow`，一个迷你事件循环，外加一条轨迹。
- `tool(name)` 装饰器，镜像 CrewAI 的 `@tool` 形态。
- 带 `short_term`、`long_term`、`entity` 存储的 `Memory`；mock 的相似度用 numpy。
- mock 的 LLM 响应是硬编码字符串，按角色加输入前缀为键。无网络。确定性。

具体演示：研究员、写手、编辑组成的 crew 产出一份关于「agent engineering 2026」的简报。研究员拉取（mock 的）来源。写手起草。编辑收紧。同一个 crew 跑一遍 Flow 来展示确定性形态。

运行它：

```bash
python3 code/main.py
```

轨迹覆盖：sequential crew 把输出通过 `context` 串起来、带 manager 选择的 hierarchical crew（研究员、写手、编辑，然后「done」）、flow 用显式 topic（`researched`、`drafted`、`edited`）跑同样的三步、通过 `@tool` 路由的工具调用，以及长期记忆跨两次 kickoff 存活。

Crew 的轨迹是流动的；manager 原则上可以重排序。Flow 的轨迹是固定的。这个选择就是这一课的要点。

## 实际使用

- **CrewAI Flow** 用于生产。哪怕 Flow 只有一步调用 `Crew.kickoff()`。Flow 给出审计边界。
- **CrewAI Crew（Sequential）** 用于顺序清晰的协作工作，尤其是初稿和审查循环。
- **CrewAI Crew（Hierarchical）** 当路由取决于输出、且你有四个或更多专家时。
- **LangGraph**（第 13 课）用于显式状态机、持久恢复、严格顺序。
- **AutoGen v0.4**（第 14 课）用于 actor 模型并发和故障隔离。
- **OpenAI Agents SDK**（第 16 课）用于 OpenAI 优先、带 handoff 和 guardrail 的产品。
- **Claude Agent SDK**（第 17 课）用于 Claude 优先、带子 agent 和会话存储的产品。

## 拿去用

`outputs/skill-crew-or-flow.md` 为一个任务在 Crew 和 Flow 之间挑选，并脚手架出最小实现。对「无 backstory 的 Crew」「无显式 topic 的 Flow」「专家少于三个的 Hierarchical」硬拒绝。

## 常见坑

- **backstory 当调味料。** 它塑造输出。每个 agent 测三个变体；方差是真实的。挑一个，冻住它。
- **跳过 `expected_output`。** 没有每任务的契约，下游任务就捡 LLM 随便产出的东西。Crew 跑得起来；审计过不了。
- **记忆常开。** 长期记忆每次运行都写。向量数据库增长。检索变嘈杂。把写入限定到那些事实确实持久的任务。
- **manager prompt 漂移。** Hierarchical 的 manager prompt 是隐式的。如果路由变怪，开 verbose 模式把它倒出来读。
- **Crew 里的工具副作用。** 一个 Crew 调工具的次数可能超出预期。POST、DELETE、支付属于 Flow 步骤，绝不该是 Crew 的工具。

## 练习

1. 把 Sequential crew 转成 Flow。数一数波动下降的接触点。记下可读性在哪里下降了。
2. 给 crew 加 entity 记忆：关于一个客户的事实跨 kickoff 持久。验证检索拉取的是正确的实体。
3. 实现一个 Hierarchical 流程，manager 在写手输出至少有三段之前拒绝路由给编辑。追踪那次重试。
4. 为一个（mock 的）网页搜索接一个 `BaseTool` 子类。对比它与 `@tool` 装饰器版本的轨迹形态。
5. 给编辑任务加 `output_pydantic=Brief`，其中 `Brief` 有 `title`、`summary`、`sections`。让写手任务输出一次格式错误的 JSON；在轨迹里验证 CrewAI 的重试行为。
6. 读 CrewAI 的文档简介。把玩具移植到真实的 `crewai` API。标准库版本跳过了哪些保证？
7. 给一次真实运行接上 AgentOps 或 Langfuse（第 24 课）。在标准库版本里你错过了哪些 trace？

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Agent | 「人设」 | 角色 + 目标 + backstory + 工具 |
| Task | 「工作单元」 | 描述 + 期望输出 + 受派者 + 可选结构化输出 |
| Crew | 「agent 团队」 | Agent + Task + Process 的容器 |
| Process | 「执行策略」 | Sequential / Hierarchical / Consensus（计划中） |
| Flow | 「确定性工作流」 | 事件驱动、代码掌管、可测试 |
| Backstory | 「人设 prompt」 | Agent 的语气和判断塑造器 |
| `@tool` | 「函数工具」 | 把一个函数变成 Agent 可调用工具的装饰器 |
| `BaseTool` | 「类工具」 | 基于类的工具，带参数 schema、重试、异步支持 |
| Entity memory | 「按实体的事实」 | 限定到一个客户 / 账户 / issue 的记忆 |
| Long-term memory | 「跨运行记忆」 | 向量支撑、在 kickoff 之间存活的记忆 |
| Contextual memory | 「即时检索」 | 在 Agent 需要的那一刻拉取的记忆 |
| Manager LLM | 「路由 agent」 | Hierarchical 流程里挑下一个 task 的额外 LLM |
| `expected_output` | 「任务契约」 | 告诉 Agent（和审计）该返回什么形态的字符串 |

## 延伸阅读

- [CrewAI docs introduction](https://docs.crewai.com/en/introduction)：概念与推荐的生产路径
- [CrewAI Flows guide](https://docs.crewai.com/en/concepts/flows)：事件驱动形态、`@start`、`@listen`
- [CrewAI tools reference](https://docs.crewai.com/en/concepts/tools)：`@tool`、`BaseTool`、内置工具包
- [CrewAI memory](https://docs.crewai.com/en/concepts/memory)：short-term、long-term、entity、contextual
- [Anthropic, Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)：多 agent 何时帮忙、何时不
- [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview)：状态机替代品
