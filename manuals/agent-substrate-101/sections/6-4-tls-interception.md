# TLS 拦截与信任包

> `https` 规则让网关用自己签发的证书终止 TLS 会话，actor 必须信任注入的信任包，而 `tlsPassthrough` 让 TLS 原样通过。

你的 agent 通过 HTTPS 调用 API，策略也放行了该主机。调用却因证书错误失败，而且你在笔记本电脑上无法复现。主机没有问题。actor 访问的是 `atenet-egress`，网关返回了一张来自私有 CA 的证书，而 actor 里的客户端不信任该 CA。

读完本节，你能为某个主机在 `https` 规则与 `tlsPassthrough` 规则之间做出选择。你还能为 actor 提供信任包，并说出 CA 私钥在每种数据平面上的存放位置。

## 两种规则类型，两张证书 {#s-tls-interception-two-rule-kinds-two-certificates}

两种规则类型都允许向主机发起 TLS 连接，区别在于谁持有会话。

采用 `https` 规则时，网关会终止 actor 的 TLS 会话。它出示一张为所请求主机名现签的证书，读取每个请求，并对每个请求执行策略。然后它向真实主机发起自己的 TLS 会话，并依据公共根证书验证该主机{{code}}。

采用 `tlsPassthrough` 规则时，网关只读取握手阶段的服务器名称。若规则列出了该名称与端口，网关直接转发字节流，从不解密{{code}}。

我们通过 `https` 放行 `example.com`，通过 `tlsPassthrough` 放行 `example.org`，并打印了 actor 从两者收到的证书。

```listing
title: https 规则对应的证书，Envoy 数据平面
source: capture/lab/F-egress/envoy/20-results.txt
lang: text
note: actor 内部对 example.com 执行 openssl 的输出。签发者是集群的拦截 CA。
---
issuer=CN=U7ICLCR3N66DBMBSAQNS5JHTHI
subject=
notBefore=Nov 12 10:48:04 2026 GMT
notAfter=Nov 12 11:08:04 2026 GMT
X509v3 Subject Alternative Name: critical
DNS:example.com
```

```listing
title: tlsPassthrough 规则对应的证书
source: capture/lab/F-egress/envoy/20-results.txt
lang: text
note: actor 内部对 example.org 执行 openssl 的输出。这是该站点的公共证书。
---
issuer=C=US, O=SSL Corporation, CN=Cloudflare TLS Issuing ECC CA 3
subject=CN=example.org
notBefore=Sep 26 22:05:05 2026 GMT
notAfter=Dec 25 22:13:27 2026 GMT
```

```figure
id: fig-6-4
kind: comparison
title: 谁持有 TLS 会话
claim: 采用 https 规则时 actor 与 atenet-egress 建立会话，采用 tlsPassthrough 规则时则与真实主机建立会话。
caption: 从 actor 向下阅读各列直至主机。签发者名称是 openssl 在 actor 内部打印的内容。来源：capture/lab/F-egress/envoy/20-results.txt、capture/lab/F-egress/agentgateway/40-supplement.txt。
```

| 问题 | `https` 规则 | `tlsPassthrough` 规则 |
|---|---|---|
| actor 看到的证书 | 网关新签发的证书 | 主机的真实证书 |
| actor 所需的信任 | 映射出的信任包 | 自带的标准根证书库 |
| 何时检查策略 | 每个请求一次 | 仅握手时一次 |
| 凭据注入 | 支持 | 不支持 |
| 网关能否读取请求 | 能，包含请求头与请求体 | 不能 |
| 固定服务端证书的客户端 | 失败 | 正常工作 |

我们的准则：对需要凭据的主机，以及希望对每个请求单独裁决的主机，使用 `https`。对固定服务端证书或自带客户端证书的客户端，使用 `tlsPassthrough`。但要知道使用它会失去什么。网关只裁决一次，之后的连接会原样转发 actor 发送的任何内容。

## 为 actor 提供信任包 {#s-tls-interception-give-the-actor-the-trust-bundle}

没有信任包时，actor 里的客户端会拒绝网关新签发的证书。加上信任包后，同样的请求即可成功。

