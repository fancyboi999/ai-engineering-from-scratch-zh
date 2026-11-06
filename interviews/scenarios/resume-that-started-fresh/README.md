---
id: resume-that-started-fresh
title: 续训的运行悄悄从第 0 步重新开始
card: scenarios
kind: incident
level: 2
roles: [inference-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, design-review]
tags: [rl, checkpoints, resume, runbook, miles]
minutes: 20
lessons: []
manuals: [miles-101#s-survive-failures]
practice: []
cheatsheet: []
related: [scenarios/dead-engine-and-watchdog]
updated: 2026-11-03
system:
  version: Miles main 08752a12 with its own SGLang 0.5.22 build
  model: Qwen/Qwen3-0.6B
  hardware: one GB10 with 128 GB of unified memory
source:
  - manuals/miles-101/capture/gpu/out-gb10/resume-check.txt
  - manuals/miles-101/capture/gpu/out-gb10/live-check-summary.txt
  - manuals/miles-101/sections/6-3-survive-failures.md
---


## Situation

一次很长的 GRPO 运行每 20 步保存一次检查点，存到一个挂载进容器的宿主机目录里。一天夜里，运行挂了。值班工程师立刻用同一条命令重新启动。为了保险，她把 `--load` 指向检查点目录里最新的 `iter_` 子目录，并保留同样的 `> runs/plain.log` 重定向，因为看板读的是这个文件。

早上，新运行的奖励曲线从几天前第一次运行的起点开始。新日志的第一行 step 写的是 `step 0`。团队分成两派：一派说检查点坏了，另一派说这个训练器的续训功能不能用。没人说得清第一次运行为什么挂，因为旧日志已经没了。

## Evidence

- [重启检查的两次运行](evidence/check-setup.txt)
- [第一次运行：它的保存行，以及它对空目录的沉默](evidence/first-run-saved.txt)
- [第二次运行：真正的续训会打印什么](evidence/resume-lines.txt)
- [两次运行后检查点目录里有什么](evidence/folder.txt)
- [手册关于加载参数和日志文件的规则](evidence/load-rule.txt)
- [续训的运行必须显示的日志行，以及长时间运行前的测试](evidence/resume-checklist.txt)
- [检查点转换器写出的文件](evidence/converter.txt)

## Questions

1. 新日志从 `step 0` 开始。续训成功时，它上面必须出现哪些行？这些行不在，证明了什么？
2. 加载目录里没有检查点时，Miles 的提示有多明显？这对运维手册意味着什么？
3. 参数指向的是最新的 `iter_` 子目录。为什么这个路径是错的？Miles 读哪个文件来找最后一步？
4. 这次重启还毁掉了一样团队现在很想要的东西。是什么？怎样重启才能保住它？
5. 写出每次长时间运行开始前都要通过的测试，以及你预期看到的步数。
6. 团队想用某个保存的 step 提供模型服务。用哪个工具？除了检查点还需要什么？

## Walkthrough

1. **看检查的结构。** 手册用同样的参数跑了两次短运行：`--save /ckpt/run-a --save-interval 20 --load /ckpt/run-a`。第一次在空目录上跑 2 步。第二次在第一次留下的目录上跑 4 步。这是续训最小的测试，也是团队在长时间运行之前本该跑的测试。
2. **读第一次运行。** 它写出了 `[FSDP] Saved checkpoint to /ckpt/run-a/iter_0000002`，因为 Miles 总会在最后一步之后保存。提到缺少 tracker 或缺少目录的行数为 0。加载目录是空的，Miles 对此一个字都没说。整个事故就出在这份沉默上：一次找不到东西可加载的运行，看起来和一次根本没被要求加载的运行一模一样。
3. **读第二次运行。** 它打印了三行 `Loaded`，分别对应模型、优化器和 LR 调度器，每行都带着 step 的目录。它的第一行 step 是 `step 2`，不是 `step 0`，结束时保存了 `iter_0000004`。这三行加上第一个 step 编号，就是续训的证据。团队的日志里一样都没有，所以新运行是从头开始的。
4. **读目录。** 里面有 `iter_0000002`、`iter_0000004`、一个 `rollout` 目录和一个文件 `latest_checkpointed_iteration.txt`。这个文件就是 tracker。它在父目录里，不在任何 `iter_` 子目录里。
5. **套用参数规则。** `--load` 要写父目录，永远不要写其中某个 `iter_` 子目录，因为 Miles 要在父目录里读 tracker 文件来找最后保存的 step。工程师把参数指向了一个没有 tracker 的目录，所以 Miles 找不到可以续训的 step。这和空目录是同一种情况，而手册的测试显示，这种情况什么都不会打印。
6. **套用日志规则。** 手册要求重启时用一个新的日志文件，比如 `> runs/plain-resume.log`，因为重定向会清空旧日志，而失败的原因就在旧日志里。工程师用同一条命令重启时，既没能续训，也丢掉了夜里崩溃的原因。
7. **读转换器的输出。** FSDP 训练器写出的是其他工具无法加载的分布式检查点。转换器在给定基础模型目录（用于配置和分词器）的情况下，把 step 2 的检查点转成了一个包含权重、配置和分词器文件的模型目录。

## Resolution

检查点没坏。续训没有发生，是因为 `--load` 写的是一个 `iter_` 子目录，里面没有 tracker 文件，而 Miles 找不到可加载的 step 时会不声不响地从头开始。把 `--load` 指向父目录 `/ckpt/run-a`，用一个新的日志文件重新启动，并在离开之前读一读那三行 `Loaded` 和第一个 step 编号。之后运行会从最后保存的 step 继续，就像检查运行从 `step 2` 继续那样。

把这个检查写进运维手册。长时间运行之前，先用 `MILES_NUM_ROLLOUT=2` 运行命令，再用 `MILES_NUM_ROLLOUT=4` 运行一次，并要求第二次运行的第一行 step 是 `step 2`。根据每步耗时选择 `--save-interval`，让一次崩溃的损失低于你能接受的程度：每步五分钟，间隔设为 12，最多丢一小时。要用某个保存的 step 提供服务，就在容器里运行转换器，传入 step 目录、输出目录和基础模型目录。

## Wrong turns

- "检查点坏了。" 目录里有各个 step 目录和 tracker 文件，手册的第二次运行就从同样的目录里加载了模型、优化器和 LR 调度器。新日志里没有任何加载失败的记录，因为根本没有尝试加载。
- "续训功能在 FSDP 训练器上不能用。" 检查运行在 FSDP 训练器上从 `step 2` 续训，并保存了 `iter_0000004`。这个功能需要父目录，拿到的却是 step 目录。
- "把参数指向 step 目录，确保加载的是正确的 step。" 父目录里的 tracker 文件写着最后一步。step 目录里没有 tracker，所以参数什么都加载不到。
- "继续用同一个日志文件，免得看板出问题。" 重定向会清空旧日志，毁掉崩溃的唯一记录。每次重启用一个新文件，让看板读一个目录。

## Generalize

会静默失败的功能，必须靠它的正面信号来确认，而不能靠没有报错。对每一次续训、每一次缓存加载、每一次状态恢复，都要知道哪些日志行能证明它发生了，以及哪个最先出现的值必须与冷启动不同；在依赖它之前，先用一次短运行把整条重启路径测一遍。永远不要让重启覆盖掉导致重启的那次失败的证据。

## Taught in

Miles 手册在[故障页](../../../manuals/miles-101/sections/6-3-survive-failures.md)中给出了检查点参数、续训日志行、两步测试和转换器。
