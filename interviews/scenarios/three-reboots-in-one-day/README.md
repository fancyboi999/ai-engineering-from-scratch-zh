---
id: three-reboots-in-one-day
title: RL 负载下一天内发生三次重启
card: scenarios
kind: incident
level: 4
roles: [inference-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, design-review, system-design]
tags: [reboot, thermal, heat-guard, unified-memory, rl, guardrails]
minutes: 30
lessons: [phases/17-infrastructure-and-production/24-chaos-engineering-llm, phases/17-infrastructure-and-production/23-sre-for-ai]
manuals: [miles-101#s-ref-lab-notes, sglang-101#s-sglang-as-an-rl-rollout-engine]
practice: []
cheatsheet: [sre-for-ai]
related: [scenarios/rl-experiment-hygiene, scenarios/thermal-throttle-voided-ab-test]
updated: 2026-11-03
system:
  version: Miles main 08752a12 with its own SGLang 0.5.22 build
  model: Qwen/Qwen3-0.6B
  hardware: one GB10 with 128 GB of unified memory, a desktop machine under a 48-step RL run
source:
  - manuals/sglang-101/capture/gpu/incidents/gb10-boot-list.txt
  - manuals/sglang-101/sections/7-2-sglang-as-an-rl-rollout-engine.md
  - manuals/miles-101/capture/gpu/heat-guard.sh
  - manuals/miles-101/capture/gpu/out-gb10/thermostat.log
  - manuals/miles-101/sections/r-3-lab-notes.md
---


## Situation

一个研究团队在一台配备单张 GB10 的台式机上运行 `Qwen/Qwen3-0.6B` 的 48 步 GRPO 训练。2026-10-18 当天，机器重启了三次。每次运行都随之终止，机器上的其他所有作业也一样。启动列表显示三次运行分别持续了 13、26 和 74 分钟。三次结束前，系统日志中都没有 panic、没有 OOM 终止，也没有任何错误行。团队希望在开始接下来的两个种子之前查明原因并落实修复。

现场摆着两份提议：一方认为引擎内存耗尽，要求调低引擎内存比例；另一方认为这台机器不适合跑 RL，要求使用云端 GPU。你手上有启动列表、某人当天早晨编写的守护脚本及其日志，以及手册的实验笔记。

## Evidence

- [四天后读取的机器启动列表](evidence/the-boot-list.txt)
- [手册关于当天负载和守护脚本的记录](evidence/what-ran-that-day.txt)
- [温控守护的主循环](evidence/the-guard-loop.txt)
- [最初的暂停以及规则修改](evidence/the-first-hour-of-the-guard.txt)
- [四天后的守护运行记录](evidence/a-later-afternoon.txt)
- [实验笔记中的温控守护和暂停次数统计](evidence/the-pause-count.txt)

## Questions

1. 读启动列表。三次短暂的启动有什么共同点？当天的最后一次启动显示了什么？
2. 系统日志没有给出原因。列出导致机器在没有日志行的情况下停机的可能原因，并说明证据排除了哪些。
3. 读守护循环。它监视什么？做什么？它的两个定时器是用来做什么的？
4. 守护脚本暂停了容器 1,005 次。这对来自这些运行的每次测量有什么影响？哪些数字依然有效？
5. 混沌工程课程要求具备带熔断开关和爆炸半径限制的安全控制平面。这个守护脚本在该设计中处于什么位置？缺少了什么？
6. 你必须在复盘中说明原因。你可以写什么？绝对不能写什么？

## Walkthrough

1. **看启动记录。** 前两天的启动平稳运行了整个工作日。事故当天，机器在 04:22 启动，一刻钟内就消失了；04:44 启动，持续了半小时；07:52 启动，持续了一个多小时。从 10:44 开始的那次启动一直运行到次日凌晨 03:00，2026-10-21 的启动则持续到了第二天。每次短暂的启动结束时都没有关机记录。守护脚本日志始于当天早晨 10:57，正处于首次持续运行的启动之中。
2. **排除能排除的因素。** 导致整机停止且能让系统日志保持沉默的原因有四个：内核 panic、内存终止、电源事件和过热关机。panic 会在日志中留下痕迹，但这里没有。这台机器上的内存终止是有日志记录的事件，并且只停止一个进程：Ray 写入节点内存行并终止一个 worker，机器依然保持运行，正如 Ray 内存不足场景所示。这排除了调低引擎内存比例的提议，因为症状并不匹配。电源和过热依然是候选原因，证据无法直接把它们区分开，因为停机瞬间没人记录 GPU 温度。证据能说明的是：一旦过热得到控制，发生了什么。
3. **读守护脚本。** 脚本每 5 s 读取一次 GPU 温度。当 Miles 容器在运行且温度达到或超过 84 C 时，它暂停容器并记录时间。在暂停状态下，当温度降到或低于 74 C 且至少过去 45 s 时恢复，或者不管怎样在 120 s 后恢复。如果容器消失，它就清除记录；在退出时它会恢复之前暂停的容器，所以没有运行会保持冻结。两个定时器一个是下限，一个是上限：下限给 GPU 散热时间，上限控制任何一次暂停的代价。
4. **读第一个小时。** 最初的规则是 80 和 68。日志显示在 80 C 时暂停，15 秒后在 68 C 时恢复，随后一分钟内接连暂停。团队当天早晨手动修改了两次规则，从 11:27 起在 84 和 74 下运行。四天后规律保持稳定：在 84 或 85 C 时暂停，45 s 后在 72 或 73 C 时恢复，负载下大约每分钟一次。实验笔记统计截至 2026-10-22 累计暂停了 1,005 次。
5. **看暂停付出了什么。** 在种子 2 和 3 长达 9.3 个小时的运行中，容器大约有 58% 的时间处于暂停状态。暂停停止了进程，但并没有改变其运算逻辑，所以手册把奖励、回答长度、截断回答比例和 log-probability 差距视为有效，并指出它没有用同一种子对比过暂停和不暂停的运行。rollout 时间无效，手册没有为这些种子报告它们。来自受守护运行的每个墙上时钟数字都需要遵循实验笔记的干净步规则：只对不重叠任何暂停的步骤计时，并比较步骤编号。
6. **把守护放在安全平面中。** 混沌工程课指出了由熔断开关、抑制窗口、爆炸半径限制和错误预算门控组成的安全平面。这个守护脚本是对单个容器的爆炸半径限制，其退出时恢复的逻辑充当了守护脚本本身的熔断开关。它缺少告警、缺少除暂停和恢复行之外的独立温度日志、缺少对一次运行总暂停比例的上限限制，也缺少证明暂停不会改变结果的测试。它是一项缓解措施，而不是诊断。
7. **写复盘。** 诚实的表述是：机器在持续 RL 负载下停止了三次，日志中没有原因；在此后的每次启动中，将 GPU 保持在 84 C 或以下的守护脚本都在运行；在它的控制下再也没有发生停机。这是一种具有合理机制的相关性。写下“已确认过热关机”需要跨越停机瞬间的温度读数或硬件事件日志，而两者都不存在。

## Resolution

原因没有被记录下来，复盘报告也应如实说明。缓解措施是一个将机器发热视为预算的守护脚本：84 C 时暂停容器，至少 45 s 且达到 74 C 时恢复，单次暂停绝不超过 120 s。开启守护后，2026-10-18 10:44 开始的启动一直运行到次日 03:00；2026-10-21 的启动持续到了 2026-10-22，守护脚本在整个下午记录暂停，机器在 1,005 次暂停中没有再停机。代价也得到了测量：种子 2 和 3 约 58% 的墙上时间花在暂停上，因此没有报告它们的 rollout 时间，后续所有计时都遵循干净步规则。

调低内存的提议被拒绝，因为内存终止是有日志的事件，只会停止一个进程而让机器保持运行。云端 GPU 的提议被推迟，因为机器在守护下稳定运行了四天。接下来的步骤是将相关性转化为因果关系：每秒将 GPU 温度记录到重启后依然存在的文件中，停机后读取硬件事件日志，并在停机无代价的日子里关闭守护运行一次相同的负载。

## Wrong turns

- "调低引擎内存比例，一定是内存不足。" 内存终止会写下一行并停止一个进程，而整机停止时日志中没有任何记录。更低的比例还会缩小每次 rollout 的池空间。
- "日志是空的，所以是供电问题，联系后勤。" 供电问题不能排除，值得检查。但停机发生在单日的持续负载下，一旦 GPU 保持在 84 C 或以下就不再复发。记录这种相关性，并保持两个候选原因开放。
- "把守护设为 80 C 以策安全。" 最初的规则在 80 和 68 下运行，日志显示每分钟暂停一次。团队当天早晨把它提高到了 84 和 74。更严的限制会带来更多暂停，而每次暂停都会进入步骤时间。
- "保留守护脚本并相信步骤时间。" 种子 2 和 3 有 58% 的时间处于暂停中。像实验笔记那样，只对不重叠任何暂停的步骤计时，并比较步骤编号。
- "在复盘中称之为过热关机。" 停机瞬间没有记录温度。只写看到的事实：三次停机没有原因，开启守护后再未停机。

## Generalize

当机器在没有日志行的情况下停机时，诚实的复盘应列出候选原因、排除各个原因的证据，以及所采取的缓解措施及其代价。将资源保持在限制以下的守护脚本是针对单个容器的安全平面：它用墙上时间换取正常运行时间，所以开启它的当天测量规则就会改变，复盘报告要写“在守护下未再复发”，绝不能写“已查明原因”。

## Taught in

Miles 实验笔记在[温控守护章节](../../../manuals/miles-101/sections/r-3-lab-notes.md#the-heat-guard)给出了守护脚本和干净步规则，SGLang 手册在[rollout 引擎页的另外两个种子章节](../../../manuals/sglang-101/sections/7-2-sglang-as-an-rl-rollout-engine.md#two-more-seeds)记录了三次宕机和暂停时间占比，[混沌工程课程](../../../phases/17-infrastructure-and-production/24-chaos-engineering-llm/docs/en.md#guardrails)和 [AI SRE 课程](../../../phases/17-infrastructure-and-production/23-sre-for-ai/docs/en.md#runbook)给出了安全平面和 runbook 形式。
