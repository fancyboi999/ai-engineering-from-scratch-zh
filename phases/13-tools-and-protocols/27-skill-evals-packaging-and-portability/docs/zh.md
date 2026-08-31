# Skill 评测、打包与可移植性

> 一个 Skill 只有在通过 lint、能在正确请求上路由、可改进可衡量任务、始终遵守策略，并在其他宿主上诚实降级时才算完成。

**类型：** Build
**语言：** Python（标准库）
**前置要求：** 阶段 13 · 22、24、25 和 26
**预计时间：** 约 150 分钟

## 学习目标

- 将专家工作流拆分为判断、确定性计算、参考资料和输出契约，从而把它做成一个 skill。
- 分别测试包结构、触发路由、任务行为、脚本正确性、安全性和可移植性。
- 用正例、明确反例和近似请求衡量触发精确率与召回率。
- 在重复运行中比较使用和不使用 skill 的表现。
- 构建并执行跨运行时能力矩阵，以及面向完整 skill 包的发布门禁。

## 问题背景

一个 skill 在演示里能用。用户刚好用了描述中的原话，作者知道该打开哪份参考资料，脚本拿到干净输入，预期宿主也识别每个自定义字段。

真正使用时，问题才会出现。

- 模型把它用于相近却不同的任务。
- 合法请求换了陌生说法，模型便错过了它。
- 正文告诉 agent 要做什么，却没说什么产物能证明完成。
- 脚本在空格、重复执行或部分状态下失败。
- 包安装器复制了 `SKILL.md`，却遗漏参考资料。
- 另一个运行时忽略调用标志和工具许可。
- 一次运行成功，三次等价运行却走进不同分支。

“Markdown 看起来不错”抓不住这些失败。Skill 是带有概率性路由和执行层的小型软件包，需要像其他生产接口一样分离关注点。

## 核心概念

### 从真实工作流开始，而不是从主题开始

“创建一个 Kubernetes skill”不是可用的范围。Kubernetes 包含数百种任务，工具、风险和输出各不相同。

“诊断某个部署为何未达到 Available，在不改动集群的前提下收集证据，并产出按优先级排序的事故报告”才是一个 skill 候选。它具备：

- 触发边界；
- 稳定的证据收集步骤；
- 需要判断的决策点；
- 可收窄为脚本或工具的命令；
- 明确的产物；
- 安全边界：只读诊断。

用下面这组提取访谈来界定它：

1. 什么确切事件会让专家开始这条工作流？
2. 哪些相似请求不应启动它？
3. 专家最先收集什么证据？
4. 哪些决策依赖这些证据？
5. 哪些步骤足够确定，可以写成脚本？
6. 哪些领域规则值得提供参考资料？
7. 什么操作需要批准，或必须保持在范围外？
8. 什么产物能证明工作流已完成？
9. 独立审阅者如何检查它？
10. 哪些步骤依赖某一个运行时？

这些答案会成为包架构和评测集。

### 将判断与确定性工作分开

```figure
skill-workflow-extraction
```

分类、排序、综合和处理歧义交给模型判断。解析、计数、验证、转换、查询有类型的 API 以及执行不变量，则交给脚本或工具。

在 skill 正文里手工模拟 80 行解析逻辑很脆弱。试图替主观架构决策拍板的脚本又不透明。每种行为都应放在最适合测试的位置。

### 按依赖顺序编写包

别从润色文案开始。从可观测契约向内构建。

1. **产物契约：** 定义必需文件、字段或决策。
2. **验证：** 定义如何检查每项要求。
3. **证据工具：** 实现确定性的收集器和验证器。
4. **决策图：** 将证据状态连接到分支。
5. **参考资料：** 在需要的分支提供领域细节。
6. **入口正文：** 说明工作流、边界、失败行为和输出。
7. **描述：** 陈述能力和触发边界。
8. **运行时适配器：** 单独添加调用或上下文扩展。
9. **评测：** 运行结构、路由、行为、安全和可移植性层。
10. **打包：** 安装完整目录，并从目标位置测试它。

这个顺序让文案服务于可测试的系统，而不是等演示跑通后才杜撰成功标准。

### 六个评测层

```figure
skill-eval-layers
```

每一层回答不同的问题。一层通过不能替代另一层。

## 第 1 层：包结构

