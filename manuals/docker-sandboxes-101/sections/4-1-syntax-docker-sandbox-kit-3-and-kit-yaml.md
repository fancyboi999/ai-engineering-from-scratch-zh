# `# syntax=docker/sandbox-kit:3` 与 kit.yaml

> v3 kit 是普通 OCI 镜像，manifest 注解携带严格 YAML 描述文件，sbx 创建沙箱时解析它。

团队希望每个 Codex 沙箱都有相同的三个工具、两个获准主机及指令。kit 在一个文件中声明工具、主机与凭据，文件随镜像分发。

读完本节，你能逐行解读 v3 描述文件，说出 frontend 写入镜像的内容，并区分构建、检查和运行它的命令。

## 一个镜像、一条注解 {#s-syntax-docker-sandbox-kit-3-and-kit-yaml-one-image-one-annotation}

**Kit：** 一个 OCI 镜像，manifest 注解 `vnd.docker.sandbox.kit.descriptor` 携带声明，层携带内容 {{kitspec §1}}。原文{{kitspec §1}}，标准工具可拉取、检查及 FROM；不读注解的引擎将它作为普通镜像运行。

**Workload：** 层为根文件系统、镜像 config 含启动命令的 kit。每个组合恰有一个 {{kitspec §1}}。

**Mixin：** 层为覆盖 workload 文件系统的 overlay；每组合可有零个或多个 {{kitspec §1}}。第三种 `kind` 为 `set`，只在编写时存在{{kitspec §4}}，发布时由所列 kit 推导 workload 或 mixin。

## 逐行读描述文件 {#s-syntax-docker-sandbox-kit-3-and-kit-yaml-the-descriptor-line-by-line}

录制套件写了一个 v3 描述文件：shell workload，内联构建配方，单项网络授权：

```listing
title: 录制套件写出的 v3 描述文件
source: capture/fixtures/kits/hello-kit/kit.yaml
lang: yaml
---
# syntax=docker/sandbox-kit:3
schemaVersion: "3"
kind: workload
displayName: hello-kit
description: A shell workload with one network grant, in the v3 descriptor form.
version: "1.0.0"
licenses: [Apache-2.0]
build: |
  FROM docker/sandbox-templates:shell
  COPY HELLO.md /home/agent/HELLO.md
capabilities:
  - type: com.docker.sandbox/network-policy@2
    config:
      runtime:
        allow:
          - example.com
```

frontend {{kitspec §1.1}}，由首行选择。`schemaVersion` 必须恰为字符串 `"3"`，`kind` 为 `workload`、`mixin` 或 `set` {{kitspec §4}}。`displayName`、`description`、`version` 和 `licenses` 是可选展示元数据。没有 `name` 字段，因为身份由消费 kit 时所用引用决定 {{kitspec §1}}。

`build:` 字段{{kitspec §3.2}}，携带 Dockerfile 原文。`capabilities` 是带 `type` 与 `config` 的条目列表 {{kitspec §7}}。此处一个 `network-policy@2` 条目允许 agent 稳态运行的 `runtime` 阶段访问 `example.com` {{kitcap network-policy@2}}。

