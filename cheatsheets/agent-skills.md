---
id: agent-skills
title: Agent 技能：发现、调用与路由
code: AR
subtitle: 编写、安装、发现、调用和路由 SKILL.md 包。涵盖校验器、目录、路由器与安装器项目。
hue: 130
sources: phases/13-tools-and-protocols/22-skills-and-agent-sdks, phases/13-tools-and-protocols/24-skill-discovery-and-progressive-disclosure, phases/13-tools-and-protocols/25-skill-invocation-and-routing, projects/skill-router, projects/skill-installer, projects/skill-validator
source_hash: 3bff595d16a2b5e3
---

## 技能生命周期
type: flow
from: phases/13-tools-and-protocols/22-skills-and-agent-sdks/docs/zh.md

1. **发现**：在配置的位置查找包。
2. **校验**：在编入目录前拒绝格式错误或不安全的包。
3. **编目**：只公开 `name` 和 `description`。
4. **选择**：判断技能是否与请求相关。
5. **激活**：把正文加载到模型可见的上下文中。
6. **披露**：仅在某个执行分支需要时读取引用或资源。
7. **执行**：按宿主的权限和隔离规则使用宿主工具。
8. **验证**：独立检查产物，不只听取模型的声明。

## 安装、调用与移除
type: command-table
span: 2
from: phases/13-tools-and-protocols/22-skills-and-agent-sdks/docs/zh.md, phases/13-tools-and-protocols/25-skill-invocation-and-routing/docs/zh.md

| 命令 | 作用 |
|---|---|
| `npx skills add rohitg00/ai-engineering-from-scratch --skill skill-contract-reviewer --full-depth` | 安装含引用、脚本和资源的嵌套包 |
| `/skill-contract-reviewer <request>` | 在支持 `/skill-name` 语法的宿主中显式调用 |
| `/skills` | 在 Codex 界面中按名称选择技能 |
| `python3 <SKILL_ROOT>/scripts/check_skill.py <TARGET_ROOT>/my-first-skill` | 运行包内校验器。展示 argv、cwd 和退出码 |
| `npx skills remove skill-contract-reviewer` | 移除包。使用相同的宿主和作用域 |
| `python3 scripts/install_skills.py /tmp/aiefs-skills --phase 13 --type skill` | 复制第 13 阶段的包，并写入 `manifest.json` |
| `python3 -m unittest discover -s code/tests -v` | 运行课程测试套件 |

## 项目运行与评分
type: task-table
span: 2
from: projects/skill-router/README.md, projects/skill-installer/README.md, projects/skill-installer/solution/cli.ts, projects/skill-validator/README.md

| 任务 | 代码 |
|---|---|
| 创建学习工作区 | `python3 scripts/project_test.py skill-router --init learning-artifacts/skill-router` |
| 对一个阶段评分 | `python3 scripts/project_test.py skill-router --stage 1 --path learning-artifacts/skill-router` |
| 路由示例请求 | `node learning-artifacts/skill-router/cli.ts projects/skill-router/examples/skills projects/skill-router/examples/request.json` |
| 预演安装 | `node learning-artifacts/skill-installer/cli.ts inspect projects/skill-installer/examples/orchard-release.json codex` |
| 实际安装 | `cli.ts install bundle.json agent root expected-source-digest` |
| 构建校验器 | `rustc --edition=2021 learning-artifacts/skill-validator/cli.rs -o learning-artifacts/skill-validator/validator` |
| 校验并在 2000 字符预算内加载 | `validator projects/skill-validator/examples/orchard-release 2000 --activate references/restore.md` |
| 检查参考解答 | `python3 scripts/project_test.py skill-validator --all --solution --strict` |

## 校验、编目、披露与路由（课程）
type: annotated-code
lang: python
from: phases/13-tools-and-protocols/22-skills-and-agent-sdks/docs/zh.md, phases/13-tools-and-protocols/24-skill-discovery-and-progressive-disclosure/code/main.py, phases/13-tools-and-protocols/25-skill-invocation-and-routing/code/main.py

```python
report = validate_skill_text(text, directory_name, allowed_runtime_extensions=())
select_primitives(task)                          # 代码、技能、钩子、子 agent、工具
candidates = (*discover_scope(Scope("project", project_root)),
              *discover_scope(Scope("user", user_root)))  # 仅直属子目录
catalog = build_catalog(candidates, precedence=("project", "user"),
                        budget=CatalogBudget(max_entries=10, max_catalog_chars=2_000))
body = load_skill_body(selected, candidates)     # 第 2 层
reference = load_reference(selected, "references/format.md")  # 第 3 层
validate_reference(skill_directory, reference)   # 阻止路径遍历与越界
route_request(skills, request, adapter)          # 先检查资格，再排名
build_invocation_matrix(policy)                  # 人类与模型的调用视图
```

## 路由器与安装器（项目）
type: annotated-code
lang: ts
from: projects/skill-router/solution/main.ts, projects/skill-router/solution/cli.ts, projects/skill-installer/solution/main.ts

