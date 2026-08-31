# Skill 调用与路由

> 调用先是权限决策，随后才是相关性决策。好的描述帮助模型选择；好的策略决定是否允许该选择。

**类型：** 动手构建
**语言：** Python（标准库）
**前置要求：** 阶段 13 · 24（Skill 发现与渐进式披露）
**预计时间：** 约 105 分钟

## 学习目标

- 区分显式用户调用、隐式模型调用、应用调用和 skill-to-skill 调用。
- 将人工可见性和模型资格建模为相互独立的策略维度。
- 编写含正向触发条件和近似负例边界的路由描述。
- 在 trace 和测试中区分资格、选择、激活、参数绑定与执行。
- 适配运行时专用的调用字段，而不将它们表述成可移植的 frontmatter。

## 问题背景

你安装了一个 `database-migration` skill。用户可以按名称运行它，但模型也能看到它的描述；当有人提出一般性的数据库问题时，模型就会选中它。对于原本只需要解释的任务，这个 skill 却提出了 schema 变更。

你添加 `user-invocable: false`，期望阻止用户手动运行它。换到另一个运行时，该字段被忽略。你又添加 `disable-model-invocation: true`，期望这个 skill 完全消失。可在理解该字段的运行时中，用户仍能显式调用它。

字段名没有问题，模型出了问题。“用户能看见它”“模型能选择它”“应用能预加载它”和“其中的工具能执行”是独立的事实。一个名为 `invocable` 的布尔值无法表达它们。

路由还有第二种失败模式。如果描述含糊，多个 skill 都显得合理；如果描述堆满关键词，无关任务又会触发它们。目录是一种概率接口：既要足够紧凑以容纳，又要足够具体以路由。

## 核心概念

### 五条通道可以启动生命周期

| 发起者 | 调用形式 | 典型用途 | 主要风险 |
|---|---|---|---|
| 人类用户 | 在 UI 或 prompt 中点名一个 skill | 有意选择工作流 | 用户预期的可用性或权限并未由宿主授予 |
| 模型或自治 agent | 从任务上下文中选择一个目录条目 | 自动执行专家流程 | 路由误触发 |
| 应用 | 通过运行时代码激活或预加载一个 skill | 固定的产品工作流 | 与单一宿主产生隐性耦合 |
| 另一 skill 或 subagent | 将一个精确 skill 作为工作流依赖发起请求 | 组合 | 循环、缺失依赖或上下文泄漏 |
| 评测 harness | 在固定场景下激活一个精确 skill | 可重复测量 | 在不经意间绕过被研究的生产策略来测试 skill |

可移植的 Agent Skills 规范定义了包。它并未标准化一种通用的 slash-command UI、隐式路由标志、应用 API 或 subagent 生命周期。

### 五个调用阶段

```figure
skill-invocation-stages
```

请准确使用以下词语：

- **具备资格（eligible）** 指策略允许该 actor 请求这个 skill。
- **已选中（selected）** 指用户点名了它，或路由器判断它相关。
- **已激活（activated）** 指其指令已进入工作上下文。
- **正在执行（executing）** 指 agent 已在这些指令下开始模型或工具工作。
- **已完成（completed）** 指输出通过了独立的成功检查。

一条只记录 `skill_used=true` 的 trace，会掩盖失败究竟发生在哪个边界。

### 人工与模型调用构成一个 2×2 矩阵

| 人工可调用 | 模型可调用 | 模式 | 合适示例 |
|:---:|:---:|---|---|
| 是 | 是 | 共享 | 代码解释、测试计划、文档审查 |
| 是 | 否 | 仅人工 | 发布准备、账单导出、破坏性清理计划 |
| 否 | 是 | 仅模型 | 内部风格指南、领域参考、自动支持流程 |
| 否 | 否 | 禁用或仅应用 | 分阶段发布、废弃包、程序化预加载 |

这个矩阵是一个策略模型，并非标准 YAML。

某个当前宿主使用 `disable-model-invocation: true` 表达仅人工这一行，并使用 `user-invocable: false` 表达仅模型这一行。默认情况是两者都允许。另一个宿主使用 `agents/openai.yaml` 中的 `allow_implicit_invocation: false`，在禁用隐式选择的同时保留显式调用。这些都是运行时适配器。未知宿主可能会忽略它们。

这个容易混淆的细节很重要：`user-invocable: false` 并不表示“模型不能使用它”。在定义该字段的宿主中，它会移除直接的用户调用。`disable-model-invocation: true` 也不表示“这个 skill 已禁用”。它会移除模型发起的选择，同时保留用户的显式访问。

### 显式调用以身份为先

显式调用直接提供身份：

```text
/release-readiness v2.4.0
```

或者：

```text
release-readiness check v2.4.0 without publishing
```

当前 Codex 界面将 `/skills` 用于选择，并在请求中使用普通 skill 名称进行显式调用。Claude Code 则记录了 `/skill-name` 和宿主专用的参数展开。确切语法、菜单可见性、引号规则和变量展开都属于宿主。

