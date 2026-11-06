---
id: kit-grants-union-and-widen
title: 两个混入组件、一个主机与必须阻止的升级
card: sandboxes
kind: design
level: 3
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [system-design, design-review]
tags: [sandbox, kit, capabilities, network-policy, supply-chain]
minutes: 10
lessons: []
manuals: [docker-sandboxes-101#s-com-docker-sandbox-capabilities, docker-sandboxes-101#s-syntax-docker-sandbox-kit-3-and-kit-yaml, docker-sandboxes-101#s-sbx-kit-pack-push-sign-and-verify]
practice: []
cheatsheet: [docker-sandboxes, sandbox-policy]
related: [sandboxes/deny-wins-and-the-two-scopes, protocols/descriptor-pin-rug-pull]
updated: 2026-11-03
---

你的组合配置包含一个 workload 工作负载与两个 mixin 混入组件。混入组件 A 无条件放行了 `api.example.com`。混入组件 B 仅放行了 `api.example.com` 的 `methods: [GET]`，且明确拒绝了对它的 `DELETE`。下周混入组件 A 发布了一个新版本，移除了其自身的一条拒绝规则并新增了一个 `credential@1` 凭据申请。预测合并后的授权集合、指出哪些更新可以静默应用，并设计安全审查流程。

## Short answer

放行（allow）条目按阶段取并集，拒绝（deny）条目按阶段取并集，且最终结果中拒绝规则优先。A 的无限制主机放行规则会吞没 B 的受限 `GET` 条目，因为无限制授权与受限授权取并集的结果就是无限制授权，而 B 声明的 `DELETE` 拒绝规则依然存留并胜出。每项授权都会映射到使用方保存在锁定文件中的规范化集合中，候选版本的授权集合只要是已存储集合的子集，就可以静默应用；任何出现权限拓宽的变更都必须挂起等待人工批准，而移除已有拒绝规则与新增凭据申请均属于权限拓宽列表，因此 A 的新版本会被挂起阻断两次。

## Full answer

### 何为能力（Capability）

工具包（kit）自身无法擅自赋予任何权限。`capabilities` 中的每个条目都是一个强类型、带版本的权限请求，格式为 `<namespace>/<name>@<version>`，宿主机据此应答授予、拒绝或挂起询问。配置字段 `config` 会针对规范定义的类型执行严格解码，任何未知键都会导致解析报错，其原因关乎安全策略：若解析器静默忽略了一个拼写错误的键，该策略就会在没有任何警告的情况下隐蔽缺失。系统在设计上允许出现未知的能力类型；未知的必选类型会导致解析失败，而未知的可选类型会被静默跳过并记录。

### network-policy@2 与 credential@1

`network-policy@2` 条目既可以是一个普通的主机名字符串（允许该主机针对任何协议的连接），也可以是一个包含 `hosts`、`methods` 和 `paths` 的结构化对象（仅允许该主机上的这些特定 HTTP 请求）。拒绝条目列出必须被拒绝的操作，运行时对被拒绝的请求直接返回 HTTP 状态码 `403`。`credential@1` 条目指明了 `service` 和 `phase`，从不指明密钥实际存放的具体位置，且每个 `inject` 注入域名必须显式出现在同一阶段的放行列表中。

### 解析合并过程

一个组合配置中必须且只能有一个 `workload`，两个提供了相同规范化名称的工具包会导致冲突解析失败。在 `sbx` 内部，该授权转化为一条标记为 `created_via: provisioned` 且 `editable: false` 的策略规则，可通过 `--source kit` 列出，且 `check network` 对其返回 `allowed: true`。

### 版本更新与锁定文件

被定义为“权限拓宽”（widening）的操作具有显式的清单：新增放行条目、移除已有拒绝条目、新增凭据、新增路径或端口，以及在原本只读的技能路径上请求写入权限。移除拒绝条目算作权限拓宽，是因为该拒绝规则原本正是使得该授权可被接受的关键前提。标记为 `optional` 并不会改变该授权集合。有六种类型不向该集合添加任何内容：`resources@1`、`lifecycle@1`、`agent-context@1`、`agent-sessions@1`、`sbx@1` 以及 `long-running@1`。

### 安全审查设计流程

1. 使用 `docker-container` 构建器构建，因为默认驱动程序会丢失描述符注解（descriptor annotation），而缺乏该注解的镜像对任何使用方而言均无法被识别为合法工具包。
2. 按 digest 哈希锁定每个工具包并持久化其规范化授权集合；针对每个候选版本比对该集合的 diff 差异。
3. 强制校验签名：在启用 `kit.requireSignature` 之前必须先配置 `kit.trustedSigners`，否则只有供应商自身的签名身份能够通过。
4. 由 diff 差异做出自动化裁决：属于已有子集的更新直接静默应用，出现权限拓宽的更新立即生成工单并指名新增项，且移除拒绝规则无条件视为权限拓宽。

## Follow-ups

- **Level 3:** 为什么严格解码器将未知键视为错误而非警告？ Expected: 静默忽略的键会导致本应生效的安全策略在无人知晓的情况下直接失效。
- **Level 3:** 你希望保持 B 的仅限 `GET` 权限，你该如何修改？ Expected: 移除 A 的无限制放行规则，或在 B 中为其他 HTTP 方法增加拒绝条目，因为拒绝规则优先，而受限放行会被无限制放行直接吞没。
- **Level 4:** 哪些能力类型在更新时从不触发审批流程，为什么这在安全上是可行的？ Expected: 六类约束和启动类型，因为它们不向宿主机请求任何资源。
- **Level 4:** 发布的工具包在其索引（index）上未展示描述符注解，发生了什么，使用方该如何处理？ Expected: 默认构建器丢弃了它；使用方若在索引上未找到注解会尝试读取平台清单（platform manifest），若任何位置均无注解则判定其不是合法工具包。

## Wrong answers

- "当工具包规则重叠时，以最窄的授权为准。" 放行规则取并集；宽泛条目会直接吞没狭窄条目，唯有拒绝规则才能收窄。
- "配置 `optional: true` 会使该能力的引入变得安全。" 它仅改变能力缺失时是否导致解析失败，完全不改变实际授予的权限集合。
- "每次版本号升级都需要人工审批。" 只要候选版本的权限完全落在已锁定集合之内即可静默应用；锁定机制正是为了兼顾安全与低成本自动化。

## Taught in

[能力章节](../../../manuals/docker-sandboxes-101/sections/4-2-com-docker-sandbox-capabilities.md)给出了并集计算、拒绝优先与权限拓宽清单，[描述符章节](../../../manuals/docker-sandboxes-101/sections/4-1-syntax-docker-sandbox-kit-3-and-kit-yaml.md)展示了严格解码与丢弃注解现象，而[签名章节](../../../manuals/docker-sandboxes-101/sections/4-3-sbx-kit-pack-push-sign-and-verify.md)指明了签名者配置项。
