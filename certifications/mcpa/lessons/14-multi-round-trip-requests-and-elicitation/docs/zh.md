# 多轮请求与信息征询

> 服务器在调用途中需要用户确认时，不会保持连接并等待。它会结束调用，交给客户端一张回执，再由全新的请求接续此前进度。

**类型：** Reference
**语言：** Python
**前置要求：** 第 13 课
**预计时间：** 约 45 分钟

## 学习目标

- 解释多轮请求（Multi Round-Trip Requests，MRTR）为何取代 elicitation、sampling 和 roots 等服务器发起请求，以及这种取舍如何支持水平扩展服务器
- 把 InputRequiredResult 及其重试解读为普通 JSON-RPC 消息：`inputRequests`、`inputResponses`，以及必须原样回传的 `requestState`
- 区分信息征询的 form 模式和 URL 模式，并判断服务器收集敏感数据时必须使用哪一种
- 只用标准库的 `hmac` 和 `hashlib` 保护 `requestState`，使其经过不受信任的客户端后仍不能被伪造为 capability
- 区分被篡改、已过期、绑定错误和正常工作的 `requestState`，并解释服务器为何必须拒绝前三种情况

## 问题背景

部署工具即将替换某项服务当前运行的版本。在执行前，它需要用户明确同意。过去，仅这一个要求就很难正确实现。

旧模式会让服务器在流上保持原请求不结束，同时沿同一连接发出自己的独立请求，例如 `elicitation/create`。客户端通过第二个请求回答，服务器再把该答案与仍在等待的第一个请求对应起来。单进程服务器与单客户端通信时，这种匹配很简单：同一个进程握着两端。但服务器一旦扩展为多个进程，问题就来了。若负载均衡器把确认请求路由到另一副本，而不是持有原调用的副本，服务器就需要共享存储层，或者用粘性路由把客户端固定到某个实例，只为重新拼接一次对话的两半。这两种方案都很昂贵：共享存储是新的依赖，会带来可用性和清理问题；粘性路由则破坏无状态副本集群所依赖的均匀负载分配。

常见场景承担了最大的代价。大多数 tools 都是临时性的：从部署工具问“确定吗”到收到“确定”，其自身逻辑并不需要保留任何状态。前面课程建立的无状态核心已经说明，服务器不能依赖连接记住请求间的信息。服务器发起请求一旦要求在调用途中获得答案，就打破了这个承诺，因为该答案唯一安全且快速的落点，是仍阻塞等待它的那个进程。

## 核心概念

多轮请求彻底移除了服务器发起请求（SEP-2322）。服务器不再从未结束的调用内部提问；需要更多信息时，它会用一种独立的结果提前结束调用。客户端拿到服务器所需信息后，再发起一个全新且独立的请求。流程分四步：客户端发送请求；服务器判断还需要信息，以 `resultType: "input_required"` 结束该请求；客户端收集缺失信息；客户端带着答案重试原请求，并使用新的请求 id。第四步不依赖哪个服务器副本处理了第一步或第二步，也不依赖哪个副本将处理第四步。任何副本都可以响应，因为所需的一切都随请求传递。

