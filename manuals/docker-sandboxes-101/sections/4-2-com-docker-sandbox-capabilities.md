# `com.docker.sandbox/*` 能力

> kit 不能自行授权：能力有类型和版本，解析器合并一个 workload 与 mixin；更新扩大权限时必须停下请求批准。

同事发布的 `gh` mixin 用你的 token 访问 `api.github.com`。你想知道它到底能发哪些请求，以及第2版到来时会改变什么。答案都在 `capabilities` 列表。

读完本节，你能解读列表、预测合并授权集合，并指出哪些更新会停下询问。

## 有类型、有版本的请求 {#s-com-docker-sandbox-capabilities-typed-versioned-requests}

**能力：** kit 的 `capabilities` 列表中的类型化请求，“Everything the Kit needs but cannot supply itself” {{kitspec §7}}，即 kit 需要却无法自己提供的内容。宿主逐项授予、拒绝或询问。

各条目含 `<namespace>/<name>@<version>` 形式的 `type`、可选展示 `name` 和 `optional` 标志 {{kitspec §7}}。规范定义的类型严格解码 `config`，未知键报错 {{kitspec §7}}。版本指定 config schema，因此 `network-policy@1` 与 `@2` 都存在，描述文件声明其一 {{kitspec §7.1}}。“Policy-shaped types are singletons” {{kitspec §7.1}}，策略类类型是单例；实例类按请求对象重复，如 `credential@1` 每服务、每阶段一项。

设计允许未知类型：“An unknown type is the extension point working as designed” {{kitspec §7.3}}，未知类型正是扩展点。必需未知类型导致解析失败，可选未知类型则跳过并记录。

## 固定版本的十九种类型 {#s-com-docker-sandbox-capabilities-the-nineteen-types-at-the-pin}

| 类型 | 形态 | 请求内容 |
|---|---|---|
| `network-policy@1` | 单例 | 按阶段指定可访问主机 |
| `network-policy@2` | 单例，与 `@1` 互斥 | 主机及 HTTP 方法、路径 |
| `credential@1` | 每服务、每阶段 | workload 认证的服务 |
| `ssh-agent@1` | 每阶段 | 转发 SSH agent 可签名的内容 |
| `volume@1` | 每路径 | 持久存储或 tmpfs |
| `host-mount@1` | 每路径 | 宿主目录，与 `volume@1` 共享存储键 |
| `port@1` | 每容器端口、每传输协议 | 发布端口 |
| `usb-device@1` | 实例 | USB 设备匹配 |
| `resources@1` | 单例 | CPU、内存与 GPU 限制，是约束而非授权 |
| `privileged@1` | 单例，无 config | 特权容器 |
| `long-running@1` | 单例，无 config | 无连接会话时仍持续运行 |
| `lifecycle@1` | 单例 | 安装 hooks、启动 hooks、文件和交互 argv |
| `agent-context@1` | 单例 | agent 指令文件 |
| `agent-sessions@1` | 单例 | 无界面 prompt 与恢复命令 |
| `agent-skills@1` | 每路径 | agent 读取 skills 的位置 |
| `agent-skill@1` | 每有效名称 | 一个随包 skill |
| `git-identity@1` | 单例，无 config | 运行时 git 名称与邮箱 |
| `kit-registry@1` | 单例，无 config | 访问运行时用于构建推送、拉取的 kit registry |
| `sbx@1` | 单例，无 config | 按特定方式及镜像声明身份启动 workload |

表格来自 `v3.0.0-m.8` tag 的 `kitspec §7.2`。main 分支增加第二十种单例 `com.docker.sandbox/agent-interactive-sessions@1` {{kitspec-main §7.2}}，固定版本时未发布。sbx 最新类型随固定版本到来：“Kits can declare `com.docker.sandbox/long-running@1` to keep local sandboxes running after all sessions disconnect” {{rel-sbx v0.47.0}}，可声明此能力让全部会话断开后本地沙箱仍运行。

## network-policy@2 与 credential@1 {#s-com-docker-sandbox-capabilities-network-policy-2-and-credential-1}

