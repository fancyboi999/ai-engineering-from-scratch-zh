# 为任务选择合适的 MCP 形态

> 谁发起调用、数据有多敏感、任务运行多久、是否需要人看到结果——四个问题就能把模糊需求转化为明确的 primitive、transport、auth path 和 extension 选择。

**类型：** Reference
**语言：** Python
**前置要求：** 第 28 课
**预计时间：** 约 45 分钟

## 学习目标

- 把七类运维用例映射到各自适合的 MCP primitive、transport 和 extension：开发者工具、数据访问、企业记录系统、长时间工作流自动化、交互式 UI、可复用工作流、机器对机器集成
- 通过追问谁控制动作——模型、应用还是用户——在 tool、resource 和 prompt 之间作出选择
- 识别 MCP 不适合的任务，并指出团队应改用什么
- 围绕任何用例设计都必须回答的四个运维问题进行推理：授权路径、缓存范围、同意、可观测性
- 阅读 `server/discover` 结果和 `tools/call` 交互，把其中的缓存提示与扩展声明关联回产生它们的用例

## 问题背景

团队学会 MCP 消息形态后，真实项目一落到桌面，马上会遇到更难的问题：这个任务究竟适合协议的哪种形态？线路规则对五秒查询和二十分钟流水线同样适用，因此 JSON-RPC 信封本身不会强制给出选择。若全凭直觉，常会出现两类错误。有些团队什么都用 tool，包括本可由 host 自行读入上下文的数据。于是每次检索都从应用决策变成模型决策，每个答案都多一次必须由模型点名发起的往返。另一些团队把 MCP 当作任何问题的默认集成层，甚至给永远不会离开单进程的货币格式化器或字符串模板套一台无人复用的服务器，为零互操作收益支付协议开销。真实运维工作还会叠加基础消息形态无法自行解决的问题：无人值守时由谁授权调用，上周缓存的列表是否能安全地复用于当前用户，审核者如何追溯结果来自哪个请求。考试的这个领域会检查考生能否根据任务描述回答这些问题，而不是根据已经标好正确答案的图作答。

## 核心概念

从课程已经建立的规则开始：tool 由模型控制，resource 由应用驱动，prompt 由用户控制。这个划分回答了用例提出的第一个、也是最大的问题：谁应该决定运行这项能力。模型在对话中途主动使用的代码搜索是 tool；host 在模型回答前静默放入上下文的工单当前状态是 resource；用户从菜单明确选择的代码审核清单是 prompt。如果该清单其实是带配套文件的目录化多步骤流程，而不只是单个模板，则 Skills over MCP 扩展（`io.modelcontextprotocol/skills`）会通过本路线已经介绍的同一 `resources/read` 调用提供其说明，并先通过 `skills/list` 和 `skills/get` 完成发现。

再用四个问题补全设计。被封装的系统是在与 host 相同的机器，还是远端？本地文件系统或本地数据库适合 stdio。stdio 实现完全不应运行 OAuth 流程，而应从环境读取凭据。远程系统适合 Streamable HTTP，此时授权进入设计：由人批准重定向时使用核心框架的交互式 OAuth 2.1 流程；无人值守的后台任务使用 OAuth client credentials 授权扩展（`io.modelcontextprotocol/oauth-client-credentials`）；拥有中央身份提供商的组织使用 Enterprise-Managed Authorization 扩展（`io.modelcontextprotocol/enterprise-managed-authorization`），而不是要求每位员工逐一向每台服务器授权。

任务需要运行多久？能在一次请求-响应内完成的调用使用普通结果。可能运行数分钟的部署流水线或批量导入，则应返回 tasks 扩展（`io.modelcontextprotocol/tasks`）的 `CreateTaskResult`，让 client 轮询持久化 `taskId`，而不是保持连接并等待超时：

```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "result": {
    "resultType": "task",
    "taskId": "task_4471",
    "status": "working",
    "ttlMs": 3600000,
    "pollIntervalMs": 2000
  }
}
```

