# 缓存新鲜度与基于 Cursor 的分页

> 可缓存结果会明确告诉客户端可以信任多久、哪些人可以复用副本；分页结果则返回不透明书签，而不是页码。

**类型：** Reference
**语言：** Python
**前置要求：** 第 19 课
**预计时间：** 约 45 分钟

## 学习目标

- 说出返回 `CacheableResult` 的六种操作，并说明其中 `ttlMs` 与 `cacheScope` 的含义
- 应用 2026-07-28 客户端必须遵守的新鲜度规则：`ttlMs` 为 `0` 时立即过期，负值按 `0` 处理，字段缺失时默认为 `0`
- 解释 `public` 与 `private` 两种 `cacheScope` 如何决定谁能复用缓存响应，以及为什么这绝不是访问控制决策
- 在 `resources/list` 中逐步处理不透明 cursor：缺少 cursor 表示从头开始，空字符串是有效的列表中间位置，无法识别的 cursor 返回 `-32602`
- 解释为什么 `list_changed` notification 会无视剩余 TTL 立即使缓存失效，以及为什么重试 MRTR 请求得到的结果绝不能缓存

## 问题背景

第 04 课的无状态核心意味着服务器不会在请求之间记住客户端，因此客户端不能依靠“热连接状态”来避免重复询问。与此同时，客户端请求的大多数内容很少变化。工具目录可能一周才编辑一次，资源字节内容可能一小时内都相同。如果模型每做一次决定前都调用 `tools/list` 或重复读取同一资源，就会为没有变化的数据成倍增加往返；通过互联网访问服务器时，每次往返都带来真实延迟。

服务器拥有大型结果集时还会出现另一种无关的成本。包含一万条记录的资源目录不能作为一个 JSON array 一次返回，否则即使客户端只需要开头几个名称，也得承担整个列表的开销。一次返回全部内容还会限制服务器调整底层存储、添加条目或拆分 catalog，因为客户端可能已经依赖固定响应结构。

MCP 为第一种成本提供附着在值得保留的结果上的缓存 envelope：生存时间，以及说明谁能共享缓存字节的 scope。第二种成本则通过基于 cursor 的分页解决：服务器返回一个不透明 token，用它交付大小可控的切片和后续书签，而不承诺固定页数或页大小。这两种机制都遵循当前协议时期的同一种纪律：客户端所需的每项事实——响应能保持多久，或列表从何处继续——都显式写入消息，绝不依赖某条碰巧尚未关闭的连接来暗示。

## 核心概念

六种操作返回 `CacheableResult`：`server/discover`、`tools/list`、`prompts/list`、`resources/list`、`resources/templates/list`、`resources/read`。这些操作每次返回 `resultType: "complete"` 时，结果都携带两个字段。`ttlMs` 是大于等于 `0` 的整数，表示客户端可将响应视为新鲜的毫秒数，类似 HTTP `Cache-Control: max-age`。`cacheScope` 取值为 `"public"` 或 `"private"`，说明谁可以保留副本。

