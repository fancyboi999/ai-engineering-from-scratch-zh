# 阶段 13：工具与协议

> AI 与真实世界之间的接口。

本阶段从函数调用和工具 schema 进入可互操作协议、Agent Skills、安全与生产治理。数字顺序适合浏览；下面的聚焦路径才是可靠的学习顺序。

## 在 GitHub 上开始本阶段

**前置要求：** 阶段 11 的 LLM 补全 API。若要学习 MCP 或 Agent Skills，请走下面的聚焦路径，不要假定课程编号就是学习顺序。

**完整阶段的第一课：** [工具接口](01-the-tool-interface/)

从仓库根目录运行：

```bash
python3 phases/13-tools-and-protocols/01-the-tool-interface/code/main.py
```

记录命令、退出码、描述-决策-执行-观察轨迹、被拒绝输入的证据，以及一句解释回合上限的原因。

**下一步：** 继续学习[函数调用深入剖析](02-function-calling-deep-dive/)，或选择下方的 Model Context Protocol（MCP）或 Agent Skills 路径。

浏览[阶段 13 的完整课程列表](../../README.md#phase-13)或[跨阶段路线图](../../ROADMAP.md)。

## Model Context Protocol（MCP）路径

这条聚焦 MCP 路径有 17 课，约 23 小时 15 分钟。它遵循 MCP `2026-07-28`，从一个可自描述的 JSON-RPC 请求走到可运行的合规闸门。

| 阶段 | 课程 | 你要证明什么 | 时间 |
|---|---|---|---:|
| 核心 | [06](06-mcp-fundamentals/)、[07](07-building-an-mcp-server/)、[08](08-building-an-mcp-client/)、[09](09-mcp-transports/)、[10](10-mcp-resources-and-prompts/) | 信封、发现、客户端与服务端行为、传输、资源和 prompts。 | 5 小时 50 分钟 |
| 双向 | [11](11-mcp-sampling/)、[12](12-mcp-roots-and-elicitation/)、[13](13-mcp-async-tasks/)、[14](14-mcp-apps/) | MRTR 输入、显式范围、持久任务，以及不依赖服务端发起请求的应用边界。 | 5 小时 |
| 安全 | [15](15-mcp-security-tool-poisoning/)、[16](16-mcp-security-oauth-2-1/)、[18](18-mcp-auth-production/)、[17](17-mcp-gateways-and-registries/) | 投毒防御、授权、生产 token、网关路由和注册表接纳。 | 5 小时 15 分钟 |
| 进阶 | [28](28-mcp-tool-contracts-and-content/)、[29](29-mcp-reliability-cancellation-and-flow-control/)、[30](30-mcp-registry-supply-chain-and-drift/)、[31](31-mcp-conformance-versioning-and-operations/) | 契约保真度、取消竞态、供应链漂移和发布证据。 | 7 小时 10 分钟 |

确切顺序是 06、07、08、09、10、11、12、13、14、15、16、18、17、28、29、30、31，定义在[`learning-paths/model-context-protocol.json`](../../learning-paths/model-context-protocol.json)。导师会创建 `MCP-LEARNING.md`，每次调用讲一课，并记录每个检查点需要的请求、响应、命令、工作目录、退出码和脱敏后的边界证据。

用你的宿主支持的调用方式开始：

| 宿主 | 调用方式 |
|---|---|
| Codex | `learn-mcp`，或从 `/skills` 中选择 |
| Claude Code | `/learn-mcp` |
| 其他兼容宿主 | `Use learn-mcp to start or resume the Model Context Protocol (MCP) path.` |

### 前十分钟要做什么

从仓库根目录运行第 06 课的无状态轨迹：

```bash
python3 phases/13-tools-and-protocols/06-mcp-fundamentals/code/main.py
```

在输出中找四样东西：重复的请求元数据、完整的 `server/discover` 结果、不支持版本时的 `-32022` 错误，以及不会创建或终止 MCP 协议会话的传输关闭。这段轨迹是第一个检查点，不只是演示。

如果仓库或 Python 3 不可用，阅读[第 06 课](06-mcp-fundamentals/)，手动追踪一次请求和响应。将检查点标记为概念完成，并把运行时、传输、授权和部署证据保持为待完成。

在任何非 loopback 绑定、共享入口、托管端点或注册表发布之前，先完成第 15 课的可执行安全检查点。审查外部目标和请求的授权范围，然后明确确认部署操作。完成教程不等于获得部署权限。

旧版 `initialize`、`Mcp-Session-Id`、独立 SSE `GET`、会话 `DELETE` 和服务端发起请求的流程，只会出现在明确的兼容说明中。现代请求会在 `params._meta` 中声明协议版本和客户端能力，使用 `server/discover`，并携带足够的信息以独立完成验证、授权、路由和重试。

[第 23 课](23-capstone-tool-ecosystem/)是唯一可选的 MCP 路径综合项目。在开始之前，完成 17 节必修课以及[第 19 课](19-a2a-protocol/)和[第 20 课](20-opentelemetry-genai/)。

## Agent Skills 快速路径

这条聚焦路径有五课，约 9 小时 30 分钟：

| 步骤 | 课程 | 结果 | 时间 |
|---:|---|---|---:|
| 1 | [22：可移植契约与运行时边界](22-skills-and-agent-sdks/) | 创建、安装、调用、验证并移除完整的 skill bundle。 | 90 分钟 |
| 2 | [24：发现与渐进式披露](24-skill-discovery-and-progressive-disclosure/) | 追踪发现、编目、激活与资源加载。 | 105 分钟 |
| 3 | [25：调用与路由](25-skill-invocation-and-routing/) | 控制显式、隐式、人工、模型与放弃调用的路径。 | 105 分钟 |
| 4 | [26：权限、沙箱与信任](26-skill-permissions-sandboxes-and-trust/) | 区分指令、权限、隔离与验证。 | 120 分钟 |
| 5 | [27：评估、打包与可移植性](27-skill-evals-packaging-and-portability/) | 构建发布闸门，并在真实宿主中证明行为。 | 150 分钟 |

用你的宿主支持的调用方式开始：

| 宿主 | 调用方式 |
|---|---|
| Codex | `learn-agent-skills`，或从 `/skills` 中选择 |
| Claude Code | `/learn-agent-skills` |
| 其他兼容宿主 | `Use learn-agent-skills to start or resume the Agent Skills Engineering path.` |

导师会创建或恢复 `AGENT-SKILLS-LEARNING.md`，每次调用讲一课，并记录每个检查点需要的证据。这条路径定义在[`learning-paths/agent-skills.json`](../../learning-paths/agent-skills.json)中。

如果想先阅读，从[第 22 课](22-skills-and-agent-sdks/)开始。它的第一个实验约十分钟就能把一个 skill 安装进真实宿主。

### 前置要求快速通道

- 要完成真实实验，需要 `node`、`npx`、`python3`、一个选定的支持 skill 的宿主，以及对所选项目或用户 skill 范围的写入权限。安装前先用 `node --version`、`npx --version` 和 `python3 --version` 验证这三个命令。
- 如果预检条件不具备，请使用网站或手动阅读各课的 `docs/zh.md`。你可以完成概念部分，但发现、调用、脚本、更新和卸载的证据仍应标记为待完成。
- 若不熟悉工具契约，先浏览[第 01 课](01-the-tool-interface/)和[第 05 课](05-tool-schema-design/)。
- 在第 26 课前，确认你能解释工具投毒和不可信指令。[第 15 课](15-mcp-security-tool-poisoning/)是此项预检的可选复习，不是这条路径的第六节必修课。
- [第 23 课](23-capstone-tool-ecosystem/)是可选的系统综合项目，不是完成第 22 课后下一节 Agent Skills 课程。参加之前先完成第 06 至 20 课。

## 完整阶段

请查看[ROADMAP.md](../../ROADMAP.md)了解完整课程计划。
