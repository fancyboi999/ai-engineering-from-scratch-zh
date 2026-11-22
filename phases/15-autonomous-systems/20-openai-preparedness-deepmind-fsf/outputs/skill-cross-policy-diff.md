---
name: cross-policy-diff
description: 以 OpenAI Preparedness Framework v2、Anthropic RSP v3.0 和 DeepMind FSF v3 为参照，针对某一具体能力做跨策略对比。
version: 1.0.0
phase: 15
lesson: 20
tags: [preparedness-framework, fsf, rsp, cross-policy, scaling-policy]
---

给定一项具体的前沿能力（例如"长程自主""自主复制与适应""研发自动化"），产出一份跨策略对比，说明三个框架分别如何归类这项能力、会触发哪些缓解措施。

产出：

1. **OpenAI PF v2 归类。** Tracked 还是 Research。若是 Tracked，写明 Capabilities + Safeguards Report 的触发条件。若是 Research，注明策略原文用的是"潜在"缓解措施。
2. **Anthropic RSP v3.0 归类。** 属于哪个阈值（ASL-3、AI R&D-4、硬编码禁令）？对应哪种缓解（肯定性论证、安全 + 部署）？确认该承诺属于 Anthropic 单方面层，还是全行业建议层。
3. **DeepMind FSF v3 归类。** 属于哪个领域（CBRN、Cyber、Harmful Manipulation、ML R&D）？对应哪个 CCL 或 Tracked Capability Level？是否启用了欺骗性对齐监控？
4. **趋同总结。** 三个策略对该能力严重程度的判断是否一致，还是存在实质分歧？哪种归类最严格，哪种最宽松？
5. **测量依赖。** 每种归类都依赖能力测量。写明这项能力如何测量，以及由哪个评测方（METR、Apollo、内部、第三方）负责测量。

直接否决：
- 仅凭公告措辞相似、没有文件层面证据就声称跨策略一致。
- 指不出源文件中具体条款的任何归类。
- 把（OpenAI 的）"Research Category"等同于"Tracked Category"。两者的运营后果不同。

拒绝规则：
- 用户拿不出每项归类对应的源文件段落时，拒绝，要求先提供引用。
- 用户把策略的存在当作缓解措施已落实的证据时，拒绝，要求提供具体缓解措施实际触发过的证据。
- 声称某框架"覆盖"了这项能力、但文件中根本没出现这个词时，拒绝，要求给出具体条款引用。

输出格式：

返回一份对比文档，包含：
- **能力定义**（一句话）
- **OpenAI PF v2 行**（归类、触发条件、源条款）
- **Anthropic RSP v3.0 行**（归类、触发条件、单方面还是建议）
- **DeepMind FSF v3 行**（领域、CCL / TCL、是否涉及欺骗性对齐）
- **趋同总结**（一致之处 + 实质分歧）
- **测量归属**（评测方、评测节奏）
- **给读者的建议**（最严格、最宽松，附理由）
