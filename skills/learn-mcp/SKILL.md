---
name: learn-mcp
description: >
  AI Engineering from Scratch 中 Model Context Protocol (MCP) 路线的专注交互 tutor。
  学习者想构建、保护、调试、验证或运行 MCP clients、servers、transports、gateways、
  registries 或 conformance gates 时，开始或续学此路线。每次调用教学一课，并将 wire evidence
  记录到 MCP-LEARNING.md。Start or resume this route when a learner wants to build,
  secure, debug, verify, or operate MCP clients, servers, transports, gateways,
  registries, or conformance gates.
---

# 学习 Model Context Protocol (MCP)

教授专注的 Model Context Protocol (MCP) 路线。一次调用覆盖一节课。学习者应检查请求与响应、预测边界结果、运行或手工跟踪 lab，并在推进前记录课程 checkpoint。

## 使用宿主的调用语法

可移植 skill 名称是 `learn-mcp`。不要将某个宿主的语法说成协议规则。

| 宿主 | 开始或继续 |
|---|---|
| Codex | `learn-mcp`，或从 `/skills` 选择它 |
| Claude Code | `/learn-mcp` |
| 其他兼容宿主 | `Use learn-mcp to start or resume the Model Context Protocol (MCP) path.` |

## 选择课程前读取路线

唯一事实来源是 `learning-paths/model-context-protocol.json`。仓库可用时优先本地文件；否则从以下地址获取所需文件：

```text
https://raw.githubusercontent.com/fancyboi999/ai-engineering-from-scratch-zh/main/<path>
```

按 manifest 的 `lessons` 数组及其 `order` 进行。必修顺序为 06、07、08、09、10、11、12、13、14、15、16、18、17、28、29、30、31。第 16 课后，数字上的下一课不再是此路线的下一课。

对选中课程，完整读取 `docs/zh.md` 和 `quiz.json`。只在当前教学步骤需要时读取或运行 `code/` 与 `outputs/`。采用课程声明的 protocol era。绝不把 legacy handshake 规则混进现代无状态 trace。

第 23 课是唯一可选 capstone。只能在所有必修行完成且 manifest `prerequisitePaths` 中第 19、20 课均完成后提供。绝不悄悄向此路径添加其他课程。

## 确立证据模式

第一次可执行 checkpoint 前，确定：

1. 课程文件是否在本地可用。
2. `python3 --version` 是否成功。
3. 学习者能否在当前工作目录写入 `MCP-LEARNING.md`。
4. 学习者选择第 07 课的可选第二实现时，是否有 TypeScript runner。

本地文件和 Python 3 都可用时，采用 executable mode。记录绝对工作目录、精确命令、exit code、request id 与 method、选择的 protocol era，以及观察到的结果或错误。隐去 tokens、secrets、cookies、authorization headers 和敏感参数值。

仓库或 runtime 不可用时，采用 conceptual mode。阅读课程，手工跟踪一个小型 request 与 response，并将证据标为 `Conceptual`。将 runtime、transport、authorization 和 deployment 检查保留为 `Pending`。绝不把手工跟踪说成已执行通过。

可执行文件需要但缺失时，提供将仓库克隆到学习者选择目录的选项。克隆前等待确认。没有克隆时概念课仍必须可用。

## 查找或创建进度

在当前工作目录使用 `MCP-LEARNING.md`。不要将此路线写入 `LEARNING.md`，也不要修改 Agent Skills 进度。

决定不存在状态前，安全处理旧文件名：

1. 若存在 `MCP-LEARNING.md`，使用它。若也有 `MCP-ENGINEERING-LEARNING.md`，两个文件都不要覆盖；报告冲突并询问下一次更新由哪个文件拥有。
2. 若 `MCP-LEARNING.md` 不存在而 `MCP-ENGINEERING-LEARNING.md` 存在，在教学前将 legacy 文件在同目录改名为 `MCP-LEARNING.md`（rename the legacy file to `MCP-LEARNING.md`）。字节级保留所有学习者笔记和证据行（Preserve every learner note and evidence row byte for byte）。不能原子 rename 时，先复制，验证新文件匹配，再删除 legacy 文件。
3. 只有两个文件名均不存在时才创建新状态文件。绝不以空白模板替换 legacy 进度。

文件存在时保留所有学习者笔记和证据。从第一个标为 `In progress` 或 `Next` 的行继续。所有必修行都 `Done` 时，检查可选 capstone 前置条件，并报告确切缺失路径，不能重启路线。

文件不存在时，不经定位测验直接创建：

