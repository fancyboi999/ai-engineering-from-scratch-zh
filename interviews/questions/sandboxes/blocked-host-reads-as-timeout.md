---
id: blocked-host-reads-as-timeout
title: 被称为超时的主机请求，其实返回了 90 字节
card: sandboxes
kind: debug
level: 2
roles: [agentic-ai-engineer, forward-deployed-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, coding]
tags: [sandbox, network-policy, proxy, policy-log, tls]
minutes: 8
lessons: []
manuals: [docker-sandboxes-101#s-sbx-policy-log-and-the-proxy, docker-sandboxes-101#s-sbx-policy-init-allow-deny-and-check-network]
practice: []
cheatsheet: [docker-sandboxes, sandbox-policy]
related: [sandboxes/deny-wins-and-the-two-scopes]
updated: 2026-11-03
---

你的 agent 汇报称在沙箱内通过 HTTPS 访问 `example.com` 发生了超时，且 `npm install` 报错提示网络连接失败。沙箱内没有保留任何 shell 历史记录。请展示你如何查明究竟是哪条规则做出了该裁决，并证明这是策略决策而非网络故障。

## Short answer

请求并没有超时：代理服务首先接受了 `CONNECT`，随后在 TLS 会话内部响应了 `403 Forbidden` 以及一个内容为 `Approval required for example.com:443` 的 90 字节正文。运行 `sbx policy log SANDBOX --json` 并查看 `blocked_hosts` 所在行：读取 `proxy_type`、`rule` 规则文本以及 `reason` 原因。随后运行 `sbx policy check network --sandbox NAME example.com:443 --json` 查看 `deny_kind`，其中 `implicit` 意味着未命中任何规则因而按默认策略拒绝，而 `explicit` 则会指明具体的显式拒绝规则。在合适的作用域添加放行规则，或者先行移除冲突的拒绝规则即可。

## Full answer

### curl 探测所展现的现象

加上 `-I` 参数后，请求会先后打印出两行 HTTP 状态码。`HTTP/1.1 200 OK` 代表代理服务接受了隧道建立请求。随后，TLS 会话内返回带有 `Content-Length: 90` 的 `HTTP/1.1 403 Forbidden`，该会话的证书由代理自身的证书颁发机构（CA）签发，沙箱客户机之所以信任该证书，是因为 `PROXY_CA_CERT_B64` 已被合并注入到了 `/etc/ssl/certs/ca-certificates.crt` 中。agent 读取到该正文并将其视为失败，误汇报为超时。

在执行 `sbx policy allow network --sandbox NAME example.com` 放行后，相同的请求会先收到 `HTTP/1.0 200 Connection established`，随后直接收到来自源站的 `HTTP/2 200`。策略日志将放行后的流量归类为 `forward-bypass`：即不对内容审查、也不注入凭据的直接转发隧道。代理服务仅在必须介入发声时（例如面对被阻断的主机或绑定了特定凭据的主机）才会终结 TLS。

### 解读策略日志

每个 `blocked_hosts` 记录行均包含 `host`、`vm_name`、`proxy_type`、`rule`、`reason`、`last_seen`、`since` 以及 `count_since`。其中 `rule` 字段指明了具体操作，例如 `op(action=net:connect:tcp, resource=net:domain:example.com:443)`，并显示 `no applicable policies`（无可适用策略）或实际匹配命中的规则。被放行的记录行其 `rule` 字段可能为空，因此日志仅说明某主机通过了检查，而 `check network` 才能解释其被放行的根本原因。`PROXY` 共有五种取值：`forward`、`forward-bypass`、`transparent`、`network` 和 `browser-open`。

### 当 npm 无法解析域名时

拒绝策略的覆盖范围远不止 TCP 连接。自 v0.33.0 起，沙箱内的进程无法解析被策略拒绝的域名（环回地址名称除外），且自 v0.45.0 起，在没有规则允许该主机时 DNS 解析就会直接停止。出站 ICMP 保持阻断且无法放行。当前卡片此前仅显示针对 `example.com` 的拒绝，而 `registry.npmjs.org:443` 默认位于 `balanced` 预设的允许列表中，因此首先在 `blocked_hosts` 中排查是否存在 npm 对应的域名记录。若有记录指明，则 npm 的连接错误本质上是域名解析失败，这表面看似网络故障，实为既定的安全策略决策。若没有记录，则需排查其他诱因。

### 看似绕过实则不然的透明代理

针对列在 `NO_PROXY` 中的域名发起的请求会绕过正向代理，直接建立普通 TCP 连接。透明代理通道会精准捕获并阻断该连接，且日志中会记录为 `transparent`。这两条路径强制执行完全相同的安全策略。

## Follow-ups

- **Level 2:** 被放行的记录行显示 `rule` 字段为空，哪个命令能告诉你究竟是哪条规则放行了它？ Expected: 在相同上下文下执行 `sbx policy check network`；日志仅记录主机通过，而 check 命令会指名具体规则。
- **Level 2:** 域名解析是否处于安全策略的管辖之外？ Expected: 否；被拒绝的域名无法解析，且自 v0.45.0 起，在没有规则允许该主机时域名查询本身就会被中止。
- **Level 3:** `deny_kind` 显示为 `explicit`，修复操作有何不同？ Expected: 说明在该作用域下存在针对该主机的显式拒绝规则，CLI 会拒绝与其冲突的放行操作，因此必须先移除该拒绝规则或切换作用域。
- **Level 3:** 为什么 `curl -I` 在打印 403 之前会先打印一个 200？ Expected: 200 代表代理接受了隧道建立请求，而 403 是代理在其终结的 TLS 会话内部自行给出的拒绝应答。

## Wrong answers

- "网络不稳定，调大超时时间重新重试即可。" 代理服务是立即返回包含审批命令提示的正文；根本没有任何耗时等待。
- "将该主机加入 `NO_PROXY` 以便请求绕过代理。" 透明代理路径会捕获直连请求并执行阻断；日志会明确将其标记为 `transparent`。
- "Agent 的 TLS 库出错了因为证书未知。" 沙箱系统是有意信任该代理 CA 的；这正是 403 能够在 TLS 内部正常送达的原因。

## Taught in

[代理章节](../../../manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md)记录了被阻断和放行的请求及日志行，[策略章节](../../../manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md)展示了 `check network` 报告的两种拒绝类型。
