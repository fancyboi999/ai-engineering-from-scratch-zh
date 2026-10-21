---
id: text-workflow-desks
title: 文本工作流工作台
code: TW
subtitle: 邮件分流、行动项提取、文案改写、反馈分组与变更日志编写。每项输出都等待审核。
hue: 200
sources: projects/inbox-triage-desk, projects/meeting-notes-to-actions, projects/plain-language-rewrite-desk, projects/feedback-theme-board, projects/changelog-writer-from-git
source_hash: c28146e6bd670905
---

## 各工作台的产物
type: concepts
from: projects/inbox-triage-desk/README.md, projects/meeting-notes-to-actions/README.md, projects/plain-language-rewrite-desk/README.md, projects/feedback-theme-board/README.md, projects/changelog-writer-from-git/README.md

- **收件箱分流工作台**：输入 .eml 文件夹，输出 index.html、triage.json 和未发送的 .eml 草稿。
- **会议笔记转行动项**：输入 notes.txt，输出 actions.json、actions.html 与 approved.csv。
- **简明语言改写工作台**：输入文案 JSON，输出已接受的 Markdown 与 revision-decisions.json。
- **反馈主题看板**：输入 JSONL 反馈与主题，输出证据看板与 issue 草稿。
- **Git 变更日志写作器**：输入 Git 范围，输出 release.md 和 release.json 回执。
- **运行时**：收件箱与会议项目使用 Python 3.10，改写使用 Node 22.18，变更日志使用 Go 1.22。

## 运行各工作台
type: command-table
span: 2
from: projects/inbox-triage-desk/README.md, projects/meeting-notes-to-actions/README.md, projects/plain-language-rewrite-desk/README.md, projects/feedback-theme-board/README.md, projects/changelog-writer-from-git/README.md

| 命令 | 作用 |
|---|---|
| `python3 scripts/project_test.py <project> --init <workspace>` | 创建工作区。第一阶段会失败 |
| `python3 scripts/project_test.py <project> --all --solution --strict` | 检查参考解答 |
| `python3 main.py --input ./fixtures --out ./inbox-output` | 构建收件箱审核工作台 |
| `python3 cli.py samples/notes.txt --today 2026-09-29 --output actions.json --html actions.html --csv approved.csv` | 提出行动项，仅导出已批准记录 |
| `node cli.ts sample.json output` | 比较改写结果，写入 output/report.html |
| `node cli.ts sample.jsonl themes.json output` | 按主题归组反馈 |
| `go run .` | 根据两次提交的测试数据编写变更日志 |

## 收件箱工作台流水线
type: architecture
from: projects/inbox-triage-desk/solution/main.py, projects/inbox-triage-desk/README.md

```arch
node | eml | 1,1 | .eml 文件夹 | 每个最大 1 MB | store
node | parse | 2,1 | parse_message | 纯文本正文、Message-ID | process
node | group | 3,1 | group_threads | References 与 In-Reply-To | process
node | tri | 4,1 | triage | 短语规则加证据 | process
node | draft | 4,2 | build_draft | X-Unsent 回复 | process
node | desk | 3,2 | index.html | 按优先级排序 | client
node | json | 2,2 | triage.json | 线程与条目 | store
edge | eml | parse |
edge | parse | group |
edge | group | tri |
edge | tri | draft |
edge | draft | desk |
edge | desk | json |
```

## 会议审核循环
type: flow
from: projects/meeting-notes-to-actions/solution, projects/meeting-notes-to-actions/API.md, projects/meeting-notes-to-actions/README.md

1. **parse_notes**：读取 `ACTION owner | due | task` 行及行号。
2. **proposals**：将 `NAME will TASK by YYYY-MM-DD` 行作为提案加入。
3. **validate_action**：负责人或到期日为 "?" 时，加入 `needs_owner` 或 `needs_date`。
4. **deduplicate**：对负责人、到期日与任务做大小写折叠，合并来源行。
5. **inbox**：从 SHA-256 为每项行动生成 16 位十六进制标识。
6. **审核者**：选择 pending、approved 或 rejected，下载 decisions.json。
7. **重新运行**：`--decisions decisions.json` 仅导出已批准且信息完整的行动项。

## 从 Git 范围生成变更日志
type: annotated-code
lang: bash
from: projects/changelog-writer-from-git/README.md, projects/changelog-writer-from-git/solution/main.go, projects/changelog-writer-from-git/solution/integration.go

```bash
cd projects/changelog-writer-from-git/solution
go run . --repo <path> --from <rev> --to HEAD    # 不可变范围
go run . --input <file>                          # 以 NUL 分隔的导出
git log --format=%H%x00%s%x00%b%x00 FROM..TO     # 导出格式
go run . --output release.md --receipt release.json  # 可复用文件
```

## 项目函数
type: task-table
from: projects/inbox-triage-desk/solution/main.py, projects/meeting-notes-to-actions/API.md, projects/plain-language-rewrite-desk/README.md, projects/feedback-theme-board/solution/main.ts, projects/changelog-writer-from-git/solution

| 任务 | 代码 |
|---|---|
| 分类一封消息 | `triage(message, rules)` |
| 编写未发送的回复 | `build_draft(message: dict, decision: dict)` |
| 发布清单 | `publish(actions, today)` |
| 度量段落 | `measures(text:string)` |
| 导出已接受文本 | `exportRevisions(comparisons,value?)` |
| 匹配短语区间 | `findEvidence(row: Feedback, phrase: string)` |
| 构建主题看板 | `buildBoard(rows: Feedback[], themes: Theme[])` |
| 渲染发布说明 | `Release(label string, commits []Commit, max int)` |

