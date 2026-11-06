---
id: conformance-score-of-32-percent
title: 一致性得分 32.3%
card: scenarios
kind: incident
level: 4
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer, forward-deployed-ai-engineer]
rounds: [design-review, debugging]
tags: [a2a, conformance, tck, test-defects, binding-equivalence, release-gate]
minutes: 30
lessons: [phases/14-agent-engineering/26-failure-modes-agentic]
manuals: []
practice: []
cheatsheet: [a2a]
related: [scenarios/task-not-found-in-two-bindings]
updated: 2026-11-03
system:
  version: A2A 1.0.1 with the manual's capture kit (the test-runner, code-reviewer and deployer agents)
  model: no model; the agents are deterministic fixtures
  hardware: one machine, localhost, no network
source:
  - manuals/a2a-101/research/tck-run.md
  - manuals/a2a-101/research/tck-summary.txt
  - manuals/a2a-101/sections/7-3-conformance-testing.md
  - manuals/a2a-101/sections/5-5-errors.md
  - manuals/a2a-101/sections/4-6-push-notification-configs.md
---

## Situation

一个团队的 A2A 服务端准备首次发布。发布门禁用官方一致性套件 `a2a-tck`（tag 为 `1.0.0.alpha2`）测这个服务端，要求得分及格。看板显示总体兼容性 32.3%，门禁是红的。技术负责人开了一个工单，标题是“修复 63 个失败的 JSON-RPC 检查”，并请你估个工时。

被测服务端是采集套件的 `test-runner` agent。它的 card 声明了 JSON-RPC 和 HTTP+JSON 接口、流式和推送通知，没有 gRPC。你手上有同一天对它跑的两次记录：第一次用公开发布的 TCK；第二次先对 TCK 自己的 JSON-RPC 客户端做了两行改动，并在服务端修了一处问题后重跑。你的任务是说清哪些失败属于服务端，哪些属于测试套件，以及门禁应该读什么。

## Evidence

- [两次运行的数字，来自 compatibility.json 和 pytest](evidence/two-runs.txt)
- [为什么有第二次运行：TCK 把 JSON-RPC 请求发到了哪里](evidence/why-run-2.txt)
- [TCK 的两条计数规则，它们改变了数字的读法](evidence/two-accounting-facts.txt)
- [因真实断言失败的十项要求，按类别列出](evidence/the-ten-real-failures.txt)
- [修复后的推送要求，以及每种绑定的判定](evidence/push-rows.txt)
- [这次运行在服务端发现的唯一缺陷及其修复](evidence/the-kit-defect.txt)
- [TCK 偏离规范的地方，按影响排序](evidence/departures-in-order.txt)

## Questions

1. 哪一个原因能解释第一次运行的大部分结果？这是谁的缺陷？
2. 第二次运行之后，为什么剩下的大部分失败要求仍然说明不了服务端的任何问题？
3. 在因真实断言失败的要求里，有几项是服务端的？处在哪个级别？
4. 推送要求在一种绑定上通过，在另一种上失败。TCK 对每一种各记录了什么？为什么？
5. 那一处真实缺陷是什么？它违反了哪条规则？修复是怎样验证的？
6. 写出发布规则：门禁读什么？遇到属于测试套件的失败怎么处理？

## Walkthrough