```listing
title: 默认证书库与带信任包下的同一个 https 主机，Envoy 数据平面
source: capture/lab/F-egress/envoy/40-supplement.txt
lang: console
note: actor 内部的两条 curl 命令及其结果。curl 在报错后打印的帮助文本已截去。
---
$ curl -sS -m 15 -o /dev/null -w 'code=%{http_code} verify=%{ssl_verify_result}\n' https://example.com/
exit=60
code=000 verify=20
…
stderr: curl: (60) SSL certificate problem: unable to get local issuer certificate
…
$ curl -sS -m 15 -o /dev/null -w 'code=%{http_code} verify=%{ssl_verify_result} http=%{http_version}\n' --cacert /run/ate/egress-trust-bundle/trust-bundle.pem https://example.com/
exit=0
code=200 verify=0 http=2
```

**信任包（trust bundle）：** Substrate 映射到 actor 内部的一个文件，包含集群的拦截 CA 与一组公共根证书。你可以在 ActorTemplate 里通过 `systemInfo` 卷声明挂载它。

```listing
title: 映射信任包的卷
source: capture/lab/F-egress/envoy/shell-template.yaml
lang: yaml
note: 我们的测试 actor 所用 ActorTemplate 的 volumes 块。容器将 system-info 挂载在 /run/ate。
---
volumes:
- name: system-info
  systemInfo:
    dataSources:
    - trustBundle:
        names:
        - egress-mitm.ate.dev
        - system-roots.ate.dev
        path: egress-trust-bundle/trust-bundle.pem
```

第一个名称是拦截 CA。第二个是公共根证书集合，因此同一个文件既能服务被拦截的主机，也能服务透传的主机。我们的信任包共包含 149 张证书，大小为 222,672 字节。

大多数客户端不会主动读取该路径。在我们的运行中，把 `SSL_CERT_FILE` 设为该路径足以让 curl 正常工作。其他运行时会读取不同的环境变量，例如 Python requests 读取 `REQUESTS_CA_BUNDLE`，Node.js 读取 `NODE_EXTRA_CA_CERTS`{{docs}}。请在模板的 `env` 里设置它们，不要写在 agent 提示词里。

不要把信任包复制到容器镜像中。CA 会轮转，而映射出的文件会跟随轮转更新，镜像里的副本不会更新{{docs}}。

## 两种数据平面的叶子证书存在差异 {#s-tls-interception-the-leaf-certificate-differs-between-the-dataplanes}

两种数据平面使用相同的 CA 签名，但签发出的证书并不相同。

| 新签发证书的字段 | Envoy 数据平面 | agentgateway 数据平面 |
|---|---|---|
| 主题（Subject） | 空 | `CN=example.com` |
| 主题备用名称（SAN） | `DNS:example.com`，标记为 critical | `DNS:example.com` |
| 生效起始时间 | 请求发出前 5 分钟 | 1975 年 1 月 1 日 |
| 有效截止时间 | 生效后 20 分钟 | 4096 年 1 月 1 日 |
| 网关发送的证书链 | 仅叶子证书 | 叶子证书加 CA |
| 缺少信任包时 curl 的报错 | `unable to get local issuer certificate` | `self-signed certificate in certificate chain` |

在 Envoy 上，一个独立进程使用 `--leaf-cert-ttl=15m` 标志签发每张叶子证书，起始时间提前 5 分钟。在 agentgateway 上，叶子证书的有效期长达 2,121 年。

对客户端来说两者都能工作。对你而言这一差异会带来两个影响。首先，缺少信任包时的错误文本不同，排错时两串文本都要检索。其次，不要编写断言叶子证书字段的测试。切换数据平面会使表格里的每一行都发生改变。

我们更青睐 Envoy 叶子证书的短有效期。长期有效的叶子证书让 CA 成为唯一的把关手段。一旦 CA 私钥泄漏，轮转 CA 是阻止伪造证书的唯一办法。

## CA 私钥存放在哪里 {#s-tls-interception-where-the-ca-private-key-lives}

拦截 CA 是命名空间 `ate-system` 中的 Secret `egress-mitm-ca-pool`。持有其私钥的人，可以向信任该信任包的每个 actor 出示任何主机受信任的证书。因此该私钥挂载在何处，比叶子证书的任何字段都更重要。

在 Envoy 数据平面上，pod `atenet-egress` 包含三个容器。私钥只挂载进其中一个名为 `sdsmint` 的容器，它只监听 Unix 套接字，不开放网络端口。Envoy 通过 Unix 套接字向它请求证书。解析来自 actor 流量的进程从不接触私钥。