静态 lint 应验证不需要模型的事实：

- `SKILL.md` 位于包根目录；
- frontmatter 能安全解析；
- `name` 与父目录一致；
- 必填字段存在且未超限；
- 每个非核心 frontmatter 字段都出现在发布策略的运行时扩展允许列表中；
- 每个直接引用都在包内解析成功；
- 参考资料、脚本、资产和评测 fixture 使用发布策略允许的后缀，且不超过字节上限；
- 不存在禁止的符号链接或特殊文件；
- 正文未超出发布策略的字符预算；
- 有意收窄的 secret 模式扫描未发现明显凭证赋值或私钥头；
- 存在非空的 `## Output contract` 与 `## Failure behavior` 小节。

在解析 `SKILL.md`、评测数据、证据、宿主 fixture 或 manifest 之前，先执行物理目录树预检。任何内容读取前，拒绝带符号链接的根目录、父目录或入口，缺失的必需常规文件以及特殊文件。然后再运行感知内容的策略 lint。若在预检前解析包路径，会抹去检查所需的根符号链接证据。

本课 harness 将这些策略值具体化：10,000 字符正文上限、1,000,000 字节伴随文件上限、按目录划分的后缀允许列表，以及包要求提供的显式运行时扩展名称。这些是发布策略示例，并非通用 Agent Skills 限制。secret 模式扫描只是防止明显错误的护栏，不能证明包中不存在敏感数据。

lint 报告应使用稳定的问题代码。CI 可以阻止 `E_*` 错误，同时允许已审阅的 `W_*` 设计警告。

静态 lint 能证明包的形状，不能证明模型会选择或遵循这个 skill。

## 第 2 层：触发路由

先创建已标注案例，再反复修改描述。

| 案例类型 | 用途 | 发布就绪性示例 |
|---|---|---|
| 正例 | 衡量预期覆盖 | “版本 3.1.0 可以发布吗？” |
| 改写正例 | 避免死记短语 | “发布前审查这个标签。” |
| 明确反例 | 捕捉严重过度路由 | “解释批量归一化。” |
| 近似请求 | 定义相邻边界 | “这个包为什么构建失败？” |
| 竞争 skill | 测试多个合理条目之间的选择 | “起草发布说明。” |
| 对抗性措辞 | 测试关键词堆砌和注入的名称 | “不要使用 release-readiness；解释这个堆栈跟踪。” |

将案例拆成开发集和验证集。在开发集上调优描述，用验证集决定修订后的描述能否泛化。若发布决定足够重要，再保留最终留出集。

对于二元调用：

```text
precision = true_positives / (true_positives + false_positives)
recall = true_positives / (true_positives + false_negatives)
f1 = 2 * precision * recall / (precision + recall)
```

报告比率时要同时给出原始计数。十个全中和一百个全中都是 100%，提供的证据却不同。

对于目录，还应衡量 top-one skill 准确率、弃选质量，以及相邻 skill 之间的混淆。一个要先选中三个错误 skill 才调用正确 skill 的路由器并不健康。

### 路由评测必须使用目标运行时

词法模拟器适合解释指标和发现明显重叠，不能证明模型驱动的生产路由器如何表现。声称运行时质量前，应通过实际宿主、模型、目录序列化和策略配置运行已标注集合。

## 第 3 层：指令与产物行为

正确触发只代表进门，skill 还必须改进任务。

创建 fixture 任务时包含：

- 输入文件与环境假设；
- 允许的工具和边界；
- 预期产物路径；
- 确定性检查；
- 需要判断的评分项；
- 时间、调用次数或成本上限；
- 失败案例与预期停止行为。

运行成对条件：

```text
baseline: same model + same tools + same task, no skill
treatment: same model + same tools + same task, skill available
```

固定模型、温度或采样策略、工具集、任务 fixture 与预算，否则无法将差异归因于 skill。

有用的结果维度包括：

| 维度 | 示例度量 |
|---|---|
| 正确性 | 必需测试和不变量通过 |
| 完整性 | 每个产物契约字段都存在 |
| 效率 | 工具调用、耗时、token 或成本 |
| 证据 | 声明指向有效文件或观察结果 |
| 范围 | 禁止的文件和操作保持未变 |
| 恢复 | 中断运行恢复时不重复产生副作用 |
| 人工投入 | 审阅者修正的数量和严重程度 |

