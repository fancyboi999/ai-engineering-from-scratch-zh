---
id: evidence-id-excludes-the-path
title: 两台机器得出相同 ID 但删除一行后被拒绝导入
card: evidence-reverse-engineering
kind: concept
level: 2
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer, ai-data-engineer]
rounds: [screen, debugging]
tags: [reverse-engineering, evidence, content-hash, canonical-json, integrity]
minutes: 8
lessons: [phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns]
manuals: [reverse-engineering-101#s-the-evidence-record, reverse-engineering-101#s-ref-errors]
practice: []
cheatsheet: [reverse-engineering]
related: [evidence-reverse-engineering/observed-derived-inferred]
updated: 2026-11-03
---

两台机器在不同文件夹中分析同一个目标文件，获得了相同的 `ev_` 证据 ID。某同事复制了其中一条记录，删除了其中的一句局限性描述以缩短篇幅，结果该文件无法再被导入。随后，由旧版本工具生成、未做任何改动的证据包也发生了同样的导入失败。根据证据 ID 计算规则解释这三种结果。

## Short answer

证据 ID 是一种内容哈希：即 `ev_` 加上对记录特定投影应用 RFC 8785 规范化 JSON 计算得到的 SHA-256 哈希值，其中投影保留了主体的 `digest`、`format` 和 `architecture`，去除了 `name` 和 `local_path`，并对其余所有内容（包括 `raw_result` 和每一条局限性描述）做哈希运算。因此，移动文件位置仍能保持 ID 不变；删除局限性描述会改变内容，校验器会以 "Evidence semantic identifier does not match its record" 予以拒绝；而旧证据包失败是因为 ID 规则本身发生了升级，旧版本未将 `null` 值的 `relationship_coverage` 纳入哈希，而当前版本将其纳入，导致第一条包含 `null` 覆盖率的记录触发 `evidence_integrity_mismatch` 错误。已保存的证据记录不会自动迁移，应使用当前运行的版本重新生成。

## Full answer

### 规范化配方

规范化 JSON 会排序对象的键、去除空白字符，并统一数字与字符串的形式。对于数值均为整数的记录，使用标准库中带有排序键和紧凑分隔符的 `json.dumps` 能够生成完全相同的字节，这也是仅用几行 Python 或 Node 代码就能重新计算每个捕获 ID 的原因。浮点数在哈希之前会被直接拒绝，因为规范化形式与语言运行时的打印输出可能存在差异。分析配置文件的摘要是一个独立的针对 `{provider, parameters}` 计算的 SHA-256 哈希，如果配置中的 provider 与记录中的 provider 不一致，该配置将被拒绝。

### 哪些内容在哈希内，哪些在哈希外

位于 `subject` 中的路径在哈希计算范围之外。位于其他任何位置的路径都在哈希计算之内：有两个捕获文件曾比对失败，原因在于捕获工具包在 `normalized_result` 和 `locations` 内部掩码遮蔽了目录，导致携带该路径的记录在每台机器上都会得到不同的 ID。在你自己的记录中，应避免将路径放入结果与位置字段中。局限性描述被有意设计为内容的一部分：删除一条会让记录显得比实际事实更有说服力，而后来的阅读者无法弥补这一点，因此哈希 ID 会被破坏。

### 无需重新哈希的重绑定

通过重新绑定操作，记录可以在新路径下展示，若摘要、格式或架构不符则拒绝执行。快照重放将已打开目标的路径写入已保存记录时也遵循相同机制：`evidence_id` 并不会改变，因为路径从未参与哈希计算。

### 错误信息包装

每个错误都包含相同的五个字段：`code`、`category`、`message`、`retryable`、`remediation.action`，以及可选的 `details`。被拒绝的证据包会按索引指名失败的记录，并指出具体哪个字段校验失败。`invalid_request` 在修正参数后可重试，而 `evidence_integrity_mismatch` 则不可重试。

## Follow-ups

- **Level 2:** 为什么要把路径完全排除在哈希计算之外？ Expected: 对同一字节内容的相同观察在任何机器和任何文件夹中都应携带同一个 ID；身份归属于内容本身，而非文件所存放的位置。
- **Level 3:** 某生成器将绝对路径写入了 `locations`。当同事导入该证据包时会发生什么？ Expected: 未经修改的证据包仍可正常导入，因为存储的路径能够哈希出存储的 ID；但同事机器上生成的相同观察携带了他们的路径并得到不同的 ID，且任何掩盖路径的修改都会破坏 ID。位置字段应存放地址和相对产物路径，而非主机绝对路径。
- **Level 3:** 为什么局限性声明被算作核心内容而非普通注释？ Expected: 没有它，记录所宣称的结论就超过了分析工具所实际支持的范围，下游任何人都无法察觉。
- **Level 4:** 如何处理旧版本的证据包？ Expected: 使用当前版本重新生成它，因为哈希规则发生了变化且旧 ID 不会自动迁移；切勿手动修补 ID。

## Wrong answers

- "ID 是在写入时随机分配的唯一标识符。" 它们是内容哈希，这也是两台机器能够达成一致的原因。
- "为了节省上下文 token 删减局限性描述。" 每一项都参与了哈希计算。带有旧 `evidence_id` 的删减记录会被拒绝，读者也会失去关于事实所未覆盖范围的了解。
- "修改 ID 字段以便能成功导入证据包。" 校验器会根据实际内容重新计算哈希，修改后的 ID 仍会导致不匹配。

## Taught in

[证据记录章节](../../../manuals/reverse-engineering-101/sections/5-1-the-evidence-record.md)给出了投影规则和重新计算 ID 的脚本，[错误参考](../../../manuals/reverse-engineering-101/sections/r-3-errors.md)展示了被拒绝的证据包，而[证据课程](../../../phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns/)用 Python 重新计算了每个录制的哈希值。
