# 工具沙箱

> 一个带有一条出站规则、两项资源限制并在每个任务后执行回退的 actor，能运行你不信任的命令，并在半秒内恢复干净状态。

你的 agent 会编写 shell 命令，并且必须有组件来运行它。如果该命令在你的应用程序旁边运行，模型输出中的一行恶意代码就可能读取你的密钥或将其发送出去。你想要一个能让该命令完成工作而无法做任何其他事情的地方。

读完本节，你能在 actor 内部运行你不信任的命令。你还能证明该 actor 能够触达哪些目标，并在每个任务结束后将其恢复到干净状态。

## 沙箱 actor {#s-a-tool-sandbox-the-sandbox-actor}

**工具沙箱（tool sandbox）：** 唯一职责就是替 agent 运行命令的 actor。它没有任何凭据，除了你列出的路由外没有任何出站路由，也不保留任何状态。

示例 actor 只有 38 行 Python 代码。它接收一条命令，在 `/work` 目录中通过 `sh -c` 运行它，并返回退出码和输出。

```python
task = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
done = subprocess.run(["sh", "-c", task["cmd"]], cwd=WORK,
                      capture_output=True, text=True, timeout=task.get("timeout", 20))
result = {"exit": done.returncode, "stdout": done.stdout[-2000:], "stderr": done.stderr[-1000:]}
```

围绕那段代码的三样东西把它变成了一个沙箱，而 Substrate 提供了这全部三样。完整文件在[工具沙箱目录](manuals/agent-substrate-101/capture/demos/tool-sandbox)。

```figure
id: fig-9-3
kind: flow
title: 单个沙箱 actor 内的六个任务，每个任务后执行一次回退
claim: 从允许的镜像源下载成功，三次尝试访问其他主机的操作均告失败，每次回退都返回一个空的工作目录。
caption: 从左向右读。每行是一个任务、命令看到的结果，以及随后回退的耗时。玫瑰色标记被拒绝或失败的任务。来源：capture/lab/N-demos/tool-sandbox/tasks.tsv。
```

第一样是出站策略。该 actor 只有一条规则，对应单个主机，Substrate 会拒绝前往其他所有目的地的访问。在此示例中，该主机是集群内部的一个软件包镜像源。

```listing
title: 沙箱 actor 的出站策略
source: capture/lab/N-demos/tool-sandbox/egress-policy-live.yaml
lang: yaml
note: 规则部分。上方的元数据行已省略。
---
…
rules:
- http:
    hostnames:
    - pkg-mirror.demo-tools.svc.cluster.local
    ports:
      numbers:
      - 80
```

第二样是模板中的两项限制：500 millicores 和 256 MiB。第三样是模板的黄金快照，新 actor 从它启动。

`RevertActor` 会将 actor 恢复到其最新的持久快照 {{code}}。只有在该 actor 从未产生过自身持久化挂起快照时，该快照才等于黄金快照。本示例从不挂起该 actor，因此这里的每次回退都会恢复黄金状态。一旦某个机制挂起了该 actor（例如空闲挂起器），它就会获得自己的持久快照，随后的回退将回到该快照。

```bash
kubectl ate create actor task-1 -a demo-tools --template sandbox
kubectl ate create egress-policy task-1 -a demo-tools -f egress-policy.yaml
kubectl ate proxy actor task-1 -a demo-tools 8901:80 &
python3 client.py 8901 'wget -q -O hello.txt http://pkg-mirror.demo-tools.svc.cluster.local/hello-1.0.txt'
kubectl ate revert actor task-1 -a demo-tools
```

## 六个任务 {#s-a-tool-sandbox-six-tasks}

我们向同一个 actor 发送了六条命令。每条命令执行完毕后，脚本都会回退该 actor，随后询问它 `/work` 目录下有多少个文件。

