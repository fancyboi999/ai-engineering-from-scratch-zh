# 顶点项目 09 —— 代码迁移 agent（仓库级语言 / 运行时升级）

> Amazon 的 MigrationBench（Java 8 到 17）和 Google 的 App Engine Py2-to-Py3 迁移器立下了 2026 年的标准。Moderne 的 OpenRewrite 大规模做确定性的 AST 重写。Grit 用 codemod 风格的 DSL 瞄准同一个问题。生产范式把两者结合：一个做安全重写的确定性底座，加一个处理含糊情形的 agent 层、一个做逐分支构建的沙箱，以及一个在 PR 打开前转绿的测试外壳。这个顶点项目就是迁移 50 个真实仓库，并发出一份带失败分类法的通过率。

**类型：** Capstone
**语言：** Python（agent）、Java / Python（目标）、TypeScript（看板）
**前置要求：** 第 5 阶段（NLP）、第 7 阶段（transformer）、第 11 阶段（LLM 工程）、第 13 阶段（工具）、第 14 阶段（agent）、第 15 阶段（自主系统）、第 17 阶段（基础设施）
**涉及阶段：** P5 · P7 · P11 · P13 · P14 · P15 · P17
**预计时间：** 30 小时

## 问题背景

大规模代码迁移是 2026 年编码 agent 最干净的生产应用之一。真值一目了然（迁移之后测试套件过不过？），回报很实在（一支 Java-8 舰队的迁移是一个按人头计的项目），基准也是公开的（MigrationBench 的 50 仓库子集）。Moderne 的 OpenRewrite 处理确定性那一侧。agent 层处理 OpenRewrite recipe 搞不定的一切：含糊的重写、构建系统漂移、长尾语法、传递性依赖破裂。

你将做一个 agent，它接收一个 Java 8 仓库（或 Python 2 仓库），产出一个 CI 转绿的迁移分支。你将衡量通过率、测试覆盖率保持、每仓库成本，并搭一份失败分类法。跟纯确定性基线的并排对比会告诉你 agent 的价值到底在哪里。

## 核心概念

流水线有两层。**确定性底座**（Java 用 OpenRewrite，Python 用 libcst）安全地跑完大部分机械重写：import、方法签名、空安全改动、try-with-resources、废弃 API 替换。它快，而且产出可审计的 diff。**agent 层**（OpenAI Agents SDK 或基于 Claude Opus 4.7 和 GPT-5.4-Codex 的 LangGraph）处理 recipe 搞不定的情形：构建文件升级（Maven/Gradle/pyproject）、传递性依赖冲突、测试抖动、自定义注解。

每个仓库拿到一个预装了目标运行时的 Daytona 沙箱。agent 迭代：跑构建、给失败归类、应用修复、重跑。硬限制：每仓库 30 分钟、每仓库 8 美元、20 个 agent 轮次。如果所有测试通过且覆盖率差值不为负，分支就开一个 PR。如果不行，仓库就连同证据归到某个失败类别下。

失败分类法就是交付物。50 个仓库里，什么坏了？传递性依赖？自定义注解？构建工具版本？跟迁移无关的测试抖动？每个类别拿到一个计数和一个示例 diff。未来的 recipe 作者可以瞄准前三名。

## 架构

```
target repo
      |
      v
OpenRewrite / libcst deterministic recipes
   (safe, fast, auditable, ~70-80% of fixes)
      |
      v
Daytona sandbox per branch
      |
      v
agent loop (Claude Opus 4.7 / GPT-5.4-Codex):
   - run build -> capture failures
   - classify failures (build, test, lint)
   - apply fix (patch or retry recipe)
   - rerun
   - budget: 30 min, $8, 20 turns
      |
      v
test + coverage delta gate
      |
      v (passed)
open PR
      |
      v (failed)
file under failure class + attach repro
```

## 技术栈

- 确定性底座：OpenRewrite（Java）或 libcst（Python）
- agent：OpenAI Agents SDK 或基于 Claude Opus 4.7 + GPT-5.4-Codex 的 LangGraph
- 沙箱：每分支一个 Daytona devcontainer，预装目标运行时（Java 17 / Python 3.12）
- 构建系统：Maven、Gradle、uv（Python）
- 基准：Amazon MigrationBench 50 仓库子集（Java 8 到 17）、Google App Engine Py2-to-Py3 仓库
- 测试外壳：并行运行器，覆盖率用 Jacoco（Java）或 coverage.py（Python）
- 可观测性：Langfuse + 每仓库一份带每个 diff 块的 trace 包
- 看板：失败分类法看板，带每类别计数和示例 diff

```figure
ce-migration-funnel
```

## 动手构建

1. **recipe 遍历。** 先跑 OpenRewrite（Java）或 libcst（Python）recipe。吃掉 70-80% 机械性的迁移。提交为一个 “recipe” commit。

2. **构建试跑。** Daytona 沙箱：装目标运行时，跑构建。绿了就跳到测试。红了就交棒给 agent。

3. **agent 循环。** 带工具的 LangGraph：`run_build`、`read_file`、`edit_file`、`run_test`、`git_diff`。agent 给失败归类（依赖、语法、测试、构建工具）并应用一个有针对性的修复。重跑。

