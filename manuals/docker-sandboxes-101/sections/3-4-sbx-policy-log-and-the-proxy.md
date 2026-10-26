# sbx policy log 与代理

> 每次连接都经过宿主代理；被阻止的 HTTPS 请求收到代理自己的证书，代理按主机写策略日志并记录匹配规则。

agent 说 `https://example.com` 超时了。其实没有：代理用90字节响应了它。沙箱的每次连接都经过宿主代理。`sbx policy log` 按主机保留决定、代理路径及规则。

读完本节，你能解读 `policy log` 行，指出代理路径，区分被阻止和响应慢的主机。

## 两条代理路径与一个 CA {#s-sbx-policy-log-and-the-proxy-two-proxies-and-one-ca}

`m101-demo` 环境中有代理地址和证书：

```listing
title: m101-demo 环境中的代理行
source: capture/out/04-env.txt
lang: text
note: 非代理及其 CA 的行均已截去。CA 值遮蔽为 <base64>。
---
HTTPS_PROXY=http://gateway.docker.internal:3128
HTTP_PROXY=http://gateway.docker.internal:3128
…
NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
NODE_USE_ENV_PROXY=1
NO_PROXY=localhost,127.0.0.1,::1,gateway.docker.internal
…
PROXY_CA_CERT_B64=<base64>
…
REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt
…
SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
```