`InputRequiredResult` 包含两个可选字段，这类响应必须至少提供其中一个。`inputRequests` 是一个映射，键是服务器选择的字符串，值必须是 `elicitation/create`、`sampling/createMessage` 或 `roots/list` 三种请求对象之一。除非客户端在同一请求中声明了对应 capability，否则服务器绝不能把该请求类型放进映射。若某个 tool 始终需要确认，而调用方没有声明 `elicitation`，正确响应是协议错误 `-32021 MissingRequiredClientCapability`，并在 `data.requiredCapabilities` 中指出缺少的能力，沿用 capability 协商课介绍的模式。只有三种客户端请求可以收到 `input_required` 结果：`tools/call`、`prompts/get` 和 `resources/read`。其他所有请求始终以 `complete` 结束。

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resultType": "input_required",
    "inputRequests": {
      "confirm": {
        "method": "elicitation/create",
        "params": {
          "mode": "form",
          "message": "Deploy checkout to production? This replaces the running release.",
          "requestedSchema": {
            "type": "object",
            "properties": {"confirmed": {"type": "boolean", "title": "Confirm deploy"}},
            "required": ["confirmed"]
          }
        }
      }
    },
    "requestState": "eyJwcmluY2lwYWwiOiJ1c2VyLWFsaWNlIn0.9f2c...redacted"
  }
}
```

`requestState` 让无状态服务器无需记住任何内容，也能重新接续这段对话。它是不透明字符串，只对签发它的服务器有意义。客户端不得检查、解析或改动其中任何一个字节；重试时，客户端要么原样回传，要么在服务器最初没有发送时完全省略。该字符串会经过服务器无法完全信任的客户端，因此一旦它影响授权、资源访问或业务逻辑，规范就把它视为攻击者可控，并要求使用 HMAC 或 AEAD cipher 保护完整性，验证失败必须拒绝。良好实践是在受保护 payload 中绑定三项内容，并在每次重试时全部检查：经过认证的 principal，防止一名用户的确认 token 被另一人重放；较短的有效期，防止旧 token 数日后重新出现；原请求关键参数的摘要，防止为某次调用签发的 token 被转用到同名 tool 的另一组参数。三项检查本身都不能保证只使用一次；若 token 最多只能兑换一次，服务器仍须在服务端记录。

重试是带全新 JSON-RPC id 的新请求，绝不会复用收到 `input_required` 的调用 id。两者是独立请求，只是恰好共享相同的 `name` 和 `arguments`。重试会增加 `params.inputResponses`：该映射使用服务器在 `inputRequests` 中签发的同一组键，每个值都是匹配的结果类型，即 `ElicitResult`、`CreateMessageResult` 或 `ListRootsResult`。

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "deploy_release",
    "arguments": {"service": "checkout", "environment": "production"},
    "inputResponses": {"confirm": {"action": "accept", "content": {"confirmed": true}}},
    "requestState": "eyJwcmluY2lwYWwiOiJ1c2VyLWFsaWNlIn0.9f2c...redacted"
  }
}
```

信息征询有两种模式。Form 模式要求客户端根据 `requestedSchema` 收集结构化数据。该 schema 仅限由基本类型属性组成的扁平对象：字符串、数字、布尔值，以及单选或多选枚举，不能嵌套。URL 模式会把用户带到一个客户端既不渲染也不检查的页面，适用于第三方 OAuth 流程或支付表单等交互。密码、API key、token 或支付详情必须使用 URL 模式，绝不能使用 form 模式。每个 `ElicitResult` 都会报告三种 action 之一：`accept`（form 模式下带 `content`）、`decline` 或 `cancel`。2026-07-28 之前，URL 模式信息征询还携带自己的 `elicitationId`；带外步骤完成后，服务器可发送 `notifications/elicitation/complete` 通知，并可用错误码 `-32042` 表示需要 URL 信息征询。这三项均已删除：每次 MRTR 交互本就使用普通的、携带 requestState 的重试，服务器通过它就能知道结果，不再需要额外机制。

```figure
mcpa-14-mrtr
```

## 交互实验

图中客户端和服务器各占一条泳道，展示一次部署尝试如何跨越两轮往返。第一条箭头是普通 `tools/call`；响应以 `input_required` 结束该请求，而不是阻塞等待；中间的注释表示客户端正在收集用户答案；第二条箭头是全新且独立的 `tools/call`，携带 `inputResponses` 和第一次响应中一字不改的 `requestState` 字符串；最后一条箭头是普通 `complete` 结果。除了客户端选择回传的内容，没有任何信息跨过中间间隔，也没有服务端内存连接两个请求。

## 实践实验

打开 `code/main.py`。`DeployServer` 暴露一个名为 `deploy_release` 的 tool，每次运行前都用 form 模式信息征询请求确认，并使用完全由 `hmac` 和 `hashlib` 构建、受 HMAC 保护的 `requestState`。`mint_request_state` 会签署一个 payload，其中包含 principal、按本课抽象时钟 tick 计算的过期时间，以及 `digest_request`——tool 名称与参数的 SHA-256 哈希。`verify_request_state` 使用 `hmac.compare_digest` 重新计算签名，然后依次检查 principal、有效期和摘要，最后确认 token 的 nonce 尚未使用。

```bash
python3 code/main.py
```

