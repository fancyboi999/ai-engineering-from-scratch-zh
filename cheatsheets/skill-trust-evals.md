---
id: skill-trust-evals
title: Skill 权限、评估与供应链
code: SE
subtitle: 运行前审查 skill 动作，隔离执行，按评估层把关每次发布，并扫描技能包。
hue: 340
sources: phases/13-tools-and-protocols/26-skill-permissions-sandboxes-and-trust, phases/13-tools-and-protocols/27-skill-evals-packaging-and-portability, phases/14-agent-engineering/10-skill-libraries-voyager, projects/skill-scanner, projects/self-improving-skill-loop
source_hash: a19b07225ba81162
---

## 现象、原因与修正
type: troubleshooting
from: phases/13-tools-and-protocols/26-skill-permissions-sandboxes-and-trust/docs/zh.md, phases/13-tools-and-protocols/26-skill-permissions-sandboxes-and-trust/code/main.py, phases/13-tools-and-protocols/27-skill-evals-packaging-and-portability/docs/zh.md, phases/13-tools-and-protocols/27-skill-evals-packaging-and-portability/code/main.py, projects/self-improving-skill-loop/README.md, projects/self-improving-skill-loop/solution/dataset.py

| 现象 | 原因 | 修正 |
|---|---|---|
| `deny`，规则为 `workspace-jail` | 目标解析到根目录之外 | 目标保持在 `workspace_root` 下 |
| `approved=True` 仍被 `command-review` 拒绝 | `rm` 在 `DESTRUCTIVE_EXECUTABLES` 中 | 批准不能覆盖它，使用范围更窄的工具 |
| 8443 端口被 `network-allowlist` 拒绝 | 8443 端口属于不同来源 | 将该来源连同端口加入 |
| 白名单 URL 触发 `approval-gate` | `influenced_by_untrusted_content` 为 true | 展示目标与后果，取得批准 |
| `secret-review` 拒绝 | 载荷匹配 `SECRET_PATTERNS` | 将凭据注入一个范围受限的工具 |
| Lint 问题 `orphan-file` | `SKILL.md` 未引用该文件 | 引用或移除文件 |
| `fixture_passed` 为 true，`passed` 为 false | 没有可信外部证明 | 传入 `--attestation` 与 `--trusted-attestation-sha256` |
| 审计 `usable` 为 false | 两个分区包含相同内容或分组 | 划分前按内容与分组做并集合并 |

## review_action 检查顺序
type: flow
from: phases/13-tools-and-protocols/26-skill-permissions-sandboxes-and-trust/code/main.py

1. **policy-change**：始终按规则 `authority-boundary` 返回 `deny`。
2. **类型**：不在 `allowed_kinds` 的类型触发 `kind-allowlist` 拒绝。
3. **路径**：读、写、删都经 `normalize_workspace_path` 解析。越界触发 `workspace-jail`。
4. **命令**：`inspect_command` 检查裸命令名、破坏性集合、元字符和 argv 前缀。
5. **网络**：`normalize_https_origin` 添加有效端口。来源必须在白名单中。
6. **密钥**：`contains_secret` 命中时返回 `deny`；启用 `permit_secret_use_after_approval` 时返回 `require-approval`。
7. **批准**：`approval_kinds` 与不可信影响要求 `approved`，否则触发规则 `approval-gate`。
8. **允许**：规则为 `policy-allow`。`executed` 字段仍为 false。

## 审查一个动作
type: annotated-code
lang: python
from: phases/13-tools-and-protocols/26-skill-permissions-sandboxes-and-trust/code/main.py, phases/13-tools-and-protocols/26-skill-permissions-sandboxes-and-trust/docs/zh.md

```python
policy = SandboxPolicy(
    workspace_root=workspace,                            # 使用 strict=True 解析
    allowed_kinds=("read", "write", "delete", "command", "network"),
    command_allowlist=(("python3", "-m", "unittest"),),  # argv 前缀
    network_allowlist=("https://docs.example.test",),    # 仅来源
)
request = ActionRequest("write", target="summary.json")  # write 属于 approval_kinds
review_action(policy, request).to_dict()["verdict"]      # "require-approval"
request = ActionRequest("write", target="summary.json", approved=True)
review_action(policy, request).rule                      # "policy-allow"
normalize_https_origin("https://api.example.test")       # 添加 ":443"
```

## 运行实验与工具
type: command-table
span: 2
from: phases/13-tools-and-protocols/26-skill-permissions-sandboxes-and-trust/docs/zh.md, phases/13-tools-and-protocols/26-skill-permissions-sandboxes-and-trust/outputs/skill-safety-reviewer/SKILL.md, phases/13-tools-and-protocols/27-skill-evals-packaging-and-portability/docs/zh.md, projects/skill-scanner/README.md, projects/self-improving-skill-loop/README.md

| 命令 | 作用 |
|---|---|
| `python3 code/main.py` | 打印演示决策，不启动进程 |
| `python3 -m unittest discover -s code/tests -v` | 运行课程测试 |
| `python3 scripts/review_action.py --policy <policy> --request <request>` | 返回单次请求的结论与规则 |
| `evaluate_skill.py --fixture-demo <bundle>` | 夹具运行；`fixturePassed` 为 true，`productionReady` 为 false |
| `scanner examples/reviewable 3` | 以阈值 3 扫描技能包，打印 JSON |
| `cli.py <cases> --out experiment.json` | 提出规则并运行门槛，不自动晋升 |
| `python3 scripts/project_test.py <project> --all --solution --strict` | 检查参考实现的所有阶段 |

## 运行隔离演练
type: annotated-code
lang: bash
from: phases/13-tools-and-protocols/26-skill-permissions-sandboxes-and-trust/docs/zh.md