地址为 `gateway.docker.internal:3128`，不是旧插件的 `host.docker.internal:3128`（[冲突 C26](#s-ref-sources-and-the-conflicts-register)）。文档描述两条路径{{docs-sbx Networking}} HTTP/HTTPS 使用正向代理，其他 TCP 透明转发，两者都执行网络策略。

Kevin Wittek 在 2026-01-14 说，首个原型只有环境变量，agent 曾用 `no_proxy` 绕过它 {{talk 2026-01-14 T01}}。录制向 `NO_PROXY` 中的 `gateway.docker.internal:18080` 发请求，curl 跳过正向代理，建立普通 TCP 连接。透明路径捕获它，日志记为 `transparent` 并阻止（capture/out/10-policy-log.json）。

**TLS 拦截：** 代理自身的证书颁发机构，通过 `PROXY_CA_CERT_B64` 传入并合并到 `/etc/ssl/certs/ca-certificates.crt` {{rel-sbx v0.35.0}}。录制展示使用位置：

```listing
title: 被阻止的 HTTPS 请求：带和不带响应头
source: capture/out/09-blocked.txt
lang: text
---
$ sbx exec m101-policy sh -c 'curl -sS --max-time 10 -I https://example.com; echo exit=$?'
HTTP/1.1 200 OK

HTTP/1.1 403 Forbidden
Content-Length: 90
Content-Type: text/plain

exit=0
[exit 0]

$ sbx exec m101-policy sh -c 'curl -sS --max-time 10 https://example.com; echo; echo exit=$?'
Approval required for example.com:443.

Review and respond with:
  sbx policy approval ls

exit=0
[exit 0]
```

`HTTP/1.1 200 OK` 表示代理接受 `CONNECT`。接下来的 `403 Forbidden` 在 TLS 会话内到达，使用沙箱信任的证书；90字节正文是批准消息。执行 `sbx policy allow network --sandbox m101-policy example.com` 后，同一请求得到 `HTTP/1.0 200 Connection established`，随后是 `HTTP/2 200` 和 `server: cloudflare`（capture/out/09-allowed.txt）。

日志将其归为 `forward-bypass`：不检查、不注入凭据的隧道 {{docs-sbx Monitoring policies}}。所以 C26 的裁定是：代理只有需要自己应答时才终止 TLS，即阻止主机或主机绑定凭据时；其余走隧道。v0.47.0 发布说明同时提到“non-MITM CONNECT tunnel”与{{rel-sbx v0.47.0}}，即非中间人 CONNECT 隧道与透明代理的晚期握手检查。

## 读 policy log {#s-sbx-policy-log-and-the-proxy-reading-policy-log}

**policy log：** 显示{{help-sbx sbx policy log}}，即获准或被阻止的主机、匹配规则、代理类型和请求计数。接受 `[SANDBOX]`、`--json`、`--limit` 和 `--type`；帮助承认“filesystem logs are not supported yet”，尚不支持文件系统日志（[冲突 C28](#s-ref-sources-and-the-conflicts-register)）。JSON 有两个数组：

```listing
title: 拒绝规则后的 m101-policy 日志
source: capture/out/09-policy-log-deny.json
lang: json
note: 第二条 blocked、download.docker.com 和 ports.ubuntu.com 行已截去。
---
{
  "blocked_hosts": [
    {
      "host": "example.com:443",
      "vm_name": "m101-policy",
      "proxy_type": "forward",
      "rule": "denied: rule \"local:<uuid>\" matched op(action=net:connect:tcp, resource=net:domain:example.com:443)",
      "last_seen": "<ts>",
      "since": "<ts>",
      "count_since": "<n>",
      "reason": "Denied by local rule"
    },
…
  "allowed_hosts": [
…
    {
      "host": "example.com:443",
      "vm_name": "m101-policy",
      "proxy_type": "forward-bypass",
      "rule": "",
      "last_seen": "<ts>",
      "since": "<ts>",
      "count_since": "<n>"
    },
```

各行含 `host`、`vm_name`、`proxy_type`、`rule`、`reason`、`last_seen`、`since` 和 `count_since`。blocked 行指定操作 `op(action=net:connect:tcp, resource=net:domain:example.com:443)`，以及 `no applicable policies` 或匹配规则。此次录制的 allowed 行 `rule` 为空，因此日志说明通过，[check network](#s-sbx-policy-init-allow-deny-and-check-network) 说明原因。`PROXY` 有五种值：`forward`、`forward-bypass`、`transparent`、`network` 和 `browser-open` {{docs-sbx Monitoring policies}}。[图](#fig-3-4) 动画展示两次请求。

403 正文提到 `sbx policy approval ls`。文档描述 `approval ls`、`inspect` 与 `respond`。balanced 和 deny-all 下，无匹配规则的请求{{docs-sbx Local policy}}，会请求批准而非直接拒绝。v0.47.0 帮助树没有 `sbx policy approval`，却有 `sbx policy ls --created-via approval`（[冲突 C16](#s-ref-sources-and-the-conflicts-register)）。

## 主机规则看不到什么 {#s-sbx-policy-log-and-the-proxy-what-a-host-rule-cannot-see}

拒绝不只覆盖 TCP（[冲突 C27](#s-ref-sources-and-the-conflicts-register)）。2026-05-26 的文章称 UDP 与 ICMP 被阻止且无法允许 {{blog 2026-05-26 B16}}。自 v0.33.0 起，沙箱进程不能解析策略拒绝的域名，回环名称除外；出站 ICMP 仍被阻止 {{rel-sbx v0.33.0}}。自 v0.45.0 起，UDP 在实验设置 `feature.udp-egress` 后遵循策略，没有允许规则时 DNS 解析也停止 {{rel-sbx v0.45.0}}。裁定：拒绝覆盖 TCP、UDP 与名称查询本身，ICMP 不能放行。客户机 `/etc/resolv.conf` 是宿主的只读绑定。

主机允许会放行该主机的每个请求，不论方法、路径或正文。balanced 预设允许 `github.com:443` 和 `**.github.com:443`（capture/out/03-policy-balanced.json）。Docker 员工在 2026-04-07 和 2026-08-10 说，允许主机上的 issue 正文或 gist 不会被阻止 {{talk 2026-04-07 T05}}。

产品用 HTTP 规则回应此问题。kit 的 `network-policy@2` 条目可对 `hosts: [api.github.com]` 拒绝 `methods: [DELETE]` {{kitcap network-policy@2}}。网络允许是上限，HTTP 规则进一步收窄 {{docs-sbx HTTP method and path}}；`check network` 和 `policy log` 都不评估方法或路径 {{docs-sbx Local policy}}。[图](#fig-3-5) 并排展示两种规则。

上游代理另有设置：`proxy`、`proxy.sandbox`、`proxy.daemon` 及 `no_proxy` 系列，自 v0.35.0 支持 SOCKS5 {{rel-sbx v0.35.0}}。[设置表](#s-ref-settings-keys-environment-variables-and-paths) 列出各键。

```figure
id: fig-3-4
kind: sequence
title: example.com 的一次拒绝与一次允许
claim: 首次 CONNECT 在 TLS 内由代理拒绝；添加允许规则后，同一 CONNECT 成为 forward-bypass 隧道；两者都留下日志。
caption: 从上向下读。生命线依次是 m101-policy 内的 curl、正向代理、带授权器的 sandboxd、策略存储与 example.com。玫红虚线表示拒绝，青绿色实线表示规则与日志写入。来源为 capture/out/09-blocked.txt、09-policy-log.json、09-allow.txt、09-allowed.txt 和 09-policy-log-after.json。
```

```figure
id: fig-3-5
kind: comparison
title: api.github.com 的主机允许与 kit HTTP 规则
claim: 主机允许放行 github.com 的任意请求及正文；network-policy@2 条目拒绝一个主机上的一种方法，其余仍开放。
caption: 左侧为 balanced 的 default-code-and-containers 组及其允许的 POST；右侧为 kit 规范的拒绝条目及被阻止的 DELETE。来源为 capture/out/03-policy-balanced.json 与 research/sources/kit-capabilities.md。
```

```takeaways
- 先读 `PROXY`：`forward-bypass` 不检查，`transparent` 不注入凭据。
- 带批准正文的403是策略决定，不是网络故障。
- 拒绝覆盖 TCP、UDP 和 DNS 查询；ICMP 仍被阻止。
- 用 kit HTTP 规则收窄允许的 API；主机允许会放行任何正文。
```

Sources: help-sbx sbx policy log, sbx policy allow network (research/sources/help-sbx.md); docs-sbx Architecture, Isolation layers, Default security posture, Monitoring policies, Local policy, Network access policies, Policy concepts, Upstream proxy (research/sources/docs-sandboxes.md); kitcap network-policy@2 (research/sources/kit-capabilities.md); rel-sbx v0.33.0, v0.35.0, v0.45.0, v0.47.0 (research/sources/sbx-releases.md); research/conflicts-register.md rows C16, C26, C27, C28; talk T01 (2026-01-14), T05 (2026-04-07), blog B16 (2026-05-26), HN01 (2026-08-10) from research/plan.md; capture/out/04-env.txt, 09-blocked.txt, 09-allowed.txt, 09-allow.txt, 09-policy-log.json, 09-policy-log-after.json, 09-policy-log-deny.json, 09-policy-log.txt, 10-policy-log.json, 03-policy-balanced.json
