# 编写自定义 reward function

> 一个 flag 就能接入自定义 reward，但使用小数 reward 时，还要检查 advantage 如何居中。

reward 决定模型学习什么。Miles 内置了一组 reward；如果都不适合你的任务，可以指定自己的函数。

读完本节后，你可以接入自己的 reward function，并在长时间训练前检查 advantage。

我们没有在 GB10 上测量自定义 reward。本手册中的训练使用内置 `math` reward，答案正确时返回 1，否则返回 0。

## 先检查内置 reward {#s-write-a-custom-reward-check-the-built-in-rewards-first}

`--rm-type` 用于选择内置 reward。以下几种最常用：

| `--rm-type` | 评分方式 |
|---|---|
| `math` | 答案与 label 匹配时为 1，否则为 0 |
| `dapo` | 答案正确时为 1，否则为 -1；结果以 dict 返回，因此需要设置 `--reward-key score` |
| `deepscaler` | DeepScaleR 规则评分 |
| `f1` | 答案与 label 的 F1 重合度 |
| `gpqa` | GPQA 选择题评分 |
| `remote_rm` | 通过 `--rm-url` 指定的 HTTP reward service 返回的分数 |

给 math 类型加上 `boxed_` 前缀，例如 `boxed_math`，就只会检查 `\boxed{}` 中的答案。

## 接入自己的函数 {#s-write-a-custom-reward-plug-in-your-own-function}

在主机上将函数保存为 `~/miles-lab/my_rewards.py`。容器会通过 `/root/lab/my_rewards.py` 访问它：

```python
import re


def last_number(text):
    found = re.findall(r"-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?", text.replace(",", ""))
    return float(found[-1]) if found else None


async def custom_rm(args, sample, **kwargs):
    answer = last_number(sample.response)
    label = last_number(str(sample.label))
    return 1.0 if answer is not None and answer == label else 0.0
```

这个示例会给数值答案评分。它将答案中最后一个数字转换成数值，再与 label 比较。因此答案 142 与 label 42 不匹配。其他类型的答案需要调整提取逻辑。

然后为[第 1.1 节](#s-run-grpo-on-one-gpu)的训练增加两项设置。`PYTHONPATH` 让 Miles 能从实验目录导入该文件，flag 则通过 import path 指定函数：

```bash
-e PYTHONPATH=/root/lab -e MILES_EXTRA_ARGS="--custom-rm-path my_rewards.custom_rm"
```

启动脚本会把 `PYTHONPATH` 传递给负责答案评分的 Ray worker。导入成功后，第一条 `rollout 0` 日志中的 `rollout/raw_reward` 就是你的函数算出的值。

如果 Miles 找不到文件，日志会显示 `ModuleNotFoundError: No module named 'my_rewards'`。出现此错误后，训练不会自行停止。我们的测试中，任务持续运行了两个小时，却没有完成任何 rollout 步骤。watchdog 也没有停止它，因为这段时间 engine 只输出了 44 条 `503 Service Unavailable`。看到这个错误时，应停止容器、修正 `PYTHONPATH`，然后重新启动训练。

函数必须使用 `async def` 定义。flag 帮助信息展示的是普通函数，但 Miles 会 await 函数结果，因此普通函数会失败。函数接收运行参数和一个样本，答案位于 `sample.response`，label 位于 `sample.label`。如果返回 dict，用 `--reward-key` 指定保存 reward 的字段。启用 `--group-rm` 后，Miles 会传入由样本组成的列表，函数必须为每个样本返回一个 reward。

## 在训练前测试 {#s-write-a-custom-reward-test-it-before-the-run}

启动训练前，先在容器内调用函数。以下命令会为一个答案评分：

```bash
docker run --rm -v "$HOME/miles-lab:/root/lab" -e PYTHONPATH=/root/lab radixark/miles:latest python -c "import asyncio, types, my_rewards; s = types.SimpleNamespace(response='So the answer is 42.', label='42'); print(asyncio.run(my_rewards.custom_rm(None, s)))"
```

输出应为 `1.0`。之后，手动给十个答案评分，再用函数处理它们。其中应包含正确答案、错误答案、空答案和达到长度上限而被截断的答案。空答案导致 reward 崩溃时，可能会让整个步骤的 rollout 停止。

## 检查小数 reward 的 advantage {#s-write-a-custom-reward-check-the-advantages-of-fractional-rewards}

GRPO 会从每个答案的 reward 中减去组内平均 reward，再除以组内标准差。如果一组中的所有答案 reward 相同，每个 advantage 都应为 0，该组也就没有学习信号。

Miles issue tracker 中的一份报告显示，某些小数 reward 会破坏这一性质。使用 float32 时，16 个 0.3 的均值并不精确等于 0.3，因此会残留很小的差值。再除以接近 0 的标准差后，该差值会放大到每个答案约 0.029。二元 reward 只有 0 或 1，均值可被精确表示，因此不会出现这个问题。

如果 reward 会返回小数，应找到组内所有答案 reward 相同的组，并检查它们的 advantage 是否为 0。如果不是，可将 reward 四舍五入为 float32 能精确表示的数值，例如 0.25 的整数倍。

```takeaways
- 内置 reward 适合任务时优先使用，因为它已经过测试。
- 将自定义 reward 写成 async function，并用十个人工评分的答案测试。
- 检查小数 reward 相同的组，其 advantage 是否为 0。
```

来源：Miles main 08752a12 中的 reward hub、function loader 和 reward 参数；Miles main 08752a12 中 Ray backend 对 PYTHONPATH 的处理；capture/gpu/miles_grpo.py；Miles issue 4019；capture/gpu/out-gb10/custom-rm-noenv-hang.txt (2026-10-23 实测记录)。