解码严格{{kitspec §1.2}}，任何未知字段都报错。原因是策略{{kitspec §1.2}}，拼错键若被静默忽略，就等于策略静默缺失。[图](#fig-4-1) 并列文件与构建推送的 manifest。

```figure
id: fig-4-1
kind: structure
title: v3 描述文件与携带它的镜像 manifest
claim: frontend 将 hello-kit 描述文件复制到一条 manifest 注解，从字段派生另六条注解，并在 built-by 中记录自身版本。
caption: 从左到右读。左列为 capture/fixtures/kits/hello-kit/kit.yaml，各说明指出行的去向；右列为本地 registry 返回的 index 和 arm64 manifest，来自 capture/out/28-index.json 与 28-manifest.json。青绿色线表示 frontend 写入。
```

## frontend 发布什么 {#s-syntax-docker-sandbox-kit-3-and-kit-yaml-what-the-frontend-publishes}

`docker buildx build ./my-kit -f ./my-kit/my-kit.yaml -t docker.io/<NAMESPACE>/my-kit:1.0.0 --push` 构建并发布 kit {{docs-sbx Publish an image}}。录制套件用 `docker-container` builder 向本地 registry 运行它（`28-builder.txt`、`28-buildx.txt`），registry 返回以下 manifest：

```listing
title: hello-kit manifest 的注解
source: capture/out/28-manifest.json
lang: json
note: config、层和大部分描述文件已截去。registry 将描述文件存为一个 JSON 字符串；录制套件解码后保留402个 provides 条目中的五个。
---
  "mediaType": "application/vnd.oci.image.manifest.v1+json",
…
  "annotations": {
    "org.opencontainers.image.description": "A shell workload with one network grant, in the v3 descriptor form.",
    "org.opencontainers.image.licenses": "Apache-2.0",
    "org.opencontainers.image.title": "hello-kit",
    "org.opencontainers.image.version": "1.0.0",
    "vnd.docker.sandbox.kit.built-by": "{\"name\":\"docker/sandbox-kit\",\"version\":\"3.0.0-m.8\",\"revision\":\"129be2ff45e8f9463450eb3cf04ddcb52c2b76e5\"}",
    "vnd.docker.sandbox.kit.capabilities": "com.docker.sandbox/network-policy@2",
    "vnd.docker.sandbox.kit.descriptor": {
      "schemaVersion": "3",
…
      "provides": [
        "deb/adduser@3.153",
…
        "... 397 more derived provides entries"
      ],
…
    "vnd.docker.sandbox.kit.schema-version": "3"
```

描述文件注解是{{kitspec §9.3}}，即紧凑 JSON 发布描述，保留 `build:` 文本。workload 的 frontend 还读包数据库，为每个已安装包添加一项 `deb/` {{kitspec §9.6}}。`schema-version` 和 `capabilities` 重复两个字段；`org.opencontainers.image.*` 键复制展示字段 {{kitspec §9.3}}。构建按 `kit.yaml` 文件主名，将源文件暂存至 `/usr/share/sandbox/kit/kit` {{kitspec §10}}。

## 哪些命令接受 v3 kit {#s-syntax-docker-sandbox-kit-3-and-kit-yaml-which-commands-accept-a-v3-kit}

[冲突 C13](#s-ref-sources-and-the-conflicts-register) 询问各命令接受哪代 kit，录制给出答案：

```listing
title: v2 工具拒绝 v3 目录
source: capture/out/13-kit-v3-validate.txt
lang: text
---
$ sbx kit validate ./fixtures/kits/hello-kit
error: kit ./fixtures/kits/hello-kit is a v3 source kit and this load path has no kit builder configured; artifact validation failed
[exit 1]
```

```listing
title: inspect 用宿主 Docker 守护进程构建 v3 源文件
source: capture/out/13-kit-v3-inspect.txt
lang: text
note: 错误结尾的文档链接已截去。28-kit-inspect-source.txt 重复同一错误。
---
$ sbx kit inspect ./fixtures/kits/hello-kit --json
   → build kit ./fixtures/kits/hello-kit (sbx-kit-src:kit-<id>)
error: build kit ./fixtures/kits/hello-kit: exit status 1 ERROR: failed to build: OCI exporter is not supported for the docker driver. Switch to a different driver, or turn on the containerd image store, and try again. …
[exit 1]
```

裁定：`sbx kit validate`、`pack`、`push` 和 `pull` 是 v1/v2 工具。`pack` 也因没有 `spec.yaml` 拒绝目录（`13-kit-v3-pack.txt`）。文档同意{{docs-sbx Publish an image}}，v3 应用 Buildx。

v3 kit 由 `sbx run` 和 `--kit` 消费，因为{{rel-sbx v0.42.0}}，现在 agent 位置参数可接受 kit 引用。但推送的 hello-kit 从未进入沙箱，因为 `kit.allowedSources` 默认为 `["docker.io/"]`（[C40](#s-ref-sources-and-the-conflicts-register)、`02-settings.txt`）{{rel-sbx v0.34.0}}：

```listing
title: sbx 拒绝 docker.io 之外的 kit
source: capture/out/28-run-kit.txt
lang: text
note: 允许列表值后的建议和第二项建议已截去。28-kit-inspect.txt 展示 sbx kit inspect 的相同拒绝。
---
$ sbx create localhost:15000/m101/hello-kit:v1 fixtures/repo-kit --name m101-v3
error: resolve kits: kit "localhost:15000/m101/hello-kit:v1": kit "localhost:15000/m101/hello-kit:v1" cannot be installed — its source is not in your allowlist; current kit.allowedSources: docker.io/; …
  try: sbx settings set kit.allowedSources '["docker.io/","localhost:15000/m101/"]'
…
[exit 1]
```

录制套件从不改 `sbx settings`，所以没有 sbx 运行 v3 kit 的录制。混用受两条规则限制{{docs-sbx Version compatibility}}，同一沙箱不能混用 v3 与 v1/v2；{{docs-sbx Version compatibility}}，内置名称选择 v2。Docker 的 v3 workload 发布为 `docker/sbx-kit-*`，如 `docker.io/docker/sbx-kit-codex:0.155.1` {{docs-sbx Run a kit}}。

## 运行结果与页面的分歧 {#s-syntax-docker-sandbox-kit-3-and-kit-yaml-where-the-run-and-the-pages-disagree}

五项运行结果与规范或文档冲突，登记表 [C113 至 C117](#s-ref-sources-and-the-conflicts-register) 覆盖它们。下表列出双方：

| 页面说法 | 录制结果 | 文件 |
|---|---|---|
| `docker buildx build -f kit.yaml --push` 发布 kit {{docs-sbx Publish an image}} | Desktop 4.94.0 默认 `docker` driver 推送无注解的 Docker schema 2 manifest | `28-buildx-docker-driver.txt`、`28-manifest-docker-driver.json` |
| frontend 会在导出生成 index 时把四项注解附加到 image index {{kitspec §9.3}} | index 有 attestation manifest 但无注解；arm64 manifest 携带全部八项 | `28-index.json`、`28-manifest.json` |
| 浮动 `docker/sandbox-kit:3` 不会指向 milestone（规范 README） | `:3` 解析为 2026-10-02 的 milestone `3.0.0-m.8` | `28-buildx.txt` |
| 开发时可将本地 source directory 传给 `sbx` {{docs-sbx Publish an image}} | 对目录执行 `sbx kit inspect` 失败：`docker` driver 不支持 OCI exporter | `13-kit-v3-inspect.txt`、`28-kit-inspect-source.txt` |
| 源码构建使用共享的 `sbx-kit-builder` 沙箱 {{help-sbx sbx kit builder}} | 构建实际运行在宿主 Docker daemon；之后 builder 状态显示 `not created` | `13-kit-v3-inspect.txt`、`13-kit-builder-status.txt` |

没有描述文件注解的镜像，对任何消费者都不是 kit {{kitspec §10}}，所以使用 `docker-container` builder。消费者在 index 找不到注解时读取平台 manifest {{kitspec §9.3}}。规范自称实验性，最终版本目标为2026年第4季度。

kit 卷默认大小仍有争议（[C12](#s-ref-sources-and-the-conflicts-register)）：v0.39.0 说明为512 MB {{rel-sbx v0.39.0}}，研究记录为20 GiB，本手册并列两者。`kit-tck validate` 判断发布产物，`kit-tck inspect` 读回；本手册两者均未运行。[第7.4节](#s-kit-tck-diagnose-and-the-claims-this-manual-checked) 列出实际检查的断言。

```takeaways
- v3 描述文件以 syntax 行及 `schemaVersion: "3"` 开头，capabilities 写成列表。
- 用 `docker-container` builder 构建 v3；默认 `docker` driver 会丢掉注解。
- 运行 Docker Hub 之外的 kit 前，将 registry 前缀加入 `kit.allowedSources`。
- 用引用运行 v3 workload，`--kit` 添加 v3 mixin，绝不跨代混用。
```

Sources: kitspec §1, §1.1, §1.2, §3.2, §4, §7, §9.3, §9.6, §10 (research/sources/SPEC-v3-at-v3.0.0-m.8.md); kitcap network-policy@2 (research/sources/kit-capabilities.md); research/sources/kit-spec-extras.md (README and RELEASES.md of docker/sandbox-kit-spec, for the frontend tag and the milestone dates); docs-sbx Kits, Use kits, Build and distribute kits (research/sources/docs-sandboxes.md); help-sbx sbx kit builder (research/sources/help-sbx.md); rel-sbx v0.34.0, v0.39.0, v0.42.0 (research/sources/sbx-releases.md); research/conflicts-register.md rows C12, C13, C40, and C113 to C117; capture/README.md (the findings of K28); capture/fixtures/kits/hello-kit/kit.yaml; capture/out/02-settings.txt, 13-kit-v3-validate.txt, 13-kit-v3-pack.txt, 13-kit-v3-inspect.txt, 13-kit-builder-status.txt, 28-builder.txt, 28-buildx.txt, 28-buildx-docker-driver.txt, 28-manifest.json, 28-manifest-docker-driver.json, 28-index.json, 28-kit-inspect-source.txt, 28-kit-inspect.txt, 28-run-kit.txt