```ts
const skills = await loadCatalog(root);            // SKILL.md 与 routing.json
rank(skills, query, files);                        // 关键词 2 分，路径 3 分
plan(skills, selected, allowed);                   // 依赖优先
route(skills, query, files, allowed, margin = 1);  // ready、no-match、ambiguous、blocked
safePath(name);                                    // 拒绝 ..、绝对路径、C:、反斜杠
const files = translate(bundle, agent);            // 新的引号包裹头部，正文不变
const expected = digest(bundle.files);             // 排序后键值对的 SHA-256
await install(root, bundle, agent, expectedDigest);  // 分阶段重命名，保留备份
```

## 人类与模型调用
type: comparison
from: phases/13-tools-and-protocols/25-skill-invocation-and-routing/docs/zh.md

| 比较项 | 共享 | 仅人类 | 仅模型 | 禁用 |
|---|---|---|---|---|
| 人类可调用 | 是 | 是 | 否 | 否 |
| 模型可调用 | 是 | 否 | 是 | 否 |
| 一个宿主字段 | 默认 | `disable-model-invocation: true` | `user-invocable: false` | 未定义 |
| 示例 | 测试规划 | 发布准备 | 内部风格指南 | 已弃用的包 |

## 限制与默认值
type: defaults
from: phases/13-tools-and-protocols/22-skills-and-agent-sdks/code/main.py, phases/13-tools-and-protocols/24-skill-discovery-and-progressive-disclosure/code/main.py, phases/13-tools-and-protocols/25-skill-invocation-and-routing/code/main.py, projects/skill-router/solution/main.ts, projects/skill-installer/solution/main.ts

| 设置 | 默认值 | 说明 |
|---|---|---|
| `name` 长度 | 64 | 小写单词以连字符连接 |
| `description` 长度 | 1024 | 说明做什么、何时使用 |
| `compatibility` 长度 | 500 | 可选核心字段 |
| `max_description_chars` | 240 | `CatalogBudget` 的单项预算 |
| `max_catalog_chars` | 8_000 | `CatalogBudget` 的总预算 |
| `max_chars` | 12_000 | 正文和引用加载 |
| `model_threshold` | 0.2 | 隐式选择的最低阈值 |
| 路由器 `margin` | 1 | 分差更小时判为歧义 |

## 故障与修正
type: troubleshooting
from: projects/skill-router/solution/main.ts, projects/skill-installer/solution/main.ts, projects/skill-installer/solution/cli.ts, projects/skill-validator/solution/stage1.rs, projects/skill-installer/stages/04-upgrades/docs/zh.md, phases/13-tools-and-protocols/22-skills-and-agent-sdks/docs/zh.md, phases/13-tools-and-protocols/24-skill-discovery-and-progressive-disclosure/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| `no-match` | 关键词或路径均未得分 | 在 routing.json 中添加 `keywords` 或 `paths` |
| `ambiguous` | 前两名分差小于 `margin` | 明确区分触发边界 |
| `blocked`，伴随 `permission denied` | 技能或依赖需要更多权限 | 授权或选择其他路线 |
| `unsupported YAML syntax` | 使用标签、别名、多行或流式值 | 使用普通标量或双引号标量 |
| `integrity mismatch` | 包摘要与预期摘要不同 | 运行 `inspect`，比较 `source_digest` |
| `modified installation` | 安装后有受跟踪文件被修改 | 将修改移入源包 |
| 安装后技能不可用 | 宿主未重新扫描目录 | 新建会话或重新扫描后重试 |
| 模型从不选择该技能 | 描述模糊，或被预算截掉 | 检查发现日志和目录大小 |

## 编写规则
type: tips
from: phases/13-tools-and-protocols/24-skill-discovery-and-progressive-disclosure/docs/zh.md, phases/13-tools-and-protocols/25-skill-invocation-and-routing/docs/zh.md, phases/13-tools-and-protocols/22-skills-and-agent-sdks/docs/zh.md

- `name` 必须与父目录名一致。
- 描述分两部分：一部分说明能力，另一部分说明触发边界。
- 两个技能共享词语时，补充不适用边界，并测试近似但不匹配的请求。
- 先筛选资格，再排名。没有足够高的得分时不做选择。
- 不要把原始参数插入 shell 命令。
- 写明依赖技能与备用方案。依赖不可用时停止。

## 问答
type: qa
from: phases/13-tools-and-protocols/22-skills-and-agent-sdks/docs/zh.md, phases/13-tools-and-protocols/25-skill-invocation-and-routing/docs/zh.md, projects/skill-router/README.md, projects/skill-installer/README.md

- **用技能还是钩子？** 每个事件都必须执行时用钩子。需要模型判断时用技能。
- **用技能还是 MCP 工具？** 类型化的外部能力用工具。操作流程用技能。
- **显式名称会绕过策略吗？** 不会。仍要通过全部检查。
- **路由器会执行技能吗？** 不会。它只输出计划和解释。
- **安装成功能证明已激活吗？** 不能。agent 必须发现它。
