---
id: state-file-atomic-write
title: 审查一段可能损坏下一次会话的状态写入
card: prompting-structured-output
kind: code-reading
level: 4
roles: [agentic-ai-engineer, applied-ai-engineer]
rounds: [coding, design-review]
tags: [repo-memory, atomic-write, schema, idempotency, code-reading]
minutes: 12
lessons: [phases/14-agent-engineering/34-repo-memory-and-state]
manuals: []
practice: []
cheatsheet: [context-engineering]
related: [prompting-structured-output/take-home-two-tier-memory]
updated: 2026-11-03
---

某个 agent 工作台用下面这段代码在会话之间持久化状态。请审查它。哪里会出问题？课程的写入器是怎么做的？写入还需要哪些配套机制？

```python
def save_state(path, state):
    try:
        path.write_text(json.dumps(state))
    except Exception:
        return
```

## Short answer

两个缺陷。写到一半崩溃会留下一个被截断的文件，下一次会话把它当作损坏的状态加载；静默的 except 又把问题藏了起来，agent 在毫无信号的情况下基于垃圾数据恢复。课程的写入器在同一目录下创建临时文件，写入，同步到磁盘，再重命名覆盖目标，所以磁盘上的文件要么是旧版本，要么是新版本。配套机制还应包括：在写入前拒绝坏状态的 schema 检查、带迁移路径的版本字段，以及为不能安全重复的工具调用准备的幂等键。

## Full answer

### 两个 bug

课程引用了 2026 年 3 月一个开源项目的 bug 报告，代码形态和这里完全一样：状态文件用普通的文本写入方式写出，异常被捕获后静默吞掉。写入不完整导致会话在没有任何信号的情况下从损坏的状态恢复。第一个 bug 是非原子写入。第二个是那条 except，它把本应显露的失败变成了无声的失败。

### 原子写入器

1. 用 `tempfile.mkstemp` 在目标旁边、也就是目标所在目录里创建临时文件。
2. 写入内容。
3. 调用 `fsync`，让字节真正落到磁盘。
4. 用 `os.replace` 把临时文件替换到目标上，这在 POSIX 和 Windows 上都是原子重命名。

读取方看到的要么是旧文件，要么是新文件，绝不会是两者的混合。

### schema 优先

状态文件带有契约：必填键、允许的状态值枚举、禁止的值（比如数组字段为 null）、任务 id 的模式，以及一个整数 `schema_version`。管理器在写入前校验，所以坏的写入会被拒绝；它也拒绝加载自己无法迁移的版本的文件。每次 schema 升级都附带一个迁移脚本，启动时以幂等方式运行。

### 写入的配套机制

- **幂等键。** 如果崩溃发生在工具调用和它的检查点之间，恢复时会重试这次调用。读操作没问题；发邮件或插入数据库就危险了。执行前记录一条带调用 id 的 started 记录，执行后记录一条带结果的 completed 记录。重试时，有 completed 记录的调用直接跳过，使用保存的结果。只有 started 记录的调用可能执行过也可能没有，所以在重做或跳过之前先核对，比如询问目标系统这个幂等键是否已经生效。
- **状态要小，产物分开放。** 对话记录、生成的文件和数据集放在各自的文件或对象存储里；状态只保存路径。
- **事件日志加快照。** 每次变更都追加到事件日志，并按计划给状态做快照；恢复时读快照再重放之后的事件，调试时也能借此重放 agent 的决策。

### 文件里该放什么

当前任务 id、本次会话改动过的文件、做出的假设、未解决的阻塞和下一步动作。不放原始对话记录、推理过程、采样出的补全或厂商的模型 id。检验标准是：三个月后在 CI 里重跑时，这一项还有没有用。

## Follow-ups

- **Level 3:** 为什么临时文件要和目标放在同一个目录？ Expected: 这样最后一步是同一文件系统内的重命名，仍然是原子的；课程的做法是在目标旁边建临时文件，写入，同步，替换。
- **Level 4:** agent 在工具调用之后、检查点之前崩溃。恢复时出什么问题，怎么修？ Expected: 这次调用会被重试，对发邮件或插入数据很危险；执行前记录带调用 id 的 started 记录，执行后记录带结果的 completed 记录；已完成的调用复用结果，只有 started 记录的调用先核对再决定是否重做。
- **Level 4:** 两个 agent 在 50 ms 内写同一个状态文件。原子重命名能挽救什么，不能挽救什么？ Expected: 它防止文件被写坏，每个读取方都看到一个完整的版本；它不能阻止第二次写入替换掉第一次，这需要写入方之间的协调。
- **Level 4:** 状态文件里该放什么，不该放什么？ Expected: 放当前任务、改动过的文件、假设、阻塞和下一步动作；不放对话记录、推理过程、补全或厂商模型 id，大产物只放路径。

## Wrong answers

- "捕获异常继续跑，下一次写入会修好的。" 静默的 except 就是第二个 bug；它藏起了一个被截断、会被下一次会话加载的文件。
- "先写临时文件，再把它复制到目标上。" 复制也会被打断；原子的那一步是重命名。
- "把完整对话记录存进状态，什么都不会丢。" 对话记录是遥测数据，不是持久状态；文件要小，产物放在单独的文件里，状态里只留路径。

## Taught in

[仓库记忆与状态](../../../phases/14-agent-engineering/34-repo-memory-and-state/)一课给出了原子写入做法、schema 优先的契约、幂等键和事件日志模式。