`network-policy@2` 条目是普通主机字符串，或含 `hosts`、`methods` 和 `paths` 的对象 {{kitcap network-policy@2}}。主机字符串像 `@1` 一样允许任意协议连接。带 `methods` 或 `paths` 的条目有界，只允许指定 HTTP 请求，不放行该主机的其他请求。拒绝项为“Entries to refuse. Deny wins” {{kitcap network-policy@2}}，拒绝优先。运行时“MUST answer a request these entries refuse with HTTP status `403`” {{kitcap network-policy@2}}，必须以403应答。执行代理见[策略日志一节](#s-sbx-policy-log-and-the-proxy)。

`credential@1` 指定 `service` 和 `phase`，“never where the secret lives” {{kitcap credential@1}}，不指定密钥存储位置。使用 `apiKey.proxyManaged` 时，“The real value stays on the host” {{kitcap credential@1}}，真实值留在宿主。每个 `inject` 域名必须出现在同阶段允许列表 {{kitcap credential@1}}。对应绑定由[密钥一节](#s-sbx-secret-set-import-and-set-custom) 存储。

## 解析与合并集合 {#s-com-docker-sandbox-capabilities-resolution-and-the-merged-set}

运行时“MUST include exactly one `workload` Kit per composition” {{kitspec §5.3}}，每组合恰有一个 workload；“MUST fail when two Kits provide the same normalized name” {{kitspec §5.3}}，两个 kit 提供同一规范化名称必须失败，因此 `claude` 加 `claude-mixin` 被拒绝。集合中按阶段合并允许与拒绝条目，结果拒绝优先 {{kitcap network-policy@2}}。一个 kit 完全允许主机时，另一 kit 对该主机的有界条目被丢弃，因为并集是无界授权 {{kitspec §9.5}}。[图](#fig-4-2) 对三个 kit 演示此运算。

```figure
id: fig-4-2
kind: tree
title: 三个 kit 解析为一个授权集合
claim: 一个 workload 与两个 mixin 合并授权：允许取并集、拒绝优先；下一版本移除拒绝会停下请求批准。
caption: 从上向下读。三个 kit 是录制的 hello-kit、kitspec §2 的 gh 示例及能力页的 network-policy@2 config 示例。青绿色块是锁定记录。来源为 capture/fixtures/kits/hello-kit/kit.yaml、kitspec §5.3、§7.4、§9.5 和 kitcap 页面。
```

## sbx 内的授权形态 {#s-com-docker-sandbox-capabilities-what-a-grant-looks-like-inside-sbx}

录制宿主运行 v2 mixin，因此行来自 `permissions.network.allow`，不是 v3 条目。守护进程将授权存为沙箱拥有者不能编辑的策略规则：

```listing
title: m101-kit 上 kit 的允许规则
source: capture/out/12-policy-kit.json
lang: json
note: rules 数组只有一项，仅保留正文提到的字段。
---
      "name": "kit:m101-kit",
…
      "scope": "sandbox:m101-kit",
…
      "resource_type": "network",
      "decision": "allow",
      "resources": [
        "example.com"
      ],
…
      "editable": false,
…
        "created_via": "provisioned",
```

随后 `sbx policy check network example.com --sandbox m101-kit --json` 返回 `"allowed": true`（`capture/out/12-check-kit.json`）。规则带 `created_via: provisioned`，可由 `--source kit` 查询；[策略一节](#s-sbx-policy-init-allow-deny-and-check-network) 据此区分 kit 规则与手动添加规则。

## 更新与锁定记录 {#s-com-docker-sandbox-capabilities-updates-and-the-lock}

各授权投影到规范化集合：“Consumers that gate updates store a Kit's surface in the lock and diff a candidate's against it” {{kitspec §7.4}}，管控更新的消费者在锁定记录中保存 kit 权限面，并与候选比较。新版本集合不超出已存集合可静默应用；任何扩权必须请求批准。具体包括新增允许、“a removed deny entry (the deny was part of what made the grant acceptable)” {{kitspec §7.4}}（移除原本使授权可接受的拒绝），新增凭据、路径、端口，或将只读 skills 路径改为可写。`optional` 不改变集合 {{kitspec §7.4}}。六种类型不贡献权限面：`resources@1`、`lifecycle@1`、`agent-context@1`、`agent-sessions@1`、`sbx@1` 和 `long-running@1` {{kitspec §7.4}}。

```takeaways
- 运行前读 kit 的 `capabilities`，逐项视为由你回应的请求。
- kit 之间允许取并集；不希望其他 kit 扩大主机权限时写 `deny`。
- 审查所有新增允许、凭据、路径、端口或移除拒绝的更新。
```

Sources: kitspec §5.3, §7, §7.1, §7.2, §7.3, §7.4, §9.5 (research/sources/SPEC-v3-at-v3.0.0-m.8.md); kitspec-main §7.2 (research/sources/SPEC-v3.md, unreleased); kitcap network-policy@2, credential@1 (research/sources/kit-capabilities.md); rel-sbx v0.47.0 (research/sources/sbx-releases.md); capture/fixtures/kits/hello-kit/kit.yaml; capture/out/12-policy-kit.json, 12-policy-kit.txt, 12-check-kit.json
