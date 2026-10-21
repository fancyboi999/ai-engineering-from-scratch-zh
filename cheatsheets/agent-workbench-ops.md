---
id: agent-workbench-ops
title: 仓库记忆、初始化脚本与交接
code: RM
subtitle: 明确任务边界，用经过 schema 校验的文件保存状态，启动前探测环境，每次会话结束时生成交接包。
hue: 30
sources: phases/14-agent-engineering/34-repo-memory-and-state, phases/14-agent-engineering/35-initialization-scripts, phases/14-agent-engineering/40-multi-session-handoff, phases/14-agent-engineering/41-workbench-for-real-repos, phases/14-agent-engineering/43-frame-the-task-before-code
source_hash: 487539f1058bcfbb
---

## 一次工作台会话
type: flow
from: phases/14-agent-engineering/41-workbench-for-real-repos/docs/zh.md, phases/14-agent-engineering/43-frame-the-task-before-code/docs/zh.md, phases/14-agent-engineering/35-initialization-scripts/docs/zh.md, phases/14-agent-engineering/40-multi-session-handoff/docs/zh.md

1. **定义边界**：编辑前写清目标、事实、路径、验收条件和未知项。
2. **初始化脚本**：探测工作台。失败时停止并向人报告。
3. **读取**：加载范围契约和 `agent_state.json`。
4. **编辑**：只修改允许的文件。
5. **证明**：通过反馈运行器执行验收命令。
6. **评判**：先运行验证门禁，再运行评审器。
7. **清理**：`clean_state.json` 必须包含空列表。
8. **交接**：生成 `handoff.md` 和 `handoff.json`。

## 命令
type: command-table
span: 2
from: phases/14-agent-engineering/34-repo-memory-and-state/docs/zh.md, phases/14-agent-engineering/35-initialization-scripts/code/main.py, phases/14-agent-engineering/40-multi-session-handoff/docs/zh.md, phases/14-agent-engineering/41-workbench-for-real-repos/docs/zh.md, phases/14-agent-engineering/43-frame-the-task-before-code/docs/zh.md, phases/14-agent-engineering/43-frame-the-task-before-code/code/main.py

| 命令 | 作用 |
|---|---|
| `python3 code/main.py` | 运行课程演示。各演示把文件写在脚本旁 |
| 第 34 课中的 `python3 code/main.py` | 写入 `workdir/agent_state.json` 和 `workdir/task_board.json` |
| `python3 code/main.py --no-cache` | 第 35 课：忽略 `prereqs.lock`，运行全部探测 |
| `python3 code/main.py --write-lkg` | 第 35 课：将当前 HEAD 固定为最后已知良好版本 |
| `git diff --name-only <baseline> HEAD` | `lkg_diff` 探测所用命令 |
| 第 40 课中的 `python3 code/main.py` | 写入 `handoff.md` 和 `handoff.json` |
| `python3 -m unittest discover code/tests -v` | 第 43 课：测试任务边界校验器 |
| `python3 -m unittest tests.test_accounts` | 示例任务边界的验收命令 |

## schema 优先的状态
type: annotated-code
lang: python
from: phases/14-agent-engineering/34-repo-memory-and-state/code/main.py

```python
"required": ["schema_version", "active_task_id", "touched_files", "next_action"]
"active_task_id": {"type": ["string", "null"], "pattern": r"^(T-\d{3,}|)$"}
"status": {"enum": ["todo", "in_progress", "done", "blocked"]}
mgr = StateManager(state_path, STATE_SCHEMA)
state = mgr.load()                          # 先读取，再校验
mgr.commit(state)                           # 先校验，再 atomic_write
fd, tmp_name = tempfile.mkstemp(prefix=path.name + ".", dir=path.parent)
os.fsync(fh.fileno())                       # 先刷入磁盘
os.replace(tmp_name, path)                  # 原子重命名
```

## 初始化探测
type: concepts
from: phases/14-agent-engineering/35-initialization-scripts/code/main.py, phases/14-agent-engineering/35-initialization-scripts/docs/zh.md

- **`probe_runtime`**：低于 `REQUIRED_PYTHON` 时失败。
- **`probe_dependencies`**：对每个依赖调用 `importlib.util.find_spec`。
- **`probe_test_command`**：对测试命令调用 `shutil.which`。
- **`probe_env`**：缺少环境变量时失败。
- **`probe_state_freshness`**：状态过旧或缺失时警告。
- **`probe_lkg_diff`**：超出文件差异预算时失败。
- **探测**：返回 `(name, status, detail)`。
- **报告**：`init_report.json`。任一失败时以 1 退出。

## 默认值与数值
type: defaults
from: phases/14-agent-engineering/35-initialization-scripts/code/main.py, phases/14-agent-engineering/34-repo-memory-and-state/code/main.py, phases/14-agent-engineering/40-multi-session-handoff/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `REQUIRED_PYTHON` | (3, 10) | 运行时探测的最低版本 |
| `STATE_FRESHNESS_SECONDS` | 24 * 60 * 60 | 更旧的状态会触发警告 |
| `LOCK_TTL_SECONDS` | 24 * 60 * 60 | 未过期的锁会跳过探测 |
| `PROBE_BUDGET_SECONDS` | 3.0 | 通过但超时的探测改为警告 |
| `LKG_FILE_DIFF_BUDGET` | 50 | 修改文件更多时失败 |
| `schema_version` | 1 | 唯一允许的枚举值 |
| `TAIL_K` | 5 | 交接中保留的反馈记录数 |
| 评审总风险 | 7 | 低于此值时交接添加警告 |

## 八个交接字段
type: concepts
from: phases/14-agent-engineering/40-multi-session-handoff/docs/zh.md, phases/14-agent-engineering/40-multi-session-handoff/code/main.py

