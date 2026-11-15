# EgressPolicy 与默认拒绝

> 没有 EgressPolicy 的 actor 什么都访问不了，策略只通过三种规则开放指定的主机和端口，没有 CIDR 规则。

你的 agent 运行一个下载软件包的工具，工具报告主机无法解析。你在 actor 里开一个 shell，试的每个名字 `curl` 都失败。网络并没有坏。这个 actor 没有策略，所以 Substrate 全部拒绝。

读完本节，你能为一个 actor 写出 EgressPolicy，并用 `kubectl ate` 应用它。你还能根据错误判断是哪一层拒绝了连接。

## 出站连接的路径 {#s-egresspolicy-and-default-deny-the-path-of-an-outgoing-connection}

actor 不在 pod 网络上。它的沙箱只有一条带四个地址的链路，链路的另一端属于 worker。

```listing
title: actor 看到的网络
source: capture/lab/F-egress/envoy/20-results.txt
lang: text
note: actor f-deny 内部的 resolv.conf、地址和路由的输出。回环和 IPv6 相关行已截去。
---
nameserver 169.254.17.1
search ate-demo-egress.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
…
inet 169.254.17.2/30 scope global dynamic eth0
…
default via 169.254.17.1 dev eth0 scope link
```

Substrate 有三个部分处理离开这条链路的流量{{code}}：

1. worker 里的防火墙规则把每个 TCP 连接重定向到 `atunnel`，它是 worker pod 里的一个进程。除了发往 `169.254.17.1` 的 DNS，其他协议都被拒绝。
2. `atunnel` 向 Service `atenet-egress` 打开一条双向 TLS 的 `CONNECT`。它出示 actor 的证书，目标是原始的 IP 和端口。
3. `atenet-egress` 验证证书，并向 `ate-api-server` 确认该 actor 正在运行或正在恢复。然后它读取这个 actor 的策略并做出决定。

```figure
id: fig-6-2
kind: flow
title: 出站连接在哪里被裁决
claim: actor 发出的连接要过两道检查，一道是针对名称的 DNS 中继，一道是针对请求的 atenet-egress，两者读取同一份策略。
caption: 从左往右读。上面的路径是名称查询，下面的路径是连接本身。从上方引出的虚线箭头是每道检查所读取的策略。上游主机看到的是 atenet-egress 的 IP，从来看不到 actor。来源：capture/lab/F-egress/envoy/20-results.txt 以及 v1.0.0 的 atunnel 与 router 源码。
```

上游主机从来看不到 actor。在我们的运行里，测试服务器把调用方报告为 `10.244.0.22`，这是 `atenet-egress` 的 pod IP。这个版本的 actor 网络只支持 IPv4{{docs}}。

## 策略是一条 API 记录，每个 actor 一条 {#s-egresspolicy-and-default-deny-the-policy-is-an-api-record-one-per-actor}

**EgressPolicy：** 一个 actor 的允许规则列表。它是 Substrate API 里的一条记录，固定名称为 `default`，存放在 actor 之下。它不是 Kubernetes 对象，所以 `kubectl get` 看不到它。