运行后寻找六类结果。未声明 `elicitation` capability 的访客客户端会立即收到 `-32021`，服务器甚至不会构建它无法回答的 `inputRequests` 项。Alice 确认部署，重试以 `structuredContent.deployed` 为 true 完成。Alice 拒绝另一项部署，重试依然正常完成，`isError` 为 false，因为拒绝是正常结果，不是故障；不会部署任何内容。接下来有四个刻意构造的反例，交互记录都用 `violation` 包裹，避免 wire 检查器把错误输入演示误判为课程缺陷：`requestState` 签名有一个字符被翻转的重试；在 state 的短有效期后才到达的重试；Mallory 重放服务器为 Alice 签发的 state；以及保留 Alice 自己的有效 state、却暗中修改目标环境的重试。这四种情况都返回 tool 执行错误，`isError: true`，并给出通俗原因，与本路线其他地方处理过期 handle 的方式一致。规范要求服务器拒绝验证失败的 state，但没有规定响应通道；本实验选择 tool 执行错误，让模型可以恢复。服务器也可以重新返回 `input_required`，再次询问。模型读到错误后，可以重新调用 tool 获取新确认；它无法修复伪造签名，但能干净地重试，而不是卡在不透明故障中。

## 交付产物

`outputs/mrtr-implementation-checklist.md` 是单页版参考：服务器以 `input_required` 结束调用时必须做什么、不得做什么，如何保护 `requestState`，客户端回传时承担什么责任，form 模式与 URL 模式的选择表，以及考前值得重读的陷阱。

## 验证

在课程目录中运行测试：

```bash
python3 -m unittest discover code/tests
```

测试覆盖本课描述的行为：新调用返回带 `inputRequests` 和 `requestState` 的 `input_required`；使用新 id 且接受确认的重试正常完成并记录部署；重试逐字节回传 `requestState`；拒绝确认会正常完成且不部署任何内容；被篡改的签名、已过期的 state、属于另一 principal 的 state，以及被改用于不同参数的 state，都会作为 tool 执行错误被拒绝；已兑换的 state 不能再次使用；没有 `elicitation` capability 的客户端不会收到自己无法回答的 `inputRequests` 项；缺少必填参数属于 tool 执行错误，而不是协议错误。仓库的 wire 检查器会直接依据 2026-07-28 规则验证同一份交互记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/14-multi-round-trip-requests-and-elicitation
```

## 综合项目关联

综合项目的单次端到端交互包含一次用于征求同意的 MRTR 信息征询，并以本课相同方式保护 `requestState`：绑定 principal、有效期及所属请求的摘要，演示过程中还会拒绝一次篡改尝试。四步流程、新 id 规则、原样回传，以及协议错误与 tool 执行错误的区分，都是最终场景默认你已经熟练掌握的内容。

## 关键术语

| 术语 | 含义 |
|------|---------|
| MRTR | Multi Round-Trip Requests：用 `input_required` 结束调用，而不是推送服务器发起请求的模式 |
| InputRequiredResult | `resultType` 为 `input_required`，并携带 `inputRequests`、`requestState` 或两者的结果 |
| inputRequests | 从服务器选择的键映射到 `elicitation/create`、`sampling/createMessage` 或 `roots/list` 请求 |
| inputResponses | 客户端重试字段，使用与 `inputRequests` 相同的键携带答案 |
| requestState | 服务器签发的不透明字符串，客户端必须原样回传且绝不能解释 |
| Form mode elicitation | 依据扁平 `requestedSchema` 验证的带内结构化数据收集 |
| URL mode elicitation | 在客户端不检查的 URL 进行的带外交互；收集敏感数据时必须使用 |
| ElicitResult action | `accept`、`decline` 或 `cancel`，都是服务器必须处理的正常结果 |
| Principal binding | 把 `requestState` 绑定到经过认证的调用方，防止他人重放 |
| Single use enforcement | 服务端检查已兑换 `requestState` 的 nonce 不能使用两次 |

## 延伸阅读

- [Multi Round-Trip Requests](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)
- [Elicitation](https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation)
- [SEP-2322: Multi Round-Trip Requests](https://modelcontextprotocol.io/seps/2322-MRTR)
- [SEP-1036: URL Mode Elicitation for secure out-of-band interactions](https://modelcontextprotocol.io/seps/1036-url-mode-elicitation-for-secure-out-of-band-intera)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 7 节和第 11 节
- `phases/13-tools-and-protocols/12-mcp-roots-and-elicitation`，从服务器作者视角逐步讲解信息征询
