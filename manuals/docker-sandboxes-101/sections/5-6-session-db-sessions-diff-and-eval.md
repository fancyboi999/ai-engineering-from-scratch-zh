# session.db、sessions diff 与 eval

> 每次运行存成一个 SQLite 文件中的行；cassette 重放模型调用，`sessions diff` 找首个不同工具调用，`eval` 在容器评分已保存会话。

你改了 agent 指令的一行，想知道它是否仍做相同工作。实时模型每次措辞都不同，所以需要可重放、可比较的记录。

读完本节，你能从 cassette 重放运行，按工具调用比较两次运行，并用 `eval` 评分。

## session.db {#s-session-db-sessions-diff-and-eval-session-db}

**会话：** {{docs-agent Sessions}}，包含每条消息、工具调用、子 agent 运行与成本的对话记录。位于数据目录的 `session.db`，默认 `~/.cagent`，除非 `--data-dir` 或 `-s` 指向别处 {{help-agent docker-agent run}}。`--session -1` 按创建时间恢复最新会话 {{docs-agent Sessions}}。

```listing
title: 本部分运行后的会话存储
source: capture/out/21-session-db.txt
lang: text
note: 仅保留表列表、sessions 列及最新五个标题。
---
$ sqlite3 work/data/session.db .tables  (python sqlite3)
generated_media_blobs generated_media_manifest migrations session_items sessions sqlite_sequence
…
$ sqlite3 work/data/session.db 'pragma table_info(sessions)'  (12 rows)
id created_at tools_approved input_tokens output_tokens title cost send_user_message max_iterations working_dir starred permissions agent_model_overrides custom_models_used thinking parent_id instruction_context safety_policy attributes origin

$ sqlite3 work/data/session.db 'select id, title from sessions order by created_at desc limit 5'
<uuid> | Running agent
…
```

表中有12个会话：十次运行及团队运行的两个带父 id 的 `Transferred task` 子会话（`19-transcript.txt`）。各会话存 `safety_policy`，`session_items` 存消息。最新五个都是 `--exec`，标题为 `Running agent`，不是文档所说从首条消息生成 {{docs-agent Sessions}}。

## Cassette：--record 与 --fake {#s-session-db-sessions-diff-and-eval-cassettes-record-and-fake}

**Cassette：** `docker-agent` 与模型之间 HTTP 交互的 YAML 文件。`--record` 写入，`--fake` 无需模型就重放 {{help-agent docker-agent run}}。`18-cassette-head.txt` 展示格式：`version: 2`，然后 `interactions`，各含发往 `localhost:12434` 的请求及流式响应。

```listing
title: 套件录制与重放所用 flags
source: capture/run.py
lang: python
note: Kit 类方法及模块函数，中间已截去。DMR_URL 为 http://localhost:12434。
---
    def start_recording(self, name):
        if not self.record_cassettes and os.path.exists(cassette_path(name)):
            return None
        self.recorded.append(name)
        return ["--models-gateway", f"{DMR_URL}/engines", f"--record={CASSETTE_WORK}/{name}"]
…
def replay(name):
    return ["--fake", f"{CASSETTE_WORK}/{name}"]
```

录制发现帮助未说明的四条规则（`capture/README.md`）。`--record` 只接受 `--record=PATH`，分开的单词会被视为 agent 引用。路径相对 `--working-dir`，自动追加 `.yaml`。`dmr` provider 的录制代理返回400，除非同时给 `--models-gateway http://localhost:12434/engines`。

重放按请求正文匹配。一轮两次工具调用时，运行时并行执行，按完成顺序追加结果。下一请求正文因此不同，重放返回500：“requested interaction not found”。所以套件每条消息只请求一个工具调用。

## sessions diff {#s-session-db-sessions-diff-and-eval-sessions-diff}

{{help-agent docker-agent sessions diff}}，比较工具调用序列而非回答文字；报告停在首个分歧。

```listing
title: 帮助示例、可用形式与分歧
source: capture/out/21-sessions-diff.txt
lang: text
note: 未截去任何内容。
---
$ docker-agent sessions diff -1 -2
Error: unknown shorthand flag: '1' in -1
[exit 1]

$ docker-agent sessions diff -- -1 -2
Comparing -1 (5 turns) against -2 (5 turns)

✅ Identical behaviour across all 5 turns.
[exit 0]

$ docker-agent sessions diff --fail-on-divergence -- -1 -3
Comparing -1 (5 turns) against -3 (6 turns)

❌ First divergence at turn 0 (after 0 matching turn(s)).
   -1 called:
     list_directory({"path": "."})
   -3 called:
     shell({"cmd": "echo m101-ok"})

Everything after this point is downstream of the divergence and is not compared.
Error: sessions diverged
[exit 1]
```

