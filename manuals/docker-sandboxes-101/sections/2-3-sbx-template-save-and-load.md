# sbx template save 与 sbx template load

> 模板是沙箱运行时镜像存储中的快照，可用 `--pull never -t TAG` 复用，导出为 tar，再加载到另一台宿主。

你花一小时在 `m101-demo` 内安装工具链，希望明天的第二个沙箱直接复用。录制在 `/opt/marker-from-demo` 留下标记文件，把沙箱保存为 `m101-tpl:v1`，再从它创建 `m101-from-tpl`。读完后，你能保存模板、从模板启动沙箱，并用 tar 搬到另一台宿主。

## 模板包含什么 {#s-sbx-template-save-and-load-what-a-template-holds}

**模板：** 沙箱容器文件系统的快照，存为镜像。原文：“Templates are saved snapshots of sandboxes that can be reused to create new sandboxes with: sbx run --pull never -t TAG AGENT [WORKSPACE]” {{help-sbx sbx template}}。文档区分镜像与 kit：“A template contains image content; the agent kit still supplies runtime settings such as credentials and network rules” {{docs-sbx Saving a sandbox as a template}}，模板保存镜像内容，凭据与网络规则等运行设置仍由 kit 提供。挂载文件系统不在其中，因为“A saved template isn't a backup of the whole sandbox” {{docs-sbx Saving a sandbox as a template}}，模板不是整个沙箱的备份，宿主工作区和 `/var/lib/docker` 的 Docker 存储均不包含。容器文件系统中的其他内容都包含，连 agent 写入文件的密钥也不例外。凭据应留在 [sbx secret](#s-sbx-secret-set-import-and-set-custom) 和代理中。`/home/agent/.claude/settings.json` 等配置“are always recreated when a sandbox is created” {{docs-sbx Limitations}}，创建沙箱时总会重新生成，因此修改也不会保留。

每个内置 agent 从 `docker/sandbox-templates:<variant>` 启动；`m101-demo` 拉取的是 `docker/sandbox-templates:shell-docker`。后缀为 `-docker` 的变体“include Docker Engine for building and running containers inside the sandbox” {{docs-sbx Choose a template}}，包含用于沙箱内构建和运行容器的 Docker Engine，所以 `docker version` 在 `m101-demo` 内能响应。设置 `platform.images.useDHI` 后，“the default template docker/sandbox-templates:claude-code-docker becomes dhi/sbx-templates:claude-code-docker” {{docs-sbx platform.images.useDHI}}，默认仓库改变，tag 保持相同。

## sbx template save {#s-sbx-template-save-and-load-sbx-template-save}

`sbx template save SANDBOX TAG` 要求沙箱已停止。录制先对运行中的 `m101-demo` 尝试，得到 `cannot save a running sandbox`，然后停止并保存为 `m101-tpl:v1`。镜像“is stored in the sandbox runtime's image store” {{help-sbx sbx template save}}，位于沙箱运行时的镜像存储，与宿主 Docker 守护进程的存储分开 {{docs-sbx Load a template}}。2025 插件的 `docker sandbox save` 默认加载到宿主守护进程，`--output` 才写文件，见[冲突 C32](#s-ref-sources-and-the-conflicts-register)。

```listing
title: 保存被拒绝、停止后再保存
source: capture/out/07-template-save.txt
lang: text
note: 创建标记文件的 exec 已截去。录制目录遮蔽为 $CAPTURE。
---
$ sbx template save m101-demo m101-tpl:v1 --output $CAPTURE/work/m101-tpl.tar
Sandbox m101-demo is running and must be stopped before saving. Stop it now? (y/N): error: cannot save a running sandbox; stop it first with:
  try: sbx stop m101-demo
[exit 1]

$ sbx stop m101-demo
Sandbox 'm101-demo' stopped; state preserved. Restart with: sbx run --name m101-demo
[exit 0]

$ sbx template save m101-demo m101-tpl:v1 --output $CAPTURE/work/m101-tpl.tar
Snapshotting image in sandbox ...
Exporting image to $CAPTURE/work/m101-tpl.tar ...
Exported to $CAPTURE/work/m101-tpl.tar

Save complete. To use the image as a template:
    sbx run --pull never -t docker.io/library/m101-tpl:v1 AGENT [WORKSPACE]
[exit 0]
```

随后 `sbx template ls --json` 列出三个镜像：基础镜像 `docker.io/docker/sandbox-templates:shell-docker`、flavor 为 `shell` 的新镜像 `docker.io/library/m101-tpl:v1`，以及 `docker.io/sandboxes-swap/m101-demo:bf19e491`。最后一个由运行时为已停止沙箱保存，所有沙箱移除后它也消失。各记录包含 `id`、`repository`、`tag`、`flavor`、`created_at` 和 `size`；录制遮蔽了 id，所以本手册不声明其格式。

```listing
title: 镜像存储中的模板
source: capture/out/07-template-ls.json
lang: json
note: 仅保留 m101-tpl:v1 的记录。
---
{
  "images": [
    …
    {
      "id": "<id>",
      "repository": "docker.io/library/m101-tpl",
      "tag": "v1",
      "flavor": "shell",
      "created_at": "<ts>",
      "size": "<n>"
    },
    …
  ]
}
```

