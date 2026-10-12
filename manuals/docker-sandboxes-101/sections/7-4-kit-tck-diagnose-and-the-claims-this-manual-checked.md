# kit-tck、sbx diagnose 与本手册检查的断言

> 本手册复述 Docker 页面或社区的每项断言，都用录制核对或标为未验证；本节是核验台账。

厂商页说凭据值不进入 VM {{docs-sbx Security model}}。2026-08-10 Hacker News 说代理重签所有证书，2026-09-26 播客说边界无人审计。你想知道三者谁被检查过。读完本节，你能说出本手册验证了什么、依据哪个文件，以及哪些只转述。

## 台账 {#s-kit-tck-diagnose-and-the-claims-this-manual-checked-the-ledger}

每行列断言与来源、结论和证据。已确认表示录制文件展示行为；已反驳表示展示相反行为；有争议表示两来源冲突且无录制裁定；未验证表示未计划或未录制。

| 断言及出处 | 结论 | 证据 |
|---|---|---|
| 凭据值不进入 VM（docs，Security model） | 已确认 | `10-env-sentinel.txt` 有 `M101_RECV_KEY=sbx-cs-<rand>`、`ANTHROPIC_API_KEY=proxy-managed`；`10-receiver.log` 显示宿主收到 `Bearer m101-dummy-receiver-0000` |
| 密钥仅向绑定主机注入，替换完整 header（HN 2026-08-10，C34） | 两侧均确认 | `10-swap-curl.txt`：`host.docker.internal:18080` 为204，`gateway.docker.internal:18080` 为 `000`；`10-receiver.log` 展示带/不带 `Bearer` 及 `X-Demo` 替换 |
| 出站 TCP 无允许规则即阻止（docs，Default security posture） | 已确认 | `09-blocked.txt`：403；`09-check-verbose.json`：`"deny_kind": "implicit"` |
| 各沙箱有独立 Docker Engine，无宿主守护进程路径（docs，Security model） | 部分确认 | `04-guest.txt`：内部 Docker Engine 29.8.1、`agent` 在 `docker` 组；未探测宿主路径 |
| `--clone` 提交经 `sandbox-<name>` 到宿主（help，`sbx create`） | 已确认 | `08-clone-host.txt`：`git fetch sandbox-m101-clone` 取回 `81e11df from sandbox`；`08-clone-commit.txt`：push 到 `/run/sandbox/source` 被拒绝 |
| Apple silicon 客户机用16 KiB 页（2026-05-26博客，C45） | 已确认 | `04-guest.txt`：`getconf PAGESIZE` 输出16384 |
| 代理为 `gateway.docker.internal:3128`（issue #12，C26） | 已确认 | `04-env.txt`：`HTTPS_PROXY=http://gateway.docker.internal:3128`，设置 `PROXY_CA_CERT_B64` |
| HTTPS 被拦截并重签（issue #12、HN 2026-08-10） | 未检查 | `09-allowed.txt` 展示 CONNECT 隧道和 `cloudflare` 回复，未读取证书链 |
| 每沙箱一个 MCP 网关端点（docs，Architecture） | 已确认 | `11-static-inside.txt`：`MCP_GATEWAY_URL=http://mcp-gateway.docker.internal/mcp`；`11-gateway-tools-static.json`：`ask_wiki_question` |
| 27种工具集，`transfer_task` 不在其中（schema，C56） | 已确认 | `16-toolsets.txt`：27行，无两个隐式名称 |
| `sbx kit` 为 v1/v2 工具（C13） | 已确认 | `13-kit-v3-validate.txt`："is a v3 source kit and this load path has no kit builder configured"；`12-validate.txt`：`VALID` |
| kit 签名可用 `sbx kit sign`、`verify` 验证（docs，Build and distribute kits） | 未检查 | 未录制签名/验证，仅 `13-kit-builder-status.txt` |
| 本地模型无 key 运行（docs，Use local and hosted models） | 已确认 | `25-doctor.txt`：provider 凭据全 `not set`，runner 可达且有 `docker.io/ai/qwen3:4b`；`25-run-dmr.txt` 实时答 `Hello`；`18-cassette-head.txt` 请求到 `localhost:12434`，`27-inside-run.txt` 在 VM 内回答；8B `ai/qwen3:latest` 拉取失败（`25-model-pull-latest.txt`） |
| 本地需 Docker 登录（docs，FAQ；HN 2026-08-10、issue #321质疑，C15） | 部分确认 | `02-diagnose.txt` 列 Authentication 检查，前置要求含 `sbx login`；`help-sbx-cloud.md` 记每次 --help 尝试 TLS 到 login.docker.com |
| `sbx policy approval` 不是命令（v0.47.0帮助树，C16） | 未验证 | `09-blocked.txt` 403写 "Review and respond with: sbx policy approval ls"，未运行该命令 |
| VMM 是 libkrun（2026-01-14演讲、HN 2026-08-10，C4） | 未验证 | `00-sbx-version.json` 未指明运行时；`04-guest.txt` 仅展示内核 `7.0.14` |
| 沙箱几十毫秒启动（2026-02-10演讲，C29） | 未检查 | K35 计时未录制 |
| 允许主机可外传数据（HN 2026-08-10、2026-04-07演讲） | 有争议 | [代理一节](#s-sbx-policy-log-and-the-proxy) 并列双方，未测试 |
| microVM HTTP API、Kubernetes 运行时、Warp Oz（2026-05-26/2026-08-21博客、2026-03-31演讲） | 未验证 | 无 Docker 页面确认（C105、C106） |
| 存在边界独立审计 | 未找到 | 2026-09-26播客说不存在，语料中也没有（T24） |
| macOS `sbx ls` 卡住（#163）、Windows 启动失败（#350） | 未复现 | `99-final-state.txt`：结束时 `sbx ls` 正常响应 |
| 最后会话结束后自动停止（文档未说） | 已观察 | `04-auto-stop.txt`："auto-stop grace period expired, stopping runtime" |

```figure
id: fig-7-4
kind: comparison
title: 文件确认，还是仅转述
claim: 八项断言由录制确认，五项未测试仅转述，另有一项社区争议。
caption: 左侧是确认断言及证据文件，颜色对应所属层；右侧虚线框是未测试转述，玫红框是社区争议。来源为各框所列文件。
```

## sbx diagnose：唯一自检 {#s-kit-tck-diagnose-and-the-claims-this-manual-checked-sbx-diagnose-the-only-self-check}

**sbx diagnose：** 唯一检查安装的命令，`capture/out/02-diagnose.txt` 展示 Installation、Platform、Storage、Connection 四组。支持 `--json`、可粘贴到 issue 的 `--output github-issue`，以及上传 Docker 支持的 `--upload` {{help-sbx sbx diagnose}}。

```listing
title: 录制宿主的平台与连接检查
source: capture/out/02-diagnose.txt
lang: text
note: Installation、Storage 已截去。字节数与大小由套件遮蔽。
---
  Platform
  ✓ Virtualization — supported
      kern.hv_support is 1
  ✓ mkfs.erofs — found
      /opt/homebrew/Caskroom/sbx/0.47.0/Sbx.app/Contents/libexec/mkfs.erofs, default block size <n> bytes, guest kernel page size <n> bytes
…
  Connection
  ✓ Version match — v0.47.0
  ✓ Socket — responsive
  ✓ SSH client config — not configured
  ✓ Authentication — authenticated

─────────────────────────────────────────
  13 passed
```

13项全通过，`02-diagnose.json` 相同行带 `summary` 的 `pass`、`warn`、`fail`、`skip` 计数。[microVM 边界一节](#s-sbx-diagnose-and-the-microvm-boundary) 从 Platform 读 hypervisor 与页大小。`sbx --cloud diagnose` 检查不同集合：登录、云 API、账户访问，无需守护进程 {{docs-sbx Use cloud sandboxes}}。

## kit-tck：本版未运行 {#s-kit-tck-diagnose-and-the-claims-this-manual-checked-kit-tck-not-run-in-this-edition}

**kit-tck：** Sandbox Kit Specification v3 一致性套件，两个独立部分分别测已发布 kit 产物与运行时。规范仓库的一致性页描述两者（research/sources/kit-spec-extras.md）。`kit-tck validate <reference>` 按发布与 OCI 布局规则判断产物，BuildKit frontend 导出前运行相同检查。`kit-tck runtime --adapter <path>` 驱动 adapter 程序，其动词包括 `capabilities`、`create`、`exec`、`stop`、`start`、`recreate`、`rm`。

套件通过这些动词判断运行时行为。adapter 因策略拒绝时退出2，其他非零视为失败。因此无法提供必需能力的运行时必须拒绝 kit。

```listing
title: 两套测试与产物命令
source: research/sources/kit-spec-extras.md
lang: text
note: docker/sandbox-kit-spec README 的四行。task 行在 checkout 中运行，kit-tck 行使用发布程序。
---
task tck:kit REF=docker.io/me/sbx-kit-gh:1.0.0   # is this artifact a conforming Kit?
task tck:runtime ADAPTER=./my-adapter            # does this runtime behave as the pages require?
…
kit-tck validate docker.io/me/sbx-kit-gh:1.0.0 --verbose
kit-tck validate docker.io/me/sbx-kit-gh:1.0.0 --format json
```

每个规范 GitHub release 附 Linux、macOS、Windows 的 `kit-tck` 程序。`kit-tck inspect` 读取描述文件和配方，不判断。套件向 adapter 环境放入 `KIT_TCK_HOST_SENTINEL`、`KIT_TCK_BOUND_SECRET` 与 `KIT_TCK_SKILL_NAME` 三个已知值，可据此发现宿主环境或绑定密钥泄漏。

本版未运行。套件构建 v3 产物并推送本地 registry（`28-buildx.txt`、`28-manifest.json`），但未对它执行 `kit-tck`。

## agent 回归检查 {#s-kit-tck-diagnose-and-the-claims-this-manual-checked-the-agent-regression-check}

agent 的计划检查是 `docker-agent sessions diff --fail-on-divergence`，比较录制会话“over the sequence of tool calls, not over the assistant's prose”，按调用序列而非文字，停在首个分歧 {{help-agent docker-agent sessions diff}}。套件对录制会话运行了它（`21-sessions-diff.txt`）：同一运行两次重放五轮全同；先调 `shell` 的运行在第0轮分歧，退出1。`-1` 等相对引用前需 `--`，否则当 flag。[会话一节](#s-session-db-sessions-diff-and-eval) 解释存储。

```takeaways
- 只有 `capture/out/` 文件展示行为，才称断言已确认。
- 先运行 `sbx diagnose`，报告附 `--output github-issue`。
- 发布 kit 用 `kit-tck validate`，按指出的规范章节读结果。
- 每 agent 保留两份录制会话，用 `sessions diff --fail-on-divergence` 比较。
```

Sources: docs-sbx Security model, Default security posture, Architecture, FAQ, Use cloud sandboxes, Build and distribute kits, Use local and hosted models (research/sources/docs-sandboxes.md); help-sbx sbx diagnose, sbx create (research/sources/help-sbx.md); help-agent docker-agent sessions diff (research/sources/help-docker-agent.md); research/sources/kit-spec-extras.md (README Conformance, docs/spec/conformance.md); research/sources/help-sbx-cloud.md; research/conflicts-register.md rows C4, C13, C15, C16, C26, C29, C34, C45, C56, C105, C106 and the community rows of research/plan.md; capture/out/00-sbx-version.json, 02-diagnose.txt, 02-diagnose.json, 04-auto-stop.txt, 04-env.txt, 04-guest.txt, 08-clone-commit.txt, 08-clone-host.txt, 09-allowed.txt, 09-blocked.txt, 09-check-verbose.json, 10-env-sentinel.txt, 10-receiver.log, 10-swap-curl.txt, 11-gateway-tools-static.json, 11-static-inside.txt, 12-validate.txt, 13-kit-builder-status.txt, 13-kit-v3-validate.txt, 16-toolsets.txt, 18-cassette-head.txt, 21-sessions-diff.txt, 25-doctor.txt, 25-model-pull-latest.txt, 25-run-dmr.txt, 27-inside-run.txt, 28-buildx.txt, 28-manifest.json, 99-final-state.txt