- **`summary`**：用一段话说明做了什么。
- **`changed_files`**：差异概览。
- **`commands_run`**：实际执行的命令。
- **`failed_attempts`**：尝试过什么，为何失败。
- **`open_risks`**：下次会话可能遇到的问题及严重程度。
- **`next_action`**：第一个具体步骤。这是关键字段。
- **`verdict_pointer`**：`outputs/verification/<task_id>.json` 与评审。
- **`feedback_tail`**：最后 `TAIL_K` 条记录及全部非零退出记录。

## 仅靠 prompt 与工作台对比
type: comparison
from: phases/14-agent-engineering/41-workbench-for-real-repos/code/main.py, phases/14-agent-engineering/41-workbench-for-real-repos/docs/zh.md

| 结果 | 仅靠 prompt | 工作台引导 |
|---|---|---|
| `tests_actually_run` | False | True |
| `acceptance_met` | False | True |
| `files_outside_scope` | 2 | 0 |
| `handoff_quality` | 缺失 | 完整交接包 |
| `reviewer_total` | 3 | 9 |
| 步骤 | 读取、编辑、声称完成 | 从初始化到交接共 8 步 |

## 任务边界
type: annotated-code
lang: python
from: phases/14-agent-engineering/43-frame-the-task-before-code/code/main.py, phases/14-agent-engineering/43-frame-the-task-before-code/docs/zh.md

```python
frame = TaskFrame(
    goal="Prevent duplicate email addresses during signup",
    allowed_paths=["app/accounts.py", "tests/test_accounts.py"],
    forbidden_paths=["migrations/**", "deploy/**"],
    acceptance=["python3 -m unittest tests.test_accounts"],
    facts=[RepositoryFact("Duplicate errors use status 409",
                          "tests/test_accounts.py:44")],  # 证据定位
    unknowns=["Whether email comparison is case-insensitive"])
issues = validate(frame)          # 空列表表示 READY
render(frame)                     # Markdown，Status 为 READY 或 BLOCKED
```

## 对未知项分类
type: concepts
from: phases/14-agent-engineering/43-frame-the-task-before-code/docs/zh.md

- **可查明**：仓库或运行中的系统可以回答。继续。
- **可决定**：任务契约授权 agent 决定。继续。
- **需人工决定**：改变产品行为、成本、风险或公共兼容性。暂停。
- **暂缓**：不在本次范围内。列入非目标。

## 故障排查
type: troubleshooting
span: 2
from: phases/14-agent-engineering/34-repo-memory-and-state/docs/zh.md, phases/14-agent-engineering/34-repo-memory-and-state/code/main.py, phases/14-agent-engineering/35-initialization-scripts/docs/zh.md, phases/14-agent-engineering/35-initialization-scripts/code/main.py, phases/14-agent-engineering/40-multi-session-handoff/code/main.py, phases/14-agent-engineering/43-frame-the-task-before-code/code/main.py

| 现象 | 原因 | 修正 |
|---|---|---|
| 下次会话重做已完成工作 | 状态留在聊天中，未写入仓库 | 将状态保存在仓库内经过 schema 校验的 JSON 中 |
| 从损坏状态恢复会话 | 使用 `write_text()` 且吞掉异常 | 使用 `atomic_write`：`mkstemp`、`fsync`、`os.replace` |
| `T-bogus` 触发 `does not match` | 任务标识不符合模式 | 使用 T-001 这样的标识 |
| `init failed; refuse to launch agent` | 某个探测状态为 fail | 修正探测。不要启动 agent |
| `lkg_diff` 失败，文件变动超出预算 | 自最后已知良好版本起变动超过 50 个文件 | 人工通过 `--write-lkg` 确认基准 |
| 通过的探测因 `slow:` 变为警告 | 超出 3 秒预算 | 将其移出初始化或缓存结果 |
| `no next_action recorded; needs human` | 状态缺少 `next_action` | 交接前设置 `next_action` |
| 任务边界显示 `Status: BLOCKED` | `validate` 发现问题 | 修正 Blocking issues 下的每一项 |

## 问答
type: qa
from: phases/14-agent-engineering/34-repo-memory-and-state/docs/zh.md, phases/14-agent-engineering/35-initialization-scripts/docs/zh.md, phases/14-agent-engineering/40-multi-session-handoff/docs/zh.md, phases/14-agent-engineering/43-frame-the-task-before-code/docs/zh.md

- **仓库记忆保存什么？** 三个月后重跑 CI 仍有用的数据。
- **连续初始化两次会怎样？** 第二次除更新时间戳外不做任何操作。
- **没有 `next_action` 的交接？** 那是状态报告，不是交接。
- **`handoff.md` 与 `handoff.json` 不一致？** 以 JSON 为准。
- **何时停止读取仓库？** 每个决策都有证据、已获委派或明确标为未知时。
- **何时收尾？** 上下文预算用到 50-75% 时，不要等到 95%。

## 提示
type: tips
from: phases/14-agent-engineering/34-repo-memory-and-state/docs/zh.md, phases/14-agent-engineering/40-multi-session-handoff/docs/zh.md, phases/14-agent-engineering/43-frame-the-task-before-code/docs/zh.md, phases/14-agent-engineering/35-initialization-scripts/docs/zh.md

- 大型产物不要放入 `agent_state.json`。只保存路径。
- 执行前把每次工具调用标识写入 `pending_calls.jsonl`。
- 每次变更追加到 `state.events.jsonl`。快照写入 `state.json`。
- 每个分支和主题只保留一个活跃交接。
- 每条事实附证据定位：文件路径和行号。
- 初始化不访问网络，也不调用 LLM。