```listing
title: 持有私钥的容器，Envoy 数据平面
source: capture/lab/G-dataplane/envoy/03-containers-atenet-egress.tsv
lang: text
note: sdsmint 容器的命令。镜像与其他列已截去。
---
sdsmint --uds-path=/var/run/sdsmint/sdsmint.sock --ca-pool-path=/run/ca-state/mitm-pool.json --leaf-cert-ttl=15m --log-level=info …
```

在 agentgateway 数据平面上，pod 只有一个容器，并且该容器挂载了私钥。

```listing
title: agentgateway 配置里的私钥
source: capture/lab/G-dataplane/agentgateway/10-atenet-egress-agentgateway-substrate-config.yaml
lang: yaml
note: 拦截 TLS 的监听器中的四行。卷 egress-mitm 来自 Secret egress-mitm-ca-pool。
---
tls:
  mode: dynamicCa
  cert: /run/egress-mitm/tls.crt
  key: /run/egress-mitm/tls.key
```

同一个进程既接受来自每个 actor 的连接、解析其请求，又持有签名私钥。在我们的安装中，该容器也没有配置 `securityContext`。而 `envoy` 容器丢弃了全部 capability，以非 root 用户运行。

我们尚不知道有通过 agentgateway 窃取私钥的攻击手段。我们要指出的是万一出现漏洞，波及的范围不同。在 Envoy 上，代理的内存泄露缺陷只会暴露流量。在 agentgateway 上，同类缺陷会暴露 CA 私钥。在任一数据平面上，都应限制谁能读取 `ate-system` 中的 Secret，因为两者使用的是同一个 Secret。

## 网关信任哪些上游证书 {#s-tls-interception-which-upstream-certificates-the-gateway-trusts}

拦截包含第二条 TLS 连接，即从网关到真实主机。actor 通过信任包信任网关，网关本身则必须信任主机。在两种数据平面上，它都从自身容器内的一个文件 `/etc/ssl/certs/ca-certificates.crt` 读取根证书。agentgateway 配置将该文件指定为 `backendTLS.root`，Envoy 配置将其指定为 `trusted_ca`。Substrate v1.0.0 没有提供追加上游 CA 的标志，文档里也没有这类配置项。

因此带有私有 CA 证书的主机在 `https` 规则下会失败。我们在集群里运行了一个带有此类证书的网关，actor 通过 `https` 规则调用了它。

**我们测得**在第二台 x86 服务器客户机（16 vCPU、23 GB）上，每种数据平面各测一次，每次 30 个请求。在默认安装下，两种数据平面上的 30 个请求全部失败。在 agentgateway 上，actor 收到 503 且响应体为 `upstream connection failed`，网关记录 `invalid peer certificate: UnknownIssuer`。在 Envoy 上，actor 收到 503 且响应为 `upstream connect error or disconnect/reset before headers. reset reason: remote connection failure`。Envoy 日志中出现 `CERTIFICATE_VERIFY_FAILED`。

可行的解决办法是覆盖挂载根证书文件。我们把公共根证书与我们的 CA 合并进一个 ConfigMap，共包含 122 张证书，并将其挂载到 `atenet-egress` 的代理容器中。

```listing
title: 为出站网关添加私有 CA 的补丁
source: capture/lab/Q-network/i-model-gateway/43-trust-patch.json
lang: json
note: Deployment atenet-egress 的完整 JSON 补丁。容器 0 在两种数据平面上都是代理容器。
---
[
  {"op": "add", "path": "/spec/template/spec/volumes/-", "value": {"name": "extra-roots", "configMap": {"name": "egress-extra-roots"}}},
  {"op": "add", "path": "/spec/template/spec/containers/0/volumeMounts/-", "value": {"name": "extra-roots", "mountPath": "/etc/ssl/certs/ca-certificates.crt", "subPath": "ca-certificates.crt"}}
]
```

打上补丁后，同样的请求在两种数据平面上均返回 200，30 次全部成功。这个补丁游离于安装器之外，不会持久保留。后面再运行 `ate-setup deploy ate-system` 时，代理容器上的这个挂载就会消失。每次跑完安装器都要重新打上补丁，再向私有主机发一个请求确认。

actor 从来看不到私有 CA。它看到的是拦截 CA 为主机名现签的叶子证书，并使用注入的信任包进行验证。

## 新建拦截连接的开销 {#s-tls-interception-what-a-new-intercepted-connection-costs}

