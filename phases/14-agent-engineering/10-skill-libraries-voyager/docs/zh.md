# 技能库与终身学习（Voyager）

> Voyager（Wang 等人，TMLR 2024）把可执行代码当成一个技能。技能是具名的、可检索的、可组合的，并由环境反馈精修。这是 Claude Agent SDK skill、skillkit 以及 2026 年技能库模式的参考架构。

**类型：** Build
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 07（MemGPT）、阶段 14 · 08（Letta 块）
**预计时间：** ~75 分钟

## 学习目标

- 说出 Voyager 的三个组件 —— 自动课程、技能库、迭代式 prompt —— 及各自的作用。
- 解释为什么 Voyager 把动作空间做成代码，而不是原始命令。
- 用标准库实现一个技能库，带注册、检索、组合和失败驱动的精修。
- 把 Voyager 的模式映射到 2026 年的 Claude Agent SDK skill 和 skillkit 生态。

## 问题背景

每个会话都从头重建每一项能力的 agent，做错了三件事：

1. **浪费 token。** 每个任务都重新引出同样的推理。
2. **丢失进展。** 在会话 A 里学到的一个纠正不会迁移到会话 B。
3. **在长跨度组合上失败。** 复杂任务需要能力层级；单次 prompt 表达不了。

Voyager 的答案：把每项可复用能力当成存在库里的一段具名代码，可按相似度检索、可与其他技能组合、由执行反馈精修。

## 核心概念

### 三个组件

Voyager（arXiv:2305.16291）把一个 agent 围绕以下三者构建：

1. **自动课程。** 一个好奇心驱动的提议器，基于 agent 当前的技能集和环境状态挑下一个任务。探索是自底向上的。
2. **技能库。** 每个技能都是可执行代码。任务成功时加入新技能。技能按「查询-描述」相似度检索。
3. **迭代式 prompt 机制。** 失败时，agent 收到执行错误、环境反馈和自我验证输出，然后精修该技能。

Minecraft 评估（Wang 等人，2024）：相比基线，独特物品多 3.3 倍、石器快 8.5 倍、铁器快 6.4 倍、地图穿越距离长 2.3 倍。数字是 Minecraft 专属的，但模式可迁移。

### 动作空间 = 代码

大多数 agent 吐出原始命令。Voyager 吐出 JavaScript 函数。一个技能是：

```
async function craftIronPickaxe(bot) {
  await mineIron(bot, 3);
  await mineStick(bot, 2);
  await placeCraftingTable(bot);
  await craft(bot, 'iron_pickaxe');
}
```

由子技能组合而成。按描述和 embedding 为键存储。作为程序检索，而不是 prompt。

这就是 2026 年的 Claude Agent SDK skill：一段具名、可检索的代码加上 agent 按需加载的指令。

### 技能检索

新任务「做一把钻石镐」。agent：

1. 嵌入任务描述。
2. 向技能库查询 top-k 个相似技能。
3. 检索出 `craftIronPickaxe`、`mineDiamond`、`placeCraftingTable` 等。
4. 用检索到的原语 + 新逻辑组合出新技能。

这就是 MCP resource（阶段 13）和 Agent SDK skill 实现的模式：在一个知识/代码接触面上做检索，范围限定到当前任务。

### 迭代式精修

Voyager 的反馈循环：

1. agent 写一个技能。
2. 技能对环境运行。
3. 返回三种信号之一：`success`、`error`（带堆栈）、`self-verification failure`。
4. agent 用这个信号作为上下文重写技能。
5. 循环直到成功或达到最大轮数。

这就是把 Self-Refine（第 05 课）应用到代码生成上，配环境锚定的验证。CRITIC（第 05 课）是同样的模式，只是把外部工具当验证器。

### 课程与探索

Voyager 的课程模块会基于「agent 有什么」和「它还没做什么」提议像「在湖边盖个庇护所」这样的任务。提议器用环境状态 + 技能清单挑一个刚好略高于当前能力的任务 —— 探索的甜点区。