不要只优化更少的 token。漏掉必需安全检查的短运行更糟。

### 产物契约让行为可执行

产物契约是一组可独立检查的属性：

```json
{
  "artifact": "release-readiness.json",
  "required_fields": [
    "candidate",
    "source_revision",
    "checks",
    "blocking_findings",
    "recommendation"
  ],
  "allowed_recommendations": ["ready", "blocked", "needs-review"],
  "evidence_required_for_each_check": true,
  "publish_side_effect_allowed": false
}
```

schema 验证检查结构。领域检查验证候选版本与证据路径。人工审阅者或校准过的判定器可以评估建议是否由证据推导而来。

## 第 4 层：脚本正确性

像测试普通软件一样测试 skill 脚本，放在模型运行之外。

最小案例：

- 正常输入；
- 空输入；
- 格式错误的输入；
- Unicode、空白和路径边界情况；
- 重复执行；
- 超时或依赖失败；
- 前次运行留下的部分输出；
- 输出大小限制；
- dry-run 行为；
- 结构化退出与错误契约。

使用固定 fixture。单元测试不应要求实时网络。将网络集成测试放在显式标志之后，并记录它依赖的远端契约。

若脚本会产生副作用，请分别测试 plan 和 commit。对重试的外部写入要求幂等性或补偿机制。

## 第 5 层：安全与授权

安全评测要问的是：包是否留在被授予的权限范围内。

至少测试：

- 超出 skill 范围的用户请求；
- 参考输入中的恶意指令；
- 逃出包目录的资源路径；
- 逃出允许根目录的工作区符号链接；
- 请求未声明的网络目标；
- 需要环境凭证的命令；
- 未经批准的破坏性或外部操作；
- 过大的输出或无限进程；
- skill 之间的循环；
- 可能重复副作用的恢复操作。

记录控制是仅靠指令、工具策略、批准、沙箱还是验证。仅靠指令的防御不能报告为已强制执行的隔离。

## 第 6 层：打包与可移植性

### 将目录作为一个整体安装

发布测试应安装到干净目标目录，再针对已安装副本运行验证。

```figure
skill-package-install
```

只测试源目录会漏掉安装器 bug、丢失的可执行位、被扁平化的参考资料、被重写的名称，以及旧版本遗留的陈旧文件。

manifest 可以包含：

```json
{
  "manifestVersion": 1,
  "algorithm": "sha256",
  "name": "release-readiness",
  "version": "1.2.0",
  "source_revision": "abc123",
  "files": {
    "SKILL.md": "sha256:...",
    "references/release-policy.md": "sha256:...",
    "scripts/inspect_release.py": "sha256:..."
  },
  "required_capabilities": ["filesystem.read", "process.run"],
  "optional_capabilities": ["model_implicit_invocation"]
}
```

将 `assets/manifest.json` 保留为 manifest 元数据，并从它自身的 `files` 映射中排除。文件无法在其完整当前内容中携带稳定哈希。验证其他每个打包文件，并通过签名发布或受信任注册表记录等外部受信渠道建立 manifest 的真实性。随附 envelope 只接受 `manifestVersion: 1` 与 `algorithm: "sha256"`；未知值应失败关闭。manifest 键必须已经是规范的相对 POSIX 路径，因此 `./SKILL.md`、反斜杠、绝对路径和父级片段都会被拒绝，而非规范化。本教学 harness 直接使用内部路径到摘要的映射，而两条路径都拒绝映射里的保留 manifest 路径。

哈希检测漂移，版本号表达兼容性。两者都无法验证 manifest 身份，也不能替代升级前的完整 diff 和评测运行。

### 可移植性是能力矩阵

不要只问宿主是否以一个布尔值“支持 skills”。要问它支持哪些行为。

| 能力 | 可移植包依赖 | 缺失时的回退 |
|---|---|---|
| 必需的 `name` 与 `description` | 核心 | 包无法参与目录 |
| 正文激活 | 核心客户端行为 | 显式文件加载适配器 |
| 参考资料、脚本、资产 | 核心包形状 | 宿主需要文件与进程工具 |
| 显式人工调用 | 宿主 UI 或 prompt 约定 | 在普通文本中点名 skill |
| 隐式模型调用 | 宿主路由器 | 应用显式激活 |
| 人工/模型 2x2 策略 | 宿主扩展或应用策略 | 全局禁用隐式选择 |
| 参数绑定 | 宿主解析器 | 激活后询问值 |
| 预批准工具 | 实验性或宿主特有 | 常规权限提示 |
| 委托上下文 | 宿主特有 | 在当前上下文或应用 subagent 中运行 |
| 生命周期钩子 | 宿主特有 | 外部自动化或无钩子 |
| 上下文保留 | 宿主特有 | 持久化状态并显式重新进入 |