帮助示例 `sessions diff -1 -2` 失败，因为解析器把 `-1` 当 flag；引用前加 `--`。`-1`、`-2` 是 `files.yaml` 的两次重放（`21-two-runs.txt`），各五轮，对应 `18-transcript.txt` 每个模型响应。`-3` 是 `guarded.yaml` 的 restricted 运行，首先调用 `shell`。相同两次的 `--json` 为 `{"turns_a": 5, "turns_b": 5, "turns_matched": 5}`（`21-sessions-diff.json`）。

## eval {#s-session-db-sessions-diff-and-eval-eval}

**评估会话：** 含用户消息、预期工具调用及 `evals` 块的 JSON 会话 {{docs-agent Evaluation}}。块含 `relevance` 声明、`size` 和 `working_dir`。`eval` 在容器重放，评分工具调用 F1、评判模型相关性与长度。

录制用 `--judge-model dmr/ai/qwen3:4b` 尝试三次。直接执行时，两项都报 `exec: "docker{{docs-agent Evaluation}}，judge 在宿主，无法访问该名称（`22-eval-gateway.txt`）。改为 `-e DOCKER_AGENT_MODELS_GATEWAY=…` 后只改变容器，两项都成功运行。

```listing
title: 成功的 eval 运行
source: capture/out/22-eval-container-env.txt
lang: text
note: 加载行与输出路径已截去。
---
$ docker-agent eval fixtures/agents/files.yaml fixtures/evals --judge-model dmr/ai/qwen3:4b -c 1 -e DOCKER_AGENT_MODELS_GATEWAY=http://model-runner.docker.internal/engines --output work/eval-results-container-env
…
✓ Count the lines of README.md ($0.000000)
  ✓ size S
  ✓ tool calls
  ✓ relevance 1/1
✗ List the files in the working directory ($0.000000)
  ✓ size S
  ✓ relevance 1/1
  ✗ tool calls score 0.67
…
✅          Sizes: 2/2 passed (100.0%)
✅     Tool Calls: 83.3% avg F1 (2 evals)
✅      Relevance: 2/2 passed (100.0%)
…
```

第二项预期一次 `list_directory`，模型之后加了 `shell`，F1 降至0.67（`22-eval-run-container-env.json`）。两项会话都是 `"safety_policy": "autonomous"`。帮助默认 `-c 10`、judge 为 `openai/gpt-5.6-terra`，文档表却是 CPU 数量和 `anthropic/claude-opus-5`。本手册遵循帮助（[冲突 C65](#s-ref-sources-and-the-conflicts-register)）。输出目录有 `<run>.db`、`<run>.json` 与 `<run>.log`，没有文档列的 `-sessions.json`（`22-eval-results-ls-container-env.txt`）。

```figure
id: fig-5-6
kind: timeline
title: 同一轮次轴上的两次运行及两项 eval 分数
claim: `files.yaml` 两次重放五轮全匹配；guarded 运行在第0轮不同；`eval` 按工具调用给同一 agent 评分。
caption: 上方轨道沿轮次轴从左到右，每格一项模型响应。玫红格是首个分歧，虚线格不比较。下方为 eval 分数。来源为 capture/out/18-transcript.txt、20-restricted.txt、21-sessions-diff.txt 和 22-eval-container-env.txt。
```

```takeaways
- 相对会话引用前加 `--`，如 `sessions diff -- -1 -2`。
- 用 `--record=PATH` 与 `--models-gateway` 录制，每条消息只请求一个工具调用。
- CI 用 `sessions diff --fail-on-divergence` 在分歧时失败；它比较工具调用，忽略文字。
- 用 `-e` 给 eval 容器传模型网关，因为 judge 留在宿主。
```

Sources: docs-agent Sessions, Evaluation (research/sources/docs-docker-agent.md, pages features/sessions, features/evaluation); help-agent docker-agent run, sessions diff, eval (research/sources/help-docker-agent.md); conflict C65 (research/conflicts-register.md); capture/README.md; capture/run.py; capture/fixtures/agents/files.yaml, guarded.yaml; capture/fixtures/evals/count-lines.json, list-files.json; capture/out/18-cassette-head.txt, 18-transcript.txt, 19-transcript.txt, 20-restricted.txt, 21-session-db.txt, 21-sessions-diff.txt, 21-sessions-diff.json, 21-two-runs.txt, 22-eval.txt, 22-eval-gateway.txt, 22-eval-container-env.txt, 22-eval-run.json, 22-eval-run-container-env.json, 22-eval-results-ls-container-env.txt