```listing
title: 允许的下载、回退以及检查
source: capture/lab/N-demos/tool-sandbox/tasks.tsv
lang: text
note: 表头以及第一个任务的三行内容。
---
label	phase	state	http	seconds	result
allowed download	task	RUNNING	200	0.54	{"exit": 0, "stdout": "hello package 1.0\nhello.txt\n", "stderr": "", "seconds": 0.17}
allowed download	revert	SUSPENDED	-	0.47	-
allowed download	clean-check	RUNNING	200	0.44	{"exit": 0, "stdout": "0\n", "stderr": "", "seconds": 0.16}
```

下载成功了，命令看到了文件 `hello.txt`。回退耗时 0.47 秒。下一个请求在 0.44 秒内从黄金快照恢复了该 actor，并且 `/work` 目录下没有任何文件。

接下来的三条命令尝试访问策略中未列出的目的地。

```listing
title: 三种出站途径，均被拒绝
source: capture/lab/N-demos/tool-sandbox/tasks.tsv
lang: text
note: 任务 2、3 和 4 的 task 行。其间的回退和检查行已省略。
---
send data out by name	task	RUNNING	200	0.20	{"exit": 0, "stdout": "** server can't find example.com: NXDOMAIN\n\nwget_exit=1\n", "stderr": "wget: bad address 'example.com'\n", "seconds": 0.11}
…
send data out by IP	task	RUNNING	200	0.15	{"exit": 0, "stdout": "wget_exit=1\n", "stderr": "wget: server returned error: HTTP/1.1 403 Forbidden\n", "seconds": 0.04}
…
reach the Kubernetes API	task	RUNNING	200	0.13	{"exit": 0, "stdout": "wget_exit=1\n", "stderr": "wget: bad address 'kubernetes.default.svc.cluster.local'\n", "seconds": 0.04}
```

策略之外的域名无法解析。命令得到 `NXDOMAIN`，`wget` 报告错误地址。对于 Kubernetes API 的 Service 名称也是如此。向 IP 地址发起的请求会到达出站网关，网关返回 403。命令没有任何办法探知该地址是否存在。

最后两条命令测试资源限制。

```listing
title: CPU 工作与超出限制的内存占用
source: capture/lab/N-demos/tool-sandbox/tasks.tsv
lang: text
note: 任务 5 的 task 行以及任务 6 的三行内容。
---
2 s of CPU work on a 500m limit	task	RUNNING	200	2.63	{"exit": 0, "stdout": "wall_seconds 2.38\n", "stderr": "", "seconds": 2.54}
…
memory hog on a 256 MiB limit	task	CRASHED	503	4.52	upstream connect error or disconnect/reset before headers. reset reason: connection termination
memory hog on a 256 MiB limit	revert	SUSPENDED	-	0.43	-
memory hog on a 256 MiB limit	clean-check	RUNNING	200	0.44	{"exit": 0, "stdout": "0\n", "stderr": "", "seconds": 0.11}
```

内存限制起到了硬终止的作用。一条申请了 640 MiB 的命令终止了整个沙箱。客户端在 4.52 秒后收到 503，actor 状态变为 `CRASHED`，一次回退便恢复出一个干净的 actor。

示例中的 CPU 那一行，真实含义并非表面所见。该命令运行一个循环，直到进程用完 2.0 秒的 CPU 时间，并且它是在沙箱内部读取该时间的。在 500 millicores 的限制下，它在 2.38 秒内就运行结束了。我们最初的解读是限制没有放慢该命令。那个解读是错误的，后来的测试推翻了它。

CPU 限制是一个硬上限。worker 将来自 `cpuMillicores` 的 CPU 配额写入该 actor 的 cgroup。对于这个模板，配额是每 100 毫秒周期内拥有 50 毫秒的 CPU 时间 {{code}}。程序在被限速的沙箱内部读取的 CPU 时间偏高。因此示例中的循环提前停止了，实际完成的工作少于单个核心 2.0 秒的量。

