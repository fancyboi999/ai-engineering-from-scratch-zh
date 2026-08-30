---
name: skill-catalog-builder
description: 在明确的发现 scope 中构建受限的 Agent Skill 目录，并在加载指令正文前报告冲突。
license: MIT
metadata:
  lesson: "24"
---

# Skill 目录构建器

当 agent 宿主需要跨多个 skill 目录进行确定性发现时使用此 skill。

1. 阅读 `references/discovery-contract.md`。
2. 查看 `assets/scope-policy.json` 中的宿主策略示例；不要假设其顺序具有通用性。
3. 以从最高到最低的优先级列出 scope，运行 `python3 scripts/build_catalog.py project=PATH user=PATH`。
4. 激活 skill 前检查 JSON 的 `collisions` 和 `omitted` 数组。
5. 只加载选中的 SKILL.md 正文；仅当正文点名时才加载直接引用。

发现期间绝不执行打包脚本；绝不按偶然的文件系统顺序选择同优先级重复项。

返回目录预算、选中条目、冲突解决结果和省略项。
