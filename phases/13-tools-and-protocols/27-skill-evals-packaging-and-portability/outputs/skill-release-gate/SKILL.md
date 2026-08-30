---
name: skill-release-gate
description: 在发布前评估 Agent Skill bundle 的结构完整性、触发质量、产物改进、脚本正确性、安全性、已安装目录树完整性和目标宿主可移植性。
license: MIT
metadata:
  lesson: "27"
---

# Skill 发布门禁

在发布或分发 Agent Skill 目录 bundle 前使用此 skill。

## 工作流

1. 将 `SKILL_ROOT` 解析为包含本已安装 `SKILL.md` 的绝对目录。不要假定进程 cwd 就是已安装 bundle。
2. 从原始工作区工作目录解析 `TARGET_ROOT`，并将用户提供的候选解析为绝对 `TARGET_BUNDLE`。
3. 从 `SKILL_ROOT` 读取 `references/eval-contract.md`。
4. 检查 `TARGET_BUNDLE` 下 `evals/cases.json` 中的正例和近似请求触发案例。
5. 检查 `TARGET_BUNDLE` 下 `evals/artifacts.json` 中共享的 baseline 与使用 skill 后断言。
6. 检查 `TARGET_BUNDLE` 下 `evals/evidence.json` 中显式的脚本和安全结果。
7. 检查 `TARGET_BUNDLE` 下 `assets/hosts.json` 声明的运行时能力，并对照其 `assets/manifest.json` 验证目标文件哈希。
8. 对于生产，用捕获结果替换确定性预测、产物、证据和宿主能力；设置四种捕获模式；并将每个原始触发观察、两份产物、完整证据集和非空宿主矩阵绑定到非空来源及匹配的 SHA-256 溯源摘要。这些本地检查可设置 `localEvidenceReady`，但可在本地重算的哈希不能证明捕获真实性。
9. 获取一份外部 JSON 证明，其 `evidenceRoot` 与报告相匹配；并从独立受信策略或发布渠道获得其精确字节的 SHA-256。证明必须是目标 bundle 外的常规文件。
10. 执行前展示精确解析后的 argv。已安装评估器位于 `SKILL_ROOT` 下的 `scripts/evaluate_skill.py`。对随附课程 fixture，用 `python3`、该绝对评估器路径、`--fixture-demo` 和绝对 `TARGET_BUNDLE` 构建 argv。对生产，使用同一已安装脚本并传入 `--attestation`、`--trusted-attestation-sha256` 和绝对 `TARGET_BUNDLE`，但不传 `--fixture-demo`。
11. 返回 `checksPassed`、`fixturePassed`、`localEvidenceReady`、`trustAnchorValid`、`productionReady` 和 `passed`，同时给出证据根、评估模式、失败检查、精确率、召回率、每个原始触发观察、每案例重复运行率、产物比较、脚本和安全证据、已安装目录树验证及可移植性矩阵。包含已解析脚本路径、已解析目标路径、cwd、精确 argv 和退出码。将不可用观察标为未验证。

## Output contract

返回完整 JSON 评估报告。保留每项分层检查及其证据，避免一个通过的汇总掩盖路由、产物、脚本、安全、已安装目录树或可移植性失败。`fixturePassed` 表示教学 fixture 成功；`localEvidenceReady` 仅表示本地摘要完整性；只有 `productionReady` 也具有有效的包外信任锚时，`passed` 才为 true。

## Failure behavior

若配置无效、溯源缺失或不匹配、受信证明缺失或无效、文件哈希不同、必需能力缺失，或任一生产门禁失败，均以非零结果停止并报告失败层。显式 `--fixture-demo` 路径仅在 `fixturePassed` 为 true 时才可成功退出，且绝不作出发布声明。绝不自动发布、安装到其他位置、修复证据、创建信任决策或放宽阈值。

不要仅因 SKILL.md 能解析或一个正例 prompt 被激活就发布 bundle。目标宿主丢弃必需伴随文件或忽略必需运行时扩展时，不要将包标为可移植。