客户端获取资源时记录收到响应的本地时间 `t_received`。当 `now < t_received + ttlMs` 时，响应保持新鲜。考试会关注三个边界情况。`ttlMs` 为 `0` 时，响应立即过期，客户端下次需要时可以重新获取。服务器若发送负数，合规客户端忽略符号并按 `0` 处理。`ttlMs` 完全缺失时——这通常只会发生在该机制出现前的旧服务器上——客户端同样假定为 `0`，再依赖自身启发式规则或变更 notification。这并不使 TTL 成为轮询间隔：客户端只在下次需要数据时惰性检查新鲜度，不会按 timer 在后台唤醒并重新获取。如果实现仍选择轮询，就必须加入 jitter 和 backoff，避免大量客户端同步请求。

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resultType": "complete",
    "resources": [
      {"uri": "note://private/journal", "name": "journal"},
      {"uri": "note://private/vault", "name": "vault"}
    ],
    "nextCursor": "",
    "ttlMs": 120000,
    "cacheScope": "public"
  }
}
```

`cacheScope` 回答的是另一个问题：不是多久，而是给谁。`"public"` 表示响应不含调用方特有内容，因此任何客户端、gateway 或 proxy 都能缓存一次，再提供给完全不同的调用方。对所有用户都相同的工具目录通常是 `public`。`"private"` 表示内容取决于请求者，缓存副本只能回放给相同授权上下文，绝不能交给另一个 token。读取共享 readme 是 `public`；读取调用方自己的私密 note 是 `private`，因为即使 wire 上的请求相同，字节也因调用方而异。应把 `cacheScope` 当作缓存指令，而不是安全边界：`public` 只告诉 cache 可以共享不含用户特有数据的字节，不会授予任何人调用该方法的权限。无论上个缓存响应声称什么，服务器仍要对每次请求执行自身的逐 primitive 访问控制。

缓存条目由请求 method 与影响结果的参数共同标识：`resources/read` 使用 `uri`，分页列表使用 `cursor`。客户端绝不能用某个请求生成的缓存响应去回答 method 或相关参数不同的请求。通过多轮交互重试请求得到的结果（第 14 课模式）也绝不能缓存，因为结果依赖未纳入 cache key 的 `inputResponses`。中间态 `input_required` 同样不可缓存，而且一开始就不携带 `ttlMs` 或 `cacheScope`；一个尚未得到回答的问题没有可复用内容。

TTL 与 push notification 相互补充，并不竞争。服务器可以提供 `ttlMs` 而不声明 `listChanged: true`，此时 TTL 是客户端唯一的新鲜度信号。服务器也可同时提供两者：TTL 避免 notification 之间不必要的重新获取；第 16 课详述的 notification 则在内容实际变化时立即使缓存失效。当客户端在 subscription stream 上收到 `notifications/resources/list_changed`、`notifications/tools/list_changed` 或 `notifications/prompts/list_changed` 时，即便缓存仍处于 TTL 窗口内，notification 也优先：副本立即过期，不再考虑时钟还剩多久。

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/list_changed",
  "params": {"_meta": {"io.modelcontextprotocol/subscriptionId": 7}}
}
```

分页使用不透明 cursor，而不是页码。`resources/list`、`resources/templates/list`、`prompts/list`、`tools/list` 的用法相同：响应可以包含 `nextCursor`；如果存在，客户端可在下次调用中把完全相同的字符串作为 `cursor` 发回。服务器决定页大小；客户端不能假定页大小固定，也不能解析、解码或推断 cursor 内容，因为该字符串只对签发它的服务器有意义。缺少 `nextCursor` 表示列表结束。考试常见陷阱是空字符串：cursor 合法取值可以是 `""`，它是真实位置，不表示列表结束，也不表示从头重启。使用 `if cursor:` 而非 `if cursor is not None:` 的客户端，会在服务器恰好签发空 token 时悄悄提前停止分页。服务器无法识别的 cursor（不是其签发或已无法解析）返回 `-32602 Invalid params`。

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "error": {"code": -32602, "message": "Invalid cursor: 'not-a-real-cursor'"}
}
```

分页与缓存以几条明确规则交互。每一页都是独立可缓存响应，拥有自己的 `ttlMs`；每页的新鲜度时钟从收到该页时开始，而不是从收到第一页时开始。服务器甚至可以为早期稳定页面设置更长 TTL，为易变的末页设置更短 TTL。跨页不存在一致性保证：如果底层列表在两次取页之间发生变化，客户端可能重复看到或完全错过某个条目，这与 HTTP 分页一直以来的取舍相同。需要真正 snapshot 的客户端必须省略 cursor，从头重新获取。服务器不得改变同一次 listing 各页的 `cacheScope`；第一页为 `private`，后续每页也必须为 `private`。

最后是排序。`tools/list` 及其他列表操作应在相同调用间返回稳定、确定的顺序。这有两重价值：客户端自身缓存与分页 bookkeeping 更可预测；同一工具目录再次序列化进 system prompt 时，上游大语言模型 provider 的 prompt cache 也能识别字节完全相同的前缀，从而真正节省延迟和成本。这与 MCP 自身缓存无关，关键只是保持 wire 输出稳定。

```figure
mcpa-20-cache-freshness
```

## 交互实验

图中把一个缓存响应放在时间轴上。响应在 `t_received` 到达，阴影带向后延伸 `ttlMs`：在该区间内，客户端直接从 cache 回答，不产生任何 wire 流量。再看第二份相同时间轴：一条 `list_changed` notification 在 TTL 区间结束前到达，新鲜度线就在该点被截断。图注强调本题规则：notification 到达即失效，此刻起剩余 TTL 不再有意义。

## 实践实验

打开 `code/main.py`。它构建一个小型 `notes` 资源服务器，包含三个共享 public note 和两个 private note；前方是一个由 `alice-token` 与 `bob-token` 两个客户端身份共享的 `ClientCache`，类似 gateway cache。

```bash
python3 code/main.py
```

结合概念章节阅读输出的 transcript。前五次交互对 `resources/list` 分页：第二次调用命中 cache，因此没有 wire 请求；第三次发送 `cursor: ""`，得到中间页而不是第一页；第四次沿 `nextCursor` 到达末页；第五次发送服务器从未签发的 cursor，返回 `-32602`。下一组交互读取 note：alice 与 bob 共享一份 public readme 缓存，因为其 `cacheScope` 是 `"public"`；但两人分别获取 private journal，因为即使在共享 cache 中，`"private"` 条目也不能跨 token。随后 alice 打开 `subscriptions/listen` stream，服务器列表改变，紧接着的 `resources/list` 即使 TTL 尚未到期也重新走 wire。读取 private vault note 会触发携带 `elicitation/create` 请求的 `input_required` 结果；客户端回答后使用新 id 和回显的 `requestState` 重试，完成结果会被刻意排除在 cache 外，因此读取 vault 两次就必须请求两次。transcript 最后一条不是客户端发送的内容：它被包装为故意违规示例，展示假想的 SEP-2549 之前服务器返回的 `resources/list` 响应，其中完全缺少 `ttlMs` 和 `cacheScope`；正是这种结构迫使合规客户端回退到 `ttlMs: 0` 默认值。

## 交付产物

`outputs/caching-decision-guide.md` 是一份单页决策指南，介绍如何选择 `ttlMs`、`cacheScope` 并正确实现客户端 cache，同时引用研究简报。调用 `resources/list`、`resources/read`、`tools/list`、`prompts/list`、`resources/templates/list` 或 `server/discover` 时可放在手边查阅。

## 验证

在课程目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试覆盖本课结论：新鲜条目直接返回，不产生新请求；超过 TTL 的条目触发重新获取；private 条目绝不跨 token，而 public 条目可共享；`list_changed` notification 会在 TTL 到期前使缓存失效；`input_required` 结果和 MRTR 重试后的完成结果都不会缓存；空字符串 cursor 会继续分页而不是结束；无法识别的 cursor 返回 `-32602`；listing 顺序确定；缺失或为负的 `ttlMs` 会被钳制为零。仓库 wire checker 也会按 2026-07-28 规则验证 transcript：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/20-caching-and-pagination
```

