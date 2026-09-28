# 同意与最小权限

> 会改变现实世界状态的工具调用，不能只因模型决定调用就运行。它应在用户明确同意这一次具体调用后才执行，而 client 持有的访问权限也不应超过该调用实际所需。

**类型：** Reference
**语言：** Python
**前置要求：** 第 24 课
**预计时间：** 约 45 分钟

## 学习目标

- 解释为什么 MCP 不提供从 server 到 client 的批准 push，以及 multi round-trip request（MRTR）elicitation 如何传递同意问题
- 区分按工具限定的同意与笼统的“信任此 server”授权，并解释工具注解为何可以辅助决策，却不能执行决策
- 读取 HTTP 403 insufficient_scope challenge，并把 client 已持有 scope 与 challenge 要求的 scope 取并集，计算下一次应请求的 scope
- 为 step-up authorization 循环设置重试上限，让无法取得所需 scope 的 client 明确失败，而不是无限重试
- 解释为什么 `tools/list` 等结果可以随调用方获授的 scope 变化，却不能对同一调用方的同一个请求给出前后不同的结果

## 问题背景

拥有工具访问权的 agent 能做出难以撤销的操作：删除文件、发送付款、联系客户、撤销账户。执行这些操作的工具位于 client 并未编写的 server 上，由模型决定何时调用。两种设计都会失败。如果 server 一连接就把所有调用视为预先批准，那么一个粗心或被攻破的 server 就能以用户完整权限行动，整个过程没有让人检查即将发生什么的机会。反过来，如果每次调用——包括只读数据——都要求重新确认，prompt 就会沦为噪声，用户不再阅读，只会一路点击。这不是同意，只是披着同意外衣的疲劳。

在 MCP 中做好这件事，比制定一条策略更难，因为协议没有捷径可走。2026-07-28 修订版没有 session，也没有 server 发起的 push：server 不能像旧式面向连接协议那样，在调用中途打断 client 并提问。人工门控下面还叠着第二道容易混淆的门：在请求任何人批准之前，client 自己的 access token 必须具备操作所需的 OAuth scope。同意回答“这次具体行动应不应该发生”，scope 回答“此 client 是否有资格尝试此类行动”。只讲其中一项，就漏掉了“安全与治理”领域的一半。

## 核心概念

### 两道同意边界：host 调用前确认与 server 请求补充输入

