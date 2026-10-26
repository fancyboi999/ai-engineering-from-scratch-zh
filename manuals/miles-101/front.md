# 如何阅读本手册

> 本手册先带你在一张 GPU 上跑起 GRPO，再教你估算资源、检查运行和排查故障。

本手册中的“我们”指上游作者。测量和日志来自冻结的上游版本；本次中文同步未重新运行 GPU 实验。

## 前 30 分钟要运行什么 {#s-front-what-you-run-in-the-first-30-minutes}

用五条命令就能在一张 GPU 上启动一次强化学习训练。命令与[第 1.1 节](#s-run-grpo-on-one-gpu)相同，那里会逐条解释。小模型会学习小学数学，日志能显示它的 reward 逐渐上升。第四条命令会一直占用当前终端，直到训练结束。启动后，再按[第 1.2 节](#s-add-a-watchdog)在另一个终端启动 watchdog。rollout engine 即使退出，训练也不会自行停止。

```bash
docker pull radixark/miles:latest
mkdir -p ~/miles-lab/runs ~/.cache/huggingface && curl -fsSL -o ~/miles-lab/miles_grpo.py https://raw.githubusercontent.com/fancyboi999/ai-engineering-from-scratch-zh/main/manuals/miles-101/capture/gpu/miles_grpo.py
cd ~/miles-lab
docker run --rm --name miles-plain --gpus all --ipc=host --shm-size 32g --ulimit memlock=-1 -v "$HOME/miles-lab:/root/lab" -v "$HOME/.cache/huggingface:/root/.cache/huggingface" -e MILES_NUM_ROLLOUT=12 -e MILES_RUN=plain radixark/miles:latest python /root/lab/miles_grpo.py > runs/plain.log 2>&1
grep -o "'rollout/raw_reward': [0-9.]*" runs/plain.log
```

## 读完后你能做什么 {#s-front-what-you-can-do-after-this-manual}

你已经会部署模型，也知道 reward 的含义。现在，你想用强化学习训练模型，并在租用集群前弄清哪些设置真正重要。

读完本手册，你可以：

- 在一张 GPU 上运行 GRPO，并读懂前十个训练步骤。
- rollout engine 退出后，及时停止仍在继续的训练。
- 选择能在一张 GPU 上同时容纳训练和 rollout 的模型大小。
- 检查训练是否正确，而不只是确认它能运行。
- 根据最先出现的症状找到故障原因。

## 我们观察到的结果 {#s-front-what-we-found}

本手册的结果都来自一台机器上的运行记录。每节都会说明这些结果适用到什么范围。以下五项结果会直接影响你的操作：

- rollout engine 退出后，训练会继续运行，也不会报错。在我们的机器上，63 分钟内累计记录了 200,533 条错误。每次训练都应启动 watchdog（[第 1.2 节](#s-add-a-watchdog)）。
- 在一台 128 GB 内存的机器上，1.7B 模型能以 256 token 的短步骤运行，4B 模型则无法运行（[第 2.1 节](#s-pick-a-model-size)）。
- trainer 与 engine 之间的权重更新耗时不到一个训练步骤的百分之一。先调优训练和 rollout（[第 2.4 节](#s-size-the-weight-update)）。
- 确定性推理能让 engine 重复相同结果，却不能缩小 trainer 与 engine 之间的差距（[第 4.5 节](#s-use-deterministic-inference)）。
- GPU 过热触发暂停后，增加的是等待时间而不是计算量。比较运行时要对齐相同步骤，并排除受暂停影响的步骤（[第 5.3 节](#s-repeat-a-run)）。

## 测试环境 {#s-front-how-we-tested-it}

我们在一台 NVIDIA DGX Spark 上运行了所有命令。它配备 GB10 芯片，CPU 和 GPU 共用 128 GB 内存。模型是 Qwen3-0.6B，数据集是 GSM8K。参考部分的实验记录列出了镜像、版本、随机种子和完整数据表。

GB10 持续高负载数小时后会过热，因此我们用一个小脚本保护它。脚本定义了三个术语，本手册中的许多耗时数据都依赖这些定义：

**Heat guard：**当 GPU 温度达到 84 C 时暂停 Miles 容器，降温后再恢复的脚本。[第 1.2 节](#s-add-a-watchdog-guard-the-gpu-heat)介绍如何运行它。

**Pause：**heat guard 暂停容器的时长。暂停会增加所在训练阶段的实际耗时。

**Clean step：**计时区间内没有与暂停重叠的训练步骤。我们只报告 clean step 的耗时，或者报告启用 heat guard 之前的运行数据。[实验记录](#s-ref-lab-notes)列出了具体判定规则。

Miles 面向多 GPU 的大型 mixture-of-experts 训练。一张 GPU 无法展示它的全部能力。每节都会区分实际测量的结果和只从源码中确认的行为。

关于 Miles 单个训练步骤的概览，请读 [Inside Miles 指南](https://rohitghumare.com/guides/inside-miles)；关于 colocated loop，请读 [SGLang 101 第 7.2 节](https://aieng-zh.cn/manual-sglang-101.html#s-sglang-as-an-rl-rollout-engine)。本手册不重复这些内容。

## 各部分的顺序 {#s-front-how-the-parts-are-ordered}

```parts
```

来源：manual.json；capture/gpu/heat-guard.sh；capture/gpu/out-gb10/image-identity.txt；capture/gpu/out-gb10/engine-died-count.txt；capture/gpu/out-gb10/ray-oom-4b-lowmem.log；capture/gpu/miles_grpo.py；capture/gpu/summary/miles-gb10-lab.json。