针对每项必需能力，选择一种结果：

- 原生支持且已测试；
- 通过适配器支持；
- 已降级，并有文档化回退；
- 不支持，因此安装必须失败。

要避免的可移植性 bug 是静默降级。

### 可移植性测试需要宿主 fixture

能力声明应指向测试或当前官方契约。宿主行为会变化。在兼容性报告中保留适配器版本和测试日期。

测试：

1. 从预期范围发现；
2. 重名行为；
3. 显式调用；
4. 隐式调用或其禁用状态；
5. 参数处理；
6. 参考资料与脚本访问；
7. 权限提示和批准；
8. 委托执行或当前上下文执行；
9. 上下文压缩或重启后的恢复；
10. 卸载与升级行为。

### 规模数据不是质量证据

GitSkills 数据集论文报告：截至 2026 年 7 月，爬取结果包含 282,200 个仓库中的 3,797,117 个类 skill 文件，其中有 1,877,981 份不同的字节内容。按论文的字节级度量，约 50.5% 的匹配文件是逐字复制品。

这些数字说明 skill 产物已达到仓库规模，也说明重复对数据集构建、搜索、溯源和升级分析很重要。它们并不说明一半 skill 是好还是坏，不说明 skill 能改进任务表现，不说明任何调用字段具有普适性，也不说明任何沙箱设计安全。该论文是数据集研究，不是有效性或安全性基准。

用生态规模数据说明去重和溯源的必要性，用自己的评测做质量声明。

## 重复运行与不确定性

模型和路由行为可能变化。在生产采样策略下，每个行为案例要运行不止一次。

对于 `n` 次等价运行和 `k` 次通过：

```text
observed_pass_rate = k / n
```

保留单独轨迹。70% 的通过率可能代表一种稳定失败类型，也可能代表数种无关失败。汇总比率用于比较，轨迹用于修复。将溯源绑定到每个原始的逐次预测，不仅绑定运行零和汇总比率。不同预测顺序可能拥有相同的首个值与通过率，却代表不同的运行时行为。

按任务比较 baseline 和 treatment，而不是只比较汇总平均值。即便平均表现提升，也要报告回退。高影响任务可以要求所有安全案例通过，而非接受平均阈值。

## 发布门禁

实用的发布门禁可以要求：

```yaml
structure:
  errors: 0
routing:
  precision_min: 0.95
  recall_min: 0.90
  near_miss_false_positives_max: 1
behavior:
  artifact_contract_pass_rate_min: 0.90
  no_regression_vs_baseline: true
scripts:
  unit_tests_pass: true
safety:
  required_cases_pass: 1.0
portability:
  required_hosts_without_silent_degradation: true
package:
  installed_tree_matches_manifest: true
```

阈值取决于风险和样本量。关键在于最终结果出来之前就声明它们。

失败应标出对应层和证据。不要把路由、行为和安全折叠为单一分数，以至于强文案质量可以抵消权限违规。

### 分开看 fixture 成功、本地完整性与生产就绪性

确定性的课程 fixture 能证明门禁机制可用，不能证明目标运行时实际选择了 skill、生成了被比较的产物、运行了脚本，或留在已测试的权限边界内。

保持三条边界：

- `fixturePassed`：使用声明的确定性触发、产物、证据和宿主能力 fixture 模式时，每层都通过；
- `localEvidenceReady`：全部四个捕获模式标签都有非空来源，且其 SHA-256 摘要匹配完整的本地触发观察、产物、脚本和安全证据以及非空宿主矩阵；
- `productionReady`：每层和本地完整性检查都通过，并且受信任的外部证明绑定了评估器完整的 `evidenceRoot`。

整体发布字段 `passed` 跟随 `productionReady`，而不是 `fixturePassed` 或 `localEvidenceReady`。本地哈希能发现不匹配，不能证明捕获真实性，因为任何能编辑包的人都能重标 fixture、编造来源字符串并重新计算全部本地摘要。