## 基线与模型选项
type: comparison
from: projects/inbox-triage-desk/README.md, projects/meeting-notes-to-actions/API.md, projects/plain-language-rewrite-desk/README.md, projects/feedback-theme-board/README.md, projects/feedback-theme-board/solution/cli.ts

| 因素 | 收件箱 | 会议 | 改写 | 反馈 |
|---|---|---|---|---|
| 基线 | 显式短语规则 | ACTION 行 | 短语替换 | 词组 |
| 模型选项 | `--provider-url` | 无 | 已记录提案 | `--suggest` |
| 模型输出 | model-proposals.json | 无 | 作者提案 | themes.proposed.json |
| 审核门禁 | 每份草稿均需审核 | 显式决策 | 作者接受 | 使用前审核 |
| 不执行的操作 | 发送回复 | 发布任务 | 证明含义不变 | 向跟踪器发布 |

## 默认值与限制
type: defaults
from: projects/changelog-writer-from-git/solution/main.go, projects/inbox-triage-desk/solution/main.py, projects/feedback-theme-board/solution/main.ts, projects/feedback-theme-board/solution/cli.ts, projects/plain-language-rewrite-desk/solution/main.ts

| 设置 | 默认值 | 说明 |
|---|---|---|
| Label 参数 | v0.2.0 | 发布标题 |
| To 参数 | HEAD | 包含在内的结束版本 |
| 每次发布提交数 | 1000 | 更多则报预算超限 |
| 收件箱 `--model` | local-model | 仅用于可选服务商 |
| 消息大小 | 1 MB | 每个 .eml 文件 |
| 反馈输入 | 2 MB | 最多 10000 条记录 |
| 模型主题输入 | 50 | `--suggest` 使用的反馈记录数 |
| 长词 | 8 | 字母数超过此值计为长词 |

## 错误与修正
type: troubleshooting
from: projects/inbox-triage-desk/solution/main.py, projects/inbox-triage-desk/README.md, projects/meeting-notes-to-actions/solution/cli.py, projects/meeting-notes-to-actions/API.md, projects/plain-language-rewrite-desk/solution/main.ts, projects/feedback-theme-board/solution/main.ts, projects/changelog-writer-from-git/solution, projects/changelog-writer-from-git/README.md

| 现象 | 原因 | 修正 |
|---|---|---|
| "Conflicting duplicate Message-ID" | 两个文件共用标识 | 只保留一份消息 |
| 分类不确定 | 规则冲突或均不匹配 | 编辑 `--rules` 中的短语 |
| 正文状态 `no-plain-body` | 消息只有 HTML | 手动审核 |
| "unknown or stale action ids" | 来源行已变 | 重新生成待审核清单并审核 |
| "cannot approve missing owner or due date" | 负责人或到期日为 "?" | 在笔记中补齐 |
| "Resolve factual issues before accepting" | 数字或受保护术语已变 | 先修正提案 |
| "Provide 1 to 30 themes" | 主题列表为空或太长 | 保留 1 至 30 个主题 |
| "changelog: budget exceeded" | 范围超过 1000 次提交 | 缩小 `--from` 与 `--to` 范围 |

## 代码规则
type: concepts
from: projects/inbox-triage-desk/solution/main.py, projects/plain-language-rewrite-desk/solution/main.ts, projects/feedback-theme-board/solution/main.ts, projects/changelog-writer-from-git/solution

- **分流优先级**：action 为 0，uncertain 为 1，information 为 2。
- **行动短语**：please、can you、could you、confirm。
- **改写**："in order to" 改为 "to"，"utilize" 改为 "use"，"prior to" 改为 "before"。
- **重复项**：来源相同且 NFKC 小写文本相同，只计一次。
- **主题顺序**：不同来源最多的优先，然后按 id 排序。
- **分组**：Breaking changes、Features、Fixes、Other。
- **破坏性变更**：页脚含 `BREAKING CHANGE:`，或类型后有 `!`。
- **回退**："This reverts commit" 加 40 位十六进制标识。

## 问答
type: qa
from: projects/inbox-triage-desk/README.md, projects/meeting-notes-to-actions/API.md, projects/plain-language-rewrite-desk/README.md, projects/feedback-theme-board/README.md, projects/changelog-writer-from-git/README.md

- **收件箱工作台会发邮件吗？** 不会。它从不连接邮箱。
- **笔记中什么内容保持未分配？** 两种语法之外的建议。
- **改写检查能证明事实吗？** 不能。它只是词汇保护，含义由作者审核。
- **来源数量能衡量需求吗？** 不能。标签不是经核实的人数或市场规模。
- **变更日志支持哪种哈希？** SHA-1 提交标识。SHA-256 需要扩展。

## 提示
type: tips
from: projects/inbox-triage-desk/README.md, projects/meeting-notes-to-actions/README.md, projects/feedback-theme-board/README.md, projects/changelog-writer-from-git/README.md

- 运行自己的导出前，写下预期结果。
- 将输入保留在输出旁，便于他人复现。
- 集成前阅读 JSON 回执，并测试一个新输入。
- 远程服务商需要 HTTPS。HTTP 仅用于环回地址。
- 完成核心阶段后阅读 integration.go。
