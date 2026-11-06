---
id: team-sandbox-policy-take-home
title: 六名工程师、一个代码仓库与一套可审查的沙箱配置
card: sandboxes
kind: take-home
level: 4
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [take-home, system-design]
tags: [sandbox, network-policy, kit, environment-file, secrets, take-home]
minutes: 60
lessons: []
manuals: [docker-sandboxes-101#s-sbx-policy-init-allow-deny-and-check-network, docker-sandboxes-101#s-sbx-policy-log-and-the-proxy, docker-sandboxes-101#s-com-docker-sandbox-capabilities, docker-sandboxes-101#s-sbxenv-yaml-and-sbx-env-plan, docker-sandboxes-101#s-clone-and-run-sandbox-source, docker-sandboxes-101#s-sbx-secret-set-import-and-set-custom]
practice: []
cheatsheet: [docker-sandboxes, sandbox-policy]
related: [sandboxes/deny-wins-and-the-two-scopes, sandboxes/kit-grants-union-and-widen, sandboxes/clone-mode-and-the-hidden-hook]
updated: 2026-11-03
---

课后大作业。六名工程师针对同一个代码仓库运行编程 agent。具体需求：agent 可以访问依赖包注册中心以及一个内部 API，且针对该 API 仅允许 `GET` 和 `POST`，不得 `DELETE`；agent 不能修改宿主机代码仓库中的 Git 钩子或脚本；存在一个共享的模型服务商密钥且从不进入虚拟机内部；新加入的贡献者只需拉取已提交的受版本控制文件即可获得完全一致的环境，并在执行任何操作前能够预先查看执行计划；且事后 agent 访问过的每个网络主机都必须有据可查。交付策略选型、工具包设计、环境声明文件、机密凭据处理方案、随付测试集以及评审人员应审查的实证材料。

## Short answer

初始化单套全局预设，并在信任前将 `sbx policy ls --wide --json` 归档。将团队共享主机放入工具包的 `network-policy@2` 中作为包含 `hosts` 和 `methods` 的受限条目，并附加 `DELETE` 拒绝规则，使授权跟随工具包引用分发且标记为 `created_via: provisioned`，避免六台笔记本各自维护本地放行规则。通过环境声明文件中的工作区对象启用克隆模式以使宿主机仓库只读挂载，使用 `sbx secret set` 存储密钥并由 `credential@1` 绑定以使虚拟机内部仅见 `proxy-managed` 占位符，并将 `sbxenv.yaml` 提交入版本控制，以 `sbx env plan` 作为准入安全门控。通过 `check network --json` 验证放行主机、显式拒绝主机和未匹配主机，并从虚拟机内部发起真实请求以检验 HTTP 方法规则，最后交付环境执行计划、策略清单、检查结果以及 `policy log` 日志记录。

## Full answer

### 策略预设选型

`policy init` 用于一次性初始化全局首条基线策略。`deny-all` 会让每个未匹配的主机变成需要人工确认的审批请求；而 `balanced` 自带长长的默认放行列表，且该列表在版本升级间缺乏更新日志。无论选用哪种预设，记录了工具版本号与日期的归档清单都是交付材料的组成部分。团队共享规则应封装在工具包中而非直接写入全局策略，因为工具包规则跟随引用分发，且沙箱所有者无法单方面篡改编辑它。在组织集中治理下，本地与工具包的放行规则均失效，因此注册中心与 API 主机届时还需要补充组织放行规则。

### 工具包设计（Kit）

定义一个 `network-policy@2` 能力，包含面向依赖包注册中心的主机字符串，以及面向内部 API 的受限结构化对象：指定 `hosts`、`methods: [GET, POST]`，并配置针对 `DELETE` 的拒绝条目。受限条目仅允许针对该主机的指定请求，拒绝条目在并集计算中拥有绝对优先权，运行时对被拒绝请求直接返回 HTTP 状态码 `403`。为模型服务商添加 `credential@1` 并配置 `apiKey.proxyManaged`，注意每个注入域名必须显式出现在同一阶段的放行列表中。使用 `docker-container` 构建器完成构建并锁定其 digest 哈希。

### 环境声明文件

`sbxenv.yaml` 声明 `name`、`agent`、作为 `source` 或引用的工具包、对象结构形式的工作空间配置（以开启克隆模式）、`secrets` 机密声明、`bindings` 绑定关系，以及可选的 `ports`。该环境文件在沙箱内部被只读绑定，因为允许 Agent 篡改环境文件就等于允许其擅自篡改下一次执行计划所审查的内容。避免使用 `lifecycle` 宿主机钩子命令（除非能够承受其代价）：它们直接以宿主机用户权限在外部执行，且包含任何此类命令的环境在每次执行时都会强制弹窗询问。

### 机密凭据处理

密钥通过 `sbx secret set` 录入，作用域设为全局或单沙箱，Agent 内部仅能看到占位符。切勿使用 `-e`，也别在环境文件中配置 `env:`。环境执行计划若将机密明文显示为其 SHA-256 哈希值，正是其被误放到了错误位置的明显提示。

### 随付测试集

1. `sbx policy check network --sandbox NAME <registry>:443 --json` 返回 `allowed: true`；内部 API 主机同样返回 true；无关主机返回 `deny_kind: implicit`，而主动配置了拒绝的主机返回 `explicit` 及其规则 ID。
2. 从沙箱内部发起真实的 `DELETE` 请求，收到包含代理错误正文的 `403`，因为 `check network` 与 `policy log` 均不对请求方法或路径求值。
3. 在全新克隆的代码库上执行 `sbx env plan` 仅输出 `+` 新增行，且仅在你保留了 `lifecycle` 代码块时输出宿主机命令告警；在修改单个参数后执行计划应输出一条 `~` 变更行。
4. 从沙箱内部向 `origin` 执行 `git push` 失败，而在宿主机上执行 `git fetch sandbox-<name>` 能够正常拉取该提交。
5. 沙箱内部执行 `env | grep -c proxy-managed` 返回非零结果，且你所受控的测试接收端仅在与该机密绑定的目标主机上抓取到真实密钥。

### 应交付的实证材料

环境执行计划输出、带有版本与日期的策略清单、工具包描述符及其 digest、三份 `check network` 的 JSON 测试结果、`403` 拦截转储记录，以及包含访问过的每个主机的 `proxy_type` 与 `rule` 的 `policy log --json` 日志行。

## Follow-ups

- **Level 3:** 为什么不让每位工程师各自执行 `sbx policy allow network` 添加这两个主机？ Expected: 六份本地配置会发生漂移且容易被篡改；工具包规则跟随引用版本化分发且标记为不可编辑。集中治理下两者均失效，唯有组织放行有效。
- **Level 4:** 当 check 命令无法识别方法时，你如何证明 HTTP 方法规则确实生效？ Expected: 从沙箱内部发起真实网络请求并预期收到代理返回的 `403`；策略日志只记录主机和计数。
- **Level 4:** 贡献者的执行计划输出了带有 `!` 标记的行，代表什么？ Expected: 该资源在先前已应用的环境中存在但在新配置文件中已不再声明；需在应用前先行确认。
- **Level 4:** 环境文件中保留了 `lifecycle` 块，你该向团队提示什么？ Expected: 它以当前用户权限直接运行在宿主机上，每次调用均强制弹窗，批准它等于盲目信任该脚本，且可用 `--skip-host-commands` 做空跑审查。

## Wrong answers

- "放行 `**` 并单纯依赖克隆挂载。" `**` 意味着放行所有主机；外发白名单失去意义。
- "将密钥配置在 `env:` 字段下以便大家共享。" 这会使密钥以明文变量形式暴露在虚拟机及后续保存的模板中；必须使用 `secrets` 并由代理注入。
- "将仓库以 `:ro` 挂载以保护 Git 钩子。" Agent 本身也无法执行 commit 提交；克隆模式赋予其可写的独立克隆同时将宿主机保持为只读。

## Taught in

[策略章节](../../../manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md)与[代理章节](../../../manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md)给出了规则与日志，[能力章节](../../../manuals/docker-sandboxes-101/sections/4-2-com-docker-sandbox-capabilities.md)给出了受限条目，[环境文件章节](../../../manuals/docker-sandboxes-101/sections/4-4-sbxenv-yaml-and-sbx-env-plan.md)给出了计划，而[克隆](../../../manuals/docker-sandboxes-101/sections/3-2-clone-and-run-sandbox-source.md)与[机密](../../../manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md)章节满足了另外两项需求。