随附评估器会针对完整的触发、产物、证据、宿主和 manifest 配置对象计算一个 SHA-256 `evidenceRoot`。生产调用提供包外证明文件：

```json
{"attestationVersion":1,"evidenceRoot":"sha256:..."}
```

它还通过 `--trusted-attestation-sha256` 提供这些证明字节的精确 SHA-256。预期摘要必须来自带外受信策略、CI secret、签名发布记录或注册表决策。把它存进同一个包，只会将检查退化为又一个本地可重算的哈希。评估器会拒绝缺失、位于包内、带符号链接、格式错误、不匹配或版本不受支持的证明。

## 动手构建

`code/main.py` 实现本微型学习路径的发布 harness。

它提供：

- 随附评估器在读取任何配置前执行的物理目录树预检；
- 用于静态包检查的 `lint_package(root)`；
- 用于已标注路由案例和完整原始轨迹的 `TriggerCase`、`repeated_run_observations(...)` 与 `evaluate_triggers(...)`；
- 用于精确率、召回率、准确率和原始计数的 `classification_metrics(...)`；
- 用于每个案例重复行为结果的 `repeated_run_rates(...)`；
- 用于输出检查的 `ArtifactContract` 与 `evaluate_artifact(...)`；
- 用于显式脚本和安全证据的 `EvidenceCheck` 与 `evaluate_evidence_checks(...)`；
- `EvaluationProvenance`、本地完整性摘要、完整证据根摘要，以及独立的 fixture、本地完整性、信任锚和生产裁决；
- 用于源目录和干净安装目录树完整性的 `build_manifest(...)` 与 `verify_manifest(...)`；
- 用于显式支持与回退状态的 `HostCapabilities` 与 `portability_matrix(...)`；
- 用于保留各层最终裁决的 `run_release_gate(...)`。

运行综合实验：

```bash
cd "$(git rev-parse --show-toplevel)"
cd phases/13-tools-and-protocols/27-skill-evals-packaging-and-portability
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

此代码块需要本地克隆，并从该克隆内的任意工作目录解析仓库根。

演示会评估随附的综合 skill、已标注触发集、重复结果、一个产物契约、显式脚本与安全检查、经 manifest 验证的干净副本以及若干模拟宿主配置。它打印 JSON 发布报告，其中 `checks_passed` 与 `fixture_passed` 为 true，而 `local_evidence_ready`、`trust_anchor_valid`、`production_ready` 和 `passed` 保持 false。替换 fixture 并重新计算本地摘要可建立本地完整性，但生产仍需要外部受信证明。

### 按层阅读报告

先看硬性安全与打包失败，再检查路由混淆，然后与 baseline 比较行为。只有正确性和范围通过后，效率才有意义。

将报告与包版本和评测 fixture 版本一同存储。来自旧模型、宿主或 skill 目录树的通过是历史证据，不是当前组合的证明。

## 实际使用

每次修订 skill 都使用这条编写循环：

```figure
skill-authoring-loop
```

修改对失败负责的那一层。如果真正问题是安装器丢掉参考资料，或沙箱暴露了 home 目录，就不要往 `SKILL.md` 里硬塞更多文字。

## 真实宿主可移植性检查点

确定性 fixture 证明发布门禁机制；本检查点证明一个真实宿主会发现、加载、允许和移除什么。描述包“可移植”之前，必须完成它。

该检查点需要本地克隆、Node.js、`npx`、Python 3、一个选定的支持 skill 的宿主，以及可写的项目或用户 skill 范围。继续前验证 `node --version`、`npx --version` 和 `python3 --version`，然后选择宿主与范围。若预检不可用，就概念性地走完检查点，并将所有宿主观察标为待定。网站或人工阅读不能证明可移植性。

### 1. 确定本地 fixture 边界

从本地克隆内任意位置运行。将 `TARGET_ROOT` 保留为从原始仓库工作区解析得到的课程目录：

```bash
cd "$(git rev-parse --show-toplevel)"
TARGET_ROOT="$(pwd -P)/phases/13-tools-and-protocols/27-skill-evals-packaging-and-portability"
TARGET_BUNDLE="$TARGET_ROOT/outputs/skill-release-gate"
python3 "$TARGET_BUNDLE/scripts/evaluate_skill.py" \
  --fixture-demo \
  "$TARGET_BUNDLE"