显式请求仍须经过策略。点名一个 skill 不应绕过缺失的权限、工作区约束、审批关卡或运行时隔离。

### 隐式调用以描述为先

对于隐式路由，模型起初看到的是目录元数据，而非完整正文。因此，描述就是 skill 的路由接口。

过弱：

```yaml
description: 协助处理发布。
```

过宽：

```yaml
description: 用于发布、版本、包、构建、部署、发布、标签、变更日志、GitHub、CI 或软件任务。
```

有边界的版本：

```yaml
description: 检查已准备好的发布候选项并生成就绪度报告。当用户询问某个版本、标签、包或镜像是否准备好发布时使用；不要用于普通构建失败或功能开发。
```

这个有边界的版本包含：

1. **能力：** 检查一个已准备好的候选项。
2. **输出：** 就绪度报告。
3. **正向边界：** 询问某个发布产物是否已准备好。
4. **负向边界：** 普通构建和开发不在范围内。

当两个相邻 skill 共享词汇时，负向边界很有用。但它不能替代近似负例评测。

### 路由是带有弃权选项的分类

对于 skill `s` 和请求 `x`，可以设想一个路由器分数：

```text
score(s, x) = capability_match + trigger_match + context_match - exclusion_match - ambiguity_penalty
```

精确的评分可能是 LLM 的决策，而不是算术。工程原则依然成立：选择结果应越过阈值并胜过竞争 skill。证据不足时，就弃权。

```figure
skill-routing-abstention
```

对于高影响 skill，即使描述很强，隐式路由也可能不合适。当误触发的代价超过自动选择带来的便利时，应使用仅人工策略。

### 资格必须先于排序

不要给每个已发现 skill 评分，选择最强匹配，然后才检查那一个 skill 的策略。被阻止的最高匹配会错误地阻止考虑一个符合资格、但得分略低的候选项。

隐式路由应按以下顺序进行：

1. 按请求 actor 和当前宿主适配器过滤已发现的 skill。
2. 仅为符合资格的候选项评分。
3. 如果最强的合格匹配越过阈值且符合歧义规则，就选择它。
4. 没有 skill 符合资格，或没有合格分数足够高时，弃权。

假设 `incident-triage` 得分为 `0.80`，但其宿主扩展禁用了模型调用。`incident-review` 得分为 `0.55`，且允许模型调用。路由器应将 `incident-review` 评估为最优的合格候选项。它不应选择 `incident-triage`、拒绝它，然后停止。

这个顺序也避免策略变更改变相关性分数的含义。资格定义选择集合，相关性为这个集合排序。

### 路由评测需要近似负例

正例证明召回率：

```json
{"prompt":"Is version 2.4.0 ready to publish?","expected":"release-readiness"}
```

清晰的负例证明基本精确率：

```json
{"prompt":"Explain rotary position embeddings.","expected":null}
```

近似负例揭示边界质量：

```json
{"prompt":"Why did today's package build fail?","expected":"build-diagnostics"}
```

这个近似负例与发布 skill 共享 `package` 和 `build`，但它属于别处。一组路由样本如果只有显而易见的正例和无关负例，会高估质量。

### 参数有三种表示形式

一个调用参数会跨越多个边界：

```figure
skill-argument-boundaries
```

在每个边界，保留意图，但不要把文本视为代码。

- 宿主解析器决定命令语法和引号规则。
- skill 按宿主规则接收已绑定的文本或变量。
- 指令验证必填值和默认值。
- 工具调用把值转换为有类型的 schema，并再次验证。

不要将原始参数插入 shell 命令。优先使用带参数向量调用的脚本或有类型的 MCP 工具。

### 应用调用是显式编排

当产品工作流本就知道任务类型时，可以激活一个 skill。例如，用户点击 Review 后，pull-request review 服务可以预加载 `pull-request-risk-review`。

这消除了路由的不确定性，却对运行时 API 产生依赖。应将该适配器放在可移植正文之外：

```figure
skill-host-adapter
```

即使由另一个兼容客户端打开，skill 也应当易于理解。

### skill 间调用是一条类似工具的边

假设 `release-readiness` 在依赖文件发生变化时，请求 `security-change-review`。

调用者应提供：

- 目标 skill 的身份；
- 有边界的任务和产物路径；
- 预期的响应契约；
- 调用原因；
- 不可用时的回退方案；
- 最大深度或循环规则。

```json
{
  "target_skill": "security-change-review",
  "task": "Review dependency changes in the candidate diff",
  "inputs": ["artifacts/release.diff"],
  "expected": "risk-report.json",
  "max_depth": 2
}
```

第二个 skill 不会被盲目粘贴进第一个 skill。宿主决定如何激活它，以及它是共享上下文、在 fork 中运行，还是通过工具结果返回。

### 上下文生命周期由宿主决定

激活后，skill 正文可能留在对话中，在压缩期间被总结，或在委派上下文中运行。工具许可可能只持续一轮，而指令持续更久。subagent 可能会获得 skill，却收不到父 agent 的全部历史。

不要编写依赖不可见生命周期假设的 skill。将持久输出放在文件或有类型的状态中，保证可安全重入，并说明中断后必须重新加载什么。