```bash
docker build -f code/sandbox/Containerfile -t aiefs-skill-sandbox code/sandbox
docker run --rm --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges --pids-limit 64 --memory 128m --cpus 0.5 \
  --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  --mount type=bind,src="${PWD}/code/sandbox/input",dst=/input,readonly \
  --env DEMO_VALUE=bounded aiefs-skill-sandbox
# 预期：/input 可读，镜像只读，网络失败
```

## 默认值与限制
type: defaults
from: phases/13-tools-and-protocols/26-skill-permissions-sandboxes-and-trust/code/main.py, phases/13-tools-and-protocols/27-skill-evals-packaging-and-portability/code/main.py, projects/self-improving-skill-loop/solution/promotion.py, projects/skill-scanner/solution/cli.rs

| 设置 | 默认值 | 说明 |
|---|---|---|
| `allowed_kinds` | `("read",)` | `SandboxPolicy` 只允许读取 |
| `approval_kinds` | `("write", "delete", "network")` | 这些类型需要 `approved` |
| `MAX_SKILL_BODY_CHARS` | 10_000 | 超过时产生 lint 问题 `body-size` |
| `MAX_COMPANION_FILE_BYTES` | 1_000_000 | 超过时产生 lint 问题 `file-size` |
| `min_precision`, `min_recall` | 0.8 | 实验中的 `ReleaseThresholds` |
| `min_repeat_rate` | 0.9 | 最低单用例通过率 |
| `min_gain` | 0.05 | 循环门槛还要求零回归 |
| 扫描器阈值 | 3 | 阈值为 0 会报错 |

## 隔离边界
type: comparison
from: phases/13-tools-and-protocols/26-skill-permissions-sandboxes-and-trust/docs/zh.md

| 比较项 | 受限子进程 | 容器 | MicroVM |
|---|---|---|---|
| 隔离内容 | 环境、cwd、超时、输出 | 文件系统与进程命名空间 | 独立客户机内核 |
| 未隔离内容 | 内核、主机文件系统、网络 | 共享内核、主机挂载 | 错误挂载、凭据、出口 |
| 常见用途 | 已评审本地工具 | 仓库构建与测试 | 不可信代码、高影响操作 |

## 六层评估
type: concepts
from: phases/13-tools-and-protocols/27-skill-evals-packaging-and-portability/docs/zh.md

- **结构**：不调用模型的 lint。CI 阻断 `E_*` 错误，允许已评审的 `W_*` 警告。
- **路由**：对正例、明确负例与近似误命中计算精确率与召回率。报告原始计数。
- **行为**：基线组与实验组使用相同模型、工具、任务和预算。
- **脚本**：在模型运行之外，用空输入、畸形输入和重复输入测试。
- **安全**：记录控制措施：仅指令、工具政策、批准、沙箱或验证。
- **可移植性**：安装到干净目标目录，验证安装副本。
- **结论**：`fixturePassed`、`localEvidenceReady`、`productionReady`。`passed` 跟随 `productionReady`。

## 项目流水线
type: architecture
from: projects/skill-scanner/solution, projects/self-improving-skill-loop/solution

```arch
node | spans | 1,1 | spans | UTF-8 字节偏移量 | process
node | scan | 2,1 | scan | 三条命名规则 | process
node | score | 3,1 | risk_score | 每条规则每行一次 | process
node | review | 4,1 | review | 需要评审或低于阈值 | client
node | split | 1,2 | split_cases | 内容与分组并集 | store
node | eval | 2,2 | evaluate | 逐用例记录 | process
node | prop | 3,2 | propose | 开发集错误，min_support 2 | process
node | gate | 4,2 | gate | 增益与回归 | client
edge | spans | scan | 行
edge | scan | score | 发现
edge | score | review | 分数
edge | split | eval | 开发集
edge | eval | prop | 错误
edge | prop | gate | 候选
```

## 代码任务
type: task-table
span: 2
from: phases/13-tools-and-protocols/27-skill-evals-packaging-and-portability/code/main.py, phases/14-agent-engineering/10-skill-libraries-voyager/code/main.py, projects/self-improving-skill-loop/solution

| 任务 | 代码 |
|---|---|
| 对技能包做 lint | `lint_package(root)` |
| 为路由评分 | `classification_metrics(expected, predicted)` |
| 检查安装副本 | `verify_manifest(root, expected)` |
| 主机支持矩阵 | `portability_matrix(requirements, hosts)` |
| 无泄漏划分 | `split_cases(cases, holdout_fraction=0.25)` |
| 提出规则 | `propose(development, rules, min_support=2)` |
| 把关候选方案 | `gate(holdout, baseline, candidate)` |
| 改进库中 skill | `register(skill, dedup=True)` 提升版本 |

## 问答
type: qa
span: 2
from: phases/13-tools-and-protocols/26-skill-permissions-sandboxes-and-trust/docs/zh.md, projects/skill-scanner/README.md, phases/14-agent-engineering/10-skill-libraries-voyager/docs/zh.md, projects/self-improving-skill-loop/stages/04-promotion/docs/zh.md

- **`allowed-tools` 能把 skill 放入沙箱吗？** 不能。它影响能力或权限提示，不提供操作系统隔离。
- **哈希能证明包安全吗？** 不能。它只证明字节与清单匹配。
- **低于阈值的扫描就安全吗？** 不是。只表示这些规则没有超过阈值。
- **为何给 skill 编版本？** 固定在 v1 的父 skill 不会自动使用改进后的 v3。
- **为何轮换留出集？** 反复在同一留出集上调优会泄漏信息。