结果是否需要交互界面？数字或短段落保持普通内容。用户确实想点击查看的 dashboard 适合 MCP Apps（`io.modelcontextprotocol/ui`）：工具定义指向由 host 在沙箱 iframe 中渲染的 `ui://` resource，但前提是调用方已声明该扩展：

```json
{
  "_meta": {
    "io.modelcontextprotocol/clientCapabilities": {
      "extensions": { "io.modelcontextprotocol/ui": {} }
    }
  }
}
```

实现良好的服务器在调用方未声明该区块时，仍会返回普通文本内容而不是错误，这就是扩展框架要求双方具备的优雅降级。

数据有多敏感？是否有人在场作出判断？敏感结果应在生成它的六种可缓存操作上携带 `cacheScope: "private"`。它本身绝不是访问控制，只是承诺不会把一个用户的缓存答案交给另一个用户。若有人在场处理敏感或缓慢动作，值得使用 MRTR elicitation，在服务器提交前确认具体细节，沿用本路线其他课程已经构建的重试模式。完全无人在场时，调用只能在已获授的 scope 内运行，因为没有人可以回答 elicitation。对审核者而言，所有路径最终仍以同一方式结束：`_meta` 中的 trace context 跟随调用经过每一跳，审计记录以 token 指定的已认证 principal 为键，绝不能使用 client 可以随意填写的 `clientInfo`。

并非每个任务都值得建立协议边界。永不离开单个进程的能力——格式化字符串、四舍五入、根据本地变量组合 prompt——没有第二个消费者来兑现 MCP 的互操作价值，也没有独立系统可供 client 和 server 分隔。在它外面搭服务器，只是在原本可用的函数调用之上增加 JSON-RPC 信封、发现往返和授权决策。前述七类用例之所以合适，是因为确实存在第二个消费者、第二个 host，或值得守护的边界。若这些条件一个都不成立，正确答案是库函数调用，而不是功能不足的 MCP 服务器。

```figure
mcpa-29-use-case-matrix
```

## 交互实验

图中将本课目录的六个条目与最显著地塑造它们的几个问题排在一起：谁控制 primitive、使用哪种 transport、声明哪个 extension（如果需要）。先看开发者工具一行：tool、stdio、无扩展，因为模型在本机触发的代码搜索只需要一个从自身环境读取信息的可信子进程。再看底部三行：长任务引入 tasks 扩展，交互式 dashboard 引入 ui 扩展，机器对机器同步引入 OAuth client credentials 扩展。注意，每个扩展分别回答四个问题中的不同一项：持续时间、交互性、谁在场授权。中间两行——数据访问与可复用流程——体现另一种 primitive 划分：应用静默读取工单上下文应是 resource；用户明确选择清单则是 prompt，虽然二者都使用相同的远程 transport。

## 实践实验

打开 `code/main.py`。`CATALOG` 包含八个 `UseCaseProfile`：前述七类用例各一个，再加上完全不适合 MCP 的进程内场景。`recommend()` 会把每个 profile 转为携带自身 `reasoning` 路径的 `Recommendation`。运行：

```bash
python3 code/main.py
```

对照上面的核心概念阅读打印目录，然后找到 `run_scenario()`。它让一台 `opsdesk` 服务器依次经历 `server/discover` 调用、`tools/list` 调用、成功的 `search_internal_docs` 调用、两次 `usage_dashboard` 调用（一次未声明 ui 扩展，一次已声明），最后调用不存在的工具。确认 `tools/list` 结果携带 `cacheScope: "private"`，而 `server/discover` 携带 `"public"`，因为服务器自身的能力描述并不敏感，即使其背后的工具敏感。然后为你自选的用例向 `CATALOG` 添加第九个 profile，例如静默十分钟后通知人的监控告警。填写字段，在重新运行脚本前预测 `recommend()` 会返回什么，再用打印的 reasoning 检查预测。

## 交付产物

