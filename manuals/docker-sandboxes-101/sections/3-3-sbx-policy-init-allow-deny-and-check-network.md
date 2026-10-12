# sbx policy init、allow network、deny network 与 check network

> 全局预设及两个作用域的允许和拒绝规则决定每次连接，拒绝优先；`check network` 查询同一授权器，但不发送请求。

agent 报告 `npm install` 因连接错误失败，沙箱又没留 shell 历史解释原因。问题是哪条规则作了决定。`sbx policy` 分两步回答：`ls` 查看现有规则，`check network` 查询某主机会得到的决定。

读完本节，你能初始化策略，在合适作用域加规则，并预测任意主机的决定。

## 预设与全局策略 {#s-sbx-policy-init-allow-deny-and-check-network-the-preset-and-the-global-policy}

**policy init：** 设置“the initial global policy, not a per-sandbox default” {{help-sbx sbx policy init}}，即初始全局策略，而非每沙箱默认值。首次沙箱前只执行一次，选择 `allow-all`、`balanced` 或 `deny-all`；用 `sbx policy reset` 或 `sbx daemon start --policy` 重置 {{help-sbx sbx daemon start}}。录制宿主在 v0.47.0 选择 `balanced`，`sbx policy ls` 显示策略 `local-policy`，含 `network: 194 allow`（capture/out/03-policy-ls.txt）。完整 JSON 有八条 `created_via: default` 规则：六个网络组和两个允许所有路径的文件系统规则。此清单跨版本会变，却没有 changelog（[冲突 C23](#s-ref-sources-and-the-conflicts-register)）；以下是 2026-10-08 的录制清单：

```listing
title: balanced 六个网络组中的两个
source: capture/out/03-policy-balanced.json
lang: json
note: 每组仅保留最初几个资源，其余截去。其他组为 default-code-and-containers、default-os-packages、default-cloud-infrastructure 和 default-cert-validation。
---
      "id": "default-ai-services",
      "name": "default-ai-services",
      "policy_id": "local-policy",
      "scope": "global",
      "applies_to": "all",
      "resource_type": "network",
      "decision": "allow",
      "resources": [
        "api.anthropic.com:443",
        "statsig.anthropic.com:443",
        "platform.claude.com:443",
…
        "**.openai.com:443",
…
      "id": "default-package-managers",
…
        "registry.npmjs.org:443",
…
        "pypi.org:443",
…
      "provenance": {
        "created_via": "default"
      },
      "actions": [
        "net:connect:tcp"
      ]
```

## 规则语法与作用域 {#s-sbx-policy-init-allow-deny-and-check-network-rule-grammar-and-scope}

**允许规则：** 逗号分隔的“of hostnames, domains, IP addresses, or CIDR prefixes” {{help-sbx sbx policy allow network}}，即主机名、域名、IP 地址或 CIDR 前缀。形式包括 `example.com`、`*.example.com`、`**.example.com`、`api?.example.com`、`api[12].example.com`、`example.com:443`、`[2001:db8::1]:443`、CIDR，以及代表全部主机的 `**`。单独 `*` 和转义 glob 被拒绝 {{help-sbx sbx policy allow network}}。允许默认覆盖 TCP，除非指定 `--protocol`；拒绝覆盖 TCP 和 UDP {{help-sbx sbx policy deny network}}。录制允许返回 `(example.com [tcp])`，拒绝返回 `(example.com [tcp,udp])`（capture/out/09-allow.txt、09-deny.txt）。拒绝还警告，开启 `feature.udp-egress` 前 UDP 出站仍禁用。

自 v0.29.0 起有两个作用域（[冲突 C41](#s-ref-sources-and-the-conflicts-register)）：默认 global，以及用 `--sandbox` 限定单个沙箱的 `local` {{help-sbx sbx policy allow network}}。`--sandbox m101-policy` 添加规则后输出 `Rule added to policy local (scope: sandbox:m101-policy): <uuid>`；`sbx policy inspect` 展示其作用域、层、来源与溯源信息：

```listing
title: 沙箱作用域的允许规则
source: capture/out/09-inspect-rule.json
lang: json
note: 外层 policy 对象与 remove_command 字段已截去。
---
      "id": "<uuid>",
      "name": "<uuid>",
      "policy_id": "<uuid>",
      "scope": "sandbox:m101-policy",
      "applies_to": "sandbox:m101-policy",
      "resource_type": "network",
      "decision": "allow",
      "resources": [
        "example.com"
      ],
      "origin": "scoped",
      "layer": "local",
      "status": "active",
      "editable": true,
      "sandbox_id": "m101-policy",
      "provenance": {
        "created_via": "added"
      },
      "actions": [
        "net:connect:tcp"
      ]
```

`create` 或 `run` 的 `--deny-network HOST` 在创建时添加同类沙箱级拒绝。帮助解释其治理安全性：“a local deny can only narrow, never widen, egress” {{help-sbx sbx create}}，本地拒绝只能收窄出站权限。kit 添加 `created_via: provisioned` 规则；录制宿主的 `sbx policy ls --source org` 输出 `No policies match the selected filters.`（capture/out/03-policy-org.txt）。

**拒绝优先：** “Deny rules take precedence over allow rules for the same hostname or CIDR. An allowed hostname isn't checked against CIDR rules for its resolved IP address.” {{help-sbx sbx policy deny network}} 同一主机名或 CIDR 的拒绝高于允许；已允许的主机名不会再用其解析 IP 检查 CIDR 规则。

CLI 拒绝同作用域中与允许冲突的拒绝：`deny: "example.com" conflicts with existing allow rule "<uuid>"`（capture/out/09-deny-conflict.txt）。录制先用 `sbx policy rm network --sandbox m101-policy --id <uuid> --force` 删除允许，拒绝才被接受。组织治理下，只有组织允许规则能授予访问，本地和 kit 拒绝仍生效 {{docs-sbx Precedence}}；[组织策略](#s-org-policies-profiles-and-the-audit-log) 展示此表。

`policy ls` 支持 `--source local|org|kit`、`--decision`、`--type`、`--created-via default|added|provisioned|approval`、`--protocol`、显示 `RULE_ID` 的 `--wide` 及 `--json` {{help-sbx sbx policy ls}}。宽行含 `METHOD` 和 `PATH` 列，文档用 `--method` 和 `--path` 填它们。但 v0.47.0 的 `sbx policy allow network` 帮助没有这两个 flags，所以本手册把本地 HTTP 规则标为未验证。[代理一节](#s-sbx-policy-log-and-the-proxy) 再讨论。

## check network {#s-sbx-policy-init-allow-deny-and-check-network-check-network}

**policy check network：** 只读调用，“evaluates the same daemon-side policy authorizer used by sandbox network enforcement” {{help-sbx sbx policy check}}，使用沙箱网络执行所用的同一守护进程授权器。没有端口的主机按443求值；命令“evaluates network authorization, not HTTP method or path” {{help-sbx sbx policy check network}}，只评估网络授权，不评估 HTTP 方法或路径。拒绝时退出码1。录制在 `m101-policy` 上分别于无规则、允许后、拒绝后查询 `example.com`：

```listing
title: 拒绝规则后的显式拒绝
source: capture/out/09-check-deny.json
lang: json
note: 09-check-verbose.json 中的隐式拒绝具有 deny_kind implicit，没有 origin 和 rule，原因是 No matching allow rule (default deny)。
---
{
  "action": "net:connect:tcp",
  "allowed": false,
  "context": "sandbox:m101-policy",
  "deny_kind": "explicit",
  "governance": {
    "active": false
  },
  "origin": "local",
  "reason": "Denied by local rule",
  "resource_type": "net:domain",
  "resource_value": "example.com:443",
  "rule": "local:<uuid>",
  "target": "example.com:443",
  "type": "network"
}
```

添加允许后，同一调用返回 `"allowed": true`，没有 `rule` 字段（capture/out/09-check-allowed.json）。全局查询 `api.anthropic.com` 在 `"context": "global"` 下同样如此（capture/out/03-policy-check-anthropic.json）。两种拒绝的 `deny_kind` 不同：`implicit` 不指定规则，`explicit` 指定 `local:<uuid>`。沙箱也会把隐式拒绝转为批准请求，下一节会展示。[图](#fig-3-3) 按相同顺序判断请求。

```figure
id: fig-3-3
kind: decision
title: example.com:443 请求如何得到决定
claim: 匹配拒绝立即结束判断；任一有效作用域的允许可放行主机；无匹配请求被隐式拒绝。
caption: 从上向下读。左侧框是授权器的问题，右侧框是录制答案。玫红虚线表示拒绝。来源为 capture/out/09-check-deny.json、09-check-allowed.json、03-policy-check-anthropic.json、09-check-verbose.json 和 09-blocked.txt。
```

```takeaways
- `sbx policy init balanced` 只执行一次；相信清单前先读 `sbx policy ls --wide --json`。
- 用 `--sandbox` 加窄范围规则，全局规则留给每个 agent 都需要的主机。
- 同作用域、同主机添加拒绝前，先删除允许。
- 用 `sbx policy check network --sandbox NAME host:port --json` 检查，读 `deny_kind` 和 `rule`。
```

Sources: help-sbx sbx policy init, sbx daemon start, sbx policy allow network, sbx policy deny network, sbx policy ls, sbx policy inspect, sbx policy rm network, sbx policy check, sbx policy check network, sbx create (research/sources/help-sbx.md); docs-sbx Policy concepts, Local policy, Monitoring policies (research/sources/docs-sandboxes.md); research/conflicts-register.md rows C23, C41; capture/out/03-policy-init.txt, 03-policy-ls.txt, 03-policy-org.txt, 03-policy-balanced.json, 03-policy-check-anthropic.json, 09-allow.txt, 09-deny.txt, 09-deny-conflict.txt, 09-inspect-rule.json, 09-rm-allow.txt, 09-check-verbose.json, 09-check-allowed.json, 09-check-deny.json, 12-policy-kit.txt