**我们测得**在同一台客户机（16 vCPU、23 GB）上访问同一个私有主机，请求体为 60 字节。每次请求新建连接时，agentgateway 的中位数为 618 ms，Envoy 为 614 ms，样本数均为 n=10。其中与拦截端点的 TLS 握手就占了 606 ms 和 600 ms。复用单条连接时，中位数为 10.0 ms 和 11.9 ms，样本数均为 n=30。向集群内主机发起的 `http` 规则新建连接耗时 23 到 28 ms。

因此拦截对每个请求的开销很小，对每条新建连接的开销很大，在两种数据平面上约为 0.6 秒。如果客户端每次调用都新建 HTTPS 连接，每次都要多花这段时间。请保持长连接，或使用带连接池的客户端。我们尚未查明握手内部究竟哪一步耗费了这么多时间。完整对比见[配合 Substrate 使用 agentgateway](#s-agentgateway)。

```takeaways
- 对需要凭据或需要逐请求检查的主机使用 `https` 规则。
- 对固定证书的客户端使用 `tlsPassthrough` 规则，并接受按连接检查一次。
- 为带有 `https` 规则的每个 ActorTemplate 添加 `systemInfo` 信任包卷。
- 在模板里把 `SSL_CERT_FILE` 及所用运行时的对应变量指向信任包路径。
- 切勿把信任包复制到镜像里。
- 选定数据平面时要考量 CA 私钥的存放位置。
- 把私有 CA 挂载进 `atenet-egress` 的根证书文件，并在每次运行安装器后重新挂载。
- 在 `https` 规则下复用 HTTPS 连接，因为每条新连接耗时约 0.6 秒。
```

来源：capture/lab/F-egress/envoy/20-results.txt, capture/lab/F-egress/envoy/40-supplement.txt, capture/lab/F-egress/agentgateway/20-results.txt, capture/lab/F-egress/agentgateway/40-supplement.txt, capture/lab/F-egress/envoy/shell-template.yaml, capture/lab/F-egress/envoy/05-template.yaml, capture/lab/G-dataplane/envoy/03-containers-atenet-egress.tsv, capture/lab/G-dataplane/envoy/04-volumes-atenet-egress.json, capture/lab/G-dataplane/envoy/05-sec-res-atenet-egress.json, capture/lab/G-dataplane/agentgateway/03-containers-atenet-egress.tsv, capture/lab/G-dataplane/agentgateway/04-volumes-atenet-egress.json, capture/lab/G-dataplane/agentgateway/05-sec-res-atenet-egress.json, capture/lab/G-dataplane/agentgateway/10-atenet-egress-agentgateway-substrate-config.yaml, capture/lab/G-dataplane/envoy/10-atenet-egress.yaml, capture/lab/Q-network/i-model-gateway/40-egress-agentgateway-config.yaml, capture/lab/Q-network/i-model-gateway/41-egress-503-line.log, capture/lab/Q-network/i-model-gateway/44-envoy-egress-503.excerpt.log, capture/lab/Q-network/i-model-gateway/20-results-agentgateway.txt, capture/lab/Q-network/i-model-gateway/20-results-envoy.txt, capture/lab/Q-network/i-model-gateway/31-latency-agentgateway.tsv, capture/lab/Q-network/i-model-gateway/31-latency-envoy.tsv, capture/lab/Q-network/i-model-gateway/43-trust-patch.json, capture/lab/Q-network/i-model-gateway/43-trust-patch.log, capture/lab/Q-network/i-model-gateway/45-trust-patch-envoy.log, capture/lab/Q-network/i-model-gateway/31-latency-agentgateway-private-ca-trusted.tsv, capture/lab/Q-network/i-model-gateway/31-latency-envoy-private-ca-trusted.tsv, capture/lab/Q-network/i-model-gateway/51-connection-cost-agentgateway.tsv, capture/lab/Q-network/i-model-gateway/51-connection-cost-envoy-private-ca-trusted.tsv, capture/lab/Q-network/00-dataplane-switch-to-agentgateway/17-after-rerun-rust-log-and-roots.json, capture/lab/Q-network/00-dataplane-switch-to-envoy/15-egress-mounts-after-switch.json, capture/lab/summary/network-x86.json, manifests/ate-install/atenet-egress.yaml, manifests/ate-install/components/agentgateway-egress/kustomization.yaml, api/ateapi/v1/ateapi.proto, docs/guides/egress-trust-bundle.md and docs/guides/network-egress.md at v1.0.0.