对生产 agent 来说，这翻译成一个「缺什么」算子：给定当前技能库和一个领域，我们还没覆盖哪些技能？团队通常把这个手动实现成课程评审。

### 这个模式在哪里会出错

- **技能库腐烂。** 同一个技能被加了 10 次，描述略有不同。在写入时加去重；检索只返回一个。
- **组合技能漂移。** 父技能依赖一个被精修过的子技能。给技能加版本；一个钉在 v1 的父技能不会神奇地用上 v3。
- **检索质量。** 当库增长过几百个后，在技能描述上的向量检索会退化。用标签过滤和硬约束补充（「只要 `category=tooling` 的技能」）。

```figure
voyager-skills
```

## 动手构建

`code/main.py` 用标准库实现一个技能库：

- `Skill` —— name、description、code（字符串形式）、version、tags、dependencies。
- `SkillLibrary` —— 注册、搜索（token 重叠）、组合（依赖拓扑排序）和精修（更新时版本号递增）。
- 一个脚本化 agent，注册三个原语技能、组合出第四个、撞上一次失败、然后精修。

运行它：

```
python3 code/main.py
```

轨迹展示库写入、检索、组合、一次失败执行和一次 v2 精修 —— 端到端的 Voyager 循环。

## 实际使用

- **Claude Agent SDK skill**（Anthropic）—— 2026 年的参考：每个 skill 有描述、代码和指令；在 agent 会话期间按需加载。
- **skillkit**（npm: skillkit）—— 跨 agent 的技能管理，支持 32+ AI 编码 agent。
- **自定义技能库** —— 领域专用（数据 agent 的 SQL 技能、基建 agent 的 Terraform 技能）。Voyager 模式可以向下缩放。
- **OpenAI Agents SDK `tools`** —— 在低端；每个工具就是一个轻量技能。

## 拿去用

`outputs/skill-skill-library.md` 为任意目标运行时生成一个 Voyager 形态的技能库，注册、检索、版本管理和精修都接好。

## 练习

1. 给 `compose()` 加一个依赖环检测器。当技能 A 依赖 B、B 又依赖 A 时会怎样？报错还是警告？
2. 实现每技能的版本固定。当一个父技能组合子技能 `crafting@1` 时，把 `crafting@2` 精修出来绝不能静默升级父技能。
3. 把 token 重叠检索换成 sentence-transformers embedding（或一个标准库 BM25 实现）。在一个 50 技能的玩具库上度量 retrieval@5。
4. 加一个「课程」agent：给定当前库和一段领域描述，提议 5 个缺失的技能。每周调一次。
5. 读 Anthropic 的 Claude Agent SDK skill 文档。把玩具库移植到 SDK 的 skill schema。可发现性有什么变化？

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Skill | 「可复用能力」 | 一段具名代码 + 描述，可按相似度检索 |
| Skill library | 「agent 关于做法的记忆」 | 技能的持久存储，可搜索、可组合 |
| Curriculum | 「任务提议器」 | 由当前能力缺口驱动的自底向上目标生成器 |
| Composition | 「技能 DAG」 | 技能调用技能；执行时拓扑排序 |
| Iterative refinement | 「自我纠正循环」 | 环境反馈 + 错误 + 自我验证折回下一个版本 |
| Action-space-as-code | 「程序化动作」 | 吐出函数而非原始命令，以表达时间上延展的行为 |
| Dedup on write | 「技能合并」 | 近似重复的描述合并成一个规范技能 |

## 延伸阅读

- [Wang et al., Voyager (arXiv:2305.16291)](https://arxiv.org/abs/2305.16291) —— 原始的技能库论文
- [Claude Agent SDK overview](https://platform.claude.com/docs/en/agent-sdk/overview) —— 作为 2026 年产品化的 skill
- [Anthropic, Building agents with the Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk) —— 实战中的 skill 和子 agent
- [Madaan et al., Self-Refine (arXiv:2303.17651)](https://arxiv.org/abs/2303.17651) —— Voyager 底下的精修循环
