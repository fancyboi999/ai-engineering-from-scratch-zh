# share push 与 share pull

> `share push` 将 agent 文件存为带 docker-agent 注解的 OCI 产物；`share pull` 或带同一引用的 `run` 从任意 registry 读回。

队友想要你昨天用的 agent。聊天里的 YAML 文件没有版本，也没有拉取地址。registry 引用两者都有，却不能证明发布者。Docker Agent 像 Docker 推镜像一样推 agent 文件。

读完本节，你能推送文件、读 manifest、拉回文件并按引用运行。

## 推送到 registry {#s-share-push-and-share-pull-push-to-a-registry}

**share push：** “Push an agent configuration file to an OCI registry” {{help-agent docker-agent share push}}，推送 agent 配置到 OCI registry。录制将带 `filesystem` 和 `shell` 的 `files.yaml` 推到 `localhost:15000` 的 `registry:2` 容器：

```listing
title: 向本地 registry 推送一次
source: capture/out/24-share-push.txt
lang: text
---
$ docker-agent share push fixtures/agents/files.yaml localhost:15000/m101/agent:v1
Pushing agent $CAPTURE/fixtures/agents/files.yaml to localhost:15000/m101/agent:v1
Successfully pushed artifact to localhost:15000/m101/agent:v1
[exit 0]
```

registry 使用普通 HTTP，无需 insecure-registry 设置（capture/README.md）。catalog 列出 `m101/agent` 的 `v1` tag，以 `application/vnd.oci.image.manifest.v1+json` 提供（capture/out/24-registry.txt）。

## manifest {#s-share-push-and-share-pull-the-manifest}

```listing
title: m101/agent:v1 的 manifest
source: capture/out/24-manifest.json
lang: json
---
{
  "annotations": {
    "io.docker.agent.version": "v1.149.0",
    "io.docker.cagent.version": "v1.149.0",
    "org.opencontainers.image.created": "<ts>",
    "org.opencontainers.image.description": "OCI artifact containing files.yaml"
  },
  "artifactType": "application/vnd.docker.agent.config.v1+json",
  "config": {
    "mediaType": "application/vnd.docker.container.image.v1+json",
    "size": "<n>",
    "digest": "sha256:<digest>"
  },
  "layers": [
    {
      "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
      "size": "<n>",
      "digest": "sha256:<digest>"
    }
  ],
  "mediaType": "application/vnd.oci.image.manifest.v1+json",
  "schemaVersion": 2
}
```

**artifactType：** OCI manifest 中表明产物种类的字段。此处表示 Docker Agent config，config 和唯一层仍用 Docker 镜像 media type。`io.docker.agent.version` 记录推送程序版本；`io.docker.cagent.version` 重复它，因为 v1.23.3 重命名注解“while maintaining backward compatibility with the old annotation” {{rel-agent v1.23.3}}，同时兼容旧注解。

