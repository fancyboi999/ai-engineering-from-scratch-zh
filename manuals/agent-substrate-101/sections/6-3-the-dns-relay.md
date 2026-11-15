# DNS 中继

> DNS 中继只为 actor 策略里的名称作答，所以被拒绝的主机在 actor 打开连接之前就以 NXDOMAIN 失败。

一个 agent 报告 `Could not resolve host: example.com`。你检查 CoreDNS，它运行正常，也没有这次查询的记录。你在调试 pod 里解析这个名称，能成功。actor 从来没有问过 CoreDNS。它问的是 Substrate 为它运行的解析器，而这个解析器先读了策略。

读完本节，你能解释 actor 内部的每一种 DNS 失败。你还能说出策略变更要多久才能影响名称查询。

## 一个解析器，并且它读取策略 {#s-the-dns-relay-one-resolver-and-it-reads-the-policy}

actor 里的 `/etc/resolv.conf` 指向一个服务器 `169.254.17.1`。这个地址是 actor 链路在 worker 一端的地址。

**DNS 中继：** worker pod 里 `atunnel` 内部的一个解析器，每个 actor 一个实例。只有名称匹配该 actor 某条规则里的主机名时，它才把查询转发给集群解析器{{code}}。规则类型无关紧要。对其他所有名称，它都回答 `NXDOMAIN`。

中继会给拒绝标记，让客户端不缓存它，而且不会记录被拒绝的名称{{code}} {{docs}}。所以你在集群日志里什么也没搜到。

下面是同一个 actor 的同一次查询，一次在策略点名该主机之前，一次在之后：

```listing
title: 同一个名称，没有规则和有规则
source: capture/lab/F-egress/envoy/20-results.txt
lang: console
note: 同一条 dig 命令的两次运行。第一个 actor 没有策略。第二个有这个名称的 http 规则。警告行已截去。
---
$ dig +time=2 +tries=1 +noall +comments +answer whoami.egress-target.svc.cluster.local | grep -E 'status|IN'
…
;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 58397
…
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 26542
…
whoami.egress-target.svc.cluster.local.	30 IN A	10.96.79.253
```

默认拒绝同样覆盖集群内的名称。没有 Kubernetes API 规则的 actor 无法解析 `kubernetes.default.svc.cluster.local`。actor 不是 pod，不会白白得到集群 DNS。

## 换一个解析器也没用 {#s-the-dns-relay-another-resolver-does-not-help}

不信任本地解析器的工具，有时会去查询公共解析器。从 actor 发出的这种查询得不到任何应答。

```listing
title: actor 向公共解析器发出的查询
source: capture/lab/F-egress/envoy/20-results.txt
lang: console
note: 命令及其输出。这个 actor 没有策略。
---
$ dig @8.8.8.8 +time=2 +tries=1 example.com | grep -E 'status|timed out|refused|unreachable' ; echo rc=$?
;; communications error to 8.8.8.8#53: timed out
```

只有发往链路 worker 一端的 DNS 才能到达中继{{code}}。发往任何其他服务器的查询，对 Substrate 来说不算 DNS 流量，Substrate 也不会把任何 UDP 转发出沙箱。两种数据平面的结果相同，因为这项检查发生在 worker 里，不在网关里。

DNS over HTTPS 也会是同样的结果。它是对某个主机的 HTTPS 请求，策略像对待其他主机一样裁决它。

## 短名称与完整名称 {#s-the-dns-relay-short-names-against-full-names}

Kubernetes 用户每天都写短的 Service 名称，在 pod 里这样写能用。在 actor 里，短名称失败的方式看起来像策略缺陷。我们在 kagent 的运行里遇到了。

kagent actor 的策略允许了端口 8080 上的 `mock-llm.kagent.svc.cluster.local`。actor 的搜索列表是 `kagent.svc.cluster.local svc.cluster.local cluster.local`。我们用四种方式请求模型列表。

| actor 发出的请求 | 结果 |
|---|---|
| `mock-llm.kagent.svc.cluster.local:8080` | `200`，模型列表 |
| `mock-llm.kagent:8080` | `403 Forbidden` |
| `example.com` | `bad address`，解析器回答 `NXDOMAIN` |
| `kubernetes.default.svc.cluster.local` | `bad address` |

短名称得到的是 `403`，不是 DNS 错误。actor 里的解析器追加了搜索后缀，中继看到的是完整名称，查询因此成功。随后 HTTP 请求带的是 `Host: mock-llm.kagent:8080`。网关把 `Host` 头与策略比较，而策略里只有完整名称。

```listing
title: kagent actor 发出的四个请求
source: capture/lab/K-kagent/session1/turn5-egress.out
lang: text
note: 一个轮次里那次工具调用的输出。其他探测的行已截去。
---
A http-outside:
wget: bad address 'example.com'
…
E allowed-host:
{"object": "list", "data": [{"id": "mock-1", "object": "model", "owned_by": "lab"}]}
…
G kube-api:
wget: bad address 'kubernetes.default.svc.cluster.local'
H short-name:
wget: server returned error: HTTP/1.1 403 Forbidden
```

