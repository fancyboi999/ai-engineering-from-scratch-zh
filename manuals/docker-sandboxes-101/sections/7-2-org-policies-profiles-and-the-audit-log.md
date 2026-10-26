# sbx policy ls --source org、--profile 与审计 JSONL

> 组织在 Docker Home 写策略，守护进程五分钟内拉取；本地规则只能收窄，每个决定写入轮转 JSONL。

安全团队问 agent 上周访问了哪些主机、谁允许、开发者能否扩大清单。单台笔记本用 `sbx policy log` 回答，公司范围则靠组织策略及审计日志。读完本节，你能说明组织策略如何改变开发机，并读取审计记录。

## 组织可设置什么 {#s-org-policies-profiles-and-the-audit-log-what-an-organization-can-set}

**组织策略：** 在 Docker Home 写入的命名规则集合，应用到组织或所选团队全部本地沙箱 {{docs-sbx Organization policies}}。有 Network access、Filesystem access、MCP access 三类。网络规则是带方法和路径模式的单个 HTTP 目标，或 TCP、UDP 或两者的 All traffic，决定为 Allow 或 Deny {{docs-sbx Organization policies}}。网络策略可要求批准，每个允许目标等待一次开发者确认。MCP 策略为 `MCP` namespace 的 Cedar，默认拒绝，`forbid` 高于所有 `permit` {{docs-sbx Policy concepts}}。组织最多100策略，每个250规则、400 KB {{docs-sbx Policy concepts}}。

变更五分钟内到开发机；`sbx policy reset` 强制拉取，代价是删除全部本地规则与已记录批准 {{docs-sbx Organization policies}}。网络规则对下一请求生效，文件系统规则只在创建时生效，MCP 注册规则对下一次 `sbx mcp add` 生效。登录强制约束在 macOS 管理 `com.docker.sbx` profile 的 `allowedOrgs`，Windows 的 `HKLM\SOFTWARE\Policies\Docker\SBX`，或 Linux `/etc/docker-sbx/config.json` {{docs-sbx Sign-in enforcement}}。`sbx login` 撤销其他账户凭据。所有这些属于独立付费 Docker AI Governance，本地使用仍免费 {{docs-sbx FAQ}}。

## 组织不能做什么 {#s-org-policies-profiles-and-the-audit-log-what-an-organization-cannot-do}

治理只收窄，不扩权。策略有效时，仅组织允许授予访问，各来源拒绝仍生效 {{docs-sbx Policy concepts}}。本地及 kit 允许不活跃；`--deny-network` 帮助也这样说：

```rule
label: 收窄规则
source: help-sbx sbx create --deny-network
---
此策略适用于集中治理，因为本地 deny 规则只能收窄出站访问，不能扩大访问范围。
```

引文释义：集中治理下这是安全的，因为本地拒绝只能收窄出站权限，不能扩大。

本地拒绝甚至优先于组织批准要求，请求被阻止，不显示提示 {{docs-sbx Policy concepts}}。

| 规则 | 组织治理下是否评估 |
|---|---|
| 组织允许 | 是 |
| 组织拒绝 | 是 |
| 本地允许 | 否 |
| 本地拒绝 | 是 |
| kit 定义允许 | 否 |
| kit 定义拒绝 | 是 |