`instruction_file` 读取的文件随产物分发。推送时“the file contents are inlined into the pushed artifact, so the published agent stays self-contained” {{docs-agent Agent Configuration}}，文件内联使 agent 自包含。[图](#fig-6-4) 展示推送、manifest 与两条返回路径。

```figure
id: fig-6-4
kind: structure
title: agent 文件作为 OCI 产物
claim: share push 将 files.yaml 存为带四项注解的 OCI manifest；share pull 与 run 用同一引用读回。
caption: 顶行从左到右，再从上向下读 manifest 字段。紫色是 agent 文件与 docker-agent 写的注解，灰色是 registry 与 manifest 字段。虚线框为未录制的 --key 证明。来源为 capture/out/24-share-push.txt、24-registry.txt、24-manifest.json、24-share-pull.txt 和 24-run-ref.txt。
```

## --key 与 --encrypt {#s-share-push-and-share-pull-key-and-encrypt}

录制推送没有 `--key`，manifest 无证明。此 flag 于 v1.132.0 新增 {{rel-agent v1.132.0}}，接受内联密钥或 `file://` 路径 {{help-agent docker-agent share push}}。带 `--key` 时证明写进 manifest 注解；“the YAML itself is always pushed in clear” {{help-agent docker-agent share push}}，YAML 自身始终明文推送。PEM 或 OpenSSH 密钥（Ed25519、ECDSA、RSA）记录签名；其他值是至少16字节的对称密钥，记录 MAC {{help-agent docker-agent share push}}。

`--encrypt` 还嵌入完整 YAML 加密副本；Ed25519 不能加密 {{help-agent docker-agent share push}}。自 v1.138.1 签名覆盖“a DSSE-wrapped in-toto statement instead of raw YAML bytes” {{rel-agent v1.138.1}}，即 DSSE 包装的 in-toto 声明而非原始 YAML 字节。帮助与录制都没命名证明注解，所以不列出。

另一端 `share pull --key` 检查签名或 MAC，或解密副本比较。“The pull fails if the artifact is unprotected or the check does not pass” {{help-agent docker-agent share pull}}，未保护或检查未通过都拉取失败。两条命令均可读 `DOCKER_AGENT_ENCRYPT_KEY` 代替 flag。

## 拉取与按引用运行 {#s-share-push-and-share-pull-pull-and-run-by-reference}

```listing
title: 拉取到当前目录
source: capture/out/24-share-pull.txt
lang: text
---
$ docker-agent share pull localhost:15000/m101/agent:v1 --force  (in work/)
Pulling agent localhost:15000/m101/agent:v1
Agent saved to localhost:15000_m101_agent:v1.yaml
[exit 0]
```

`share pull` 按引用命名文件，`/` 换为 `_`；`--force` 覆盖旧副本。拉回 YAML 与推送的 `files.yaml` 逐字节相同（capture/out/24-share-pull-agent.yaml）。`run` 用引用代替路径，重放从 registry 副本回答：

```listing
title: 直接按引用运行
source: capture/out/24-run-ref.txt
lang: text
note: 命令行在引用后截断。
---
$ docker-agent run --exec --last --working-dir fixtures/repo --fake work/cassettes/18-files localhost:15000/m101/agent:v1 …
README.md has 1 line.
[exit 0]
```

引用也可用于 `sub_agents`。“Tag references are checked against the registry on every `docker agent run`” {{docs-agent Agent Distribution}}，每次都查 registry，所以应固定 digest，如 `myorg/agent@sha256:…`，从缓存启动。`serve api --pull-interval N` 每 N 分钟重新拉取 {{help-agent docker-agent serve api}}。本地工作时 `run` 还接受文件的普通 `http://localhost` URL，无需 registry {{docs-agent Agent Distribution}}。

私有仓库先 `docker login`。Docker Agent 仅为 `docker.com` 下 HTTPS URL 自行转发 Docker token，`docker.io` 不属于此范围 {{docs-agent Agent Distribution}}，所以私有 Hub 仓库需 `docker login docker.io`。旧材料指向 Hub 的 `agentcatalog` namespace，v1.116.0 移除了对“discontinued `agentcatalog` Docker Hub namespace” {{rel-agent v1.116.0}} 的引用，即已停用的命名空间。

```takeaways
- 他人会运行的 agent 推送时加 `--key`。
- 拉取用匹配 `--key`，让未保护产物失败。
- registry 子 agent 固定 digest，便于重复启动。
- 读 `io.docker.agent.version` 确认推送版本。
```

Sources: help-agent docker-agent share push, share pull, serve api (research/sources/help-docker-agent.md); docs-agent Agent Configuration, Agent Distribution (research/sources/docs-docker-agent.md); rel-agent v1.23.3, v1.116.0, v1.132.0, v1.138.1 (research/sources/docker-agent-CHANGELOG.md); research/plan.md, Part 6; capture/README.md; capture/fixtures/agents/files.yaml; capture/out/24-share-push.txt, 24-registry.txt, 24-manifest.json, 24-share-pull.txt, 24-share-pull-agent.yaml, 24-run-ref.txt
