# Skill 调用与路由

> 调用先是权限决策，随后才是相关性决策。好的描述帮助模型选择；好的策略决定是否允许这次选择。

**类型：** Build
**语言：** Python（标准库）
**前置要求：** 阶段 13 · 24（Skill 发现与渐进式披露）
**预计时间：** 约 105 分钟

## 学习目标

- 区分显式用户调用、隐式模型调用、应用调用与 skill-to-skill 调用。
- 将人工可见性与模型资格建模为相互独立的策略维度。
- 为路由描述写出正向触发条件与近似负例边界。
- 在 trace 和测试中分开资格、选择、激活、参数绑定和执行。
- 适配运行时专用调用字段，而不把它们说成可移植 frontmatter。

## 问题背景

安装 `database-migration` skill 后，用户可以按名称运行它，但模型也会看到描述，并在有人泛问数据库时选中它；原本只需解释的问题被它推进到 schema 变更。再加上 `user-invocable: false` 在某个运行时被忽略、`disable-model-invocation: true` 仍允许用户显式调用，就能看出“用户能看到”“模型能选”“应用能预加载”“内部工具能执行”是四件不同的事。

模糊描述让多个 skill 都像是答案；关键词堆砌又会触发无关任务。目录是一个概率接口：既要足够紧凑，又要足够具体。

## 核心概念

### 五个通道都能启动生命周期

| 发起者 | 调用形态 | 典型用途 | 主要风险 |
|---|---|---|---|
| 人类用户 | 在 UI 或 prompt 中点名 skill | 有意选择工作流 | 用户预期的可用性或权限并未授予 |
| 模型或自治 agent | 从任务上下文选择目录项 | 自动化专家流程 | 误触发路由 |
| 应用 | 经运行时代码激活或预加载 | 固定产品流程 | 绑定某个宿主 |
| 另一 skill 或 subagent | 请求精确 skill 作为工作流依赖 | 组合 | 环、缺失依赖、上下文泄漏 |
| 评测 harness | 用固定场景激活精确 skill | 可重复测量 | 意外绕过正在研究的生产策略 |

可移植 Agent Skills 规范只定义包，不定义统一的 slash-command UI、隐式路由标志、应用 API 或 subagent 生命周期。

### 五个调用阶段

```figure
skill-invocation-stages
```

- **合格（eligible）**：策略允许这个 actor 请求该 skill。
- **选中（selected）**：用户点名，或路由器判定相关。
- **激活（activated）**：指令已进入工作上下文。
- **执行（executing）**：agent 已在这些指令下开始模型或工具工作。
- **完成（completed）**：输出通过独立成功检查。

只记录 `skill_used=true` 的 trace 会掩盖失败究竟发生在哪条边界。

### 人类与模型调用是 2×2

| 人可调用 | 模型可调用 | 模式 | 合适场景 |
|:---:|:---:|---|---|
| 是 | 是 | 共享 | 代码解释、测试计划、文档审查 |
| 是 | 否 | 仅人工 | 发布准备、账单导出、破坏性清理计划 |
| 否 | 是 | 仅模型 | 内部风格指南、领域参考、自动支持流程 |
| 否 | 否 | 禁用或仅应用 | 分阶段发布、废弃包、程序化预加载 |

这张矩阵是策略模型，不是标准 YAML。某些宿主将 `disable-model-invocation: true` 用于仅人工，将 `user-invocable: false` 用于仅模型；另一些把 `allow_implicit_invocation: false` 放在 `agents/openai.yaml`。它们都是适配器。未知宿主可忽略这些字段。

### 显式调用以身份为先

```text
/release-readiness v2.4.0
```

或：

```text
release-readiness check v2.4.0 without publishing
```

显式调用必须解析到一个已发现的精确身份；自然语言参数随后再绑定。点名并不授予操作权限。

### 隐式调用以描述为先

描述应同时表达工作内容与触发边界：

```yaml
description: Prepare a release readiness report. Use when the user asks whether a tagged version is ready to publish.
```

不要把相邻任务全塞进同一描述：

```yaml
description: Help with releases, docs, packages, deployment, and any project task.
```

也不要把宿主专用字段误写成标准：

```yaml
user-invocable: false
disable-model-invocation: true
```

### 路由是带弃权选项的分类

给每个候选项一个相关性分数，并保留“不激活”的结果：

```text
selected = best eligible candidate only if score >= threshold
otherwise = abstain
```

```figure
skill-routing-decision
```

阈值以下的近似请求必须弃权，继续普通推理或请求澄清；悄悄降低阈值会把策略变成不可审计的猜测。

### 资格必须先于排序

