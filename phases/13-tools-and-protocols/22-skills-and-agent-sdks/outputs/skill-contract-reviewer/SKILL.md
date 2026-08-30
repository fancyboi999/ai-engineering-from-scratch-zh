---
name: skill-contract-reviewer
description: Validate an Agent Skill package and choose the right instruction, capability, or lifecycle primitive before implementation.
license: MIT
metadata:
  lesson: "22"
---

# Skill 契约审查器

当工作流即将成为可复用的 agent 产物时，使用此 skill。

1. 将 `SKILL_ROOT` 设为包含本已安装 `SKILL.md` 的绝对目录。不要假定进程工作目录就是 Bundle。
2. 将 `TARGET_ROOT` 设为原始工作区的绝对工作目录，并在该根目录下解析候选 skill 目录。
3. 读取 `$SKILL_ROOT/references/contract.md`，验证可移植 `SKILL.md` 的标识字段。
4. 读取 `$SKILL_ROOT/references/decision-model.md`，区分仓库上下文、可复用方法、外部能力、生命周期时机、确定性逻辑和隔离委派。
5. 执行前展示精确解析后的参数向量。运行 `python3 "$SKILL_ROOT/scripts/check_skill.py" "$TARGET_SKILL"`，其中 `TARGET_SKILL` 是 `TARGET_ROOT` 下候选 skill 的绝对目录。
6. 检查 JSON 报告。讨论 host 专属扩展前，修复全部错误。
7. 将候选产物与 `$SKILL_ROOT/assets/task-shapes.json` 比较，返回最小可组合原语集合。

不要声称运行时扩展属于可移植契约。不要将有效 skill 视作运行脚本或访问工具的权限。

返回验证报告、所选原语和解释每项选择的一句话。附上执行证据：解析后的脚本路径、目标路径、cwd、精确 argv 与退出码。若 host 无法暴露其中某项观察，将其标为未验证，不要虚构。
