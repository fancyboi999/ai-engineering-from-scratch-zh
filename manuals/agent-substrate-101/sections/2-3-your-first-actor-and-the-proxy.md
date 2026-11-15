# 你的第一个 actor 与 kubectl ate proxy

> `kubectl ate proxy` 是供你本机使用的工具：它经由 Kubernetes API server 建立隧道，因此该服务器宕机时它会失败，而 actor 的流量照常继续。

安装完成之后，你想验证一个 actor 能否应答。快速入门给了你两条命令和一个 `curl`，它们确实跑得通。于是你把同一条 proxy 命令放进了测试脚本。集群控制平面一旦重启，每个请求都会超时，而 actor 本身其实安然无恙。

读完本节，你能创建 actor，通过 `kubectl ate proxy` 访问它，并把它挂起。你还能说清为什么代理不能承载真实流量，以及真实客户端该如何替代它。

## 创建 actor {#s-your-first-actor-and-the-proxy-create-the-actor}

counter 演示创建了一个名为 `ate-demo-counter` 的 atespace，里面有一个名为 `counter` 的模板。用这个模板创建一个 actor：

```bash
kubectl ate create actor my-counter-1 -a ate-demo-counter --template counter
```

命令会打印新建的 actor。在我们的运行中，状态是 `ACTOR_STATE_SUSPENDED`，worker pod 是 `<none>`，版本是 1。[第 2.2 节](#s-kubectl-ate)展示了这段输出。

新 actor 不占用 worker，没有任何容器被启动。创建调用只往 Postgres 写入一行记录，并把 actor 指向它所属模板的黄金快照。在我们的一次测试中，我们在一个三 worker 的池上预先创建了 131 个 actor，当时没有任何一个处于运行状态。

## 启动代理 {#s-your-first-actor-and-the-proxy-start-the-proxy}

在单独的终端里启动代理，它会一直留在前台运行：

```bash
kubectl ate proxy actor my-counter-1 -a ate-demo-counter
```

```listing
title: 代理启动后的输出
source: capture/lab/B-lifecycle/01-proxy.log
lang: text
---
Proxying 127.0.0.1:8000 -> ate-demo-counter/my-counter-1:80
```

不带端口参数时，代理把本地 8000 端口转发到 actor 的 80 端口。要自选端口，可按 `local:remote` 形式传入端口对，例如 `8080:80` {{docs}}。除非传入 `--address`，代理默认只监听 `127.0.0.1` {{code}}。

**代理：** `kubectl ate proxy actor` 是一个本地监听器，经由 `atenet-router` 把 TCP 流量转发给单个 actor。它替你完成三件事：打开到 router 的端口转发、为 `atenet-client` 身份获取客户端证书，以及向 router 指明目标 actor。

安装时必须放行这个身份。这就是[第 2.1 节](#s-install-with-ate-setup)的安装命令在 `--ingress-allowed-spiffe-ids` 中传入 `atenet-client` 身份的原因。没有这个参数，router 不放行任何客户端，代理也就访问不到任何 actor {{docs}}。

## 发送请求 {#s-your-first-actor-and-the-proxy-send-requests}

在第二个终端里发送一个请求：

```bash
curl -X POST http://localhost:8000/
```

多发几次。下面是我们对前三个请求的录制：

```listing
title: 前三个请求
source: capture/lab/B-lifecycle/10-trace.tsv
lang: text
note: 追踪记录中的三行。各列依次是时间、事件、状态、秒数和响应体。
---
2026-11-12T10:14:21.837Z	call-1	200	0.358379	preserved memory count: 1 | preserved file counter: 1 | preserved rootfs counter: 1
2026-11-12T10:14:21.944Z	call-2	200	0.090770	preserved memory count: 2 | preserved file counter: 2 | preserved rootfs counter: 2
2026-11-12T10:14:22.030Z	call-3	200	0.066903	preserved memory count: 3 | preserved file counter: 3 | preserved rootfs counter: 3
```

counter 演示维护着三个计数：一个在内存中，一个在文件里，一个在根文件系统里。在这里三个计数同步增长。等到后面快照保存的状态少于完整内存时，它们就能用来验证到底保留了什么。[第 3.4 节](#s-snapshot-fidelity-and-where-a-snapshot-lives)会用到它们。

第一个请求触发了 actor 的恢复，现在它占用了一个 worker：

```listing
title: 运行 my-counter-1 的 worker
source: capture/lab/B-lifecycle/13-workers.txt
lang: text
note: 警告行已截去。
---
NAME                                   POOL      STATE                 ACTORS   CPU(MILLICORES)   MEMORY        POD                                         AGE
ec15263e-4c0f-45eb-adc1-53f5f60c2331   counter   WORKER_STATE_ACTIVE   1/1000   1000/1000         512Mi/960Mi   ate-demo-counter/counter-7cc7dcd596-ffxwt   74s
```

看 `CPU(MILLICORES)` 这一列。这单个 actor 就占满了所在 worker 1000 毫核中的全部 1000 毫核。`ACTORS` 列中 1000 个 actor 的上限并非实际瓶颈，CPU 才是真正的限制。因此演示用的三个 worker 的池，同一时间只能运行三个 counter actor，第四个必须等待。[第 4.5 节](#s-sizing-a-pool)依据这些列来估算池的大小。

## 自己挂起它 {#s-your-first-actor-and-the-proxy-suspend-it-yourself}

停止发送请求，观察 actor。它一直停在 `ACTOR_STATE_RUNNING`，Substrate 不会替你挂起它。

**我们测得**这一点，在一台 24 vCPU、47 GB 的 x86 服务器客户机上运行了一次。900 秒内我们没有发任何请求，每 15 秒读一次状态。全部 60 个样本都是 `ACTOR_STATE_RUNNING`。紧接着的下一个请求用了 0.080 秒，返回计数 6。

要释放 worker，就自己挂起 actor：

```bash
kubectl ate suspend actor my-counter-1 -a ate-demo-counter
```

**我们测得**这次挂起，在同一台客户机上运行了一次。命令在 0.40 秒内返回，状态变为 `ACTOR_STATE_SUSPENDED`。通过代理发出的下一个请求用了 0.36 秒，返回了下一个计数，说明内存状态也恢复了。

这种默认挂起是异步的。新快照只写在节点上，还没有进入对象存储。[第 3.3 节](#s-suspendactor-and-resumeactor)解释了这两种模式，[第 3.5 节](#s-crashed-and-revertactor)展示节点上的副本丢失时你会失去什么。

## 代理依赖 Kubernetes API server {#s-your-first-actor-and-the-proxy-the-proxy-depends-on-the-kubernetes-api-server}

代理通过 Kubernetes 端口转发连到 router，每个字节都经过 kube-apiserver。集群内的客户端不需要这一跳。[图 2.3](#fig-2-3) 把两条路径并排放在一起。

```figure
id: fig-2-3
kind: comparison
title: kube-apiserver 宕机时通往同一个 actor 的两条路径
claim: kube-apiserver 宕机 86 秒期间，代理没有服务任何请求，而调用 router 的 pod 服务了每一个请求。
caption: A 列是运维人员机器上的 kubectl ate proxy。B 列是集群内带有客户端证书的 pod。两者每秒各向同一个运行中的 actor 发送一个请求。来源：capture/lab/summary/dependency-loss-x86.json。
```

**我们测得**两条路径在一台 16 vCPU、23 GB 的 x86 服务器客户机上跑了一次，每秒发送一个请求。我们让 kube-apiserver 停机 86 秒。通过代理的请求，这段时间里 81 个中有 0 个得到响应，每一个都撞上了客户端 9 秒的超时上限。从 pod 发出的请求，86 个全部得到响应。kube-apiserver 重新就绪之后，代理又继续失败了 21 秒。

```listing
title: 我们分析中的 kube-apiserver 故障
source: capture/lab/E-dependency-loss/20-analysis.txt
lang: text
note: 第三次故障的数据块。计数从故障前 10 秒开始，到故障后 90 秒结束。
---
== T3 kube-apiserver: down at +0 s, restore action at +86 s, dependency ready at +91 s
  proxy/running (VM, kubectl ate proxy)
     codes from -10 s: 200x9 000x105 200x59
     first failure at +0 s, last failure at +112 s (= +26 s from restore action, +21 s from dependency ready); failed 105 of 173
     failure latency p50 9.00 s max 9.00 s
     105x code=000 body=''
  incluster/running (pod, mTLS to router)
     codes from -10 s: 200x186
     no failures
```

因此不要用代理来判断 Substrate 是否健康，也不要把代理放在生产应用和它的 actor 之间。代理反映的是你到集群的链路状况，调用 router 的 pod 才能反映 Substrate 本身。

## 真实客户端需要什么 {#s-your-first-actor-and-the-proxy-what-a-real-client-needs}

真实客户端是一个 pod。它需要三样东西，我们测试用的 pod 把这三样都体现了出来。

```listing
title: 调用 router 的 pod
source: capture/lab/E-dependency-loss/prober.yaml
lang: yaml
note: 容器和卷挂载已截去。
---
kind: Pod
…
metadata: {name: e-prober, namespace: ate-system, labels: {app: e-prober}}
…
  serviceAccountName: atenet-client
…
      - podCertificate: {credentialBundlePath: credential-bundle.pem, keyType: ECDSAP256, signerName: podidentity.podcert.ate.dev/identity}
…
      - clusterTrustBundle: {labelSelector: {matchLabels: {podcert.ate.dev/canarying: live}}, path: trust-bundle.pem, signerName: servicedns.podcert.ate.dev/identity}
```

1. **被放行的身份。** pod 以 `ate-system` 里的 ServiceAccount `atenet-client` 运行。这就是 `--ingress-allowed-spiffe-ids` 里的身份。安装不会创建这个 ServiceAccount，是我们自己创建的。
2. **客户端证书。** `podCertificate` 卷向 Kubernetes 申请带有该身份的证书。`clusterTrustBundle` 卷保存用来验证 router 的 CA。
3. **目标头。** 每个请求都在请求头 `ate-target-actor` 里写明目标 actor，格式是 atespace、一个斜杠、再加 actor 名称。

那个 pod 发出的请求就是下面这条命令：

```bash
curl --cacert /run/ca/trust-bundle.pem \
  --cert /run/id/credential-bundle.pem --key /run/id/credential-bundle.pem \
  -X POST -H 'ate-target-actor: lab-e/e-run' \
  https://atenet-router.ate-system.svc:443/
```

允许列表里的任何客户端都能通过 router 访问任何 actor {{docs}}。允许列表只决定谁能进入，不限定每个客户端能调用哪个 actor。[第 5.1 节](#s-client-authentication)和[第 6.1 节](#s-the-router-and-ingress)分别讲解身份和 router。

```takeaways
- 放心创建 actor，因为新 actor 不占用 worker。
- 看 kubectl ate get workers 的 CPU 列，判断一个 worker 能同时运行多少个 actor。
- actor 的工作完成后，自己把它挂起。
- kubectl ate proxy 只在你自己的机器上使用。
- 用带客户端证书、直接调用 atenet-router 的 pod 来测试 Substrate 的健康状态。
```

来源：capture/lab/summary/failures-x86.json, capture/lab/summary/dependency-loss-x86.json, capture/lab/A-quickstart/50-create-actor.log, capture/lab/B-lifecycle/01-proxy.log, capture/lab/B-lifecycle/10-trace.tsv, capture/lab/B-lifecycle/13-workers.txt, capture/lab/B-lifecycle/20-trace-ops.tsv, capture/lab/E-dependency-loss/20-analysis.txt, capture/lab/E-dependency-loss/10-timeline.tsv, capture/lab/E-dependency-loss/12-probe-proxy.tsv, capture/lab/E-dependency-loss/12-probe-incluster.tsv, capture/lab/E-dependency-loss/prober.yaml, capture/lab/E-dependency-loss/loop.sh, capture/lab/E-dependency-loss/00-setup.log, capture/lab/_scripts/b1-lifecycle-idle.sh; docs/reference/kubectl-ate.md, docs/reference/api-guide.md, cmd/ate-setup/commands.md, and cmd/kubectl-ate/internal/cmd/proxy.go at v1.0.0.