```markdown
恢复时，如果存在 `artifacts/release-readiness.json`，请先读取它。
继续前重新验证候选提交。
不要重复执行其幂等键已被记录的外部写入。
```

## 动手构建

`code/main.py` 将策略和路由实现为相互独立的适配器。

该模型包括：

- 面向人工、模型、自治 agent、应用、skill 和 harness 调用者的 `Actor`；
- 用于路由身份的 `SkillMetadata`；
- 用于人工/模型矩阵的 `InvocationPolicy`；
- 用于可追溯输入和结果的 `InvocationRequest` 与 `InvocationDecision`；
- 不带宿主扩展、用于可移植行为的 `CorePolicyAdapter`；
- 用于识别运行时字段的 `ExtensionPolicyAdapter`；
- 用于生成 2×2 视图的 `build_invocation_matrix(policy)`；
- 用于在相关性排序、选择和拒绝之前过滤资格的 `route_request(skills, request, adapter)`。

运行它：

```bash
cd phases/13-tools-and-protocols/25-skill-invocation-and-routing
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

演示会打印一个矩阵，以及针对显式人工、隐式模型、自治 agent、应用、skill 组合和 harness 通道的决策。扩展适配器的结果会显示：得分最高的词法匹配在排序前被移除，随后才对合格的替代项排序。它还包含精确名称 allowlist。不需要模型 API。这个确定性路由器的存在是为了让策略边界可检查，并非声称词法匹配能复现生产环境的模型路由。

### 为什么核心适配器和扩展适配器要分开

如果一个解析器为每个观察到的 frontmatter 字段赋予含义，它会悄悄将运行时约定提升成伪标准。分离适配器会迫使调用者说明当前启用了哪些宿主语义。

`CorePolicyAdapter` 只使用应用提供的策略。`ExtensionPolicyAdapter` 识别一组明确的宿主字段，并记录哪个字段改变了决策。

## 实际使用

发布一个 skill 前，先编写调用契约：

```yaml
actors:
  human: allow
  model: deny
  application: allow
  skill: deny
explicit_name: release-readiness
arguments:
  candidate: required
  publish: fixed_false
ambiguity: ask_user
missing_dependency: stop
context:
  durable_state: artifacts/release-readiness.json
  max_composition_depth: 2
```

这份契约是适配器和测试的设计文档。除非某项标准明确采纳它，否则它不是可移植的 `SKILL.md` frontmatter。

## 拿去用

本课产出 `skill-invocation-router` bundle。其中包括一份调用模型参考文档、一份示例宿主策略，以及一个不执行任何操作的 CLI。它会评估一条人工、模型、自治 agent、应用、skill 组合或 harness 请求，并返回 JSON 决策，其中包括通道、适配器、分数和原因。

这个单请求 CLI 是策略探针，不是完整的触发评测。请在第 27 课中使用带标签的正例和近似负例设计，计算混淆计数、精确率、召回率与重复运行稳定性。

## 练习

1. 创建人工/模型矩阵的全部四行，并为每一行写一个正当的使用场景。
2. 为 `CorePolicyAdapter` 添加仅应用的激活方式。证明人工和模型调用者仍会被拒绝。
3. 为一个部署 skill 写十个近似负例。每个 prompt 都必须与该 skill 共享词汇，同时属于不同工作流。
4. 在最高两个路由分数之间添加歧义间隔。间隔太小时返回 `ask`。
5. 为 skill-to-skill 请求添加最大组合深度，并检测一个两个 skill 构成的循环。
6. 让相同的带标签集合分别通过核心和扩展适配器。解释每一个变化的决策。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 显式调用 | “斜杠命令” | 调用方直接提供 skill 身份，但仍受策略限制 |
| 隐式调用 | “模型来选择” | 路由器根据任务上下文，从符合资格的目录元数据中选择 |
| 用户可调用（User-invocable） | “人类可以使用它” | 宿主专用的菜单或直接调用属性，不是核心字段 |
| 模型可调用（Model-invocable） | “agent 可以使用它” | 在宿主策略下，模型进行隐式选择的资格 |
| 调用适配器 | “frontmatter 解析器” | 将宿主的字段和 API 映射至已声明策略模型的代码 |
| 近似负例 | “困难负例” | 类似某个 skill 预期输入、但不应触发的请求 |
| 弃权 | “未选中任何 skill” | 当证据缺失或存在歧义时，有意作出的路由结果 |

## 延伸阅读

- [优化 skill 描述](https://agentskills.io/skill-creation/optimizing-descriptions)，了解正向触发条件、具体性和评测。
- [评测 skill](https://agentskills.io/skill-creation/evaluating-skills)，了解触发与输出评测设计。
- [OpenAI：构建 skills](https://learn.chatgpt.com/docs/build-skills)，了解当前 Codex 显式和隐式调用控制。
- [Claude Code skills](https://code.claude.com/docs/en/skills)，了解某个宿主的 `user-invocable`、`disable-model-invocation`、参数和委派上下文。
