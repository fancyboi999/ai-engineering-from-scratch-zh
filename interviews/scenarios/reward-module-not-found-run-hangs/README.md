---
id: reward-module-not-found-run-hangs
title: 奖励模块导入失败，运行一直不停
card: scenarios
kind: incident
level: 2
roles: [inference-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging]
tags: [rl, custom-reward, pythonpath, watchdog, run-queue, miles]
minutes: 20
lessons: []
manuals: [miles-101#s-write-a-custom-reward, miles-101#s-troubleshoot-by-symptom, miles-101#s-add-a-watchdog, miles-101#s-read-your-first-ten-steps]
practice: []
cheatsheet: []
related: [scenarios/dead-engine-and-watchdog]
updated: 2026-11-03
system:
  version: Miles main 08752a12 with its own SGLang 0.5.22 build
  model: Qwen/Qwen3-0.6B
  hardware: one GB10 with 128 GB of unified memory
source:
  - manuals/miles-101/capture/gpu/out-gb10/custom-rm-noenv-hang.txt
  - manuals/miles-101/capture/gpu/watchdog.sh
  - manuals/miles-101/sections/3-5-write-a-custom-reward.md
  - manuals/miles-101/sections/7-1-troubleshoot-by-symptom.md
  - manuals/miles-101/sections/1-2-add-a-watchdog.md
---


## Situation

一个团队给 GRPO 运行加了自己的奖励函数。函数放在宿主机实验目录里的一个文件中，运行用 `--custom-rm-path my_rewards.custom_rm` 指定它。运行队列在夜里启动了这个作业。早上，队列显示作业到了时间上限，以代码 124 返回，完成的步数为零。容器已经运行了大约两小时。

宿主机上还运行着之前一次事故留下的 watchdog，就是在 rollout 引擎挂掉时停止运行的那个脚本。它没有触发。一位同事把这当作引擎健康的证明，归咎于 GPU 慢，提议把时间上限加倍后重新启动作业。

## Evidence

- [运行队列为这次运行记录的内容](evidence/queue-record.txt)
- [第一行和最后一行带时间戳的日志，以及日志大小](evidence/log-span-and-size.txt)
- [日志中出现 503 行的每一分钟](evidence/errors-by-minute.txt)
- [rollout 执行器抛出的异常](evidence/the-exception.txt)
- [采集工具包为这次运行写的摘要](evidence/kit-summary.txt)
- [watchdog 的计数规则](evidence/watchdog-rule.txt)

## Questions

1. 退出码是 124，步数是零。打开日志之前，这两个值告诉了你什么？
2. 日志有 183,248 行。这是卡住、崩溃，还是别的情况？你先读日志的哪个位置？
3. 按分钟统计 503 行，手动套用 watchdog 规则。watchdog 没停掉这次运行，是它错了吗？
4. 读异常。是哪个进程抛出的？为什么一个缺失的环境变量会影响到那个进程？
5. 出错后 Miles 一直在运行。哪种第二道防护能抓住这次运行？它监视的是什么？
6. 下一次尝试前你要运行什么？哪一行日志能证明修复有效？

## Walkthrough

1. **读队列记录。** 队列在 00:19:01 启动作业，在 02:17:10 记录 RC 124 和 `steps=0`。124 是队列用自己的时间上限停止作业时写下的代码。所以运行不是自己结束的，而且两小时里一步都没完成。给更多时间也不会改变这个计数。
2. **读时间跨度和大小。** 第一行带时间戳的日志在 00:19:02，最后一行在 02:17:06，文件有 183,248 行。一个两小时写出这么大日志的运行并没有睡着，它在忙着做训练以外的事。原因在开头附近，不在结尾。
3. **自己算一遍 watchdog。** 日志里有 44 行 `503 Service Unavailable`，其中 40 行在 00:24 这一分钟，4 行在 00:25 这一分钟。watchdog 每 30 s 读一次最近 60 s 的日志，只有计数超过 100 时才记一次警告，并且需要连续 10 次警告。这次运行连一次警告条件都没满足。watchdog 是对的。rollout 引擎没有挂，这样一小阵错误在健康的引擎上也会出现。
4. **读异常。** 00:21:09，rollout 执行器记录了一个 rollout 任务抛出的 `ModuleNotFoundError: No module named 'my_rewards'`。回答的评分在 Ray worker 里运行，导入就是在那里失败的。这一行之后再也没有出现 `rollout 0` 行，因为没有一个回答能被评分。三分钟后那一阵 503，比起这一行只是噪声。
5. **找出运行少传了什么。** 工具包摘要写得很清楚：运行传了 `--custom-rm-path my_rewards.custom_rm`，却没传 `-e PYTHONPATH=/root/lab`。容器把实验目录看作 `/root/lab`，但除非这个变量写明，Python 不会搜索这个目录。启动器会把这个变量传给 Ray worker，所以这一个设置就能在需要导入的进程里修好导入。
6. **看清为什么没有东西停掉运行。** 手册记录了同样的测试：出现这个错误后，作业在没有任何 rollout step 的情况下又运行了两小时，watchdog 没停掉它，因为引擎只写了 44 行错误。watchdog 只监视一种失败形态：引擎挂掉。一个无法给回答评分的运行是另一种形态，几乎没有错误，也没有进展。

## Resolution

运行在第一次 rollout 就失败了，因为奖励模块不在 Ray worker 的 Python 路径上。停止容器，在 `MILES_EXTRA_ARGS` 旁边加上 `-e PYTHONPATH=/root/lab`，重新启动。在此之前，先在容器里用手册给的那条单行命令测试导入，它会给一个回答评分，应该打印 `1.0`；再用十个你手工评过分的回答运行这个函数，其中要有一个空回答和一个在长度上限处被截断的回答。

证明修复有效的是第一行 `rollout 0`，它会显示由你的函数算出的 `rollout/raw_reward`。然后给队列加两条规则。把 `steps=0` 的时间上限退出当作失败，而不是慢。启动后十分钟内没有出现 `rollout 0` 行的运行就停掉，手册把这当作引擎或训练器没有启动的信号。

## Wrong turns

- "watchdog 漏掉了挂掉的引擎，所以调低它的上限。" 这次运行两小时写了 44 行错误，全都在两分钟内。一个每个 prompt 16 个回答的健康运行，一分钟就写了 2,209 行。上限低到能抓住 44 行，每一阵健康的错误都会触发它，却仍然抓不住这次运行，因为它在剩下的两小时里一直很安静。
- "把时间上限加倍，再启动一次。" 日志涨到 183,248 行，一步都没完成。更多时间只会换来更多行，计数不变。
- "把奖励文件打进镜像重新构建。" 这种办法在下一次修改奖励函数后就又要重建镜像。启动器已经会把 `PYTHONPATH` 传给 Ray worker，所以在运行命令上加一个变量就是修复。
- "把奖励写成普通函数，让导入简单一点。" 导入在模块名上就失败了，任何函数都还没运行。普通函数会在更晚的时候以另一种方式失败，因为 Miles 会 await 它的结果。

## Generalize

一个无法开始工作又不会停下的作业，是代价最高的失败，因为它会耗光整个时间上限，又不给出任何信号。每道防护只监视一种失败形态。引擎挂掉的防护数的是错误，而导入错误几乎不产生错误行。要加一道监视进展的防护，比如规定期限内必须出现第一步；把队列的退出码当作数据来读；从日志开头读起，第一个异常就在那里。

## Taught in

Miles 手册在[自定义奖励页](../../../manuals/miles-101/sections/3-5-write-a-custom-reward.md)给出了自定义奖励的两项设置并记录了这次卡住，在[排障页](../../../manuals/miles-101/sections/7-1-troubleshoot-by-symptom.md)列出了这个症状，在 [watchdog 页](../../../manuals/miles-101/sections/1-2-add-a-watchdog.md)建立了错误计数规则，并在[前十步页](../../../manuals/miles-101/sections/1-3-read-your-first-ten-steps.md)给出了缺少第一步时的十分钟规则。