```figure
id: fig-6-3
kind: decision
title: 同一个 kagent actor 发出的四个名称
claim: 短 Service 名称借助搜索列表通过了 DNS 中继，随后因为 Host 头不在策略里而被网关拒绝。
caption: 每一行从名称读到结果。第一道检查是 DNS 中继，第二道是 atenet-egress。来源：capture/lab/K-kagent/session1/turn5-egress.out、capture/lab/K-kagent/session1/egress-policy-actor.yaml。
```

修正在你这一侧。在策略里写完整名称，并在 agent 的配置、提示词和工具定义里也给它完整名称。我们没有测试短名称的规则。完整名称在每次运行里都有效，所以请使用完整名称。

## 策略变更多快到达 DNS {#s-the-dns-relay-how-fast-a-policy-change-reaches-dns}

中继把它所属 actor 的策略缓存 5 秒{{code}}。因此策略变更在 API 接受之后几秒内就会影响名称查询。我们每 2 秒查询一次某个名称，并在轮询期间修改策略。

```listing
title: 添加 example.com 规则期间的轮询，Envoy 数据平面
source: capture/lab/F-egress/envoy/40-supplement.txt
lang: text
note: 更新在 10:56:39.119 返回。40 个样本中的前五个。
---
10:56:33 com=status: NXDOMAIN org=status: NXDOMAIN
10:56:35 com=status: NXDOMAIN org=status: NXDOMAIN
10:56:37 com=status: NXDOMAIN org=status: NXDOMAIN
10:56:39 com=status: NOERROR org=status: NOERROR
10:56:41 com=status: NOERROR org=status: NOERROR
```

**我们测得**六次策略变更，在第二台 x86 服务器客户机（16 vCPU、23 GB）上进行：每种数据平面各添加一条规则、删除两条规则。六次中有五次，带新应答的第一个样本在更新后 2 s 内出现。第六次在 3 s 内出现。我们的轮询间隔约为 2 s，所以给不出更细的数字。

有一次运行不符合这个规律。在 Envoy 数据平面上，我们为 `example.com` 添加了一条规则，这个名称 actor 从未查询过，然后等了 12 秒。更新后 14 s 和 16 s 完成的请求仍然以 `Could not resolve host` 失败。18 s 时的请求成功了。我们只见到一次这种延迟，没有复现，所以无法指出原因。

```figure
id: fig-6-3b
kind: timeline
title: 策略变更后的 DNS 应答
claim: 在我们的轮询运行里，新规则在 3 秒内到达 DNS，而在 Envoy 上一次未轮询的运行里，名称有 16 秒一直无法解析。
caption: 每条轨道从左往右读。零点是更新命令返回的时刻。玫红色标记失败的查询，紫色标记应答。来源：capture/lab/F-egress/envoy/40-supplement.txt、capture/lab/F-egress/agentgateway/40-supplement.txt、capture/lab/F-egress/envoy/20-results.txt。
```

要为慢的情况做好准备，因为许多工具只报告一次 DNS 失败就停止。在 actor 发出第一个请求之前写好策略。给运行中的 actor 添加主机时，先等待并重试 20 秒，再报告失败。

还有一种行为我们没有测试，但你应该从代码里了解。当中继无法刷新策略时，它保留最后读到的策略并据此作答{{code}}。网关则相反，读不到策略时会拒绝请求。因此在控制平面中断期间，被移除的主机可能仍保有它的 DNS 应答，而连接仍然会在网关处失败。

```takeaways
- 把 actor 里的 `NXDOMAIN` 或 `bad address`，读作没有规则列出的名称，或者不存在的名称。
- 为 actor 需要的每个集群 Service 添加一条规则，写完整名称。
- 给 agent 完整的 Service 名称，不要用短名称。
- 不要让工具指向公共解析器，因为查询会超时。
- 在 actor 发出第一个请求之前写好策略。
- 给运行中的 actor 添加主机后，重试 20 秒。
```

来源：capture/lab/F-egress/envoy/20-results.txt, capture/lab/F-egress/envoy/40-supplement.txt, capture/lab/F-egress/agentgateway/20-results.txt, capture/lab/F-egress/agentgateway/40-supplement.txt, capture/lab/K-kagent/session1/turn5-egress.out, capture/lab/K-kagent/session1/egress-policy-actor.yaml, capture/lab/K-kagent/probes/egress-deny-lines.txt, internal/atunnel/dns/readme.md, internal/atunnel/egresspolicy.go, internal/ateworker/actornet/sandbox.go, docs/guides/egress-traffic.md and docs/guides/network-egress.md at v1.0.0.
