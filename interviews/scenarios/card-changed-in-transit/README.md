---
id: card-changed-in-transit
title: 一张声称部署到生产环境的 agent 名片
card: scenarios
kind: incident
level: 3
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [debugging, design-review]
tags: [a2a, agent-card, signatures, jws, prompt-injection, trust]
minutes: 25
lessons: [phases/18-ethics-safety-alignment/15-indirect-prompt-injection]
manuals: []
practice: []
cheatsheet: [a2a]
related: [scenarios/polling-a-parked-task]
updated: 2026-11-03
system:
  version: A2A 1.0.1 with the manual's capture kit (the test-runner, code-reviewer and deployer agents)
  model: no model; the agents are deterministic fixtures
  hardware: one machine, localhost, no network
source:
  - manuals/a2a-101/capture/out/17-signed-card.txt
  - manuals/a2a-101/capture/out/18-extended-card.http
  - manuals/a2a-101/capture/out/01-agent-cards.http
  - manuals/a2a-101/capture/out/08-rejected.http
  - manuals/a2a-101/sections/2-3-extended-cards-and-signatures.md
  - manuals/a2a-101/sections/6-1-security-schemes-and-in-task-authorization.md
---

## Situation

一个规划器在启动时拉取各 agent 的 agent card，并据此制定计划。这些 card 要经过另一个团队运行的缓存代理，规划器把每张 card 都当作对该 agent 行为的可信描述。一天早上，规划器把发布步骤委派为 `Deploy build 2026.10.06-1 to production`，因为它手里那份部署 agent card 的副本描述的是一个把打了标签的构建发布到生产环境的 agent。部署 agent 拒绝了。发布卡住，值班工程师发现代理上的副本和 agent 自己提供的 card 有一个词不同。

部署 agent 的 card 带有签名。规划器团队没有人看过它。card 加载器解析 JSON，丢掉不认识的字段，然后就开始规划。你手上有公开发布的 card、agent 对一次带鉴权的 card 请求给出的回答、那次拒绝，以及采集套件对这张 card 做规范化、签名和验签的记录，其中还有对一份描述里写着 production 的副本做的校验。

## Evidence

- [公开发布的部署 agent card 的技能和签名](evidence/skills-and-signature.txt)
- [部署 agent 自己对已鉴权调用方说了什么](evidence/the-agent-when-asked.txt)
- [规范化载荷和解码后的受保护头部](evidence/canonical-and-header.txt)
- [验证方重建被签名字节时遵循的三条规则](evidence/verify-rules.txt)
- [公开发布的签名条目和两次验签结果](evidence/signature-and-two-checks.txt)
- [客户端何时验签，用哪些算法](evidence/verify-first.txt)
- [部署 agent 对一次生产部署的回答](evidence/rejected-production-deploy.txt)

## Questions

1. 公开发布的 card 说部署 agent 做什么？带着 token 去问时，agent 自己又怎么说？
2. 签名覆盖哪些内容，排除哪些内容？
3. 一次校验返回 True，另一次返回 False。两次之间变了什么？为什么一个词就很要紧？
4. 采集套件为什么用 HS256 签名？为什么真实部署不能接受它？
5. 验签应该放在规划器启动流程的哪一步？失败时会怎样？
6. 部署 agent 拒绝了生产部署。为什么不能把这次拒绝当作主要防线？

## Walkthrough