你要在 actor 创建之后再创建策略。新 actor 不会复制其模板的策略{{docs}}。因此创建 actor 的 harness 必须为每个 actor 写一份策略，kagent 就是这么做的（[第 7.1 节](#s-kagent-on-substrate)）。

一份策略最多有 256 条规则，规则的顺序没有意义{{code}}。每条规则属于三种类型之一。

| 规则类型 | 网关读取什么 | 默认端口 | 凭据效果 |
|---|---|---|---|
| `http` | 每个明文请求的 `Host` 头 | 80 | 有 |
| `https` | 网关解密 TLS 会话后的每个请求 | 443 | 有 |
| `tlsPassthrough` | TLS 握手里的服务器名称，每个连接读一次 | 无，必须列出端口 | 无 |

一条规则有三个字段：`hostnames`、`ports` 和 `effects`。主机名是小写的 DNS 名称，或者以 `*` 作为整个第一级标签的名称，或者单独一个 `*`{{code}}。IP 地址无效，任何规则类型都不接受 CIDR 范围。规则里也没有路径、方法、模型或工具的字段。策略决定 actor 能访问哪些主机，不决定 actor 向这些主机请求什么。

下面是我们的测试 actor `f-main` 的策略，原样取自 API 的返回。三条规则是我们写的。默认端口和元数据由 API 补上。

```listing
title: 每种类型各一条规则的 EgressPolicy
source: capture/lab/F-egress/envoy/policy-f-main-P2-live.yaml
lang: yaml
note: get egress-policy 加 -o yaml 的完整输出。
---
metadata:
  atespace: lab-f
  createTime: "2026-11-12T10:45:59.339191794Z"
  name: default
  uid: 06d478d7-7a70-4ca0-91f8-4524c40ea9bc
  updateTime: "2026-11-12T10:52:47.315685233Z"
  version: "6"
rules:
- http:
    hostnames:
    - whoami.egress-target.svc.cluster.local
    ports:
      numbers:
      - 80
- https:
    hostnames:
    - example.com
    ports:
      numbers:
      - 443
- tlsPassthrough:
    hostnames:
    - example.org
    ports:
      numbers:
      - 443
```

## 创建与更新策略 {#s-egresspolicy-and-default-deny-create-and-update-a-policy}

一个 actor 的第一份策略只需要规则。

```bash
kubectl ate create egress-policy f-main -a lab-f -f policy.yaml
kubectl ate get egress-policy f-main -a lab-f -o yaml
```

更新要严格得多，我们错了两次。第一次，我们发送了只有 `rules` 的文件。

```listing
title: 缺少前置条件的更新
source: capture/lab/F-egress/envoy/19-first-run-update-refused.txt
lang: text
note: update egress-policy 对只有规则、没有元数据的文件的应答。
---
Error: manifest for actor "f-main" in atespace "lab-f" lacks the metadata.uid and metadata.version preconditions that "get egress-policy -o yaml" prints
```

`update egress-policy` 会替换整份策略，它需要知道你编辑的是哪个版本。用 `-o yaml` 读出策略，保留 `metadata.uid` 和 `metadata.version`，修改规则，再把文件发回去。

如果存储的策略在你读取和更新之间发生了变化，服务器会拒绝这次更新。CLI 随后会让你重新运行 `get egress-policy -o yaml`{{code}}。CLI 自己只检查这两个值是否在文件里。重新读取策略，再重做一遍修改即可。我们没有运行这种情况。

第二次，文件里有一条没有 ports 的 `tlsPassthrough` 规则。

```listing
title: 没有端口的 tlsPassthrough 规则
source: capture/lab/F-egress/envoy/19b-second-run-passthrough-ports-required.txt
lang: text
note: update egress-policy 的应答。规则下标从零开始计数。
---
Error: failed to update egress policy for actor "f-main" in atespace "lab-f": rpc error: code = InvalidArgument desc = egress_policy.rules[2].tls_passthrough.ports: Required value
```

没有端口的 `http` 规则表示端口 80，`https` 规则表示端口 443。`tlsPassthrough` 规则没有默认值。每次都要写 `ports: {numbers: [443]}`。

## 被拒绝的请求是什么样子 {#s-egresspolicy-and-default-deny-what-a-denied-request-looks-like}

两种数据平面执行同一份策略，但用不同的措辞应答。两套都要熟悉，因为 agent 会在工具输出里看到这些字符串。

| actor 的操作 | Envoy 数据平面 | agentgateway 数据平面 |
|---|---|---|
| 没有策略时解析任何名称 | `NXDOMAIN` | `NXDOMAIN` |
| 解析策略里没有的名称 | `NXDOMAIN` | `NXDOMAIN` |
| 查询另一个解析器，例如 `8.8.8.8` | 超时 | 超时 |
| 没有策略时向一个 IP 发送 HTTP | 连接被重置 | `403`，`actor egress policy denied` |
| 向策略里没有的 IP 发送 HTTP | `403`，`egress denied` | `403`，`actor egress policy denied` |
| 没有策略时向一个 IP 打开 TLS | 握手被切断 | 握手被切断 |
| 用没有任何规则列出的服务器名称打开 TLS | 握手被切断 | 握手被切断 |
| 向允许的主机发送 WebSocket 升级请求 | `403` | `403`，`WebSocket egress is not supported` |

策略之外的名称到不了网关，因为 DNS 中继会先应答。该中继见[第 6.3 节](#s-the-dns-relay)。只有 actor 已经拿到 IP 地址时，网关才会应答。

```listing
title: 没有策略时向一个 IP 发 HTTP，agentgateway 数据平面
source: capture/lab/F-egress/agentgateway/20-results.txt
lang: text
note: actor f-deny 对一个 IP 地址发出请求得到的响应。date 头已截去。
---
HTTP/1.1 403 Forbidden
content-type: text/plain
content-length: 26
…
actor egress policy denied
```

在 Envoy 上，同一个 actor 的同一个请求以 `curl: (56) Recv failure: Connection reset by peer` 结束。Envoy 的文本 `egress denied` 只在 actor 有策略而请求不匹配时才会出现。

## Host 头打不开另一台主机 {#s-egresspolicy-and-default-deny-the-host-header-does-not-open-another-host}

按主机名定义的策略会招来一种攻击：连接到你选定的 IP，并在 `Host` 头里冒充一个被允许的名称。我们试了这种攻击。策略只允许 `whoami.egress-target.svc.cluster.local`。actor 连接到第二个服务 `drip` 的 IP，并发送了被允许的名称。

```listing
title: 带允许的 Host 头请求另一个 IP
source: capture/lab/F-egress/envoy/20-results.txt
lang: console
note: 命令，以及显示是哪台服务器应答的几行。两者之间的响应头已截去。
---
$ curl -sS -m 8 -i -H 'Host: whoami.egress-target.svc.cluster.local' 'http://10.96.185.134/drip?n=1' | head -14
…
HTTP/1.1 200 OK
…
Hostname: whoami-5bdb4584f6-4gqz6
```

应答来自 `whoami`，不是 `drip`。网关从请求头里取出名称，在策略里找到它，然后自己连接到这个名称。它忽略了 actor 选定的 IP。两种数据平面的做法相同。因此无论 actor 拨哪个地址，它都只能访问策略点名的主机。

反过来也成立。策略点名的是主机，所以它无法锁定 IP。如果这个名称明天解析到新地址，网关会跟过去。

```takeaways
- 给每个 actor 写一份 EgressPolicy，因为新 actor 一开始没有策略。
- 需要凭据注入时用 `https`，客户端必须看到真实证书时用 `tlsPassthrough`。
- 发给 `update egress-policy` 的每个文件都要保留 `metadata.uid` 和 `metadata.version`。
- 每条 `tlsPassthrough` 规则都要列出 `ports`。
- 把 actor 里的 `NXDOMAIN` 读作策略没有列出的名称。
- 不要指望策略限制路径、方法、模型或工具。
```

来源：capture/lab/F-egress/envoy/20-results.txt, capture/lab/F-egress/agentgateway/20-results.txt, capture/lab/F-egress/envoy/policy-f-main-P2-live.yaml, capture/lab/F-egress/envoy/P2.yaml, capture/lab/F-egress/envoy/19-first-run-update-refused.txt, capture/lab/F-egress/envoy/19b-second-run-passthrough-ports-required.txt, capture/lab/F-egress/envoy/applied-P2.yaml, capture/lab/K-kagent/session1/egress-policy-actor.yaml, api/ateapi/v1/ateapi.proto (EgressPolicy, EgressRule, HttpRule, HttpsRule, TlsPassthroughRule, Ports), internal/ateworker/actornet/sandbox.go, cmd/atenet/internal/router/egress/egress.go, docs/guides/network-egress.md, docs/guides/egress-traffic.md and docs/reference/kubectl-ate.md at v1.0.0.