## 综合项目关联

综合项目的完整交互必须为每次可缓存调用判断答案可以信任多久、能否跨调用方共享，还要在不假定页数的情况下遍历至少一个大型 listing。这两项决策都建立在本课之上：从 result 读取 `ttlMs` 和 `cacheScope`，而不是自造缓存策略；使用 method 与真正影响结果的参数组成 cache key；把空 cursor 当作数据而不是结束标记；绝不让重试结果或中间结果混入 cache，伪装成可复用内容。

## 关键术语

| 术语 | 含义 |
|------|------|
| `CacheableResult` | 六种 `complete` 结果携带的 `ttlMs` 与 `cacheScope` envelope |
| `ttlMs` | 客户端可将响应视为新鲜的毫秒数；`0` 或缺失表示立即过期，负数钳制为 `0` |
| `cacheScope` | `public`（任意 cache 可共享）或 `private`（仅相同授权上下文可复用）；绝不是访问控制 |
| Cache key | 请求 method 加影响结果的参数，例如 `uri` 或 `cursor` |
| Cursor | 服务器选择、用于标记列表位置的不透明 token；客户端不得解析或假定固定页大小 |
| `nextCursor` | 继续分页的 token；字段缺失才表示结束，空字符串不表示 |
| `list_changed` notification | 无视剩余 TTL、立即使缓存列表失效的 push 信号 |
| MRTR 重试结果 | `input_required` 往返之后得到的完成结果；永远不能缓存 |

## 延伸阅读

- [MCP 缓存](https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/caching)
- [MCP 分页](https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/pagination)
- [SEP-2549：列表结果 TTL](https://modelcontextprotocol.io/seps/2549-ttl-for-list-results)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 10 节
- `phases/13-tools-and-protocols/10-mcp-resources-and-prompts`，讲解这些可缓存、可分页结果所属的 resources 与 prompts primitive
