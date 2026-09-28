# 缓存与分页决策指南

这是一份与 MCP 2026-07-28 对齐的单页参考，用于正确实现 MCP 客户端与服务器。

## 该结果是否需要 ttlMs 和 cacheScope？

只有六种操作可缓存，且仅限 `resultType` 为 `"complete"` 时：

| 操作 | 常见 cacheScope | 说明 |
|-----------|--------------------|-------|
| `server/discover` | public | 对服务器的每个调用方都相同 |
| `tools/list` | public（通常） | 只有工具集本身按调用方变化时才使用 private |
| `prompts/list` | public（通常） | 与 tools/list 相同 |
| `resources/list` | public 或 private | listing 本身按调用方过滤时使用 private |
| `resources/templates/list` | public | template 很少按调用方变化 |
| `resources/read` | 取决于资源 | 用户特有内容使用 private |

`input_required` 结果绝不可缓存，也不携带这两个字段。重试 MRTR 请求得到的结果同样绝不缓存，即使仍报告两个字段。

## 选择 ttlMs

- 很少变化的数据使用较长 TTL（静态参考文档、稳定工具目录）。
- 频繁变化或过期代价高的数据使用较短 TTL（实时队列深度、余额）。
- 必须始终视为过期的响应使用 `0`，例如服务器无法通过 notification 撤销内容的资源。
- 绝不使用负数。客户端收到负值时将其钳制为 `0`。
- 旧服务器缺少 `ttlMs` 时也按 `0` 处理，不要假定较长默认值。

## 选择 cacheScope

- `"public"`：字节不含调用方特有内容。任意客户端、gateway 或 proxy 都可以存储并回放给不同调用方。
- `"private"`：字节取决于请求者。只有相同授权上下文可以复用缓存副本。
- `cacheScope` 是缓存指令，绝不是访问控制。服务器仍对每个请求执行逐 primitive 授权，客户端也照常对每次调用进行身份认证；scope 只决定 cache 能否共享已有内容。

## 客户端 cache 检查清单

- 每个 cache 条目使用请求 method 加影响结果的参数作为 key（`resources/read` 使用 `uri`，分页列表调用使用 `cursor`）。
- 按调用方授权上下文隔离 private 条目。绝不能用某个 token 存储的 private 条目回答另一个 token 的查询。
- 绝不存储 `input_required` 结果。
- 绝不存储 MRTR 重试的完成结果。
- 收到相关 `list_changed` notification 后立即使受影响的 cache 条目失效，即使 TTL 尚未到期。
- 不要按 TTL timer 在后台轮询。只在下次需要数据时惰性检查新鲜度。
- 如果重新获取失败（网络错误、服务器宕机），可以返回过期条目，而不是让调用方直接失败。

## 分页检查清单

- 把 `cursor` 当作不透明字符串。绝不解析、解码或从内容推断位置。
- 不要假定固定页大小。服务器自行决定，并可在页之间改变。
- 存在 `nextCursor` 就继续列表，包括其值为 `""` 时。只有缺少 `nextCursor` 才表示列表结束。
- 无法识别的 cursor 返回 `-32602 Invalid params`。遇到该错误后，丢弃该 listing 的缓存页；若仍需要完整集合，则从头重启。
- 跨页没有一致性保证。需要真正 snapshot 时，省略 cursor 并从头重新获取。
- 服务器必须为同一次 listing 的每一页使用相同 `cacheScope`。

## 考试要点

- `ttlMs` 是新鲜度提示，不保证底层数据没有变化。
- 空字符串 cursor 有效，不代表列表结束。
- MRTR 重试结果绝不缓存，即使规范仍要求其携带 ttlMs 与 cacheScope。
- 确定的列表顺序既有利于客户端自身 cache，也有利于 LLM provider 的 prompt cache 复用字节完全相同的前缀。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 10 节。
