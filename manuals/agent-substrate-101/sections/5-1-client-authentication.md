# 客户端认证

> Substrate 在 API 和 router 两个位置检查凭据，而默认安装让每个 `kubectl ate` 用户共用同一个所有者身份。

一位同事拿到了你测试集群的访问权，运行 `kubectl ate get actors`。命令先打印一条警告，然后列出所有团队的所有 actor。这位同事还能挂起、回退和删除它们。系统没有任何故障。在你修改之前，安装本来就是这样工作的。

读完本节，你能说出每类客户端需要的凭据。你还能说清默认安装允许每个用户做什么。

本节混用两类证据。标明“在运行中实测”的句子来自已记录的探测，每个清单也是如此。其余陈述来自 v1.0.0 的代码和文档。

## 两个位置检查客户端 {#s-client-authentication-two-places-check-a-client}

| 位置 | 谁来调用 | 凭据 | 由什么决定访问权 |
|---|---|---|---|
| `ate-api-server`，即 API | `kubectl ate`、harness、你的控制器 | 客户端证书，或 bearer JWT | 访问策略，见[第 5.2 节](#s-access-policies) |
| `atenet-router`，通往 actor 的路径 | 任何向 actor 发请求的一方 | 客户端证书 | 整个安装共用一份允许身份列表 |

这两个位置没有共同的规则。一个主体可以在 API 里拥有某个 atespace，却仍然无法调用 actor。只有它的证书在 router 的列表上，router 才会为它服务。

## API：证书或令牌 {#s-client-authentication-the-api-a-certificate-or-a-token}

**主体（principal）：** `ate-api-server` 从凭据中得出的身份，也是访问策略授予角色时使用的名称。

`ate-api-server` 按以下顺序接受两种凭据 {{docs}}：

1. **客户端证书**，来自集群的 pod 身份签发器。主体是证书里的 SPIFFE ID，例如 `spiffe://cluster.local/ns/kagent/sa/kagent-controller`。
2. **Bearer JWT**，来自服务器信任的签发方。主体是 `sub` 声明。对于 Kubernetes ServiceAccount 令牌，它是 `system:serviceaccount:<namespace>:<name>`。

两种凭据都没有的调用会得到 gRPC 错误 `Unauthenticated`。安装只信任一个签发方，也就是集群的 Kubernetes API server，令牌的 audience 为 `api.ate-system.svc`。签发方列表是一个 ConfigMap，服务器只在启动时读取它。

## 默认安装做了什么 {#s-client-authentication-what-the-default-install-does}

我们运行的每条 `kubectl ate` 命令都以同一行开头。

```listing
title: 每条 kubectl ate 命令的第一行
source: capture/lab/A-quickstart/50-create-actor.log
lang: text
---
Warning: no --token-file given; acting as the shared identity system:serviceaccount:ate-system:ate-client rather than as yourself. Pass --token-file to act as yourself.
```

没有 `--token-file` 时，CLI 会向 Kubernetes 申请 ServiceAccount `ate-client` 的令牌并发送它。以这种方式使用 CLI 的每个人都是同一个主体。安装器已经写明了这个主体能做什么。

```listing
title: ate-setup 打印的警告
source: capture/lab/A-quickstart/22-deploy-ate-system-retry.log
lang: text
---
Warning: system:serviceaccount:ate-system:ate-client is a bootstrap owner, so anyone who can mint a token for it is a global owner of this install. It is the default so the demos, benchmarks and e2e tests work; for a shared or production install, set --ateapi-authz-bootstrap-owners (ATE_API_AUTHZ_BOOTSTRAP_OWNERS) to your operators' own principals. See docs/authorization.md.
```

所以默认安装的真实访问规则是一条 Kubernetes 规则。谁能为 `ate-client` 创建令牌，或者能在 `ate-system` 里创建 pod，谁就拥有每个 actor。

要以自己的身份操作，请为每个人创建一个 ServiceAccount 并传入它的令牌 {{docs}}。我们为一个名为 `alice` 的 ServiceAccount 运行了下面的命令，目标是 atespace `lab-v`。

```bash
kubectl create namespace ate-users
kubectl -n ate-users create serviceaccount alice
kubectl create token alice -n ate-users --audience api.ate-system.svc --duration 1h > alice.token
kubectl ate --token-file alice.token get actors -a lab-v
```

文件里存的是 bearer 令牌。创建它之前先运行 `umask 077`，这样机器上的其他用户就读不到它。

此时主体是 `system:serviceaccount:ate-users:alice`。在访问策略授予它角色之前，它什么都做不了。服务器接受了这个令牌，却拒绝了这次调用。

```listing
title: 有效令牌但没有角色
source: capture/lab/V-validation/08-access-control/10-access.tsv
lang: text
note: 跟踪记录中的一行。行首的时间和步骤名称已省略。
---
…Error: failed to list actors: rpc error: code = PermissionDenied desc = permission denied: principal "user:system%3Aserviceaccount%3Aate-users%3Aalice" lacks "can_list_actors" on "atespace:lab-v" 
```

`PermissionDenied` 表示服务器知道你是谁。服务器无法验证的凭据会得到另一个错误，而且错误信息不会说明原因。

| `--token-file` 里放的内容 | `get actors` 的结果 |
|---|---|
| `alice` 的令牌，audience 为 `api.ate-system.svc`，没有角色 | `PermissionDenied`，附带主体和缺失的权限 |
| `alice` 的令牌，使用 Kubernetes 的默认 audience | `Unauthenticated desc = invalid bearer token` |
| 一段不是令牌的文本 | `Unauthenticated desc = invalid bearer token` |

我们在 x86 服务器客户机上把每一行各运行了一次。第二行是你应该预料到的错误：不带 `--audience` 的 `kubectl create token` 会得到 Substrate 拒绝的令牌。[访问策略](#s-access-policies)会继续使用同一个 ServiceAccount。

文档里的三个事实限制了你对这套设置的信任程度：

- **令牌的寿命比 ServiceAccount 更长。** 服务器检查签名和过期时间，不会向 Kubernetes 询问账号是否还存在。令牌在过期时间之后还会再有效五分钟，这是服务器为时钟差异留出的余量。要立刻阻止某个用户，请将其从访问策略中移除。引导所有者不在任何策略里：将其从服务器标志中删除，然后重启 `ate-api-server`。
- **CLI 需要端口转发权限。** 不带 `--endpoint` 时，`kubectl ate` 会打开一个进入 `ate-system` 的端口转发。实际上，这项权限覆盖该 namespace 里的每个 pod 和端口，所以它也能触及数据平面的管理端口。
- **签发方不属于主体的一部分。** 如果你信任两个签发方，其中任何一个都能签发带有另一方主体 `sub` 的令牌。

在这所有规则之前，还有一道网络规则。在我们的 kagent 运行中，namespace `default` 里的 pod 根本无法与 API 建立连接。从 namespace `kagent` 发出的同一个探测则到达了服务器 {{run}}。安装只放行带有标签 `ate.dev/api-access=true` 的 namespace {{docs}}。

## router：一份列表上的证书 {#s-client-authentication-the-router-a-certificate-on-one-list}

发往 actor 的请求不经过 API。它去的是 `atenet-router`，router 要求客户端证书的 SPIFFE ID 在它的列表上。这份列表就是 router 标志 `--ingress-allowed-spiffe-ids`。在我们用 `ate-setup` 做的安装里，它只有一个身份：`spiffe://cluster.local/ns/ate-system/sa/atenet-client`。kagent 安装则不同，kagent 安装器把列表设成 kagent 控制器的 SPIFFE ID，`atenet-client` 不在其中 {{kagent}}。

我们从三个客户端发出同一个请求，先在 Envoy 数据平面上，再在 agentgateway 数据平面上。目标是 atespace `ate-demo-counter` 里的 actor `my-counter-1`。下图把两处检查并排放在一起，展示的是 Envoy 数据平面的结果。

```figure
id: fig-5-1
kind: flow
title: 检查客户端的两个位置
claim: API 和 router 各自独立检查客户端：共享的 ate-client 令牌拥有每个 actor，router 则为它那一份列表上的任何身份服务。
caption: 每条色带从左往右读。橄榄色是客户端，蓝色是 API，靛蓝色是 router。绿色是客户端能到达的地方，玫红色是被拒绝的连接。这些拒绝来自 Envoy 数据平面。来源：capture/lab/A-quickstart/22-deploy-ate-system-retry.log、capture/lab/G-dataplane/envoy/ingress-auth/10-results.txt、capture/lab/G-dataplane/envoy/ingress-auth/51-rightid-results.txt。
```

```listing
title: Envoy，证书的身份不对
source: capture/lab/G-dataplane/envoy/ingress-auth/10-results.txt
lang: text
note: 来自 443 端口探测的两行。证书的名称是 spiffe://cluster.local/ns/probe/sa/default。
---
* TLSv1.3 (IN), TLS alert, certificate unknown (558):
curl: (56) OpenSSL SSL_read: OpenSSL/3.3.2: error:0A000416:SSL routines::ssl/tls alert certificate unknown, errno 0
```

```listing
title: agentgateway，没有证书
source: capture/lab/G-dataplane/agentgateway/ingress-auth/10-results.txt
lang: text
note: 来自 443 端口探测的一行。
---
curl: (56) OpenSSL SSL_read: OpenSSL/3.3.2: error:0A00045C:SSL routines::tlsv13 alert certificate required, errno 0
```

```listing
title: agentgateway 上被允许的身份
source: capture/lab/G-dataplane/agentgateway/ingress-auth/51-rightid-results.txt
lang: text
note: 第一行是客户端出示的证书。
---
cert right-id: subject=CN = HBCORTIJRCAXAVJEJY3YTOYS3X X509v3 Subject Alternative Name:      URI:spiffe://cluster.local/ns/ate-system/sa/atenet-client
### 23-rightid-https-443
preserved memory count: 7 | preserved file counter: 7 | preserved rootfs counter: 7
 code=200 t=0.035022
```

这些探测有三个结果对你很重要 {{run}}：

- **两个数据平面都做认证。** agentgateway 数据平面的 router Service 列出了明文端口 80 和 8081。没有任何东西监听它们，两个 TLS 端口都要求证书。后来对每个端口的探测，在两个数据平面上对 443 和 8444 得到了相同的结果。探测还发现了一个不需要凭据的端口：agentgateway router 的统计端口 15020，它会向任何 pod 返回 `/metrics`。[router 与 ingress](#s-the-router-and-ingress)一节有端口表。
- **被允许的 ServiceAccount 并不存在。** 安装完成后，`ate-system` 里没有名为 `atenet-client` 的 ServiceAccount。我们在第三次探测之前创建了它。`kubectl ate proxy` 通过另一条路径为这个身份取得证书，[router 与 ingress](#s-the-router-and-ingress)一节有说明。
- **这份列表不含 atespace。** 唯一被允许的身份访问到了一个它没有任何角色的 atespace 里的 actor。有用户在 issue 3589 中报告了同样的现象 {{issue #3589}}。

最后一个结果决定了你的设计。router 只回答一个问题：这个客户端是否在列表上。它不会问这个客户端被允许调用哪个 actor。请在用户和 router 之间放一个你自己的服务，只给这个服务分配被允许的身份，并在那里检查每个用户。

关于第二个令牌签发方的内容将在下一版补充。本版也未覆盖已删除 ServiceAccount 的令牌，以及包含多个身份的列表。

```takeaways
- 把默认安装视为向所有能为 ate-client 创建令牌的人开放。
- 给每个人一个 ServiceAccount，并用 --token-file 传入它的令牌。
- 创建令牌时带上 --audience api.ate-system.svc，否则服务器会拒绝它。
- 要阻止某个用户，请将其从访问策略中移除，因为旧令牌仍然有效。
- 只把 router 身份交给你自己的服务，并在那里检查用户。
- 在 pod 调用 API 之前，给它的 namespace 打上 ate.dev/api-access=true 标签。
```

来源：capture/lab/Q-network/m-router-ports/agentgateway/10-port-probes.tsv, capture/lab/Q-network/m-router-ports/envoy/10-port-probes.tsv, capture/lab/Q-network/m-router-ports/agentgateway/11-port-probes-supplement.txt, capture/lab/A-quickstart/50-create-actor.log, capture/lab/A-quickstart/22-deploy-ate-system-retry.log, capture/lab/G-dataplane/envoy/ingress-auth/10-results.txt, capture/lab/G-dataplane/agentgateway/ingress-auth/10-results.txt, capture/lab/G-dataplane/envoy/ingress-auth/00-serviceaccounts.txt, capture/lab/G-dataplane/envoy/ingress-auth/50-create-sa.log, capture/lab/G-dataplane/envoy/ingress-auth/51-rightid-results.txt, capture/lab/G-dataplane/agentgateway/ingress-auth/51-rightid-results.txt, capture/lab/G-dataplane/02-agentgateway-without-ingress-allowlist/14-probe-no-allowlist.txt, capture/lab/I-capacity/17-router-args.txt, capture/lab/K-kagent/parallel/ingress-probe.txt, capture/lab/V-validation/08-access-control/10-access.tsv, capture/lab/V-validation/_scripts/v4-items-5-12.sh; docs/guides/authentication.md, docs/guides/authorization.md at v1.0.0; internal/ateclient/builder.go, cmd/kubectl-ate/internal/cmd/root.go, manifests/ate-install/ate-system-networkpolicies.yaml, manifests/ate-install/atenet-router.yaml at v1.0.0; issue https://github.com/agent-substrate/substrate/issues/3589.
