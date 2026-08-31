# Skill 发现与渐进式披露

> Skill 的价值在加载正文之前就已经出现：名称和描述让它进入目录；只有任务走到需要它的地方，深层文件才进入上下文。

**类型：** Build
**语言：** Python（标准库）
**前置要求：** 阶段 13 · 22（Agent Skills：可移植契约与运行时边界）
**预计时间：** 约 105 分钟

## 学习目标

- 构建将 scope、校验、冲突策略与目录发布分离的文件系统发现管线。
- 解释目录元数据、已激活指令与任务专用资源这三个披露层级。
- 设计能让 agent 直接取得所需细节、而无需加载整个包的引用。
- 将目录空间预算与已激活 skill 的上下文预算分开核算。
- 当 skill 读取自身资源时，拒绝路径穿越和符号链接逃逸。

## 问题背景

你的 agent 装了 200 个 skill。会话启动时把每个 `SKILL.md`、引用文件、脚本和模板都读进来，会让无关流程淹没当前任务；什么都不读，又等于要求用户记住准确的文件系统路径。

常见折中是目录：先给模型每个可用 skill 的紧凑身份与路由描述，选中后才加载完整正文。这又带来两个新的工程问题。

第一，发现不只是递归搜索文件。skill 可以位于项目、用户、管理员、插件或内建 scope；两个包可以同名；符号链接可能指向可信根之外；损坏的包可能耗尽目录空间，或根本无法调用。

第二，渐进式披露可能变成渐进式困惑。若 `SKILL.md` 只说“阅读相关指南”，而包里有十二份指南，模型只能猜；若每份指南还指向更多文件，加载就会成为无边界的图遍历。

好的运行时让发现具有确定性，让披露有明确意图。

## 核心概念

### 发现是一条编译器管线

把文件系统当作源输入，别把原始路径直接发布给模型。

```figure
skill-discovery-pipeline
```

每个阶段都应产生结构化数据和结构化失败。发现日志至少应回答：

- 搜索了哪些根？
- 找到了哪些候选项？
- 哪些候选项被拒绝，原因是什么？
- 哪个包赢得了冲突？
- 哪些目录条目因预算而缩短或省略？

没有这些证据，“模型没有用我的 skill”几乎无从诊断。

### 作用域是运行时策略

可移植规范定义 skill 包的形状，不规定通用安装路径或优先级。由宿主决定搜索位置。

| 作用域 | 示例根目录 | 预期所有者 |
|---|---|---|
| 工作区 | `<repo>/.agents/skills/` | 项目维护者 |
| 用户 | `<user-data>/skills/` | 单个开发者 |
| 管理员 | `<system>/skills/` | 机器或组织策略 |
| 插件 | 已签名的插件 bundle | 插件发布者和安装器 |
| 内建 | 运行时包 | 运行时供应商 |