工具由模型控制：模型决定何时调用。规范不强制采用某种特定交互模型，但明确要求始终保留 human-in-the-loop，使人能够拒绝调用；应用还应展示公开了哪些工具、标明工具何时运行，并在敏感操作执行前确认。host 必须在发出敏感操作的 `tools/call` 前自行展示具体操作、取得用户批准；不能依赖不可信的 server 主动索要批准。实验中的 host 使用 `approve_invocation` 在发请求前对具名工具及参数做决定；拒绝时不会产生 `tools/call`。这个教学回调默认只在演示场景放行，不代表生产授权。下面展示另一条边界：server 已收到调用、还需要用户补充输入时，可通过 Multi Round-Trip Request（MRTR）提问。它返回 `resultType: "input_required"`，其中 `inputRequests` map 的条目为 `elicitation/create` 请求；如果答案要回到同一个调用，还会带上 `requestState` 字符串。client 收集答案后，以全新的 JSON-RPC id 重试完全相同的操作，把答案放在 `inputResponses` 下并使用 server 指定的相同 key，再逐字节原样回传 `requestState`。

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "resultType": "input_required",
    "inputRequests": {
      "confirm": {
        "method": "elicitation/create",
        "params": {
          "mode": "form",
          "message": "Allow delete_file to run with arguments {\"path\": \"notes.txt\"}?",
          "requestedSchema": {
            "type": "object",
            "properties": {"approved": {"type": "boolean", "title": "Approve this call"}},
            "required": ["approved"]
          }
        }
      }
    },
    "requestState": "eyJ0b29sIjogImRlbGV0ZV9maWxlIn0.9f2c..."
  }
}
```

用户答案必须是三种 action 之一，绝不是裸露的 yes 或 no：`accept`（form mode 下带符合 requested schema 的 `content`）、`decline`（用户明确拒绝）或 `cancel`（用户离开，没有决定）。`decline` 和 `cancel` 都会阻止调用执行；只有带有效 `content` 的 `accept` 构成同意并允许调用继续；client 若把 `cancel` 当成 `decline`，或悄悄重试其中任意一种，都是在猜测用户意图。这些情况都不是协议错误。server 因未取得同意而拒绝运行工具时，应像报告其他业务拒绝一样：返回普通 `tools/call` 结果，其中 `isError: true`，并附上模型可读的文本，而不是 JSON-RPC error，更不能杜撰 error code。2026-07-28 的 error 表中没有“需要同意”这一项，也不该有。

`requestState` 需要像其他跨越信任边界、稍后又传回的值一样受到怀疑：一旦离开 server，它就是攻击者可控输入。如果它会影响实际运行内容，就应签名（大多数 server 使用 HMAC 或 AEAD 足够）、绑定到签发时的具体调用，并且只消费一次。retry 若提交某个调用的 `requestState`，却要求使用另一组参数执行，就不是合法 retry，而是在用户看过后篡改了请求；这种变化必须由 server 自己的签名检查捕获，而不是依赖线协议格式。

### 将同意限定到单个工具，而非整个 server

用户授予的同意必须限定到获批的具名工具、参数和这一次调用；批准 `delete_file` 的一次请求既不代表批准后续 `delete_file`，也不代表批准 `send_payment`，即使二者位于同一个 server、同一段对话中，甚至只相隔片刻。“信任此 server”的授权会抹杀单独命名工具的意义：它把一次具体、知情的决定扩大成用户从未作过的笼统决定。工具 `annotations` 在这里很有价值，也立即暴露出边界。`readOnlyHint`、`destructiveHint` 和 `openWorldHint` 正是 client 判断何时需要 prompt 的信号：只读调用通常可以不确认，而写入、删除、发送或访问开放世界的调用通常不应如此。但注解是 server 对自身设置的提示，规范明确要求 client 将其视为不可信，除非 server 本身受信。一个谎称只读的工具，不会因为 `annotations` 这么写就变安全。无论 client 在注解之上构建什么策略，实际执行机制——记录用户究竟批准了哪个具名工具——都必须位于 client，而不是依赖 server 对自身工具的声明。默认值也很重要：`destructiveHint` 和 `openWorldHint` 默认为 true，`readOnlyHint` 默认为 false。完全没有注解的工具默认被视为具有破坏性且会访问开放世界，而不是默认安全。server 沉默时，协议有意采取保守立场。

### Step-up authorization：位于下一层的另一道门

调用甚至可能在到达同意流程前，就因完全不同的原因失败：支撑调用的 token 没有足够 scope。这发生在传输层，由 OAuth 管理，回答的问题也与同意不同。请求 scope 不足时，server 返回 `403 Forbidden`，并在 `WWW-Authenticate` header 的一次 challenge 中列出操作所需的全部 scope，而不是跨多轮逐个给出：

```http
HTTP/1.1 403 Forbidden
WWW-Authenticate: Bearer error="insufficient_scope",
                         scope="payments:write",
                         resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"