4. **预算上限。** 每仓库墙钟 30 分钟、成本 8 美元、20 个 agent 轮次。任何越界就停下，连同当前 diff 归到 “budget_exhausted” 下。

5. **测试 + 覆盖率闸门。** 构建转绿后，跑测试套件。把覆盖率跟基线仓库比。如果覆盖率掉了超过 2%，归到 “coverage_regression” 下。

6. **开 PR。** 成功时，推分支，开 PR，带上 diff 和一份摘要，说明应用了哪些 recipe、agent 写了哪些 commit。

7. **失败分类法。** 对每个失败的仓库，打一个类别标签：`dep_upgrade_required`、`build_tool_drift`、`custom_annotation`、`test_flake`、`syntax_edge_case`、`budget_exhausted`。搭一个看板。

8. **50 仓库跑批。** 在 MigrationBench 子集上执行。报告每类别通过率、每仓库成本、覆盖率保持，以及一个对照纯确定性基线的对比。

## 实际使用

```
$ migrate legacy-java-service --target java17
[recipe]   27 rewrites applied (JUnit 4->5, HashMap initializer, try-with-resources)
[build]    FAIL: cannot find symbol sun.misc.BASE64Encoder
[agent]    turn 1 classify: removed_jdk_api
[agent]    turn 2 apply: sun.misc.BASE64Encoder -> java.util.Base64
[build]    OK
[tests]    412/412 passing; coverage 84.1% -> 84.3%
[pr]       opened #1841  cost=$3.20  turns=4
```

## 拿去用

`outputs/skill-migration-agent.md` 是交付物。给定一个仓库，它先跑确定性 recipe 再跑 agent 循环，产出一个转绿的迁移分支，或把仓库归到某个分类法类别下。

| 权重 | 标准 | 怎么衡量 |
|:-:|---|---|
| 25 | MigrationBench 通过率 | 50 仓库子集的 pass@1 |
| 20 | 测试覆盖率保持 | 对照基线的平均覆盖率差值 |
| 20 | 每迁移仓库成本 | 通过的跑批上的 $/仓库 |
| 20 | agent / 确定性工具集成 | OpenRewrite 处理的修复 vs agent 写的修复占比 |
| 15 | 失败分析撰写 | 分类法完整度，带示例 |
| **100** | | |

## 练习

1. 只用 OpenRewrite（不带 agent）跑迁移流水线。把通过率跟完整流水线比。找出仅靠 agent 才造成差别的那些情形。

2. 实现一个 “lint-clean” 检查：迁移后，跑一个风格 linter（Java 用 spotless，Python 用 ruff）。出现新的 lint 错误就让 PR 失败。衡量“覆盖率保住了但风格倒退了”的比率。

3. 加一个 “minimal-diff” 优化器：agent 的分支通过测试后，用第二遍裁掉不必要的改动。报告 diff 大小的缩减。

4. 扩展到第三种迁移：Node 18 到 Node 22。复用沙箱封装；把 recipe 层换成一个自定义 codemod。

5. 把“到首次构建转绿的时间”（TTFGB）作为一个体验指标来衡量。目标：p50 低于 10 分钟。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| Deterministic substrate（确定性底座） | “recipe 引擎” | OpenRewrite / libcst：带安全保证的声明式 AST 重写 |
| Codemod | “改代码的程序” | 一条机械修改源码的重写规则 |
| Build drift（构建漂移） | “工具版本偏移” | Maven / Gradle / uv 在大版本间细微的行为变化 |
| Failure class（失败类别） | “分类法桶” | 一个仓库没迁成的标注原因：依赖、语法、测试、构建工具、预算 |
| Coverage delta（覆盖率差值） | “覆盖率保持” | 从基线到迁移分支的测试覆盖率百分比变化 |
| Agent turn（agent 轮次） | “工具调用回合” | agent 循环里一个 plan -> act -> observe 周期 |
| Budget exhaustion（预算耗尽） | “撞上限了” | 仓库耗光了它的 30 分钟 / 8 美元 / 20 轮限额仍没通过 |

## 延伸阅读

- [Amazon MigrationBench](https://aws.amazon.com/blogs/devops/amazon-introduces-two-benchmark-datasets-for-evaluating-ai-agents-ability-on-code-migration/) —— 2026 年的标准基准
- [Moderne.io OpenRewrite platform](https://www.moderne.io) —— 确定性底座参考
- [OpenRewrite documentation](https://docs.openrewrite.org) —— recipe 编写
- [Grit.io](https://www.grit.io) —— 备选 codemod DSL
- [OpenAI sandboxed migration cookbook](https://developers.openai.com/cookbook/examples/agents_sdk/sandboxed-code-migration/sandboxed_code_migration_agent) —— Agents SDK 参考
- [Google App Engine Py2 to Py3 migrator](https://cloud.google.com/appengine) —— 备选迁移基准
- [libcst](https://github.com/Instagram/LibCST) —— Python 确定性底座
- [Daytona sandboxes](https://daytona.io) —— 参考级逐分支沙箱