**我们测得**该上限在第二台 x86 服务器客户机（16 vCPU、23 GB）上的表现，使用固定工作量，每个限制测试三次。在 1000 millicores 下耗时 4.9 到 5.4 秒的工作，在 500 millicores 下耗时 12.7 到 13.1 秒，在 250 millicores 下耗时 27.1 到 27.6 秒。在 500 millicores 下，无论 1 个线程还是 4 个线程，actor 占用的宿主机核心都是 0.50 个。在 250 millicores 下，程序报告了 22 到 24 秒的 CPU 时间，而实际上在宿主机上只消耗了 6.9 秒。[WorkerPool](#s-workerpool) 中有对应的表格和图表。

对于工具沙箱，这正是你想要的结果。繁忙的命令无法获取超过其限制的 CPU，也不会饿死 worker 上的下一个 actor。在沙箱中衡量工作量时，请使用固定任务和墙钟时间，切勿使用任务自身报告的 CPU 时间。

## 回退的代价 {#s-a-tool-sandbox-what-a-revert-costs}

**我们测得**六次回退在第二台 x86 服务器客户机（16 vCPU、31 GB）上的耗时。CLI 端每次耗时 0.43 到 0.51 秒。每次回退后的第一个请求耗时 0.44 到 0.46 秒，其中包括从黄金快照恢复的时间。为下一个任务准备一个干净的沙箱总共耗时约一秒。

这个数字取决于黄金快照。该 actor 包含一个 Python 进程，不包含任何数据。[SuspendActor 与 ResumeActor](#s-suspendactor-and-resumeactor) 展示了该耗时如何随内存增加。

## 示例的局限 {#s-a-tool-sandbox-limits-of-the-demo}

- actor 没有身份认证。能够触达它的调用方都能运行命令。请把它放在你的 agent 后面，并给 router 配置严格的允许列表。
- 我们没有运行无休止启动进程的命令。
- 镜像源是集群内部走 HTTP 的单一服务器。公开的软件包索引需要 `tlsPassthrough` 规则，该规则不需要信任包。只有当网关必须读取请求或注入凭据时，才使用 `https` 规则和信任包。
- 这里的隔离方案是 gVisor。我们没有在 microVM 类别上运行此示例。
- 命令可以在 worker 允许的内存和磁盘范围内填满 `/work` 和根文件系统。我们没有测试磁盘限制。

## 上生产前要改什么 {#s-a-tool-sandbox-what-to-change-for-production}

为每个任务或每个用户使用独立的 actor，并在结束时将其删除。只有全新的 actor 才能保证从黄金快照启动。回退会回到该 actor 最新的持久快照，而任务执行期间的挂起可能会使该任务的状态持久化。如果你系统中任何组件有可能挂起沙箱 actor，请在每个任务后将其删除并重新创建。全新的名字也不会残留任何对旧状态的疑虑。我们没有对比回退与删除后再创建的耗时。

在运行第一条命令之前编写出站策略。没有策略的 actor 无法触达任何目标，这是安全的默认状态。按完整名称列出软件包主机，绝不要为同时保存了你数据的主机添加规则。

```takeaways
- 为沙箱 actor 配置出站规则时，只为它需要的主机各配一条规则，不留多余规则。
- 在每个任务之后回退 actor，并检查工作目录是否为空。
- 当挂起有可能导致任务状态被持久化时，删除并重新创建该 actor。
- 设定能够容纳最大工具的内存限制，并对超出限制引发的崩溃做好准备。
- 依靠 `cpuMillicores` 作为硬上限，并在固定任务上用墙钟时间测量沙箱工作。
```

来源：capture/lab/N-demos/tool-sandbox/tasks.tsv, capture/lab/N-demos/tool-sandbox/egress-policy-live.yaml, capture/lab/N-demos/tool-sandbox/lifecycle.log, capture/lab/summary/demos-x86.json, capture/lab/Q-network/n-cpu-limit/40-work.tsv, capture/lab/summary/cpu-limit-x86.json, capture/demos/tool-sandbox/sandbox.py, capture/demos/tool-sandbox/template.yaml, capture/demos/tool-sandbox/run.sh; api/ateapi/v1/ateapi.proto (RevertActor, EgressRule), internal/ocispec/ocispec.go (the CPU quota), docs/reference/sandbox-classes.md and docs/guides/egress-trust-bundle.md at v1.0.0