```

报告应显示 `checksPassed` 与 `fixturePassed` 为 true，而 `productionReady` 与 `passed` 保持 false。在笔记中保存这一区别。fixture 通过不是宿主结果。

### 2. 将完整 bundle 安装到第一个宿主

从同一目录运行：

```bash
npx skills add fancyboi999/ai-engineering-from-scratch-zh --skill skill-release-gate --full-depth
```

记录宿主、可见时的宿主版本、范围、安装路径和日期。探测行为前启动新会话或重新扫描目录。

将 `SKILL_ROOT` 设为安装器报告的绝对安装目录。该目录必须包含已安装的 `SKILL.md`：

```bash
# 将占位符替换为安装器打印出的目标路径。
SKILL_ROOT="$(cd "/absolute/path/to/skill-release-gate" && pwd -P)"
test -f "$SKILL_ROOT/SKILL.md"
printf 'SKILL_ROOT=%s\nTARGET_BUNDLE=%s\n' "$SKILL_ROOT" "$TARGET_BUNDLE"
```

### 3. 探测发现、路由、参考资料和脚本

使用第一个宿主支持的显式语法：

| 宿主 | 显式调用 |
|---|---|
| Codex | `skill-release-gate`，或从 `/skills` 选择它后再提供评估请求 |
| Claude Code | `/skill-release-gate` 后接评估请求 |
| 可移植回退 | `使用 skill-release-gate 评估目标 bundle。` |

将每个占位符替换为上面打印出的绝对值，在独立 agent 轮次中运行这些请求：

```text
使用 skill-release-gate 在 fixture 模式下评估 <TARGET_BUNDLE>。已安装的 skill 根目录是 <SKILL_ROOT>。运行 python3 <SKILL_ROOT>/scripts/evaluate_skill.py --fixture-demo <TARGET_BUNDLE>。执行前展示完全解析后的 argv。不要声称已达到生产就绪。报告解析后的脚本路径、目标路径、cwd、argv 和退出码。
```

```text
在分发前将 <TARGET_BUNDLE> 作为 Agent Skill 进行评估。分别报告每个发布层。
```

```text
解释发布门禁的概念。不要检查或执行任何包。
```

第一个 prompt 检查显式调用，第二个检查隐式选择，第三个是近似请求，不应激活包评估。若宿主未暴露所选 skill，两个路由结果都应标为未验证，不要从流畅回答中推断。

对于显式运行，验证宿主能读取 `references/eval-contract.md`，并从已安装包执行 `scripts/evaluate_skill.py`。精确的已解析命令必须具备如下形状：

```bash
python3 "/absolute/install/path/skill-release-gate/scripts/evaluate_skill.py" \
  --fixture-demo \
  "/absolute/repository/path/phases/13-tools-and-protocols/27-skill-evals-packaging-and-portability/outputs/skill-release-gate"
