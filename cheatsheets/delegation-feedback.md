---
id: delegation-feedback
title: 委派、隔离与反馈棘轮
code: DI
subtitle: 依据证据制定计划，按排他所有权拆分工作，并把每次纠正提升到最早负责原因的层级。
hue: 280
sources: phases/14-agent-engineering/44-plan-from-evidence, phases/14-agent-engineering/45-delegate-with-isolation, phases/14-agent-engineering/46-turn-feedback-into-system, phases/14-agent-engineering/54-build-the-feedback-ratchet, projects/workflow-hooks
source_hash: 511e28fb69dbc3de
---

## 规划、委派与集成
type: architecture
from: phases/14-agent-engineering/44-plan-from-evidence/docs/zh.md, phases/14-agent-engineering/45-delegate-with-isolation/docs/zh.md

```arch
node | plan | 1,1 | 已批准的计划 | 根据依赖划分批次 | store
node | api | 2,1 | API 工作单元 | 独占负责路径 | process
node | docs | 2,2 | 文档工作单元 | 独占负责路径 | process
node | h1 | 3,1 | 证明与交接 | API 单元 | store
node | h2 | 3,2 | 证明与交接 | 文档单元 | store
node | rev | 4,1 | 集成评审 | 只读 | model
node | gate | 4,2 | 完整验证门禁 | 跨单元 | process
edge | plan | api |
edge | plan | docs |
edge | api | h1 |
edge | docs | h2 |
edge | h1 | rev |
edge | h2 | rev |
edge | rev | gate |
```

## 棘轮循环
type: flow
from: phases/14-agent-engineering/54-build-the-feedback-ratchet/docs/zh.md

1. **观察**：记录具体信号。
2. **关联**：将其关联到结果、约束或假设。
3. **定位**：找到最早负责原因的系统层级。
4. **修改**：创建有明确边界且只有一个负责人的改动。
5. **验证**：证明再次发生的可能性降低。
6. **评审**：决定保留、修订或退役该控制措施。

## 每项工作的五项承诺
type: concepts
from: phases/14-agent-engineering/44-plan-from-evidence/docs/zh.md, phases/14-agent-engineering/44-plan-from-evidence/code/main.py

- **标识**：用于依赖关系和交接的稳定引用。
- **改动**：最小的行为或契约变更。
- **证据**：支持该变更的仓库事实。
- **依赖**：必须先成立的工作条件。
- **证明**：关闭该事项所需的确切检查。
- **批次**：依赖均已完成的事项，可以一起执行。
- **契约优先**：实现和文档都等待契约确定。

## 委派还是串行
type: comparison
from: phases/14-agent-engineering/45-delegate-with-isolation/docs/zh.md

| 比较项 | 委派 | 保持串行 |
|---|---|---|
| 文件 | 文件与契约互不重叠 | 相同文件 |
| 决策 | 不同的未知问题 | 同一个未决问题 |
| 环境 | 独立 worktree 或沙箱 | 相同可变环境 |
| 实验示例 | API 和文档单元的路径不重叠 | 文档单元拥有 app/，计划被阻塞 |

## 三层隔离
type: concepts
from: phases/14-agent-engineering/45-delegate-with-isolation/docs/zh.md

- **文件系统**：独立 worktree 或沙箱可阻止意外的共享编辑。
- **所有权**：契约阻止两名执行者编辑同一路径。
- **状态**：独立日志与输出保留每名执行者的证据。
- **限制**：两个干净的 worktree 仍可能产生冲突的设计。
- **集成者**：读取证明输出，按依赖顺序合并，再运行完整门禁。

## 把信号路由到所属层
type: concepts
from: phases/14-agent-engineering/46-turn-feedback-into-system/docs/zh.md, phases/14-agent-engineering/54-build-the-feedback-ratchet/docs/zh.md, phases/14-agent-engineering/54-build-the-feedback-ratchet/code/main.py

- **结果错误、回归、误报**：评估或测试。
- **上下文缺失、重复工作、过时事实**：上下文来源。
- **越界或不安全动作**：范围或权限策略。
- **超时、重试风暴**：运行时控制。
- **反复出现的设置或命令错误**：自动化或工具。
- **输出格式错误**：标准示例与校验器。
- **产品分歧**：人工决策记录或明确范围的待办项。
- **优先级**：严重程度乘以频率。严重程度为一至五。

## 课程函数
type: task-table
from: phases/14-agent-engineering/44-plan-from-evidence/code/main.py, phases/14-agent-engineering/45-delegate-with-isolation/code/main.py, phases/14-agent-engineering/46-turn-feedback-into-system/code/main.py, phases/14-agent-engineering/54-build-the-feedback-ratchet/code/main.py

| 任务 | 代码 |
|---|---|
| 检查计划凭据 | `validate(items)` |
| 计算计划批次 | `execution_waves(items)` |
| 生成 ready 或 blocked 的计划状态 | `plan_document(items)` |
| 检测父路径重叠 | `paths_overlap(left, right)` |
| 生成委派状态 | `delegation_plan(units)` |
| 将纠正转为控制措施 | `promote(correction)` |
| 按指纹去重 | `ratchet(corrections)` |
| 将信号转为排序后的动作 | `backlog(signals)` |

