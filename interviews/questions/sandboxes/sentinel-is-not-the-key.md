---
id: sentinel-is-not-the-key
title: 密钥显示为 proxy-managed，agent 却依然正常工作
card: sandboxes
kind: concept
level: 1
roles: [agentic-ai-engineer, applied-ai-engineer, forward-deployed-ai-engineer]
rounds: [screen, debugging]
tags: [sandbox, secrets, proxy, sentinel, credentials]
minutes: 6
lessons: []
manuals: [docker-sandboxes-101#s-sbx-secret-set-import-and-set-custom, docker-sandboxes-101#s-sbx-and-docker-agent]
practice: []
cheatsheet: [docker-sandboxes]
related: [sandboxes/hypervisor-is-the-boundary]
updated: 2026-11-03
---

沙箱内部的 agent 打印了其环境变量。模型服务商的 API 密钥变量显示为 `proxy-managed`，而 `GH_TOKEN` 看起来像一个以 `gho_sbxproxymanaged` 开头的真实 Token。开发者此前曾在 `~/.zshrc` 中导出了真实的密钥，失败后又尝试传入了 `-e KEY=value`。解释 agent 当前实际持有的是什么、真实密钥存放在哪里，以及为何发往服务商的请求依然能携带有效的真实密钥。

## Short answer

agent 持有的只是占位符（sentinel），而不是真实的密钥值。系统存在三种标准占位符格式：模型服务商密钥采用 `proxy-managed`，`GH_TOKEN` 采用类似真实 Token 格式的 `gho_sbxproxymanaged000000000000000000000`，自定义密钥采用 `sbx-cs-<rand>`。真实的密钥安全保存在宿主机的凭据存储中（macOS Keychain、Windows 凭据管理器或 Linux Secret Service），宿主机代理服务在请求离开虚拟机后、且仅在发往与该机密绑定的目标主机时，才将占位符动态替换为真实密钥。自 v0.35.0 起沙箱便不再读取宿主机的环境变量，而 `-e` 传递的只是普通的明文环境变量，绝非受保护的机密。

## Full answer

### 注入凭据的三种途径与一种误区

`sbx secret set` 将密钥存储在 13 个预设服务名称之一的命名空间下，数据来源支持 `-t`、标准输入、`--command` 或 `--ref`，且 `--refresh` 可配置缓存刷新时间（默认 55 分钟）。`sbx secret import` 一次性读取宿主机环境变量，以展示后 4 位的预览形式呈现候选密钥，并仅保存用户确认接受的部分。`sbx secret set-custom` 则支持将自定义密钥绑定至特定 `--host` 目标以及你自己命名的 `--env` 环境变量名。

`-e KEY=VALUE` 是第四种传递参数的方式，但它不是安全的机密注入通道。该变量以明文形式直接落入 Agent 会话中，且后续执行 `sbx template save` 时会连同容器文件系统中的所有其他文件一并被复制打包。

### 宿主机接收端所捕获的实测行为

实测运行将自定义机密绑定至 `host.docker.internal` 与 `localhost`，在宿主机 `127.0.0.1:18080` 启动了测试接收端，并从沙箱内部发起了将占位符置于三处不同位置的 HTTP 请求。接收端日志证实：在 `Bearer` 内部、在 `X-Demo` 自定义请求头中，以及作为整个 `Authorization` 头部的值，均被成功替换为了真实密钥。这证明替换发生在纯明文 HTTP 协议层面，且是对发往绑定主机的请求任意位置执行的子串匹配替换。

第四笔请求发送给了列在 `NO_PROXY` 中的域名，导致 curl 跳过了正向代理。透明代理路径直接阻断了该请求且未执行任何凭据替换。当前已存在的沙箱未收到新添加的自定义变量；自定义机密仅注入新创建的沙箱。而机密删除操作对正在运行中的沙箱是即刻生效的。

### 唯一能够直接穿透分界线的凭据通道

SSH agent 代理转发默认保持开启。客户机内部能够看到 `SSH_AUTH_SOCK=/run/ssh-agent.sock`，其网关位于 3129 端口上。私钥安全存留在宿主机上，沙箱内部的任何进程均可请求该代理执行签名操作。配置 `ssh.agentForwardingEnabled` 并重启守护进程可将其关闭。

## Follow-ups

- **Level 1:** 为什么在 shell 配置文件中 export 环境变量在沙箱内毫无效果？ Expected: 自 v0.35.0 起宿主机环境变量不再被沙箱读取；应使用 `sbx secret set` 或 `sbx secret import` 存储。
- **Level 2:** 除了不够优雅之外，使用 `-e API_KEY=...` 的核心安全代价是什么？ Expected: 密钥明文对 Agent 完全可见且会被保存进基于该沙箱导出的任何模板中，且没有任何代理替换机制提供保护。
- **Level 2:** 占位符出现在发往绑定主机的 URL 查询字符串中，对端会收到什么？ Expected: 收到真实密钥，因为代理替换是对请求中出现的任何子串无差别替换。
- **Level 3:** 为什么自定义机密必须绑定到精确的主机名而非宽泛通配符？ Expected: 代理对发往任何绑定主机的请求都会填充真实密钥，过于宽泛的绑定会导致 Agent 将密钥发送到未预期的目标。

## Wrong answers

- "Agent 必须拿到真实密钥否则调用会报错。" 代理在请求离开虚拟机后会自动补全真实密钥；实测中沙箱内拿着 `proxy-managed` 完全正常调用。
- "沙箱内的 `GH_TOKEN` 是真实泄漏的敏感凭据。" 它是一个形似合法 Token 的占位符，以便工具能够通过格式校验；真实凭据留在宿主机。
- "在宿主机 export 环境变量后沙箱会自动继承。" 该途径在 v0.35.0 中已关闭；声称能够继承的教程均已过时。

## Taught in

[机密章节](../../../manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md)记录了占位符格式与接收端抓取日志，[第一章节](../../../manuals/docker-sandboxes-101/sections/1-1-sbx-and-docker-agent.md)指明了谁持有凭据存储与代理服务。
