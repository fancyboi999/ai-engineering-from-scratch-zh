# sbx exec、sbx cp 与 sbx ports

> 三个命令进入沙箱：`exec` 执行命令并启动已停止的沙箱，`cp` 跨边界复制文件，`ports` 未另行指定时绑定 `tcp4`。

`m101-demo` 内有服务监听 8080 端口。你想从宿主访问它，复制文件进去，再读出结果。容器使用 `docker exec`、`docker cp` 和 `docker run -p` 完成这些工作；`sbx` 有相同的三个动词，但各有一条不同规则。读完后，你能以任意用户执行命令、双向复制文件，以及发布 `localhost` 可访问的端口。

## sbx exec {#s-sbx-exec-cp-and-ports-sbx-exec}

**exec：** `sbx exec [flags] SANDBOX COMMAND [ARG...]` 在沙箱内执行一条命令；“If the sandbox is stopped, it is started first” {{help-sbx sbx exec}}，已停止的沙箱会先启动。flags 沿用 `docker exec`，但“except detached exec (-d/--detach) is not supported” {{help-sbx sbx exec}}，不支持分离执行，所以帮助中的 `-d` 只是说明它不支持。2025 插件曾支持 `docker sandbox exec -d`，[冲突 C31](#s-ref-sources-and-the-conflicts-register) 记录此事。带 `--cloud` 时，`-d`、`--user` 和 `--privileged` “are rejected rather than silently ignored” {{help-sbx sbx exec}}，明确拒绝而非静默忽略。

命令在工作区目录中以 `agent` 用户执行，uid 1000，属于 `sudo` 和 `docker` 组。`-u root` 改为 root，帮助用它运行 `apt-get update`，录制用它创建 `/opt/marker-from-demo`。`-w` 指定其他工作目录，`-e KEY=VALUE` 和 `--env-file FILE` 为该命令设置变量，`-it` 打开 shell。

沙箱内部知道自身名称。自 v0.39.0 起，沙箱“expose their own identity as SANDBOX_NAME and SANDBOX_ID environment variables” {{rel-sbx v0.39.0}}，通过这两个环境变量暴露身份；`SANDBOX_VM_ID` 仍是名称的弃用副本。`WORKSPACE_DIR` 指向挂载，`HOME` 为 `/home/agent`。

```listing
title: 从内部读取 m101-demo 身份
source: capture/out/04-env.txt
lang: text
note: 仅保留身份与工作区变量。代理和凭据变量在第3部分讨论。
---
$ sbx exec m101-demo sh -c 'env | sort'
…
HOME=/home/agent
…
PWD=$CAPTURE/fixtures/repo
…
SANDBOX_ID=<uuid>
SANDBOX_NAME=m101-demo
SANDBOX_VM_ID=m101-demo
…
WORKSPACE_DIR=$CAPTURE/fixtures/repo
…
[exit 0]
```

## sbx cp {#s-sbx-exec-cp-and-ports-sbx-cp}

**cp：** `sbx cp SRC DST`，其中“Either SRC or DST must be a sandbox path, written as SANDBOX:PATH” {{help-sbx sbx cp}}，一端必须以 `SANDBOX:PATH` 表示沙箱路径，另一端是宿主路径。“Copying between two sandboxes is not supported” {{help-sbx sbx cp}}，不支持沙箱间直接复制。录制中的 `sbx cp m101-demo:/tmp/out.txt m101-demo-2:/tmp/x` 以该消息和退出码1结束，因此这种复制要经过宿主。复制目录时，目录自身被放到目标位置；目标是已有目录时，源被放入其中。`-L` 跟随源中的符号链接。沙箱路径是容器路径，所以录制中的 `/tmp/in.txt` 位于工作区挂载外，随沙箱删除。

复制出沙箱有一条与安全历史有关的规则。2026-08-06 发布的 v0.38.0 “Fixed a destination-escape flaw in sbx cp copy-out (CVE-2026-17106)” {{rel-sbx v0.38.0}}，修复了复制出操作的目标逃逸漏洞。

```listing
title: 复制进去、复制出来与一次被拒绝的复制
source: capture/out/06-cp.txt
lang: text
note: 未截去任何内容。
---
$ sbx cp $CAPTURE/work/in.txt m101-demo:/tmp/in.txt
[exit 0]

$ sbx exec m101-demo sh -c 'cat /tmp/in.txt; printf out > /tmp/out.txt'
in
[exit 0]

$ sbx cp m101-demo:/tmp/out.txt $CAPTURE/work/out.txt
[exit 0]

$ cat $CAPTURE/work/out.txt
out
[exit 0]

$ sbx cp m101-demo:/tmp/out.txt m101-demo-2:/tmp/x
error: copying between sandboxes is not supported
  try: sbx cp --help
[exit 1]
```

## sbx ports {#s-sbx-exec-cp-and-ports-sbx-ports}

**ports：** `sbx ports SANDBOX` 列出已发布端口，`--publish SPEC` 添加，`--unpublish SPEC` 移除。格式为 `[[HOST_IP:]HOST_PORT:]SANDBOX_PORT[/PROTOCOL]`；“If HOST_PORT is omitted, an ephemeral port is allocated automatically” {{help-sbx sbx ports}}，省略宿主端口会自动分配临时端口。发布操作会“starts a stopped sandbox before creating the host binding” {{help-sbx sbx ports}}，与 `exec` 一样先启动已停止的沙箱。

要记住地址族规则：“When publishing without a PROTOCOL, tcp4 is used” {{help-sbx sbx ports}}，未指定协议默认 `tcp4`，只绑定 `127.0.0.1`；要双栈需“Publish tcp explicitly to bind both families” {{help-sbx sbx ports}}，明确写 `tcp`。v0.42.0 改为“a published port no longer listens on ::1 unless you name the protocol explicitly” {{rel-sbx v0.42.0}}，不明确写协议便不监听 `::1`。2025 插件默认绑定两种回环地址，见[冲突 C39](#s-ref-sources-and-the-conflicts-register)。

| `PROTOCOL` | 省略 `HOST_IP` 时的宿主绑定 |
|---|---|
| 未指定 | `tcp4` 的 `127.0.0.1`；`HOST_IP` 是 IPv6 地址时为 `::1` 上的 `tcp6` |
| `tcp`、`udp` | `127.0.0.1` 与 `::1`；沙箱仅支持 IPv4 时只有 `127.0.0.1` |
| `tcp4`、`udp4` | `127.0.0.1` |
| `tcp6`、`udp6` | `::1` |

录制发布 `18081:8080`，得到 `127.0.0.1:18081 -> 8080/tcp4`；`curl` 对 `127.0.0.1` 返回 `200`，对 `::1` 以退出码7失败。

```listing
title: tcp4 绑定及其列表
source: capture/out/05-ports.txt
lang: text
note: 未截去任何内容。
---
$ sbx ports m101-demo --publish 18081:8080
Published 127.0.0.1:18081 -> 8080/tcp4
[exit 0]

$ sbx ports m101-demo
HOST IP     HOST PORT   SANDBOX PORT   PROTOCOL
127.0.0.1   18081       8080           tcp4
[exit 0]
```

```listing
title: 只有 IPv4 回环响应
source: capture/out/05-ports-curl.txt
lang: text
note: 未截去任何内容。连接耗时遮蔽为 <n>。
---
$ curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:18081/README.md
200
[exit 0]

$ curl -sS -o /dev/null -w '%{http_code}\n' 'http://[::1]:18081/README.md'
curl: (7) Failed to connect to ::1 port 18081 after <n> ms: Couldn't connect to server
000
[exit 7]
```

随后 `--publish 8080/tcp` 绑定两种地址族，各使用临时宿主端口；`sbx ports --json` 按 `host_ip`、`host_port`、`sandbox_port` 和 `protocol` 列出各绑定。

```listing
title: tcp4 旁的双栈绑定
source: capture/out/05-ports-tcp.txt
lang: text
note: 仅保留发布操作及 JSON 列表的最后一条记录。临时端口遮蔽为 <port>。
---
$ sbx ports m101-demo --publish 8080/tcp
Published 127.0.0.1:<port> -> 8080/tcp
Published [::1]:<port> -> 8080/tcp
[exit 0]

$ sbx ports m101-demo --json
…
  {
    "host_ip": "::1",
    "host_port": "<port>",
    "sandbox_port": 8080,
    "protocol": "tcp"
  }
]
[exit 0]
```

不带协议的取消发布会移除映射，“whether it was published with that same default or as dual-stack tcp” {{help-sbx sbx ports}}，不论按默认方式还是双栈 tcp 发布。录制最后的 `sbx ports m101-demo --json` 输出 `[]`。`sbx run` 的 `-p` 仅在创建时生效，之后用 `sbx ports` 修改。`sbx ls` 在 `PORTS` 列显示绑定，录制中为 `127.0.0.1:18081->8080/tcp4`。云端发布端口会得到公共 URL，且拒绝 UDP，见 [sbx --cloud](#s-sbx-cloud-run-move-and-ttl)。

```takeaways
- 安装包时运行 `sbx exec -u root`；已停止的沙箱会因此启动。
- `sbx cp` 的沙箱端写成 `SANDBOX:PATH`；两个沙箱间复制要经过宿主。
- 客户端连接 `::1` 时发布 `PORT/tcp`，用 `sbx ports --json` 查看实际绑定。
```

Sources: help-sbx sbx exec, sbx cp, sbx ports, sbx run (research/sources/help-sbx.md); rel-sbx v0.38.0, v0.39.0, v0.42.0 (research/sources/sbx-releases.md); docs-sbx usage (research/sources/docs-sandboxes.md); conflicts C31, C39 (research/conflicts-register.md); capture/out/04-env.txt, 04-guest.txt, 04-workspace.txt, 05-ports.txt, 05-ports.json, 05-ports-curl.txt, 05-ports-ls.txt, 05-ports-tcp.txt, 05-ports-unpublish.txt, 06-cp.txt, 07-template-save.txt
