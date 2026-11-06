---
id: rl-experiment-hygiene
title: 并非真实效果的 RL 提速
card: scenarios
kind: incident
level: 3
roles: [ai-evaluation-reliability-engineer, inference-engineer]
rounds: [design-review, ml-depth, behavioral]
tags: [rl, experiment-design, seeds, heat-pauses, logprob-gap, miles]
minutes: 25
lessons: []
manuals: [miles-101#s-keep-runs-comparable, miles-101#s-repeat-a-run, miles-101#s-choose-what-to-offload, miles-101#s-use-deterministic-inference, miles-101#s-ref-lab-notes]
practice: []
cheatsheet: []
related: [scenarios/thermal-throttle-voided-ab-test, scenarios/ray-oom-unified-memory]
updated: 2026-11-03
system:
  version: Miles main 08752a12 with its own SGLang 0.5.22 build
  model: Qwen/Qwen3-0.6B
  hardware: one GB10 with 128 GB of unified memory, with a heat guard that pauses the run at 84 C
source:
  - manuals/miles-101/capture/gpu/out-gb10/unpaused-timing.txt
  - manuals/miles-101/sections/2-2-choose-what-to-offload.md
  - manuals/miles-101/sections/5-3-repeat-a-run.md
  - manuals/miles-101/capture/gpu/out-gb10/engine-settings.txt
  - manuals/miles-101/capture/gpu/out-gb10/image-identity.txt
  - manuals/miles-101/capture/gpu/out-l4/logprob-gap-by-dtype.txt
---


## Situation

一位同事在团队频道发了一个结果：在各阶段之间让 rollout 引擎保持加载，rollout 能快 12%。帖子展示了 GB10 上的两次运行，基线的 rollout 中位数为 59.1 s，新设置为 52.0 s，并提议把新设置改为默认。同一个帖子还报告，另一处改动在一个种子上带来了 0.01 的奖励提升，损失曲线"看起来更好"。

一位评审要来了运行清单。两次运行相隔四天。第二次运行的引擎内存比例也不一样。两个中位数覆盖的是不同的 step，因为每当 GPU 达到 84 C，过热防护就会暂停容器，那一周暂停了 1,005 次。第三位同事想让训练器和引擎的 log probability 更接近，已经把引擎切到 FP16，训练器仍是 BF16。

## Evidence

- [每次运行每步的 rollout 时间，分别按全部 step 和干净 step 统计](evidence/all-steps-against-clean-steps.txt)
- [同一天、只改了引擎卸载的一对运行](evidence/same-day-pair.txt)
- [同一个 48 步运行的三个种子](evidence/three-seeds.txt)
- [从日志中读出的五次运行的引擎设置](evidence/what-each-run-changed.txt)
- [每次运行使用的镜像 digest、commit 和引擎版本](evidence/what-we-ran.txt)
- [引擎与一次训练器前向之间的 log probability 差距，按 dtype 列出](evidence/dtype-on-one-side.txt)

## Questions

1. 两次运行，两个中位数，12%。在相信这个数之前，列出两次运行之间所有不同的地方。
2. 同一天的那对运行，在不同的干净 step 上得到 60.7 s 对 56.7 s。为什么这也不够？什么样的比较才够？
3. 基线的三个种子最终为 0.758、0.736 和 0.766。一个种子上 0.01 的提升意味着什么？怎样才值得报告？
4. 过热防护暂停了容器 1,005 次。暂停是怎样进入中位数的？哪些 step 可以拿来计时？
5. 根据 dtype 表预测：只把引擎切到 FP16，差距会怎样？
6. 写出每次运行开始前都要记录的清单，以及报告一处改动的规则。

## Walkthrough

先看计时表。每一行有两个中位数，一个按全部 step 统计，一个只统计 rollout 没有碰上过热暂停的 step。基线 `e6a-base` 的两个值是 83.9 s 和 59.1 s，12 个 step 中有 6 个干净。卸载对比的两次运行，比例都是 0.25，分别是 102.0 对 60.7 s 和 102.2 对 56.7 s，干净 step 分别有 4 个和 3 个。过热防护出现之前的 48 步运行 `plain-48` 两列都是 47.5 s，因为没有任何暂停能碰到它。一个 16 个回答的运行一个干净 step 都没有。所以按全部 step 算的中位数是暂停的中位数，而任意两次运行的暂停次数都不相同。

同一天的那对运行是这个结论的诚实版本。只有 `--no-offload-rollout` 不同，两次比例都是 0.25，干净中位数为 60.7 s 对 56.7 s。即便如此，这也不是一对公平的比较，因为两个中位数来自不同的 step。rollout 时间跟着回答长度走，而模型学习过程中回答会变短，从早期约 800 token 降到后期约 690。在两次运行中都干净的三个 step 上，卸载引擎与保持引擎加载的耗时分别为 69.4 对 68.0 s、58.5 对 56.7 s、55.8 对 55.2 s。在约一分钟的 rollout 中省下 0.6 到 1.8 s，也就是 1% 到 3%，而且只有一个种子。最初的 12% 来自一对同时改了比例、又比较了不同 step 的运行。

三个种子给出了噪声下限。同一个 48 步配方用种子 1234、2 和 3，最后 8 步的最终奖励分别为 0.758、0.736 和 0.766，回答长度为 447、480 和 456 token。三个都学到了东西，而在什么都没改的情况下，最终奖励仍然相差 0.03。一个种子看不出这个范围内 0.01 的提升。两个种子上 0.05 的变化，才值得再跑第三次。

引擎设置表就是事后补出来的清单。它是从每次运行日志的服务器参数行读出来的，能看出哪些运行只有一列不同：确定性运行与基线的区别在于那个参数、采样器，有时还有后端；top-p 运行只在两个采样器参数上不同。身份记录是另一半，是在运行之前记下的：镜像 digest、镜像里的 commit 和引擎构建的版本。没有这三行，上周的运行就无法和今天的比较，因为 `latest` 标签会变。

dtype 表在运行之前就回答了第三位同事。两边都是 BF16 时，每 token 差距的中位数为 0.0073。只有引擎是 FP16 时为 0.0085，只有训练器是 FP16 时为 0.0079。两种都没帮上忙。两边都是 FP16 时，中位数降到 0.00094，约低 7.8 倍。BF16 引擎即使对着 FP32 训练器，差距也停在 0.0076 左右，所以下限是由引擎的舍入决定的。只有两边一起改，dtype 的改动才有回报。

## Resolution

12% 撤回。站得住的说法是：在同一天那对运行中两边都干净的 step 上，保持引擎加载让约一分钟的 rollout 省下 0.6 到 1.8 s，只有一个种子，这还在这台机器有过热暂停时的步间噪声以内。默认的卸载设置保留。0.01 的奖励提升在两个种子上出现、并且落在基线种子 0.736 到 0.766 的范围之外之前，不予报告。

现在每次运行开始前都要记录镜像 digest、commit、引擎版本、完整命令、种子和日志文件名。运行期间，训练器、引擎和过热防护各写各的日志，结束时运行写一行退出码。一处改动要和同一天的基线比，只差一个设置，跑两个种子，并且只在干净 step 上、按相同的 step 编号比较。引擎和训练器的 dtype 要么一起改，要么都不改。确定性推理留给复现实验用，因为它让引擎准确复现了第 0 步，差距仍是 0.01518 对 0.01526，而 rollout 时间多花了 40% 到 45%。

## Wrong turns

- "两次运行都有暂停，所以按全部 step 算的中位数是公平的。" 暂停并不相等。那对运行分别只有 4 个和 3 个干净 step，它们按全部 step 算的中位数 102.0 和 102.2 s，比干净中位数高了四十秒。
- "过热防护出现之前的那次运行就是干净基线。" 它的 47.5 s 覆盖 48 个 step，包含了后期较短的回答。在和后来那次运行相同的 6 个 step 编号上，它用了 60.9 s。要比较 step 编号，而不是整次运行。
- "0.01 的提升虽小，但曲线看起来更好。" 同一配方的三个种子最后相差 0.03。一个种子看不出 0.01。
- "把引擎切到 FP16 来缩小差距。" 只改一边时，差距为 0.0085 和 0.0079，并不比两边都是 BF16 的 0.0073 好。要么两边都改，要么都不改。
- "开启确定性推理，让运行可比。" 它让引擎自我复现，代价是 rollout 时间多 40% 到 45%。差距仍在 0.01515 到 0.01526 之间，训练器从第 1 步起仍然会漂移。

## Generalize

测出来的差异，是对两次运行之间所有不同之处的陈述，所以先写下哪些地方不同，再写下那个数。固定机器、代码和数据的身份，只改一样东西，花钱跑第二个种子，并逐个 step 地同类相比。经得起这一套的结果很小，但那才是你的改动带来的效果。

## Taught in

Miles 手册在[可比运行页](../../../manuals/miles-101/sections/7-2-keep-runs-comparable.md)给出了清单，在[重复运行页](../../../manuals/miles-101/sections/5-3-repeat-a-run.md)给出了种子和干净 step，在[卸载页](../../../manuals/miles-101/sections/2-2-choose-what-to-offload.md)给出了同一天的那对运行，在[可复现引擎页](../../../manuals/miles-101/sections/4-5-use-deterministic-inference.md)给出了确定性运行，并在[实验笔记](../../../manuals/miles-101/sections/r-3-lab-notes.md)给出了干净 step 的规则。