截至 2026 年 8 月，Codex 文档说明会从 `$CWD/.agents/skills` 沿祖先目录搜索到仓库根，也会搜索用户、管理员和内建位置；它支持符号链接 skill 目录，同名项可能同时出现而不是合并。这是 Codex 行为，不是 `SKILL.md` 的要求；写适配器时应核对当前 [Codex skill 文档](https://learn.chatgpt.com/docs/build-skills)。

不要从目录名臆造优先级。把它写成策略并测试。课程实验为每个 `Scope` 设定显式整数 rank，使相同候选集始终得到相同结果。

### 同名冲突需要超出 `name` 的身份

两个名为 `release-readiness` 的包可能都合法：一个是工作区覆盖项，一个是用户默认项。因此目录条目至少需要：

```json
{
  "name": "release-readiness",
  "description": "Inspect a release candidate for this repository.",
  "scope": "workspace",
  "source": "/repo/.agents/skills/release-readiness",
  "selected": true
}
```

| 策略 | 好处 | 风险 |
|---|---|---|
| 保留全部候选项 | 不隐藏任何内容 | 模型会看到歧义名称 |
| 最高优先级 scope 胜出 | 调用简单 | 本地包可能遮蔽可信包 |
| 拒绝重复项 | 不会静默遮蔽 | 合法覆盖也无法工作 |
| 名称附带来源限定 | 身份明确 | 面向用户的名称更长 |

宿主必须选定一种策略。即便被模型目录排除，也要在诊断中保留被拒绝或被遮蔽的候选项。

### 三个披露层级

Agent Skills 规范描述分阶段加载，但每一级服务不同目标。

```figure
skill-disclosure-levels
```

#### 第 1 级：目录元数据

模型只需能把该 skill 与相邻 skill 区分开的信息。规范估计每条目录项约 100 token，但实际序列化和分词由宿主决定。好的描述包含能力与触发边界两部分：

```yaml
description: 验证发布候选项并生成就绪度报告。当用户询问某个版本、标签或包是否已准备好发布时使用。
```

第一句给出能力，第二句说明何时触发。第 25 课会用正例与近似负例评测这条边界。

#### 第 2 级：已激活指令

激活后，正文应既是地图也是流程。规范建议 `SKILL.md` 不超过 500 行；它是设计信号，不是要填满的配额。

正文应包含：

- 任务边界；
- 默认流程；
- 分支条件；
- 指向深层文件的直接引用；
- 工具和脚本契约；
- 失败与停止行为；
- 预期输出及其验证。

不要为了缩短入口文件而把核心流程搬到引用中：激活时模型必须已拥有正确起步所需的信息。

#### 第 3 级：辅助资源

引用提供说明或数据；脚本提供确定性计算；资产是被复制、填充或转成交付物的材料，而不是指令。

| 目录 | 模型会读取？ | 模型会执行？ | 常见内容 |
|---|:---:|:---:|---|
| `references/` | 需要时读取 | 否 | schema、策略、领域指南 |
| `scripts/` | 可检查 | 通过获准工具 | 校验器、转换器、采集器 |
| `assets/` | 有用时才读 | 否 | 模板、fixture、图片、起始文件 |

这些目录名只是约定，没有魔法能力；宿主仍需授予文件访问和执行工具。

### 按分支给引用，优于按主题堆资料

入口文件应写成决策地图：

```markdown
## 选择路径

- 对于 Python 包，阅读 `references/python-release.md`。
- 对于容器镜像，阅读 `references/container-release.md`。
- 对于仅含文档的发布，阅读 `references/docs-release.md`。
- 如果发布组合了多种产物类型，只阅读这些产物对应的指南。
```

这样每份引用都有可观测的加载条件；“阅读 `references/` 了解更多”则没有。

引用图要保持浅层。官方指南建议从 `SKILL.md` 直链，避免深链：一跳的可达性可测试，也能降低关键约束永远进不了上下文的风险。

```figure
skill-reference-map
```

### 目录预算和活跃上下文是两笔预算

设 `c_i` 为 skill `i` 的序列化目录成本，`B_c` 为目录预算，`b_j` 为激活正文成本，`r_k` 为实际加载的资源：

```text
catalog_cost = sum(c_i for every published skill)
active_cost = sum(b_j for every activated skill) + sum(r_k for every disclosed resource)
```

减少一笔预算不会自动减少另一笔。短描述能节省目录空间，但一个激活后的 900 行正文仍可能压垮任务；只有运行时和指令确实避开无关分支时，把正文拆成引用才会减少活跃成本。

当前 Codex 在已知上下文窗口大小时，将初始 skill 列表预算为上下文窗口的 2%。8,000 字符只在窗口大小未知时作为回退值，不是能同 2% 规则叠加的第二个上限。目录超过适用预算时，描述可能被缩短或省略。这些数字是当前 Codex 策略，不是 Agent Skills 标准的属性。

### 资源路径是信任边界

skill 只能读取自己的包内文件。字面字符串前缀检查不够：

```text
references/../../../../.ssh/config
references/external-link -> /private/company-secrets
```

用文件系统语义解析包根和候选项，拒绝绝对输入，并检查解析后的候选项仍在解析后的根下。发现前就决定是否允许符号链接；允许时，每次都检查解析后的目标。

```figure
skill-resource-containment
```

路径包含关系不等于内容可信。合法的包内引用仍可能含有恶意指令；第 26 课会处理这一威胁。

### 加载必须可观测

记录披露事件，但不要记录 secret：

```json
{
  "event": "skill.resource.loaded",
  "skill": "release-readiness",
  "resource": "references/python-release.md",
  "reason": "candidate contains pyproject.toml",
  "bytes": 2840
}
```

`reason` 把上下文选择变成可审查证据，也能发现那些要求 agent “以防万一”加载所有文件的指令。

## 动手构建

`code/main.py` 实现确定性的发现与披露引擎。

发现侧包括：

- 提供来源和优先级元数据的 `Scope`；
- 表示未校验文件系统候选项的 `SkillCandidate`；
- 枚举直接 skill 目录的 `discover_scope(scope)`；
- 应用一项已声明策略的 `resolve_collisions(candidates, precedence)`；
- 发布受限元数据的 `CatalogEntry` 与 `build_catalog(...)`；
- 按序列化条目核算，而非假装字符等同通用 token 的 `CatalogBudget`。

披露侧包括：

- 用于第 2 级激活的 `load_skill_body(entry, ...)`；
- 校验路径包含关系的 `validate_reference(skill_dir, reference)`；
- 有界读取第 3 级资源的 `load_reference(...)`。

运行实验：

```bash
cd "$(git rev-parse --show-toplevel)"
cd phases/13-tools-and-protocols/24-skill-discovery-and-progressive-disclosure
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

这段命令要求本地 clone，并能从 clone 内任意工作目录解析仓库根。

演示会创建临时项目和用户 scope、制造同名冲突、在刻意很小的预算下构建目录、激活一个 skill，并分别尝试合法引用和路径穿越；不会安装永久文件。

### 为什么发现是浅层的

`discover_scope` 只检查直接子目录中的 `SKILL.md`，不会把嵌套目录里每个 `SKILL.md` 都视为独立包。这样既保住包边界，也避免把已安装 skill 的示例或 fixture 意外发布出去。

### 为什么实验不解析任意 YAML

实验只支持目录所需的标量 frontmatter。生产运行时应采用带显式 schema、大小限制并禁用自定义对象构造的安全 YAML 解析器；“仅用标准库”是教学约束，不是可以悄悄发明不完整 YAML 方言的许可。

## 实际使用

对任意发现适配器应用此清单：

1. 列出每个配置根及其写入者。
2. 声明是否允许符号链接的包。
3. 校验包名、目录名、必填元数据与入口正文大小。
4. 在内部身份中保留来源和 scope。
5. 声明并测试重复名称行为。
6. 测量实际发给模型的精确序列化目录。
7. 记录为何加载正文或资源。
8. 把资源读取限制在解析后的包根内。
9. 引用文件缺失时清楚失败。
10. 安装或策略变更时重建目录。

## 拿去用

本课产出 `skill-catalog-builder` bundle。它扫描显式排序的根，拒绝链接的入口文件和名称-目录不匹配，解决跨 scope 冲突，拒绝同优先级重复项，并把选中元数据放入声明的条目、描述和序列化字符预算。

其 JSON 报告列出选中项、被遮蔽候选项、省略项、校验错误、优先级和预算使用量。正文与引用加载仍是独立运行时操作，因此目录构建器不会执行脚本，也不会把整个包纳入上下文。

## 练习

1. 新增插件 scope，并置于用户和内建优先级之间；用测试证明冲突结果。
2. 将冲突策略从最高优先级改为限定名称，并在目录中保留两项。
3. 给 `load_reference` 增加字节上限，测试刚好等于上限和超出一字节的文件。
4. 写两条几乎相同的描述，再改写为触发边界不重叠的版本。
5. 增加记录每个引用和脚本 hash 的 manifest，在加载前检测资源被修改。
6. 给演示加埋点，分别报告第 1、2、3 级的字节数。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| Skill 发现 | “找每个 SKILL.md” | 搜索配置 scope、校验包、附加溯源并应用策略 |
| Skill 目录 | “已安装 skill 列表” | 面向模型的紧凑路由元数据 |
| 冲突策略 | “哪个重复项胜出” | 对不同来源同名候选项的已声明规则 |
| 渐进式披露 | “惰性加载” | 从目录到正文再到分支资源的分阶段上下文准入 |
| 引用图 | “skill 链接的文件” | 可达资源结构及其加载条件 |
| 路径包含 | “留在文件夹里” | 验证解析后的资源目标仍在解析后的包根内 |

## 延伸阅读

- [Agent Skills 规范](https://agentskills.io/specification)：包形状与渐进式披露层级。
- [优化 skill 描述](https://agentskills.io/skill-creation/optimizing-descriptions)：目录路由元数据。
- [Agent Skills 最佳实践](https://agentskills.io/skill-creation/best-practices)：直达引用与入口文件大小。
- [OpenAI：构建 skills](https://learn.chatgpt.com/docs/build-skills)：当前 Codex 的发现 scope 和目录限制。
