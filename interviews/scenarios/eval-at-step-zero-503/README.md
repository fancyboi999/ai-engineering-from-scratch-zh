---
id: eval-at-step-zero-503
title: 第 0 步之前就让运行停下的评测
card: scenarios
kind: incident
level: 4
roles: [inference-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, design-review, system-design]
tags: [rl, evaluation, http-503, router, eval-fleet, miles]
minutes: 30
lessons: []
manuals: [miles-101#s-run-a-separate-eval-fleet, miles-101#s-add-a-watchdog, miles-101#s-survive-failures]
practice: []
cheatsheet: []
related: [scenarios/dead-engine-and-watchdog]
updated: 2026-11-03
system:
  version: Miles main 08752a12 with its own SGLang 0.5.22 build
  model: Qwen/Qwen3-0.6B
  hardware: one GB10 with 128 GB of unified memory
source:
  - manuals/miles-101/capture/gpu/out-gb10/tracker-eval-checks.txt
  - manuals/miles-101/sections/6-2-run-a-separate-eval-fleet.md
  - manuals/miles-101/sections/1-2-add-a-watchdog.md
---

## Situation

一个 RL 团队想在长时间的 GRPO 运行中，拿一个留出的数学集算准确率。动长运行之前，他们做了正确的事：先把评测参数加到一个 2 步的冒烟测试里，间隔设为每步一次。作业在完成第 0 步之前就停了：打出几千行 HTTP 503 之后，评测任务抛出一个 Ray 任务错误。他们又跑了一次，停的方式一模一样。

评审会上，一位工程师说 rollout 引擎死了，跟死引擎那次事故一样，想调一调看门狗。另一位说测试集对一张 GPU 来说太大了。负责人要一个设计：在长运行的每一步旁边都放一个评测分数，同时不带这种风险；还问这两次失败的尝试证明了什么，没证明什么。

## Evidence

- [在训练引擎上评测的两次尝试，都停在第 0 步之前](evidence/two-eval-tries.txt)
- [同一天两次不带评测的 2 步运行，跑到了第 0 步和第 1 步](evidence/same-day-runs-without-eval.txt)
- [在训练引擎上运行评测的参数](evidence/eval-command.txt)
- [训练引擎上的评测怎样工作，以及在 GB10 上发生了什么](evidence/what-the-manual-saw.txt)
- [评测可以运行的三个位置，以及评测集群的限制](evidence/three-places.txt)
- [路由器是什么，它返回 503 意味着什么](evidence/router-and-503.txt)

## Questions

1. 把这次失败和一次引擎死掉的运行做比较。哪个组件抛了错，哪个组件在重试？为什么这个作业停了，而那个挂了一小时？
2. 同一个配方那天不带评测参数跑了两次。这两次运行排除了什么？
3. 说出两次失败的尝试证明了路由器和评测客户端的什么，再说出它们没证明的那一件事。
4. 在这个布局里，是哪个组件回答了 503？为什么这些行的数量说明不了原因？
5. 列出评测可以运行的三个位置，以及每个位置的代价和限制，并为这台机器上的长运行选一个。
6. 写出每个评测配置加入长运行之前都要通过的关卡，以及证明它通过了的信号。

## Walkthrough

1. **读两次尝试。** 两次都跑 2 步的配方，带 `--eval-interval 1` 和 GSM8K 测试文件。两次都完成了零步。第一次写了 5311 行 `503 Service Unavailable`，第二次 4339 行，两次都以 `RolloutExecutor.eval()` 里抛出的 `ray.exceptions.RayTaskError` 结束，源头是一个 `HTTPStatusError`。评测客户端遇到这个状态码就抛错。这个作业没有挂起，它失败并停下了。在引擎死掉的那次运行里，训练的 rollout 路径对同一个状态码重试了 63 分钟，从没抛错。两条路径，对同一个状态码有两种行为。
2. **读不带评测的运行。** 同一天的 tracker 检查，在同一个镜像和同一台机器上跑了同一个 2 步配方，记录了 `step 0` 和 `step 1`。它们和失败的尝试只差评测参数。所以那天的配方、引擎启动和训练器都是健康的。评测参数就是弄坏作业的那个改动。
3. **读评测发出了什么。** 文档里的命令以步数设置间隔，并指定启动器要下载的测试划分。间隔为 1 时，第一次评测立刻运行；手册的记录说，它发出了 1,319 道测试题，路由器对这些请求回答了 503。这就是整阵突发：一次 1,319 个 prompt 的评测，其中很多被拒绝，记为 5311 行和 4339 行错误。
4. **把证明了的和没证明的分开。** 路由器是一个小服务，把每个 rollout 请求转发给某个引擎；没有引擎能接请求时，它返回 503。所以证据证明了：评测那一刻，路由器没有任何愿意接这些请求的引擎；评测客户端把这个状态码当作致命错误。它没有证明那一刻引擎为什么不可用。手册跑了两次，没找到原因。依赖“原因已知”的设计，现在用不了。
5. **读三个位置。** 在训练引擎上评测，这是默认方式：评测运行时 rollout 生产停下，引擎已经持有当前权重，而在这台机器上这条路径失败了两次。在专用评测集群上：`--eval-num-gpus N` 从作业里拿出 N 张 GPU 做评测，训练不用为它停下，`eval/lag_steps` 显示每个分数晚到多少步；但评测集群不能和检查点评测函数一起用，rollout 容错也不支持它。通过你自己的服务：`--eval-function-path` 运行一个检查点评测函数，代价只是导出检查点。
6. **给两个提议定位。** 看门狗守护的是一个永远不停的运行。这个作业自己停了，所以看门狗找不到容器，直接退出。测试集大小是一个没有测量支撑的猜测，因为手册没有把原因单独分离出来；检验这个猜测的唯一方法，是用更小的集合跑同一个 2 步冒烟测试。

## Resolution

两次尝试证明：在这台机器上，训练引擎上的评测会在第一次评测时失败，失败得很明显，而且在第 0 步之前；原因仍然未知。团队不该把这种模式加进长运行，冒烟测试先失败，就是尽了它的职责。在一张 GB10 上的长运行，使用 `--eval-function-path` 运行检查点评测函数，代价只是导出检查点，训练引擎也不参与评测。有第二张 GPU 时，用 `--eval-num-gpus 1` 的专用评测集群，用 `--eval-sglang-mem-fraction-static 0.9` 给它的引擎单独的内存份额，读 `eval/lag_steps`，并接受这种布局下 rollout 容错是关闭的。

关卡保留：每个新的评测设置先在 2 步配方上跑，间隔设为 1，只有日志里出现 `step 0`、`step 1` 和一个评测分数，并且没有 `RayTaskError` 时才算通过。看门狗留给引擎死掉的情况，那是另一种失败，特征也不同。

## Wrong turns

- "引擎死了，调看门狗。" 作业在第一步内就抛错停下了。看门狗是为相反的情况准备的：作业一直给死引擎发请求，永远不失败。
- "把测试集砍到几百道题，然后开始长运行。" 原因未知，所以更小的集合只是一个猜测。在 2 步配方上测它，只有通过了才能进长运行。
- "把间隔设为 10，让评测跑得少一些。" 失败发生在第一次评测。间隔更长，只是把第一次评测推到长运行更靠后的位置，到那时同样的停止会让之前每一步的工作都白费。
- "专用评测集群和 rollout 容错一起用。" 在这个版本里，rollout 容错不支持专用评测集群。只能选一个。
- "在训练引擎上评测是免费的，因为它们已经持有权重。" 它在整个评测期间停掉 rollout 生产，而在这台机器上，它停掉了作业。

## Generalize

失败的冒烟测试是一个结果，不是一次耽搁。记下失败证明了什么、留下了什么未知，围绕未知的部分做设计，而不是去猜它。一个依赖对两个客户端回答同一个错误时，要知道每个客户端怎样处理它：重试会把故障变成挂起，抛错会把它变成快速停止。把不能停的工作（这里是训练）和可能失败的工作（这里是评测）放在不同的引擎上，并让每个新配置都用同一个短测试检验合格。

## Taught in

Miles 手册在[评测集群页面](../../../manuals/miles-101/sections/6-2-run-a-separate-eval-fleet.md)列出了评测的三个位置并记录了两次失败的尝试，在[看门狗页面](../../../manuals/miles-101/sections/1-2-add-a-watchdog.md)定义了路由器和 503，在[故障页面](../../../manuals/miles-101/sections/6-3-survive-failures.md)给出了容错的限制。