治理仅覆盖本地沙箱，云沙箱使用自己的账户与沙箱策略，见[云端一节](#s-sbx-cloud-run-move-and-ttl) {{docs-sbx Governance}}。审计只存元数据，不存 prompt 内容、agent 输出或参数值 {{docs-sbx AI Governance Audit Logs}}。

## 此次录制没有组织 {#s-org-policies-profiles-and-the-audit-log-this-capture-has-no-organization}

```listing
title: 无治理机器上的组织过滤
source: capture/out/03-policy-org.txt
lang: text
note: 两条命令均按录制保留。第二条显示唯一的本地策略，无 STATUS 列，因为没有不活跃项。
---
$ sbx policy ls --source org
No policies match the selected filters.
[exit 0]

$ sbx policy ls --include-inactive
POLICY         SOURCE   APPLIES TO   SUMMARY
local-policy   local    all          network: 194 allow; filesystem read: 1 allow; filesystem write: 1 allow
[exit 0]
```

```listing
title: 远程治理没有 profile
source: capture/out/03-policy-profile-ls.txt
lang: json
note: 只保留 JSON 形式；文本形式输出 "No policy profiles found"。
---
{
  "profiles": [],
  "policy_rules_unavailable": false
}
```

没有 `Governance: Managed by <org>` 行，文档将它作为策略活跃测试 {{docs-sbx Local audit logs}}。录制每次 `policy check` 都报 `"governance": {"active": false}`（capture/out/09-check-verbose.json）。**Profile：** 命名组织策略组，开发者创建时用 `--profile` 指定，`sbx policy profile ls` 列出 {{help-sbx sbx policy profile ls}}。无规则匹配且机器无组织治理时，代理请求批准。403 正文提到 `sbx policy approval ls`（capture/out/09-blocked.txt），但 v0.47.0 帮助树未列它（[冲突 C16](#s-ref-sources-and-the-conflicts-register)）。

## 审计记录 {#s-org-policies-profiles-and-the-audit-log-the-audit-record}

**审计记录：** 每个策略决定或守护进程会话事件一个 JSON 对象，由守护进程而非 CLI 写入 {{docs-sbx Local audit logs}}，自 v0.32.0 起存在 {{rel-sbx v0.32.0}}。仅在强制组织策略下、有 AI Governance 许可的已登录用户才写。因此此次无记录，计划 K32 的目录列表未录制（[冲突 C37](#s-ref-sources-and-the-conflicts-register)）。文档示例的原因字符串与 `m101-policy` 的 `sbx policy log` 相同：

```listing
title: 策略日志的原因字符串
source: capture/out/09-policy-log.json
lang: json
note: 唯一 blocked_hosts 条目在 reason 后截断。
---
  "blocked_hosts": [
    {
      "host": "example.com:443",
      "vm_name": "m101-policy",
      "proxy_type": "forward",
      "rule": "no applicable policies for op(action=net:connect:tcp, resource=net:domain:example.com:443)",
      …
      "reason": "No matching allow rule (default deny)"
```

```listing
title: 文档示例审计记录中的拒绝连接
source: research/sources/docs-sandboxes.md
lang: json
note: Local audit logs 页的示例，仅保留正文提到字段；用户、组织与会话字段已截去。
---
{
  "audit_event_id": "95e7257f-93c9-4f29-bde7-88830e2dae80",
  "timestamp": "2026-05-28T19:15:00.728933Z",
  "schema_version": "1.82.0",
  "category": "AUDIT_CATEGORY_EVALUATION",
  "decision": "AUDIT_DECISION_DENY",
  …
  "resource_id": "example.com:443",
  "os": "macos",
  "app_version": "v0.31.0",
  "client_name": "sbx",
  "hostname": "host-machine",
  "deny_reason": [
    "no applicable policies for op(action=net:connect:tcp, resource=net:domain:example.com:443)"
  ],
  "action_type": "network_egress",
  "network_egress": { "protocol": "tcp" },
  "agent": "claude"
}
```

macOS 文件为 `~/Library/Logs/com.docker.sandboxes/sandboxes/auditkit/` 下 `audit-<utc-timestamp>-<process-uuid>-<seq>.jsonl` {{docs-sbx Local audit logs}}。守护进程每5分钟、1000事件或50 MiB 将 `.tmp` 定稿为 `.jsonl`，从不删除。`category` 是 management、evaluation 或 execution，`decision` 是从 `AUDIT_DECISION_ALLOW` 到 `AUDIT_DECISION_APPROVAL_DENY` 的五种值 {{docs-sbx Audit record reference}}。`action_type` 指定 payload，如 `network_egress`、带方法/主机/端口/路径的 `http_request` 或 `tool_invocation`。

`client_name` 为 `sbx`，`hostname` 为机器名；GitHub Actions 的 `runtime: docker-sbx` 运行也如此显示 {{blog 2026-08-21}}。Docker Cloud 投递默认开启，事件可搜索90天，CSV 最多导出1000000行 {{docs-sbx View and export audit events}}。自0.39.0还能转发 Splunk Cloud、Dynatrace、Datadog 或 Sumo Logic {{docs-sbx SIEM forwarding}}。

```figure
id: fig-7-2
kind: flow
title: 从 Docker Home 到 SIEM
claim: 一个策略决定成为开发机一条 JSONL；只有强制组织策略才让守护进程写它。
caption: 从上向下读。守护进程拉组织策略，合并本地拒绝，在代理判断每请求。记录写 auditkit，轮转定稿，云投递转发。依据 research/sources/docs-sandboxes.md（Local audit logs、Audit record reference）及 capture/out/09-policy-log.json。
```

```takeaways
- 排查主机阻止前，运行 `sbx policy ls` 查 `Governance:` 行。
- 需要比组织允许更少时加本地拒绝，不要期望本地允许生效。
- 只收集 auditkit 的 `.jsonl`；SIEM 字段映射固定 `schema_version`。
- 文件系统策略改变后移除并重建沙箱。
```

Sources: docs-sbx Governance, Organization policies, Policy concepts, Local policy, Monitoring policies, AI Governance Audit Logs, Local audit logs, Audit record reference, Configure audit delivery, SIEM forwarding, View and export audit events, Sign-in enforcement, FAQ (research/sources/docs-sandboxes.md); help-sbx sbx create, sbx policy ls, sbx policy profile ls (research/sources/help-sbx.md); rel-sbx v0.32.0, v0.39.0 (research/sources/sbx-releases.md); blog 2026-08-21 and research/conflicts-register.md rows C16, C28, C37, C41; capture/out/03-policy-org.txt, 03-policy-profile-ls.txt, 09-check-verbose.json, 09-policy-log.json, 09-blocked.txt