`outputs/use-case-decision-matrix.md` 用一张表列出七类用例：各自需要的 primitive、transport、auth path、extensions 和 cache scope；旁边还给出“何时 MCP 不是正确工具”的判断方法，以及本课讲解的四项运维关注点。把它放在角色与责任简报旁：后者指出谁负责部署，本课矩阵指出他们面对具体任务时应构建什么。

## 验证

从课程目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试会验证本课主张：本地系统会推荐使用环境凭据、通过 stdio 运行的 tool；应用发起的场景会推荐 resource；用户发起的模板会推荐 prompt 和 skills 扩展；长任务会推荐 tasks 扩展；机器对机器场景会推荐 client credentials 扩展；交互式 dashboard 会推荐带文本回退的 MCP Apps；私有数据会推荐 private cache scope，公开数据会推荐 public cache scope；企业托管部署会推荐 enterprise authorization 扩展；没有外部系统的用例完全不推荐 MCP；演示交互记录的 discover 和 list 结果携带正确缓存提示；未声明 ui 扩展时 dashboard 工具会回退到文本；未知工具属于协议错误；缺少元数据的请求会被拒绝；不支持的版本会列出服务器支持的版本。仓库线路检查器也会依据 2026-07-28 规则验证本课交互记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/29-operational-use-cases
```

## 综合项目关联

综合项目准备度审核要求对一个设计进行端到端辩护，而不是孤立背诵五个领域。本课正是辩护的起点：拿到场景后，在写任何消息前先确定 primitive、transport、auth path、extensions 和 cache scope，也就是本课推荐器用代码回答的四个问题。若综合项目场景中途加入长时间步骤或交互结果，就像上面的目录一样使用 tasks 扩展或 MCP Apps；若场景的一部分根本不需要 MCP，也应直说，不要强行在外面套服务器。

## 关键术语

| 术语 | 含义 |
|------|---------|
| 运维用例 | 设计需要适配 MCP 的具体任务：开发者工具、数据访问、企业记录、长时间自动化、交互式 UI、可复用工作流或机器对机器集成 |
| 控制划分 | Tool 由模型控制、resource 由应用驱动、prompt 由用户控制的规则 |
| Tasks extension | `io.modelcontextprotocol/tasks`；为耗时过长、无法阻塞在一次请求中的工作返回持久化 `taskId` |
| MCP Apps | `io.modelcontextprotocol/ui`；在沙箱 iframe 中把工具结果渲染成交互界面，并提供文本回退 |
| Skills over MCP | `io.modelcontextprotocol/skills`；通过 `resources/read` 提供目录化多步骤流程的说明 |
| Authorization extension | 核心交互流程之外的可选授权路径：无人值守调用方使用 client credentials，中央身份提供商使用 enterprise-managed |
| cacheScope | 可缓存结果上的 `public` 或 `private` 标记，限制跨授权上下文共享；本身绝不是访问控制 |
| 优雅降级 | 调用方未声明服务器提供的扩展时，服务器回退到核心行为或用明确错误拒绝的义务 |

## 延伸阅读

- [MCP 服务端概念](https://modelcontextprotocol.io/docs/2026-07-28/learn/server-concepts)，了解本课所基于的 tools、resources、prompts 控制划分
- [MCP 客户端概念](https://modelcontextprotocol.io/docs/2026-07-28/learn/client-concepts)，了解 elicitation 及其依托的 client 功能
- [扩展概览](https://modelcontextprotocol.io/extensions/overview)，了解扩展标识符、协商与优雅降级
- [MCP Tasks 扩展](https://modelcontextprotocol.io/extensions/tasks/overview)、[MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview)、[基于 MCP 的 Skills](https://modelcontextprotocol.io/extensions/skills/overview) 和 [授权扩展](https://modelcontextprotocol.io/extensions/auth/overview)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 10、14 节
- `phases/13-tools-and-protocols/23-capstone-tool-ecosystem`，查看完整的端到端生态系统场景