## 工作流钩子 CLI
type: command-table
span: 2
from: projects/workflow-hooks/README.md, projects/workflow-hooks/solution/cli.ts, projects/workflow-hooks/stages/03-policy/docs/zh.md

| 命令 | 作用 |
|---|---|
| `python3 scripts/project_test.py workflow-hooks --init learning-artifacts/workflow-hooks` | 创建学习工作区 |
| `python3 scripts/project_test.py workflow-hooks --stage <n> --path learning-artifacts/workflow-hooks` | 测试一个阶段 |
| `python3 scripts/project_test.py workflow-hooks --all --solution --strict` | 检查参考解答 |
| `node <dir>/cli.ts capture <store> <corrections.jsonl>` | 摄取纠正记录并保存存储 |
| `node <dir>/cli.ts inspect <store>` | 列出规则及其 `approval_digest` |
| `node <dir>/cli.ts approve <store> <digest>` | 使用当前精确摘要批准规则 |
| `node <dir>/cli.ts emit <store> <scope>` | 输出作用域内已批准规则的 `additional_context` |
| `node <dir>/cli.ts retire <store> <digest>` | 停止输出该规则，证据保留 |

## 代码中的规则生命周期
type: annotated-code
lang: typescript
from: projects/workflow-hooks/solution/main.ts, projects/workflow-hooks/solution/cli.ts

```typescript
const c = ingest(raw);                       // 作用域转小写，规则保留大小写
const rules = consolidate(corrections);      // 按作用域和规则文本分组
rule.sessions.length                         // 独立会话数，而非事件数
transition(rule, "approve");                 // 需要 minimumSessions = 2
transition(rule, "retire");                  // 已退役规则不能批准
hook(rules, "orchard");                      // 已批准，匹配作用域或全局
ruleDigest(rule);                            // 作用域、文本、证据的 sha256
await save("rules.json", rules);             // 先临时文件，再 fs.rename
await load("rules.json");                    // ENOENT 返回空列表
```

## 默认值与限制
type: defaults
from: projects/workflow-hooks/solution/main.ts, phases/14-agent-engineering/46-turn-feedback-into-system/code/main.py, phases/14-agent-engineering/54-build-the-feedback-ratchet/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `minimumSessions` | 2 | 批准所需的独立会话数 |
| `c.rule.length` | 500 | 更长的规则报 "too large" |
| `c.source.length` | 2000 | 更长的来源报 "too large" |
| 存储 `version` | 1 | 其他版本报 "invalid store" |
| 临时文件 `mode` | 0o600 | 仅所有者有权限 |
| `recurrence` 下限 | 1 | 低于此值时跳过纠正 |
| 控制措施指纹 | 12 | sha256 的十六进制字符数 |
| 信号 `severity` | range(1, 6) | 频率必须为正 |

## 错误与修正
type: troubleshooting
span: 2
from: phases/14-agent-engineering/44-plan-from-evidence/code/main.py, phases/14-agent-engineering/45-delegate-with-isolation/code/main.py, phases/14-agent-engineering/45-delegate-with-isolation/docs/zh.md, projects/workflow-hooks/solution/main.ts, projects/workflow-hooks/solution/cli.ts

| 现象 | 原因 | 修正 |
|---|---|---|
| `has no repository evidence` | 工作项缺少凭据 | 添加文件路径与行号 |
| `has no proof command` | 证明为空 | 写明关闭该项的确切检查 |
| `dependency cycle among` | 工作项互相等待 | 找出隐藏的产品分歧 |
| `conflicts` 中出现 `overlap at` | 文档单元拥有父路径 `app/` | 为每个单元分配排他路径 |
| `insufficient independent sessions` | 一个会话中有多个事件 | 等待第二个独立会话 |
| `exact current rule digest required` | 新证据使旧摘要失效 | 运行 inspect，批准新摘要 |
| `credential-like content` | 规则或来源包含类似密钥的内容 | 摄取前先脱敏 |
| `conflicting correction id` | 同一 id 对应不同内容 | 新内容绝不复用旧 id |

## 问答
type: qa
from: phases/14-agent-engineering/44-plan-from-evidence/docs/zh.md, phases/14-agent-engineering/45-delegate-with-isolation/docs/zh.md, phases/14-agent-engineering/46-turn-feedback-into-system/docs/zh.md, projects/workflow-hooks/stages/02-consolidate/docs/zh.md

- **什么时候证据才有意义？** 它能改变计划时。
- **集成者重写了大部分结果？** 说明拆分方式有问题。
- **为何统计会话而不是事件？** 重复投递的钩子不是独立证据。
- **每次纠正都要提升为控制措施吗？** 不。只有复发频率或后果足以支持时才做。
- **谁负责对外行为变更？** 人类负责。agent 负责有界工作。

## 提示
type: tips
from: phases/14-agent-engineering/46-turn-feedback-into-system/docs/zh.md, phases/14-agent-engineering/54-build-the-feedback-ratchet/docs/zh.md, projects/workflow-hooks/README.md

- 修复原因。“agent 编辑了 README”只是现象。
- 有针对性的测试比一段要求 agent 记住的文字更有效。
- 每项控制措施要有一个负责人、验证方法和退役条件。
- 只有证据支持时才退役控制措施，不因感觉过时就删除。
- 在规则中保留 API_KEY 的精确大小写。
