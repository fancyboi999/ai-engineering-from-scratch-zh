---
name: migration-agent
description: 构建仓库级代码迁移 agent，把确定性改写规则与 agent 兜底循环结合起来，通过 MigrationBench，并发布失败分类。
version: 1.0.0
phase: 19
lesson: 09
tags: [capstone, code-migration, openrewrite, libcst, migrationbench, agent, sandbox]
---

给定一个 Java 8 或 Python 2 仓库，产出一个迁移后的分支（迁到 Java 17 或 Python 3.12），测试套件全绿，覆盖率回退尽量小。在 50 个仓库的 MigrationBench 子集上评估。

构建计划：

1. 确定性改写：先用 OpenRewrite（Java）或 libcst（Python）做机械式改写。作为"recipe"提交单独 commit，diff 保持干净。
2. Daytona 沙箱：预装目标运行时；每个分支单独构建；源码以只读方式挂载。
3. agent 循环：基于 Claude Opus 4.7 + GPT-5.4-Codex，用 LangGraph 或 OpenAI Agents SDK 搭建。工具：`run_build`、`read_file`、`edit_file`、`run_test`、`git_diff`。对失败分类（依赖、语法、测试、构建工具），做针对性修复，再重跑。
4. 预算上限：30 分钟、$8、20 轮。超出任何一项就停止，连同当前 diff 归档到 `budget_exhausted`。
5. 测试 + 覆盖率门禁：先构建通过，再测试通过；覆盖率下降不得超过 2%。
6. 开 PR，包含 recipe commit + agent commit + 一条总结评论。
7. 失败分类：为每个仓库从 `{dep_upgrade_required, build_tool_drift, custom_annotation, test_flake, syntax_edge_case, budget_exhausted, coverage_regression}` 中打标签。
8. 在 MigrationBench 上跑 50 个仓库；发布各类别的通过率、每个仓库的成本和覆盖率保持情况；与只用确定性改写的基线对比。

评分标准：

| 权重 | 评分项 | 衡量方式 |
|:-:|---|---|
| 25 | MigrationBench 通过率 | 50 仓库子集上的 pass@1 |
| 20 | 测试覆盖率保持 | 相对基础分支的平均覆盖率变化 |
| 20 | 每个迁移仓库的成本 | 通过的运行中平均 $/repo |
| 20 | agent 与确定性工具的配合 | 由 OpenRewrite 与由 agent 完成的修复各占多少 |
| 15 | 失败分析报告 | 分类体系的完整度及示例 |

直接否决：

- 流水线跳过确定性改写。机械式的那 70-80% 工作，OpenRewrite 做得比任何 agent 都便宜、都可靠。
- 覆盖率回退超过 2% 仍算作通过。
- PR 把机械改动和 agent 写的改动塞进同一个 commit。必须分开。
- 报告通过率时，没有在同样 50 个仓库上跑只用确定性改写的对照基线。

拒绝规则：

- 拒绝把迁移后的分支强推覆盖基础分支。一律新建分支 + PR。
- CI 在沙箱里还没变绿时，拒绝开 PR。
- 没有明确的修改许可时，拒绝在公司仓库上运行。

输出：一个仓库，包含两层迁移流水线、50 个仓库的 MigrationBench 运行日志、失败分类看板、一次对照的只用确定性改写的基线运行，以及一份说明文档，分析三类最常见的失败，以及能消除每一类的 recipe 改动。