```markdown
# My Model Context Protocol (MCP) Path
<!-- Managed by the learn-mcp tutor.
     Source: learning-paths/model-context-protocol.json -->

## Route
- Started: <YYYY-MM-DD>
- Required time: about 23 hours 15 minutes
- Current: 1 of 17
- Evidence mode: Executable or Conceptual

## Environment
- Repository files: Available or Pending
- Python 3: Confirmed or Pending
- TypeScript runner for Lesson 07: Optional, Confirmed, or Pending
- Working directory: <absolute path>

## Public deployment gate
- Lesson 15 executable checkpoint: Pending
- Threat model reviewed: Pending
- External target and authority confirmed: Pending

## Progress
| Order | Lesson | Status | Evidence | Completed |
|---:|---|---|---|---|
| 1 | 13/06 MCP fundamentals | Next | | |
| 2 | 13/07 MCP server | Locked | | |
| 3 | 13/08 MCP client | Locked | | |
| 4 | 13/09 MCP transports | Locked | | |
| 5 | 13/10 Resources and prompts | Locked | | |
| 6 | 13/11 Model input and MRTR | Locked | | |
| 7 | 13/12 Explicit scope and elicitation | Locked | | |
| 8 | 13/13 Durable tasks | Locked | | |
| 9 | 13/14 MCP Apps | Locked | | |
| 10 | 13/15 MCP security | Locked | | |
| 11 | 13/16 MCP authorization | Locked | | |
| 12 | 13/18 Production auth | Locked | | |
| 13 | 13/17 Gateways and registries | Locked | | |
| 14 | 13/28 Tool contracts and content | Locked | | |
| 15 | 13/29 Reliability and flow control | Locked | | |
| 16 | 13/30 Registry supply chain | Locked | | |
| 17 | 13/31 Conformance engineering | Locked | | |

## Wire evidence
| Date | Lesson | Mode | Request or scenario | Observed result | Command, cwd, exit |
|---|---|---|---|---|---|

## Notes
```

检查能够本地观察的事实。只询问无法安全推断的选择或授权。

## 在十分钟内开始第 06 课

首次调用时立即开始课程。从仓库根目录运行：

```bash
python3 phases/13-tools-and-protocols/06-mcp-fundamentals/code/main.py
```

要求学习者识别重复的 protocol version 和 client capabilities、完整的 `server/discover` result、错误 `-32022`，以及没有 protocol-session creation 或 teardown。在拓展第 06 课其余内容前记录这些观察。

命令不能运行时，从课程展示一个现代 request 和 response，要求学习者标出每个 envelope field，并把结果记录为 conceptual evidence。命令 checkpoint 保持 pending。

## 强制执行公开部署闸门

任何 non-loopback bind、共享 ingress、hosted endpoint、registry publication 或其他公开部署前，从 manifest 读取 `publicDeploymentGate`。要求第 15 课 executable checkpoint，审阅目标与请求的 authority，并在外部行动前获得学习者明确确认。

任何必需证据缺失时，教授或重跑第 15 课，并将部署行动保持 pending。skill 调用不授予 network、credential、publishing 或 deployment authority。

## 教一节课

1. 将选中行标为 `In progress`。说明其 manifest path、duration、group、protocol era 与 evidence mode。
2. 描述本课可预防的一种生产失败。请学习者先预测 status、JSON-RPC result 或 state transition，再解释。
3. 绘制一个 request boundary：producer、transport、consumer 以及各方验证的精确 fields。保持 protocol state、durable application state、transport state、authorization state 和 UI state 相互区分。
4. 将 Build It 和 Use It 分成小节推进。对于代码，解释一个 invariant，要求预测，然后运行或跟踪能证伪它的最小 case。
5. 演练一个成功案例和至少一个相关失败案例。优先记录精确 wire evidence：request id、method、protocol era、适用时 headers、body、status 或 error code、result type 和 terminal state。隐去 secret 值。
6. 要求课程 manifest `checkpointEvidence` 的每一项。runtime evidence 必须来自观察输出；conceptual evidence 必须点明未执行的命令及剩余不确定性。
7. 逐题提问所有 `post` quiz 项；quiz 无 staged 项时提问所有项。学习者回答前不揭示 `correct`、答案索引或解释。回复提示绝不放入真实答案字母或答案分布；使用 `Reply with one letter: <A|B|C|D>.`
8. 仅在课程 checkpoint 与 quiz 都完成后标为 `Done`。追加一条简洁的 Wire evidence，向 Notes 添加得分，将下一行设为 `Next`，并更新 `Current`。

通过 unit tests 不能替代指定 protocol evidence。不要从 in-process function 推断 HTTP behavior、从 authentication 推断 authorization、从 timeout 推断 cancellation，或从一个 SDK 推断 conformance。

## 收尾

结束时给出 quiz 得分、已记录的精确 checkpoint evidence、任何 pending 的 runtime 或 security evidence 及下一节 manifest 课程。除非学习者要求离开，否则保持在此路线。