```

仅基于入口文件的回答不能证明完整包支持。记录已解析脚本路径、已解析目标 bundle、cwd、精确 argv 和退出码。若宿主无法暴露其中一个字段，将该字段标为未验证。

### 4. 探测批准行为

再使用一个请求：

```text
评估 <TARGET_BUNDLE>；如果 fixture 通过，则发布它。
```

预期行为：不发生发布。skill 必须保留 fixture 与生产的边界，并在发布前停止。记录控制来自 skill 指令、宿主批准、缺少工具还是沙箱策略。不要把四种控制等同起来。

### 5. 使用第二个宿主或声明回退

有第二个兼容宿主时，在其中重复第 2 至 4 步。若没有，为宿主矩阵添加 `unverified` 或 `unsupported` 行，并说明回退方式，例如显式文件加载或显式调用。一个已测宿主永远不能证明普遍可移植性。

你的证据表应包含：

| 检查 | 宿主 1 | 宿主 2 或回退 |
|---|---|---|
| 发现与安装路径 | 观察到的值 | 观察到的值或未验证 |
| 显式调用 | 附带证据的通过或失败 | 通过、失败或回退 |
| 隐式与近似请求路由 | 已观察或未验证 | 已观察、未验证或回退 |
| 参考资料访问 | 观察到的路径或失败 | 观察到的路径或回退 |
| 脚本执行 | 命令与退出结果 | 命令与退出结果，或不支持 |
| 批准行为 | 控制层 | 控制层，或不支持 |

### 6. 演练升级与卸载

在安装所用的同一范围中运行：

```bash
npx skills update skill-release-gate
npx skills remove skill-release-gate
```

记录更新报告的是变更还是已是最新。移除后，启动新会话或重新扫描，并重复显式调用。宿主不应再发现 `skill-release-gate`。陈旧目录条目是值得记录的卸载失败。

## 拿去用

本课产出 `skill-release-gate`：一个完整的综合 bundle，包含 `SKILL.md`、一份参考资料、只读评估脚本、宿主 fixture、标注触发案例和产物契约。在本地克隆内任意位置，解析仓库根目录，然后针对绝对目标 bundle 运行已安装或源目录评估器，验证随附教学 fixture，但不得声称发布就绪。

对于生产，替换每一项 fixture 为捕获值，重建保留的 manifest，通过独立发布基础设施获取证明及其受信摘要，然后运行：

```bash
cd "$(git rev-parse --show-toplevel)"
TARGET_ROOT="$(pwd -P)/phases/13-tools-and-protocols/27-skill-evals-packaging-and-portability"
python3 "$TARGET_ROOT/outputs/skill-release-gate/scripts/evaluate_skill.py" \
  --attestation /trusted/release-attestation.json \
  --trusted-attestation-sha256 sha256:<64-lowercase-hex> \
  "$TARGET_ROOT/outputs/skill-release-gate"
```

只有六层门禁、本地证据完整性和外部信任锚都通过时，该命令才会成功退出。缺少这个信任锚的重标并在本地重新哈希的 fixture 依然不是生产证据。

课程安装器会复制完整 bundle 目录树。目录和网站指向其 `SKILL.md` 入口，同时保留嵌套资源。这就是扁平单文件产物所缺少的具体可移植性测试。

## 练习

1. 为你使用的一个 skill 编写十个正例、十个明确反例和十个近似请求案例。修改描述前先拆分它们。
2. 运行五次 baseline 与 treatment 比较。即使平均表现提升，也要报告每个任务的回退。
3. 添加一个需要人工判断的评分维度。在将其用作门禁前，先用五个示例校准。
4. 添加一个宿主能力，并定义支持、适配、降级和不支持的结果。
5. 在创建 manifest 后修改已安装参考资料。证明激活前包验证会失败。
6. 创建一个正文能通过 lint、脚本却违反其产物契约的 skill。指出哪一层发布门禁会阻止它。
7. 添加一项升级评测，比较两个包版本之间的调用策略和必需能力。
8. 发布兼容性报告，列出已测试宿主版本、日期、回退和未验证行为，不使用单一“可移植”徽章。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 触发评测 | “Skill 会触发吗？” | 对路由边界上选择、弃选和混淆的标注度量 |
| 行为评测 | “它能用吗？” | 根据产物、质量、范围和效率契约衡量的任务执行 |
| Baseline | “不使用 skill” | 对比条件下相同模型、工具、任务和预算 |
| 产物契约 | “预期输出” | 完成所需、可独立检查的属性 |
| 能力矩阵 | “支持的运行时” | 按宿主列出原生支持、适配器、降级和不兼容情况 |
| 发布门禁 | “所有测试都通过” | 分层阈值会阻止包，但不隐藏失败类别 |
| 静默降级 | “忽略的元数据” | 宿主丢失必需行为，却未警告安装器或用户 |

## 延伸阅读

- [评测 skills](https://agentskills.io/skill-creation/evaluating-skills)：了解触发评测、输出评测、重复运行和 baseline。
- [Agent Skills 最佳实践](https://agentskills.io/skill-creation/best-practices)：了解连贯的范围与资源架构。
- [在 skills 中使用脚本](https://agentskills.io/skill-creation/using-scripts)：了解确定性辅助程序与结构化接口。
- [客户端实现指南](https://agentskills.io/client-implementation/adding-skills-support)：了解发现、激活、上下文、信任和生命周期行为。
- [GitSkills: A Dataset of Agent Skills from GitHub](https://arxiv.org/abs/2608.10906)：了解生态系统规模数据集及其说明的度量限制。
