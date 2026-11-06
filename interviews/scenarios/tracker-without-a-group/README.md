---
id: tracker-without-a-group
title: 启动时中断运行的 tracker 参数
card: scenarios
kind: incident
level: 1
roles: [inference-engineer, ai-evaluation-reliability-engineer, applied-ai-engineer]
rounds: [screen, debugging]
tags: [rl, tracking, dashboard, secrets, miles]
minutes: 15
lessons: []
manuals: [miles-101#s-read-the-run]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
system:
  version: Miles main 08752a12 with its own SGLang 0.5.22 build
  model: Qwen/Qwen3-0.6B
  hardware: one GB10 with 128 GB of unified memory
source:
  - manuals/miles-101/capture/gpu/out-gb10/tracker-eval-checks.txt
  - manuals/miles-101/sections/5-1-read-the-run.md
---

## Situation

一个团队此前一直用 `grep` 从日志中读取初次运行的结果。对于第一次长时间运行，他们想要一个看板，于是在运行的附加参数中加入了 `--use-wandb --wandb-mode offline --wandb-project miles-lab`。运行在启动时就停了，报出关于 `NoneType` 和 `str` 的 `TypeError`。日志里没有写出任何 step 行。

一位同事指责镜像有问题，想彻底移除 tracker。另一位同事想把团队的 API key 粘贴到附加参数中以强制开启在线运行，因为“是离线模式把它搞坏的”。

## Evidence

- [开启 tracker 但没有 group 名称的运行日志](evidence/the-crash.txt)
- [带有 group 名称的同一次运行日志](evidence/with-the-group.txt)
- [使用另一个 tracker 的同一次运行记录](evidence/tensorboard.txt)
- [手册使用的 tracker 参数以及关于 group 的规则](evidence/the-command-and-the-rule.txt)
- [在线运行的 key 应该放在哪里](evidence/the-key-rule.txt)
- [另一个 tracker 的参数](evidence/tensorboard-command.txt)

## Questions

1. 什么样的 bug 会产生这种 `TypeError`？它告诉你关于 GPU、引擎和镜像的什么信息？
2. 缺少了哪个参数？哪两个日志迹象表明随后 tracker 正常工作了？
3. 同事想把 API key 粘贴到运行参数中。指出该 key 随后会出现在哪两个地方。
4. 哪个 tracker 不需要账号也不需要网络？它需要什么来替代？
5. 团队现在有了看板。他们还保留了什么，为什么？

## Walkthrough

1. **读报错。** `TypeError: unsupported operand type(s) for +: 'NoneType' and 'str'` 是 Python 把字符串加到了一个为 `None` 的值上。一个没有人给出的设置正被拼接成一个名称。那一行里没有任何内容涉及 GPU、引擎或权重。运行从未到达第一步，所以 tracker 的设置代码是唯一执行过的代码。
2. **读成功运行的记录。** 带有 `--wandb-group plain` 的相同配置记录了 `step 0` 和 `step 1`。日志打印了 `W&B offline mode enabled. Data will be saved locally.`，tracker 目录下在调试日志旁保存了 `offline-run-` 目录。手册给出了规则：保留 `--wandb-group`，因为没有它，运行就会在启动时报出完全相同的错误并结束。
3. **读另一个 tracker。** 带有 `-e TENSORBOARD_DIR=/root/lab/runs/plain/tb` 和 `--use-tensorboard` 的相同配置记录了 `Saving tensorboard log to /root/lab/runs/plain/tb.` 并写了两个事件文件。这个 tracker 需要一个目录和一个参数，既不需要账号也不需要网络，你在宿主机上用 `tensorboard --logdir` 读取它。
4. **读 key 的规则。** 对于在线运行，去掉 `--wandb-mode offline`。不要把 key 放在命令行中，因为命令会进入 shell 历史和进程列表，并且启动器会把完整命令打印到日志里。把 `WANDB_API_KEY=<your key>` 放在权限为 600 的文件里，用 `--env-file` 传入。附加参数是 key 绝不能出现的地方。

## Resolution

崩溃源于缺少一个参数 `--wandb-group`。补上它，在需要账号和网络之前保持离线模式，并检查这两个迹象：`W&B offline mode enabled` 行和 `offline-run-` 目录。随后运行就会像检查时一样到达 `step 0` 和 `step 1`。对于没有 tracker 账号的团队，使用带一个目录和一个参数的 TensorBoard，并在宿主机上打开该目录。

无论如何都要保留日志。手册里的每个数字都是从日志中读取的，日志也保存了失败运行中的第一条异常。

## Wrong turns

- "镜像坏了，删掉 tracker。" 同样的镜像加上一个参数就能把同样的配置运行到 `step 1`。报错指出了缺少的值，而不是缺少的库。
- "把 API key 粘贴到附加参数中以强制开启在线模式。" 离线模式不是原因，而且启动器会把完整命令打印到日志中，所以 key 会出现在日志、shell 历史和进程列表中。
- "看板替代了日志。" 看板展示指标。日志保存启动行、引擎行以及运行失败时的第一条异常。

## Generalize

启动时针对 `None` 的类型错误表示缺少设置，最快的检查方法就是把文档中的命令与你的命令并排对照。secret 要保存在只有你能读取的文件中，并通过环境变量传递给进程，绝不能通过启动器回显的参数传递。看板增加了一个视图，而日志始终是权威记录。

## Taught in

Miles 手册在[解读运行页](../../../manuals/miles-101/sections/5-1-read-the-run.md)中给出了 tracker 命令、group 规则和 key 规则。