1. **读两次运行。** 第一次得分 32.3%：129 项要求里，30 项通过，63 项失败，11 项跳过，25 项未测。JSON-RPC 传输上，85 条记录里 12 条通过，63 条失败，10 条跳过。第二次得分 66.7%：62 项通过，31 项失败，11 项跳过，25 项未测；JSON-RPC 传输在 102 条记录里是 66、29 和 7。两次运行中全部 72 条 gRPC 记录都被跳过，因为 card 没有声明 gRPC 接口。两个分数之间，服务端除了推送修复没有任何变化，而这个修复没有改变任何判定。
2. **读第二次运行的原因。** TCK 的 JSON-RPC 客户端用一个以接口 URL 为基地址的 HTTP 客户端，向 `/` 发 POST。这个库会在基地址后面补一个斜杠，所以每个请求都发到了 card 的 URL 加尾部斜杠。服务端只在精确的 URL 上路由 JSON-RPC，于是返回 404 和“No such path”。第一次运行里，85 条 JSON-RPC 记录中有 63 条因为这一个原因失败或跳过。TCK 自己的参考服务端把接口声明在主机根路径，那里两个 URL 相同，所以套件从没碰上自己的缺陷。规范要求接口声明自己的 URL，没有任何规定要求服务端还要在带斜杠的 URL 上应答。两行改动把 `/` 换成基地址 URL，这些记录全部通过。
3. **读计数规则。** 这个 tag 把测试体内部触发的跳过记成失败。TCK 的 main 分支修了这一点，并写明了原因：记成失败会歪曲测试结果。第二次运行的 31 项失败要求里，有 21 项是这种跳过，大多来自一个前置条件：它期望 agent 把任务停在等待输入的状态，而 `test-runner` 从不这样做。按 main 分支的规则，这次运行是 62 项通过、10 项失败、32 项跳过、25 项未测：总体 86.1%，MUST 要求 89.4%。第二条规则：每个传输的条目取最后写入的那条记录，所以一项要求可能在某个传输上显示通过，判定却是失败。
4. **读那十项。** 在 MUST 级别上，没有一项失败要算在服务端头上。七项是 TCK 的：一个规范要求的 content-type 错误被算成失败；两个 content-type 子串检查要求 `application/json`，而规范首选 `application/a2a+json`；一个测试发送非 JSON 请求体并期望 -32005，而规范给的是 -32700；推送创建时用了 snake_case 的 `task_id`；还有一个测试对 MAY 做了断言。两项来自 TCK 的示例 agent 场景，它期望固定的输出，这个 agent 不会产生。两项是服务端已在文档中说明的 SHOULD 要求未实现：card 上没有 `Cache-Control`，也没有 `ETag`。
5. **读推送那几行。** 六项推送要求显示 `http_json=PASS`、`jsonrpc=FAIL`，判定为 FAIL，因为只要有一个传输失败，这项要求就失败。JSON-RPC 这边失败，是因为 TCK 发送 `task_id`，而规范的 camelCase 规则要求 `taskId`。服务端读 `taskId`，找不到任务，于是返回 -32001。HTTP+JSON 客户端发送 camelCase，通过了。`PUSH-GET-002` 在 JSON-RPC 上通过，原因同样是错的：服务端对每个配置 id 都回答未找到，所以测试从没检查过一个真实的配置。
6. **读那处缺陷。** 修复之前，HTTP+JSON 绑定在 `tasks/{id}/pushNotificationConfigs` 下没有任何路由，而 card 声明两种绑定都开启了推送通知。规范第 5.1 节规定，所有受支持的协议必须提供同一组操作。这次运行把它记为 `PUSH-CREATE-001` 在 HTTP+JSON 上以“404 Method not found”失败，外加五个依赖它的跳过。修复在同一项能力检查之后加了四个 REST 路由。重跑第二次运行后，六条 HTTP+JSON 记录变为通过，pytest 通过数从 113 升到 119；另有八项手工检查覆盖了创建、读取、列出、不存在的 id、删除、删除后读取、再次删除和未知任务。
7. **读偏离之处。** 共八项，按影响排序：尾部斜杠，snake_case 参数，content-type 子串，某项要求缺少期望的错误，非 JSON 请求体，对 SHOULD 和 MAY 测试的硬断言，把跳过记成失败，以及潜在的状态码问题：规范写 400、400 和 500 的地方返回了 409、415 和 502。八项里有两项已在 TCK 的 main 分支修复。

## Resolution

32.3% 度量的是 TCK 怎样拼 URL，66.7% 度量的是它怎样统计跳过。按要求逐项看，服务端没有违反任何 MUST。第二次运行发现的唯一真实缺陷是 HTTP+JSON 上缺少推送路由，修复已由六条记录和八项手工检查验证。还有两处 SHOULD 要求未实现，已写进文档。发布规则逐项读 `compatibility.json`，从不读百分比。它把每个非通过项归类为：服务端的、TCK 的、示例 agent 的、按设计不支持的、未测的。只有属于服务端自己的 MUST 失败才阻断发布；SHOULD 要求未实现持续跟踪；每个 TCK 缺陷都附上能证明它的协议报文检查，提交给上游。规则还维护一份这个 tag 不测的内容清单，其中有绑定等价、card 签名和所有者作用域，这些由团队自己测。

## Wrong turns

- "修好这 63 个失败。" 63 条记录失败于同一个原因，它在测试客户端里；也没有任何规则要求服务端在 URL 加斜杠的地址上应答。TCK 里两行改动就能把它们全部消除。
- "把 JSON-RPC 参数改成 snake_case，让推送检查通过。" 规范要求 camelCase，TCK 自己的 HTTP+JSON 客户端发的就是 camelCase，并且通过了。这样改会让服务端为了迁就套件而违反规范。
- "发送 application/json，让 content-type 检查通过。" 规范首选 `application/a2a+json`，各实现做法不一。读取时两者都接受，发送时继续用规范首选的那个。
- "百分比达到阈值就发布。" 百分比只计 PASS 和 FAIL。光是跳过规则，就能在服务端不变的情况下把它从 66.7 变成 86.1，所以阈值度量的是 TCK 的版本。
- "推送检查在 HTTP+JSON 上通过了，所以绑定等价已经覆盖。" 这个 tag 不测那四项等价要求。这次缺陷是通过一个推送测试偶然发现的，下一个漏洞不会这么巧。

## Generalize

一致性得分是一次测量，测量仪器有它自己的缺陷。在依据数字采取行动前，逐项核对测试要求，把仪器的失败和被测对象的失败分开，修好仪器后再跑一次，并问一问仪器根本没测什么。这里唯一的真实缺陷，就在两种绑定之间的缝隙里，那是套件没测的地方。

## Taught in

[A2A 101 的一致性测试页面](../../../manuals/a2a-101/sections/7-3-conformance-testing.md)记录了这两次运行和偏离表，[错误页面](../../../manuals/a2a-101/sections/5-5-errors.md)和[推送通知页面](../../../manuals/a2a-101/sections/4-6-push-notification-configs.md)给出了 content-type 行和推送行背后的规则，[失败模式这一课](../../../phases/14-agent-engineering/26-failure-modes-agentic/)提醒：只关注汇总数字的监控，会漏掉真正要紧的失败。