## 用 --pull never -t 复用 {#s-sbx-template-save-and-load-reuse-with-pull-never-t}

复用命令为 `sbx run --pull never -t TAG AGENT [WORKSPACE]`；帮助解释：“Use --pull never to use the saved image without trying to pull it from a registry” {{help-sbx sbx template save}}，使用保存镜像而不尝试从 registry 拉取。录制执行 `sbx create --pull never -t m101-tpl:v1 shell --name m101-from-tpl`，看到 `Checking image` 而非 `Pulling image`，并在新沙箱中找到 `/opt/marker-from-demo`。agent 必须与模板匹配；Claude 模板用 `codex` 运行会警告沙箱“may not work correctly” {{docs-sbx Limitations}}，可能无法正常工作。

```listing
title: 从模板创建的沙箱及其标记文件
source: capture/out/07-template-run.txt
lang: text
note: 两条命令间的 sbx ls 已截去。
---
$ sbx create --pull never -t m101-tpl:v1 shell --name m101-from-tpl

sandbox    m101-from-tpl
agent      shell
workspace  none · no workspace bind mount
image      m101-tpl:v1
cpu        10
memory     32 GiB

Checking image
✓ Image ready
✓ Created sandbox m101-from-tpl
…
$ sbx exec m101-from-tpl sh -c 'ls -l /opt/marker-from-demo'
-rw-r--r-- 1 root root 0 <date> /opt/marker-from-demo
[exit 0]
```

`sbx template inspect` “Cloud-only in v1: requires --cloud” {{help-sbx sbx template inspect}}，v1 仅支持云端，要求 `--cloud`。录制中的本地尝试退出码1，提示运行 `docker image inspect -- m101-tpl:v1`。但该命令读取宿主守护进程存储，与运行时不共享，因此本地模板应查 `sbx template ls`。`sbx template rm m101-tpl:v1 --force` 输出 `Removed: m101-tpl:v1`；`sbx reset` 也清空缓存镜像。

## 导出与加载 {#s-sbx-template-save-and-load-export-and-load}

save 的 `--output FILE` 还会写 tar。`work/m101-tpl.tar` 有24项，以 `blobs/sha256/` 开始，这是 OCI 镜像布局。在另一台宿主上，`sbx template load FILE` 加载“an image from a tar file into the sandbox runtime's image store” {{help-sbx sbx template load}}，把 tar 镜像导入运行时镜像存储，再用 `sbx run --pull never -t m101-tpl:v1 shell` 启动。录制没有在第二台机器加载 tar，所以[图](#fig-2-2) 的这一步依据帮助文本绘制。自建镜像也走同样流程：`docker image save` 写 tar，`sbx template load` 导入，因此镜像“doesn't need to be reachable from a registry at sandbox creation time” {{docs-sbx Load a template}}，创建沙箱时无需从 registry 可达。

```figure
id: fig-2-2
kind: flow
title: 从已停止的沙箱到模板、tar 和新沙箱
claim: 模板从已停止沙箱进入运行时镜像存储，导出为 tar，再用 --pull never -t 创建新沙箱。
caption: 先从左到右，再向下读。青绿色实线表示向存储或文件持久写入；墨色实线是 create 调用，橄榄色虚线是在 sbx 外手动复制。来源为 capture/out/07-template-save.txt、07-template-ls.json、07-template-tar-head.txt 和 07-template-run.txt。另一宿主上的加载未录制，依据 sbx template load 帮助文本。
```

云端 `sbx --cloud template load FILE NAME` 需要 `--cpus` 和 `--memory-mib`，共同指定计费规格 {{help-sbx sbx template load}}。规格从 micro（1 vCPU、2048 MiB）到 xl（16 vCPU、32768 MiB）。`--capture-mode all` 在磁盘捕获之外增加内存与 microVM 检查点。C 级未录制，所以本手册不展示云端 listing，[sbx --cloud](#s-sbx-cloud-run-move-and-ttl) 改为引用帮助文本。

```takeaways
- 停止沙箱，再运行 `sbx template save SANDBOX TAG --output FILE`。
- 用 `--pull never -t TAG` 及模板匹配的 agent 启动。
- 密钥留在 `sbx secret set` 中；模板会复制容器文件系统的每个文件。
- 用 `sbx template load` 加载 tar，因为运行时存储与宿主守护进程分开。
```

Sources: help-sbx sbx template, sbx template save, sbx template load, sbx template inspect, sbx template rm (research/sources/help-sbx.md); docs-sbx usage, Saving a sandbox as a template, Load a template, Template caching, Choose a template, platform.images.useDHI (research/sources/docs-sandboxes.md); conflict C32 (research/conflicts-register.md); capture/out/04-create.txt, 04-guest.txt, 07-template-save.txt, 07-template-ls.json, 07-template-ls.txt, 07-template-run.txt, 07-template-inspect.txt, 07-template-rm.txt, 07-template-tar-head.txt, 99-final-state.txt