1. **读公开发布的 card。** 技能是 `Deploy a build`，描述是：经操作员批准后，把一个打了标签的构建部署到 staging。标签是 `deploy` 和 `staging`，示例也是一次 staging 部署。技能下方有一个 `signatures` 列表，只有一项：一个 `protected` 头部和一个 `signature`。扩展 card 只返回给带 bearer token 的调用方，它描述的是同一个 agent：经操作员批准后部署到 staging。只有代理上的副本写着 production。
2. **读规范化载荷。** 它是去掉签名后的 card，键排好序，没有空格，符合 RFC 8785 的定义。里面的描述写的是 staging。解码后的头部给出 `alg` 为 HS256、`typ` 为 JOSE、`kid` 为 deployer-key-1。签名输入是用一个句点把 base64url 编码的头部和 base64url 编码的载荷连起来。
3. **读三条规则。** 验证方用收到的 card 重建这些字节。REQUIRED 字段总是出现，取默认值时也一样。JSON 规范化方案固定了每个值的顺序和形式。`signatures` 字段不参与，因为签名不能覆盖它自己。所以签名约束了其他每一个字段，描述也在其中。
4. **读两次校验。** 公开发布的 card 校验返回 True。在被改过的副本上，staging 变成了 production，规范化字节随之不同，校验返回 False。仅改动一个词就改变了被签名的字节，签名对不上了。这正是规划器从没做过的检查。
5. **读算法那一行。** 采集套件用 HS256 签名，因为它用的标准库没有 ECDSA。HS256 是 HMAC，验证方手里就有签名密钥，自己也能签一张 card。真实的 card 用 ES256 或 RS256，公钥发布在 JWKS 里，按 `kid` 和 `jku` 拉取，或者取自受信任的存储。验签有六个 MUST 步骤：客户端信任一张 card 之前至少验证一个签名，绝不使用过期或已吊销的密钥，并且使用一份明确的允许算法列表。
6. **读那次拒绝。** 部署 agent 回答 `TASK_STATE_REJECTED`，说生产部署超出它的策略。这条策略在 agent 里面，它拦下了这一次。但 card 里还写着规划器要发请求的接口 URL。能篡改副本中一个词的人，也能篡改这个字段；那样请求就会发到攻击者运行的服务器上，那里没有任何策略会拒绝。

## Resolution

规划器信任了一份签过名的文档的未验证副本。现在加载器在读取任何用于规划的字段之前，至少验证一个签名。它按三条规则重建规范化字节，从受信任的存储里取 `kid` 对应的密钥，只允许团队列出的算法。校验失败的 card 会被拒绝并触发告警，规划器不会退回去使用它的内容。在已鉴权的会话里，规划器还会用 agent 自己返回的扩展 card 替换缓存里的公开 card。采集套件的记录证明了这个机制：公开发布的字节返回 True，同一张 card 改一个词返回 False，agent 自己的描述和公开发布的一致。

## Wrong turns

- "固定代理缓存的内容，然后继续。" card 仍然没有验证。下一次修改会以同样的方式通过。
- "拿描述和上周看到的版本比对。" `version` 字段在被签名的载荷里，改过的副本会原样保留它。只有签名能把这些字段绑在一起。
- "头部写的是什么算法，就用什么算法验证。" 头部是输入的一部分。给验证方一份明确的列表，这样改过的 `alg` 就选不到更弱的校验。
- "部署 agent 拒绝了，所以系统是安全的。" 拒绝来自公开 URL 上那个诚实的 agent。改过的 card 也能改掉 URL，诚实的 agent 根本看不到这个请求。
- "改为拉取扩展 card，它需要 token。" 扩展 card 是给已鉴权调用方的更完整的 card，返回时不带签名。规划器信任了对面的 agent 之后它才有用，而赢得这份信任的正是公开 card 上的签名。

## Generalize

agent 从网络上读到的任何东西都是输入，不是事实；描述其他 agent 的元数据，是影响力最大的输入。在基于这类文档做规划之前，先用一把不随文档一起传过来的密钥验证它的完整性；把对端的策略检查当作第二层防线，永远不要当作第一层。

## Taught in

[A2A 101 的扩展 card 与签名页面](../../../manuals/a2a-101/sections/2-3-extended-cards-and-signatures.md)逐步讲解了这次签名和两次校验，[安全方案页面](../../../manuals/a2a-101/sections/6-1-security-schemes-and-in-task-authorization.md)讲了凭证和授权范围，[间接 prompt 注入这一课](../../../phases/18-ethics-safety-alignment/15-indirect-prompt-injection/)解释了为什么 agent 在没有用户参与时读到的内容，是只过滤用户输入的过滤器永远看不到的攻击面。