```

client 应将已持有 scope 与本次 challenge 中的 scope 取并集，绝不能用后者替换前者。server 针对单次操作发起 challenge，不应让 client 丢掉此前已获得的 scope。client 随后为并集重新授权并重试。这与选择初始 scope 不是同一流程：client 第一次授权、初始 `401` 完全不含 `scope` 参数时，应回退到 server Protected Resource Metadata 的 `scopes_supported` 作为最小起始集合，而不是请求 server 定义过的所有权限。两条规则的理由一致：只在需要时请求所需权限，一次干净地完成 step-up，不要经过多轮一点点挤出额外权限。step-up 循环还必须设限。client 只能少量、有限地重试重新授权；超过上限后，应把操作视为永久授权失败，而不是围绕永远拿不到的 scope 循环。

### Server 暴露能力时也要遵循最小权限

无状态意味着 `tools/list` 绝不能因其他请求的副作用而改变，并且对于处于相同授权状态的同一调用方，每次都必须返回相同工具。但两个不同调用方可以看到不同结果，因为请求携带的 scope 属于输入，而不是连接状态。如果 server 对所有人展示全部工具，只在无权调用的人真正尝试后才拒绝，就会泄露调用方本不该知道的 capability 及其形态，还会训练模型尝试注定失败的调用。最小权限做法是根据实际提交的 scope 过滤 `tools/list`，并将结果标为 `cacheScope: "private"` 而非 `"public"`，否则公开缓存副本会把一个用户的工具界面泄露给另一个用户。

```figure
mcpa-25-consent-gates
```

## 交互实验

图中跟踪一个 `tools/call` 在执行前可能遇到的两道门。首先跨越授权边界：若 token scope 不足，server 以 `403` 和必需 scope 将其弹回；client 把该 scope 与已持有 scope 取并集后重试。授权通过后，调用才抵达同意门控：若 server 在收到调用后仍需补充输入，且本次调用尚未获得所需答案，server 返回 `input_required`，不会执行任何操作；client 通过一次 `elicitation/create` 往返解决问题后再重试。注意两道门相互独立且有先后顺序：完全获授权的 client 仍可能被要求同意；没有同意问题的 client 也可能缺少 scope。工具可能位于任一道门、两道门之后，或者两者皆无。

## 实践实验

打开 `code/main.py`。host 的 `approve_invocation` 会逐次决定能否发送敏感调用；它与 server 在调用中途请求补充输入的 MRTR 不是同一道门。代码构建一个包含四个工具的 server：`list_files`（只读、封闭世界，立即运行）、`search_web`（只读但面向开放世界，因为 openWorldHint 为 true，仍须同意门控）、`delete_file`（破坏性操作，须同意门控；背后有小型内存文件系统，可以观察 decline 后文件仍未改变）以及 `send_payment`（破坏性操作，并受 `payments:write` scope 门控，因此同时经过两道门）。

```bash
python3 code/main.py
```

对照上面的流程阅读 transcript。找到 `delete_file` 的 `input_required` 结果、保留 `notes.txt` 的 `decline`、随后出现的新 elicitation（decline 不会被记作同意），以及最终删除文件的已接受 retry。然后找到故意错误的条目：retry 回传有效 `requestState`，却要求删除并非用户看到的另一个文件。它在 transcript 中标为 `violation`，因为 server 的签名检查捕获了不匹配，而不是盲信 retry。另一边，观察 `send_payment` 如何因 scope challenge 遭拒、client 如何计算 `payments:read` 与被要求的 `payments:write` 的并集，以及之后才抵达独立的同意 prompt。最后比较只有 `payments:read` 时与另外获得 `payments:write` 后，`tools/list` 分别返回什么。

## 交付产物

`outputs/consent-design-checklist.md` 是用于审查同意与授权设计的一页式参考资料：何时提示、如何限定授权、如何构造 step-up challenge，以及哪些失败模式应一眼否决。

## 验证

在课程目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试检查本课各项主张：host 拒绝时敏感请求不会发出，且批准只针对本次具名工具及参数；只读工具无需 prompt 即可运行；破坏性工具会触发 elicitation；decline（以及 cancel）不会产生副作用；对一个工具的同意绝不覆盖另一个；篡改过的 retry 会被拒绝，却不会消耗合法的 `requestState`；已消费的 `requestState` 不能重放；step-up authorization 会计算 scope 并集并强制执行重试上限；`tools/list` 根据实际获授 scope 过滤。仓库的线协议检查器还会按 2026-07-28 规则验证本课 transcript：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/25-consent-and-least-privilege
```

## 综合项目关联

综合项目系统中的每次有副作用工具调用，都需要由 host 在发出请求前按具名工具及参数取得同意；server 端若仍需补充输入，也只能限定到本次调用，不能从先前调用或同级工具继承，也不能依据 server 自己提供的注解推定。每个受 scope 门控的工具都需要 step-up 路径：取并集而不是替换，并限制重试时长。当综合项目要求你说明调用方能看到和执行什么时，应从本课两道门分别回答：用户明确批准了什么，手中 token 实际授权了什么，并能指出某次失败属于哪一道门。

## 关键术语

| 术语 | 含义 |
|------|---------|
| Elicitation | server 通过 MRTR 请求用户输入，以 `inputRequests` 内的 `elicitation/create` 条目传递 |
| requestState | server 签发、retry 必须原样回传的不透明字符串；按不可信输入处理，必要时签名并仅使用一次 |
| 按调用限定同意 | host 针对一次具名工具与参数组合记录批准，绝不自动覆盖后续调用或整个 server |
| 注解提示 | server 声明的属性，如 `destructiveHint`；用于辅助 client 的提示策略，但绝不是可信的执行保证 |
| Step-up authorization | 收到 `403 insufficient_scope` 后，为已持有 scope 与新 challenge scope 的并集重新授权 |
| Scope 并集 | client 先前 scope 与 challenge 所需 scope 的组合，避免重新授权时丢失已有授权 |
| 列表结果中的最小权限 | 按调用方当前授权过滤 `tools/list` 等结果，并使用 `cacheScope: "private"` 缓存 |

## 延伸阅读

- [MCP 2026-07-28 规范：工具](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)，参阅 User Interaction Model 和两种工具错误通道
- [MCP 2026-07-28 规范：信息征询](https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation)，参阅 form mode、URL mode 和三种响应 action
- [MCP 2026-07-28 规范：授权](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)，参阅 Scope Selection Strategy 和 Step-Up Authorization Flow
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 7、11 和 12 节
- `phases/13-tools-and-protocols/12-mcp-roots-and-elicitation`，从第一性原理构建 elicitation