先按 actor、宿主扩展、allowlist、调用深度和循环约束过滤候选集，再评分。一个分数最高但无资格的 skill 不是赢家；把它移出候选集后再排序。这样调用可见性不会被错误地当成权限。

### 路由评测需要近似负例

正例只证明目标任务能触发。语义相近但不应触发的样例才暴露过度路由：

```json
{"prompt":"Is v2.4.0 ready to publish?","expected":true}
```

```json
{"prompt":"Explain semantic versioning.","expected":false}
```

```json
{"precision":"true positives / all predicted positives"}
```

按精确名称激活的 harness 测 skill 行为；隐式触发评测则单独测描述和阈值。

### 参数有三种表示

```figure
skill-argument-binding
```

用户输入是自由文本；路由器使用查询特征；执行阶段需要 schema 约束的参数。不要把目录描述、自然语言参数和工具 argv 混成一种不透明字符串。

### 应用调用是显式编排

```figure
skill-application-activation
```

应用应给出精确名称、目标 allowlist 和调用原因。预加载可减少首轮延迟，但会增加上下文成本，也应记录在 trace 中。

### Skill-to-skill 调用是一条类似工具的边

调用者必须带上自己的身份、目标名称和深度：

```json
{"caller":"release-orchestrator","target":"changelog-checker","depth":1}
```

宿主要拒绝循环、未安装目标、未授权调用者与超过深度上限的组合。被调用 skill 的指令不能借此提升文件、网络或发布权限。

### 上下文生命周期由宿主决定

skill 可以在本任务结束时卸载，也可以作为后续轮次的活跃上下文。入口文件应说清楚引用何时加载：

```markdown
For a package release, read `references/package.md`; for a docs-only release, read `references/docs.md`.
```

不要假设所有宿主都会永久保留已加载的资源。

## 动手构建

`code/main.py` 将核心策略和宿主扩展适配器分开：它建模 actor、调用通道、候选项、资格、描述评分、精确名称检查、组合深度与 JSON trace。运行：

```bash
cd "$(git rev-parse --show-toplevel)"
cd phases/13-tools-and-protocols/25-skill-invocation-and-routing
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

演示覆盖人工、模型、agent、应用、skill 和 harness 通道；不会调用外部服务，也不会执行 bundle 脚本。

### 为什么核心与扩展适配器要分开

核心只实现可移植的 actor、精确身份、资格、评分和弃权模型。扩展适配器才解释一个特定宿主的字段。混在一起会把某个产品当前的 YAML 误塑成规范，并让其他宿主的行为无法诚实描述。

## 实际使用

将策略写成可审计配置，并为每个通道写测试：

```yaml
human: exact-name
model: eligible-then-ranked
application: exact-name-and-allowlist
skill: caller-allowlist-and-depth-limit
harness: exact-name-and-fixed-fixture
```

记录 actor、候选集、被过滤的原因、分数、阈值、最终选择、参数绑定和后续权限决定。若没有合格候选项或最高分不够，明确记录弃权；不要让激活结果暗中成为工具授权。

## 拿去用

本课交付 `skill-invocation-router`。它用显式宿主策略区分人工、模型、应用、组合和 harness 调用；精确调用要求名称与 allowlist，隐式调用先过滤再评分，组合调用检查调用者、循环和深度。输出 JSON 决策及其 adapter、通道、分数和策略原因，且绝不把激活当成执行或权限批准。

## 练习

1. 为昂贵的发布 skill 写仅人工策略，并证明模型近似请求会弃权。
2. 添加两个语义接近的 skill，创建正例、近似负例和阈值边界测试。
3. 给组合调用加入调用链 trace，并拒绝 A → B → A 环。
4. 为应用预加载测量目录、正文和引用的上下文成本。
5. 实现将自然语言参数绑定为 schema 对象的步骤，并在不完整时请求澄清。
6. 为某个宿主扩展写 adapter 文档，明确它在不识别字段的宿主上会如何降级。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 显式调用 | “用户点了 skill” | 用精确身份选择已发现的包 |
| 隐式调用 | “模型自己用了” | 宿主允许后，按描述相关性选择 |
| 资格 | “可以选” | 策略允许该 actor 请求该目标 |
| 激活 | “skill 在用” | 指令进入工作上下文 |
| 弃权 | “没有匹配” | 路由器有意不激活任何 skill |
| 近似负例 | “相近的 prompt” | 语义相邻但应该保持不触发的评测样例 |

## 延伸阅读

- [Agent Skills: evaluating skills](https://agentskills.io/skill-creation/evaluating-skills)
- [Optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions)
- [Claude Code skills](https://code.claude.com/docs/en/skills)
- [OpenAI: Build skills](https://learn.chatgpt.com/docs/build-skills)
