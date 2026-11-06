---
id: the-key-that-was-a-placeholder
title: 日志中的 key 只是占位符
card: scenarios
kind: incident
level: 2
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [debugging, design-review]
tags: [sandbox, secrets, proxy, placeholder, credential-isolation]
minutes: 20
lessons: []
manuals: [docker-sandboxes-101#s-sbx-secret-set-import-and-set-custom, docker-sandboxes-101#s-sbx-policy-log-and-the-proxy, docker-sandboxes-101#s-kit-tck-diagnose-and-the-claims-this-manual-checked]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
system:
  version: sbx v0.47.0
  model: none; shell commands inside the sandbox
  hardware: one Mac with the microVM runtime
source:
  - manuals/docker-sandboxes-101/capture/out/10-env-sentinel.txt
  - manuals/docker-sandboxes-101/capture/out/10-placeholder.txt
  - manuals/docker-sandboxes-101/capture/out/10-swap-curl.txt
  - manuals/docker-sandboxes-101/capture/out/10-receiver.log
  - manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md
  - manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md
  - manuals/docker-sandboxes-101/sections/7-4-kit-tck-diagnose-and-the-claims-this-manual-checked.md
---


## Situation

一名安全审查员阅读沙箱 agent 会话的记录。agent 被要求排查一次失败的请求，于是运行 `env` 并把环境变量打印到了团队共享的日志里。其中一行写着 `M101_RECV_KEY=sbx-cs-<rand>`，采集记录对随机部分做了掩码。审查员提了工单：agent 以明文持有凭据，该值出现在共享日志中，要求立即轮换。

平台工程师不同意，认为这个值不是 secret。但没人能说明原因。你拿到了打印的日志行、secret 在存储中的记录、从同一沙箱内部发出的四次请求，以及这些请求到达的宿主机接收端所记录的日志。

## Evidence

- [m101-secret 内部环境变量的两行自定义内容](evidence/what-the-agent-printed.txt)
- [使用选定占位符前缀设置的自定义 secret](evidence/how-a-placeholder-is-set.txt)
- [sbx secret ls 中 M101_RECV_KEY 的记录](evidence/the-stored-record.txt)
- [来自沙箱内部、带有占位符的四次请求](evidence/four-requests-from-inside.txt)
- [宿主机接收端所看到的三次请求](evidence/what-the-receiver-logged.txt)

## Questions

1. 打印出的值是凭据吗？存储记录中的什么证明了这一点？
2. 前三次请求返回了 204。接收端在每个请求头里收到了什么？这说明替换发生在何处？
3. 第四次请求没有收到回复，状态码为 000。为什么？这对发往未绑定主机的占位符说明了什么？
4. 这份证据证实了手册断言账本中的哪一行？关于代理的哪项断言仍未核验？
5. 这张工单应当如何处理？

## Walkthrough

1. **读打印出的两行。** `M101_RECV_KEY` 的值是 `sbx-cs-<rand>`，另一行自定义内容是单词 `proxy-managed`。手册列出了该版本中的三种哨兵格式：provider key 为 `proxy-managed`，git 宿主机为 token 形状的值，自定义 secret 为 `sbx-cs-<rand>`。打印出的值正是自定义格式。
2. **看占位符是如何生成和存储的。** `set-custom` 为目标主机和环境变量名保存一个占位符，加上 `--placeholder 'sk-{rand}'` 时保存的值为 `sk-<rand>`。`M101_RECV_KEY` 的 `secret ls` 记录有两个关键字段：`placeholder` 是 `sbx-cs-<rand>`，而 `secret` 被掩码为 `m101-d**************0000`。沙箱内部的环境变量持有第一个字段。第二个字段从未离开过存储。
3. **跟踪占位符发往已绑定主机。** 从内部发往 `host.docker.internal:18080` 的三次请求返回了 204：一次将变量放在 `Bearer` 内部，一次把占位符直接写成字面量，一次是无认证方案的裸值。接收端对前两次请求都记录了 `Bearer m101-dummy-receiver-0000`，在 `X-Demo` 中记录了相同的值，对第三次请求把裸值作为整个 `Authorization` 请求头记录。真实值只出现在宿主机一侧占位符所在的位置。因此替换是正向代理中的子字符串替换，发生在 secret 绑定的主机上。
4. **跟踪发往另一个主机名。** 第四次请求发往 `gateway.docker.internal:18080`。该名称在 `NO_PROXY` 中，因此 curl 跳过了正向代理并打开直接连接。透明代理拦截了它：返回空回复、状态码 000，退出码为 52。没有任何内容被替换。发往其他地方的占位符依然只是占位符。
5. **在账本中核对结论。** 手册的断言表将“凭据值绝不进入 VM”标记为被这两个文件证实，绑定主机的请求头替换标记为两侧均已证实。它将 TLS 拦截标记为未检查，因为没有读取证书链；将数据经由允许的主机流出的问题标记为存在争议且无采集记录。按此准确陈述即可。

## Resolution

日志中的值是自定义 secret 的占位符，不是凭据。凭据始终留在宿主机存储中。正向代理只把凭据放进发往两个已绑定主机的请求中，接收端日志证明这才是真实值首次出现的地方。发往任何其他名称的请求要么携带占位符，要么被拦截。工单以未泄露关闭，附带两点说明：占位符告诉读者针对这些主机存在已绑定的 secret，且沙箱能访问 `localhost:18080` 只是因为策略规则允许，因此接收端是运维人员选定的主机。

把两项检查写入运维手册：对于来自沙箱的疑似泄露，在轮换任何东西之前，先将打印出的值与 `sbx secret ls --json` 的 `placeholder` 字段比较；对于新的自定义 secret，将其绑定到精确主机并向受控接收端发送一次请求，像采集记录那样验证一次替换。

## Wrong turns

- "轮换 key 并清理日志。" 日志里的任何内容都不是 key。轮换需要在宿主机和接收端修改，修不好任何问题，下一次记录依然会显示同样的占位符。
- "agent 读取了宿主机的 keychain。" 客户机没有访问存储的路径。替换发生在请求离开 VM 后宿主机上的代理中。
- "用 -e 传入真实的 key，以便 agent 自行调用 API。" 普通变量不是 secret，哨兵机制的存在就是为了让真实值绝不进入 VM。存储与绑定才是受支持的做法。
- "代理只处理 Authorization 请求头，所以其他请求头中的值是安全的。" 接收端显示 X-Demo 中也出现了该值。发往已绑定主机的请求中，只要出现占位符就会被替换，因此必须将其绑定到精确主机。

## Generalize

边界内进程展示的 secret，只有在相同字节在边界外有效时才是真正的 secret。在断定泄露之前，查明值存储在何处，将打印出的字节与存储的占位符比较，并从预期目标和非预期目标将打印出的字节发送到受控接收端。随后写下测试证实了什么、未核验什么，并附上文件名。

## Taught in

手册的[机密页](../../../manuals/docker-sandboxes-101/sections/3-5-sbx-secret-set-import-and-set-custom.md)记录了占位符、替换和接收端，[代理页](../../../manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md)解释了双代理路径，[断言账本](../../../manuals/docker-sandboxes-101/sections/7-4-kit-tck-diagnose-and-the-claims-this-manual-checked.md)说明了这些文件证实了哪项断言。
